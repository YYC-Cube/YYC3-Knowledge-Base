# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.forge import ForgeCommand
from forge.printer.user import UserPrinter
from ngcbase.command.clicommand import CLICommand


class UserCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "user"
    HELP = "User Commands"
    DESC = "User Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.user
        self.printer = UserPrinter(self.client.config)

    INFO_HELP = "Current user information."

    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """User info."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.info(org_name, team_name)
        self.printer.print_info(resp)
