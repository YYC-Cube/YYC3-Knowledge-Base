# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class InstancePrinter(NVPrettyPrint):
    """Forge Instance Printer."""

    def print_list(self, instance_list, columns=None):  # noqa: D102

        if self.format_type == "json":
            output = instance_list
        else:
            output = []
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("name", "Name"),
                    ("instanceTypeName", "Instance Type Name"),
                    ("vpcName", "VPC Name"),
                    ("machineName", "Machine Name"),
                    ("operatingSystemName", "Operating System Name"),
                    ("networkSecurityGroupId", "Security Group Id"),
                    ("status", "Status"),
                    ("updated", "Updated"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for instance in instance_list:
                out = _InstanceOutput(instance)
                output.append([getattr(out, col, "") for col in cols])
        self.print_data(output, True)

    def print_info(self, instance, status_history=False):  # noqa: D102

        if self.format_type == "json":
            self.print_data(instance)
        else:
            output = _InstanceOutput(instance)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Instance Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Name", output.name)
            tbl.add_label_line("Description", output.description)
            tbl.add_label_line("Allocation Id", output.allocationId)
            tbl.add_label_line("Allocation Name", output.allocationName)
            tbl.add_label_line("Tenant Id", output.tenantId)
            tbl.add_label_line("Tenant Name", output.tenantName)
            tbl.add_label_line("Infrastructure Provider Id", output.infrastructureProviderId)
            tbl.add_label_line("Infrastructure Provider Name", output.infrastructureProviderName)
            tbl.add_label_line("Site Id", output.siteId)
            tbl.add_label_line("Site Name", output.siteName)
            tbl.add_label_line("Instance Type Id", output.instanceTypeId)
            tbl.add_label_line("Instance Type Name", output.instanceTypeName)
            tbl.add_label_line("Vpc Id", output.vpcId)
            tbl.add_label_line("Vpc Name", output.vpcName)
            tbl.add_label_line("Machine Id", output.machineId)
            tbl.add_label_line("Machine Name", output.machineName)
            tbl.add_label_line("Operating System Id", output.operatingSystemId)
            tbl.add_label_line("Operating System Name", output.operatingSystemName)
            tbl.add_label_line("Ipxe Script", output.ipxeScript)
            tbl.add_label_line("Always Boot Custom iPXE", output.alwaysBootWithCustomIpxe)
            tbl.add_label_line("Userdata", output.userdata)
            tbl.add_label_line("Serial Console Url", output.serialConsoleUrl)
            tbl.add_label_line("Phone Home Enabled", output.phoneHomeEnabled)
            tbl.add_label_line("Security Group Id", output.networkSecurityGroupId)
            tbl.add_label_line("Security Group Propagation Status", output.networkSecurityGroupPropagationStatus)
            tbl.add_label_line("Security Group Inherited", output.networkSecurityGroupInherited)
            tbl.add_label_line("Status", output.status)
            tbl.add_label_line("Created", output.created)
            tbl.add_label_line("Updated", output.updated)
            tbl.add_separator_line()
            for it in output.interfaces:
                ito = _InterfaceOutput(it)
                it_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                it_tbl.set_title("Instance Interface")
                it_tbl.add_label_line("Id", ito.id)
                it_tbl.add_label_line("Instance Id", ito.instanceId)
                it_tbl.add_label_line("Subnet Id", ito.subnetId)
                it_tbl.add_label_line("Physical", ito.isPhysical)
                it_tbl.add_label_line("Virtual Id", ito.virtualFunctionId)
                it_tbl.add_label_line("MAC Address", ito.macAddress)
                it_tbl.add_label_line("IP Addresses", ito.ipAddresses)
                it_tbl.add_label_line("Status", ito.status)
                it_tbl.add_label_line("Created", ito.created)
                it_tbl.add_label_line("Updated", ito.updated)
                tbl.add_separator_line()
            for ib in output.infinibandInterfaces:
                ibo = _InfinibandInterfaceOutput(ib)
                ib_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                ib_tbl.set_title("Instance Interface")
                ib_tbl.add_label_line("Id", ibo.id)
                ib_tbl.add_label_line("Instance Id", ibo.instanceId)
                ib_tbl.add_label_line("Site Id", ibo.siteId)
                ib_tbl.add_label_line("Fabric Id", ibo.fabricId)
                ib_tbl.add_label_line("Partition Id", ibo.partitionId)
                ib_tbl.add_label_line("Device Instance", ibo.deviceInstance)
                ib_tbl.add_label_line("Physical", ibo.isPhysical)
                ib_tbl.add_label_line("GUID", ibo.guid)
                ib_tbl.add_label_line("Status", ibo.status)
                ib_tbl.add_label_line("Created", ibo.created)
                ib_tbl.add_label_line("Updated", ibo.updated)
                tbl.add_separator_line()
            for sg in output.sshkeygroups:
                sgo = _SSHKeyGroupOutput(sg)
                sg_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                sg_tbl.set_title("Ssh Key Group")
                sg_tbl.add_label_line("Id", sgo.id)
                sg_tbl.add_label_line("Name", sgo.name)
                sg_tbl.add_label_line("Description", sgo.description)
                sg_tbl.add_label_line("Version", sgo.version)
                sg_tbl.add_label_line("Status", sgo.status)
                sg_tbl.add_label_line("Created", sgo.created)
                sg_tbl.add_label_line("Updated", sgo.updated)
                tbl.add_separator_line()
            if output.labels:
                lb_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                for key, value in output.labels.items():
                    lb_tbl.add_label_line(key, value)
                tbl.add_separator_line()
            if status_history:
                for sh in output.statusHistory:
                    sho = _StatusHistoryOutput(sh)
                    st_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                    st_tbl.add_label_line("status", sho.status)
                    st_tbl.add_label_line("message", sho.message)
                    st_tbl.add_label_line("created", sho.created)
                    st_tbl.add_label_line("updated", sho.updated)
                    tbl.add_separator_line()
            tbl.print()

    def print_list_interface(self, it_list):  # noqa: D102

        if self.format_type == "json":
            output = it_list
        else:
            output = []
            columns = [
                ("id", "Id"),
                ("instanceId", "Instance Id"),
                ("subnetId", "Subnet Id"),
                ("isPhysical", "Physical"),
                ("virtualFunctionId", "Virtual Id"),
                ("macAddress", "Mac Address"),
                ("status", "Status"),
                ("updated", "Updated"),
            ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for it in it_list:
                out = _InterfaceOutput(it)
                output.append([getattr(out, col, "") for col in cols])
        self.print_data(output, True)


class _InstanceOutput:  # noqa: D101
    def __init__(self, instance):
        self.instance = instance

    @property
    def id(self):
        return self.instance.get("id", "")

    @property
    def name(self):
        return self.instance.get("name", "")

    @property
    def description(self):
        return self.instance.get("description", "")

    @property
    def allocationId(self):
        return self.instance.get("allocationId", "")

    @property
    def tenantId(self):
        return self.instance.get("tenantId", "")

    @property
    def infrastructureProviderId(self):
        return self.instance.get("infrastructureProviderId", "")

    @property
    def siteId(self):
        return self.instance.get("siteId", "")

    @property
    def instanceTypeId(self):
        return self.instance.get("instanceTypeId", "")

    @property
    def vpcId(self):
        return self.instance.get("vpcId", "")

    @property
    def machineId(self):
        return self.instance.get("machineId", "")

    @property
    def operatingSystemId(self):
        return self.instance.get("operatingSystemId", "")

    @property
    def ipxeScript(self):
        return (self.instance.get("ipxeScript", "") or "").encode("unicode_escape").decode("utf-8")

    @property
    def alwaysBootWithCustomIpxe(self):
        return self.instance.get("alwaysBootWithCustomIpxe", "")

    @property
    def userdata(self):
        return (self.instance.get("userdata", "") or "").encode("unicode_escape").decode("utf-8")

    @property
    def serialConsoleUrl(self):
        return self.instance.get("serialConsoleUrl", "")

    @property
    def interfaces(self):
        return self.instance.get("interfaces", [])

    @property
    def infinibandInterfaces(self):
        return self.instance.get("infinibandInterfaces", [])

    @property
    def status(self):
        return self.instance.get("status", "")

    @property
    def statusHistory(self):
        return self.instance.get("statusHistory", [])

    @property
    def created(self):
        return self.instance.get("created", "")

    @property
    def updated(self):
        return self.instance.get("updated", "")

    @property
    def allocationName(self):
        return self.instance.get("allocation", {}).get("name", "")

    @property
    def tenantName(self):
        return self.instance.get("tenant", {}).get("orgDisplayName", "")

    @property
    def infrastructureProviderName(self):
        return self.instance.get("infrastructureProvider", {}).get("orgDisplayName", "")

    @property
    def siteName(self):
        return self.instance.get("site", {}).get("name", "")

    @property
    def instanceTypeName(self):
        return self.instance.get("instanceType", {}).get("name", "")

    @property
    def vpcName(self):
        return self.instance.get("vpc", {}).get("name", "")

    @property
    def machineName(self):
        return self.instance.get("machine", {}).get("productName", "")

    @property
    def operatingSystemName(self):
        return self.instance.get("operatingSystem", {}).get("name", "")

    @property
    def sshkeygroups(self):
        return self.instance.get("sshkeygroups", [])

    @property
    def labels(self):
        return self.instance.get("labels", {})

    @property
    def phoneHomeEnabled(self):
        return self.instance.get("phoneHomeEnabled", "")

    @property
    def networkSecurityGroupId(self):
        return self.instance.get("networkSecurityGroupId", "")

    @property
    def networkSecurityGroupPropagationStatus(self):
        details_object = self.instance.get("networkSecurityGroupPropagationDetails") or {}
        return details_object.get("status", "")

    @property
    def networkSecurityGroupInherited(self):
        return self.instance.get("networkSecurityGroupInherited", "")


class _InterfaceOutput:
    def __init__(self, interface):
        self.interface = interface

    @property
    def id(self):
        return self.interface.get("id", "")

    @property
    def instanceId(self):
        return self.interface.get("instanceId", "")

    @property
    def subnetId(self):
        return self.interface.get("subnetId", "")

    @property
    def isPhysical(self):
        return self.interface.get("isPhysical", "")

    @property
    def virtualFunctionId(self):
        return self.interface.get("virtualFunctionId", "")

    @property
    def macAddress(self):
        return self.interface.get("macAddress", "")

    @property
    def ipAddresses(self):
        return " ".join(self.interface.get("ipAddresses", []) or [])

    @property
    def status(self):
        return self.interface.get("status", "")

    @property
    def created(self):
        return self.interface.get("created", "")

    @property
    def updated(self):
        return self.interface.get("updated", "")


class _InfinibandInterfaceOutput:
    def __init__(self, interface):
        self.interface = interface

    @property
    def id(self):
        return self.interface.get("id", "")

    @property
    def instanceId(self):
        return self.interface.get("instanceId", "")

    @property
    def siteId(self):
        return self.interface.get("siteId", "")

    @property
    def fabricId(self):
        return self.interface.get("fabricId", "")

    @property
    def partitionId(self):
        return self.interface.get("partitionId", "")

    @property
    def deviceInstance(self):
        return self.interface.get("deviceInstance", "")

    @property
    def isPhysical(self):
        return self.interface.get("isPhysical", "")

    @property
    def virtualFunctionId(self):
        return self.interface.get("virtualFunctionId", "")

    @property
    def guid(self):
        return self.interface.get("guid", "")

    @property
    def status(self):
        return self.interface.get("status", "")

    @property
    def created(self):
        return self.interface.get("created", "")

    @property
    def updated(self):
        return self.interface.get("updated", "")


class _SSHKeyGroupOutput:
    def __init__(self, ssh_key_group):
        self.ssh_key_group = ssh_key_group

    @property
    def id(self):
        return self.ssh_key_group.get("id", "")

    @property
    def name(self):
        return self.ssh_key_group.get("name", "")

    @property
    def description(self):
        return self.ssh_key_group.get("description", "")

    @property
    def version(self):
        return self.ssh_key_group.get("version", "")

    @property
    def status(self):
        return self.ssh_key_group.get("status", "")

    @property
    def created(self):
        return self.ssh_key_group.get("created", "")

    @property
    def updated(self):
        return self.ssh_key_group.get("updated", "")


class _StatusHistoryOutput:
    def __init__(self, status_out):
        self.status_out = status_out

    @property
    def status(self):
        return self.status_out.get("status", "")

    @property
    def message(self):
        return self.status_out.get("message", "")

    @property
    def created(self):
        return self.status_out.get("created", "")

    @property
    def updated(self):
        return self.status_out.get("updated", "")
