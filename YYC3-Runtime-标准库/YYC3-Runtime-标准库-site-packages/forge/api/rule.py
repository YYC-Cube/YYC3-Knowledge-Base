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


class RuleAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _get_rule_endpoint(org_name=None, _team_name=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "security-group"])

    def list(self, org_name, team_name, vpc, subnet, instance):  # noqa: D102
        ep = self._get_rule_endpoint(org_name, team_name)
        params = []
        if vpc:
            params.append(f"vpcId={vpc}")
        if subnet:
            params.append(f"subnetId={subnet}")
        if instance:
            params.append(f"instanceId={instance}")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])
        return chain(
            *[
                res
                for res in pagination_helper_header_page_reference(
                    self.connection, query, org_name=org_name, team_name=team_name, operation_name="list_rule"
                )
                if res
            ]
        )

    def info(self, org_name, team_name, rule):  # noqa: D102
        ep = self._get_rule_endpoint(org_name, team_name)
        url = f"{ep}/{rule}"
        resp = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="info_rule"
        )
        return resp

    def create(  # noqa: D102
        self,
        org_name,
        team_name,
        name,
        description,
        tenant,
        vpc,
        subnet,
        instance,
        inbound,
        outbound,
        protocol,
        port_range,
        to_or_from_cidr,
        to_or_from_vpc,
        to_or_from_subnet,
        to_or_from_instance,
    ):
        url = self._get_rule_endpoint(org_name, team_name)
        create_obj = {
            "name": name,
            "description": description,
            "tenantId": tenant,
            "vpcId": vpc,
            "subnetId": subnet,
            "instanceId": instance,
            "securityPolicies": [
                {
                    "tenantId": tenant,
                    "inbound": inbound,
                    "outbound": outbound,
                    "protocol": protocol,
                    "portRange": port_range,
                    "toOrFromCidr": to_or_from_cidr,
                    "toOrFromVpcId": to_or_from_vpc,
                    "toOrFromSubnetId": to_or_from_subnet,
                    "toOrFromInstanceId": to_or_from_instance,
                }
            ],
        }
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="create_rule",
        )
        return resp

    def update(self, org_name, team_name, rule, name, description):  # noqa: D102
        ep = self._get_rule_endpoint(org_name, team_name)
        url = f"{ep}/{rule}"
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
            operation_name="update_rule",
        )
        return resp

    def remove(self, org_name, team_name, rule):  # noqa: D102
        ep = self._get_rule_endpoint(org_name, team_name)
        url = f"{ep}/{rule}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove_rule",
            json_response=False,
        )
        return resp


class GuestRuleAPI(RuleAPI):  # noqa: D101
    pass
