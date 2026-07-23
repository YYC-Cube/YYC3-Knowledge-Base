# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class UserPrinter(NVPrettyPrint):
    """Forge User Printer."""

    def print_info(self, user):  # noqa: D102

        if self.format_type == "json":
            self.print_data(user)
        else:
            output = UserOutput(user)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("User Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Email", output.email)
            tbl.add_label_line("First Name", output.firstName)
            tbl.add_label_line("Last Name", output.lastName)
            tbl.add_label_line("Created", output.created)
            tbl.add_label_line("Updated", output.updated)
            tbl.add_separator_line()
            tbl.print()


class UserOutput:  # noqa: D101
    def __init__(self, user):
        self.user = user

    @property
    def id(self):  # noqa: D102
        return self.user.get("id", "")

    @property
    def email(self):  # noqa: D102
        return self.user.get("email", "")

    @property
    def firstName(self):  # noqa: D102
        return self.user.get("firstName", "")

    @property
    def lastName(self):  # noqa: D102
        return self.user.get("lastName", "")

    @property
    def created(self):  # noqa: D102
        return self.user.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.user.get("updated", "")
