# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class ProviderPrinter(NVPrettyPrint):
    """Forge Provider Printer."""

    def print_info(self, provider, statistics=None):  # noqa: D102

        if self.format_type == "json":
            self.print_data(provider)
        else:
            output = ProviderOutput(provider)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Provider Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Org", output.org)
            tbl.add_label_line("Org Display Name", output.orgDisplayName)
            tbl.add_label_line("Created", output.created)
            tbl.add_label_line("Updated", output.updated)
            tbl.add_separator_line()
            if statistics:
                st_out = StatisticOutput(statistics)
                mc_out = StatOutput(st_out.machine)
                mc_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                mc_tbl.set_title("Machine")
                mc_tbl.add_label_line("Total", mc_out.total)
                mc_tbl.add_label_line("Initializing", mc_out.initializing)
                mc_tbl.add_label_line("Ready", mc_out.ready)
                mc_tbl.add_label_line("Error", mc_out.error)
                mc_tbl.add_label_line("Decommissioned", mc_out.decommissioned)
                mc_tbl.add_separator_line()
                ip_out = StatOutput(st_out.ipBlock)
                ip_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                ip_tbl.set_title("Ip Block")
                ip_tbl.add_label_line("Total", ip_out.total)
                ip_tbl.add_label_line("Pending", ip_out.pending)
                ip_tbl.add_label_line("Provisioning", ip_out.provisioning)
                ip_tbl.add_label_line("Ready", ip_out.ready)
                ip_tbl.add_label_line("Error", ip_out.error)
                ip_tbl.add_separator_line()
                ta_out = StatOutput(st_out.tenantAccount)
                ta_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                ta_tbl.set_title("Tenant Account")
                ta_tbl.add_label_line("Total", ta_out.total)
                ta_tbl.add_label_line("Pending", ta_out.pending)
                ta_tbl.add_label_line("Invited", ta_out.invited)
                ta_tbl.add_label_line("Ready", ta_out.ready)
                ta_tbl.add_label_line("Error", ta_out.error)
                ta_tbl.add_separator_line()
            tbl.print()


class ProviderOutput:  # noqa: D101
    def __init__(self, provider):
        self.provider = provider

    @property
    def id(self):  # noqa: D102
        return self.provider.get("id", "")

    @property
    def org(self):  # noqa: D102
        return self.provider.get("org", "")

    @property
    def orgDisplayName(self):  # noqa: D102
        return self.provider.get("orgDisplayName", "")

    @property
    def created(self):  # noqa: D102
        return self.provider.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.provider.get("updated", "")


class StatisticOutput:  # noqa: D101
    def __init__(self, statistic):
        self.statistic = statistic

    @property
    def machine(self):  # noqa: D102
        return self.statistic.get("machine", {})

    @property
    def ipBlock(self):  # noqa: D102
        return self.statistic.get("ipBlock", {})

    @property
    def tenantAccount(self):  # noqa: D102
        return self.statistic.get("tenantAccount", {})


class StatOutput:  # noqa: D101
    def __init__(self, stat):
        self.stat = stat

    @property
    def total(self):  # noqa: D102
        return self.stat.get("total", "")

    @property
    def initializing(self):  # noqa: D102
        return self.stat.get("initializing", "")

    @property
    def ready(self):  # noqa: D102
        return self.stat.get("ready", "")

    @property
    def error(self):  # noqa: D102
        return self.stat.get("error", "")

    @property
    def decommissioned(self):  # noqa: D102
        return self.stat.get("decommissioned", "")

    @property
    def pending(self):  # noqa: D102
        return self.stat.get("pending", "")

    @property
    def provisioning(self):  # noqa: D102
        return self.stat.get("provisioning", "")

    @property
    def invited(self):  # noqa: D102
        return self.stat.get("invited", "")
