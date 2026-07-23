#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class PlaygroundPrinter(NVPrettyPrint):
    """The printer will be responsible for printing objects and object lists."""

    def print_info(self, playground):
        """Print details for a playground (general idea is that we should match the UI)."""
        if self.format_type == "json":
            self.print_data(playground)
            return
        tbl = self.create_output(header=False)
        tbl.add_separator_line()
        tbl.set_title("Playground Information")
        tbl.add_label_line("Name", playground.artifactName)
        tbl.add_label_line("NVCF Function ID", playground.nvcfFunctionId)
        tbl.add_label_line("Created Date", playground.createdDate)
        tbl.add_label_line("Updated Date", playground.updatedDate)
        tbl.add_label_line("Meta Data", playground.metadata)
        tbl.add_label_line("Namespace", playground.namespace)
        tbl.add_label_line("OpenAPI Spec", playground.openAPISpec)
        tbl.add_separator_line()
        tbl.print()


# example output
# ---------------------------------------------------------------------------------------------
#  Playground Information
#    Name: sdxldemo2
#    NVCF Function ID: 6e2a5f25-ddcd-4b24-ab0a-ef9b831ec978
#    Created Date: 2025-01-18T21:44:23.973Z
#    Updated Date: 2025-01-19T17:58:51.670Z
#    Meta Data:
#    Namespace: nvidia
#    OpenAPI Spec: {"openapi": "3.1.0", "info": {"title": "NVCF function", "version": "v1"},/n
# "servers": [{"url": "https://stg.api.nvcf.nvidia.com"}], "tags": [{"name": "NVCF API", /n
# "description": "Run inference on the model"}],...}
# ---------------------------------------------------------------------------------------------
