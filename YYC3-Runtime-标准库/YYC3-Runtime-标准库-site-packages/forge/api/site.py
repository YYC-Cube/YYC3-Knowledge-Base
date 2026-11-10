# Copyright (c) 2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

import json
from typing import Optional

from forge.api.utils import fetch_paginated_list
from ngcbase.util.utils import format_org_team, has_org_role

PAGE_SIZE = 100


class SiteAPI:  # noqa: D101
    def __init__(self, api_client):
        self.config = api_client.config
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _get_site_endpoint(org_name=None, _team_name=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "site"])

    def list(  # noqa: D102
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        target: Optional[str] = None,
        status: Optional[str] = None,
        provider: Optional[str] = None,
        tenant: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        if not (provider or tenant):
            user_resp = self.client.users.user_who(org_name)
            if has_org_role(user_resp, org_name, ["FORGE_PROVIDER_ADMIN"]):
                provider_info, _ = self.client.forge.provider.info(org_name, team_name)
                provider = provider_info.get("id", "")
            elif has_org_role(user_resp, org_name, ["FORGE_TENANT_ADMIN"]):
                tenant_info, _ = self.client.forge.tenant.info(org_name, team_name)
                tenant = tenant_info.get("id", "")
        ep = self._get_site_endpoint(org_name, team_name)
        params = []
        if provider:
            params.append(f"infrastructureProviderId={provider}")
        if tenant:
            params.append(f"tenantId={tenant}")
        if target:
            params.append(f"query={target}")
        if status:
            params.append(f"status={status}")
        params.append("includeRelation=InfrastructureProvider")
        params.append("orderBy=CREATED_ASC")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])
        return fetch_paginated_list(self.connection, query, org=org_name, operation_name="list_site")

    def info(  # noqa: D102
        self,
        site: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_site_endpoint(org_name, team_name)
        url = f"{ep}/{site}"
        resp = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="site_info"
        )
        return resp

    def create(  # noqa: D102
        self,
        name: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        description: Optional[str] = None,
        serial_console_hostname: Optional[str] = None,
        serial_console_enabled: Optional[bool] = None,
        serial_console_idle_timeout: Optional[int] = None,
        serial_console_max_session_length: Optional[int] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        url = self._get_site_endpoint(org_name, team_name)
        create_obj = {
            "name": name,
            "description": description,
            "serialConsoleHostname": serial_console_hostname,
            "isSerialConsoleEnabled": serial_console_enabled,
            "serialConsoleIdleTimeout": serial_console_idle_timeout,
            "serialConsoleMaxSessionLength": serial_console_max_session_length,
        }
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="create_site",
        )
        return resp

    def update(  # noqa: D102
        self,
        site: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
        serial_console_enable: Optional[bool] = None,
        serial_console_hostname: Optional[str] = None,
        serial_console_timeout: Optional[int] = None,
        serial_console_max_session: Optional[int] = None,
        serial_console_keys_enabled: Optional[bool] = None,
        renew_token: Optional[bool] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_site_endpoint(org_name, team_name)
        url = f"{ep}/{site}"
        update_obj = {
            "name": name,
            "description": description,
            "isSerialConsoleEnabled": serial_console_enable,
            "serialConsoleHostname": serial_console_hostname,
            "serialConsoleIdleTimeout": serial_console_timeout,
            "serialConsoleMaxSessionLength": serial_console_max_session,
            "isSerialConsoleSSHKeysEnabled": serial_console_keys_enabled,
            "renewRegistrationToken": renew_token,
        }
        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(update_obj),
            operation_name="update_site",
        )
        return resp

    def remove(self, site: str, org: Optional[str] = None, team: Optional[str] = None):  # noqa: D102
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_site_endpoint(org_name, team_name)
        url = f"{ep}/{site}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove_site",
            json_response=False,
        )
        return resp


class GuestSiteAPI(SiteAPI):  # noqa: D101
    pass
