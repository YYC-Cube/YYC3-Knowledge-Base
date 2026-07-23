#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import json
import logging
import math
from typing import Iterator

from ngcbase.api.utils import NameSpaceObj

logger = logging.getLogger(__name__)


def _add_query_param(url, qp):
    """Adds the query params with '?' if there isn't already a param, and with '&' if there is."""  # noqa: D401
    join_char = "&" if "?" in url else "?"
    return f"{url}{join_char}{qp}"


def pagination_helper(
    connection,
    query,
    org_name=None,
    team_name=None,
    operation_name=None,
    page_limit=None,
    request_limit=None,
    page_number=None,
    kas_direct=False,
    extra_auth_headers=None,
):
    """Currently, this only handles calling the query URL with page number.
    `page-size`, `query`, and any other parameters should be included in the URL passed for
    the `query` argument.
    """  # noqa: D205, D401
    query_page = _add_query_param(query, f"page-number={page_number}") if page_number is not None else query
    query_response = connection.make_api_request(
        "GET",
        query_page,
        auth_org=org_name,
        auth_team=team_name,
        operation_name=operation_name,
        kas_direct=kas_direct,
        extra_auth_headers=extra_auth_headers,
    )
    yield query_response

    if "paginationInfo" in query_response:
        pagination_info = NameSpaceObj(query_response["paginationInfo"])
        if pagination_info.totalResults > pagination_info.size:
            number_of_pages = math.ceil(pagination_info.totalResults // pagination_info.size) + 1
            if page_limit:
                number_of_pages = min(number_of_pages, page_limit)
            current_page = page_number + 1 if page_number is not None else 1
            number_of_pages = int(number_of_pages) - 1
            list_of_dataset_url = []
            while current_page <= number_of_pages:
                query_page = _add_query_param(query, f"page-number={current_page}")
                list_of_dataset_url.append(query_page)
                current_page += 1
            # make async multiple request
            for res in connection.make_multiple_request(
                "GET",
                list_of_dataset_url,
                auth_org=org_name,
                auth_team=team_name,
                operation_name=operation_name,
                request_limit=request_limit,
                kas_direct=kas_direct,
                extra_auth_headers=extra_auth_headers,
            ):
                yield res


def pagination_helper_page_reference_iter_total_pages(
    connection,
    endpoint,
    *,
    org_name=None,
    team_name=None,
    operation_name=None,
    kas_direct=False,
    extra_auth_headers=None,
) -> Iterator:
    """Iterate over paginated API responses using the 'totalPages' value.

    Assumes that the API defaults to a page size of 100 if not specified in query parameter.

    Parameters:
        connection:
            An object that provides a `make_api_request(method, endpoint, **kwargs)` method
            to perform HTTP requests.
        endpoint (str):
            The API endpoint path to request (e.g., "v3/model", "v3/resource").
        org_name (str, optional):
            Organization name used for authentication or scoping.
        team_name (str, optional):
            Team name used for authentication or scoping.
        operation_name (str, optional):
            Optional operation name for tracing or logging purposes.
        kas_direct (bool, optional):
            Whether to bypass proxy routing and go direct to the backend. Default is False.
        extra_auth_headers (dict, optional):
            Any additional authentication headers to include in the request.

    Yields:
        dict: API response for each page in the paginated result.

    Notes:
        - The function yields the initial response and continues fetching additional pages
          up to `paginationInfo.totalPages`, if present.
        - If the `paginationInfo` field is missing or `totalPages` is not greater than 1,
          only the first page will be yielded.
        - The page size is assumed to be 100 by default unless otherwise specified by the backend.
    """
    common_kwargs = {
        "auth_org": org_name,
        "auth_team": team_name,
        "operation_name": operation_name,
        "kas_direct": kas_direct,
        "extra_auth_headers": extra_auth_headers,
    }

    response = connection.make_api_request("GET", endpoint, **common_kwargs)
    if not response:
        return
    yield response

    pagination = response.get("paginationInfo", {})
    for page_index in range(1, pagination.get("totalPages", 1)):
        paged_url = _add_query_param(endpoint, f"page-number={page_index}")
        logger.debug("Fetching additional pages: %s", paged_url)
        resp = connection.make_api_request("GET", paged_url, **common_kwargs)
        if not resp:
            break
        yield resp


def pagination_helper_use_page_reference(  # noqa: D103
    connection, query, org_name=None, team_name=None, operation_name=None, kas_direct=False, extra_auth_headers=None
):
    query_response = connection.make_api_request(
        "GET",
        query,
        auth_org=org_name,
        auth_team=team_name,
        operation_name=operation_name,
        kas_direct=kas_direct,
        extra_auth_headers=extra_auth_headers,
    )
    # make the first call to page reference
    if query_response:
        yield query_response

    if "paginationInfo" in query_response:
        pagination_info = NameSpaceObj(query_response["paginationInfo"])
        should_fetch_next_page = True
        while should_fetch_next_page:
            if pagination_info.nextPage:
                query_page = _add_query_param(query, f"page-reference={pagination_info.nextPage}")
                logger.debug("Query: %s", query_page)
                current_response = connection.make_api_request(
                    "GET",
                    query_page,
                    auth_org=org_name,
                    auth_team=team_name,
                    operation_name=operation_name,
                    kas_direct=kas_direct,
                    extra_auth_headers=extra_auth_headers,
                )
                yield current_response
                if "paginationInfo" in current_response:
                    pagination_info = NameSpaceObj(current_response["paginationInfo"])
                else:
                    should_fetch_next_page = False
            # if next page does not exists
            else:
                should_fetch_next_page = False


def pagination_helper_header_page_reference(  # noqa: D103
    connection, query, org_name=None, team_name=None, operation_name=None, kas_direct=False, extra_auth_headers=None
):
    query_response, response_headers = connection.make_api_request(
        "GET",
        query,
        auth_org=org_name,
        auth_team=team_name,
        operation_name=operation_name,
        response_headers=True,
        kas_direct=kas_direct,
        extra_auth_headers=extra_auth_headers,
    )
    # make the first call to page reference
    if query_response:
        yield query_response

    fetched = 0
    page_number = 1
    should_fetch_next_page = "X-Pagination" in response_headers
    while should_fetch_next_page:
        try:
            pagination_info = json.loads(response_headers["X-Pagination"])
            total = pagination_info.get("total", 0)
            page_size = pagination_info.get("pageSize", 0)
            page_number = pagination_info.get("pageNumber", page_number)
        except (ValueError, TypeError, json.decoder.JSONDecodeError) as e:
            logger.debug("Error reading pagination info: %s", e)
            break
        fetched += page_size
        page_number += 1
        if fetched < total:
            query_page = _add_query_param(query, f"pageNumber={page_number}")
            logger.debug("Query: %s", query_page)
            current_response, response_headers = connection.make_api_request(
                "GET",
                query_page,
                auth_org=org_name,
                auth_team=team_name,
                operation_name=operation_name,
                response_headers=True,
                kas_direct=kas_direct,
                extra_auth_headers=extra_auth_headers,
            )
            yield current_response
            should_fetch_next_page = "X-Pagination" in response_headers
        # if next page does not exists
        else:
            should_fetch_next_page = False


def wrap_search_response(response):  # noqa: D103
    return NameSpaceObj(response)


def yield_resource(search_response, group_value):  # noqa: D103
    for result in search_response.results or []:
        if result.groupValue == group_value:
            for resource in result.resources or []:
                yield resource


def pagination_helper_search(  # noqa: D103
    connection,
    query,
    query_param,
    group_value,
    org_name=None,
    team_name=None,
    operation_name=None,
    kas_direct=False,
    extra_auth_headers=None,
):
    current_page = 0
    while True:
        query_param.page = current_page
        _search_response = wrap_search_response(
            connection.make_api_request(
                "GET",
                query,
                params={"q": query_param.toJSON()},
                auth_org=org_name,
                auth_team=team_name,
                operation_name=operation_name,
                kas_direct=kas_direct,
                extra_auth_headers=extra_auth_headers,
            )
        )
        yield yield_resource(_search_response, group_value)
        current_page = current_page + 1
        if not _search_response.resultPageTotal or current_page == _search_response.resultPageTotal:
            break
