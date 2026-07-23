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
#

from basecommand.transformer.dataset import DatasetSearchTransformer
from basecommand.transformer.workspace import WorkspaceSearchTransformer
from ngcbase.api.pagination import pagination_helper_search
from ngcbase.api.search import (
    QUERY_FIELDS,
    SEARCH_FIELDS,
    SearchAPI,
    wrap_search_params,
)


# pylint: disable=super-init-not-called
class BaseCommandSearchAPI(SearchAPI):  # noqa: D101
    def __init__(self, api_client, connection=None):
        self.client = api_client
        self.connection = connection or api_client.connection

    def search_dataset(
        self,
        org,
        team,
        ace=None,
        user_client_id=None,
        owned=False,
        list_all=False,
        name=None,
        status=None,
        list_team=None,
    ):
        """Get a list of datsets."""
        # Datasets are all created at org scope, we still have to use team scope to see team sharing
        query = self._get_search_endpoint("DATASET", org=org, team=list_team)
        order = [{"field": "dateModified", "value": "DESC"}]
        filters = self._build_common_filter_fields(ace_name=ace, name=name, status=status)
        if list_all:
            query_string = "resourceId:*"
        else:
            query_string = f"createdBy:{user_client_id}"
            if not owned:
                query_string += f" OR sharedWithOrgs:{org}"
                if team:
                    query_string += f" OR sharedWithTeams:{org}/{team}"
        fields = SEARCH_FIELDS + ["prepopulated"]
        query_param = wrap_search_params(
            query=query_string, filters=filters, query_fields=QUERY_FIELDS, fields=fields, order_by=order
        )
        for result in pagination_helper_search(
            self.connection,
            group_value="DATASET",
            query=query,
            query_param=query_param,
            org_name=org,
            team_name=team,
            operation_name="search datasets",
        ):
            yield [DatasetSearchTransformer(res) for res in result]

    def search_workspaces(
        self, org, team=None, ace=None, user_client_id=None, owned=False, list_all=False, name=None, list_team=None
    ):
        """Get a list of workspaces."""
        # Workspaces are all created at org scope now, so don't allow search at team scope
        query = self._get_search_endpoint("WORKSPACE", org=org, team=list_team)
        order = [{"field": "dateModified", "value": "DESC"}]
        filters = self._build_common_filter_fields(ace_name=ace, name=name)
        if list_all:
            query_string = "resourceId:*"
        else:
            query_string = f"createdBy:{user_client_id}"
            if not owned:
                query_string += f" OR sharedWithOrgs:{org}"
                if team:
                    query_string += f" OR sharedWithTeams:{org}/{team}"
        query_param = wrap_search_params(
            query=query_string, filters=filters, query_fields=QUERY_FIELDS, fields=SEARCH_FIELDS, order_by=order
        )
        for result in pagination_helper_search(
            self.connection,
            group_value="WORKSPACE",
            query=query,
            query_param=query_param,
            org_name=org,
            team_name=team,
            operation_name="search workspaces",
        ):
            yield [WorkspaceSearchTransformer(res) for res in result]
