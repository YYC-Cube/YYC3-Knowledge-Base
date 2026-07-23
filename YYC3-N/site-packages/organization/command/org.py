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

from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_if_email_used,
    check_team_name_pattern,
    check_valid_columns,
    email_used,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.command.completers import get_org_completer, get_team_completer
from ngcbase.errors import NgcException
from ngcbase.util.io_utils import question_yes_no
from ngcbase.util.utils import confirm_remove, get_columns_help
from organization.command.utils import get_user_role_choices
from organization.printer.org_team_user import OrgTeamUserPrinter


class OrgCommand(CLICommand):  # noqa: D101
    CMD_NAME = "org"
    HELP = "Org Commands"
    DESC = "Org Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.make_bottom_commands(parser)
        self.config = self.client.config
        self.printer = OrgTeamUserPrinter(self.client.config)

    org_completer = get_org_completer(CLICommand.CLI_CLIENT)
    team_completer = get_team_completer(CLICommand.CLI_CLIENT)

    role_choices = ", ".join(get_user_role_choices(CLICommand.CLI_CLIENT))

    org_list_str = "List all accessible organizations."

    columns_dict = {"name": "Name", "description": "Description", "type": "Type"}
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)

    # pylint:disable=undefined-variable
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.command(help=org_list_str, description=org_list_str)
    def list(self, args):  # noqa: D102
        org_list = self.client.org.list()
        check_add_args_columns(args.column, OrgCommand.columns_default)
        self.printer.print_org_list(org_list, columns=args.column)

    org_get_details_str = "Get organization details."

    @CLICommand.command(help=org_get_details_str, description=org_get_details_str)
    @CLICommand.arguments("org", metavar="<org_name>", help="Organization name", type=str, completer=org_completer)
    def info(self, args):  # noqa: D102
        org_list = self.client.org.info(org=args.org)
        self.printer.print_org_details(org_list)

    create_user_help_str = "(For administrators only) Add (create) a user to the current organization."
    create_role_help_str = (
        f"Specify the user role. Options: {role_choices}. To specify more than one role, use multiple --role arguments."
    )

    @CLICommand.command(name="add-user", help=create_user_help_str, description=create_user_help_str)
    @CLICommand.arguments("email", metavar="<email>", help="User Email", type=email_used, default=None)
    @CLICommand.arguments("name", metavar="<name>", help="User Name", type=str, default=None)
    @CLICommand.arguments(
        "--role",
        metavar="<r>",
        help=create_role_help_str,
        type=str,
        action="append",
        required=True,
    )
    def create_user(self, args):  # noqa: D102
        # `create_user` returns 'UserResponse' object.
        # If Invitation was successfully created and sent, `invitation_info` will return
        # the Invitation.
        self.client.users.create(email=args.email, name=args.name, roles=args.role)
        invitation = self.client.users.invitation_info(invitation_identifier=args.email)

        self.printer.print_head(
            f"Activation email sent to '{args.email}', please follow the instructions in the email to "
            "complete the activation."
        )
        org_name = self.config.org_name
        roles = {*args.role}
        self.printer.print_head(f"User '{args.email}' has been invited to org '{org_name}' as '{roles}'.")
        if invitation:
            self.printer.print_invitation_details(
                invitation,
                org_name=org_name,
                team_name=None,
            )

    update_user_str = "(For administrators only) Update a user's roles in the current organization."
    update_role_help_str = (
        f"Specify the user role. Options: {role_choices}. To specify more than one role, use multiple --role arguments."
    )
    update_add_role_help_str = (
        f"Specify the user role to assign. Options: [{role_choices}]. "
        "To specify more than one role, use multiple --add-role arguments."
    )
    update_remove_role_help_str = (
        f"Specify the user role to remove. Options: [{role_choices}]. "
        "To specify more than one role, use multiple --remove-role arguments."
    )

    @CLICommand.command(name="update-user", description=update_user_str, help=update_user_str)
    @CLICommand.arguments("user_id", metavar="<id>", help="User ID", type=check_if_email_used)
    @CLICommand.arguments(
        "--role",
        metavar="<role>",
        help=update_role_help_str,
        type=str,
        action="append",
    )
    @CLICommand.arguments(
        "--add-role",
        metavar="<add_role>",
        help=update_add_role_help_str,
        type=str,
        action="append",
        default=None,
    )
    @CLICommand.arguments(
        "--remove-role",
        metavar="<remove_role>",
        help=update_remove_role_help_str,
        type=str,
        action="append",
        default=None,
    )
    @CLICommand.mutex(["remove_role", "add_role"], ["role"])
    def update_user(self, args):  # noqa: D102
        if not args.role and (not args.add_role and not args.remove_role):
            raise NgcException("Must use the '--role' argument, or `--add-role` or `--remove-role` arguments.")

        if args.role:
            self.printer.print_argument_deprecation_warning("--role", "'--add-role' or '--remove-role'")
            roles = {*args.role}

            user_details = self.client.users.update_roles(user_id=args.user_id, roles=roles)
            org_name = self.config.org_name
            self.printer.print_head(f"User '{args.user_id}' updated in org '{org_name}' as '{roles}'.")
            self.printer.print_user_details(
                user_details, include_teams=False, include_team_roles=False, include_creation_date=False
            )
        else:
            add_roles = {*args.add_role} if args.add_role else {}
            remove_roles = {*args.remove_role} if args.remove_role else {}

            add_role_response, remove_role_response = self.client.users.update_roles(
                user_id=args.user_id, add_roles=add_roles, remove_roles=remove_roles
            )
            self.printer.print_head(f"User '{args.user_id}' information updated.")
            if add_role_response and remove_role_response:
                # The remove_role_response will show the added roles in user details
                # So only need to print this last response; not add_role_response
                self.printer.print_user_details(
                    remove_role_response, include_teams=False, include_team_roles=False, include_creation_date=False
                )
            elif add_role_response:
                self.printer.print_user_details(
                    add_role_response, include_teams=False, include_team_roles=False, include_creation_date=False
                )
            elif remove_role_response:
                self.printer.print_user_details(
                    remove_role_response, include_teams=False, include_team_roles=False, include_creation_date=False
                )

    remove_user_str = "(For administrators only) Remove a user from the current organization."

    @CLICommand.command(name="remove-user", help=remove_user_str, description=remove_user_str)
    @CLICommand.arguments("user_id", metavar="<id>", help="User ID", type=check_if_email_used, default=None)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    def remove_user(self, args):  # noqa: D102
        confirm_remove(self.printer, "user", args.default_yes)
        self.client.users.remove(user_id=args.user_id)
        org_name = self.config.org_name
        self.printer.print_head(f"User '{args.user_id}' deleted from org '{org_name}'.")

    delete_invitation_str = "(For administrators only) Delete a user invitation meant for the current organization."

    @CLICommand.command(
        name="delete-invitation",
        help=delete_invitation_str,
        description=delete_invitation_str,
    )
    @CLICommand.arguments("invitation_id", metavar="<invitation_id>", help="Invitation ID", type=int)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        action="store_true",
        dest="default_yes",
    )
    def delete_invitation(self, args):  # noqa: D102
        invitation_string_id = str(args.invitation_id)
        org_invitation = self.client.users.invitation_info(invitation_identifier=invitation_string_id)
        org_name = self.config.org_name
        if not org_invitation:
            raise NgcException(f"Error: No Invitation with id '{invitation_string_id}' exists for org '{org_name}'.")
        msg = (
            f"Are you sure you want to delete the invitation for '{org_invitation.name or org_invitation.email}' to the"
            f" '{org_name}' organization? \nDeleting this invite will also delete all associated team invitations."
        )
        # org_invitation.org is the unique name of the organization; not the `displayName`
        answer = question_yes_no(self.printer, msg, default_yes=args.default_yes)
        if answer:
            self.client.users.delete_invitation(invitation_id=args.invitation_id)
            self.printer.print_head(f"Invitation for '{org_invitation.name}' to the '{org_name}' organization deleted.")
        else:
            raise NgcException("Deletion of invitation cancelled.")

    list_user_str = "(For administrators only) List all users in the current organization."
    FILTER_EMAIL_HELP = "Filter users by email."

    columns_users_dict = {
        "name": "Name",
        "email": "Email",
        "roles": "Roles",
        "created": "Created Date",
        "type": "Invitation Type",
        "firstLoginDate": "First Login Date",
        "lastLoginDate": "Last Activity",
        "idpType": "Sign In Method",
    }
    columns_users_default = ("id", "Id")
    columns_users_help = get_columns_help(columns_users_dict, columns_users_default)

    @CLICommand.command(name="list-users", help=list_user_str, description=list_user_str)
    @CLICommand.arguments("--joined", action="store_true", help="Only list users that have joined.")
    @CLICommand.arguments("--invited", action="store_true", help="Only list invited users.")
    # pylint:disable=undefined-variable
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_users_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_users_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.arguments(
        "--email",
        metavar="<email>",
        help=FILTER_EMAIL_HELP,
        type=str,
        default=None,
    )
    def list_users(self, args):  # noqa: D102
        joined_users_gen = None
        invitation_gen = None
        # if no option provided, list both confirmed and invited users
        if not args.joined and not args.invited:
            joined_users_gen = self.client.users.list(email_filter=args.email)
            invitation_gen = self.client.users.list_invitations(email_filter=args.email)
        if args.joined:
            joined_users_gen = self.client.users.list(email_filter=args.email)
        if args.invited:
            invitation_gen = self.client.users.list_invitations(email_filter=args.email)
        check_add_args_columns(args.column, OrgCommand.columns_users_default)
        self.printer.print_users_list(joined_users_gen, invitation_gen, columns=args.column)

    create_team_str = "(For administrators only) Add (create) a team in the current organization."

    @CLICommand.command(name="add-team", help=create_team_str, description=create_team_str)
    @CLICommand.arguments("name", metavar="<name>", help="Team Name", default=None, type=check_team_name_pattern)
    @CLICommand.arguments("desc", metavar="<description>", help="Team Description", type=str, default=None)
    def add_team(self, args):  # noqa: D102
        team_details = self.client.teams.create(name=args.name, description=args.desc)
        self.printer.print_head("Team created.")
        self.printer.print_team_details(team_details)

    update_team_str = "(For administrators only) Update the information for a team in your organization."

    @CLICommand.command(name="update-team", description=update_team_str, help=update_team_str)
    @CLICommand.arguments("name", metavar="<name>", help="Team Name", default=None, type=check_team_name_pattern)
    @CLICommand.arguments("desc", metavar="<description>", help="Team Description", type=str, default=None)
    def update_team(self, args):  # noqa: D102
        self.client.teams.update(name=args.name, description=args.desc)
        self.printer.print_head(f"Team {args.name} information updated.")
        team_details = self.client.teams.info(name=args.name)
        self.printer.print_team_details(team_details)

    remove_team_str = "(For administrators only) Removes a team from a given organization."

    @CLICommand.command(name="remove-team", help=remove_team_str, description=remove_team_str)
    @CLICommand.arguments(
        "name",
        metavar="<team name>",
        help="Team Name",
        default=None,
        completer=team_completer,
        type=check_team_name_pattern,
    )
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    def remove_team(self, args):  # noqa: D102
        confirm_remove(self.printer, "team", args.default_yes)
        self.config.team_name = args.name
        self.client.teams.remove(name=args.name)
        org_name = self.config.org_name
        self.printer.print_head(f"Team '{args.name}' removed from org '{org_name}'.")
