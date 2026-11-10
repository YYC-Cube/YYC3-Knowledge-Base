# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.forge import ForgeCommand
from forge.printer.subnet import SubnetPrinter
from ngcbase.command.args_validation import check_add_args_columns, check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.util.utils import get_columns_help


class SubnetCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "subnet"
    HELP = "Subnet Commands"
    DESC = "Subnet Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.subnet
        self.printer = SubnetPrinter(self.client.config)

    LIST_HELP = "List Subnets."

    columns_dict = {
        "name": "Name",
        "description": "Description",
        "vpcId": "VPC Id",
        "vpcName": "VPC Name",
        "tenantId": "Tenant Id",
        "tenantName": "Tenant Name",
        "ipv4Prefix": "Ipv4 Prefix",
        "ipv4BlockId": "Ipv4 Block Id",
        "ipv4Gateway": "Ipv4 Gateway",
        "ipv4BlockName": "Ipv4 Block Name",
        "ipv6Prefix": "Ipv6 Prefix",
        "ipv6BlockId": "Ipv6 Block Id",
        "ipv6Gateway": "Ipv6 Gateway",
        "ipv6BlockName": "Ipv6 Block Name",
        "prefixLength": "Prefix Length",
        "routingType": "Routing Type",
        "status": "Status",
        "created": "Created",
        "updated": "Updated",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)
    status_enum = ["Pending", "Provisioning", "Ready", "Deleting", "Error"]

    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help="Filter by matches across all subnets. Input will be matched against name, description and status fields.",
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
    @CLICommand.arguments("--vpc", metavar="<vpc>", help="Filter by VPC id.", type=str)
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List Subnets."""
        resp = self.api.list(args.org, args.team, args.vpc, args.target, args.status)
        check_add_args_columns(args.column, SubnetCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "Subnet information."

    @CLICommand.arguments("subnet", metavar="<subnet>", help="Subnet id.", type=str)
    @CLICommand.arguments("--status-history", help="Show status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Subnet info."""
        resp = self.api.info(args.subnet, args.org, args.team)
        self.printer.print_info(resp, args.status_history)

    CREATE_HELP = "Create subnet."
    CREATE_COND = "Either ipv4 or ipv6 block id must be specified."

    @CLICommand.arguments("name", metavar="<name>", help="Subnet name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify subnet description.", type=str)
    @CLICommand.arguments("--vpc", metavar="<vpc>", help="Specify VPC id.", type=str, required=True)
    @CLICommand.arguments(
        "--ipv4-block",
        metavar="<ipv4_block>",
        help=f"Specify the ipv4 ipblock id or derived resource id from the allocation. {CREATE_COND}",
        type=str,
    )
    @CLICommand.arguments(
        "--ipv6-block",
        metavar="<ipv4_block>",
        help=f"Specify the ipv6 ipblock id or derived resource id from the allocation. {CREATE_COND}",
        type=str,
    )
    @CLICommand.arguments(
        "--prefix-length",
        metavar="<prefix_length>",
        help="Specify prefix length. Allowed range is [8-32]..",
        type=int,
        required=True,
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create subnet."""
        resp = self.api.create(
            args.name,
            args.vpc,
            args.prefix_length,
            args.org,
            args.team,
            args.description,
            args.ipv4_block,
            args.ipv6_block,
        )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update subnet."

    @CLICommand.arguments("subnet", metavar="<subnet>", help="Subnet id.", type=str)
    @CLICommand.arguments("--name", metavar="<name>", help="Specify subnet name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify subnet description.", type=str)
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update Subnet."""
        resp = self.api.update(args.subnet, args.org, args.team, args.name, args.description)
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove subnet."

    @CLICommand.arguments("subnet", metavar="<subnet>", help="Subnet id.", type=str)
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove Subnet."""
        resp = self.api.remove(args.subnet, args.org, args.team)
        self.printer.print_ok(f"{resp}")
