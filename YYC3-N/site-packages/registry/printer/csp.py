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
from ngcbase.printer.nvPrettyPrint import NVPrettyPrint, str_
from ngcbase.printer.utils import format_list_view_date
from registry.data.model.DeploymentParameters import DeploymentParameters
from registry.data.model.DeploymentParametersMeta import DeploymentParametersMeta


class CspPrinter(NVPrettyPrint):
    """Printer class for the CSP module."""

    def _get_csp_lines(self, tbl, csp):
        """Helper function for printing CSP tables in a standardized way."""  # noqa: D401
        tbl.add_separator_line()
        csp_tbl = self.add_sub_table(header=False, detail_style=True, outline=True)
        csp_tbl.set_title(csp.name)
        csp_tbl.add_label_line("Display Name", csp.displayName, level=1)
        csp_tbl.add_label_line("Enabled", csp.isEnabled, level=1)
        csp_tbl.add_label_line("Logo", csp.logo, level=1)
        csp_tbl.add_label_line("Created Date", csp.createdDate, level=1)
        csp_tbl.add_label_line("Updated Date", csp.updatedDate, level=1)
        csp_tbl.add_label_line("Description", csp.description, level=1)
        csp_tbl.add_label_line("Labels", ", ".join(csp.labels or []))

    def print_csp(self, csp):
        """Print a CloudServiceProvider object."""
        if self.format_type == "json":
            self.print_data(csp)
            return

        tbl = self.create_output(header=False, outline=False)
        tbl.add_separator_line()
        tbl.set_title("Cloud Service Provider (CSP) Info")
        self._get_csp_lines(tbl, csp)
        tbl.add_separator_line()
        tbl.print()

    def print_deployment_settings(  # noqa: D102
        self, deployment_settings: DeploymentParametersMeta, deployment_defaults: DeploymentParameters
    ):
        if self.format_type == "json":
            self.print_data(deployment_settings)
            return
        tbl = self.create_output(header=False)
        tbl.set_min_width(44)
        tbl.add_separator_line()
        tbl.set_title("Cloud Service Provider Settings Information")
        tbl.add_label_line("Name", deployment_settings.csp)
        tbl.add_label_line("GPUs")
        min_gpu = deployment_settings.gpu.count.minValue if deployment_settings.gpu else "None"
        max_gpu = deployment_settings.gpu.count.maxValue if deployment_settings.gpu else "None"
        default_count = deployment_defaults.gpu.count if deployment_defaults.gpu else "None"
        tbl.add_label_line("Min", min_gpu, level=1)
        tbl.add_label_line("Max", max_gpu, level=1)
        tbl.add_label_line("Default", default_count, level=1)
        tbl.add_label_line("Types", level=1)
        if deployment_settings.gpu:
            for each in deployment_settings.gpu.type.items or []:
                tbl.add_label_line("", each.name, level=2)
        default_type = deployment_defaults.gpu.type if deployment_defaults.gpu else "None"
        tbl.add_label_line("Default GPU Type", default_type, level=1)
        tbl.add_label_line("Disk Space (GB)")
        min_disk = deployment_settings.storage.capacityInGB.minValue if deployment_settings.storage else "None"
        max_disk = deployment_settings.storage.capacityInGB.maxValue if deployment_settings.storage else "None"
        default_disk = deployment_defaults.storage.capacityInGB if deployment_defaults.storage else "None"
        tbl.add_label_line("Min", min_disk, level=1)
        tbl.add_label_line("Max", max_disk, level=1)
        tbl.add_label_line("Default", default_disk, level=1)
        tbl.add_separator_line()
        tbl.print()

    def print_csp_list(self, csp_list_gen):
        """Print details for a list of CSPs."""
        output = []
        if self.format_type == "json":
            output = []
            csp_list = list(csp_list_gen)
            if csp_list:
                output = csp_list[0].cloudServiceProviders
            self.print_data(output)
            return
        columns = [
            ("name", "Name"),
            ("display_name", "Display Name"),
            ("enabled", "Enabled"),
            ("created_date", "Created"),
            ("updated_date", "Updated"),
            ("description", "Description"),
            ("labels", "Labels"),
        ]
        output = self.generate_csp_list(csp_list_gen, columns)
        self.print_data(output, is_table=True)

    @staticmethod
    def generate_csp_list(gen, columns):  # noqa: D102
        cols, disp = zip(*columns)
        yield list(disp)

        for page in gen or []:
            for csp in page.cloudServiceProviders or []:
                out = CspOutput(csp)
                yield [getattr(out, col, None) for col in cols]


class CspOutput:  # noqa: D101
    def __init__(self, csp):
        self.csp = csp

    @property
    def name(self):  # noqa: D102
        return str_(self.csp.name)

    @property
    def display_name(self):  # noqa: D102
        return str_(self.csp.displayName)

    @property
    def enabled(self):  # noqa: D102
        return str_(self.csp.isEnabled)

    @property
    def updated_date(self):  # noqa: D102
        return format_list_view_date(self.csp.updatedDate)

    @property
    def created_date(self):  # noqa: D102
        return format_list_view_date(self.csp.createdDate)

    @property
    def labels(self):  # noqa: D102
        if not self.csp.labels:
            return ""
        return ", ".join(self.csp.labels)
