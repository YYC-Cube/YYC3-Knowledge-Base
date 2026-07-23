# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class TenantAccountPrinter(NVPrettyPrint):
    """Forge Tenant Printer."""

    def print_list(self, tenant_account_list, columns=None):  # noqa: D102

        if self.format_type == "json":
            output = tenant_account_list
        else:
            output = []
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("tenantOrgName", "Tenant Org Name"),
                    ("tenantOrg", "Tenant Org"),
                    ("tenantContactName", "Tenant Contact Name"),
                    ("tenantContactEmail", "Tenant Contact Email"),
                    ("status", "Status"),
                    ("updated", "Updated"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for tenant_account in tenant_account_list:
                out = TenantAccountOutput(tenant_account)
                output.append([getattr(out, col, "") for col in cols])
        self.print_data(output, True)

    def print_info(self, tenant_account, status_history=False):  # noqa: D102

        if self.format_type == "json":
            self.print_data(tenant_account)
        else:
            output = TenantAccountOutput(tenant_account)
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Tenant Account Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Infrastructure Provider Id", output.infrastructureProviderId)
            tbl.add_label_line("Infrastructure Provider Name", output.infrastructureProviderName)
            tbl.add_label_line("Infrastructure Provider Org", output.infrastructureProviderOrg)
            tbl.add_label_line("Tenant Id", output.tenantId)
            tbl.add_label_line("Tenant Name", output.tenantName)
            tbl.add_label_line("Tenant Org", output.tenantOrg)
            tbl.add_label_line("Allocation Count", output.allocationCount)
            tbl.add_label_line("Status", output.status)
            tbl.add_label_line("Created", output.created)
            tbl.add_label_line("Updated", output.updated)
            tbl.add_separator_line()
            tco = TenantContactOutput(output.tenantContact or {})
            tc_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
            tc_tbl.set_title("Tenant Contact Information")
            tc_tbl.add_label_line("Id", tco.id)
            tc_tbl.add_label_line("Email", tco.email)
            tc_tbl.add_label_line("First Name", tco.firstName)
            tc_tbl.add_label_line("Last Name", tco.lastName)
            tc_tbl.add_label_line("Created", tco.created)
            tc_tbl.add_label_line("Updated", tco.updated)
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


class TenantAccountOutput:  # noqa: D101
    def __init__(self, tenant_account):
        self.tenant_account = tenant_account

    @property
    def id(self):  # noqa: D102
        return self.tenant_account.get("id", "")

    @property
    def infrastructureProviderId(self):  # noqa: D102
        return self.tenant_account.get("infrastructureProviderId", "")

    @property
    def infrastructureProviderOrg(self):  # noqa: D102
        return self.tenant_account.get("infrastructureProviderOrg", "")

    @property
    def infrastructureProviderName(self):  # noqa: D102
        return self.tenant_account.get("infrastructureProvider", {}).get("orgDisplayName", "")

    @property
    def tenantId(self):  # noqa: D102
        return self.tenant_account.get("tenantId", "")

    @property
    def tenantOrg(self):  # noqa: D102
        return self.tenant_account.get("tenantOrg", "")

    @property
    def tenantName(self):  # noqa: D102
        return self.tenant_account.get("tenant", {}).get("orgDisplayName", "")

    @property
    def tenantContact(self):  # noqa: D102
        return self.tenant_account.get("tenantContact", {})

    @property
    def tenantContactId(self):  # noqa: D102
        return self.tenant_account.get("tenantContact", {}).get("id", "")

    @property
    def tenantContactName(self):  # noqa: D102
        return self.tenant_account.get("tenantContact", {}).get("firstName", "")

    @property
    def tenantContactEmail(self):  # noqa: D102
        return self.tenant_account.get("tenantContact", {}).get("email", "")

    @property
    def allocationCount(self):  # noqa: D102
        return self.tenant_account.get("allocationCount", "")

    @property
    def status(self):  # noqa: D102
        return self.tenant_account.get("status", "")

    @property
    def statusHistory(self):  # noqa: D102
        return self.tenant_account.get("statusHistory", [])

    @property
    def created(self):  # noqa: D102
        return self.tenant_account.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.tenant_account.get("updated", "")


class TenantContactOutput:  # noqa: D101
    def __init__(self, tenant_contact):
        self.tenant_contact = tenant_contact

    @property
    def id(self):  # noqa: D102
        return self.tenant_contact.get("id", "")

    @property
    def email(self):  # noqa: D102
        return self.tenant_contact.get("email", "")

    @property
    def firstName(self):  # noqa: D102
        return self.tenant_contact.get("firstName", "")

    @property
    def lastName(self):  # noqa: D102
        return self.tenant_contact.get("lastName", "")

    @property
    def created(self):  # noqa: D102
        return self.tenant_contact.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.tenant_contact.get("updated", "")


class StatusHistoryOutput:  # noqa: D101
    def __init__(self, tenant_status):
        self.tenant_status = tenant_status

    @property
    def status(self):  # noqa: D102
        return self.tenant_status.get("status", "")

    @property
    def message(self):  # noqa: D102
        return self.tenant_status.get("message", "")

    @property
    def created(self):  # noqa: D102
        return self.tenant_status.get("created", "")

    @property
    def updated(self):  # noqa: D102
        return self.tenant_status.get("updated", "")
