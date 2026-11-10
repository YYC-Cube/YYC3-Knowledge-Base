# Copyright (c) 2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from typing import Optional

from ngcbase.util.utils import format_org_team

PAGE_SIZE = 1000


class ProviderAPI:  # noqa: D101
    def __init__(self, api_client):
        self.config = api_client.config
        self.connection = api_client.connection

    @staticmethod
    def _get_provider_endpoint(org_name=None, _team_name=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "infrastructure-provider"])

    def info(  # noqa: D102
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        statistics: Optional[bool] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_provider_endpoint(org_name, team_name)
        url = f"{ep}/current"
        resp = self.connection.make_api_request(
            "GET",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="infrastructure_provider_info",
        )
        stats = None
        if statistics:
            url = f"{ep}/current/stats"
            stats = self.connection.make_api_request(
                "GET",
                url,
                auth_org=org_name,
                auth_team=team_name,
                operation_name="infrastructure_provider_stats",
            )
        return resp, stats


class GuestProviderAPI(ProviderAPI):  # noqa: D101
    pass
