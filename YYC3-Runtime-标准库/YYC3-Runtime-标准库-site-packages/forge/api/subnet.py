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
from ngcbase.util.utils import extra_args, format_org_team

PAGE_SIZE = 100


class SubnetAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.config = api_client.config

    @staticmethod
    def _get_subnet_endpoint(org_name=None, _team_name=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "subnet"])

    @extra_args
    def list(  # noqa: D102
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        vpc: Optional[str] = None,
        target: Optional[str] = None,
        status: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_subnet_endpoint(org_name, team_name)
        params = []
        if vpc:
            params.append(f"vpcId={vpc}")
        if target:
            params.append(f"query={target}")
        if status:
            params.append(f"status={status}")
        params.append("includeRelation=Vpc")
        params.append("includeRelation=Tenant")
        params.append("includeRelation=IPv4Block")
        params.append("includeRelation=IPv6Block")
        params.append("orderBy=CREATED_ASC")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])
        return fetch_paginated_list(self.connection, query, org=org_name, operation_name="list_subnet")

    @extra_args
    def info(  # noqa: D102
        self,
        subnet: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_subnet_endpoint(org_name, team_name)
        url = f"{ep}/{subnet}"
        params = []
        params.append("includeRelation=Vpc")
        params.append("includeRelation=Tenant")
        params.append("includeRelation=IPv4Block")
        params.append("includeRelation=IPv6Block")
        query = "?".join([url, "&".join(params)])
        resp = self.connection.make_api_request(
            "GET", query, auth_org=org_name, auth_team=team_name, operation_name="subnet_info"
        )
        return resp

    @extra_args
    def create(  # noqa: D102
        self,
        name: str,
        vpc: str,
        prefix_length: int,
        org: Optional[str] = None,
        team: Optional[str] = None,
        description: Optional[str] = None,
        ipv4_block: Optional[str] = None,
        ipv6_block: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        if not (ipv4_block or ipv6_block):
            raise InvalidArgumentError("argument: --ipv4-block or --ipv6-block is required")
        if not 8 <= prefix_length <= 32:
            raise InvalidArgumentError("argument: --prefix-length allowed range is [8-32].")
        url = self._get_subnet_endpoint(org_name, team_name)
        create_obj = {
            "name": name,
            "description": description,
            "vpcId": vpc,
            "ipv4BlockId": ipv4_block,
            "ipv6BlockId": ipv6_block,
            "prefixLength": prefix_length,
        }
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="create_subnet",
        )
        return resp

    @extra_args
    def update(  # noqa: D102
        self,
        subnet: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_subnet_endpoint(org_name, team_name)
        url = f"{ep}/{subnet}"
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
            operation_name="update_subnet",
        )
        return resp

    @extra_args
    def remove(  # noqa: D102
        self,
        subnet: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ep = self._get_subnet_endpoint(org_name, team_name)
        url = f"{ep}/{subnet}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove_subnet",
            json_response=False,
        )
        return resp


class GuestSubnetAPI(SubnetAPI):  # noqa: D101
    pass
