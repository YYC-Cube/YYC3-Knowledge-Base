# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.forge import ForgeCommand
from forge.printer.ipblock import IpblockPrinter
from ngcbase.command.args_validation import check_add_args_columns, check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.errors import InvalidArgumentError
from ngcbase.util.utils import get_columns_help, has_org_role


class IpblockCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "ipblock"
    HELP = "Ipblock Commands"
    DESC = "Ipblock Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.ipblock
        self.printer = IpblockPrinter(self.client.config)

    LIST_HELP = "List ipblocks for the org."
    LIST_COND = "Either infrastructure provider id or tenant id must be specified."

    columns_dict = {
        "name": "Name",
        "description": "Description",
        "siteId": "Site Id",
        "siteName": "Site Name",
        "infrastructureProviderId": "Infrastructure Provider Id",
        "infrastructureProviderName": "Infrastructure Provider Name",
        "tenantId": "Tenant Id",
        "tenantName": "Tenant Name",
        "routingType": "Routing Type",
        "prefix": "Prefix",
        "prefixLength": "Prefix Length",
        "protocolVersion": "Protocol Version",
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
        help=(
            "Filter by matches across the ipblocks. Input will be matched against name, description and status fields."
        ),
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
    @CLICommand.arguments("--site", metavar="<site>", help="Filter by site id.", type=str)
    @CLICommand.arguments(
        "--id", metavar="<ipblock>", help="List derived ipblocks for the specified ipblock.", type=str
    )
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List Ipblocks."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        provider = None
        tenant = None
        if args.id:
            resp = self.api.list(org_name, team_name, provider, tenant, None, args.target, args.status, args.id)
        else:
            user_resp = self.client.users.user_who(org_name)
            if has_org_role(user_resp, org_name, ["FORGE_PROVIDER_ADMIN"]):
                provider_info, _ = self.client.forge.provider.info(org_name, team_name)
                provider = provider_info.get("id", "")
            elif has_org_role(user_resp, org_name, ["FORGE_TENANT_ADMIN"]):
                tenant_info, _ = self.client.forge.tenant.info(org_name, team_name)
                tenant = tenant_info.get("id", "")
            resp = self.api.list(org_name, team_name, provider, tenant, args.site, args.target, args.status, None)
        check_add_args_columns(args.column, IpblockCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "Ipblock information."

    @CLICommand.arguments("ipblock", metavar="<ipblock>", help="IP Block id.", type=str)
    @CLICommand.arguments("--status-history", help="Show status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Ipblock info."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        provider = None
        tenant = None
        user_resp = self.client.users.user_who(org_name)
        if has_org_role(user_resp, org_name, ["FORGE_PROVIDER_ADMIN"]):
            provider_info, _ = self.client.forge.provider.info(org_name, team_name)
            provider = provider_info.get("id", "")
        elif has_org_role(user_resp, org_name, ["FORGE_TENANT_ADMIN"]):
            tenant_info, _ = self.client.forge.tenant.info(org_name, team_name)
            tenant = tenant_info.get("id", "")
        resp = self.api.info(org_name, team_name, args.ipblock, provider, tenant)
        self.printer.print_info(resp, args.status_history)

    CREATE_HELP = "Create ipblock."
    ROUTING_TYPE_ENUM = ["Public", "DatacenterOnly"]
    PROTOCOL_VERSION_ENUM = ["IPv4", "IPv6"]

    @CLICommand.arguments("name", metavar="<name>", help="IP Block Name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify description.", type=str)
    @CLICommand.arguments("--site", metavar="<site>", help="Specify site id.", type=str, required=True)
    @CLICommand.arguments(
        "--routing-type",
        metavar="<routing_type>",
        help=f"Specify routing type. Choices are: {', '.join(ROUTING_TYPE_ENUM)}",
        type=str,
        choices=ROUTING_TYPE_ENUM,
        required=True,
    )
    @CLICommand.arguments("--prefix", metavar="<prefix>", help="Specify ipv4 or ipv6 address.", type=str, required=True)
    @CLICommand.arguments(
        "--prefix-length",
        metavar="<prefix_length>",
        help="Specify prefix length. Minimum is 1. Maximum is 32 for IPv4 and 128 for IPv6.",
        type=int,
        required=True,
    )
    @CLICommand.arguments(
        "--protocol-version",
        metavar="<protocol_version>",
        help=f"Specify protocol version. Choices are: {', '.join(PROTOCOL_VERSION_ENUM)}",
        type=str,
        choices=PROTOCOL_VERSION_ENUM,
        required=True,
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create Ipblock."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        prefix_length_max = 32 if args.protocol_version == "IPv4" else 128
        if not 1 <= args.prefix_length <= prefix_length_max:
            raise InvalidArgumentError(
                "argument: --prefix-length allowed range is [1-32] for IPv4 and [1-128] for IPv6."
            )
        resp = self.api.create(
            org_name,
            team_name,
            args.name,
            args.description,
            args.site,
            args.routing_type,
            args.prefix,
            args.prefix_length,
            args.protocol_version,
        )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update Ipblock."

    @CLICommand.arguments("ipblock", metavar="<ipblock>", help="IP Block id.", type=str)
    @CLICommand.arguments("--name", metavar="<name>", help="Specify ip block name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify ip block description.", type=str)
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update Ipblock."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.update(org_name, team_name, args.ipblock, args.name, args.description)
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove Ipblock."

    @CLICommand.arguments("ipblock", metavar="<ipblock>", help="IP Block id.", type=str)
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove Ipblock."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.remove(org_name, team_name, args.ipblock)
        self.printer.print_ok(f"{resp}")
