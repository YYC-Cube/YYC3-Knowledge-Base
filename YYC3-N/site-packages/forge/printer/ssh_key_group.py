# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class SSHKeyGroupPrinter(NVPrettyPrint):
    """Forge Ssh Key Printer."""

    def print_list(self, ssh_key_list, columns=None):  # noqa: D102

        if self.format_type == "json":
            output = ssh_key_list
        else:
            output = []
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("name", "Name"),
                    ("org", "Org"),
                    ("tenantName", "Tenant Name"),
                    ("version", "Version"),
                    ("status", "Status"),
                    ("created", "Created"),
                    ("updated", "Updated"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for ssh_key_group in ssh_key_list:
                out = SSHKeyGroupOutput(ssh_key_group)
                output.append([getattr(out, col, None) for col in cols])
        self.print_data(output, True)

    def print_info(self, ssh_key_group, status_history=False):  # noqa: D102

        if self.format_type == "json":
            self.print_data(ssh_key_group)
        else:
            output = SSHKeyGroupOutput(ssh_key_group)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Ssh Key Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Name", output.name)
            tbl.add_label_line("Description", output.description)
            tbl.add_label_line("Org", output.org)
            tbl.add_label_line("Tenant", output.tenantName)
            tbl.add_label_line("Version", output.version)
            tbl.add_label_line("Status", output.status)
            tbl.add_label_line("Created", output.created)
            tbl.add_label_line("Updated", output.updated)
            tbl.add_separator_line()
            for sa in output.siteAssociations:
                sao = SiteAssociationOutput(sa)
                st_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                st_tbl.add_label_line("Id", sao.id)
                st_tbl.add_label_line("name", sao.name)
                st_tbl.add_label_line("Description", sao.description)
                st_tbl.add_label_line("Org", sao.org)
                st_tbl.add_label_line("Infrastructure Provider Id", sao.infrastructureProviderId)
                st_tbl.add_label_line("SSH Hostname", sao.sshHostname)
                st_tbl.add_label_line("Site Controller Version", sao.siteControllerVersion)
                st_tbl.add_label_line("Site Agent Version", sao.siteAgentVersion)
                st_tbl.add_label_line("Registration Token", sao.registrationToken)
                st_tbl.add_label_line("Registration Token Expiration", sao.registrationTokenExpiration)
                st_tbl.add_label_line("Status", sao.status)
                st_tbl.add_label_line("Version", sao.version)
                st_tbl.add_label_line("Created", sao.created)
                st_tbl.add_label_line("Updated", sao.updated)
                tbl.add_separator_line()
            for sk in output.sshKeys:
                sko = SshKeyOutput(sk)
                st_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                st_tbl.add_label_line("Id", sko.id)
                st_tbl.add_label_line("Name", sko.name)
                st_tbl.add_label_line("Org", sko.org)
                st_tbl.add_label_line("Tenant Id", sko.tenantId)
                st_tbl.add_label_line("Fingerprint", sko.fingerprint)
                st_tbl.add_label_line("Expires", sko.expires)
                st_tbl.add_label_line("Created", sko.created)
                st_tbl.add_label_line("Updated", sko.updated)
                tbl.add_separator_line()
            if status_history:
                for sh in output.statusHistory:
                    sh_out = StatusHistoryOutput(sh)
                    st_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                    st_tbl.add_label_line("Status", sh_out.status)
                    st_tbl.add_label_line("Message", sh_out.message)
                    st_tbl.add_label_line("Created", sh_out.created)
                    st_tbl.add_label_line("Updated", sh_out.updated)
                    tbl.add_separator_line()
            tbl.print()


class SSHKeyGroupOutput:  # noqa: D101
    def __init__(self, ssh_key_group):
        self.ssh_key_group = ssh_key_group

    @property
    def id(self):  # noqa: D102
        return self.ssh_key_group.get("id", "")

    @property
    def name(self):  # noqa: D102
        return self.ssh_key_group.get("name", "")

    @property
    def description(self):  # noqa: D102
        return self.ssh_key_group.get("description", "")

    @property
    def org(self):  # noqa: D102
        return self.ssh_key_group.get("org", "")

    @property
    def tenantId(self):  # noqa: D102
        return self.ssh_key_group.get("tenantId", "")

    @property
    def siteAssociations(self):  # noqa: D102
        return self.ssh_key_group.get("siteAssociations", [])

    @property
    def sshKeys(self):  # noqa: D102
        return self.ssh_key_group.get("sshKeys", [])

    @property
    def status(self):  # noqa: D102
        return self.ssh_key_group.get("status", "")

    @property
    def statusHistory(self):  # noqa: D102
        return self.ssh_key_group.get("statusHistory", [])

    @property
    def created(self):  # noqa: D102
        return self.ssh_key_group.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.ssh_key_group.get("updated", "")

    @property
    def tenantName(self):  # noqa: D102
        return self.ssh_key_group.get("tenant", {}).get("orgDisplayName", "")

    @property
    def version(self):  # noqa: D102
        return self.ssh_key_group.get("version", "")


class SiteAssociationOutput:  # noqa: D101
    def __init__(self, entity_out):
        self.entity_out = entity_out

    @property
    def id(self):  # noqa: D102
        return self.entity_out.get("site", {}).get("id", "")

    @property
    def name(self):  # noqa: D102
        return self.entity_out.get("site", {}).get("name", "")

    @property
    def description(self):  # noqa: D102
        return self.entity_out.get("site", {}).get("description", "")

    @property
    def org(self):  # noqa: D102
        return self.entity_out.get("site", {}).get("org", "")

    @property
    def infrastructureProviderId(self):  # noqa: D102
        return self.entity_out.get("site", {}).get("infrastructureProviderId", "")

    @property
    def sshHostname(self):  # noqa: D102
        return self.entity_out.get("site", {}).get("sshHostname", "")

    @property
    def siteControllerVersion(self):  # noqa: D102
        return self.entity_out.get("site", {}).get("siteControllerVersion", "")

    @property
    def siteAgentVersion(self):  # noqa: D102
        return self.entity_out.get("site", {}).get("siteAgentVersion", "")

    @property
    def registrationToken(self):  # noqa: D102
        return self.entity_out.get("site", {}).get("registrationToken", "")

    @property
    def registrationTokenExpiration(self):  # noqa: D102
        return self.entity_out.get("site", {}).get("registrationTokenExpiration", "")

    @property
    def status(self):  # noqa: D102
        return self.entity_out.get("status", "")

    @property
    def version(self):  # noqa: D102
        return self.entity_out.get("version", "")

    @property
    def created(self):  # noqa: D102
        return self.entity_out.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.entity_out.get("updated", "")


class SshKeyOutput:  # noqa: D101
    def __init__(self, entity_out):
        self.entity_out = entity_out

    @property
    def id(self):  # noqa: D102
        return self.entity_out.get("id", "")

    @property
    def name(self):  # noqa: D102
        return self.entity_out.get("name", "")

    @property
    def org(self):  # noqa: D102
        return self.entity_out.get("org", "")

    @property
    def tenantId(self):  # noqa: D102
        return self.entity_out.get("tenantId", "")

    @property
    def fingerprint(self):  # noqa: D102
        return self.entity_out.get("fingerprint", "")

    @property
    def expires(self):  # noqa: D102
        return self.entity_out.get("expires", "")

    @property
    def created(self):  # noqa: D102
        return self.entity_out.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.entity_out.get("updated", "")


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
