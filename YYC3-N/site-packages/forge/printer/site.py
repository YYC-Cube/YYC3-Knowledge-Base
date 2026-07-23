# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class SitePrinter(NVPrettyPrint):
    """Forge Site Printer."""

    def print_list(self, site_list, columns=None):  # noqa: D102

        if self.format_type == "json":
            output = site_list
        else:
            output = []
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("name", "Name"),
                    ("serialConsoleHostname", "Serial Console Hostname"),
                    ("siteControllerVersion", "Site Controller Version"),
                    ("siteAgentVersion", "Site Agent Version"),
                    ("isSerialConsoleEnabled", "Serial Console Enabled"),
                    ("status", "Status"),
                    ("created", "Created"),
                    ("updated", "Updated"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for site in site_list:
                out = SiteOutput(site)
                output.append([getattr(out, col, "") for col in cols])
        self.print_data(output, True)

    def print_info(self, site, status_history=False):  # noqa: D102

        if self.format_type == "json":
            self.print_data(site)
        else:
            output = SiteOutput(site)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Site Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Name", output.name)
            tbl.add_label_line("Description", output.description)
            tbl.add_label_line("Org", output.org)
            tbl.add_label_line("Provider Id", output.infrastructureProviderId)
            tbl.add_label_line("Serial Console Enabled", output.isSerialConsoleEnabled)
            tbl.add_label_line("Serial Console Hostname", output.serialConsoleHostname)
            tbl.add_label_line("Controller Version", output.siteControllerVersion)
            tbl.add_label_line("Serial Console Idle Timeout", output.serialConsoleIdleTimeout)
            tbl.add_label_line("Serial Console Max Session Length", output.serialConsoleMaxSessionLength)
            tbl.add_label_line("Serial Console SSH Keys Enabled", output.isSerialConsoleSSHKeysEnabled)
            tbl.add_label_line("Agent Version", output.siteAgentVersion)
            tbl.add_label_line("Registration Token", output.registrationToken)
            tbl.add_label_line("Registration Token Expiration", output.registrationTokenExpiration)
            tbl.add_label_line("Is Online", output.isOnline)
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


class SiteOutput:  # noqa: D101
    def __init__(self, site):
        self.site = site

    @property
    def id(self):  # noqa: D102
        return self.site.get("id", "")

    @property
    def name(self):  # noqa: D102
        return self.site.get("name", "")

    @property
    def description(self):  # noqa: D102
        return self.site.get("description", "")

    @property
    def org(self):  # noqa: D102
        return self.site.get("org", "")

    @property
    def infrastructureProviderId(self):  # noqa: D102
        return self.site.get("infrastructureProviderId", "")

    @property
    def isSerialConsoleEnabled(self):  # noqa: D102
        return self.site.get("isSerialConsoleEnabled", "")

    @property
    def isOnline(self):  # noqa: D102
        return self.site.get("isOnline", "")

    @property
    def serialConsoleHostname(self):  # noqa: D102
        return self.site.get("serialConsoleHostname", "")

    @property
    def serialConsoleIdleTimeout(self):  # noqa: D102
        return self.site.get("serialConsoleIdleTimeout", "")

    @property
    def serialConsoleMaxSessionLength(self):  # noqa: D102
        return self.site.get("serialConsoleMaxSessionLength", "")

    @property
    def isSerialConsoleSSHKeysEnabled(self):  # noqa: D102
        return self.site.get("isSerialConsoleSSHKeysEnabled", "")

    @property
    def siteControllerVersion(self):  # noqa: D102
        return self.site.get("siteControllerVersion", "")

    @property
    def siteAgentVersion(self):  # noqa: D102
        return self.site.get("siteAgentVersion", "")

    @property
    def registrationToken(self):  # noqa: D102
        return self.site.get("registrationToken", "")

    @property
    def registrationTokenExpiration(self):  # noqa: D102
        return self.site.get("registrationTokenExpiration", "")

    @property
    def status(self):  # noqa: D102
        return self.site.get("status", "")

    @property
    def created(self):  # noqa: D102
        return self.site.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.site.get("updated", "")

    @property
    def statusHistory(self):  # noqa: D102
        return self.site.get("statusHistory", "")

    @property
    def infrastructureProviderName(self):  # noqa: D102
        return self.site.get("infrastructureProvider", {}).get("orgDisplayName", "")


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
