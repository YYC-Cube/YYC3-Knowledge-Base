# Copyright (c) 2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from itertools import chain
import json
from typing import List, Optional, Union

from forge.api.utils import fetch_paginated_list
from ngcbase.api.pagination import pagination_helper_header_page_reference
from ngcbase.util.utils import extra_args, format_org_team, has_org_role

PAGE_SIZE = 100


class InstanceTypeAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.config = api_client.config
        self.client = api_client

    @staticmethod
    def _get_instance_type_endpoint(org_name=None, _team_name=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "instance/type"])

    @extra_args
    def list(  # noqa: D102
        self,
        site: str,
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
        ep = self._get_instance_type_endpoint(org_name, team_name)
        params = []
        if site:
            params.append(f"siteId={site}")
        if provider:
            params.append(f"infrastructureProviderId={provider}")
        if tenant:
            params.append(f"tenantId={tenant}")
        if target:
            params.append(f"query={target}")
        if status:
            params.append(f"status={status}")
        params.append("includeRelation=InfrastructureProvider")
        params.append("includeRelation=Site")
        params.append("orderBy=CREATED_ASC")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])

        return fetch_paginated_list(self.connection, query, org=org_name, operation_name="list_instance_type")

    @extra_args
    def info(  # noqa: D102
        self,
        instance_type: str,
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
        ep = self._get_instance_type_endpoint(org_name, team_name)
        url = f"{ep}/{instance_type}"
        params = []
        if provider:
            params.append("includeMachineAssignment=true")
        if tenant:
            params.append("includeAllocationStats=true")
        params.append("includeRelation=InfrastructureProvider")
        params.append("includeRelation=Site")
        query = "?".join([url, "&".join(params)])
        resp = self.connection.make_api_request(
            "GET", query, auth_org=org_name, auth_team=team_name, operation_name="info_instance_type"
        )
        return resp

    @extra_args
    def create(  # noqa: D102
        self,
        name: str,
        site: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        display_name: Optional[str] = None,
        description: Optional[str] = None,
        controller_machine_type: Optional[str] = None,
        machine_capabilities: Optional[List[dict[str, Union[int, str]]]] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        url = self._get_instance_type_endpoint(org_name, team_name)
        create_obj = {
            "name": name,
            "displayName": display_name,
            "description": description,
            "controllerMachineType": controller_machine_type,
            "machineCapabilities": machine_capabilities,
            "siteId": site,
        }
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="create_instance_type",
        )
        return resp

    @extra_args
    def update(  # noqa: D102
        self,
        instance_type: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        name: Optional[str] = None,
        display_name: Optional[str] = None,
        description: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_instance_type_endpoint(org_name, team_name)
        url = f"{ep}/{instance_type}"
        update_obj = {
            "name": name,
            "displayName": display_name,
            "description": description,
        }
        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(update_obj),
            operation_name="update_instance_type",
        )
        return resp

    @extra_args
    def remove(  # noqa: D102
        self,
        instance_type: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_instance_type_endpoint(org_name, team_name)
        url = f"{ep}/{instance_type}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove_instance_type",
            json_response=False,
        )
        return resp

    @extra_args
    def list_machine(  # noqa: D102
        self,
        instance_type: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_instance_type_endpoint(org_name, team_name)
        url = f"{ep}/{instance_type}/machine"
        return chain(
            *[
                res
                for res in pagination_helper_header_page_reference(
                    self.connection,
                    url,
                    org_name=org_name,
                    team_name=team_name,
                    operation_name="list_instance_type_machine",
                )
                if res
            ]
        )

    @extra_args
    def assign(  # noqa: D102
        self,
        instance_type: str,
        machine: List[str],
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_instance_type_endpoint(org_name, team_name)
        url = f"{ep}/{instance_type}/machine"
        create_obj = {
            "machineIds": machine,
        }
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="assign_instance_type_machine",
        )
        return resp

    @extra_args
    def unassign(  # noqa: D102
        self,
        instance_type: str,
        association: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_instance_type_endpoint(org_name, team_name)
        url = f"{ep}/{instance_type}/machine/{association}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="unassign_instance_type_machine",
            json_response=False,
        )
        return resp


class GuestInstanceTypeAPI(InstanceTypeAPI):  # noqa: D101
    pass
