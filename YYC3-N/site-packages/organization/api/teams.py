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

from typing import Optional

from ngcbase.api.pagination import pagination_helper
from ngcbase.constants import API_VERSION, PAGE_SIZE
from ngcbase.util.utils import extra_args
from organization.data.api.TeamCreateRequest import TeamCreateRequest
from organization.data.api.TeamCreateResponse import TeamCreateResponse
from organization.data.api.TeamListResponse import TeamListResponse
from organization.data.api.TeamResponse import TeamResponse
from organization.data.api.TeamUpdateRequest import TeamUpdateRequest


class TeamAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client

    def get_teams(self, org_name: str):
        """Get list of teams from an org."""
        query = f"{API_VERSION}/org/{org_name}/teams?page-size={PAGE_SIZE}"
        return self._helper_get_teams(query, org_name=org_name)

    @extra_args
    def list(self, org: Optional[str] = None):
        """Get list of teams from an org."""
        self.client.config.validate_configuration(csv_allowed=True)
        org_name = org or self.client.config.org_name
        return self.get_teams(org_name=org_name)

    def get_team_details(self, name: str, org_name: str):
        """Get details of a given team name."""
        response = self.connection.make_api_request(
            "GET",
            f"{API_VERSION}/org/{org_name}/teams/{name}",
            auth_org=org_name,
            auth_team=name,
            operation_name="get team details",
        )
        return TeamResponse(response).team

    @extra_args
    def info(self, name: str, org: Optional[str] = None):
        """Get details of a given team name."""
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.get_team_details(name=name, org_name=org_name)

    def create_team(self, name: str, description: str, org_name: str):
        """Creates a team in an organization."""  # noqa: D401
        team_create_request = TeamCreateRequest()
        team_create_request.name = name
        team_create_request.description = description
        response = self.connection.make_api_request(
            "POST",
            f"{API_VERSION}/org/{org_name}/teams",
            payload=team_create_request.toJSON(False),
            auth_org=org_name,
            operation_name="create team",
        )
        return TeamCreateResponse(response).team

    @extra_args
    def create(self, name: str, description: str, org: Optional[str] = None):
        """Creates a team in an organization."""  # noqa: D401
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.create_team(name=name, description=description, org_name=org_name)

    def update_team_info(self, name: str, description: str, org_name: str):
        """Updates team information in an organization."""  # noqa: D401
        team_update_request = TeamUpdateRequest()
        team_update_request.description = description
        response = self.connection.make_api_request(
            "PATCH",
            f"{API_VERSION}/org/{org_name}/teams/{name}",
            payload=team_update_request.toJSON(False),
            auth_org=org_name,
            auth_team=name,
            operation_name="update team info",
        )
        # todo: return team object when API is updated
        return response

    @extra_args
    def update(self, name: str, description: str, org: Optional[str] = None):
        """Updates team information in an organization."""  # noqa: D401
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.update_team_info(name=name, description=description, org_name=org_name)

    def remove_team(self, name: str, org_name: str):
        """Removes a team from an organization."""  # noqa: D401
        response = self.connection.make_api_request(
            "DELETE",
            f"{API_VERSION}/org/{org_name}/teams/{name}",
            auth_org=org_name,
            auth_team=name,
            operation_name="remove team",
        )
        return response

    @extra_args
    def remove(self, name: str, org: Optional[str] = None):
        """Removes a team from an organization."""  # noqa: D401
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.remove_team(name=name, org_name=org_name)

    def _helper_get_teams(self, query, org_name=None):
        """Helper command to get list of all the teams using pagination."""  # noqa: D401
        teams_list_pages = pagination_helper(self.connection, query, org_name=org_name, operation_name="get teams")
        list_of_teams = []
        for page in teams_list_pages:
            list_of_teams.extend(TeamListResponse(page).teams)
        return list_of_teams
