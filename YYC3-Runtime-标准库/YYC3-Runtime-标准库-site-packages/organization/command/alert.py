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
# and any modifications thereto. Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_valid_columns,
    check_ymd_hms_datetime,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import CONFIG_TYPE, DISABLE_TYPE, STAGING_ENV
from ngcbase.errors import NgcException, ResourceNotFoundException
from ngcbase.util.datetime_utils import calculate_date_range
from ngcbase.util.utils import get_columns_help, get_environ_tag
from organization.data.api.BannerEventIncidentSeverityEnum import (
    BannerEventIncidentSeverityEnum,
)
from organization.data.api.BannerEventIncidentStatusEnum import (
    BannerEventIncidentStatusEnum,
)
from organization.environ import NGC_CLI_ALERT_ENABLE
from organization.printer.alert import AlertPrinter

ALERT_TYPE = CONFIG_TYPE if (get_environ_tag() <= STAGING_ENV and NGC_CLI_ALERT_ENABLE) else DISABLE_TYPE

SEVERITY_METAVAR = "<severity>"
STATUS_METAVAR = "<status>"


class AlertCommand(CLICommand):  # noqa: D101
    CMD_NAME = "alert"
    HELP = "Alert Commands"
    DESC = "Alert Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.make_bottom_commands(self.parser)
        self.config = self.client.config
        self.api = self.client.alert
        self.printer = AlertPrinter(self.client.config)

    LIST_HELP = "List alert(s)."
    columns_dict = {
        "eventId": "Id",
        "bannerEventType": "Type",
        "initialPostTime": "Created Date",
        "lastUpdatedTime": "Updated Date",
        "backfilledTime": "BackFilled Date",
        "estimatedUpdateTime": "Estimated Update Date",
        "currentMessage": "Current Message",
        "currentIncidentStatus": "Current Status",
        "currentIncidentSeverity": "Current Severity",
    }
    columns_default_alert = ("eventUuid", "Uuid")
    columns_help = get_columns_help(columns_dict, columns_default_alert)
    severity_help = f"Specify severity of the alert. Choices are: {', '.join(BannerEventIncidentSeverityEnum)}"
    status_help = f"Specify the status of the alert. Choices are: {', '.join(BannerEventIncidentStatusEnum)}"

    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.arguments("--active", action="store_true", default=None, dest="active", help="Filter active alerts.")
    @CLICommand.arguments(
        "--from-date",
        metavar="<date>",
        action=check_ymd_hms_datetime(),
        help="Show alerts created after this date. (Format: yyyy-MM-dd::HH:mm:ss)",
    )
    @CLICommand.arguments(
        "--to-date",
        metavar="<date>",
        action=check_ymd_hms_datetime(),
        help="Show alerts created before this date. (Format: yyyy-MM-dd::HH:mm:ss)",
    )
    @CLICommand.arguments(
        "--severity",
        metavar=SEVERITY_METAVAR,
        type=str.upper,
        default=None,
        choices=BannerEventIncidentSeverityEnum,
        help=severity_help,
    )
    @CLICommand.command(name="list", help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List alerts."""
        self.config.validate_configuration()
        try:
            (args.from_date, args.to_date) = calculate_date_range(args.from_date, args.to_date, None)
        except Exception as e:
            raise NgcException(e) from None
        check_add_args_columns(args.column, AlertCommand.columns_default_alert)
        self._list_alerts(args, org=self.config.org_name)

    def _list_alerts(self, args, org=None, team=None):
        response = self.api.list_alerts(org, team, args.active, args.from_date, args.to_date, args.severity)
        self.printer.print_alert_list(response.events, columns=args.column)

    INFO_HELP = "Get information about a alert."

    @CLICommand.command(name="info", help=INFO_HELP, description=INFO_HELP)
    @CLICommand.arguments("uuid", metavar="<alert_uuid>", help="Alert UUID.", type=str)
    def info(self, args):
        """Retrieve metadata for a alert."""
        self.config.validate_configuration()
        self._info_alert(args.uuid, org=self.config.org_name)

    def _info_alert(self, uuid, org, team=None):
        try:
            resp = self.api.get(org, team, uuid)
            self.printer.print_alert(resp)
        except ResourceNotFoundException:
            raise ResourceNotFoundException("Alert '{}' could not be found.".format(uuid)) from None

    CREATE_HELP = "(For administrators only) Create an alert."

    @CLICommand.command(name="create", help=CREATE_HELP, description=CREATE_HELP, feature_tag=ALERT_TYPE)
    @CLICommand.arguments("text", metavar="<alert_text>", help="Alert Message.", type=str)
    @CLICommand.arguments(
        "--backfill",
        metavar="<backfill>",
        default=None,
        action=check_ymd_hms_datetime(),
        help="Specify backfill time for the alert. Format: [yyyy-MM-dd::HH:mm:ss].",
    )
    @CLICommand.arguments(
        "--expiry-time",
        metavar="<expiry_time>",
        default=None,
        action=check_ymd_hms_datetime(),
        help="Specify expiry time for the alert. Format: [yyyy-MM-dd::HH:mm:ss].",
    )
    @CLICommand.arguments(
        "--status",
        metavar=STATUS_METAVAR,
        type=str.upper,
        choices=BannerEventIncidentStatusEnum,
        help=status_help,
        required=True,
    )
    @CLICommand.arguments(
        "--severity",
        metavar=SEVERITY_METAVAR,
        type=str.upper,
        choices=BannerEventIncidentSeverityEnum,
        help=severity_help,
        required=True,
    )
    def create(self, args):
        """Create an alert."""
        raise NotImplementedError("Not yet implemented.")

    UPDATE_HELP = "(For administrators only) Update an alert."

    @CLICommand.command(name="update", help=UPDATE_HELP, description=UPDATE_HELP, feature_tag=ALERT_TYPE)
    @CLICommand.arguments("alert_uuid", metavar="<alert_uuid>", help="Alert Uuid.", type=str)
    @CLICommand.arguments("--text", metavar="<text>", help="Specify the alert message.")
    @CLICommand.arguments(
        "--status", metavar=STATUS_METAVAR, type=str.upper, choices=BannerEventIncidentStatusEnum, help=status_help
    )
    @CLICommand.arguments(
        "--severity",
        metavar=SEVERITY_METAVAR,
        type=str.upper,
        choices=BannerEventIncidentSeverityEnum,
        help=severity_help,
    )
    @CLICommand.any_of(["status", "severity", "text"])
    def update(self, args):
        """Update an alert."""
        raise NotImplementedError("Not yet implemented.")
