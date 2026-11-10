# Copyright (c) 2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

import json

from forge.api.utils import fetch_paginated_list
from ngcbase.util.utils import format_org_team

PAGE_SIZE = 100


class SSHKeyGroupAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _get_ssh_key_endpoint(org_name=None, _team_name=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "sshkeygroup"])

    def list(self, org_name, team_name, target, site, instance):  # noqa: D102
        ep = self._get_ssh_key_endpoint(org_name, team_name)
        params = []
        if target:
            params.append(f"query={target}")
        if site:
            params.append(f"siteId={site}")
        if instance:
            params.append(f"instanceId={instance}")
        params.append("includeRelation=Tenant")
        params.append("orderBy=CREATED_ASC")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])
        return fetch_paginated_list(self.connection, query, org=org_name, operation_name="list_ssh_key_group")

    def info(self, org_name, team_name, ssh_key_group_id):  # noqa: D102
        ep = self._get_ssh_key_endpoint(org_name, team_name)
        url = f"{ep}/{ssh_key_group_id}"
        resp = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="ssh_key_group_info"
        )
        return resp

    def create(  # noqa: D102
        self,
        org_name,
        team_name,
        name,
        description,
        site_id,
        ssh_key_id,
    ):
        url = self._get_ssh_key_endpoint(org_name, team_name)
        create_obj = {
            "name": name,
            "description": description,
            "siteIds": site_id,
            "sshKeyIds": ssh_key_id,
        }
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="create_ssh_key_group",
        )
        return resp

    def update(  # noqa: D102
        self, org_name, team_name, ssh_key_group_id, name, description, site_id, ssh_key_id, version
    ):
        ep = self._get_ssh_key_endpoint(org_name, team_name)
        url = f"{ep}/{ssh_key_group_id}"
        update_obj = {
            "name": name,
            "description": description,
            "siteIds": site_id,
            "sshKeyIds": ssh_key_id,
            "version": version,
        }
        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(update_obj),
            operation_name="update_ssh_key_group",
        )
        return resp

    def remove(self, org_name, team_name, ssh_key_group_id):  # noqa: D102
        ep = self._get_ssh_key_endpoint(org_name, team_name)
        url = f"{ep}/{ssh_key_group_id}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove_ssh_key_group",
            json_response=False,
        )
        return resp


class GuestSSHKeyGroupAPI(SSHKeyGroupAPI):  # noqa: D101
    pass
