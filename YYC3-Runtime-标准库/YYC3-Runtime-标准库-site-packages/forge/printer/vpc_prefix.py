# Copyright (c) 2025, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from collections import defaultdict

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint

VPC_PREFIX_FIELDS = {
    "id": "Id",
    "name": "Name",
    "siteId": "Site Id",
    "vpcId": "VPC Id",
    "tenantId": "Tenant Id",
    "prefix": "Prefix",
    "ipBlockId": "IP Block Id",
    "prefixLength": "Prefix Length",
    "status": "Status",
    "created": "Created",
    "updated": "Updated",
}

STATUS_HISTORY_FIELDS = {
    "status": "Status",
    "message": "Message",
    "created": "Created",
    "updated": "Updated",
}


class VpcPrefixPrinter(NVPrettyPrint):
    """Forge VPC prefix printer."""

    def print_list(self, vpc_prefix_list, columns=None):  # noqa: D102

        if self.format_type == "json":
            output = vpc_prefix_list
        else:
            output = []
            if not columns:
                columns = [(key, VPC_PREFIX_FIELDS[key]) for key in ["id", "name", "prefix", "ipBlockId", "status"]]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for vpc_prefix in vpc_prefix_list:
                output.append([vpc_prefix.get(col) for col in cols])
        self.print_data(output, True)

    def print_info(self, vpc_prefix, status_history=False):  # noqa: D102
        if self.format_type == "json":
            self.print_data(vpc_prefix)
        else:
            output = defaultdict(str, vpc_prefix)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("VPC Prefix Information")
            for attr, label in VPC_PREFIX_FIELDS.items():
                tbl.add_label_line(label, output[attr])
            tbl.add_separator_line()
            if status_history:
                for sh in output["statusHistory"]:
                    sho = defaultdict(str, sh)
                    st_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                    for attr, label in STATUS_HISTORY_FIELDS.items():
                        st_tbl.add_label_line(label, sho[attr])
                    tbl.add_separator_line()
            tbl.print()
