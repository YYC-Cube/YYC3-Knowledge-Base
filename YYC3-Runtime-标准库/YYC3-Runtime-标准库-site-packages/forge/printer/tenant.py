# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class TenantPrinter(NVPrettyPrint):
    """Forge Tenant Printer."""

    def print_info(self, tenant, statistics=None):  # noqa: D102

        if self.format_type == "json":
            self.print_data(tenant)
        else:
            output = TenantOutput(tenant)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Tenant Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Org", output.org)
            tbl.add_label_line("Org Display Name", output.orgDisplayName)
            tbl.add_label_line("Enable Serial Console SSH Access", output.isSerialConsoleSSHKeysEnabled)
            tbl.add_label_line("Created", output.created)
            tbl.add_label_line("Updated", output.updated)
            tbl.add_separator_line()
            if statistics:
                st_out = StatisticOutput(statistics)
                ins_out = StatOutput(st_out.instance)
                ins_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                ins_tbl.set_title("Instance")
                ins_tbl.add_label_line("Total", ins_out.total)
                ins_tbl.add_label_line("Pending", ins_out.pending)
                ins_tbl.add_label_line("Provisioning", ins_out.provisioning)
                ins_tbl.add_label_line("Ready", ins_out.ready)
                ins_tbl.add_label_line("Error", ins_out.error)
                ins_tbl.add_separator_line()
                vpc_out = StatOutput(st_out.vpc)
                vpc_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                vpc_tbl.set_title("VPC")
                vpc_tbl.add_label_line("Total", vpc_out.total)
                vpc_tbl.add_label_line("Pending", vpc_out.pending)
                vpc_tbl.add_label_line("Provisioning", vpc_out.provisioning)
                vpc_tbl.add_label_line("Ready", vpc_out.ready)
                vpc_tbl.add_label_line("Error", vpc_out.error)
                vpc_tbl.add_separator_line()
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


class TenantOutput:  # noqa: D101
    def __init__(self, tenant):
        self.tenant = tenant

    @property
    def id(self):  # noqa: D102
        return self.tenant.get("id", "")

    @property
    def org(self):  # noqa: D102
        return self.tenant.get("org", "")

    @property
    def orgDisplayName(self):  # noqa: D102
        return self.tenant.get("orgDisplayName", "")

    @property
    def isSerialConsoleSSHKeysEnabled(self):  # noqa: D102
        return self.tenant.get("isSerialConsoleSSHKeysEnabled", "")

    @property
    def created(self):  # noqa: D102
        return self.tenant.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.tenant.get("updated", "")


class StatisticOutput:  # noqa: D101
    def __init__(self, statistic):
        self.statistic = statistic

    @property
    def instance(self):  # noqa: D102
        return self.statistic.get("instance", {})

    @property
    def vpc(self):  # noqa: D102
        return self.statistic.get("vpc", {})

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
    def ready(self):  # noqa: D102
        return self.stat.get("ready", "")

    @property
    def error(self):  # noqa: D102
        return self.stat.get("error", "")

    @property
    def pending(self):  # noqa: D102
        return self.stat.get("pending", "")

    @property
    def provisioning(self):  # noqa: D102
        return self.stat.get("provisioning", "")

    @property
    def invited(self):  # noqa: D102
        return self.stat.get("invited", "")
