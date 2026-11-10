#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. ALL RIGHTS RESERVED.
#
# This software product is a proprietary product of Nvidia Corporation and its affiliates
# (the "Company") and all right, title, and interest in and to the software
# product, including all associated intellectual property rights, are and
# shall remain exclusively with the Company.
#
# This software product is governed by the End User License Agreement
# provided with the software product.

from itertools import chain
import logging
from typing import Literal, Optional

from basecommand.data.api.AceListResponse import AceListResponse
from basecommand.data.api.AceResponse import AceResponse
from ngcbase.api.pagination import pagination_helper
from ngcbase.constants import API_VERSION, PAGE_SIZE
from ngcbase.errors import NgcException
from ngcbase.util.utils import extra_args, url_encode

logger = logging.getLogger(__name__)

_NO_ACE_RESOURCES_FOUND_ERROR_MESSAGE = """\
This ACE has not been configured, and as a result, no usage information is available.

Please report this issue: https://nvcrm.my.site.com/ESPCommunity/s/create-case"""


class AceAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.config = api_client.config

    @staticmethod
    def _construct_url(org_name, ace_name=None, team_name=None):
        """Constructs ace url depending on given parameters."""  # noqa: D401
        base_method = "{api_version}/org/{org_name}".format(api_version=API_VERSION, org_name=org_name)
        if team_name:
            base_method = f"{base_method}/team/{team_name}"
        if ace_name:
            base_method = "{url_method}/aces/{ace_name}".format(url_method=base_method, ace_name=ace_name)
        else:
            base_method = "{url_method}/aces".format(url_method=base_method)
        return base_method

    def get_aces(self, org_name, team_name=None):
        """Get list of ACEs. Given team name filters on basis of it."""
        query = "{url}?page_size={page_size}".format(
            url=self._construct_url(org_name, team_name=team_name), page_size=PAGE_SIZE
        )
        return chain(
            *[
                AceListResponse(res).aces
                for res in pagination_helper(
                    self.connection, query, org_name=org_name, team_name=team_name, operation_name="get aces"
                )
                if AceListResponse(res).aces
            ]
        )

    # TODO: Remove ace_id once backwards compatibility support is removed
    def get_ace_details(self, org_name, ace_name=None, ace_id=None, team_name=None):
        """Gets detail of an ACE."""  # noqa: D401
        if not ace_name and not ace_id:
            raise NgcException("Please provide ACE name.")

        if ace_name:
            ace_name = url_encode(ace_name)
        else:
            ace_name = ace_id

        response = self.connection.make_api_request(
            "GET",
            self._construct_url(org_name, ace_name, team_name),
            auth_org=org_name,
            auth_team=team_name,
            operation_name="get ace details",
        )
        return AceResponse(response).ace

    @extra_args
    def list(self, org: Optional[str] = None, team: Optional[str] = None):
        """List ACEs in the org."""
        self.config.validate_configuration()
        org = org or self.config.org_name
        team = team or self.config.team_name
        ace_list = self.get_aces(org_name=org, team_name=team)
        return ace_list

    @extra_args
    def info(self, ace: str, org: Optional[str] = None, team: Optional[str] = None):
        """Gets detail of an ACE."""  # noqa: D401
        self.config.validate_configuration()
        org = org or self.config.org_name
        team = team or self.config.team_name
        ace_details = self.get_ace_details(org_name=org, ace_name=ace, team_name=team)
        return ace_details

    @extra_args
    def usage(
        self,
        ace: str,
        *,
        org: Optional[str] = None,
        team: Optional[str] = None,
        resource_type: Optional[Literal["GPU", "CPU", "MIG"]] = None,
        only_unavailable: bool = False,
    ):
        """Get resource usage information about an ACE.

        ACE usage is deprecated and may not be configured on all ACEs.
        """
        logger.warning("Warning: ACE usage is deprecated and may not be configured on all ACEs.")
        self.config.validate_configuration()
        org = org or self.config.org_name
        team = team or self.config.team_name

        endpoint = self._construct_url(org, ace, team) + "/usage"

        response = self.connection.make_api_request(
            "GET",
            endpoint,
            auth_org=org,
            auth_team=team,
            operation_name="get ace usage",
        )
        items = response["resourceUsages"]
        if not items:
            # No items means the ACE isn't configured. That's bad and will likely need our intervention
            raise NgcException(_NO_ACE_RESOURCES_FOUND_ERROR_MESSAGE)

        if only_unavailable:
            items = [item for item in items if item.get("unavailableCount")]
        if resource_type:
            items = [item for item in items if item["type"] == resource_type]

        return items
