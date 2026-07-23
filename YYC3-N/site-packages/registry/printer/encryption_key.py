#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

import collections

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint, str_

STATUS_URL_COLUMN = "Status URL"
ENCRYPTION_KEY_COLUMN = "Encryption Key"


class EncryptionKeyPrinter(NVPrettyPrint):
    """The printer is responsible for printing encryption key objects and lists."""

    def print_encryption_key_list(self, encryption_key_list, columns=None):
        """Handle the output for `ngc registry encryption-key list`."""
        if self.format_type == "json":
            return self.print_json(encryption_key_list)

        if not columns:
            columns = [
                ("encryptionKey", ENCRYPTION_KEY_COLUMN),
                ("created", "Created"),
                ("description", "Description"),
            ]
        output = self.generate_encryption_key_list(encryption_key_list, columns)
        return self.print_data(output, is_table=True)

    @staticmethod
    def generate_encryption_key_list(encryption_key_list, columns):
        """Generate table data for encryption key list."""
        cols, disp = zip(*columns)
        yield list(disp)

        for dict in encryption_key_list.get("encryptionKeys", []):
            out = []
            for col in cols:
                out.append(dict.get(col, None))
            yield out

    def print_encryption_key_info(self, encryption_key_info, org, team):
        """Print detailed encryption key information including associated artifacts."""
        if self.format_type == "json":
            return self.print_json(encryption_key_info)

        tbl = self.create_output(header=False)
        tbl.add_separator_line()
        tbl.set_title("Encryption Key Details")

        tbl.add_label_line(ENCRYPTION_KEY_COLUMN, encryption_key_info.get("encryptionKey", ""))
        # Associated artifacts with details
        associated_artifacts = encryption_key_info.get("artifacts", [])
        if associated_artifacts:
            tbl.add_label_line("Associated Artifacts", "")
            d = collections.defaultdict(list)
            for artifact in associated_artifacts:
                artifact_type = artifact.get("artifactType", "Unknown")
                artifact_name = artifact.get("name", "Unknown")
                artifact_desc = artifact.get("description", "")

                # Align descriptions when name is under 20 chars
                if len(artifact_name) < 20:
                    formatted_artifact = f"{artifact_name:<20} {artifact_desc}"
                else:
                    formatted_artifact = f"{artifact_name}     {artifact_desc}"
                d[artifact_type].append(formatted_artifact)
            for artifact_type, artifacts in d.items():
                tbl.add_label_line(label=artifact_type, level=1)
                for _artifact in artifacts:
                    tbl.add_label_line(value=_artifact, level=1)
        else:
            tbl.add_label_line("Associated Artifacts", "None")

        return tbl.print()

    def print_operation_success(self, operation_type, encryption_key_id=None, workflow_id=None):
        """Print success message for encryption key operations."""
        if encryption_key_id:
            self.print_ok(f"Successfully {operation_type} encryption key '{encryption_key_id}'")
        else:
            self.print_ok(f"Successfully {operation_type}")

        if workflow_id:
            self.print_ok(f"Workflow ID: {workflow_id}")
            self.print_ok("Use 'ngc registry encryption-key status <workflow_id>' to check progress")

    def print_workflow_status(self, workflow_status):
        """Print workflow status information."""
        if self.format_type == "json":
            return self.print_json(workflow_status)

        tbl = self.create_output(header=False)
        tbl.add_separator_line()
        tbl.set_title("Workflow Status")

        tbl.add_label_line("Workflow ID", str_(getattr(workflow_status, "workflowId", "")))
        tbl.add_label_line("Status", str_(getattr(workflow_status, "status", "")))
        tbl.add_label_line("Message", str_(getattr(workflow_status, "message", "")))
        tbl.add_separator_line()

        return tbl.print()

    def print_disassociate_success(self, model=None, resource=None, workflow_id=None):
        """Print success message for disassociate operations."""
        target = model or resource or "artifact"

        if self.format_type != "json":
            _message = (
                f"Successfully initiated disassociation for {target}. "
                "To query its status, please run command: "
                "\n\n\033[1m\033[92mngc registry encryption-key status {}\033[0m\n"
            ).format(workflow_id)
            self.print_ok(_message)
        else:
            self.print_json(
                {
                    "workflowId": workflow_id,
                    "ngcCommand": f"ngc registry encryption-key status {workflow_id}",
                }
            )

    def print_disassociate_results(self, results):
        """Print results for multiple disassociation operations."""
        if self.format_type == "json":
            self.print_json(results)
        else:
            columns = [
                ("artifactType", "Artifact Type"),
                ("artifactName", "Artifact Name"),
                ("status", "Status"),
                ("statusUrl", STATUS_URL_COLUMN),
                ("message", "Message"),
            ]

            output = self._generate_disassociate_table(results, columns)
            self.print_data(output, is_table=True)

    def _generate_disassociate_table(self, results, columns):
        """Generate table data for disassociation results."""
        cols, disp = zip(*columns)
        yield list(disp)

        for result in results:
            row = []
            for col in cols:
                if col == "message":
                    # Special handling for message column
                    if result.get("status") == "error":
                        row.append(result.get("error", ""))
                    elif result.get("status") == "timeout":
                        row.append(result.get("message", ""))
                    else:
                        row.append("")
                else:
                    row.append(str(result.get(col, "")))
            yield row

    def print_remove_results(self, results):
        """Print results for multiple remove operations."""
        if self.format_type == "json":
            self.print_json(results)
        else:
            columns = [
                ("encryptionKey", ENCRYPTION_KEY_COLUMN),
                ("status", "Status"),
                ("statusUrl", STATUS_URL_COLUMN),
                ("message", "Message"),
            ]

            output = self._generate_operation_table(results, columns)
            self.print_data(output, is_table=True)

    def print_status_results(self, results):
        """Print results for multiple status queries."""
        if self.format_type == "json":
            self.print_json(results)
        else:
            columns = [
                ("statusUrl", STATUS_URL_COLUMN),
                ("status", "Status"),
                ("message", "Message"),
            ]

            output = self._generate_status_table(results, columns)
            self.print_data(output, is_table=True)

    def _generate_operation_table(self, results, columns):
        """Generate table data for operation results (remove, etc)."""
        cols, disp = zip(*columns)
        yield list(disp)

        for result in results:
            row = []
            for col in cols:
                if col == "message":
                    # Special handling for message column
                    if result.get("status") == "error":
                        row.append(result.get("error", ""))
                    elif result.get("status") == "timeout":
                        row.append(result.get("message", ""))
                    else:
                        row.append("")
                else:
                    row.append(str(result.get(col, "")))
            yield row

    def _generate_status_table(self, results, columns):
        """Generate table data for status results."""
        cols, disp = zip(*columns)
        yield list(disp)

        for result in results:
            row = []
            for col in cols:
                if col == "message":
                    # Special handling for message column
                    if result.get("status") == "error":
                        row.append(result.get("error", ""))
                    else:
                        row.append(str(result.get(col, "")))
                else:
                    row.append(str(result.get(col, "")))
            yield row
