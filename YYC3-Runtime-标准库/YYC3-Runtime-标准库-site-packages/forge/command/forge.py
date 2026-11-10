# Copyright (c) 2017-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from ngcbase.command.clicommand import CLICommand


class ForgeCommand(CLICommand):  # noqa: D101
    CMD_NAME = "forge"
    HELP = "Forge Commands"
    DESC = "Forge Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.make_bottom_commands(parser)
