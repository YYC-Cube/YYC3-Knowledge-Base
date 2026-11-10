# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.forge import ForgeCommand
from forge.printer.provider import ProviderPrinter
from ngcbase.command.clicommand import CLICommand


class ProviderCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "provider"
    HELP = "Infrastructure Provider Commands"
    DESC = "Infrastructure Provider Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.provider
        self.printer = ProviderPrinter(self.client.config)

    INFO_HELP = "Current infrastructure provider."

    @CLICommand.arguments(
        "--statistics", help="Show statistics for current infrastructure provider.", action="store_true", default=False
    )
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Infrastructure provider info."""
        resp, stats = self.api.info(args.org, args.team, args.statistics)
        self.printer.print_info(resp, stats)
