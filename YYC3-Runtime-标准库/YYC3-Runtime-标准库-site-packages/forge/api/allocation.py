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
from ngcbase.errors import InvalidArgumentError
from ngcbase.util.utils import format_org_team, has_org_role

PAGE_SIZE = 100


class AllocationAPI:  # noqa: D101
    def __init__(self, api_client):
        self.config = api_client.config
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _get_allocation_endpoint(org_name=None, _team_name=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "allocation"])

    def list(  # noqa: D102
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        provider: Optional[str] = None,
        tenant: Optional[str] = None,
        site: Optional[str] = None,
        resource_type: Optional[str] = None,
        target: Optional[str] = None,
        status: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        if not (provider or tenant):
            user_resp = self.client.users.user_who(org_name)
            if has_org_role(user_resp, org_name, ["FORGE_PROVIDER_ADMIN"]):
                provider_info, _ = self.client.forge.provider.info(org_name, team_name)
                provider = provider_info.get("id", "")
            elif has_org_role(user_resp, org_name, ["FORGE_TENANT_ADMIN"]) and not tenant:
                tenant_info, _ = self.client.forge.tenant.info(org_name, team_name)
                tenant = tenant_info.get("id", "")
        ep = self._get_allocation_endpoint(org_name, team_name)
        params = []
        if provider:
            params.append(f"infrastructureProviderId={provider}")
        if tenant:
            params.append(f"tenantId={tenant}")
        if site:
            params.append(f"siteId={site}")
        if resource_type:
            params.append(f"resourceType={resource_type}")
        if target:
            params.append(f"query={target}")
        if status:
            params.append(f"status={status}")
        params.append("includeRelation=InfrastructureProvider")
        params.append("includeRelation=Tenant")
        params.append("includeRelation=Site")
        params.append("orderBy=CREATED_ASC")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])
        return fetch_paginated_list(self.connection, query, org=org_name, operation_name="list_allocation")

    def info(  # noqa: D102
        self,
        allocation: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
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
        ep = self._get_allocation_endpoint(org_name, team_name)
        url = f"{ep}/{allocation}"
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
            "GET", query, auth_org=org_name, auth_team=team_name, operation_name="info_allocation"
        )
        return resp

    def create(  # noqa: D102
        self,
        name: str,
        site: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        tenant: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource: Optional[str] = None,
        constraint_type: Optional[str] = None,
        constraint_value: Optional[int] = None,
        description=None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        if not tenant:
            user_resp = self.client.users.user_who(org_name)
            if has_org_role(user_resp, org_name, ["FORGE_TENANT_ADMIN"]):
                tenant_info, _ = self.client.forge.tenant.info(org_name, team_name)
                tenant = tenant_info.get("id", "")
            else:
                raise InvalidArgumentError("argument: --tenant is required.")
        url = self._get_allocation_endpoint(org_name, team_name)
        create_obj = {
            "name": name,
            "description": description,
            "tenantId": tenant,
            "siteId": site,
            "allocationConstraints": [
                {
                    "resourceType": resource_type,
                    "resourceTypeId": resource,
                    "constraintType": constraint_type,
                    "constraintValue": constraint_value,
                }
            ],
        }
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="create_allocation",
        )
        return resp

    def update(  # noqa: D102
        self,
        allocation,
        org: Optional[str] = None,
        team: Optional[str] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
        constraint: Optional[str] = None,
        constraint_value: Optional[int] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        if constraint_value and not constraint:
            raise InvalidArgumentError("argument: constraint is required.")
        ep = self._get_allocation_endpoint(org_name, team_name)
        if constraint and constraint_value:
            url = f"{ep}/{allocation}/constraint/{constraint}"
            update_obj = {"constraintValue": constraint_value}
            resp = self.connection.make_api_request(
                "PATCH",
                url,
                auth_org=org_name,
                auth_team=team_name,
                payload=json.dumps(update_obj),
                operation_name="update_allocation_constraint",
            )
        url = f"{ep}/{allocation}"
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
            operation_name="update_allocation",
        )
        return resp

    def remove(  # noqa: D102
        self,
        allocation: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_allocation_endpoint(org_name, team_name)
        url = f"{ep}/{allocation}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove_allocation",
            json_response=False,
        )
        return resp


class GuestAllocationAPI(AllocationAPI):  # noqa: D101
    pass
