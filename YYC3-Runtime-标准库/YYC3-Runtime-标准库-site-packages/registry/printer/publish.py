#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from typing import Optional

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint
from registry.data.publishing.PublishingWorkflowDetails import PublishingWorkflowDetails


class PublishPrinter(NVPrettyPrint):
    """The printer will be responsible for printing objects and object lists."""

    def print_publishing_status(self, status: PublishingWorkflowDetails):
        """Print details for a publishing status."""
        if self.format_type == "json":
            self.print_data(status)
            return
        tbl = self.create_output(header=False)
        tbl.add_separator_line()
        tbl.set_title("Publishing Status Information")
        tbl.set_title("Workflow Details", level=1)
        tbl.add_label_line("Status", status.workflowDetails.status, 1)
        tbl.add_label_line("Workflow ID", status.workflowDetails.workflowId, 1)
        tbl.add_label_line("Workflow Type", status.workflowDetails.workflowType, 1)
        tbl.add_label_line("Run ID", status.workflowDetails.runId, 1)
        tbl.add_label_line("Start Time", status.workflowDetails.startTime, 1)
        tbl.add_label_line("End Time", status.workflowDetails.endTime, 1)

        tbl.set_title("Workflow History", level=1)
        tbl.add_label_line("Failures", level=1)
        for failure in status.workflowHistory.failures:
            tbl.add_label_line("Activity Type", failure.activityType, 2)
            tbl.add_label_line("Error Details", failure.errorDetails, 3)

        tbl.add_label_line("Child Workflows", level=1)
        for child in status.workflowHistory.childWorkflows:
            tbl.add_label_line("", child, 2)

        tbl.add_label_line("Completed Activities", level=1)
        for activity in status.workflowHistory.completedActivities:
            tbl.add_label_line("", activity, 2)

        tbl.add_label_line("Pending Activities", level=1)
        for activity in status.workflowHistory.pendingActivities:
            tbl.add_label_line("", activity, 2)

        tbl.add_separator_line()
        tbl.print()

    def print_publishing_success(self, target: str, artifact_cmd: str, workflow_id: Optional[str] = None):
        """Print polling command for publish task if this is an async workflow.

        Print success message if this is sync workflow.
        """
        if workflow_id is None:
            self.print_ok("Successfully published {}.".format(target))
            return

        if self.format_type != "json":
            _message = (
                "Successfully initated publishing of {}. "
                "To query its status, please run command: "
                "\n\n\033[1m\033[92mngc registry {} publish --status {}\033[0m\n"
            ).format(target, artifact_cmd, workflow_id)
            self.print_ok(_message)
        else:
            self.print_json(
                {
                    "workflowId": workflow_id,
                    "ngcCommand": "ngc registry {} publish --status {}".format(artifact_cmd, workflow_id),
                }
            )
