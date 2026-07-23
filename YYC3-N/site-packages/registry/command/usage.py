#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from builtins import round

from ngcbase.command.clicommand import CLICommand
from registry.command.registry import RegistryCommand
from registry.printer.usage import UsagePrinter


class UsageCommand(RegistryCommand):  # noqa: D101

    CMD_NAME = "usage"
    HELP = "Registry Usage Commands"
    DESC = "Registry Usage Commands"
    CMD_ALIAS = []

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.registry_client = self.client.registry
        self.usage_client = self.client.registry.usage
        self.usage_printer = UsagePrinter(self.client.config)

    INFO_HELP = "Show Registry Storage usage."

    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, _):  # noqa: D102
        self.config.validate_configuration()
        private_registry_usage_response = self.usage_client.info()
        try:
            # time series displays oldest->newest
            registry_usage = private_registry_usage_response.measurements[0].series[0].values[-1].value[1]
            registry_usage_gb = round(float(registry_usage) / 1e9, 1)
        except (TypeError, IndexError):
            registry_usage_gb = ""

        self.usage_printer.print_usage(registry_usage_gb)
