# Copyright (c) 2025, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from dataclasses import dataclass
import json
import logging
from typing import Dict, List, Literal, Optional, Union

from forge.api.utils import fetch_paginated_list
from ngcbase.util.utils import format_org_team

logger = logging.getLogger(__name__)

PAGE_SIZE = 100

_SECURITY_GROUP_RELATIONS = ("Site", "Tenant")


class SecurityGroupAPI:
    """Security group operations."""

    @dataclass
    class Rule:
        """A rule for a security group.

        Can be used when creating/updating security groups via the SDK.
        """

        direction: Literal["INGRESS", "EGRESS"]
        action: Literal["PERMIT", "DENY"]
        source_prefix: str
        destination_prefix: str
        protocol: Literal["TCP", "UDP", "ICMP", "ANY"]
        priority: Optional[int] = None
        source_port_range: Optional[str] = None
        destination_port_range: Optional[str] = None
        name: Optional[str] = None

        # Map the snake_case used in python code to the camelCase expected by the server.
        _ALIAS_CONVERSIONS = {
            "source_prefix": "sourcePrefix",
            "destination_prefix": "destinationPrefix",
            "source_port_range": "sourcePortRange",
            "destination_port_range": "destinationPortRange",
        }

        def _to_dict(self):
            return {
                self._ALIAS_CONVERSIONS.get(key, key): value for key, value in vars(self).items() if value is not None
            }

        @classmethod
        def _from_dict(cls, obj):
            if isinstance(obj, cls):
                return obj
            reverse_conversions = {value: key for key, value in cls._ALIAS_CONVERSIONS.items()}
            kwargs = {reverse_conversions.get(key, key): value for key, value in obj.items()}
            return cls(**kwargs)

    def __init__(self, api_client):
        self.connection = api_client.connection
        self.config = api_client.config

    @staticmethod
    def _get_security_group_endpoint(org_name=None):
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "network-security-group"])

    def list(
        self,
        query: Optional[str] = None,
        *,
        site: Optional[str] = None,
        status: Optional[str] = None,
        org: Optional[str] = None,
    ):
        """List security groups."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        ep = self._get_security_group_endpoint(org_name)
        params = []
        if site:
            params.append(f"siteId={site}")
        if query:
            params.append(f"query={query}")
        if status:
            params.append(f"status={status}")
        for relation in _SECURITY_GROUP_RELATIONS:
            params.append(f"includeRelation={relation}")
        params.append("orderBy=CREATED_ASC")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])
        return fetch_paginated_list(self.connection, query, org=org_name, operation_name="list_security_group")

    def info(self, security_group: str, *, org: Optional[str] = None):
        """Get information about a specific security group."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        ep = self._get_security_group_endpoint(org_name)
        url = f"{ep}/{security_group}"
        params = []
        for relation in _SECURITY_GROUP_RELATIONS:
            params.append(f"includeRelation={relation}")
        query = "?".join([url, "&".join(params)])
        resp = self.connection.make_api_request("GET", query, auth_org=org_name, operation_name="info_security_group")
        return resp

    def list_rules(self, security_group: str, *, org: Optional[str] = None):
        """Get the rules for a specific security group."""
        return self.info(security_group, org=org).get("rules", [])

    def create(
        self,
        name: str,
        *,
        site: str,
        description: Optional[str] = None,
        labels: Optional[Dict[str, str]] = None,
        org: Optional[str] = None,
        rules: Optional[List[Union[Rule, Dict[str, Union[str, int]]]]] = None,
    ):
        """Create a new security group."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        url = self._get_security_group_endpoint(org_name)
        create_obj = {
            "name": name,
            "siteId": site,
        }
        if description:
            create_obj["description"] = description
        if labels:
            create_obj["labels"] = labels
        if rules:
            rules = [self.Rule._from_dict(rule)._to_dict() for rule in rules]  # pylint: disable=W0212
            create_obj["rules"] = rules
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            payload=json.dumps(create_obj),
            operation_name="create_security_group",
        )
        return resp

    def update(
        self,
        security_group: str,
        *,
        name: Optional[str] = None,
        description: Optional[str] = None,
        rules: Optional[List[Union[Rule, Dict[str, Union[str, int]]]]] = None,
        labels: Optional[Dict[str, str]] = None,
        org: Optional[str] = None,
    ):
        """Update a security group."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        ep = self._get_security_group_endpoint(org_name)
        url = f"{ep}/{security_group}"
        update_obj = {}
        if name is not None:
            update_obj["name"] = name
        if description is not None:
            update_obj["description"] = description
        if rules is not None:
            rules = [self.Rule._from_dict(rule)._to_dict() for rule in rules]  # pylint: disable=W0212
            update_obj["rules"] = rules
        if labels is not None:
            update_obj["labels"] = labels
        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org_name,
            payload=json.dumps(update_obj),
            operation_name="update_security_group",
        )
        return resp

    def remove(
        self,
        security_group: str,
        *,
        org: Optional[str] = None,
    ):
        """Remove a security group."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        ep = self._get_security_group_endpoint(org_name)
        url = f"{ep}/{security_group}"
        self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            operation_name="remove_security_group",
            json_response=False,
        )
        logger.info("Successfully removed %r.", security_group)


class GuestSecurityGroupAPI(SecurityGroupAPI):  # noqa: D101
    pass
