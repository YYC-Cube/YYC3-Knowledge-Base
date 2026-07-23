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
from ngcbase.printer.nvPrettyPrint import format_date, NVPrettyPrint
from ngcbase.util.file_utils import human_size


class ResultPrinter(NVPrettyPrint):
    """The printer should be responsible for printing results."""

    def print_resultset_info(self, resultset, list_files):  # noqa: D102
        if self.format_type == "json":
            self.print_data(resultset)
            return
        tbl = self.create_output()
        tbl.add_separator_line()
        tbl.set_title("Resultset Information")
        replica = f"{resultset.id}:{resultset.replicaId}" if resultset.replicaId else f"{resultset.id}"
        tbl.add_label_line("Replica", replica)
        tbl.add_label_line("ACE ID", resultset.aceId)
        tbl.add_label_line("Created Date", format_date(resultset.createdDate))
        tbl.add_label_line("Size", human_size(resultset.size))
        tbl.add_label_line("Total Files", resultset.totalFiles)
        if list_files:
            self.print_resultset_files(tbl, resultset)
        tbl.add_separator_line()
        tbl.print()

    @staticmethod
    def print_resultset_files(tbl, resultset, print_file_heading=True):  # noqa: D102
        if resultset and resultset.files:
            if print_file_heading:
                tbl.add_label_line("Files")
            for file_ in resultset.files:
                # filters "/" entries - sometimes webservices returns the current dir, sometimes it does not.
                if file_.path != "/":
                    tbl.add_label_line("", file_.path)
