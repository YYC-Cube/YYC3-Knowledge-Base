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


class ConstraintAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _get_constraint_endpoint(org_name=None, _team_name=None, allocation=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "allocation", allocation, "constraint"])

    def list(self, org_name, team_name, provider, tenant, allocation):  # noqa: D102
        ep = self._get_constraint_endpoint(org_name, team_name, allocation)
        params = []
        if provider:
            params.append(f"infrastructureProviderId={provider}")
        if tenant:
            params.append(f"tenantId={tenant}")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])
        return chain(
            *[
                res
                for res in pagination_helper_header_page_reference(
                    self.connection, query, org_name=org_name, team_name=team_name, operation_name="list_constraint"
                )
                if res
            ]
        )

    def info(self, org_name, team_name, constraint, allocation):  # noqa: D102
        ep = self._get_constraint_endpoint(org_name, team_name, allocation)
        url = f"{ep}/{constraint}"
        resp = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="constraint_info"
        )
        return resp

    def create(  # noqa: D102
        self, org_name, team_name, allocation, resource_type, resource, constraint_type, constraint_value
    ):
        url = self._get_constraint_endpoint(org_name, team_name, allocation)
        create_obj = {
            "resourceType": resource_type,
            "resourceTypeId": resource,
            "constraintType": constraint_type,
            "constraintValue": constraint_value,
        }
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="create_constraint",
        )
        return resp

    def update(self, org_name, team_name, constraint, allocation, constraint_value):  # noqa: D102
        ep = self._get_constraint_endpoint(org_name, team_name, allocation)
        url = f"{ep}/{constraint}"
        update_obj = {
            "constraintValue": constraint_value,
        }
        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(update_obj),
            operation_name="update_constraint",
        )
        return resp

    def remove(self, org_name, team_name, constraint, allocation):  # noqa: D102
        ep = self._get_constraint_endpoint(org_name, team_name, allocation)
        url = f"{ep}/{constraint}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove_constraint",
            json_response=False,
        )
        return resp


class GuestConstraintAPI(ConstraintAPI):  # noqa: D101
    pass
