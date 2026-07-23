# Copyright (c) 2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

import json
from typing import Dict, Optional

from forge.api.utils import fetch_paginated_list
from ngcbase.util.utils import extra_args, format_org_team

PAGE_SIZE = 100


class VpcAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.config = api_client.config

    @staticmethod
    def _get_vpc_endpoint(org_name=None, _team_name=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "vpc"])

    @extra_args
    def list(  # noqa: D102
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        site: Optional[str] = None,
        target: Optional[str] = None,
        status: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_vpc_endpoint(org_name, team_name)
        params = []
        if site:
            params.append(f"siteId={site}")
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
        return fetch_paginated_list(self.connection, query, org=org_name, operation_name="list_vpc")

    @extra_args
    def info(self, vpc: str, org: Optional[str] = None, team: Optional[str] = None):  # noqa: D102
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_vpc_endpoint(org_name, team_name)
        url = f"{ep}/{vpc}"
        params = []
        params.append("includeRelation=InfrastructureProvider")
        params.append("includeRelation=Tenant")
        params.append("includeRelation=Site")
        query = "?".join([url, "&".join(params)])
        resp = self.connection.make_api_request(
            "GET", query, auth_org=org_name, auth_team=team_name, operation_name="info_vpc"
        )
        return resp

    @extra_args
    def create(  # noqa: D102
        self,
        name: str,
        site: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        description: Optional[str] = None,
        security_group: Optional[str] = None,
        labels: Optional[Dict[str, str]] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        url = self._get_vpc_endpoint(org_name, team_name)
        create_obj = {
            "name": name,
            "description": description,
            "siteId": site,
        }

        if security_group:
            create_obj["networkSecurityGroupId"] = security_group
        if labels:
            create_obj["labels"] = labels

        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="create_vpc",
        )
        return resp

    @extra_args
    def update(  # noqa: D102
        self,
        vpc: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
        security_group: Optional[str] = None,
        detach_security_group: Optional[bool] = None,
        labels: Optional[Dict[str, str]] = None,
    ):
        if security_group and detach_security_group:
            raise TypeError("Cannot use 'security_group' with 'detach_security_group'.")
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_vpc_endpoint(org_name, team_name)
        url = f"{ep}/{vpc}"

        if detach_security_group:
            security_group = ""

        update_obj = {}
        if name is not None:
            update_obj["name"] = name
        if description is not None:
            update_obj["description"] = description
        if security_group is not None:
            update_obj["networkSecurityGroupId"] = security_group
        if labels is not None:
            update_obj["labels"] = labels

        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(update_obj),
            operation_name="update_vpc",
        )
        return resp

    @extra_args
    def remove(  # noqa: D102
        self,
        vpc: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_vpc_endpoint(org_name, team_name)
        url = f"{ep}/{vpc}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="delete_vpc",
            json_response=False,
        )
        return resp


class GuestVpcAPI(VpcAPI):  # noqa: D101
    pass
