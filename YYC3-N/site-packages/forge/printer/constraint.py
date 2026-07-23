# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class ConstraintPrinter(NVPrettyPrint):
    """Forge Constraint Printer."""

    def print_list(self, constraint_list, columns=None):  # noqa: D102

        if self.format_type == "json":
            output = constraint_list
        else:
            output = []
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("resourceType", "Resource Type"),
                    ("resourceTypeId", "Resource Type Id"),
                    ("constraintType", "Constraint Type"),
                    ("constraintValue", "Constraint Value"),
                    ("status", "Status"),
                    ("created", "Created"),
                    ("updated", "Updated"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for constraint in constraint_list:
                out = ConstraintOutput(constraint)
                output.append([getattr(out, col, None) for col in cols])
        self.print_data(output, True)

    def print_info(self, constraint):  # noqa: D102

        if self.format_type == "json":
            self.print_data(constraint)
        else:
            output = ConstraintOutput(constraint)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Constraint Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Allocation Id", output.allocationId)
            tbl.add_label_line("Resource Type", output.resourceType)
            tbl.add_label_line("Resource Type Id", output.resourceTypeId)
            tbl.add_label_line("Constraint Type", output.constraintType)
            tbl.add_label_line("Constraint Value", output.constraintValue)
            tbl.add_label_line("Derived Resource Id", output.derivedResourceId)
            tbl.add_label_line("Status", output.status)
            tbl.add_label_line("Created", output.created)
            tbl.add_label_line("Updated", output.updated)
            tbl.add_separator_line()
            tbl.print()


class ConstraintOutput:  # noqa: D101
    def __init__(self, constraint):
        self.constraint = constraint

    @property
    def id(self):  # noqa: D102
        return self.constraint.get("id", "")

    @property
    def allocationId(self):  # noqa: D102
        return self.constraint.get("allocationId", "")

    @property
    def resourceType(self):  # noqa: D102
        return self.constraint.get("resourceType", "")

    @property
    def resourceTypeId(self):  # noqa: D102
        return self.constraint.get("resourceTypeId", "")

    @property
    def constraintType(self):  # noqa: D102
        return self.constraint.get("constraintType", "")

    @property
    def constraintValue(self):  # noqa: D102
        return self.constraint.get("constraintValue", "")

    @property
    def derivedResourceId(self):  # noqa: D102
        return self.constraint.get("derivedResourceId", "")

    @property
    def status(self):  # noqa: D102
        return self.constraint.get("status", "")

    @property
    def created(self):  # noqa: D102
        return self.constraint.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.constraint.get("updated", "")
