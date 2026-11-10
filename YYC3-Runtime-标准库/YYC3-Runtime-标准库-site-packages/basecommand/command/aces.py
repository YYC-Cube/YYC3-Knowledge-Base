#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. ALL RIGHTS RESERVED.
#
# This software product is a proprietary product of Nvidia Corporation and its affiliates
# (the "Company") and all right, title, and interest in and to the software
# product, including all associated intellectual property rights, are and
# shall remain exclusively with the Company.
#
# This software product is governed by the End User License Agreement
# provided with the software product.

from basecommand.command.base_command import BaseCommand
from basecommand.printer.aces import AcePrinter
from ngcbase.command.args_validation import check_add_args_columns, check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import CONFIG_TYPE, DISABLE_TYPE, STAGING_ENV
from ngcbase.util.utils import get_columns_help, get_environ_tag


class AceCommand(BaseCommand, CLICommand):  # noqa: D101
    CMD_NAME = "ace"
    HELP = "ACE Commands"
    DESC = "ACE Commands"

    CLI_HELP = CONFIG_TYPE
    COMMAND_DISABLE = False

    WARN_MSG = " (Warning: 'ngc ace' is deprecated, use 'ngc base-command ace'.)"
    WARN_COND = CLICommand if get_environ_tag() <= STAGING_ENV else None
    CMD_ALIAS = []

    def __init__(self, parser):
        super().__init__(parser)
        self.config = self.client.config
        self.parser = parser
        self.make_bottom_commands(parser)
        self.client = self.client.basecommand

    @property
    def printer(self):
        """Printer."""
        return AcePrinter(self.config)

    ace_list_str = "List each ACE accessible with the current configuration."

    columns_dict = {"id": "Id", "description": "Description", "instances": "Instances"}
    columns_default = ("name", "ACE")
    columns_help = get_columns_help(columns_dict, columns_default)

    # pylint:disable=undefined-variable
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.command(help=ace_list_str, description=ace_list_str)
    def list(self, _args):  # noqa: D102
        ace_list = self.client.aces.list(org=_args.org, team=_args.team)
        check_add_args_columns(_args.column, AceCommand.columns_default)
        self.printer.print_ace_list(ace_list, columns=_args.column)

    ace_get_details_str = "Get ACE details for the given ACE name."

    @CLICommand.command(help=ace_get_details_str, description=ace_get_details_str)
    @CLICommand.arguments(
        "ace",
        metavar="<ace name>",
        help="ACE Name",
        type=str,
        default=None,
    )
    def info(self, args):  # noqa: D102
        ace_details = self.client.aces.info(ace=args.ace, org=args.org, team=args.team)
        self.printer.print_ace(ace_details)

    ace_usage_help_str = "[DEPRECATED] Get resource usage information about an ACE."

    @CLICommand.command(
        help=ace_usage_help_str,
        description=ace_usage_help_str,
        feature_tag=DISABLE_TYPE,
    )
    @CLICommand.arguments(
        "ace",
        metavar="<ace name>",
        help="ACE Name",
        type=str,
    )
    @CLICommand.arguments(
        "--only-unavailable",
        help="Only show items that have unavailable resources.",
        action="store_true",
    )
    @CLICommand.arguments(
        "--resource-type",
        help="Only show items of this resource type.",
        choices=["GPU", "CPU", "MIG"],
    )
    def usage(self, args):  # noqa: D102
        ace_usage = self.client.aces.usage(
            args.ace,
            org=args.org,
            team=args.team,
            only_unavailable=args.only_unavailable,
            resource_type=args.resource_type,
        )
        is_showing_all_resources = True
        if args.only_unavailable or args.resource_type:
            is_showing_all_resources = False
        self.printer.print_ace_usage(ace_usage, is_showing_all_resources=is_showing_all_resources)
