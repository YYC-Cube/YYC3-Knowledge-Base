# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.allocation import AllocationCommand
from forge.printer.constraint import ConstraintPrinter
from ngcbase.command.args_validation import check_add_args_columns, check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import DISABLE_TYPE
from ngcbase.util.utils import get_columns_help, has_org_role


class ConstraintCommand(AllocationCommand):  # noqa: D101

    CMD_NAME = "constraint"
    HELP = "Constraint Commands"
    DESC = "Constraint Commands"
    COMMAND_DISABLE = True
    CLI_HELP = DISABLE_TYPE

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.constraint
        self.printer = ConstraintPrinter(self.client.config)

    LIST_HELP = "List constraints."

    columns_dict = {
        "allocationId": "Allocation Id",
        "resourceType": "Resource Type",
        "resourceTypeId": "Resource Type Id",
        "constraintType": "Constraint Type",
        "constraintValue": "Constraint Value",
        "derivedResourceId": "Derived Resource Id",
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
    @CLICommand.arguments(
        "--allocation", metavar="<allocation>", help="Specify allocation id.", type=str, required=True
    )
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List Constraints."""
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
        resp = self.api.list(org_name, team_name, provider, tenant, args.allocation)
        check_add_args_columns(args.column, ConstraintCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "Constraint information."

    @CLICommand.arguments("constraint", metavar="<constraint>", help="Constraint id.", type=str)
    @CLICommand.arguments(
        "--allocation", metavar="<allocation>", help="Specify allocation id.", type=str, required=True
    )
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Constraint info."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.info(org_name, team_name, args.constraint, args.allocation)
        self.printer.print_info(resp[0])

    CREATE_HELP = "Create constraint."
    RESOURCE_TYPE_ENUM = ["InstanceType", "IpBlock"]
    CONSTRAINT_TYPE_ENUM = ["Limit"]

    @CLICommand.arguments(
        "--allocation", metavar="<allocation>", help="Specify allocation id.", type=str, required=True
    )
    @CLICommand.arguments(
        "--resource-type",
        metavar="<resource_type>",
        help=f"Specify resource type for constraint. Choices are: {', '.join(RESOURCE_TYPE_ENUM)}",
        type=str,
        choices=RESOURCE_TYPE_ENUM,
        required=True,
    )
    @CLICommand.arguments(
        "--resource",
        metavar="<resource>",
        help="Specify resource type id for constraint.",
        type=str,
        required=True,
    )
    @CLICommand.arguments(
        "--constraint-type",
        metavar="<constraint_type>",
        help=f"Specify constraint type. Choices are: {', '.join(CONSTRAINT_TYPE_ENUM)}",
        type=str,
        default="Limit",
        choices=CONSTRAINT_TYPE_ENUM,
        required=True,
    )
    @CLICommand.arguments(
        "--constraint-value", metavar="<constraint_value>", help="Specify constraint value.", type=int, required=True
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create Constraint."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.create(
            org_name,
            team_name,
            args.allocation,
            args.resource_type,
            args.resource,
            args.constraint_type,
            args.constraint_value,
        )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update constraint."

    @CLICommand.arguments("constraint", metavar="<constraint>", help="Constraint id.", type=str)
    @CLICommand.arguments(
        "--allocation", metavar="<allocation>", help="Specify allocation id.", type=str, required=True
    )
    @CLICommand.arguments(
        "--constraint-value", metavar="<value>", help="Specify constraint value.", type=int, required=True
    )
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update Constraint."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.update(org_name, team_name, args.constraint, args.allocation, args.constraint_value)
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove constraint."

    @CLICommand.arguments("constraint", metavar="<constraint>", help="Constraint id.", type=str)
    @CLICommand.arguments(
        "--allocation", metavar="<allocation>", help="Specify allocation id.", type=str, required=True
    )
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove Constraint."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.remove(org_name, team_name, args.constraint, args.allocation)
        self.printer.print_ok(f"{resp}")
