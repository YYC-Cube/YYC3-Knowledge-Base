#
# Copyright (c) 2019-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import argparse
from collections import defaultdict, OrderedDict
from itertools import chain
import sys

from ngcbase.constants import CONFIG_TYPE, DISABLE_TYPE
from ngcbase.errors import InvalidArgumentError
from ngcbase.util.utils import get_environ_tag


def _get_action_name(argument):
    if argument is None:
        return None

    if argument.option_strings:
        return "/".join(argument.option_strings)

    if argument.metavar not in (None, argparse.SUPPRESS):
        return argument.metavar

    if argument.dest not in (None, argparse.SUPPRESS):
        return argument.dest

    return None


class NgcParser(argparse.ArgumentParser):
    """Use this class to insert extra functionality into ArgumentParser."""

    global_arg_precedence = ["--org", "--ace", "--team"]

    # We need to remember how many of each of the global args were given to curent execution
    global_arg_counts = {elem: 0 for elem in global_arg_precedence}
    # e.g {'--apikey': 2, '--org': 0, '--ace': 0, '--team': 0}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **dict(kwargs, add_help=False, allow_abbrev=False))

    @property
    def client(self):
        """Client."""
        return getattr(self, "_client", None)

    @client.setter
    def client(self, value):
        self._client = value

    @staticmethod
    def _sanitize_dashes(args):
        """Convert en-dashes (–) and em-dashes (—) to regular hyphens (-) in command line arguments.

        This handles cases where users accidentally use en-dashes instead of hyphens
        for command line flags, which commonly happens when copy-pasting from
        documentation or when using smart punctuation features.

        Args:
            args: List of command line arguments

        Returns:
            List of arguments with en-dashes converted to regular hyphens
        """
        sanitized_args = []
        for arg in args:
            # Replace en-dash (–, Unicode U+2013) with regular hyphen (-)
            # Also handle em-dash (—, Unicode U+2014) just in case
            sanitized_arg = arg.replace("–", "-").replace("—", "-")
            sanitized_args.append(sanitized_arg)
        return sanitized_args

    def parse_args(self, args=None, namespace=None):  # noqa: D102
        no_reorder = []
        reorder = []
        if args is None:
            args = sys.argv[1:]

        # Normalize en-dashes to regular hyphens before processing
        args = self._sanitize_dashes(args)

        try:
            arg_iterator = iter(args)
            for arg in arg_iterator:
                if arg in self.global_arg_precedence:
                    self.global_arg_counts[arg] += 1
                    value = next(arg_iterator)  # Take value next argument
                    reorder.append((arg, value))
                else:
                    no_reorder.append(arg)
            args = no_reorder + list(
                chain(
                    *sorted(
                        reorder,
                        key=lambda elem: self.global_arg_precedence.index(elem[0]),
                    )
                )
            )
        except StopIteration:
            pass

        return super().parse_args(args, namespace)

    def _get_optional_action(self, arg_string):
        option_tuple = self._parse_optional(arg_string)

        if option_tuple is None:
            return None

        arg_gen = (x for x in self._actions if arg_string in x.option_strings)

        return next(arg_gen, None)

    @staticmethod
    def suppress_argument(argument):  # noqa: D102
        argument["help"] = argparse.SUPPRESS

    def parse_known_args(self, args=None, namespace=None):
        """Augmentation of the builtin ArgumentParser.parse_known_args method
        that raises an error if duplicate global arguments are detected.
        """  # noqa: D205
        global_args = self._get_global_args()

        if len(args) > 1:
            self._check_duplicate_global_args(args, global_args)

        actions = [_f for _f in [self._get_optional_action(arg_string) for arg_string in args] if _f]
        suppressed_names = [_get_action_name(action) for action in actions if action.help is argparse.SUPPRESS]
        if suppressed_names:
            self.error("unrecognized arguments: {}".format(" ".join(suppressed_names)))

        return super().parse_known_args(args, namespace)

    def _get_global_args(self):
        """Return a flat list of all global arguments.

        Note: Coupled to the `global_args` module's _CallFunction class
        """
        arg_names = (action.option_strings for action in self._actions if isinstance(action, _CallFunction))
        filtered_args = (names for names in arg_names if names != [])

        # Flatten
        global_args = []
        for name_list in filtered_args:
            global_args.extend(name_list)

        return global_args

    @staticmethod
    def _check_duplicate_global_args(raw_args, global_args):
        """Takes in a list of arguments and raises an ArgumentError
        if any duplicate global arguments are detected.
        """  # noqa: D205, D401
        cmd_count = defaultdict(int)
        for arg in raw_args:
            if arg in global_args:
                if cmd_count[arg] >= 1:
                    raise InvalidArgumentError(arg, message="Duplicate {} options are not allowed".format(arg))
                cmd_count[arg] += 1

    def add_argument(self, *args, **kwargs):  # noqa: D102
        try:
            feature_type = kwargs.pop("feature_type")
            if feature_type == DISABLE_TYPE or (
                feature_type == CONFIG_TYPE
                and (not self.client.config.app_key and not self.client.config.starfleet_kas_email)
            ):
                self.suppress_argument(kwargs)
            environ_type = kwargs.pop("environ_type")
            if environ_type and not get_environ_tag() <= environ_type:
                return _None()
        except KeyError:
            pass

        return super().add_argument(*args, **kwargs)

    def _check_value(self, action, value):
        if action.choices is not None:
            action.choices = sorted(action.choices)
        super()._check_value(action, value)


class _None:
    def __init__(self):
        pass


def sorting_subactions(self):  # noqa: D103
    return sorted(self._choices_actions, key=lambda elem: elem.dest)  # pylint: disable=protected-access


# This function has to be overwritten to sort commands
# repo:
#  {tag,list,delete} <- not this list
#    delete           Removes specified repository.
#    list             Lists the repositories that you can access.
#    tag              Tag Commands
argparse._SubParsersAction._get_subactions = sorting_subactions  # pylint: disable=protected-access


class SortingHelpFormatter(argparse.HelpFormatter):  # noqa: D101
    def add_usage(self, usage, actions, groups, prefix=None):
        """This sorts optional arguments in the usage message
        E.G.
            usage: ngc batch run [-h] [-n] [-i] [-f] [-c] [-d] [--datasetid] [-a] [-in]
                     [-p] [--result] [--preempt] [--total-runtime]
                     [--min-timeslice]
        """  # noqa: D205, D401, D404, D415
        if isinstance(actions, OrderedDict):
            actions = OrderedDict(
                sorted(
                    actions.items(),
                    key=lambda key, elem: (
                        "." + ",".join(elem.option_strings)
                        if str(",".join(elem.option_strings)).startswith("--")
                        else str(",".join(elem.option_strings))
                    ),
                )
            )
        elif isinstance(actions, list):
            actions = sorted(actions, key=lambda elem: ", ".join(elem.option_strings))

        super().add_usage(usage, actions, groups, prefix)

    def _metavar_formatter(self, action, default_metavar):
        """This makes sure the list of commands is sorted
        E.g.
        repo:
        {delete,list,tag}
        """  # noqa: D205, D401, D404, D415
        if action.choices:
            if isinstance(action.choices, OrderedDict):
                action.choices = OrderedDict(sorted(action.choices.items(), key=str))
            else:
                action.choices = sorted(action.choices, key=str)

        return super()._metavar_formatter(action, default_metavar)

    def end_section(self):
        """Upon finishing a section it will sort the elements of optional arguments
        E.g.
        optional arguments:
            -a , --ace           Select the ACE where the user wants to run the job.
            -c , --commandline   The command you are passing into your job.
            -d , --description   The description of a job.
        ...
        """  # noqa: D205
        self._current_section.items = sorted(
            self._current_section.items,
            key=lambda elem: (
                "." + ",".join(elem[1][0].option_strings)
                if str(",".join(elem[1][0].option_strings)).startswith("--")
                else str(",".join(elem[1][0].option_strings))
            ),
        )
        super().end_section()


class _CallFunction(argparse.Action):
    """This action will call the supplied function with values as its only argument.
    If the supplied function returns False, the optionally supplied Exception will be raised.
    """  # noqa: D205, D404

    def __init__(
        self,
        option_strings,
        fn,
        exc,
        const=None,
        dest=argparse.SUPPRESS,
        nargs=None,
        default=None,
        type=None,  # pylint: disable=redefined-builtin
        choices=None,
        required=False,
        help=None,  # pylint: disable=redefined-builtin
        metavar="",
    ):
        super().__init__(
            option_strings=option_strings,
            dest=dest,
            nargs=nargs,
            const=const,
            type=type,
            choices=choices,
            default=default,
            required=required,
            metavar=metavar,
            help=help,
        )
        self.fn = fn
        self.exc = exc

    # pylint: disable=arguments-differ
    # method adds args to base method
    def __call__(self, parser, namespace, values, *args, **kwargs):
        if self.const:
            outcome = self.fn(parser, self.const)
        else:
            outcome = self.fn(parser, values)
        if not outcome and self.exc:
            raise self.exc

    def _get_kwargs(self):
        names = [
            "option_strings",
            "nargs",
            "const",
            "dest",
            "default",
            "type",
            "choices",
            "help",
            "metavar",
            "fn",
        ]
        return [(name, getattr(self, name)) for name in names]
