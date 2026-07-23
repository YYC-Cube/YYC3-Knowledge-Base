# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.forge import ForgeCommand
from forge.printer.allocation import AllocationPrinter
from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_positive_int_32_bit,
    check_valid_columns,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.util.utils import get_columns_help


class AllocationCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "allocation"
    HELP = "Allocation Commands"
    DESC = "Allocation Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.allocation
        self.printer = AllocationPrinter(self.client.config)

    RESOURCE_TYPE_ENUM = ["InstanceType", "IPBlock"]
    LIST_HELP = "List Allocations."
    LIST_COND = "Either infrastructure provider id or tenant id must be specified."

    columns_dict = {
        "name": "Name",
        "description": "Description",
        "infrastructureProviderId": "Infrastructure Provider Id",
        "infrastructureProviderName": "Infrastructure Provider Name",
        "tenantId": "Tenant Id",
        "tenantName": "Tenant Name",
        "siteId": "Site Id",
        "siteName": "Site Name",
        "resourceType": "Resource Type",
        "constraintType": "Constraint Type",
        "constraintValue": "Constraint Value",
        "status": "Status",
        "created": "Created",
        "updated": "Updated",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)
    status_enum = ["Pending", "Registered", "Deleting", "Error"]

    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help=(
            "Filter by matches across all allocations. Input will be matched against name, description and status"
            " fields."
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
    @CLICommand.arguments("--tenant", metavar="<tenant>", help="Filter by tenant id.", type=str)
    @CLICommand.arguments(
        "--resource-type",
        metavar="<resource_type>",
        help=f"Filter by resource type. Choices are: {', '.join(RESOURCE_TYPE_ENUM)}",
        type=str,
        choices=RESOURCE_TYPE_ENUM,
    )
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List Allocations."""
        resp = self.api.list(
            args.org, args.team, None, args.tenant, args.site, args.resource_type, args.target, args.status
        )
        check_add_args_columns(args.column, AllocationCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "Allocation information."

    @CLICommand.arguments("allocation", metavar="<allocation>", help="Allocation id.", type=str)
    @CLICommand.arguments("--status-history", help="Show allocation status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Allocation info."""
        resp = self.api.info(args.allocation, args.org, args.team)
        self.printer.print_info(resp, args.status_history)

    CREATE_HELP = "Create Allocation."
    CONSTRAINT_TYPE_ENUM = ["Reserved", "OnDemand", "Preemptible"]

    @CLICommand.arguments("name", metavar="<name>", help="Allocation name.", type=str)
    @CLICommand.arguments("--description", metavar="<description>", help="Specify allocation description.", type=str)
    @CLICommand.arguments("--site", metavar="<id>", help="Specify site id.", type=str, required=True)
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
        help="Specify instance type id or ip block id for constraint.",
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
        "--constraint-value",
        metavar="<constraint_value>",
        help="Specify constraint value.",
        type=int,
        action=check_positive_int_32_bit(),
        required=True,
    )
    @CLICommand.arguments(
        "--tenant", metavar="<tenant>", help="Specify tenant id, required for non tenant admins.", type=str
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create Allocation."""
        resp = self.api.create(
            args.name,
            args.site,
            args.org,
            args.team,
            args.tenant,
            args.resource_type,
            args.resource,
            args.constraint_type,
            args.constraint_value,
            args.description,
        )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update allocation."

    @CLICommand.arguments("allocation", metavar="<allocation>", help="Allocation id.", type=str)
    @CLICommand.arguments("--name", metavar="<name>", help="Specify allocation name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify allocation description.", type=str)
    @CLICommand.arguments("--constraint", metavar="<constraint>", help="Specify constraint id.", type=str)
    @CLICommand.arguments(
        "--constraint-value",
        metavar="<constraint_value>",
        help="Specify constraint value. Constraint id is required.",
        type=int,
        action=check_positive_int_32_bit(),
    )
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update Allocation."""
        resp = self.api.update(
            args.allocation, args.org, args.team, args.name, args.description, args.constraint, args.constraint_value
        )
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove Allocation."

    @CLICommand.arguments("allocation", metavar="<allocation>", help="Allocation id.", type=str)
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove Allocation."""
        resp = self.api.remove(args.allocation, args.org, args.team)
        self.printer.print_ok(f"{resp}")
