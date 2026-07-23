# Copyright (c) 2025, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from collections import defaultdict

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint

SECURITY_GROUP_FIELDS = {
    "id": "Id",
    "name": "Name",
    "siteId": "Site Id",
    "tenantId": "Tenant Id",
    "description": "Description",
    "status": "Status",
    "created": "Created",
    "updated": "Updated",
}
SECURITY_GROUP_DEFAULT_COLUMNS = ["id", "name", "siteId", "tenantId", "status"]

STATUS_HISTORY_FIELDS = {
    "status": "Status",
    "message": "Message",
    "created": "Created",
    "updated": "Updated",
}

RULE_FIELDS = {
    "name": "Name",
    "direction": "Direction",
    "action": "Action",
    "sourcePrefix": "Source Prefix",
    "destinationPrefix": "Destination Prefix",
    "protocol": "Protocol",
    "priority": "Priority",
    "sourcePortRange": "Source Port Range",
    "destinationPortRange": "Destination Port Range",
}

RULE_DEFAULT_COLUMNS = [
    "name",
    "direction",
    "action",
    "sourcePrefix",
    "destinationPrefix",
    "sourcePortRange",
    "destinationPortRange",
    "protocol",
    "priority",
]


def _drop_nones(obj):
    return {key: value for key, value in obj.items() if value is not None}


class SecurityGroupPrinter(NVPrettyPrint):
    """Forge security group printer."""

    def print_list(self, security_group_list, columns=None):
        """Render a list of items."""
        if self.format_type == "json":
            output = security_group_list
        else:
            output = []
            if not columns:
                columns = [(key, SECURITY_GROUP_FIELDS[key]) for key in SECURITY_GROUP_DEFAULT_COLUMNS]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for security_group in security_group_list:
                security_group = _drop_nones(security_group)
                output.append([security_group.get(col, "") for col in cols])
        self.print_data(output, True)

    def print_info(self, security_group, status_history=False):
        """Render a single item."""
        if self.format_type == "json":
            self.print_data(security_group)
        else:
            output = defaultdict(str, security_group)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Security Group Information")
            for attr, label in SECURITY_GROUP_FIELDS.items():
                tbl.add_label_line(label, output[attr])
            tbl.add_separator_line()

            if output["labels"]:
                lb_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                for key, value in output["labels"].items():
                    lb_tbl.add_label_line(key, value)
                tbl.add_separator_line()

            if status_history:
                for sh in output["statusHistory"]:
                    sho = defaultdict(str, sh)
                    st_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                    for attr, label in STATUS_HISTORY_FIELDS.items():
                        st_tbl.add_label_line(label, sho[attr])
                    tbl.add_separator_line()
            tbl.print()

    def print_list_rules(self, rules_list, columns=None):
        """Render a list of rules."""
        if self.format_type == "json":
            output = rules_list
        else:
            output = []
            if not columns:
                columns = [(key, RULE_FIELDS[key]) for key in RULE_DEFAULT_COLUMNS]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for rule in rules_list:
                rule = _drop_nones(rule)
                output.append([rule.get(col, "") for col in cols])
        self.print_data(output, True)
