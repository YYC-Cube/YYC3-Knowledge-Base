# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.printer.constraint import ConstraintOutput
from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class AllocationPrinter(NVPrettyPrint):
    """Forge Allocation Printer."""

    def print_list(self, allocation_list, columns=None):  # noqa: D102

        if self.format_type == "json":
            output = allocation_list
        else:
            output = []
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("name", "Name"),
                    ("siteName", "Site Name"),
                    ("tenantName", "Tenant Name"),
                    ("resourceType", "Resource Type"),
                    ("constraintType", "Constraint Type"),
                    ("constraintValue", "Constraint Value"),
                    ("status", "Status"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for allocation in allocation_list:
                out = AllocationOutput(allocation)
                ac_out = ConstraintOutput(next(iter(out.allocationConstraints or []), {}))
                output.append([getattr(out, col, "") or getattr(ac_out, col, "") for col in cols])
        self.print_data(output, True)

    def print_info(self, allocation, status_history=False):  # noqa: D102

        if self.format_type == "json":
            self.print_data(allocation)
        else:
            output = AllocationOutput(allocation)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Allocation Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Name", output.name)
            tbl.add_label_line("Description", output.description)
            tbl.add_label_line("Infrastructure Provider Id", output.infrastructureProviderId)
            tbl.add_label_line("Infrastructure Provider Name", output.infrastructureProviderName)
            tbl.add_label_line("Tenant Id", output.tenantId)
            tbl.add_label_line("Tenant Name", output.tenantName)
            tbl.add_label_line("Site Id", output.siteId)
            tbl.add_label_line("Site Name", output.siteName)
            tbl.add_label_line("status", output.status)
            tbl.add_label_line("Created", output.created)
            tbl.add_label_line("Updated", output.updated)
            tbl.add_separator_line()
            for ac in output.allocationConstraints:
                ac_out = ConstraintOutput(ac)
                ac_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                ac_tbl.set_title("Constraint Information")
                ac_tbl.add_label_line("Id", ac_out.id)
                ac_tbl.add_label_line("Allocation Id", ac_out.allocationId)
                ac_tbl.add_label_line("Resource Type", ac_out.resourceType)
                ac_tbl.add_label_line("Resource Type Id", ac_out.resourceTypeId)
                ac_tbl.add_label_line("Constraint Type", ac_out.constraintType)
                ac_tbl.add_label_line("Constraint Value", ac_out.constraintValue)
                ac_tbl.add_label_line("Derived Resource Id", ac_out.derivedResourceId)
                ac_tbl.add_label_line("Status", ac_out.status)
                ac_tbl.add_label_line("Created", ac_out.created)
                ac_tbl.add_label_line("Updated", ac_out.updated)
                ac_tbl.add_separator_line()
            if status_history:
                for sh in output.statusHistory:
                    sh_out = AllocationStatusOutput(sh)
                    st_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                    st_tbl.add_label_line("Status", sh_out.status)
                    st_tbl.add_label_line("Message", sh_out.message)
                    st_tbl.add_label_line("Created", sh_out.created)
                    st_tbl.add_label_line("Updated", sh_out.updated)
                    tbl.add_separator_line()
            tbl.print()


class AllocationOutput:  # noqa: D101
    def __init__(self, allocation):
        self.allocation = allocation

    @property
    def id(self):  # noqa: D102
        return self.allocation.get("id", "")

    @property
    def name(self):  # noqa: D102
        return self.allocation.get("name", "")

    @property
    def description(self):  # noqa: D102
        return self.allocation.get("description", "")

    @property
    def infrastructureProviderId(self):  # noqa: D102
        return self.allocation.get("infrastructureProviderId", "")

    @property
    def tenantId(self):  # noqa: D102
        return self.allocation.get("tenantId", "")

    @property
    def siteId(self):  # noqa: D102
        return self.allocation.get("siteId", "")

    @property
    def status(self):  # noqa: D102
        return self.allocation.get("status", "")

    @property
    def statusHistory(self):  # noqa: D102
        return self.allocation.get("statusHistory", "")

    @property
    def allocationConstraints(self):  # noqa: D102
        return self.allocation.get("allocationConstraints", [])

    @property
    def created(self):  # noqa: D102
        return self.allocation.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.allocation.get("updated", "")

    @property
    def siteName(self):  # noqa: D102
        return self.allocation.get("site", {}).get("name", "")

    @property
    def tenantName(self):  # noqa: D102
        return self.allocation.get("tenant", {}).get("orgDisplayName", "")

    @property
    def infrastructureProviderName(self):  # noqa: D102
        return self.allocation.get("infrastructureProvider", {}).get("orgDisplayName", "")


class AllocationStatusOutput:  # noqa: D101
    def __init__(self, status_out):
        self.status_out = status_out

    @property
    def status(self):  # noqa: D102
        return self.status_out.get("status", "")

    @property
    def message(self):  # noqa: D102
        return self.status_out.get("message", "")

    @property
    def created(self):  # noqa: D102
        return self.status_out.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.status_out.get("updated", "")
