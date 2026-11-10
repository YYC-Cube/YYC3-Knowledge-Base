# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from argparse import BooleanOptionalAction

from forge.command._shared import wrap_bad_request_exception
from forge.command.forge import ForgeCommand
from forge.printer.machine import MachinePrinter
from ngcbase.command.clicommand import CLICommand


class MachineCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "machine"
    HELP = "Machine Commands"
    DESC = "Machine Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.machine
        self.printer = MachinePrinter(self.client.config)

    LIST_HELP = "List machines for the org."
    status_enum = ["Initializing", "Ready", "Reset", "Maintenance", "InUse", "Error", "Decommissioned", "Unknown"]

    @CLICommand.arguments(
        "--status",
        metavar="<status>",
        help=f"Filter by status. Choices are: {', '.join(status_enum)}",
        type=str,
        default=None,
        choices=status_enum,
    )
    @CLICommand.arguments("--site", metavar="<site>", help="Filter by site id.", type=str)
    @CLICommand.arguments(
        "--assigned",
        dest="assigned",
        help="Filter machines that have an instance type assigned, site argument is required.",
        action="store_true",
    )
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List Machines."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.list(org_name, team_name, args.site, args.assigned, args.status)
        self.printer.print_list(resp)

    INFO_HELP = "Machine information."

    @CLICommand.arguments("machine", metavar="<machine>", help="Machine id.", type=str)
    @CLICommand.arguments("--status-history", help="Show status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Machine Info."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.info(org_name, team_name, args.machine)
        self.printer.print_info(resp, status_history=args.status_history)

    UPDATE_HELP = "Update machine."

    @CLICommand.arguments("machine", metavar="<machine>", help="Machine id.", type=str)
    @CLICommand.arguments(
        "--instance-type", metavar="<instance_type>", help="Specify instance type id to assign.", type=str
    )
    @CLICommand.arguments("--clear-instance-type", help="Clear the assigned instance type id.", action="store_true")
    @CLICommand.arguments("--maintenance-mode", help="Set or unset the maintenance mode.", action=BooleanOptionalAction)
    @CLICommand.arguments(
        "--maintenance-message", metavar="<maintenance_message>", help="Specify the maintenance message.", type=str
    )
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    @CLICommand.mutex(["instance_type"], ["clear_instance_type"])
    def update(self, args):
        """Machine Update."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.update(
            org_name,
            team_name,
            args.machine,
            args.instance_type,
            args.clear_instance_type,
            args.maintenance_mode,
            args.maintenance_message,
        )
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove a machine."

    @CLICommand.arguments("machine", metavar="<machine>", help="Machine id.", type=str)
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove a machine."""
        with wrap_bad_request_exception():
            self.api.remove(args.machine, org=args.org)
        if self.config.format_type == "json":
            # Print valid JSON, even though we don't have anything interesting to show here.
            self.printer.print_json({})
