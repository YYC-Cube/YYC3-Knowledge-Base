# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.forge import ForgeCommand
from forge.printer.rule import RulePrinter
from ngcbase.command.args_validation import check_add_args_columns, check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import CONFIG_TYPE, DISABLE_TYPE, STAGING_ENV
from ngcbase.util.utils import get_columns_help, get_environ_tag


class RuleCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "rule"
    HELP = "Rule Commands"
    DESC = "Rule Commands"
    COMMAND_DISABLE = get_environ_tag() > STAGING_ENV
    CLI_HELP = CONFIG_TYPE if (get_environ_tag() <= STAGING_ENV) else DISABLE_TYPE

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.rule
        self.printer = RulePrinter(self.client.config)

    LIST_HELP = "List Rules."
    LIST_COND = "Either infrastructure provider id or tenant id must be specified."

    columns_dict = {
        "name": "Name",
        "description": "Description",
        "siteId": "Site Id",
        "tenantId": "Tenant Id",
        "vpcId": "VPC Id",
        "subnetId": "Subnet Id",
        "instanceId": "Instance Id",
        "status": "Status",
        "created": "Created",
        "updated": "Updated",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)

    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.arguments("--vpc", metavar="<vpc>", help="Filter by vpc id.", type=str)
    @CLICommand.arguments("--subnet", metavar="<subnet>", help="Filter by subnet id.", type=str)
    @CLICommand.arguments("--instance", metavar="<instance>", help="Filter by instance id.", type=str)
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List Rules."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.list(org_name, team_name, args.vpc, args.subnet, args.instance)
        check_add_args_columns(args.column, RuleCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "Rule information."

    @CLICommand.arguments("rule", metavar="<rule>", help="Rule id.", type=str)
    @CLICommand.arguments("--status-history", help="Show rule status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Rule info."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.info(org_name, team_name, args.rule)
        self.printer.print_info(resp[0], args.status_history)

    CREATE_HELP = "Create Rule."
    PROTOCOL_TYPE_ENUM = ["TCP", "UDP", "ICMP", "ALL"]

    @CLICommand.arguments("name", metavar="<name>", help="Rule name.", type=str)
    @CLICommand.arguments("--description", metavar="<description>", help="Specify rule description.", type=str)
    @CLICommand.arguments("--vpc", metavar="<vpc>", help="Specify VPC id.", type=str)
    @CLICommand.arguments("--subnet", metavar="<subnet>", help="Specify subnet id.", type=str)
    @CLICommand.arguments("--instance", metavar="<instance>", help="Specify instance id.", type=str)
    @CLICommand.arguments("--inbound", help="Specify inbound.", action="store_true")
    @CLICommand.arguments("--outbound", help="Specify outbound.", action="store_true")
    @CLICommand.arguments(
        "--protocol",
        help=f"Specify constraint type. Choices are: {', '.join(PROTOCOL_TYPE_ENUM)}",
        type=str,
        default="Limit",
        choices=PROTOCOL_TYPE_ENUM,
        required=True,
    )
    @CLICommand.arguments("--port-range", metavar="<port_range>", help="Specify port range.", type=str, required=True)
    @CLICommand.arguments("--to-or-from-cidr", metavar="<to_or_from_cidr>", help="Specify cidr id.", type=str)
    @CLICommand.arguments("--to-or-from-vpc", metavar="<to_or_from_vpc>", help="Specify vpc id.", type=str)
    @CLICommand.arguments("--to-or-from-subnet", metavar="<to_or_from_subnet>", help="Specify subnet id.", type=str)
    @CLICommand.arguments(
        "--to-or-from-instance", metavar="<to_or_from_instance>", help="Specify instance id.", type=str
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create Rule."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        tenant = None
        tenant_info, _ = self.client.forge.tenant.info(org_name, team_name)
        tenant = tenant_info.get("id", "")
        resp = self.api.create(
            org_name,
            team_name,
            args.name,
            args.description,
            tenant,
            args.vpc,
            args.subnet,
            args.instance,
            args.inbound,
            args.outbound,
            args.protocol,
            args.port_range,
            args.to_or_from_cidr,
            args.to_or_from_vpc,
            args.to_or_from_subnet,
            args.to_or_from_instance,
        )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update rule."

    @CLICommand.arguments("rule", metavar="<rule>", help="Rule id.", type=str)
    @CLICommand.arguments("--name", metavar="<name>", help="Specify rule name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify rule description.", type=str)
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update Rule."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.update(org_name, team_name, args.rule, args.name, args.description)
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove Rule."

    @CLICommand.arguments("rule", metavar="<rule>", help="Rule id.", type=str)
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove Rule."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.remove(org_name, team_name, args.rule)
        self.printer.print_ok(f"{resp}")
