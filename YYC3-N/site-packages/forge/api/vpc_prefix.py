# Copyright (c) 2025, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from itertools import chain
import json
import logging
from typing import Optional

from ngcbase.api.pagination import pagination_helper_header_page_reference
from ngcbase.util.utils import format_org_team

logger = logging.getLogger(__name__)

PAGE_SIZE = 100

_VPC_PREFIX_RELATIONS = ("Vpc", "Tenant", "IPBlock")


class NeedsVpcOrSiteArgsError(TypeError):
    """Missing either the 'vpc' or 'site' argument."""


class VpcPrefixAPI:
    """VPC prefix operations."""

    def __init__(self, api_client):
        self.connection = api_client.connection
        self.config = api_client.config

    @staticmethod
    def _get_vpc_prefix_endpoint(org_name=None):
        org_team = format_org_team(org_name, None, plural_form=False)
        return "/".join(["v2", org_team, "forge", "vpc-prefix"])

    def list(
        self,
        query: Optional[str] = None,
        *,
        vpc: Optional[str] = None,
        site: Optional[str] = None,
        status: Optional[str] = None,
        org: Optional[str] = None,
    ):
        """List VPC prefixes."""
        if (vpc, site) == (None, None):
            raise NeedsVpcOrSiteArgsError("Must specify at least one of 'vpc' or 'site'.")
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        ep = self._get_vpc_prefix_endpoint(org_name)
        params = []
        if vpc:
            params.append(f"vpcId={vpc}")
        if site:
            params.append(f"siteId={site}")
        if query:
            params.append(f"query={query}")
        if status:
            params.append(f"status={status}")
        for relation in _VPC_PREFIX_RELATIONS:
            params.append(f"includeRelation={relation}")
        params.append("orderBy=UPDATED_DESC")
        params.append(f"pageSize={PAGE_SIZE}")
        query = "?".join([ep, "&".join(params)])
        return chain(
            *[
                res
                for res in pagination_helper_header_page_reference(
                    self.connection, query, org_name=org_name, operation_name="list_vpc_prefix"
                )
                if res
            ]
        )

    def info(self, vpc_prefix: str, *, org: Optional[str] = None):
        """Get information about a specific VPC prefix."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        ep = self._get_vpc_prefix_endpoint(org_name)
        url = f"{ep}/{vpc_prefix}"
        params = []
        for relation in _VPC_PREFIX_RELATIONS:
            params.append(f"includeRelation={relation}")
        query = "?".join([url, "&".join(params)])
        resp = self.connection.make_api_request("GET", query, auth_org=org_name, operation_name="info_vpc_prefix")
        return resp

    def create(
        self,
        name: str,
        *,
        vpc: str,
        prefix_length: int,
        ip_block: Optional[str] = None,
        org: Optional[str] = None,
    ):
        """Create a new VPC prefix."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        url = self._get_vpc_prefix_endpoint(org_name)
        create_obj = {
            "name": name,
            "vpcId": vpc,
            "prefixLength": prefix_length,
        }
        if ip_block is not None:
            create_obj["ipBlockId"] = ip_block
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            payload=json.dumps(create_obj),
            operation_name="create_vpc_prefix",
        )
        return resp

    def update(
        self,
        vpc_prefix: str,
        *,
        name: Optional[str] = None,
        org: Optional[str] = None,
    ):
        """Update a VPC prefix."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        ep = self._get_vpc_prefix_endpoint(org_name)
        url = f"{ep}/{vpc_prefix}"
        update_obj = {}
        if name is not None:
            update_obj["name"] = name
        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org_name,
            payload=json.dumps(update_obj),
            operation_name="update_vpc_prefix",
        )
        return resp

    def remove(
        self,
        vpc_prefix: str,
        *,
        org: Optional[str] = None,
    ):
        """Remove a VPC prefix."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        ep = self._get_vpc_prefix_endpoint(org_name)
        url = f"{ep}/{vpc_prefix}"
        self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            operation_name="remove_vpc_prefix",
            json_response=False,
        )
        logger.info("Successfully removed %r.", vpc_prefix)


class GuestVpcPrefixAPI(VpcPrefixAPI):  # noqa: D101
    pass
