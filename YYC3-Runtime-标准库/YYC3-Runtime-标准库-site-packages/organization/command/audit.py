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

import os

from ngcbase.command.args_validation import check_ymd_hms_datetime, SingleUseAction
from ngcbase.command.clicommand import CLICommand
from ngcbase.errors import NgcException, ResourceNotFoundException
from ngcbase.util.utils import confirm_remove
from organization.printer.audit import AuditPrinter


class AuditCommand(CLICommand):  # noqa: D101

    CMD_NAME = "audit"
    HELP = "Audit Commands"
    DESC = "Audit Commands (For administrators only)"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.make_bottom_commands(self.parser)
        self.config = self.client.config
        self.audit_client = self.client.audit
        self.printer = AuditPrinter(self.client.config)

    list_help = "(For administrators only) List all audit logs."
    AUDIT_STATUS_CHOICES = ["REQUESTED", "READY"]
    STATUS_HELP = f"Specify the status of the the audit. Choices are: {', '.join(AUDIT_STATUS_CHOICES)}"

    @CLICommand.command(help=list_help, description=list_help)
    @CLICommand.arguments(
        "--status",
        metavar="<status>",
        help=STATUS_HELP,
        type=str.upper,
        default=None,
        choices=AUDIT_STATUS_CHOICES,
    )
    def list(self, args):  # noqa: D102
        audit_logs = self.audit_client.list_logs()

        if args.status:
            audit_logs.auditLogsList = [
                auditLog for auditLog in audit_logs.auditLogsList if auditLog.auditLogsStatus == args.status
            ]

        self.printer.print_audit_logs_list(audit_logs.auditLogsList)

    download_help = "(For administrators only) Download report for a specific Audit ID."

    @CLICommand.command(help=download_help, description=download_help)
    @CLICommand.arguments("target", metavar="<audit-id>", help="Audit ID", type=str)
    @CLICommand.arguments(
        "--dest",
        metavar="<path>",
        help="Destination to download the audit log. Default: .",
        type=str,
        default="",
        action=SingleUseAction,
    )
    def download(self, args):  # noqa: D102
        audit_id = args.target
        try:
            audit_info = self.audit_client.info(audit_id=audit_id)
        except ResourceNotFoundException as rnf:
            raise NgcException(rnf) from rnf

        if audit_info.auditLogsPresignedUrl:
            download_dir = os.path.abspath(args.dest)
            if not os.path.isdir(download_dir):
                raise NgcException(f"The path: '{args.dest}' does not exist.")
            if not os.access(download_dir, os.W_OK):
                raise NgcException(f"Error: You do not have permission to write files to '{download_dir}'.") from None

            self.audit_client.download(audit_info.auditLogsPresignedUrl, download_dir)
        else:
            raise NgcException(f"The download link does not exist for '{audit_id}'")

    create_help = "(For administrators only) Create a report for a specific time range."

    @CLICommand.command(help=create_help, description=create_help)
    @CLICommand.arguments(
        "--from-date",
        metavar="<date>",
        required=True,
        action=check_ymd_hms_datetime(),
        help="Start of date range. (Format: yyyy-MM-dd::HH:mm:ss)",
    )
    @CLICommand.arguments(
        "--to-date",
        metavar="<date>",
        required=True,
        action=check_ymd_hms_datetime(),
        help="End of date range. (Format: yyyy-MM-dd::HH:mm:ss)",
    )
    def create(self, args):  # noqa: D102
        from_date = args.from_date
        to_date = args.to_date
        try:
            report_create_info = self.audit_client.create(from_date=from_date, to_date=to_date)
            if report_create_info.requestStatus.statusCode == "SUCCESS":
                self.printer.print_ok("Successfully requested the audit report.")
        except ValueError as ve:
            raise NgcException(ve) from ve

    remove_help = "(For administrators only) Remove an Audit report."

    @CLICommand.command(help=remove_help, description=remove_help)
    @CLICommand.arguments("target", metavar="<audit-id>", help="Audit ID", type=str, nargs="+")
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    def remove(self, args):  # noqa: D102
        audit_id = args.target
        confirm_remove(printer=self.printer, target=", ".join(audit_id), default=args.default_yes)
        try:
            resp = self.audit_client.remove(audit_id=audit_id)
            if resp.requestStatus.statusCode == "SUCCESS":
                self.printer.print_ok(f"Successfully removed audits with IDs: {', '.join(audit_id)}")
        except ResourceNotFoundException as rnf:
            raise NgcException(rnf) from rnf
