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
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

import logging

from basecommand.command.args_validation import (
    check_remove_resource_allocation,
    check_resource_allocation,
)
from basecommand.command.base_command import BaseCommand
from basecommand.constants import DEFAULT_INTERVAL_TIME, DEFAULT_INTERVAL_UNIT
from basecommand.data.api.MeasurementResultListResponse import (
    MeasurementResultListResponse,
)
from basecommand.environ import NGC_CLI_IM_ENABLE
from basecommand.printer.resource import ResourcePrinter
from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_positive_int_32_bit,
    check_valid_columns,
    check_ymd_hms_datetime,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import CANARY_ENV, CONFIG_TYPE, DISABLE_TYPE
from ngcbase.util.utils import confirm_remove, get_columns_help, get_environ_tag

logger = logging.getLogger(__name__)


class ResourceCommand(BaseCommand):  # noqa: D101

    CMD_NAME = "resource"
    HELP = "Resource Commands"
    DESC = "Resource Commands"

    CLI_HELP = CONFIG_TYPE if (get_environ_tag() <= CANARY_ENV or NGC_CLI_IM_ENABLE) else DISABLE_TYPE
    COMMAND_DISABLE = get_environ_tag() > CANARY_ENV and not NGC_CLI_IM_ENABLE

    CMD_ALIAS = []

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.make_bottom_commands(parser)
        self.config = self.client.config
        self.api = self.client.basecommand.resource
        self.printer = ResourcePrinter(self.client.config)

    LIST_HELP = "List resources. Specify ace to list child pools, or 'no-ace' to list across aces."

    columns_dict = {
        "id": "Id",
        "poolType": "Type",
        "description": "Description",
        "resourceTypeName": "Resource Type",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)

    @CLICommand.arguments(
        "--user-id",
        metavar="<user_id>",
        help="Specify user id, use `user-defaults` for default pool.",
        type=str,
        default=None,
    )
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.arguments(
        "--root-pool",
        help="Use to list root pools instead.",
        default=False,
        action="store_true",
    )
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List Allocations."""
        resp = self.api.list(args.org, args.team, args.ace, args.user_id, args.root_pool)
        check_add_args_columns(args.column, ResourceCommand.columns_default)
        self.printer.print_list(resp, args.column, args.ace or self.config.ace_name)

    INFO_HELP = "Resource information."

    @CLICommand.arguments(
        "--user-id",
        metavar="<user_id>",
        help="Specify user id, use `user-defaults` for default pool.",
        type=str,
        default=None,
    )
    @CLICommand.arguments(
        "--root-pool",
        help="Use to get root pool info instead.",
        default=False,
        action="store_true",
    )
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Allocation info."""
        resp = self.api.info(args.org, args.team, args.ace, args.user_id, args.root_pool)
        self.printer.print_info(resp)

    CREATE_HELP = "Create Pool."
    CREATE_COND = "Either allocation or default is required."

    @CLICommand.arguments(
        "--user-id",
        metavar="<user_id>",
        help="Specify user id, use `user-defaults` for default pool.",
        type=str,
        default=None,
    )
    @CLICommand.arguments("--description", metavar="<description>", help="Specify pool description.", type=str)
    @CLICommand.arguments("--version", metavar="<version>", help="Specify pool version.", type=str, default="2")
    @CLICommand.arguments(
        "--allocation",
        metavar="<allocation>",
        help=f"Specify resource allocations for the pool. Format <type>:<limit>:<share>:<priority>. {CREATE_COND}",
        type=check_resource_allocation,
        action="append",
    )
    @CLICommand.arguments(
        "--default",
        metavar="<default>",
        help=(
            "Specify resource defaults for the pool, required for creating team pool. Format"
            f" <type>:<limit>:<share>:<priority>. {CREATE_COND}"
        ),
        type=check_resource_allocation,
        action="append",
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create Pool."""
        resp = self.api.create(
            args.org,
            args.team,
            args.ace,
            args.user_id,
            args.version,
            args.description,
            args.allocation,
            args.default,
        )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update Pool."

    @CLICommand.arguments("--description", metavar="<description>", help="Specify pool description.", type=str)
    @CLICommand.arguments(
        "--update-allocation",
        metavar="<update_allocation>",
        help="Specify resource allocations to update. Format <type>:<limit>:<share>:<priority>.",
        type=check_resource_allocation,
        action="append",
    )
    @CLICommand.arguments(
        "--add-allocation",
        metavar="<add_allocation>",
        help="Specify resource allocations to add to the pool. Format <type>:<limit>:<share>:<priority>.",
        type=check_resource_allocation,
        action="append",
    )
    @CLICommand.arguments(
        "--remove-allocation",
        metavar="<remove_allocation>",
        help="Specify resource allocations to remove from the pool. Format <resource_type>.",
        type=check_remove_resource_allocation,
        action="append",
    )
    @CLICommand.arguments(
        "--user-id",
        metavar="<user_id>",
        help="Specify user id, use `user-defaults` for default pool.",
        type=str,
        default=None,
    )
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update Pool."""
        resp = self.api.update(
            args.org,
            args.team,
            args.ace,
            args.user_id,
            args.description,
            args.update_allocation,
            args.add_allocation,
            args.remove_allocation,
        )
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove Pool."

    @CLICommand.arguments(
        "--user-id",
        metavar="<user_id>",
        help="Specify user id, use `user-defaults` for default pool.",
        type=str,
        default=None,
    )
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove Pool."""
        confirm_remove(self.printer, "the pool", args.default_yes)
        resp = self.api.remove(
            args.org,
            args.team,
            args.ace,
            args.user_id,
        )
        self.printer.print_ok(f"{resp}")

    TELEMETRY_HELP = "Resource telemetry."
    TELEMETRY_ENUM = [
        "im_resource_manager_pool_limit_total",
        "im_resource_manager_pool_share_total",
        "im_resource_manager_pool_reservation_total",
        "im_resource_manager_num_resources_needed_total",
        "im_resource_manager_num_resources_consumed_total",
        "im_resource_manager_active_rcrs_per_pool_total",
        "im_resource_manager_pending_rcrs_per_pool_total",
        "RESOURCE_USAGE",
        "RESOURCE_UTILIZATION",
        "POOL_CAPACITY",
        "POOL_LIMIT",
        "ACTIVE_FAIR_SHARE",
        "FAIR_SHARE",
        "QUEUED_JOBS",
        "RUNNING_JOBS",
    ]

    @CLICommand.arguments(
        "--user-id",
        metavar="<user_id>",
        help="Specify user id, use `user-defaults` for default pool.",
        type=str,
        default=None,
    )
    @CLICommand.arguments(
        "--telemetry-type",
        metavar="<telemetry_type>",
        help="Specify type for telemetry. Options  %(choices)s",
        type=str,
        default=None,
        choices=TELEMETRY_ENUM,
    )
    @CLICommand.arguments(
        "--end-time",
        metavar="<end_time>",
        help="Specifies the end time for statistics. Format: [yyyy-MM-dd::HH:mm:ss]. Default: now",
        type=str,
        action=check_ymd_hms_datetime(),
    )
    @CLICommand.arguments(
        "--start-time",
        metavar="<start-time>",
        help="Specifies the start time for statistics. Format: [yyyy-MM-dd::HH:mm:ss].",
        type=str,
        action=check_ymd_hms_datetime(),
    )
    @CLICommand.arguments(
        "--interval-unit",
        metavar="<interval_unit>",
        help=f"Data collection interval unit. Options: %(choices)s.  Default: {DEFAULT_INTERVAL_UNIT}",
        default=DEFAULT_INTERVAL_UNIT,
        choices=["SECOND", "MINUTE", "HOUR"],
    )
    @CLICommand.arguments(
        "--interval-time",
        metavar="<interval_time>",
        help=f"Data collection interval time value.  Default: {DEFAULT_INTERVAL_TIME}",
        type=int,
        action=check_positive_int_32_bit(),
        default=DEFAULT_INTERVAL_TIME,
    )
    @CLICommand.arguments(
        "--resource-type",
        metavar="<resource_type>",
        help="Filter data by resource type.",
        type=str,
        default=None,
        required=True,
    )
    @CLICommand.arguments(
        "--root-pool",
        help="Use to get root pool info instead.",
        default=False,
        action="store_true",
    )
    @CLICommand.command(help=TELEMETRY_HELP, description=TELEMETRY_HELP)
    def telemetry(self, args):
        """Pool statistic."""
        resp = self.api.telemetry(
            args.org,
            args.team,
            args.ace,
            args.user_id,
            args.telemetry_type,
            args.end_time,
            args.start_time,
            args.interval_unit,
            args.interval_time,
            args.resource_type,
            args.root_pool,
        )
        self.printer.print_telemetry(MeasurementResultListResponse(resp).measurements)
