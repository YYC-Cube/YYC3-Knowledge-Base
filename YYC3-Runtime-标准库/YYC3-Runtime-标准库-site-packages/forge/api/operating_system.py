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


class OperatingSystemAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _get_operating_system_endpoint(org_name=None, _team_name=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "operating-system"])

    def list(self, org_name, team_name, target, status):  # noqa: D102
        ep = self._get_operating_system_endpoint(org_name, team_name)
        params = []
        if target:
            params.append(f"query={target}")
        if status:
            params.append(f"status={status}")
        params.append("includeRelation=InfrastructureProvider")
        params.append("includeRelation=Tenant")
        params.append("orderBy=CREATED_ASC")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])
        return fetch_paginated_list(self.connection, query, org=org_name, operation_name="list_operating_system")

    def info(self, org_name, team_name, operating_system):  # noqa: D102
        ep = self._get_operating_system_endpoint(org_name, team_name)
        url = f"{ep}/{operating_system}"
        params = []
        params.append("includeRelation=InfrastructureProvider")
        params.append("includeRelation=Tenant")
        query = "?".join([url, "&".join(params)])
        resp = self.connection.make_api_request(
            "GET", query, auth_org=org_name, auth_team=team_name, operation_name="info_operating_system"
        )
        return resp

    def create(  # noqa: D102
        self,
        org_name,
        team_name,
        name,
        description,
        provider,
        tenant,
        ipxe_script,
        user_data,
        cloud_init,
        allow_override,
        image_url,
        image_sha,
        image_auth,
        image_auth_token,
        image_disk,
        root_fs_id,
        enable_phone_home,
        root_fs_label,
    ):
        url = self._get_operating_system_endpoint(org_name, team_name)
        create_obj = {
            "name": name,
            "description": description,
            "infrastructureProviderId": provider,
            "tenantId": tenant,
            "ipxeScript": ipxe_script,
            "userData": user_data,
            "isCloudInit": cloud_init,
            "allowOverride": allow_override,
            "imageUrl": image_url,
            "imageSha": image_sha,
            "imageAuthType": image_auth,
            "imageAuthToken": image_auth_token,
            "imageDisk": image_disk,
            "rootFsId": root_fs_id,
            "phoneHomeEnabled": enable_phone_home,
            "rootFsLabel": root_fs_label,
        }
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="create_operating_system",
        )
        return resp

    def update(  # noqa: D102
        self,
        org_name,
        team_name,
        operating_system,
        name,
        description,
        ipxe_script,
        user_data,
        cloud_init,
        allow_override,
        image_url,
        image_sha,
        image_auth,
        image_auth_token,
        image_disk,
        root_fs_id,
        enable_phone_home,
        root_fs_label,
        is_active=None,
        deactivation_note=None,
    ):
        ep = self._get_operating_system_endpoint(org_name, team_name)
        url = f"{ep}/{operating_system}"
        update_obj = {
            "name": name,
            "description": description,
            "ipxeScript": ipxe_script,
            "userData": user_data,
            "isCloudInit": cloud_init,
            "allowOverride": allow_override,
            "imageUrl": image_url,
            "imageSha": image_sha,
            "imageAuthType": image_auth,
            "imageAuthToken": image_auth_token,
            "imageDisk": image_disk,
            "rootFsId": root_fs_id,
            "phoneHomeEnabled": enable_phone_home,
            "rootFsLabel": root_fs_label,
            "isActive": is_active,
            "deactivationNote": deactivation_note,
        }
        update_obj = {key: value for key, value in update_obj.items() if value is not None}
        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(update_obj),
            operation_name="update_operating_system",
        )
        return resp

    def remove(self, org_name, team_name, operating_system):  # noqa: D102
        ep = self._get_operating_system_endpoint(org_name, team_name)
        url = f"{ep}/{operating_system}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove_operating_system",
            json_response=False,
        )
        return resp


class GuestOperatingSystemAPI(OperatingSystemAPI):  # noqa: D101
    pass
