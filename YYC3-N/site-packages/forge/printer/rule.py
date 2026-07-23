# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class RulePrinter(NVPrettyPrint):
    """Forge Rule Printer."""

    def print_list(self, rule_list, columns=None):  # noqa: D102

        if self.format_type == "json":
            output = rule_list
        else:
            output = []
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("name", "Name"),
                    ("siteId", "Site Id"),
                    ("tenantId", "Tenant Id"),
                    ("vpcId", "VPC Id"),
                    ("subnetId", "Subnet Id"),
                    ("instanceId", "Instance Id"),
                    ("status", "Status"),
                    ("created", "Created"),
                    ("updated", "Updated"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for rule in rule_list:
                out = RuleOutput(rule)
                output.append([getattr(out, col, None) for col in cols])
        self.print_data(output, True)

    def print_info(self, rule, status_history=False):  # noqa: D102

        if self.format_type == "json":
            self.print_data(rule)
        else:
            output = RuleOutput(rule)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Rule Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Name", output.name)
            tbl.add_label_line("Description", output.description)
            tbl.add_label_line("Tenant Id", output.tenantId)
            tbl.add_label_line("Site Id", output.siteId)
            tbl.add_label_line("VPC Id", output.vpcId)
            tbl.add_label_line("Subnet Id", output.subnetId)
            tbl.add_label_line("Instance Id", output.instanceId)
            tbl.add_label_line("Status", output.status)
            tbl.add_label_line("Created", output.created)
            tbl.add_label_line("Updated", output.updated)
            tbl.add_separator_line()
            for sp in output.securityPolicies:
                sp_out = SecurityPolicyOutput(sp)
                sp_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                sp_tbl.set_title("Policy Information")
                sp_tbl.add_label_line("Id", sp_out.id)
                sp_tbl.add_label_line("Inbound", sp_out.inbound)
                sp_tbl.add_label_line("Outbound", sp_out.outbound)
                sp_tbl.add_label_line("Protocol", sp_out.protocol)
                sp_tbl.add_label_line("Port Range", sp_out.portRange)
                sp_tbl.add_label_line("CIDR", sp_out.toOrFromCidr)
                sp_tbl.add_label_line("VPC Id", sp_out.toOrFromVpcId)
                sp_tbl.add_label_line("Subnet Id", sp_out.toOrFromSubnetId)
                sp_tbl.add_label_line("Instance Id", sp_out.toOrFromInstanceId)
                sp_tbl.add_label_line("Created", sp_out.created)
                sp_tbl.add_label_line("Updated", sp_out.updated)
                sp_tbl.add_separator_line()
            if status_history:
                for sh in output.statusHistory:
                    sh_out = RuleStatusOutput(sh)
                    st_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                    st_tbl.add_label_line("Status", sh_out.status)
                    st_tbl.add_label_line("Message", sh_out.message)
                    st_tbl.add_label_line("Created", sh_out.created)
                    st_tbl.add_label_line("Updated", sh_out.updated)
                    tbl.add_separator_line()
            tbl.print()


class RuleOutput:  # noqa: D101
    def __init__(self, rule):
        self.rule = rule

    @property
    def id(self):  # noqa: D102
        return self.rule.get("id", "")

    @property
    def name(self):  # noqa: D102
        return self.rule.get("name", "")

    @property
    def description(self):  # noqa: D102
        return self.rule.get("description", "")

    @property
    def tenantId(self):  # noqa: D102
        return self.rule.get("tenantId", "")

    @property
    def siteId(self):  # noqa: D102
        return self.rule.get("siteId", "")

    @property
    def vpcId(self):  # noqa: D102
        return self.rule.get("vpcId", "")

    @property
    def subnetId(self):  # noqa: D102
        return self.rule.get("subnetId", "")

    @property
    def instanceId(self):  # noqa: D102
        return self.rule.get("instanceId", "")

    @property
    def status(self):  # noqa: D102
        return self.rule.get("status", "")

    @property
    def statusHistory(self):  # noqa: D102
        return self.rule.get("statusHistory", "")

    @property
    def securityPolicies(self):  # noqa: D102
        return self.rule.get("securityPolicies", "")

    @property
    def created(self):  # noqa: D102
        return self.rule.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.rule.get("updated", "")


class RuleStatusOutput:  # noqa: D101
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


class SecurityPolicyOutput:  # noqa: D101
    def __init__(self, constraint):
        self.constraint = constraint

    @property
    def id(self):  # noqa: D102
        return self.constraint.get("id", "")

    @property
    def inbound(self):  # noqa: D102
        return self.constraint.get("inbound", "")

    @property
    def outbound(self):  # noqa: D102
        return self.constraint.get("outbound", "")

    @property
    def protocol(self):  # noqa: D102
        return self.constraint.get("protocol", "")

    @property
    def portRange(self):  # noqa: D102
        return self.constraint.get("portRange", "")

    @property
    def toOrFromCidr(self):  # noqa: D102
        return self.constraint.get("toOrFromCidr", "")

    @property
    def toOrFromVpcId(self):  # noqa: D102
        return self.constraint.get("toOrFromVpcId", "")

    @property
    def toOrFromSubnetId(self):  # noqa: D102
        return self.constraint.get("toOrFromSubnetId", "")

    @property
    def toOrFromInstanceId(self):  # noqa: D102
        return self.constraint.get("toOrFromInstanceId", "")

    @property
    def created(self):  # noqa: D102
        return self.constraint.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.constraint.get("updated", "")
