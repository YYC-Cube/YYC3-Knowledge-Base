# Copyright (c) 2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from itertools import chain
import json

from forge.api.utils import fetch_paginated_list
from ngcbase.api.pagination import pagination_helper_header_page_reference
from ngcbase.util.utils import format_org_team

PAGE_SIZE = 100


class InstanceAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _get_instance_endpoint(org_name=None, _team_name=None):
        # Forge doesn't have teams currently. Drop the 'team' part.
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "instance"])

    def list(self, org_name, team_name, site, vpc, provider, tenant, target, status):  # noqa: D102
        ep = self._get_instance_endpoint(org_name, team_name)
        params = []
        if provider:
            params.append(f"infrastructureProviderId={provider}")
        if tenant:
            params.append(f"tenantId={tenant}")
        if site:
            params.append(f"siteId={site}")
        if vpc:
            params.append(f"vpcId={vpc}")
        if target:
            params.append(f"query={target}")
        if status:
            params.append(f"status={status}")
        params.append("includeRelation=InfrastructureProvider")
        params.append("includeRelation=Tenant")
        params.append("includeRelation=Site")
        params.append("includeRelation=InstanceType")
        params.append("includeRelation=Allocation")
        params.append("includeRelation=Vpc")
        params.append("includeRelation=Machine")
        params.append("includeRelation=OperatingSystem")
        params.append("orderBy=CREATED_ASC")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])
        return fetch_paginated_list(self.connection, query, org=org_name, operation_name="list_instance")

    def info(self, org_name, team_name, instance):  # noqa: D102
        ep = self._get_instance_endpoint(org_name, team_name)
        url = f"{ep}/{instance}"
        params = []
        params.append("includeRelation=InfrastructureProvider")
        params.append("includeRelation=Tenant")
        params.append("includeRelation=Site")
        params.append("includeRelation=InstanceType")
        params.append("includeRelation=Allocation")
        params.append("includeRelation=Vpc")
        params.append("includeRelation=Machine")
        params.append("includeRelation=OperatingSystem")
        query = "?".join([url, "&".join(params)])
        resp = self.connection.make_api_request(
            "GET", query, auth_org=org_name, auth_team=team_name, operation_name="info_instance"
        )
        return resp

    def create(  # noqa: D102
        self,
        org_name,
        team_name,
        name,
        tenant,
        instance_type,
        vpc,
        operating_system,
        user_data,
        ipxe_script,
        always_boot_custom_ipxe,
        interfaces,
        infiniband_interfaces,
        ssh_key_group,
        labels,
        enable_phone_home,
        description=None,
        security_group=None,
    ):
        url = self._get_instance_endpoint(org_name, team_name)
        create_obj = {
            "name": name,
            "tenantId": tenant,
            "instanceTypeId": instance_type,
            "vpcId": vpc,
            "operatingSystemId": operating_system,
            "userdata": user_data,
            "ipxeScript": ipxe_script,
            "alwaysBootWithCustomIpxe": always_boot_custom_ipxe,
            "interfaces": interfaces,
            "infinibandInterfaces": infiniband_interfaces,
            "sshKeyGroupsIds": ssh_key_group,
            "labels": labels,
            "phoneHomeEnabled": enable_phone_home,
            "description": description,
        }

        if security_group:
            create_obj["networkSecurityGroupId"] = security_group

        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(create_obj),
            operation_name="create_instance",
        )
        return resp

    def update(  # noqa: D102
        self,
        org_name,
        team_name,
        instance,
        name,
        reboot,
        reboot_custom_ipxe,
        enable_phone_home,
        labels=None,
        operating_system=None,
        description=None,
        security_group=None,
        detach_security_group=False,
    ):
        ep = self._get_instance_endpoint(org_name, team_name)
        url = f"{ep}/{instance}"
        update_obj = {
            "name": name,
            "triggerReboot": reboot,
            "rebootWithCustomIpxe": reboot_custom_ipxe,
            "phoneHomeEnabled": enable_phone_home,
            "labels": labels,
            "operatingSystemId": operating_system,
            "description": description,
        }

        if detach_security_group:
            security_group = ""
        if security_group is not None:
            update_obj["networkSecurityGroupId"] = security_group

        # `None` means the CLI didn't provide a value. Remove all `None`s from the patch output.
        update_obj = {key: value for key, value in update_obj.items() if value is not None}
        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(update_obj),
            operation_name="update_instance",
        )
        return resp

    def remove(self, org_name, team_name, instance):  # noqa: D102
        ep = self._get_instance_endpoint(org_name, team_name)
        url = f"{ep}/{instance}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove_instance",
            json_response=False,
        )
        return resp

    def list_interface(self, org_name, team_name, instance):  # noqa: D102
        ep = self._get_instance_endpoint(org_name, team_name)
        url = f"{ep}/{instance}/interface"
        return chain(
            *[
                res
                for res in pagination_helper_header_page_reference(
                    self.connection,
                    url,
                    org_name=org_name,
                    team_name=team_name,
                    operation_name="list_instance_interface",
                )
                if res
            ]
        )


class GuestInstanceAPI(InstanceAPI):  # noqa: D101
    pass
