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

from ngcbase.command.args_validation import check_if_email_used, SingleUseAction
from ngcbase.command.clicommand import CLICommand
from ngcbase.errors import AccessDeniedException, ResourceNotFoundException
from ngccli.api.apiclient import APIClient
from organization.printer.org_team_user import OrgTeamUserPrinter


class UserCommand(CLICommand):  # noqa: D101
    CMD_NAME = "user"
    HELP = "User Commands"
    DESC = "User Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.make_bottom_commands(self.parser)
        self.client: APIClient
        self.config = self.client.config
        self.printer = OrgTeamUserPrinter(self.client.config)

    user_info_str = "Get user details by user id."

    @CLICommand.command(help=user_info_str, description=user_info_str)
    @CLICommand.arguments("user_id", metavar="<id>", help="User ID", type=check_if_email_used)
    def info(self, args):  # noqa: D102
        self.printer.print_ok(f"Searching for confirmed user with User ID '{args.user_id}'...")
        user_details = self._get_user_details(args.user_id)
        if user_details:
            self.printer.print_user_details(user_details)
        else:
            self.printer.print_ok(f"Searching for invitation with Invitation ID '{args.user_id}'...")
            # Error raised in API users.invitation_info if invitation not found.
            invitation_details = self._get_invitation_details(user_id=args.user_id)
            org_name = self.config.org_name
            team_name = self.config.team_name
            self.printer.print_invitation_details(invitation_details, org_name, team_name)

    def _get_user_details(self, user_id):
        try:
            user_details = self.client.users.info(user_id=user_id)
            return user_details
        except ResourceNotFoundException:
            # pass-ing to go check if invitation exists with `user_id`
            return None

    def _get_invitation_details(self, user_id):
        try:
            invitation_details = self.client.users.invitation_info(
                invitation_identifier=user_id, team=self.config.team_name
            )
            return invitation_details
        except AccessDeniedException:
            # Only Admins are able to view user invitations.
            # Do not raise AccessDeniedException to /invitations endpoint.
            # Let unauthorized user only know user not found.
            raise ResourceNotFoundException(f"User '{user_id}' not found in specified org/team.") from None

    user_who_str = "Show the current authorized NGC CLI user."

    @CLICommand.command(help=user_who_str, description=user_who_str)
    def who(self, _args):  # noqa: D102
        user_details = self.client.users.who()
        self.printer.print_user_details(user_details)

    user_storage_str = "Get user storage. If ACE is set it will be used to filter storage."

    @CLICommand.command(help=user_storage_str, description=user_storage_str)
    def storage(self, _args):  # noqa: D102
        if self.client.authentication.get_sak_key_details(self.config.app_key).type == "SERVICE_KEY":
            self.printer.print_head("Service key detected. Storage details are not available.")
            return
        user_details = self.client.users.user_who()
        storage_info = self.client.users.storage_quota(user_id=user_details.user.id)
        self.printer.print_storage_quota(storage_info[0])
        self.printer.print_dataset_service_storage_quota(storage_info[1])

    user_update_str = "Update current user information."

    @CLICommand.command(help=user_update_str, description=user_update_str)
    @CLICommand.arguments(
        "-n", "--name", metavar="<name>", help="Update to this username.", type=str, action=SingleUseAction
    )
    def update(self, args):  # noqa: D102
        if not args.name:
            self.printer.print_head("No information to be updated.")
            return
        user_details = self.client.users.update(args.name)
        self.printer.print_head("Current user's information updated.")
        self.printer.print_user_details(
            user_details,
            include_org=False,
            include_org_roles=False,
            include_teams=False,
            include_team_roles=False,
            include_creation_date=False,
        )
