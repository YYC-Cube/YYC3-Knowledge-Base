#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.api.pagination import pagination_helper_search
from ngcbase.api.utils import NameSpaceObj
from ngcbase.errors import AccessDeniedException
from ngcbase.util.utils import format_org_team

QUERY_FIELDS = ["name", "displayName", "description", "all"]

SEARCH_FIELDS = [
    "attributes",
    "createdBy",
    "dateCreated",
    "dateModified",
    "description",
    "displayName",
    "guestAccess",
    "isPublic",
    "labels",
    "latestVersionId",
    "name",
    "orgName",
    "sharedWithOrgs",
    "sharedWithTeams",
    "teamName",
]

SEARCH_DEFAULT_PAGE_SIZE = 100
# Note: the field in search for relevance is called `score`.
DEFAULT_SEARCH_ORDER = [{"field": "score", "value": "ASC"}]


def wrap_search_params(  # noqa: D103
    query,
    filters=None,
    query_fields=None,
    fields=None,
    order_by=None,
    page_size=SEARCH_DEFAULT_PAGE_SIZE,
):
    search_params = NameSpaceObj({})
    search_params.query = query
    search_params.filters = filters or []
    search_params.queryFields = query_fields or []
    search_params.fields = fields or []
    search_params.pageSize = page_size
    search_params.orderBy = order_by or []
    search_params.isValid()

    return search_params


class SearchAPI:  # noqa: D101
    def __init__(self, api_client, connection):
        self.client = api_client
        self.connection = connection

    @staticmethod
    def _get_search_endpoint(resource_name, org=None, team=None, subscriber=False):
        """There are three API's that return list of artifacts.

        1.) artifacts in the private registry: /v2/search/org/<ORG-NAME>/resources/<ARTIFACT-TYPE>
        2.) artifacts in the public catalog: /v2/search/catalog/resources/<ARTIFACT-TYPE>
        3.) artifacts that are product-gated: /v2/search/subscriber/catalog/resources/<ARTIFACT-TYPE>
        """
        org_team = format_org_team(org, team)
        subscriber_endpoint = "subscriber/catalog" if subscriber else ""
        parts = ["v2", "search", org_team or subscriber_endpoint or "catalog", "resources", resource_name]
        return "/".join([part for part in parts if part])

    def _run_search_query(self, resource_type, resource_matcher, org, team, subscriber, filter_list=None):
        query = self._get_search_endpoint(resource_type, org=org, team=team, subscriber=subscriber)
        query_param = wrap_search_params(
            query=f"resourceId:{resource_matcher or '*'}",
            query_fields=QUERY_FIELDS,
            fields=SEARCH_FIELDS,
            order_by=DEFAULT_SEARCH_ORDER,
            filters=filter_list or [],
        )
        pages = pagination_helper_search(
            self.connection,
            group_value=resource_type,
            query=query,
            query_param=query_param,
            org_name=org,
            team_name=team,
            operation_name=f"search {resource_type}",
        )
        ret = []
        try:
            for pg in pages:
                ret.extend(pg)
        except AccessDeniedException:
            # User doesn't have correct role permissions for query
            pass
        return ret

    @staticmethod
    def _build_common_filter_fields(ace_name=None, user_client_id=None, name=None, status=None):
        filter_list = []
        if ace_name:
            filter_list.append({"field": "aceName", "value": ace_name})
        if user_client_id:
            filter_list.append({"field": "createdBy", "value": user_client_id})
        if name:
            filter_list.append({"field": "name", "value": name})
        if status:
            for x in status:
                filter_list.append({"field": "status", "value": x})
        return filter_list


class GuestSearchAPI(SearchAPI):  # noqa: D101
    @staticmethod
    def _get_search_endpoint(resource_name, org=None, team=None):
        return "v2/search/catalog/resources/{}".format(resource_name)
