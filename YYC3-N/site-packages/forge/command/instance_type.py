# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.args_validation import check_machine_capability
from forge.command.forge import ForgeCommand
from forge.printer.instance_type import InstanceTypePrinter
from ngcbase.command.args_validation import check_add_args_columns, check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.util.utils import get_columns_help


class InstanceTypeCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "instance-type"
    HELP = "Instance Type Commands"
    DESC = "Instance Type Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.instance_type
        self.printer = InstanceTypePrinter(self.client.config)

    LIST_HELP = "List instance types for the site."
    LIST_COND = "Either infrastructure provider id or tenant id must be specified."

    columns_dict = {
        "name": "Name",
        "displayName": "Display Name",
        "description": "Description",
        "controllerMachineType": "Controller Machine Type",
        "infrastructureProviderId": "Infrastructure Provider Id",
        "infrastructureProviderName": "Infrastructure Provider Name",
        "siteId": "Site Id",
        "siteName": "Site Name",
        "status": "Status",
        "created": "Created",
        "updated": "Updated",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)
    status_enum = ["Pending", "Registering", "Ready", "Deleting", "Error"]

    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help=(
            "Filter by matches across all instance types. Input will be matched against name, description and status"
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
    @CLICommand.arguments("--site", metavar="<site>", help="Specify site id.", type=str, required=True)
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List Instance Types."""
        resp = self.api.list(args.site, args.org, args.team, args.target, args.status)
        check_add_args_columns(args.column, InstanceTypeCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "Instance type information."

    @CLICommand.arguments("instance_type", metavar="<instance_type>", help="Instance type id.", type=str)
    @CLICommand.arguments("--status-history", help="Show status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Instance Type Info."""
        resp = self.api.info(args.instance_type, args.org, args.team)
        self.printer.print_info(resp, args.status_history)

    CREATE_HELP = "Create instance type."
    MC_TYPE_ENUM = ["CPU", "Memory", "Storage", "Network", "GPU", "InfiniBand"]

    @CLICommand.arguments("name", metavar="<name>", help="Instance type name.", type=str)
    @CLICommand.arguments("--display-name", metavar="<display_name>", help="Specify display name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify description.", type=str)
    @CLICommand.arguments(
        "--controller-machine-type", metavar="<type>", help="Specify controller machine type.", type=str
    )
    @CLICommand.arguments(
        "--machine-capability",
        metavar="<type=<enum>,name=<string>,frequency=<string>,cores=<int>,threads=<int>,capacity=<str>,count=<int>",
        help=(
            "Specify machine capability. Multiple machine capability arguments are allowed. Choices for type are:"
            f" {', '.join(MC_TYPE_ENUM)}"
        ),
        type=lambda value, mc_type_enum=MC_TYPE_ENUM: check_machine_capability(value, mc_type_enum),
        action="append",
    )
    @CLICommand.arguments("--site", metavar="<site>", help="Specify site id.", type=str, required=True)
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create Instance Type."""
        resp = self.api.create(
            args.name,
            args.site,
            args.org,
            args.team,
            args.display_name,
            args.description,
            args.controller_machine_type,
            args.machine_capability,
        )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update instance type."

    @CLICommand.arguments("instance_type", metavar="<instance_type>", help="Instance type id.", type=str)
    @CLICommand.arguments("--name", metavar="<name>", help="Specify name", type=str)
    @CLICommand.arguments("--display-name", metavar="<display_name>", help="Specify display name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify description.", type=str)
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update Instance Type."""
        resp = self.api.update(args.instance_type, args.org, args.team, args.name, args.display_name, args.description)
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove instance type."

    @CLICommand.arguments("instance_type", metavar="<instance_type>", help="Instance type id.", type=str)
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove Instance Type."""
        resp = self.api.remove(args.instance_type, args.org, args.team)
        self.printer.print_ok(f"{resp}")

    LIST_MACHINE_HELP = "List all machines for the instance type."

    @CLICommand.arguments("instance_type", metavar="<instance_type>", help="Instance type id.", type=str)
    @CLICommand.command(name="list-machine", help=LIST_MACHINE_HELP, description=LIST_MACHINE_HELP)
    def list_machine(self, args):
        """List Instance Type Machine Associations."""
        resp = self.api.list_machine(args.instance_type, args.org, args.team)
        self.printer.print_list_machine(resp)

    CREATE_MACHINE_HELP = "Assign instance type to machine."

    @CLICommand.arguments("instance_type", metavar="<instance_type>", help="Instance type id.", type=str)
    @CLICommand.arguments(
        "--machine",
        metavar="<machine>",
        help="Specify machine id. Multiple machine arguments are allowed.",
        default=None,
        action="append",
        type=str,
        required=True,
    )
    @CLICommand.command(help=CREATE_MACHINE_HELP, description=CREATE_MACHINE_HELP)
    def assign(self, args):
        """Assign Instance Type Machine Association."""
        resp = self.api.assign(args.instance_type, args.machine, args.org, args.team)
        self.printer.print_info_machine(resp)

    REMOVE_MACHINE_HELP = "Unassign instance type of machine."

    @CLICommand.arguments("instance_type", metavar="<instance_type>", help="Instance type id.", type=str)
    @CLICommand.arguments("--association", metavar="<association>", help="Specify association id.", type=str)
    @CLICommand.command(help=REMOVE_MACHINE_HELP, description=REMOVE_MACHINE_HELP)
    def unassign(self, args):
        """Unassign Instance Type Machine Association."""
        resp = self.api.unassign(args.instance_type, args.association, args.org, args.team)
        self.printer.print_ok(f"{resp}")
