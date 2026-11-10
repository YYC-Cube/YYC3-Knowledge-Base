#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto. Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import argparse

from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_valid_columns,
    check_valid_labels,
    SingleUseAction,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import CONFIG_TYPE, ENABLE_TYPE
from ngcbase.errors import ResourceAlreadyExistsException, ResourceNotFoundException
from ngcbase.util.utils import confirm_remove, convert_string, get_columns_help
from registry.api.utils import SimpleRegistryTarget
from registry.command.registry import RegistryCommand
from registry.data.search.LabelSetCreateRequest import LabelSetCreateRequest
from registry.data.search.LabelSetUpdateRequest import LabelSetUpdateRequest
from registry.data.search.ResourceTypeEnum import ResourceTypeEnum
from registry.printer.label_set import LabelSetPrinter


def convert_to_display(rtype):  # noqa: D103
    return convert_string(rtype, "RECIPE", "RESOURCE")


def convert_to_backend(rtype):  # noqa: D103
    return convert_string(rtype, "RESOURCE", "RECIPE")


UPDATED_RESOURCE_TYPE_ENUM = sorted([convert_to_display(itm) for itm in ResourceTypeEnum])


class LabelSetSubCommand(RegistryCommand):  # noqa: D101
    CMD_NAME = "label-set"
    HELP = "Label-Set Commands"
    DESC = "Label-Set Commands"
    CLI_HELP = ENABLE_TYPE

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.registry.label_set
        self.printer = LabelSetPrinter(self.client.config)

    LIST_HELP = "List label-set(s) in a namespace."

    LABEL_HELP = "Label in the label-set. Use quotes with spaces. Multiple label arguments are allowed. "
    ADD_LABEL_HELP = (
        "Label to be added to the label-set. Use quotes with spaces. Multiple add-label arguments are allowed."
    )
    REMOVE_LABEL_HELP = (
        "Label to be removed from the label-set. Use quotes with spaces. Multiple remove-label arguments are allowed."
    )
    RESOURCE_TYPE_HELP = (
        f"Filter global label sets by resource type. Allowed values: {', '.join(UPDATED_RESOURCE_TYPE_ENUM)}"
    )
    columns_dict = {
        "displayName": "Display Name",
        "org": "Org",
        "team": "Team",
        "resourceType": "Resource Type",
        "readOnly": "Read Only",
        "isGlobal": "Global",
        "labels": "Labels",
    }
    columns_default_label_set = ("name", "Name")
    columns_help = get_columns_help(columns_dict, columns_default_label_set)

    # pylint:disable=undefined-variable
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.arguments(
        "--resource-type",
        metavar="<resourceType>",
        help=RESOURCE_TYPE_HELP,
        type=str.upper,
        default=None,
        action=SingleUseAction,
        choices=UPDATED_RESOURCE_TYPE_ENUM,
    )
    @CLICommand.command(name="list", help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List label sets."""
        self.config.validate_configuration(guest_mode_allowed=True)
        check_add_args_columns(args.column, LabelSetSubCommand.columns_default_label_set)
        self._list_label_sets(resource_type=convert_to_backend(args.resource_type), columns=args.column)

    def _list_label_sets(self, resource_type=None, columns=None):
        cfg_org_name = self.config.org_name
        cfg_team_name = self.config.team_name
        response = self.api.list_label_sets(cfg_org_name, cfg_team_name, resource_type)
        self.printer.print_label_set_list(response.labelSets, columns=columns)

    INFO_HELP = "Get information about a label-set."
    TARGET_HELP = "Label set name. Format: org/[team/]name."

    @CLICommand.command(name="info", help=INFO_HELP, description=INFO_HELP)
    @CLICommand.arguments(
        "--resource-type",
        metavar="<resourceType>",
        help=RESOURCE_TYPE_HELP,
        type=str.upper,
        default=None,
        action=SingleUseAction,
        choices=UPDATED_RESOURCE_TYPE_ENUM,
    )
    @CLICommand.arguments("target", metavar="<target>", help=TARGET_HELP, type=str, default=None)
    def info(self, args):
        """Retrieve metadata for a label set."""
        self.config.validate_configuration(guest_mode_allowed=True)
        # non-list, use org/team from target
        crt = SimpleRegistryTarget(args.target, org_required=True, name_required=True)
        try:
            resp = self.api.get(crt.org, crt.team, crt.name, convert_to_backend(args.resource_type))
            self.printer.print_label_set(resp)
        except ResourceNotFoundException:
            raise ResourceNotFoundException("Label set '{}' could not be found.".format(args.target)) from None

    # These are used for validating update arguments.
    label_set_update_args = ("display_name", "label", "add_label", "remove_label")

    def _validate_update_label_set(self, args):
        args_dict = vars(args)
        if all(args_dict[arg] is None for arg in self.label_set_update_args):
            raise argparse.ArgumentTypeError("No arguments provided for label_set update; there is nothing to do.")

    UPDATE_HELP = "Update a label-set."
    UPDATE_TARGET_HELP = "Name of the label-set to update. Format: org/[team/]name."

    @CLICommand.command(
        name="update",
        help=UPDATE_HELP,
        description=UPDATE_HELP,
        feature_tag=CONFIG_TYPE,
    )
    @CLICommand.arguments("target", metavar="<target>", help=UPDATE_TARGET_HELP, type=str, default=None)
    @CLICommand.arguments(
        "--display-name",
        metavar="<dispName>",
        help="The name to display for the label-set",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--label",
        metavar="<label>",
        help=f"DEPRECATED - please use '--add-label' instead. {ADD_LABEL_HELP}",
        type=str,
        default=None,
        action="append",
    )
    @CLICommand.arguments(
        "--add-label", metavar="<label>", help=ADD_LABEL_HELP, type=str, default=None, action="append"
    )
    @CLICommand.arguments(
        "--remove-label", metavar="<label>", help=REMOVE_LABEL_HELP, type=str, default=None, action="append"
    )
    def update(self, args):
        """Update a label set."""
        self.config.validate_configuration()
        crt = SimpleRegistryTarget(args.target, org_required=True, name_required=True)
        labels = None
        has_label_args = bool(args.label or args.add_label or args.remove_label)
        if has_label_args:
            to_add = (args.add_label or []) + (args.label or [])
            # This will check for duplicates.
            all_labels = to_add + (args.remove_label or [])
            check_valid_labels(all_labels)
            # Get the current labels
            current = []
            try:
                resp = self.api.get(crt.org, crt.team, crt.name, None)
            except ResourceNotFoundException:
                resp = None
            if resp:
                current = [lbl.display for lbl in resp.labels]
            self._validate_update_label_set(args)
            add_set = set(to_add or [])
            remove_set = set(args.remove_label or [])
            current_set = set(current)
            current_set.update(add_set)
            current_set.difference_update(remove_set)
            labels = check_valid_labels(list(current_set))
        label_set_update_request = LabelSetUpdateRequest(
            {
                "display": args.display_name,
                "labels": labels,
            }
        )
        if not label_set_update_request.toDict():
            # Nothing is being updated
            raise argparse.ArgumentTypeError("No arguments provided for labelset update; there is nothing to do.")
        label_set_update_request.isValid()
        try:
            updated = self.api.update(
                crt.org, crt.team, crt.name, label_set_update_request, force_labels=has_label_args
            )
        except ResourceNotFoundException:
            raise ResourceNotFoundException("Label set '{}' was not found.".format(args.target)) from None
        self.printer.print_head("Successfully updated label-set '{}'.".format(args.target))
        self.printer.print_label_set(updated)

    REMOVE_HELP = "Remove a label-set in a namespace."
    REMOVE_TARGET_HELP = "Name of the label-set to remove. Format: org/[team/]name."

    @CLICommand.command(
        name="remove",
        help=REMOVE_HELP,
        description=REMOVE_HELP,
        feature_tag=CONFIG_TYPE,
    )
    @CLICommand.arguments("target", metavar="<target>", help=REMOVE_TARGET_HELP, type=str, default=None)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    def remove(self, args):
        """Delete a label set from the repository."""
        self.config.validate_configuration()
        crt = SimpleRegistryTarget(args.target, org_required=True, name_required=True)
        self._remove_label_set(org=crt.org, team=crt.team, label_set=crt.name, args=args)

    def _remove_label_set(self, org, team, label_set, args):
        confirm_remove(printer=self.printer, target=args.target, default=args.default_yes)
        try:
            self.api.remove(org, team, label_set)
            self.printer.print_ok("Successfully removed label_set '{}'.".format(args.target))
        except ResourceNotFoundException:
            raise ResourceNotFoundException("Label set '{}' could not be found.".format(args.target)) from None

    CREATE_HELP = "Create a label-set in a namespace."
    CREATE_TARGET_HELP = "Name of the label-set to create. Format: org/[team/]name."

    @CLICommand.command(
        name="create",
        help=CREATE_HELP,
        description=CREATE_HELP,
        feature_tag=CONFIG_TYPE,
    )
    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help=CREATE_TARGET_HELP,
        type=str,
        default=None,
    )
    @CLICommand.arguments(
        "--display-name",
        metavar="<dispName>",
        help="The name to display for the label-set.",
        type=str,
        default=None,
        action=SingleUseAction,
        required=True,
    )
    @CLICommand.arguments("--label", metavar="<label>", help=LABEL_HELP, type=str, default=None, action="append")
    def create(self, args):
        """Create a label set."""
        self.config.validate_configuration()
        crt = SimpleRegistryTarget(args.target, org_required=True, name_required=True)
        labels = check_valid_labels(args.label)
        label_set_create_request = LabelSetCreateRequest(
            {"display": args.display_name, "labels": labels, "value": crt.name}
        )
        label_set_create_request.isValid()
        try:
            created_label_set = self.api.create(crt.org, crt.team, label_set_create_request)
            self.printer.print_head("Successfully created label-set '{}'.".format(args.target))
            self.printer.print_label_set(created_label_set)
        except ResourceAlreadyExistsException:
            raise ResourceAlreadyExistsException("Label set '{}' already exists.".format(args.target)) from None
