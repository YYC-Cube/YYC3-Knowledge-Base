#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class UsagePrinter(NVPrettyPrint):
    """Print objects from ECM."""

    def print_usage(self, registry_usage):  # noqa: D102
        if self.format_type == "json":
            self.print_data(registry_usage)
            return
        tbl = self.create_output(header=False, outline=True)
        tbl.add_separator_line()
        tbl.set_title("Usage Information")
        tbl.add_label_line("Private Registry (GB)", registry_usage)
        tbl.add_separator_line()
        tbl.print()
