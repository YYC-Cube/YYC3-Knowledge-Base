# Copyright (c) 2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from itertools import chain
import json

from ngcbase.api.pagination import pagination_helper_header_page_reference
from ngcbase.util.utils import format_org_team

PAGE_SIZE = 100


class IpblockAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _get_ipblock_endpoint(org_name=None, _team_name=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "ipblock"])

    def list(self, org_name, team_name, provider, tenant, site, target, status, ipblock=None):  # noqa: D102
        ep = self._get_ipblock_endpoint(org_name, team_name)
        if ipblock:
            ep = f"{ep}/{ipblock}/derived"
        params = []
        if provider:
            params.append(f"infrastructureProviderId={provider}")
        if tenant:
            params.append(f"tenantId={tenant}")
        if site:
            params.append(f"siteId={site}")
        if target:
            params.append(f"query={target}")
        if status:
            params.append(f"status={status}")
        params.append("includeRelation=InfrastructureProvider")
        params.append("includeRelation=Tenant")
        params.append("includeRelation=Site")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])
        return chain(
            *[
                res
                for res in pagination_helper_header_page_reference(
                    self.connection, query, org_name=org_name, team_name=team_name, operation_name="list_ipblock"
                )
                if res
            ]
        )

    def info(self, org_name, team_name, ipblock, provider, tenant):  # noqa: D102
        ep = self._get_ipblock_endpoint(org_name, team_name)
        url = f"{ep}/{ipblock}"
        params = []
        if provider:
            params.append(f"infrastructureProviderId={provider}")
        if tenant:
            params.append(f"tenantId={tenant}")
        params.append("includeRelation=InfrastructureProvider")
        params.append("includeRelation=Tenant")
        params.append("includeRelation=Site")
        query = "?".join([url, "&".join(params)])
        resp = self.connection.make_api_request(
            "GET", query, auth_org=org_name, auth_team=team_name, operation_name="info_ipblock"
        )
        return resp

    def create(  # noqa: D102
        self,
        org_name,
        team_name,
        name,
        description,
        site,
        routing_type,
        prefix,
        prefix_length,
        protocol_version,
    ):
        url = self._get_ipblock_endpoint(org_name, team_name)
        create_obj = {
            "name": name,
            "description": description,
            "siteId": site,
            "routingType": routing_type,
            "prefix": prefix,
            "prefixLength": prefix_length,
            "protocolVersion": protocol_version,
        }
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="create_ipblock",
        )
        return resp

    def update(self, org_name, team_name, ipblock, name, description):  # noqa: D102
        ep = self._get_ipblock_endpoint(org_name, team_name)
        url = f"{ep}/{ipblock}"
        update_obj = {
            "name": name,
            "description": description,
        }
        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(update_obj),
            operation_name="update_ipblock",
        )
        return resp

    def remove(self, org_name, team_name, ipblock):  # noqa: D102
        ep = self._get_ipblock_endpoint(org_name, team_name)
        url = f"{ep}/{ipblock}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove_ipblock",
            json_response=False,
        )
        return resp


class GuestIpblockAPI(IpblockAPI):  # noqa: D101
    pass
