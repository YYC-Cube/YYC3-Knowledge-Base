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

from time import sleep

from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_if_email_used,
    check_team_name_pattern,
    check_valid_columns,
    email_id_used,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.command.completers import get_team_completer
from ngcbase.errors import NgcException
from ngcbase.util.io_utils import question_yes_no
from ngcbase.util.utils import confirm_remove, convert_EGX_roles, get_columns_help
from organization.command.utils import get_user_role_choices
from organization.printer.org_team_user import OrgTeamUserPrinter


class TeamCommand(CLICommand):  # noqa: D101
    CMD_NAME = "team"
    HELP = "Team Commands"
    DESC = "Team Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.make_bottom_commands(parser)
        self.config = self.client.config
        self.printer = OrgTeamUserPrinter(self.client.config)

    team_completer = get_team_completer(CLICommand.CLI_CLIENT)

    role_choices = ", ".join(get_user_role_choices(CLICommand.CLI_CLIENT))

    list_team_str = "List all accessible teams."

    columns_dict = {"name": "Name", "description": "Description"}
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)

    team_exception_msg = "Provide team name using --team option or set team name using `ngc config set`."

    # pylint:disable=undefined-variable
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.command(help=list_team_str, description=list_team_str)
    def list(self, _args):  # noqa: D102
        team_list = self.client.teams.list()
        check_add_args_columns(_args.column, TeamCommand.columns_default)
        self.printer.print_teams_list(team_list, columns=_args.column)

    team_get_details_str = "Get team details."

    @CLICommand.command(help=team_get_details_str, description=team_get_details_str)
    @CLICommand.arguments(
        "name", metavar="<name>", help="Team Name", completer=team_completer, type=check_team_name_pattern
    )
    def info(self, args):  # noqa: D102
        self.config.team_name = args.name
        team_details = self.client.teams.info(name=args.name)
        self.printer.print_team_details(team_details)

    create_user_help_str = "(For administrators only) Add existing user or invite new user to the current team."
    create_role_help_str = (
        f"Specify the user role. Options: [{role_choices}]. "
        "To specify more than one role, use multiple --role arguments."
    )
    create_org_role_help_str = (
        "(For org administrators only) Specify the user role in the org, required to add a "
        "new user in the org. Updates user roles in the org if the user exists in the org. "
        f"Options: [{role_choices}]. "
        "To specify more than one org role, use multiple --org-role "
        "arguments."
    )

    @CLICommand.command(name="add-user", help=create_user_help_str, description=create_user_help_str)
    @CLICommand.arguments("user_id", metavar="<email|id>", help="User Email or ID", type=email_id_used)
    # Name only required when creating new user.
    @CLICommand.arguments(
        "--name", metavar="<name>", help="User Display Name. Only required for new users.", type=str, default=None
    )
    @CLICommand.arguments(
        "--role",
        metavar="<r>",
        help=create_role_help_str,
        type=str,
        action="append",
        required=True,
    )
    @CLICommand.arguments(
        "--org-role",
        metavar="<org_role>",
        help=create_org_role_help_str,
        type=str,
        action="append",
    )
    def create_user(self, args):  # noqa: D102
        org_name = self.config.org_name
        team_name = self.config.team_name
        if team_name is None:
            raise NgcException(f"{self.team_exception_msg}")
        team_roles = {*args.role}
        if args.org_role:
            org_roles = {*args.org_role}
        else:
            org_roles = set()

        try:
            check_if_email_used(args.user_id)
            email_used = False
        except NgcException:
            email_used = True
        if email_used:
            # When an email is specified, it is assumed there is no account with that email.
            # If no account with that email exists or is not confirmed,
            # CLI will create user in team and in org. If user already existed in org,
            # the org roles will change if org_roles specified.
            if not args.name:
                raise NgcException(
                    "A name and email are required for inviting a new user to the current Team.\n"
                    "If the user exists in the Organization already, please specify their User ID."
                )
            self.printer.print_ok("Checking if user already exists in team...")
            joined_users_with_email = list(self.client.users.list(team=team_name, email_filter=args.user_id))
            if joined_users_with_email[0]:
                raise NgcException(
                    f"User with email '{args.user_id}' already exists in team '{team_name}' under org '{org_name}'. "
                    "\nPlease run `update-user` command in order to update existing user."
                )
            self.printer.print_ok(f"Creating user and sending invitation to email '{args.user_id}'...")
            self.client.users.create(email=args.user_id, name=args.name, roles=team_roles, team=team_name)
            team_invitation = self.client.users.invitation_info(invitation_identifier=args.user_id, team=team_name)
            if org_roles:
                self.client.users.create(email=args.user_id, name=args.name, roles=org_roles)
                org_invitation = self.client.users.invitation_info(invitation_identifier=args.user_id)
            # invitations endpoint does not resolve invalid role combinations. Must wait until user accepts invite.
            self.printer.print_head(
                f"Activation email sent to '{args.user_id}', please follow the instructions in the email to "
                "complete the activation."
            )
            if org_roles:
                # TODO: Once the migration of EGX_* to F_C_* roles is made,
                #  we should remove this as it will no longer be necessary.
                roles = {*convert_EGX_roles(org_invitation.roles)}
                self.printer.print_head(f"User '{args.user_id}' invited to org '{org_name}' as '{roles}'.")
                self.printer.print_invitation_details(
                    org_invitation,
                    org_name=org_name,
                    team_name=team_name,
                )
            # Once the migration of EGX_* to F_C_* roles is made,
            # we should remove this as it will no longer be necessary.
            roles = {*convert_EGX_roles(team_invitation.roles)}
            self.printer.print_head(f"User '{args.user_id}' invited to team '{team_name}' as '{roles}'.")
            self.printer.print_invitation_details(
                team_invitation,
                org_name=org_name,
                team_name=team_name,
            )
        else:
            # When a digit User ID is used, it is assumed that User ID is valid (User does exist).
            # CLI tries adding user to the specified team, assuming the user exists and is confirmed.
            # `add_to_team` will return error response if User ID is not valid (does not exist).
            self.client.users.add_to_team(user_id=args.user_id, roles=team_roles, team=team_name)
            self.printer.print_ok(f"Added user to team '{team_name}'.")
            org_user_details = None
            if org_roles:
                self.printer.print_ok(
                    "NOTE: If any org roles are ADMIN roles, this may affect the roles assigned in the team."
                )
                self.printer.print_ok(f"Updating user in org '{org_name}'.")
                self.printer.print_ok("This will take a couple of seconds...")
                org_user_details = self.client.users.update_roles(user_id=args.user_id, roles=org_roles, team=team_name)
                # NOTE: Arbitrary amount of seconds to wait.
                sleep(5)
            user_details = self.client.users.info(user_id=args.user_id, team=team_name)
            if org_roles and org_user_details:
                user_org_roles = org_user_details.user.roles
                if user_org_roles:
                    assigned_org_roles = user_org_roles[0]
                    self.printer.print_head(
                        f"User '{args.user_id}' updated in org '{org_name}' as "
                        f"'{', '.join(assigned_org_roles.orgRoles)}'."
                    )
            self.printer.print_head(
                f"User '{args.user_id}' added to team '{team_name}' as "
                f"'{', '.join(user_details.user.roles[1].teamRoles)}'."
            )
            if org_roles:
                include_org_roles = True
                include_org = True
            else:
                include_org_roles = False
                include_org = False
            self.printer.print_user_details(
                user_details,
                include_org=include_org,
                include_org_roles=include_org_roles,
                include_teams=True,
                include_team_roles=True,
                include_creation_date=False,
            )

    update_user_str = "(For administrators only) Update a user's roles in the current team."
    update_role_help_str = (
        f"Specify the user role. Options: [{role_choices}]. "
        "To specify more than one role, use multiple --role arguments."
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
    @CLICommand.arguments("user_id", metavar="<id>", help="User ID", type=check_if_email_used, default=None)
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
        team_name = self.config.team_name
        if team_name is None:
            raise NgcException(f"{self.team_exception_msg}")
        if not args.role and (not args.add_role and not args.remove_role):
            raise NgcException("Must use the '--role' argument, or `--add-role` or `--remove-role` arguments.")

        if args.role:
            self.printer.print_argument_deprecation_warning("--role", "'--add-role' or '--remove-role'")
            roles = {*args.role}

            user_details = self.client.users.update_roles(user_id=args.user_id, roles=roles, team=team_name)
            self.printer.print_head(f"User '{args.user_id}' information updated.")
            self.printer.print_user_details(user_details, include_org_roles=False, include_creation_date=False)
        else:
            add_roles = {*args.add_role} if args.add_role else {}
            remove_roles = {*args.remove_role} if args.remove_role else {}

            add_role_response, remove_role_response = self.client.users.update_roles(
                user_id=args.user_id,
                add_roles=add_roles,
                remove_roles=remove_roles,
                team=team_name,
            )
            self.printer.print_head(f"User '{args.user_id}' information updated.")
            if add_role_response and remove_role_response:
                # The remove_role_response will show the added roles in user details
                # So only need to print this last response; not add_role_response
                self.printer.print_user_details(
                    remove_role_response, include_org_roles=False, include_creation_date=False
                )
            elif add_role_response:
                self.printer.print_user_details(add_role_response, include_org_roles=False, include_creation_date=False)
            elif remove_role_response:
                self.printer.print_user_details(
                    remove_role_response, include_org_roles=False, include_creation_date=False
                )

    remove_user_str = "(For administrators only) Remove a user from the current team."

    @CLICommand.command(name="remove-user", help=remove_user_str, description=remove_user_str)
    @CLICommand.arguments("user_id", metavar="<id>", help="User ID", type=check_if_email_used)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    def remove_user(self, args):  # noqa: D102
        team_name = self.config.team_name
        if team_name is None:
            raise NgcException(f"{self.team_exception_msg}")
        confirm_remove(self.printer, "user", args.default_yes)
        self.client.users.remove(user_id=args.user_id, team=team_name)
        org_name = self.config.org_name
        self.printer.print_head(f"User '{args.user_id}' removed from team '{team_name}' in org '{org_name}'.")

    delete_invitation_str = "(For administrators only) Delete a user invitation meant for the current team."

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
        org_name = self.config.org_name
        team_name = self.config.team_name
        if team_name is None:
            raise NgcException(f"{self.team_exception_msg}")

        invitation_string_id = str(args.invitation_id)
        team_invitation = self.client.users.invitation_info(invitation_identifier=invitation_string_id, team=team_name)
        if not team_invitation:
            raise NgcException(
                f"Error: No Invitation with id '{invitation_string_id}' exists for team '{team_name}' in org"
                f" '{org_name}'."
            )
        msg = (
            f"Are you sure you want to delete the invitation for '{team_invitation.name or team_invitation.email}' to"
            f" the '{team_name}' team?"
        )
        answer = question_yes_no(self.printer, msg, default_yes=args.default_yes)
        if answer:
            self.client.users.delete_invitation(invitation_id=args.invitation_id, team=team_name)
            self.printer.print_head(f"Invitation for '{team_invitation.name}' to the '{team_name}' team deleted.")
        else:
            self.printer.print_head("Deletion of invitation cancelled.")

    list_user_str = "(For administrators only) List all users in the current team."
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
    def list_users(self, args):
        """List users in the current team under the current org. Invited and confirmed users can be listed together
        or individually.
        """  # noqa: D205
        team_name = self.config.team_name
        check_add_args_columns(args.column, TeamCommand.columns_users_default)

        if team_name is None:
            raise NgcException(f"{self.team_exception_msg}")
        # if no option provided, list all confirmed and invited users
        joined_users_gen = None
        invitation_gen = None
        if not args.joined and not args.invited:
            joined_users_gen = self.client.users.list(email_filter=args.email, team=team_name)
            invitation_gen = self.client.users.list_invitations(email_filter=args.email, team=team_name)
        if args.joined:
            joined_users_gen = self.client.users.list(email_filter=args.email, team=team_name)
        if args.invited:
            invitation_gen = self.client.users.list_invitations(email_filter=args.email, team=team_name)
        self.printer.print_users_list(
            joined_users_gen,
            invitation_gen,
            include_org_roles=False,
            include_team_roles=True,
            columns=args.column,
        )
