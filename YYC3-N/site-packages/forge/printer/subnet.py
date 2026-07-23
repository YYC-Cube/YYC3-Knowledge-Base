# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class SubnetPrinter(NVPrettyPrint):
    """Forge Subnet Printer."""

    def print_list(self, subnet_list, columns=None):  # noqa: D102

        if self.format_type == "json":
            output = subnet_list
        else:
            output = []
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("name", "Name"),
                    ("vpcName", "Vpc Name"),
                    ("prefixLength", "Prefix Length"),
                    ("routingType", "Routing Type"),
                    ("status", "Status"),
                    ("updated", "Updated"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for subnet in subnet_list:
                out = SubnetOutput(subnet)
                output.append([getattr(out, col, None) for col in cols])
        self.print_data(output, True)

    def print_info(self, subnet, status_history=False):  # noqa: D102

        if self.format_type == "json":
            self.print_data(subnet)
        else:
            output = SubnetOutput(subnet)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Subnet Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Name", output.name)
            tbl.add_label_line("Description", output.description)
            tbl.add_label_line("Vpc Id", output.vpcId)
            tbl.add_label_line("Vpc Name", output.vpcName)
            tbl.add_label_line("Tenant Id", output.tenantId)
            tbl.add_label_line("Tenant Name", output.tenantName)
            tbl.add_label_line("Ipv4 Prefix", output.ipv4Prefix)
            tbl.add_label_line("Ipv4 Block Id", output.ipv4BlockId)
            tbl.add_label_line("Ipv4 Block Name", output.ipv4BlockName)
            tbl.add_label_line("Ipv4 Gateway", output.ipv4Gateway)
            tbl.add_label_line("Ipv6 Prefix", output.ipv6Prefix)
            tbl.add_label_line("Ipv6 Block Id", output.ipv6BlockId)
            tbl.add_label_line("Ipv6 Block Name", output.ipv6BlockName)
            tbl.add_label_line("Ipv6 Gateway", output.ipv6Gateway)
            tbl.add_label_line("Prefix Length", output.prefixLength)
            tbl.add_label_line("Routing Type", output.routingType)
            tbl.add_label_line("Status", output.status)
            tbl.add_label_line("Created", output.created)
            tbl.add_label_line("Updated", output.updated)
            tbl.add_separator_line()
            if status_history:
                for sh in output.statusHistory:
                    sho = StatusHistoryOutput(sh)
                    st_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                    st_tbl.add_label_line("Status", sho.status)
                    st_tbl.add_label_line("Message", sho.message)
                    st_tbl.add_label_line("Created", sho.created)
                    st_tbl.add_label_line("Updated", sho.updated)
                    tbl.add_separator_line()
            tbl.print()


class SubnetOutput:  # noqa: D101
    def __init__(self, subnet):
        self.subnet = subnet

    @property
    def id(self):  # noqa: D102
        return self.subnet.get("id", "")

    @property
    def name(self):  # noqa: D102
        return self.subnet.get("name", "")

    @property
    def description(self):  # noqa: D102
        return self.subnet.get("descriptiion", "")

    @property
    def vpcId(self):  # noqa: D102
        return self.subnet.get("vpcId", "")

    @property
    def tenantId(self):  # noqa: D102
        return self.subnet.get("tenantId", "")

    @property
    def ipv4Prefix(self):  # noqa: D102
        return self.subnet.get("ipv4Prefix", "")

    @property
    def ipv4BlockId(self):  # noqa: D102
        return self.subnet.get("ipv4BlockId", "")

    @property
    def ipv6Prefix(self):  # noqa: D102
        return self.subnet.get("ipv6Prefix", "")

    @property
    def ipv6BlockId(self):  # noqa: D102
        return self.subnet.get("ipv6BlockId", "")

    @property
    def prefixLength(self):  # noqa: D102
        return self.subnet.get("prefixLength", "")

    @property
    def routingType(self):  # noqa: D102
        return self.subnet.get("routingType", "")

    @property
    def ipv4Gateway(self):  # noqa: D102
        return self.subnet.get("ipv4Gateway", "")

    @property
    def ipv6Gateway(self):  # noqa: D102
        return self.subnet.get("ipv6Gateway", "")

    @property
    def status(self):  # noqa: D102
        return self.subnet.get("status", "")

    @property
    def statusHistory(self):  # noqa: D102
        return self.subnet.get("statusHistory", "")

    @property
    def created(self):  # noqa: D102
        return self.subnet.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.subnet.get("updated", "")

    @property
    def vpcName(self):  # noqa: D102
        return self.subnet.get("vpc", {}).get("name", "")

    @property
    def tenantName(self):  # noqa: D102
        return self.subnet.get("tenant", {}).get("orgDisplayName", "")

    @property
    def ipv4BlockName(self):  # noqa: D102
        return self.subnet.get("ipv4Block", {}).get("name", "")

    @property
    def ipv6BlockName(self):  # noqa: D102
        return self.subnet.get("ipv6Block", {}).get("name", "")


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
