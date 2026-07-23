#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. ALL RIGHTS RESERVED.
#
# This software product is a proprietary product of Nvidia Corporation and its affiliates
# (the "Company") and all right, title, and interest in and to the software
# product, including all associated intellectual property rights, are and
# shall remain exclusively with the Company.
#
# This software product is governed by the End User License Agreement
# provided with the software product.

from basecommand.command.base_command import BaseCommand
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import ENABLE_TYPE


class QuickStartCommand(BaseCommand, CLICommand):  # noqa: D101
    CMD_NAME = "pym"
    HELP = "QuickStart Commands"
    DESC = "QuickStart Commands"
    CLI_HELP = ENABLE_TYPE
    COMMAND_DISABLE = False

    WARN_MSG = " (Warning: 'ngc pym' is deprecated, use 'ngc base-command quickstart'.)"
    WARN_COND = CLICommand
    CMD_ALIAS = ["qs"]
    CMD_ALT_NAME = "quickstart"
    CMD_ALT_COND = BaseCommand

    def __init__(self, parser):
        super().__init__(parser)
        self.make_bottom_commands(parser)
