# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class MachinePrinter(NVPrettyPrint):
    """Forge Machine Printer."""

    def print_list(self, machine_list, columns=None):  # noqa: D102

        if self.format_type == "json":
            output = machine_list
        else:
            output = []
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("infrastructureProviderName", "Infrastructure Provider Name"),
                    ("siteName", "Site Name"),
                    ("controllerMachineType", "Controller Machine Type"),
                    ("instanceTypeName", "Instance Type Name"),
                    ("status", "Status"),
                    ("updated", "Updated"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for machine in machine_list:
                out = MachineOutput(machine)
                output.append([getattr(out, col, None) for col in cols])
        self.print_data(output, True)

    def print_info(self, machine, status_history=None):  # noqa: D102

        if self.format_type == "json":
            self.print_data(machine)
        else:
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            output = MachineOutput(machine)
            tbl.add_separator_line()
            tbl.set_title("Machine Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Infrastructure Provider Id", output.infrastructureProviderId)
            tbl.add_label_line("Infrastructure Provider Name", output.infrastructureProviderName)
            tbl.add_label_line("Site Id", output.siteId)
            tbl.add_label_line("Site Name", output.siteName)
            tbl.add_label_line("Controller Machine Id", output.controllerMachineId)
            tbl.add_label_line("Controller Machine Type", output.controllerMachineType)
            tbl.add_label_line("Instance Type Id", output.instanceTypeId)
            tbl.add_label_line("Instance Type Name", output.instanceTypeName)
            tbl.add_label_line("Status", output.status)
            # NOTE: Status history SHOULD always have at least one item, but let's check just to be safe.
            if output.statusHistory:
                latest_status_history_output = StatusHistoryOutput(output.statusHistory[0])
                tbl.add_label_line("Status Message", latest_status_history_output.message)
            tbl.add_label_line("Maintenance Message", output.maintenanceMessage)
            tbl.add_label_line("Created", output.created)
            tbl.add_label_line("Updated", output.updated)
            tbl.add_separator_line()
            for mc in output.machineCapabilities:
                mco = MachineCapabilityOutput(mc)
                mc_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                mc_tbl.set_title("Machine Capability")
                mc_tbl.add_label_line("Type", mco.type)
                mc_tbl.add_label_line("Name", mco.name)
                if mco.frequency:
                    mc_tbl.add_label_line("Frequency", mco.frequency)
                if mco.cores:
                    mc_tbl.add_label_line("Cores", mco.cores)
                if mco.threads:
                    mc_tbl.add_label_line("Threads", mco.threads)
                if mco.capacity:
                    mc_tbl.add_label_line("Capacity", mco.capacity)
                if mco.vendor:
                    mc_tbl.add_label_line("Vendor", mco.vendor)
                if mco.count:
                    mc_tbl.add_label_line("Count", mco.count)
                tbl.add_separator_line()
            for mi in output.machineInterfaces:
                mio = MachineInterfaceOutput(mi)
                mi_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                mi_tbl.set_title("Machine Interface")
                mi_tbl.add_label_line("Id", mio.id)
                mi_tbl.add_label_line("Machine Id", mio.machineId)
                mi_tbl.add_label_line("Controller Interface Id", mio.controllerInterfaceId)
                mi_tbl.add_label_line("Controller Segment Id", mio.controllerSegmentId)
                mi_tbl.add_label_line("Subnet Id", mio.subnetId)
                mi_tbl.add_label_line("Hostname", mio.hostname)
                mi_tbl.add_label_line("Primary", mio.isPrimary)
                mi_tbl.add_label_line("Mac Address", mio.macAddress)
                mi_tbl.add_label_line("IP Address", mio.ipAddresses)
                mi_tbl.add_label_line("Created", mio.created)
                mi_tbl.add_label_line("Updated", mio.updated)
                tbl.add_separator_line()
            if status_history:
                for sh in output.statusHistory:
                    sho = StatusHistoryOutput(sh)
                    st_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                    st_tbl.set_title("Status History")
                    st_tbl.add_label_line("Status", sho.status)
                    st_tbl.add_label_line("Message", sho.message)
                    st_tbl.add_label_line("Created", sho.created)
                    st_tbl.add_label_line("Updated", sho.updated)
                    tbl.add_separator_line()
            tbl.print()


class MachineOutput:  # noqa: D101
    def __init__(self, machine):
        self.machine = machine

    @property
    def id(self):  # noqa: D102
        return self.machine.get("id", "")

    @property
    def infrastructureProviderId(self):  # noqa: D102
        return self.machine.get("infrastructureProviderId", "")

    @property
    def infrastructureProviderName(self):  # noqa: D102
        return self.machine.get("infrastructureProvider", {}).get("orgDisplayName", "")

    @property
    def siteId(self):  # noqa: D102
        return self.machine.get("siteId", "")

    @property
    def siteName(self):  # noqa: D102
        return self.machine.get("site", {}).get("name", "")

    @property
    def controllerMachineId(self):  # noqa: D102
        return self.machine.get("controllerMachineId", "")

    @property
    def controllerMachineType(self):  # noqa: D102
        return self.machine.get("controllerMachineType", "")

    @property
    def instanceTypeId(self):  # noqa: D102
        return self.machine.get("instanceTypeId", "") or ""

    @property
    def instanceTypeName(self):  # noqa: D102
        return self.machine.get("instanceType", {}).get("name", "")

    @property
    def machineCapabilities(self):  # noqa: D102
        return self.machine.get("machineCapabilities", "")

    @property
    def machineInterfaces(self):  # noqa: D102
        return self.machine.get("machineInterfaces", "")

    @property
    def status(self):  # noqa: D102
        return self.machine.get("status", "")

    @property
    def maintenanceMessage(self):  # noqa: D102
        return self.machine.get("maintenanceMessage", "")

    @property
    def statusHistory(self):  # noqa: D102
        return self.machine.get("statusHistory", "")

    @property
    def created(self):  # noqa: D102
        return self.machine.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.machine.get("updated", "")


class MachineCapabilityOutput:  # noqa: D101
    def __init__(self, machine_capability):
        self.machine_capability = machine_capability

    @property
    def type(self):  # noqa: D102
        return self.machine_capability.get("type", "")

    @property
    def name(self):  # noqa: D102
        return self.machine_capability.get("name", "")

    @property
    def frequency(self):  # noqa: D102
        return self.machine_capability.get("frequency", "")

    @property
    def cores(self):  # noqa: D102
        return self.machine_capability.get("cores", "")

    @property
    def threads(self):  # noqa: D102
        return self.machine_capability.get("threads", "")

    @property
    def capacity(self):  # noqa: D102
        return self.machine_capability.get("capacity", "")

    @property
    def vendor(self):  # noqa: D102
        return self.machine_capability.get("vendor", "")

    @property
    def count(self):  # noqa: D102
        return self.machine_capability.get("count", "")


class MachineInterfaceOutput:  # noqa: D101
    def __init__(self, machine_interface):
        self.machine_interface = machine_interface

    @property
    def id(self):  # noqa: D102
        return self.machine_interface.get("id", "")

    @property
    def machineId(self):  # noqa: D102
        return self.machine_interface.get("machineId", "")

    @property
    def controllerInterfaceId(self):  # noqa: D102
        return self.machine_interface.get("controllerInterfaceId", "")

    @property
    def controllerSegmentId(self):  # noqa: D102
        return self.machine_interface.get("controllerSegmentId", "")

    @property
    def subnetId(self):  # noqa: D102
        return self.machine_interface.get("subnetId", "")

    @property
    def hostname(self):  # noqa: D102
        return self.machine_interface.get("hostname", "")

    @property
    def isPrimary(self):  # noqa: D102
        return self.machine_interface.get("isPrimary", "")

    @property
    def macAddress(self):  # noqa: D102
        return self.machine_interface.get("macAddress", "")

    @property
    def ipAddresses(self):  # noqa: D102
        return self.machine_interface.get("ipAddresses", "")

    @property
    def created(self):  # noqa: D102
        return self.machine_interface.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.machine_interface.get("updated", "")


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
