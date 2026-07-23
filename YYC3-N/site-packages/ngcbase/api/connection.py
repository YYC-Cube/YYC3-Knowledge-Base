#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import asyncio
from concurrent import futures
import http.client
import json
import logging
import ssl
import sys
import time
from urllib.parse import quote, urljoin
from urllib.request import getproxies

import aiohttp
import certifi
import requests  # pylint: disable=requests-import
from requests.adapters import HTTPAdapter  # pylint: disable=requests-import
import requests.exceptions as rqes  # pylint: disable=requests-import
import urllib3

from ngcbase.api import utils as rest_utils
from ngcbase.api.utils import add_scheme
from ngcbase.constants import MAX_REQUEST_THREADS, REQUEST_TIMEOUT_SECONDS
from ngcbase.errors import NgcAPIError, NgcException
from ngcbase.tracing import traced_request, TracedSession

logging.getLogger("requests").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

# The secure versions (no CVEs) of aiohttp require a selector event loop on windows.
# For more info: https://github.com/nathom/streamrip/issues/729#issuecomment-2388503896
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

NO_OF_RETRIES = 5
CAS_RETRY_SLEEP_SECONDS = 5
SOCK_READ_TIMEOUT_SECONDS = 5 * 60

# Default set by requests is 10 for both of the following values:
CONNECTION_POOL_SIZE = 20
# How many different hosts to have connections for
# One connection pool corresponds to one host.
# New request, new connection pool.
# Reach the connection_pool_size, i.e. made 20 requests each to a different, unique host
# Then when a request to the 21st unique host is made, the oldest connection pool is dropped.
MAX_POOL_SIZE = 40
# How many connections to have per host (or, per connection_pool)
# In multithreaded env, can establish multiple connections to the same host.
# max_pool_size specifies how many connections to the same host.
# Reach this size, need to drop a connection because can't have >21 connections to that host.
# Connection pool is full, discarding connection:

logger = logging.getLogger(__name__)


def _safe_quote(val, safe=None):
    """Only quote the path part of a URL, not the query string."""
    split_val = val.split("?")
    if len(split_val) > 1:
        path, qs = split_val
        path = quote(path, safe) if safe else quote(path)
        return "?".join([path, qs])
    return quote(val, safe) if safe else quote(val)


class Connection:  # noqa: D101
    def __init__(self, base_url=None, api_client=None):
        self.base_url = base_url
        self.client = api_client
        self.cas_session_obj = None
        self.css_session_obj = None

    def __repr__(self) -> str:
        """Show a more descriptive representation to help with debugging."""
        class_name = __name__ + "." + type(self).__name__
        return f"{class_name}({self.base_url!r})"

    def make_api_request(
        self,
        verb,
        endpoint,
        payload=None,
        disable_non_auth_retry=False,
        auth_org=None,
        auth_team=None,
        operation_name=None,
        params=None,
        content_type=None,
        json_response=True,
        # Takes the response payload as a string. Default to the identity function.
        response_log_masking_fn=lambda x: x,
        return_content=False,
        extra_scopes=None,
        renew_token=False,
        response_headers=None,
        kas_direct=False,
        extra_auth_headers=None,
        safe=None,
        allow_redirects=True,
        timeout=REQUEST_TIMEOUT_SECONDS,
    ):
        """Make the specified api service request and return the response."""
        url = self.create_full_URL(endpoint, safe)
        logger.debug(
            "Requesting URL (%s): %s\n    payload: %s\n    params: %s",
            verb,
            url,
            payload,
            params,
        )

        header_override = self.client.authentication.auth_header(
            auth_org=auth_org,
            auth_team=auth_team,
            scopes=extra_scopes,
            renew=renew_token,
            kas_direct=kas_direct,
            extra_auth_headers=extra_auth_headers,
        )

        # EGX UPDATE reqs require Content-Type "application/json-patch+json"
        if content_type:
            header_override.update({"Content-Type": content_type})

        headers = rest_utils.default_headers(header_override)

        # ignore SSL warnings
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        # Want to use `FullPoolError` exception in urllib3; but it's only available in urllib3 version >= 2.0.0.
        # Can't upgrade version because botocore has urllib3 as a dependency and pins the version to < 1.27
        # Workaround is setting "ERROR" debug level
        logging.getLogger("urllib3").setLevel(logging.ERROR)

        if self.cas_session_obj is None:
            self.cas_session_obj = TracedSession()
            self.cas_session_obj.mount(
                "https://",
                HTTPAdapter(pool_connections=CONNECTION_POOL_SIZE, pool_maxsize=MAX_POOL_SIZE),
            )
        req = requests.Request(verb.upper(), url, data=payload, headers=headers, params=params)
        prepared_request = self.cas_session_obj.prepare_request(req)

        if verb in ("PUT", "POST", "DELETE"):
            response = self._request_no_retries(
                prepared_request, operation_name, auth_org, auth_team, allow_redirects=allow_redirects, timeout=timeout
            )
        else:
            response = self._request_with_retries(
                prepared_request,
                disable_non_auth_retry,
                auth_org,
                auth_team,
                operation_name,
                allow_redirects=allow_redirects,
                timeout=timeout,
            )

        if response_headers:
            return (
                self._parse_api_response(
                    response,
                    json_response=json_response,
                    response_log_masking_fn=response_log_masking_fn,
                    return_content=return_content,
                ),
                response.headers,
            )

        return self._parse_api_response(
            response,
            json_response=json_response,
            response_log_masking_fn=response_log_masking_fn,
            return_content=return_content,
        )

    async def make_async_api_request(
        self,
        verb,
        endpoint,
        payload=None,
        disable_non_auth_retry=False,
        auth_org=None,
        auth_team=None,
        operation_name=None,  # pylint: disable=unused-argument
        params=None,
        content_type=None,
        json_response=True,
        return_content=False,
        extra_scopes=None,
        renew_token=False,
        kas_direct=False,
        extra_auth_headers=None,
        response_headers=None,
    ):
        """Make the specified api service request and return the response."""
        url = self.create_full_URL(endpoint)
        logger.debug(
            "Requesting URL (%s): %s\n    payload: %s\n    params: %s",
            verb,
            url,
            payload,
            params,
        )

        def get_headers(renew_token):
            header_override = self.client.authentication.auth_header(
                auth_org=auth_org,
                auth_team=auth_team,
                scopes=extra_scopes,
                renew=renew_token,
                kas_direct=kas_direct,
                extra_auth_headers=extra_auth_headers,
            )
            # EGX UPDATE reqs require Content-Type "application/json-patch+json"
            if content_type:
                header_override.update({"Content-Type": content_type})
            return rest_utils.default_headers(header_override)

        headers = get_headers(renew_token=renew_token)
        # ignore SSL warnings
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        client_timeout = aiohttp.ClientTimeout(sock_read=SOCK_READ_TIMEOUT_SECONDS)
        retried_auth = False
        attempts = 1 if (disable_non_auth_retry or verb in ("PUT", "POST", "DELETE")) else NO_OF_RETRIES
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        while attempts >= 0:
            attempts -= 1
            async with aiohttp.ClientSession(timeout=client_timeout, connector=connector, trust_env=True) as session:
                session_method = getattr(session, verb.lower()) or session.get
                # Make the API call
                if verb.upper() in ("POST", "PUT", "PATCH"):
                    resp = await session_method(url, data=payload, headers=headers)
                else:
                    resp = await session_method(url, headers=headers)
                status = resp.status
                if resp.status == 401 and not retried_auth:
                    # Most likely token has expired; try once with fresh token
                    headers = get_headers(renew_token=True)
                    retried_auth = True
                    attempts += 1
                    continue
                # NOTE: this has to be kept under the `with aiohttp.ClientSession` block to keep the session open
                # so that the json, text, etc., methods can be awaited.
                if status == http.client.OK or attempts <= 0:
                    return await self._parse_async_api_response(
                        resp,
                        json_response=json_response,
                        return_content=return_content,
                        response_headers=response_headers,
                    )

    def create_full_URL(self, endpoint, safe=None):  # noqa: D102
        return urljoin(self.base_url or self.client.config.base_url, _safe_quote(endpoint, safe))

    def _request_with_retries(
        self,
        prepared_request,
        disable_non_auth_retry,
        auth_org=None,
        auth_team=None,
        operation_name=None,
        kas_direct=False,
        extra_auth_headers=None,
        allow_redirects=True,
        timeout=REQUEST_TIMEOUT_SECONDS,
    ):
        current_retry = NO_OF_RETRIES
        response = None

        # pylint: disable=no-member
        # (http.client members are global entries, not static member variables)
        while current_retry > 0:
            try:
                response = self.cas_session_obj.send(
                    prepared_request,
                    operation_name=operation_name,
                    check_operation_name=True,
                    timeout=timeout,
                    proxies=getproxies(),
                    allow_redirects=allow_redirects,
                )

                logger.debug(
                    "Response status: %s - Reason: %s ",
                    response.status_code,
                    response.reason,
                )
                if response.status_code == http.client.OK:
                    logger.debug(
                        "Time taken to process URL: %s: %ss",
                        prepared_request.url,
                        response.elapsed.total_seconds(),
                    )

                # 400 <= status_code <= 507 - retry
                elif http.client.BAD_REQUEST <= response.status_code <= http.client.INSUFFICIENT_STORAGE:
                    if not current_retry or (
                        disable_non_auth_retry
                        and
                        # disable_non_auth_retry still handles UNAUTHORIZED
                        response.status_code != http.client.UNAUTHORIZED
                    ):
                        break

                    current_retry -= 1
                    logger.debug("Retries remaining: %s", current_retry)

                    # fetch new token if you get 401 from CSS
                    if response.status_code == http.client.UNAUTHORIZED:
                        logger.debug("Token expired. Fetching new token.")
                        auth_header = self.client.authentication.auth_header(
                            auth_org=auth_org,
                            auth_team=auth_team,
                            renew=True,
                            kas_direct=kas_direct,
                            extra_auth_headers=extra_auth_headers,
                        )
                        prepared_request.headers.update(auth_header)
                        continue
                    if response.status_code in (
                        http.client.SERVICE_UNAVAILABLE,
                        http.client.BAD_GATEWAY,
                        http.client.GATEWAY_TIMEOUT,
                    ):
                        time.sleep(CAS_RETRY_SLEEP_SECONDS)
                        continue
                    if response.status_code == http.client.INTERNAL_SERVER_ERROR:
                        continue

                    # do not retry in other error codes
                    break

                return response
            except (
                requests.ConnectionError,
                requests.ReadTimeout,
                requests.ConnectTimeout,
            ) as e:
                if self.client.config.format_type == "ascii":
                    # Don't print messages for machine-consumable formats
                    self.client.printer.print_error(
                        "Connection failed; retrying... (Retries left: {})".format(current_retry)
                    )
                logger.debug("Connection failed: %s\nTrying again.", str(e))
                current_retry -= 1
                if not current_retry or disable_non_auth_retry:
                    if isinstance(e, requests.exceptions.ReadTimeout):
                        raise NgcException(
                            "Error: Request timed out; the server was reached, but no data was sent."
                        ) from None
                    if isinstance(e, requests.exceptions.ConnectTimeout):
                        raise NgcException("Error: Request timed out.") from None
                    raise NgcException("Error: client is unable to make a connection.") from None
                logger.debug(
                    "No of retries remaining for ConnectionError/ReadTimeout %s",
                    current_retry,
                )
                time.sleep(CAS_RETRY_SLEEP_SECONDS)

        return response

    def _request_no_retries(
        self,
        prepared_request,
        operation_name=None,
        auth_org=None,
        auth_team=None,
        kas_direct=False,
        extra_auth_headers=None,
        allow_redirects=True,
        timeout=REQUEST_TIMEOUT_SECONDS,
    ):
        # NOTE: http.client members are global entries, not static member variables
        # pylint: disable=no-member
        try:
            response = self.cas_session_obj.send(
                prepared_request,
                operation_name=operation_name,
                check_operation_name=True,
                timeout=timeout,
                proxies=getproxies(),
                allow_redirects=allow_redirects,
            )

            logger.debug(
                "Response status: %s - Reason: %s ",
                response.status_code,
                response.reason,
            )

            # fetch new token if you get 401 from CAS
            if response.status_code == http.client.UNAUTHORIZED:
                logger.debug("Token expired. Fetching new token.")
                auth_header = self.client.authentication.auth_header(
                    auth_org=auth_org,
                    auth_team=auth_team,
                    renew=True,
                    kas_direct=kas_direct,
                    extra_auth_headers=extra_auth_headers,
                )
                prepared_request.headers.update(auth_header)
                response = self.cas_session_obj.send(
                    prepared_request,
                    operation_name=operation_name,
                    check_operation_name=True,
                    timeout=timeout,
                    proxies=getproxies(),
                    allow_redirects=allow_redirects,
                )
                logger.debug(
                    "Response status: %s - Reason: %s ",
                    response.status_code,
                    response.reason,
                )

            if response.status_code == http.client.OK:
                logger.debug(
                    "Time taken to process URL: %s: %ss",
                    prepared_request.url,
                    response.elapsed.total_seconds(),
                )

            return response
        except (
            requests.ConnectionError,
            requests.ReadTimeout,
            requests.ConnectTimeout,
        ) as e:
            logger.debug("Connection failed: %s", str(e), exc_info=1)
            self.client.printer.print_error("Connection failed; will not retry.")
            if isinstance(e, requests.exceptions.ReadTimeout):
                raise NgcException("Error: Request timed out; the server was reached, but no data was sent.") from None
            if isinstance(e, requests.exceptions.ConnectTimeout):
                raise NgcException("Error: Request timed out.") from None
            raise NgcException("Error: client is unable to make a connection.") from None

    def make_multiple_request(  # noqa: D102
        self,
        verb,
        urls,
        params=None,
        auth_org=None,
        auth_team=None,
        operation_name=None,
        request_limit=None,
        kas_direct=False,
        extra_auth_headers=None,
    ):
        pool_size = min(MAX_REQUEST_THREADS, len(urls))
        if request_limit:
            pool_size = min(pool_size, request_limit)
        if not params:
            params = [None] * len(urls)
        with futures.ThreadPoolExecutor(max_workers=pool_size) as executor:
            future_to_url = {
                executor.submit(
                    self.make_api_request,
                    verb=verb,
                    endpoint=url,
                    operation_name=operation_name,
                    params=params_dict,
                    payload=None,
                    auth_org=auth_org,
                    auth_team=auth_team,
                    kas_direct=kas_direct,
                    extra_auth_headers=extra_auth_headers,
                ): (url, params_dict)
                for url, params_dict in zip(urls, params)
            }
            for future in futures.as_completed(future_to_url):
                yield future.result()

    def _parse_api_response(
        self,
        response,
        json_response,
        return_content,
        # Takes the response payload as a string. Default to the identity function.
        response_log_masking_fn=lambda x: x,
    ):
        logger.debug("Response is: %s", self._response_log_masking_fn_wrapper(response.text, response_log_masking_fn))
        return self._result(response, is_json=json_response, return_content=return_content)

    @staticmethod
    def _response_log_masking_fn_wrapper(response_text: str, response_log_masking_fn=lambda x: x):
        """Error handling wrapper/monad in case someone gives us a misbehaving response log masking function."""
        try:
            return response_log_masking_fn(response_text)
        # pylint: disable=broad-except
        except Exception as e:
            logger.debug(
                "Response log masking function raised an exception! Returning the unmasked response instead.",
                exc_info=e,
            )
            return response_text

    def _result(self, response, is_json=False, return_content=False):
        rest_utils.raise_for_status(response)
        if response.headers and "nv-ngc-response-warning-message" in response.headers:
            self.client.printer.print_warning(response.headers.get("nv-ngc-response-warning-message", ""))
        if return_content:
            return response.content
        if is_json:
            try:
                return response.json()
            except json.JSONDecodeError:
                msg = (
                    "The response from the service was either blank or malformed."
                    " Please rerun this command with the `--debug` argument, and"
                    " provide the output to support."
                )
                raise NgcAPIError(msg, response=response) from None
        return response.text

    async def _parse_async_api_response(self, resp, json_response, return_content, response_headers):
        rest_utils.raise_for_aiohttp_status(resp, await resp.json())
        resp_body = None
        if return_content:
            resp_body = await resp.read()
        elif json_response:
            resp_body = await resp.json()
        else:
            resp_body = await resp.text()
        if response_headers:
            return resp_body, resp.headers
        return resp_body

    @staticmethod
    def service_check(url):
        """Checks a URL's /health endpoint."""  # noqa: D401
        headers = rest_utils.default_headers()
        health_url = add_scheme(url + "/health")

        try:
            response = traced_request(
                "GET",
                health_url,
                operation_name="health check",
                headers=headers,
                timeout=REQUEST_TIMEOUT_SECONDS,
                proxies=getproxies(),
            )
        # rqes.*: The most common errors that can occur on connection
        # ValueError: incorrectly formatted URL
        except (rqes.Timeout, rqes.ConnectionError, rqes.RequestException, ValueError):
            return False

        return response.status_code == 200
