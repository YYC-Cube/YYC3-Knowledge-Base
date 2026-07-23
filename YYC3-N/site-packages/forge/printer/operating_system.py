# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class OperatingSystemPrinter(NVPrettyPrint):
    """Forge OperatingSystem Printer."""

    def print_list(self, operating_system_list, columns=None):  # noqa: D102

        if self.format_type == "json":
            output = operating_system_list
        else:
            output = []
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("name", "Name"),
                    ("tenantName", "Tenant Name"),
                    ("isCloudInit", "Cloud Init"),
                    ("allowOverride", "Allow Override"),
                    ("status", "Status"),
                    ("updated", "Updated"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for operating_system in operating_system_list:
                out = OperatingSystemOutput(operating_system)
                output.append([getattr(out, col, None) for col in cols])
        self.print_data(output, True)

    def print_info(self, operating_system, status_history=False):  # noqa: D102

        if self.format_type == "json":
            self.print_data(operating_system)
        else:
            output = OperatingSystemOutput(operating_system)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("OperatingSystem Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Name", output.name)
            tbl.add_label_line("Description", output.description)
            if not output.is_active:
                # Only show these if the OS is not active.
                tbl.add_label_line("Is Active", output.is_active)
                tbl.add_label_line("Deactivation Note", output.deactivation_note)
            tbl.add_label_line("Infrastructure Provider Id", output.infrastructureProviderId)
            tbl.add_label_line("Infrastructure Provider Name", output.infrastructureProviderName)
            tbl.add_label_line("Tenant Id", output.tenantId)
            tbl.add_label_line("Tenant Name", output.tenantName)
            tbl.add_label_line("Type", output.type)
            tbl.add_label_line("Image URL", output.imageUrl)
            tbl.add_label_line("Image SHA", output.imageSha)
            tbl.add_label_line("Image Authentication", output.imageAuthType)
            tbl.add_label_line("Image Authentication Token", output.imageAuthToken)
            tbl.add_label_line("Image Disk", output.imageDisk)
            tbl.add_label_line("Root File System ID", output.rootFsId)
            tbl.add_label_line("Root File System Label", output.rootFsLabel)
            tbl.add_label_line("Ipxe Script", output.ipxeScript)
            tbl.add_label_line("User Data", output.userData)
            tbl.add_label_line("Cloud Init", output.isCloudInit)
            tbl.add_label_line("Allow Override", output.allowOverride)
            tbl.add_label_line("Phone Home Enabled", output.phoneHomeEnabled)
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


class OperatingSystemOutput:  # noqa: D101
    def __init__(self, operating_system):
        self.operating_system = operating_system

    @property
    def id(self):  # noqa: D102
        return self.operating_system.get("id", "")

    @property
    def name(self):  # noqa: D102
        return self.operating_system.get("name", "")

    @property
    def description(self):  # noqa: D102
        return self.operating_system.get("description", "")

    @property
    def infrastructureProviderId(self):  # noqa: D102
        return self.operating_system.get("infrastructureProviderId", "")

    @property
    def tenantId(self):  # noqa: D102
        return self.operating_system.get("tenantId", "")

    @property
    def type(self):  # noqa: D102
        return self.operating_system.get("type", "")

    @property
    def imageUrl(self):  # noqa: D102
        return self.operating_system.get("imageUrl", "")

    @property
    def imageSha(self):  # noqa: D102
        return self.operating_system.get("imageSha", "")

    @property
    def imageAuthType(self):  # noqa: D102
        return self.operating_system.get("imageAuthType", "")

    @property
    def imageAuthToken(self):  # noqa: D102
        return self.operating_system.get("imageAuthToken", "")

    @property
    def imageDisk(self):  # noqa: D102
        return self.operating_system.get("imageDisk", "")

    @property
    def rootFsId(self):  # noqa: D102
        return self.operating_system.get("rootFsId", "")

    @property
    def rootFsLabel(self):  # noqa: D102
        return self.operating_system.get("rootFsLabel", "")

    @property
    def ipxeScript(self):  # noqa: D102
        return self.operating_system.get("ipxeScript", "")

    @property
    def userData(self):  # noqa: D102
        return self.operating_system.get("userData", "")

    @property
    def isCloudInit(self):  # noqa: D102
        return self.operating_system.get("isCloudInit", "")

    @property
    def allowOverride(self):  # noqa: D102
        return self.operating_system.get("allowOverride", "")

    @property
    def status(self):  # noqa: D102
        return self.operating_system.get("status", "")

    @property
    def statusHistory(self):  # noqa: D102
        return self.operating_system.get("statusHistory", "")

    @property
    def phoneHomeEnabled(self):
        """Return the `phoneHomeEnabled` property or an empty string."""
        return self.operating_system.get("phoneHomeEnabled", "")

    @property
    def created(self):  # noqa: D102
        return self.operating_system.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.operating_system.get("updated", "")

    @property
    def tenantName(self):  # noqa: D102
        return self.operating_system.get("tenant", {}).get("orgDisplayName", "")

    @property
    def infrastructureProviderName(self):  # noqa: D102
        return self.operating_system.get("infrastructureProvider", {}).get("orgDisplayName", "")

    @property
    def is_active(self):  # noqa: D102
        value = self.operating_system.get("isActive", None)
        # If it's not specified, assume that it's active.
        if value is None:
            value = True
        return value

    @property
    def deactivation_note(self):  # noqa: D102
        return self.operating_system.get("deactivationNote") or ""


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
