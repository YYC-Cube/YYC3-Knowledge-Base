# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.forge import ForgeCommand
from forge.printer.tenant import TenantPrinter
from ngcbase.command.clicommand import CLICommand


class TenantCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "tenant"
    HELP = "Tenant Commands"
    DESC = "Tenant Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.tenant
        self.printer = TenantPrinter(self.client.config)

    INFO_HELP = "Current tenant information."

    @CLICommand.arguments(
        "--statistics", help="Show statistics for current tenant.", action="store_true", default=False
    )
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Tenant info."""
        resp, stats = self.api.info(args.org, args.team, args.statistics)
        self.printer.print_info(resp, stats)
