#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. ALL RIGHTS RESERVED.
#
# This software product is a proprietary product of Nvidia Corporation and its affiliates
# (the "Company") and all right, title, and interest in and to the software
# product, including all associated intellectual property rights, are and
# shall remain exclusively with the Company.
#
# This software product is governed by the End User License Agreement
# provided with the software product.
#

#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from __future__ import division

import collections
import itertools

from ngcbase.printer.nvPrettyPrint import (
    format_date,
    generate_columns_list,
    NVPrettyPrint,
)
from ngcbase.util.file_utils import human_size
from ngcbase.util.utils import convert_EGX_roles
from organization.data.subscription_management_service.LineItem import LineItem


def format_items(target):
    """Custom dict items format to ["key [value]",]."""  # noqa: D401
    return ["{} [{}]".format(k, v) for (k, v) in target]


def join_(target):
    """Custom join with newline, but return "" if not target."""  # noqa: D401
    return "\n".join(target) if target else ""


class OrgTeamUserPrinter(NVPrettyPrint):
    """The printer is responsible for printing ouput for orgs, teams, and users, which share many of the same output
    routines.
    """  # noqa: D205

    def print_teams_list(self, teams, columns=None):  # noqa: D102
        list_of_teams = []
        if self.format_type == "json":
            for team in teams or []:
                list_of_teams.append(team)
        else:
            if not columns:
                columns = [("id", "Id"), ("name", "Name"), ("description", "Description")]
            list_of_teams = generate_columns_list([teams], columns)
        self.print_data(list_of_teams, is_table=True)

    def print_team_details(self, team):  # noqa: D102
        if self.format_type == "json":
            self.print_data(team)
            return
        tbl = self.create_output()
        tbl.set_title("Team Information")
        tbl.add_separator_line()
        tbl.add_label_line("ID", team.id)
        tbl.add_label_line("Name", team.name)
        tbl.add_label_line("Description", team.description)
        tbl.add_label_line("Deleted", str(team.isDeleted))
        tbl.add_separator_line()
        tbl.print()

    def process_user_roles(self, user_roles):  # pylint: disable=no-self-use
        """Processes user roles to convert EGX roles."""  # noqa: D401
        for role in user_roles or []:
            role.orgRoles = {*convert_EGX_roles(role.orgRoles)}
            role.teamRoles = {*convert_EGX_roles(role.teamRoles)}
        return user_roles

    @staticmethod
    def get_org_name(role):
        """Constructs a full organization name from a role object.

        This method formats the organization's name by checking if a display name is available and appending it to the
        standard name in a specific format.

        Parameters:
            role (UserRole): The role object containing organization details.

        Returns:
            str: A formatted string containing the full organization name.
        """  # noqa: D401
        org_name = role.org.name
        org_display_name = role.org.displayName
        full_org_name = org_name
        if org_display_name:
            full_org_name = org_display_name + " (" + org_name + ")"
        return full_org_name

    def get_org_and_team_roles(self, user_roles, include_org, include_teams):  # pylint: disable=no-self-use
        """Extracts and formats organization and team roles from a list of user roles.

        Based on the input flags `include_org` and `include_teams`, this method selectively extracts roles associated
        with organizations or teams and formats them for output.

        Parameters:
            user_roles (list of UserRole): A list of UserRole objects from which to extract roles.
            include_org (bool): Flag to include organization roles in the output.
            include_teams (bool): Flag to include team roles in the output.

        Returns:
            tuple: A tuple containing two dictionaries:
                - The first dictionary maps organization names to their roles.
                - The second dictionary maps team names to their roles.
        """  # noqa: D401
        org_roles = {}
        team_roles = {}
        if not (include_org or include_teams) or user_roles is None:
            return org_roles, team_roles

        for role in user_roles:
            if include_org and role.org:
                org_name = role.org.name
                if org_name in org_roles:
                    org_roles[org_name] = ",".join([org_roles[org_name], *role.orgRoles])
                else:
                    org_roles[org_name] = ",".join(role.orgRoles)
            if include_teams and role.team:
                team_name = role.team.name
                if team_name in team_roles:
                    team_roles[team_name] = ",".join([team_roles[team_name], *role.teamRoles])
                else:
                    team_roles[team_name] = ",".join(role.teamRoles)

        return org_roles, team_roles

    def print_user_details(  # noqa: D102
        self,
        user_details,
        include_org=True,
        include_org_roles=True,
        include_teams=True,
        include_team_roles=True,
        include_creation_date=True,
    ):
        key_type = getattr(user_details, "type", None)

        if not user_details:
            print("User not found in specified org/team.")
            return
        if self.format_type == "json":
            self.print_data(user_details, is_table=True)
            return
        if key_type == "SERVICE_KEY":
            print("Service keys are not associated with users.")
            return

        user_obj = getattr(user_details, "user", None)
        if not user_obj:
            print("User not found in specified org/team.")
            return

        user_roles = self.process_user_roles(user_obj.roles) or []
        org_roles, team_roles = self.get_org_and_team_roles(user_roles, include_org, include_teams)

        self.output_user_details(
            user_details,
            org_roles,
            team_roles,
            include_org,
            include_org_roles,
            include_teams,
            include_team_roles,
            include_creation_date,
        )

    def format_user_data(self, data_dict):  # pylint: disable=no-self-use
        """Format the keys and values of the user data dictionary for output.

        Args:
            data_dict (dict): The original dictionary containing user details.

        Returns:
            dict: A new dictionary with formatted keys and values.
        """
        formatted_dict = {}
        for key, value in data_dict.items():
            # Capitalize the first letter of each key and convert all values to string
            formatted_key = key.capitalize()
            formatted_value = str(value)
            formatted_dict[formatted_key] = formatted_value
        return formatted_dict

    def output_user_details(  # noqa: D102
        self,
        user_details,
        org_roles,
        team_roles,
        include_org,
        include_org_roles,
        include_teams,
        include_team_roles,
        include_creation_date,
    ):
        user = user_details.user
        table_row_dict = collections.OrderedDict()
        table_row_dict["User Id"] = user.id or ""
        table_row_dict["Name"] = user.name
        table_row_dict["Email"] = user.email
        if include_org:
            if include_org_roles:
                org_roles_fmtd = format_items(list(org_roles.items()))
                table_row_dict["Org [Roles]"] = join_(org_roles_fmtd)
            else:
                table_row_dict["Org"] = join_(list(org_roles.keys()))
        if include_teams:
            if include_team_roles:
                team_roles_fmtd = format_items(sorted(team_roles.items()))
                table_row_dict["Teams [Roles]"] = join_(team_roles_fmtd)
            else:
                table_row_dict["Teams"] = join_(sorted(team_roles.keys()))
        if include_creation_date:
            table_row_dict["Created Date"] = format_date(user.createdDate)
        headers = []
        for header in table_row_dict.keys():
            headers.append(self.make_table_cell(header))
        self.print_data([headers, list(table_row_dict.values())], is_table=True)

    def print_users_list(  # noqa: D102
        self,
        joined_users_gen,
        invitation_gen,
        include_org_roles=True,
        include_team_roles=False,
        columns=None,
    ):
        if self.format_type == "json":
            if joined_users_gen and invitation_gen:
                list_of_users_info = itertools.chain(*joined_users_gen, *invitation_gen)
            elif joined_users_gen:
                list_of_users_info = itertools.chain(*joined_users_gen)
            elif invitation_gen:
                list_of_users_info = itertools.chain(*invitation_gen)
        else:
            if joined_users_gen and invitation_gen:
                list_of_users_info = itertools.chain(joined_users_gen, invitation_gen)
            elif joined_users_gen:
                list_of_users_info = joined_users_gen
            elif invitation_gen:
                list_of_users_info = invitation_gen
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("name", "Name"),
                    ("email", "Email"),
                    ("roles", "Roles"),
                    ("created", "Created Date"),
                ]
                joined_user_columns = [
                    ("firstLoginDate", "First Login Date"),
                    ("lastLoginDate", "Last Activity"),
                    ("idpType", "Sign In Method"),
                ]
                invited_user_columns = [("type", "Invitation Type"), ("team", "Team Name")]
                if joined_users_gen:
                    columns.extend(joined_user_columns)
                if invitation_gen:
                    columns.extend(invited_user_columns)
            list_of_users_info = generate_columns_list(
                list_of_users_info,
                columns,
                include_org_roles=include_org_roles,
                include_team_roles=include_team_roles,
            )
        self.print_data(list_of_users_info, is_table=True)

    def print_org_list(self, orgs, columns=None):  # noqa: D102
        list_of_orgs = []
        if self.format_type == "json":
            for org in orgs or []:
                list_of_orgs.append(org)
        else:
            if not columns:
                columns = [("id", "Id"), ("displayName", "Name"), ("description", "Description"), ("type_", "Type")]
            else:
                columns = [("type_", col[1]) if col[0] == "type" else col for col in columns]
            list_of_orgs = generate_columns_list([orgs], columns, org_display_name=True)
        self.print_data(list_of_orgs, is_table=True)

    def print_org_details(self, org):  # noqa: D102
        if self.format_type == "json":
            self.print_data(org)
            return
        tbl = self.create_output()
        tbl.add_separator_line()
        tbl.set_title("Org Information")
        org_display_name = org.displayName
        org_name = org.name
        org_name = org_display_name + " (" + org_name + ")" if org_display_name else org_name
        tbl.add_label_line("Id", org.id)
        tbl.add_label_line("Name", org_name)
        tbl.add_label_line("Description", org.description)
        tbl.add_label_line("Type", org.type)
        tbl.add_separator_line()
        tbl.print()

    def print_invitation_details(self, invitation, org_name, team_name):
        """When `user info` is called with the Invitation ID, there will only be ONE (1) invitation returned.
        This is because an Invitation ID is either for an Organization or Team invitation.
        Previous functionality allowed to call `user info` with a user email. In this case, it was possible
        for an Org and a Team invitation to both be returned. Since one email can have multiple invitations.
        This method needed to handle printing both.
        """  # noqa: D205
        if not invitation:
            team_info = f"team '{team_name}' under " if team_name else ""
            self.print_ok(f"User has no pending invitations for {team_info}org '{org_name}'.")
            return

        org_invitation_details = None
        team_invitation_details = None
        if invitation.type == "ORGANIZATION":
            org_invitation_details = invitation
        else:
            team_invitation_details = invitation

        if self.format_type == "json":
            self.print_data(invitation, is_table=True)
            return
        table_row_dict = collections.OrderedDict()
        if org_invitation_details:
            org_name = org_invitation_details.org
            org_user_roles = {*convert_EGX_roles(org_invitation_details.roles)}
            org_roles = {}
            org_roles[org_name] = ",".join(org_user_roles or [])
            org_roles_fmtd = format_items(list(org_roles.items()))

            table_row_dict["Email"] = org_invitation_details.email
            table_row_dict["Name"] = org_invitation_details.name or ""
            table_row_dict["Organization Invitation ID"] = org_invitation_details.id
            table_row_dict["Date Invited to Org"] = format_date(org_invitation_details.createdDate)
            table_row_dict["Org [Roles]"] = join_(org_roles_fmtd)
        if team_invitation_details:
            team_name = team_invitation_details.team
            team_user_roles = {*convert_EGX_roles(team_invitation_details.roles)}
            team_roles = {}
            team_roles[team_name] = ",".join(team_user_roles or [])
            team_roles_fmtd = format_items(sorted(team_roles.items()))

            table_row_dict["Email"] = team_invitation_details.email
            table_row_dict["Name"] = team_invitation_details.name or ""
            table_row_dict["Team Invitation ID"] = team_invitation_details.id
            table_row_dict["Date Invited to Team"] = format_date(team_invitation_details.createdDate)
            table_row_dict["Teams [Roles]"] = join_(team_roles_fmtd)
        headers = []
        for header in table_row_dict.keys():
            headers.append(self.make_table_cell(header))
        self.print_data([headers, list(table_row_dict.values())], is_table=True)

    def print_storage_quota(self, user_storage_quota):  # noqa: D102
        list_of_quota = []
        if self.format_type == "json":
            self.print_data(user_storage_quota if user_storage_quota else [])
            return
        list_of_quota.append(
            [
                self.make_table_cell("ACE"),
                self.make_table_cell("Cluster"),
                self.make_table_cell("Usage"),
                self.make_table_cell("Datasets"),
                self.make_table_cell("Results"),
                self.make_table_cell("Workspaces"),
                self.make_table_cell("Used"),
                self.make_table_cell("Available"),
            ]
        )
        for quota in user_storage_quota or []:
            full_progbar = 10
            used_quota = 0
            try:
                used_quota = float(quota.quota) - float(quota.available)
                # float division expected
                filled_progbar_per = used_quota / quota.quota * 100
            except (ValueError, TypeError):
                filled_progbar_per = 0
            filled_progbar = filled_progbar_per * 0.1
            diff = round(full_progbar - filled_progbar)
            usage_bar = "#" * int(filled_progbar) + "-" * diff
            usage_str = f"{usage_bar} {round(filled_progbar_per)}%"
            dataset_status = f"{quota.datasetCount} @ {human_size(quota.datasetsUsage)}"
            resultset_status = f"{quota.resultsetCount} @ {human_size(quota.resultsetsUsage)}"
            workspace_status = f"{quota.workspacesCount or 0} @ {human_size(quota.workspacesUsage)}"
            cluster_name = quota.storageClusterName or ""
            list_of_quota.append(
                [
                    quota.aceName,
                    cluster_name,
                    usage_str,
                    dataset_status,
                    resultset_status,
                    workspace_status,
                    human_size(used_quota),
                    human_size(quota.available),
                ]
            )
        self.print_data(list_of_quota, is_table=True, no_wrap_columns=["Usage"])

    def print_dataset_service_storage_quota(self, user_storage_quota):  # noqa: D102
        list_of_quota = []
        if self.format_type == "json":
            return
        list_of_quota.append(
            [
                self.make_table_cell("Datasets"),
                self.make_table_cell("Results"),
                self.make_table_cell("Workspaces"),
            ]
        )
        if not user_storage_quota:
            return
        quota = user_storage_quota
        dataset_status = f"{quota.datasetCount} @ {human_size(quota.datasetsUsage)}"
        resultset_status = f"{quota.resultsetCount} @ {human_size(quota.resultsetsUsage)}"
        workspace_status = f"{quota.workspacesCount or 0} @ {human_size(quota.workspacesUsage)}"
        list_of_quota.append(
            [
                dataset_status,
                resultset_status,
                workspace_status,
            ]
        )
        self.print_head("\n Managed Object Storage \n")
        self.print_data(list_of_quota, is_table=True, no_wrap_columns=["Usage"])

    def print_argument_deprecation_warning(self, arg, replaced):  # noqa: D102
        self.print_warning(f"WARNING! '{arg}' is deprecated. Please use the {replaced} arguments instead.")

    def print_subscription_preview(self, preview):
        """Method for printing details of a preview of a subscription.
        Shown to user so they may confirm the details before adding a subscription.
        """  # noqa: D205, D401
        if self.format_type == "json":
            self.print_data(preview)
            return
        tbl = self.create_output()
        tbl.add_separator_line()
        tbl.set_title("Subscription Preview")
        preview_line_item = LineItem(preview.lineItems)
        tbl.add_label_line("Product", preview_line_item.productName)
        tbl.add_label_line("Rate plan SKU", preview_line_item.productRatePlanSku)
        tbl.add_label_line("Rate plan Name", preview_line_item.productRatePlanName)
        tbl.add_label_line("Quantity", preview_line_item.quantity)
        tbl.add_label_line("Subscription Start Date", preview_line_item.subscriptionStartDate)
        tbl.add_label_line("Subscription End Date", preview_line_item.subscriptionEndDate)
        tbl.add_label_line("Charges", preview_line_item.charges)
        tbl.add_separator_line()
        tbl.print()

    def print_subscription(self, subscription):
        """Method for printing details of a subscription.
        Response can be from `info`, `add`, or `renew` commands.
        """  # noqa: D205, D401
        if self.format_type == "json":
            self.print_data(subscription)
            return
        tbl = self.create_output()
        tbl.add_separator_line()
        tbl.set_title("Subscription Information")
        tbl.add_label_line("Id", subscription.subscriptionId)
        tbl.add_label_line("Product", subscription.displayName or subscription.name)
        # If the subscription is created through UCP, there will be productRatePlanSku
        tbl.add_label_line("Rate Plan Sku", subscription.productRatePlanSku)
        tbl.add_label_line("Status", subscription.status)
        tbl.add_label_line("Auto Renew", subscription.autoRenew)
        tbl.add_label_line("Expiration Date", subscription.expirationDate)
        tbl.add_separator_line()
        tbl.print()

    def print_subscription_list(self, sub_list, columns=None):
        """Method for printing the list of subscriptions in the current org.
        +----------+------------+-----------+------------+-----------------+
        | Id       | Product    | Status    | Auto Renew | Expiration Date |
        +----------+------------+-----------+------------+-----------------+
        """  # noqa: D205, D401, D415
        if self.format_type == "json":
            list_of_subscriptions = sub_list or []
        else:
            list_of_subscriptions = [sub_list]
            if not columns:
                columns = [
                    ("subscriptionId", "Id"),
                    ("displayName", "Product"),
                    ("status", "Status"),
                    ("autoRenew", "Auto Renew"),
                    ("expirationDate", "Expiration Date"),
                ]
            list_of_subscriptions = generate_columns_list(
                list_of_subscriptions,
                columns,
            )
        self.print_data(list_of_subscriptions, is_table=True)
