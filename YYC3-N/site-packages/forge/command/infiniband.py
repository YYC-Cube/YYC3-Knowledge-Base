# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.forge import ForgeCommand
from forge.printer.infiniband import InfiniBandPartitionPrinter
from ngcbase.command.args_validation import check_add_args_columns, check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.util.utils import get_columns_help


class InfiniBandPartitionCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "infiniband-partition"
    HELP = "InfiniBand Partition Commands"
    DESC = "InfiniBand Partition Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.infiniband_partition
        self.printer = InfiniBandPartitionPrinter(self.client.config)

    LIST_HELP = "List infiniband partitions."
    columns_dict = {
        "name": "Name",
        "siteName": "Site Name",
        "vpcName": "VPC Name",
        "partitionKey": "Partition key",
        "partitionName": "Partition Name",
        "serviceLevel": "Service Level",
        "rateLimit": "Rate Limit",
        "mtu": "MTU",
        "enableSharp": "Enable Sharp",
        "status": "Status",
        "updated": "Updated",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)
    status_enum = ["Pending", "Provisioning", "Configuring", "Ready", "Rebooting", "Terminating", "Error"]

    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help="Filter by matches across all sites. Input will be matched against name, description and status fields.",
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
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List InfiniBandPartitions."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.list(org_name, team_name, args.site, args.target, args.status)
        check_add_args_columns(args.column, InfiniBandPartitionCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "InfiniBandPartition information."

    @CLICommand.arguments(
        "infiniband_partition", metavar="<infiniband_partition>", help="InfiniBandPartition ID.", type=str
    )
    @CLICommand.arguments("--status-history", help="Show status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """InfiniBandPartition info."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.info(org_name, team_name, args.infiniband_partition)
        self.printer.print_info(resp, args.status_history)

    CREATE_HELP = "Create InfiniBand Partition."

    @CLICommand.arguments("name", metavar="<name>", help="InfiniBand Partition name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="InfiniBand Partition description.", type=str)
    @CLICommand.arguments(
        "--site",
        metavar="<site>",
        help="Specify the site ID.",
        type=str,
        required=True,
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create InfiniBandPartition."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.create(
            org_name,
            team_name,
            args.name,
            args.description,
            args.site,
        )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update InfiniBand Partition."

    @CLICommand.arguments(
        "infiniband_partition", metavar="<infiniband_partition>", help="InfiniBand Partition ID.", type=str
    )
    @CLICommand.arguments("--name", metavar="<name>", help="Specify InfiniBand Partition name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify InfiniBand Partition description.", type=str)
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update InfiniBandPartition."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.update(org_name, team_name, args.infiniband_partition, args.name, args.description)
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove infiniband_partition."

    @CLICommand.arguments(
        "infiniband_partition", metavar="<infiniband_partition>", help="InfiniBand Partition ID.", type=str
    )
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove InfiniBand Partition."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.remove(org_name, team_name, args.infiniband_partition)
        self.printer.print_ok(f"{resp}")
