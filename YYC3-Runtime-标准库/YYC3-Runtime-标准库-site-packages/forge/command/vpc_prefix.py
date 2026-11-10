# Copyright (c) 2025, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

import textwrap

from forge.api.vpc_prefix import NeedsVpcOrSiteArgsError
from forge.command.forge import ForgeCommand
from forge.printer.vpc_prefix import VPC_PREFIX_FIELDS, VpcPrefixPrinter
from ngcbase.command.args_validation import check_add_args_columns, check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import STAGING_ENV
from ngcbase.errors import NgcException
from ngcbase.util.utils import get_columns_help, get_environ_tag


class VpcPrefixCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "vpc-prefix"
    HELP = "VPC Prefix Commands"
    DESC = "VPC Prefix Commands"

    COMMAND_DISABLE = get_environ_tag() > STAGING_ENV

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.vpc_prefix
        self.printer = VpcPrefixPrinter(self.client.config)

    LIST_HELP = "List VPC prefixes."

    columns_dict = VPC_PREFIX_FIELDS
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)
    status_enum = ["Pending", "Provisioning", "Ready", "Deleting", "Error"]

    @CLICommand.arguments(
        "query",
        metavar="<query>",
        help="Filter across all VPC prefixes. Input will be matched against name and status fields.",
        type=str,
        nargs="?",
        default=None,
    )
    @CLICommand.arguments(
        "--status",
        metavar="<status>",
        help=f"Filter by status. Choices are: {', '.join(status_enum)}",
        type=str,
        default=None,
        choices=status_enum,
    )
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.arguments(
        "--vpc", metavar="<vpc>", help="Filter by VPC id. Required if --site is not specified.", type=str
    )
    @CLICommand.arguments(
        "--site", metavar="<site>", help="Filter by site id. Required if --vpc is not specified.", type=str
    )
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List VPC prefixes."""
        try:
            resp = self.api.list(args.query, org=args.org, vpc=args.vpc, site=args.site, status=args.status)
        except NeedsVpcOrSiteArgsError:
            raise NgcException(
                textwrap.dedent(
                    """\
                    Missing argument: '--vpc' or '--site'

                    You must specify at least one of '--vpc' or '--site'."""
                )
            ) from None
        check_add_args_columns(args.column, VpcPrefixCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "VPC prefix information."

    @CLICommand.arguments("vpc_prefix", metavar="<vpc-prefix>", help="VPC prefix id", type=str)
    @CLICommand.arguments("--status-history", help="Show status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """VPC prefix info."""
        resp = self.api.info(args.vpc_prefix, org=args.org)
        self.printer.print_info(resp, args.status_history)

    CREATE_HELP = "Create VPC prefix."

    @CLICommand.arguments("name", metavar="<name>", help="VPC prefix name.", type=str)
    @CLICommand.arguments("--vpc", metavar="<vpc>", help="Specify VPC id.", type=str, required=True)
    @CLICommand.arguments("--prefix-length", metavar="<prefix-length>", help="Prefix length.", type=int, required=True)
    @CLICommand.arguments("--ip-block", metavar="<ip-block>", help="Specify IP block id.", type=str)
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create VPC prefix."""
        resp = self.api.create(
            args.name,
            org=args.org,
            vpc=args.vpc,
            prefix_length=args.prefix_length,
            ip_block=args.ip_block,
        )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update VPC prefix."

    @CLICommand.arguments("vpc_prefix", metavar="<vpc-prefix>", help="VPC prefix id.", type=str)
    @CLICommand.arguments("--name", metavar="<name>", help="Specify VPC prefix name.", type=str)
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update VPC prefix."""
        resp = self.api.update(args.vpc_prefix, org=args.org, name=args.name)
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove VPC prefix."

    @CLICommand.arguments("vpc_prefix", metavar="<vpc-prefix>", help="VPC prefix id.", type=str)
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove VPC prefix."""
        self.api.remove(args.vpc_prefix, org=args.org)
        if self.config.format_type == "json":
            # Print valid JSON, even though we don't have anything interesting to show here.
            self.printer.print_json({})
