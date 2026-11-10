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
from ngcbase.printer.nvPrettyPrint import generate_columns_list, NVPrettyPrint


class AuditPrinter(NVPrettyPrint):
    """The printer is responsible for printing audit ouput."""

    def print_audit_logs_list(self, audit_logs, columns=None):  # noqa: D102
        line_list = []
        if self.format_type == "json":
            for audit in audit_logs or []:
                line_list.append(audit)
        else:
            if not columns:
                columns = [
                    ("requestedDate", "Date Requested"),
                    ("auditRequesterName", "Requestor"),
                    ("auditRequesterEmail", "Requestor Email"),
                    ("auditLogsFrom", "From"),
                    ("auditLogsTo", "To"),
                    ("auditLogsStatus", "Status"),
                    ("auditLogsId", "Audit ID"),
                ]
            line_list = generate_columns_list([audit_logs], columns)
        self.print_data(line_list, is_table=True)
