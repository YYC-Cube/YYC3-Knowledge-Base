#
# Copyright (c) 2020-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from ngcbase.printer.nvPrettyPrint import NVPrettyPrint, str_
from ngcbase.util.utils import convert_string


class LabelSetPrinter(NVPrettyPrint):
    """The printer is responsible for printing objects and lists of objects of the associated type."""

    def print_label_set_list(self, label_set_list, columns=None):
        """Handles the output for `ngc registry label_set list`."""  # noqa: D401
        output = []
        if self.format_type == "json":
            output = label_set_list
        else:
            if not columns:
                columns = [
                    ("name", "Name"),
                    ("displayName", "Display Name"),
                    ("org", "Org"),
                    ("team", "Team"),
                    ("resourceType", "Resource Type"),
                    ("readOnly", "Read Only"),
                    ("isGlobal", "Global"),
                    ("labels", "Labels"),
                ]
            output = self.generate_label_set_list(label_set_list, columns)
        self.print_data(output, True)

    @staticmethod
    def generate_label_set_list(gen, columns):  # noqa: D102
        cols, disp = zip(*columns)
        yield list(disp)

        for label_set in gen or []:
            out = LabelSetOuput(label_set)
            yield [getattr(out, col, None) for col in cols]

    def print_label_set(self, label_set):
        """Print information about a label_set."""
        if self.format_type == "json":
            self.print_data(label_set)
            return
        tbl = self.create_output(header=False)
        tbl.add_separator_line()
        tbl.set_title("Label Set Information")
        tbl.add_label_line("Name", label_set.value.replace("/recipe", "/resource"))
        tbl.add_label_line("Display Name", label_set.display)
        # administrative info
        tbl.add_label_line("Org", label_set.orgName)
        tbl.add_label_line("Team", label_set.teamName if hasattr(label_set, "teamName") else "")
        resource_type = str_(label_set.resourceType) if hasattr(label_set, "resourceType") else ""
        tbl.add_label_line("Resource Type", convert_string(resource_type, "RECIPE", "RESOURCE"))
        tbl.add_label_line("Read Only", label_set.isReadOnly)
        tbl.add_label_line("Global", label_set.isGlobal)
        tbl.add_label_line("Labels", ", ".join([label.display for label in (label_set.labels or []) if label.display]))
        tbl.add_separator_line()
        tbl.print()


class LabelSetOuput:  # noqa: D101
    def __init__(self, label_set):
        self.label_set = label_set

    def _resolve(self, att, to_string=True):
        val = getattr(self.label_set, att)
        if to_string:
            return str_(val)
        return val

    @property
    def displayName(self):  # noqa: D102
        return self._resolve("display")

    @property
    def isGlobal(self):  # noqa: D102
        return self._resolve("isGlobal") or "False"

    @property
    def readOnly(self):  # noqa: D102
        return self._resolve("isReadOnly") or "False"

    @property
    def labels(self):  # noqa: D102
        lbls = self._resolve("labels", to_string=False)
        if not lbls:
            return ""
        lbs = ", ".join("{}".format(lbl.display) for lbl in lbls or [] if lbl.display)
        if not lbs:
            return ""
        return lbs

    @property
    def name(self):  # noqa: D102
        name_ = self._resolve("value")
        return name_.replace("/recipe", "/resource")

    @property
    def org(self):  # noqa: D102
        return self._resolve("orgName")

    @property
    def team(self):  # noqa: D102
        return self._resolve("teamName")

    @property
    def resourceType(self):  # noqa: D102
        rtype = self._resolve("resourceType")
        return convert_string(rtype, "RECIPE", "RESOURCE")
