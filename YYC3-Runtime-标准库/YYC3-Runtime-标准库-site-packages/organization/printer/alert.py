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
from ngcbase.printer.nvPrettyPrint import (
    format_date,
    GeneralWrapper,
    NVPrettyPrint,
    str_,
)


class AlertPrinter(NVPrettyPrint):
    """The printer is responsible for printing objects and lists of objects of the associated type."""

    def print_alert_list(self, alert_list, columns=None):
        """Handles the output for `ngc registry alert list`."""  # noqa: D401
        output = []
        if self.format_type == "json":
            output = alert_list
        else:
            if not columns:
                columns = [
                    ("eventUuid", "UUID"),
                    ("eventId", "ID"),
                    ("bannerEventType", "Type"),
                    ("initialPostTime", "Created Date"),
                    ("lastUpdatedTime", "Updated Date"),
                    ("backfilledTime", "Backfilled Date"),
                    ("estimatedUpdateTime", "Estimated Update Date"),
                    ("currentMessage", "Message"),
                    ("currentIncidentStatus", "Status"),
                    ("currentIncidentSeverity", "Severity"),
                ]
            output = self.generate_alert_list(alert_list, columns)
        self.print_data(output, True)

    @staticmethod
    def generate_alert_list(gen, columns):  # noqa: D102
        cols, disp = zip(*columns)
        yield list(disp)

        for event in gen or []:
            out = AlertOuput(event)
            yield [getattr(out, col, None) for col in cols]

    def print_alert(self, alert):
        """Print information about a alert."""
        if self.format_type == "json":
            alert_dict = alert.toDict()
            self.print_data(GeneralWrapper.from_dict(alert_dict))
        else:
            tbl = self.create_output(header=False)
            tbl.add_separator_line()
            tbl.set_title("Alert Information")
            tbl.add_label_line("UUID", alert.event.eventUuid)
            tbl.add_label_line("ID", alert.event.eventId)
            tbl.add_label_line("Type", str_(alert.event.bannerEventType))
            tbl.add_label_line("Created Date", format_date(alert.event.incident.initialPostTime))
            tbl.add_label_line("Updated Date", format_date(alert.event.incident.lastUpdatedTime))
            tbl.add_label_line("Backfilled Date", format_date(alert.event.incident.backfilledTime))
            tbl.add_label_line("Estimated Update Date", format_date(alert.event.incident.estimatedUpdateTime))
            tbl.add_label_line("Current Status", str_(alert.event.incident.currentIncidentStatus))
            tbl.add_label_line("Current Severity", str_(alert.event.incident.currentIncidentSeverity))
            tbl.add_label_line("Current Message", alert.event.incident.currentMessage)
            for item in alert.event.incident.incidentHistory:
                tbl.add_separator_line()
                tbl.add_label_line("Sequence Number", str_(item.eventIdSequenceNumber), level=1)
                tbl.add_label_line("Created Date", format_date(item.createdTime), level=1)
                tbl.add_label_line("Status", str_(item.incidentStatus), level=1)
                tbl.add_label_line("Severity", str_(item.incidentSeverity), level=1)
                tbl.add_label_line("Message", item.message, level=1)
            tbl.add_separator_line()
            tbl.print()


class AlertOuput:  # noqa: D101
    def __init__(self, event):
        self.event = event

    @property
    def eventUuid(self):  # noqa: D102
        return self.event.eventUuid

    @property
    def eventId(self):  # noqa: D102
        return self.event.eventId

    @property
    def bannerEventType(self):  # noqa: D102
        return str_(self.event.bannerEventType)

    @property
    def initialPostTime(self):  # noqa: D102
        return format_date(self.event.incident.initialPostTime)

    @property
    def lastUpdatedTime(self):  # noqa: D102
        return format_date(self.event.incident.lastUpdatedTime)

    @property
    def backfilledTime(self):  # noqa: D102
        return format_date(self.event.incident.backfilledTime)

    @property
    def estimatedUpdateTime(self):  # noqa: D102
        return format_date(self.event.incident.estimatedUpdateTime)

    @property
    def currentMessage(self):  # noqa: D102
        return self.event.incident.currentMessage

    @property
    def currentIncidentStatus(self):  # noqa: D102
        return str_(self.event.incident.currentIncidentStatus)

    @property
    def currentIncidentSeverity(self):  # noqa: D102
        return str_(self.event.incident.currentIncidentSeverity)
