# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class InfiniBandPartitionPrinter(NVPrettyPrint):
    """Forge InfiniBandPartition Printer."""

    def print_list(self, instance_list, columns=None):  # noqa: D102

        if self.format_type == "json":
            output = instance_list
        else:
            output = []
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("name", "Name"),
                    ("siteName", "Site Name"),
                    ("partitionKey", "Partition key"),
                    ("partitionName", "Partition Name"),
                    ("serviceLevel", "Service Level"),
                    ("rateLimit", "Rate Limit"),
                    ("mtu", "MTU"),
                    ("enableSharp", "Enable Sharp"),
                    ("status", "Status"),
                    ("updated", "Updated"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for instance in instance_list:
                out = InfiniBandPartitionOutput(instance)
                output.append([getattr(out, col, "") for col in cols])
        self.print_data(output, True)

    def print_info(self, instance, status_history=False):  # noqa: D102

        if self.format_type == "json":
            self.print_data(instance)
        else:
            output = InfiniBandPartitionOutput(instance)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("InfiniBandPartition Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Name", output.name)
            tbl.add_label_line("Description", output.description)
            tbl.add_label_line("Tenant Id", output.tenantId)
            tbl.add_label_line("Tenant Name", output.tenantName)
            tbl.add_label_line("Site Id", output.siteId)
            tbl.add_label_line("Site Name", output.siteName)
            tbl.add_label_line("Controller IB Partition Id", output.controllerIBPartitionId)
            tbl.add_label_line("Partition Key", output.partitionKey)
            tbl.add_label_line("Partition Name", output.partitionName)
            tbl.add_label_line("Service Level", output.serviceLevel)
            tbl.add_label_line("Rate Limit", output.rateLimit)
            tbl.add_label_line("MTU", output.mtu)
            tbl.add_label_line("enableSharp", output.enableSharp)
            tbl.add_label_line("Status", output.status)
            tbl.add_label_line("Created", output.created)
            tbl.add_label_line("Updated", output.updated)
            tbl.add_separator_line()
            if status_history:
                for sh in output.statusHistory:
                    sho = StatusHistoryOutput(sh)
                    st_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                    st_tbl.add_label_line("status", sho.status)
                    st_tbl.add_label_line("message", sho.message)
                    st_tbl.add_label_line("created", sho.created)
                    st_tbl.add_label_line("updated", sho.updated)
                    tbl.add_separator_line()
            tbl.print()


class InfiniBandPartitionOutput:  # noqa: D101
    def __init__(self, instance):
        self.instance = instance

    @property
    def id(self):  # noqa: D102
        return self.instance.get("id", "")

    @property
    def name(self):  # noqa: D102
        return self.instance.get("name", "")

    @property
    def description(self):  # noqa: D102
        return self.instance.get("description", "")

    @property
    def siteId(self):  # noqa: D102
        return self.instance.get("siteId", "")

    @property
    def tenantId(self):  # noqa: D102
        return self.instance.get("tenantId", "")

    @property
    def controllerIBPartitionId(self):  # noqa: D102
        return self.instance.get("controllerIBPartitionId", "")

    @property
    def partitionKey(self):  # noqa: D102
        return self.instance.get("partitionKey", "")

    @property
    def partitionName(self):  # noqa: D102
        return self.instance.get("partitionName", "")

    @property
    def serviceLevel(self):  # noqa: D102
        return self.instance.get("serviceLevel", "")

    @property
    def rateLimit(self):  # noqa: D102
        return self.instance.get("rateLimit", "")

    @property
    def mtu(self):  # noqa: D102
        return self.instance.get("mtu", "")

    @property
    def enableSharp(self):  # noqa: D102
        return self.instance.get("enableSharp", "")

    @property
    def status(self):  # noqa: D102
        return self.instance.get("status", "")

    @property
    def statusHistory(self):  # noqa: D102
        return self.instance.get("statusHistory", [])

    @property
    def created(self):  # noqa: D102
        return self.instance.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.instance.get("updated", "")

    @property
    def tenantName(self):  # noqa: D102
        return self.instance.get("tenant", {}).get("orgDisplayName", "")

    @property
    def siteName(self):  # noqa: D102
        return self.instance.get("site", {}).get("name", "")


class StatusHistoryOutput:  # noqa: D101
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
