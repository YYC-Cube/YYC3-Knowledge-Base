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

import json
import logging
from typing import List, Optional
from urllib.parse import quote

from ngcbase.api.pagination import pagination_helper
from ngcbase.command.args_validation import check_if_email_used, email_id_used
from ngcbase.constants import API_VERSION, SCOPED_KEY_PREFIX
from ngcbase.errors import (
    InvalidArgumentError,
    NgcAPIError,
    NgcException,
    ResourceNotFoundException,
)
from ngcbase.util.utils import extra_args
from organization.data.api.UserCreateRequest import UserCreateRequest
from organization.data.api.UserInvitationListResponse import UserInvitationListResponse
from organization.data.api.UserListResponse import UserListResponse
from organization.data.api.UserResponse import UserResponse
from organization.data.api.UserStorageQuotaListResponse import (
    UserStorageQuotaListResponse,
)
from organization.data.api.UserStorageQuotaResponse import UserStorageQuotaResponse
from organization.data.api.UserUpdateRequest import UserUpdateRequest

PAGE_SIZE = 100
logger = logging.getLogger(__name__)


class UsersAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _construct_url(org_name, team_name=None, user_id=None):
        """Constructs users url depending on given parameters."""  # noqa: D401
        base_method = f"{API_VERSION}/org/{org_name}"
        if team_name:
            base_method = f"{base_method}/team/{team_name}"
        if user_id:
            # GET: gets information of User
            # POST: adds user, but only succeeds if they already exist in the current org
            base_method = f"{base_method}/users/{user_id}"
        else:
            # GET: lists users
            # POST: creates user
            base_method = f"{base_method}/users"
        return base_method

    def _construct_invitations_query(self, org_name, team_name=None, invitation_id=None):
        base_method = self._construct_url(org_name=org_name, team_name=team_name)
        base_method = f"{base_method}/invitations"
        if invitation_id:
            base_method = f"{base_method}/{invitation_id}"
        return base_method

    def get_users(self, org_name: str, team_name: Optional[str] = None, email_filter: Optional[str] = None):
        """Get list of users from an org. If team name is provided filters on basis of it."""
        query_url = self._construct_url(org_name=org_name, team_name=team_name)
        params = []
        params.append(f"page-size={PAGE_SIZE}")
        if email_filter:
            filter_list = [{"field": "email", "value": quote(email_filter)}]
            search_params = {"filters": filter_list}
            params.append(f"q={json.dumps(search_params)}")
        query_url = "?".join([query_url, "&".join(params)])

        for page in pagination_helper(
            connection=self.connection,
            query=query_url,
            org_name=org_name,
            team_name=team_name,
            operation_name="get users",
            page_number=0,
        ):
            yield UserListResponse(page).users

    @extra_args
    def list(self, org: Optional[str] = None, team: Optional[str] = None, email_filter: Optional[str] = None):
        """Get list of users from an org. If team name is provided filters on basis of it."""
        self.client.config.validate_configuration(csv_allowed=True)
        org_name = org or self.client.config.org_name
        return self.get_users(org_name=org_name, team_name=team, email_filter=email_filter)

    def get_user_details(self, org_name: str, team_name: str, user_id: str):
        """Get details of a user."""
        response = self.connection.make_api_request(
            "GET",
            self._construct_url(org_name=org_name, team_name=team_name, user_id=user_id),
            auth_org=org_name,
            auth_team=team_name,
            operation_name="get user details",
        )
        return UserResponse(response)

    @extra_args
    def info(self, user_id: str, org: Optional[str] = None, team: Optional[str] = None):
        """Get details of a user."""
        if not user_id:
            raise NgcException(
                "ERROR: Please use valid User ID. \nIf User ID is unknown, list users with email filter."
            ) from None
        check_if_email_used(user_id=user_id)
        user_id = str(user_id) if isinstance(user_id, int) else user_id
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        team_name = team or self.client.config.team_name
        return self.get_user_details(org_name=org_name, team_name=team_name, user_id=user_id)

    def get_invitations(self, org_name: str, team_name: Optional[str] = None, email_filter: Optional[str] = None):
        """Get list of UserInvitations for an org_name, or org/team if team is specified."""
        query_url = self._construct_invitations_query(org_name=org_name, team_name=team_name)
        params = []
        params.append(f"page-size={PAGE_SIZE}")
        if email_filter:
            filter_list = [{"field": "email", "value": quote(email_filter)}]
            search_params = {"filters": filter_list}
            params.append(f"q={json.dumps(search_params)}")
        query_url = "?".join([query_url, "&".join(params)])
        for page in pagination_helper(
            connection=self.connection,
            query=query_url,
            org_name=org_name,
            team_name=team_name,
            operation_name="get invitations",
            page_number=0,
        ):
            yield UserInvitationListResponse(page).invitations

    @extra_args
    def list_invitations(
        self, org: Optional[str] = None, team: Optional[str] = None, email_filter: Optional[str] = None
    ):
        """Get list of UserInvitations for an org_name, or org/team if team is specified."""
        self.client.config.validate_configuration(csv_allowed=True)
        org_name = org or self.client.config.org_name
        invitations_list = self.get_invitations(org_name=org_name, team_name=team, email_filter=email_filter)
        if org_name and not team:
            # The list of invitations when team is not specified still includes invitations for Teams.
            # Must filter those out.
            org_only_invitations = []
            for page in invitations_list:
                for invitation in page:
                    if invitation.type == "ORGANIZATION":
                        org_only_invitations.append(invitation)
            return [org_only_invitations]
        return invitations_list

    def get_invitation_details(self, invitation_identifier: str, org_name: str, team_name: Optional[str] = None):
        """Get details about a specific user invitation based using their unique Invitation ID or Invitation Email
        By default, looks for specified-user's invitation in current org's invitations. If `team_name` specified,
        searches for specified-user's invitation in org/team invitations.
        User ID and Invitation ID are mutually exclusive. So if the `user_id` that is passed is a unique User ID,
        this method will return None.
        Only `add-user` commands for both org and team modules use the email argument. This is because the email is the
        only attribute of an invitation known to use when initially adding/inviting the user. Multiple invitations
        may be returned, as one email can have multiple invitations.
        There will only be one invitation returned. This is because an Invitation ID is either for
        an Organization or Team invitation.
        """  # noqa: D205
        org_invitation = None
        team_invitation = None
        if team_name:
            try:
                team_invitation_gen = self.list_invitations(org=org_name, team=team_name)
                team_invitation = next(
                    (
                        invitation
                        for page in team_invitation_gen
                        for invitation in page
                        if invitation_identifier in [str(invitation.id), invitation.email]
                    ),
                    None,
                )
            except ResourceNotFoundException:
                pass
        else:
            # NOTE: The response for 'org/{org-name}/users/invitations/{id}' endpoint includes Team invitations...
            # So must only return Invitation with matching ID if the type if "ORGANIZATION".
            team_invitation = None
            try:
                org_invitation_gen = self.list_invitations(org=org_name)
                org_invitation = next(
                    (
                        invitation
                        for page in org_invitation_gen
                        for invitation in page
                        if invitation_identifier in [str(invitation.id), invitation.email]
                        and invitation.type == "ORGANIZATION"
                    ),
                    None,
                )
            except ResourceNotFoundException:
                pass

        return org_invitation if org_invitation else team_invitation

    @extra_args
    def invitation_info(self, invitation_identifier: str, org: Optional[str] = None, team: Optional[str] = None):
        """Get details about a specific user invitation based using their unique Invitation ID or Invitation Email.
        By default, looks for specified-user's invitation in current org's invitations. If `team_name` specified,
        searches for specified-user's invitation in org/team invitations.
        User ID and Invitation ID are mutually exclusive. So if the `user_id` that is passed is a unique User ID,
        this method will return None.
        Only `add-user` commands for both org and team modules use the email argument. This is because the email is the
        only attribute of an invitation known to use when initially adding/inviting the user. Multiple invitations
        may be returned, as one email can have multiple invitations.
        When using the Invitation ID, there will only be one invitation returned. This is because an Invitation ID is
        either for an Organization or Team invitation.
        """  # noqa: D205
        if not invitation_identifier:
            raise InvalidArgumentError("ERROR: Please use a valid Invitation ID or Invitation Email") from None
        if not isinstance(invitation_identifier, str):
            raise InvalidArgumentError("ERROR: Please use a String Invitation ID or String Invitation Email") from None
        email_id_used(user_id=invitation_identifier)
        self.client.config.validate_configuration()

        org_name = org or self.client.config.org_name
        invitation_details = self.get_invitation_details(
            invitation_identifier=invitation_identifier, org_name=org_name, team_name=team
        )
        if not invitation_details:
            team_info = f"team '{team}' under org" if team else "org"
            if invitation_identifier.isdigit():
                error_msg = f"No User nor Invitation with ID '{invitation_identifier}' "
            else:
                error_msg = f"No User nor Invitation with Email '{invitation_identifier}' "
            error_msg += f"exists for {team_info} '{org_name}'."
            raise ResourceNotFoundException(error_msg)
        return invitation_details

    def create_a_user(self, email: str, name: str, roles: List[str], org_name: str, team_name: Optional[str] = None):
        """Creates user in an organization. Or, if team_name specific, creates user in org/team."""  # noqa: D401
        user_create_request = UserCreateRequest()
        user_create_request.email = email
        user_create_request.name = name
        roles = {*roles}
        user_create_request.roleTypes = roles
        try:
            response = self.connection.make_api_request(
                "POST",
                self._construct_url(org_name, team_name),
                payload=user_create_request.toJSON(False),
                auth_org=org_name,
                auth_team=team_name,
                operation_name="create user",
            )
            return UserResponse(response)
        except NgcAPIError:
            raise NgcException("Error inviting user. Please make sure the roles assigned are valid.") from None

    @extra_args
    def create(self, email: str, name: str, roles: List[str], org: Optional[str] = None, team: Optional[str] = None):
        """Creates user in an organization. Or, if team_name specific, creates user in org/team."""  # noqa: D401
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.create_a_user(email=email, name=name, roles=roles, org_name=org_name, team_name=team)

    def add_user_to_team(self, user_id: int, roles: List[str], org_name: str, team_name: str):
        """Adds a confirmed user to the specified team."""  # noqa: D401
        role_q = "&".join(["roles={}".format(r) for r in roles])
        url = self._construct_url(org_name=org_name, team_name=team_name, user_id=user_id)
        base_url = f"{url}?{role_q}"
        self.connection.make_api_request(
            "POST", base_url, auth_org=org_name, auth_team=team_name, operation_name="add user to team"
        )

    @extra_args
    def add_to_team(self, user_id: int, roles: List[str], org: Optional[str] = None, team: Optional[str] = None):
        """Adds a confirmed user to the specified team."""  # noqa: D401
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        team_name = team or self.client.config.team_name
        return self.add_user_to_team(user_id=user_id, roles=roles, org_name=org_name, team_name=team_name)

    def remove_user(self, user_id: int, org_name: str, team_name: Optional[str] = None):
        """Removes user from an organization. Or, if team_name specified, removes user from org/team."""  # noqa: D401
        logger.debug("DELETING USER: %s", user_id)
        self.connection.make_api_request(
            "DELETE",
            self._construct_url(org_name=org_name, team_name=team_name, user_id=user_id),
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove user",
        )

    @extra_args
    def remove(self, user_id: int, org: Optional[str] = None, team: Optional[str] = None):
        """Removes user from an organization. Or, if team_name specified, removes user from org/team."""  # noqa: D401
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.remove_user(user_id=user_id, org_name=org_name, team_name=team)

    def delete_an_invitation(self, invitation_id: int, org_name: str, team_name: Optional[str] = None):  # noqa: D102
        query = self._construct_invitations_query(org_name=org_name, team_name=team_name, invitation_id=invitation_id)
        self.connection.make_api_request(
            "DELETE", query, auth_org=org_name, auth_team=team_name, operation_name="delete invitation"
        )

    @extra_args
    def delete_invitation(self, invitation_id: int, org: Optional[str] = None, team: Optional[str] = None):
        """Delete an invitation."""
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.delete_an_invitation(invitation_id=invitation_id, org_name=org_name, team_name=team)

    def update_user_info(self, name: str):
        """Updates current user's information."""  # noqa: D401
        # Step 1: Update user information with PATCH request
        user_update_request = UserUpdateRequest()
        user_update_request.name = name
        query = f"{API_VERSION}/users/me"
        self.connection.make_api_request(
            "PATCH", query, payload=user_update_request.toJSON(False), operation_name="update user info"
        )
        # Step 2: Get user information (including roles) with GET request
        response = self.connection.make_api_request("GET", query, operation_name="get user info")
        return UserResponse(response)

    @extra_args
    def update(self, name: str):
        """Updates current user's information."""  # noqa: D401
        if not isinstance(name, str):
            raise InvalidArgumentError("ERROR: Name argument must be a String") from None
        self.client.config.validate_configuration()
        return self.update_user_info(name=name)

    def update_user_roles(
        self,
        user_id: int,
        org_name: str,
        team_name: Optional[str] = None,
        roles: Optional[List] = None,
        add_roles: Optional[List] = None,
        remove_roles: Optional[List] = None,
    ):
        """Updates user roles in an organization or a team."""  # noqa: D401
        url = self._construct_url(org_name, team_name=team_name, user_id=user_id)
        if roles:
            role_q = "&".join(["roles={}".format(r) for r in roles])
            base_url = f"{url}/update-role?{role_q}"
            response = self.connection.make_api_request(
                "PATCH", base_url, auth_org=org_name, auth_team=team_name, operation_name="update user role"
            )
            return UserResponse(response)
        add_role_response = None
        remove_role_response = None
        if add_roles:
            add_role_q = "&".join(["roles={}".format(r) for r in add_roles])
            add_role_url = f"{url}/add-role?{add_role_q}"
            add_role_response = self.connection.make_api_request(
                "PATCH", add_role_url, auth_org=org_name, auth_team=team_name, operation_name="add user roles"
            )
            add_role_response = UserResponse(add_role_response)
        if remove_roles:
            remove_role_q = "&".join(["roles={}".format(r) for r in remove_roles])
            remove_role_url = f"{url}/remove-role?{remove_role_q}"
            remove_role_response = self.connection.make_api_request(
                "DELETE",
                remove_role_url,
                auth_org=org_name,
                auth_team=team_name,
                operation_name="remove user roles",
            )
            remove_role_response = UserResponse(remove_role_response)
        return [add_role_response, remove_role_response]

    @extra_args
    def update_roles(
        self,
        user_id: int,
        roles: Optional[List] = None,
        add_roles: Optional[List] = None,
        remove_roles: Optional[List] = None,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        """Updates user roles in an organization or a team."""  # noqa: D401
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.update_user_roles(
            user_id=user_id,
            roles=roles,
            add_roles=add_roles,
            remove_roles=remove_roles,
            org_name=org_name,
            team_name=team,
        )

    def user_who(self, org_name: Optional[str] = None):
        """Returns user information."""  # noqa: D401
        if org_name:
            request_endpoint = f"{API_VERSION}/users/me?org-name={org_name}"
        else:
            request_endpoint = f"{API_VERSION}/users/me"
        response = self.connection.make_api_request(
            "GET", request_endpoint, auth_org=org_name, operation_name="get user info"
        )
        return UserResponse(response)

    def user_who_personal_key(self, sak_key):
        """Returns user information for a Scoped API Key. Normal /users/me endpoint does not work for SAK's.
        If this method change, must change the method under ngcbase.api.authentcation.get_key_details()
        and vice versa.
        """  # noqa: D205, D401
        # pylint: disable=protected-access
        sak_caller_info_object = self.client.config._get_sak_key_details(sak_key)
        return sak_caller_info_object

    @extra_args
    def who(self, org: Optional[str] = None):
        """Returns information about the currently-configured user.
        The org parameter is a filter used for searching for information about the
        currently-configured user in that org.

        If that org is invalid, an error is raised.

        If org is not specified, the org from the current configuration is used.

        If the org is valid, the response is basic meta data of the user,
        as well as user info from that org, user info from every team in that org,
        and the user's roles in that org and those teams.
        """  # noqa: D205, D401
        self.client.config._check_org(org, remote_validation=True)  # pylint: disable=protected-access
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        if self.client.config.app_key and self.client.config.app_key.startswith(SCOPED_KEY_PREFIX):
            sak_key = self.client.config.app_key
            sak_key_details = self.client.authentication.get_sak_key_details(sak_key)
            if sak_key_details and sak_key_details.type == "SERVICE_KEY":
                logger.info("Service key detected. User details are not available.")
                return 0

            sak_caller_info_object = self.user_who_personal_key(sak_key=sak_key)
            return sak_caller_info_object
        return self.user_who(org_name=org_name)

    def get_user_storage_quota(self, user_id: int, org_name: str, ace_name: str):
        """Get user storage quota for a given ACE. If ACE is omitted all quotas will be listed."""
        url = self._construct_url(org_name, user_id=user_id)
        base_url = f"{url}/quota"
        if ace_name:
            base_url = f"{base_url}?ace-name={ace_name}"
        response = self.connection.make_api_request(
            "GET", base_url, auth_org=org_name, operation_name="get user storage quota"
        )
        dataset_service_storage_info = self.client.basecommand.dataset.get_user_storage(org_name=org_name)
        return (
            UserStorageQuotaListResponse(response).userStorageQuotas,
            UserStorageQuotaResponse(dataset_service_storage_info).userStorageQuota,
        )

    @extra_args
    def storage_quota(self, user_id: int, org: Optional[str] = None, ace: Optional[str] = None):
        """Get user storage quota for a given ACE. If ACE is omitted all quotas will be listed."""
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        ace_name = ace or self.client.config.ace_name
        return self.get_user_storage_quota(user_id=user_id, org_name=org_name, ace_name=ace_name)
