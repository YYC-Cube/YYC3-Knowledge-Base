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
#

#
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import DISABLE_TYPE, ENABLE_TYPE, STAGING_ENV
from ngcbase.util.utils import get_environ_tag
from registry.command.model import ModelSubCommand
from registry.printer.playground import PlaygroundPrinter


class ModelPlaygroundCommand(ModelSubCommand):
    """Command tree for playground of models."""

    CMD_NAME = "playground"
    HELP = "Manage playground for model."
    DESC = "Manage playground for model."
    CLI_HELP = ENABLE_TYPE if (get_environ_tag() <= STAGING_ENV) else DISABLE_TYPE

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.playground_api = self.client.registry.playground
        self.printer = PlaygroundPrinter(self.client.config)

    MODEL_NO_VERSION_METAVAR = "<org>/[<team>/]<model_name>"

    info_playground_help = "Get the info of the playground for a model."

    @CLICommand.command(help=info_playground_help, description=info_playground_help)
    @CLICommand.arguments(
        "target", metavar=MODEL_NO_VERSION_METAVAR, help="Modelname of the playground to lookup", type=str
    )
    def info(self, args):
        """Get the info of the playground for a model. Guest mode is allowed."""
        playground_details = self.playground_api.info(args.target)
        self.printer.print_info(playground_details)
