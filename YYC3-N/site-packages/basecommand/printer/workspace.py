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
from ngcbase.util.file_utils import human_size


class WorkspacePrinter(NVPrettyPrint):
    """The printer should be responsible for printing workspace ouput."""

    def print_workspace_info(self, wkspc, sftp_info=None):
        """Print wkspc meta data."""
        if self.format_type == "json":
            self.print_data(wkspc)
            return
        tbl = self.create_output()
        tbl.add_separator_line()
        tbl.set_title("Workspace Information")
        tbl.add_label_line("ID", wkspc.id)
        tbl.add_label_line("Name", wkspc.name)
        tbl.add_label_line("Created By", wkspc.creatorUserName)
        sz = human_size(wkspc.sizeInBytes) if hasattr(wkspc, "sizeInBytes") and wkspc.sizeInBytes else "0 B"
        tbl.add_label_line("Size", sz)
        tbl.add_label_line("ACE", wkspc.aceName)
        tbl.add_label_line("Org", wkspc.orgName)
        tbl.add_label_line("Description", wkspc.description)
        shared_with = ", ".join(wkspc.sharedWith) if wkspc.sharedWith else ""
        tbl.add_label_line("Shared with", shared_with)
        tbl.add_separator_line()
        if sftp_info:
            tbl.add_line("SFTP Information")
            tbl.add_label_line("Hostname", sftp_info.hostname)
            tbl.add_label_line("Port", sftp_info.port)
            tbl.add_label_line("Token", sftp_info.token)
            tbl.add_label_line("Example", "sftp -P<Port> <Token>@<Hostname>:/")
            tbl.add_separator_line()
        tbl.print()

    def print_workspace_list(self, workspace_gen, user_client_id, columns=None):  # noqa: D102
        self.print_data(
            self._generate_workspace_list(workspace_gen, user_client_id, columns), is_table=True, no_wrap_columns=["Id"]
        )

    def _generate_workspace_list(self, workspace_gen, user_client_id, columns=None):
        if self.format_type == "json":
            for page in workspace_gen or []:
                for ws in page or []:
                    yield ws
        else:
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("name", "Name"),
                    ("description", "Description"),
                    ("ace", "ACE"),
                    ("creator", "Creator Username"),
                    ("shared", "Shared"),
                    ("created", "Created Date"),
                    ("owned", "Owned"),
                    ("size", "Size"),
                ]
            yield from generate_columns_list(workspace_gen, columns, user_client_id=user_client_id)

    def print_windows_instr(self, token, hostname, port):  # noqa: D102
        print_ok = self.print_ok
        print_ok(
            "WinSCP is needed to access the workspace. "
            "If you do not currently have it installed, it can be downloaded from: "
            "https://winscp.net/eng/download.php\n"
        )
        print_ok("Direct mounting via CLI is unsupported for Windows.")
        print_ok("To use Workspaces on Windows please follow these instructions:")
        print_ok("1. Start the WinSCP GUI.")
        print_ok("2. Set file protocol to: SFTP.")
        print_ok(f"3. Set host name to: '{hostname}'.")
        print_ok(f"4. Set port number to: {port}.")
        print_ok(
            "5. Keep the connection alive by selecting: Advanced >> Connection >> Keepalives "
            "and 'Sending of null ssh packets'."
        )
        print_ok("6. Leave the Username and Password fields blank.")
        print_ok("7. Click 'Login'.")
        print_ok("8. When prompted for Username enter the token from below:")
        print_ok("-----------------------------------------------------------------------------")
        print_ok(f"{token}")
        print_ok("-----------------------------------------------------------------------------")
        print_ok("9. Click OK.")
