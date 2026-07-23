# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

"""Utilities shared by forge CLI commands."""
import contextlib
from dataclasses import dataclass
import functools

from forge.command.args_validation import check_instance_label
from ngcbase.command.clicommand import CLICommand
from ngcbase.errors import BadRequestException, InvalidArgumentError, NgcException


@dataclass()
class ConflictingLabelError(NgcException):
    """Raised when trying to add a label that already exists."""

    label: str
    what: str

    def __str__(self):
        """Render the error message."""
        lines = [
            f"Label {self.label!r} already exists on the {self.what}.",
            "",
            "Either remove the label, or use the '--overwrite-conflicting-labels' option to update it.",
        ]
        return "\n".join(lines)


def decorate_update_command_with_label_arguments(
    command_method=None,
    *,
    label_getter,
    what,
):
    """Add `--label` arguments to the decorated `update` command.

    Automatically parses/validates the labels and makes them available as `args.label`.
    """
    if command_method is None:
        return lambda fn: decorate_update_command_with_label_arguments(fn, label_getter=label_getter, what=what)

    argument_decorators = [
        CLICommand.arguments(
            "--label",
            metavar="<key:value>",
            help=(
                "Add a label. Each instance can have up to 10 labels."
                " Each label or key is limited to 256 characters. (Can be specified multiple times.)"
            ),
            type=check_instance_label,
            action="extend",
        ),
        CLICommand.arguments(
            "--overwrite-conflicting-labels",
            help="If set, adding a label that already exists on an instance will overwrite the existing label.",
            action="store_true",
        ),
        CLICommand.arguments(
            "--remove-label",
            metavar="<key>",
            help="Remove a label. (Can be specified multiple times.)",
            action="append",
        ),
    ]
    for decorator in argument_decorators:
        command_method = decorator(command_method)

    @functools.wraps(command_method)
    def _decorate_update_command_with_label_arguments(self, args):
        labels = None
        if args.label or args.remove_label:
            parsed_labels = _parse_labels(args.label)
            labels = label_getter(self, args) or {}
            for label_to_remove in args.remove_label or []:
                if label_to_remove not in labels:
                    raise InvalidArgumentError(None, f"Label {label_to_remove!r} not found. Cannot remove.")
                del labels[label_to_remove]

            for label_key in parsed_labels.keys():
                if not args.overwrite_conflicting_labels and label_key in labels:
                    raise ConflictingLabelError(label=label_key, what=what)
            labels.update(parsed_labels)
        args.label = labels
        return command_method(self, args)

    return _decorate_update_command_with_label_arguments


def decorate_create_command_with_label_arguments(command_method=None):
    """Add `--label` arguments to the decorated `create` command.

    Automatically parses/validates the labels and makes them available as `args.label`.
    """
    if command_method is None:
        # This decorator doesn't take arguments currently, but we should
        # support the `@decorator()` form for symmetry with
        # `decorate_update_command_with_label_arguments`.
        return lambda fn: decorate_create_command_with_label_arguments(fn)  # pylint: disable=W0108

    command_method = CLICommand.arguments(
        "--label",
        metavar="<key:value>",
        help=(
            "Specify labels. Each instance can have up to 10 labels."
            " Each label or key is limited to 256 characters. (Can be specified multiple times.)"
        ),
        type=check_instance_label,
        action="extend",
    )(command_method)

    @functools.wraps(command_method)
    def _decorate_create_command_with_label_arguments(self, args):
        args.label = _parse_labels(args.label)
        return command_method(self, args)

    return _decorate_create_command_with_label_arguments


def _parse_labels(args_label):
    labels = {}
    for label in args_label or []:
        try:
            key, val = label.split(":")
            if key in labels:
                raise NgcException(f"Duplicate label key: {key!r}")
            labels[key] = val
        except (ValueError, TypeError, AttributeError, IndexError):
            raise InvalidArgumentError(f"label: {label}") from None
    return labels


@contextlib.contextmanager
def wrap_bad_request_exception():
    """If the server returns a 'bad request' error, print the contents of the message."""
    try:
        yield
    except BadRequestException as error:
        resp = error.response.json()
        message_lines = [resp["message"]]
        for data_message in resp["data"].values():
            message_lines += ["  " + data_message]
        raise NgcException("\n".join(message_lines)) from None
