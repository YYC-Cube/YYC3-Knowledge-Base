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


class SSHKeyAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _get_ssh_key_endpoint(org_name=None, _team_name=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "sshkey"])

    def list(self, org_name, team_name, target):  # noqa: D102
        ep = self._get_ssh_key_endpoint(org_name, team_name)
        params = []
        if target:
            params.append(f"query={target}")
        params.append("includeRelation=Tenant")
        params.append("orderBy=CREATED_ASC")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])
        return fetch_paginated_list(self.connection, query, org=org_name, operation_name="list_ssh_key")

    def info(self, org_name, team_name, ssh_key_id):  # noqa: D102
        ep = self._get_ssh_key_endpoint(org_name, team_name)
        url = f"{ep}/{ssh_key_id}"
        resp = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="ssh_key_info"
        )
        return resp

    def create(  # noqa: D102
        self,
        org_name,
        team_name,
        tenant,
        name,
        public_key,
        expiration,
    ):
        url = self._get_ssh_key_endpoint(org_name, team_name)
        create_obj = {
            "tenantId": tenant,
            "name": name,
            "publicKey": public_key,
            "expires": expiration.strftime("%Y-%m-%dT%H:%M:%S.%fZ") if expiration else expiration,
        }
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="create_ssh_key",
        )
        return resp

    def update(self, org_name, team_name, ssh_key_id, name):  # noqa: D102
        ep = self._get_ssh_key_endpoint(org_name, team_name)
        url = f"{ep}/{ssh_key_id}"
        update_obj = {
            "name": name,
        }
        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(update_obj),
            operation_name="update_ssh_key",
        )
        return resp

    def remove(self, org_name, team_name, ssh_key_id):  # noqa: D102
        ep = self._get_ssh_key_endpoint(org_name, team_name)
        url = f"{ep}/{ssh_key_id}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove_ssh_key",
            json_response=False,
        )
        return resp


class GuestSSHKeyAPI(SSHKeyAPI):  # noqa: D101
    pass
