#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from copy import deepcopy
import http.client
import json
import logging
from types import SimpleNamespace
from typing import Any, Optional
from urllib.parse import urlparse
from warnings import warn

import aiohttp
import requests  # pylint: disable=requests-import

from ngcbase.constants import USER_AGENT
from ngcbase.environ import NGC_CLI_USER_AGENT_TEXT
from ngcbase.errors import (
    AccessDeniedException,
    AuthenticationException,
    BadGatewayException,
    BadRequestException,
    GatewayTimeoutException,
    InsufficientStorageException,
    InternalServerException,
    NgcAPIError,
    NgcException,
    NotImplementedException,
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
    ServiceUnavailableException,
    TooManyRequestsException,
)
from ngcbase.util.io_utils import mask_string

logger = logging.getLogger(__name__)


def raise_for_status(response):
    """Raise an NgcException for a bad response (4xx or 5xx).

    Wraps a request library response object's `raise_for_status` method in NgcExceptions
    """
    try:
        response.raise_for_status()
    except requests.exceptions.Timeout as e:
        raise NgcException(e) from None
    except requests.exceptions.HTTPError as e:
        raise create_api_error_from_http_exception(e) from None
    return response


def raise_for_aiohttp_status(response, response_body_json):
    """Raise an NgcException for a bad aiohttp response (4xx or 5xx).

    Wraps a aiohttp.ClientError with response. aiohttp exceptions does not include response.
    """
    try:
        response.raise_for_status()
    except aiohttp.ClientError as e:
        raise create_api_error_from_aiohttp_exception(e, response_body_json) from None

    return response


def create_api_error_from_http_exception(e) -> Exception:
    """Raises a NgcException from requests.exceptions.HTTPError."""  # noqa: D401
    response = e.response
    try:
        explanation = response.text.strip()
    except ValueError:
        explanation = ""

    cls = get_api_error_class(response.status_code)
    return cls(e, response=response, explanation=explanation, status_code=response.status_code)


def create_api_error_from_aiohttp_exception(e, response) -> Exception:
    """Raises a NgcException from aiohttp.ClientError."""  # noqa: D401
    cls = get_api_error_class(e.status)
    return cls(e, response=response, explanation=response, status_code=e.status)


def get_api_error_class(http_error_code):  # noqa: D103
    # pylint: disable=no-member
    if http_error_code == http.client.BAD_REQUEST:
        return BadRequestException
    # pylint: disable=no-member
    if http_error_code == http.client.UNAUTHORIZED:
        return AuthenticationException
    # pylint: disable=no-member
    if http_error_code == http.client.FORBIDDEN:
        return AccessDeniedException
    # pylint: disable=no-member
    if http_error_code == http.client.NOT_FOUND:
        return ResourceNotFoundException
    # pylint: disable=no-member
    if http_error_code == http.client.CONFLICT:
        return ResourceAlreadyExistsException
    # pylint: disable=no-member
    if http_error_code == http.client.TOO_MANY_REQUESTS:
        return TooManyRequestsException
    # pylint: disable=no-member
    if http_error_code == http.client.INTERNAL_SERVER_ERROR:
        return InternalServerException
    # pylint: disable=no-member
    if http_error_code == http.client.NOT_IMPLEMENTED:
        return NotImplementedException
    # pylint: disable=no-member
    if http_error_code == http.client.BAD_GATEWAY:
        return BadGatewayException
    # pylint: disable=no-member
    if http_error_code == http.client.SERVICE_UNAVAILABLE:
        return ServiceUnavailableException
    # pylint: disable=no-member
    if http_error_code == http.client.GATEWAY_TIMEOUT:
        return GatewayTimeoutException
    # pylint: disable=no-member
    if http_error_code == http.client.INSUFFICIENT_STORAGE:
        return InsufficientStorageException
    return NgcAPIError


def raise_job_proxy_service_error(e):  # noqa: D103
    status = e.response.status_code
    message = "HTTP Error: " + str(status)
    if status == http.client.SERVICE_UNAVAILABLE:  # 503
        message = "Service Unavailable: Rate limit may have been exceeded."
    elif status == http.client.BAD_GATEWAY:  # 502
        message = "Bad Gateway: connection refused.  Alternatively, the container may have already finished running."
    elif status == http.client.INTERNAL_SERVER_ERROR:  # 500
        message = "Docker could not complete this command - is it set up correctly?"
    elif status == http.client.CONFLICT:  # 409
        message = "A response was produced, but the job for this container is paused."
    elif status == http.client.NOT_FOUND:  # 404
        message = "Docker could not find the container for this job."
    elif status == http.client.UNAUTHORIZED:  # 401
        message = "Authorization Error:  permissions could not be verified."
    elif status == http.client.BAD_REQUEST:  # 400
        message = "Bad Request: Job information does not match what docker expects."
    raise NgcException(message)


def remove_scheme(url):
    """Removes the protocol from a URL if present.

    Example:
        >>> remove_scheme('https://www.example.com')
        'www.example.com'

        >>> remove_scheme('www.example.com')
        'www.example.com'
    """  # noqa: D401
    if url is None:
        return None

    url_object = urlparse(url)
    if url_object.scheme:
        split_url = url.split("//")
        return split_url[1]

    return url


def default_headers(extra_headers=None):
    """Generate default headers for NGC CLI HTTP requests.

    Any dictionaries passed in will overwrite or extend
    the headers.
    """
    user_agent_value = f"{USER_AGENT} {NGC_CLI_USER_AGENT_TEXT}" if NGC_CLI_USER_AGENT_TEXT else USER_AGENT
    headers = {
        "Content-Type": "application/json",
        "User-Agent": user_agent_value,
    }

    if extra_headers:
        headers.update(extra_headers)

    debug_headers = deepcopy(headers)
    if "Authorization" in debug_headers:
        debug_headers["Authorization"] = mask_string(debug_headers["Authorization"])
    logger.debug("Headers:")
    logger.debug(debug_headers)

    return headers


def add_scheme(value):  # noqa: D103
    if value is not None:
        if not value.startswith("http"):
            value = "https://{}".format(value)
    return value


def disable_function(flag: bool):  # noqa: D103
    def decorator(func):
        def wrapper(*args, **kwargs):
            if flag:
                raise NgcException(f"Function {func.__name__} is disabled.")
            return func(*args, **kwargs)

        return wrapper

    return decorator


def disable_property(flag: bool):
    """Helper decorator that disables the property based on the given boolean."""  # noqa: D401

    def decorator(func):
        @property
        def wrapper(*args, **kwargs):
            if flag:
                raise AttributeError(f"'{func.__name__}' property is disabled")
            return func(*args, **kwargs)

        return wrapper

    return decorator


def deprecated(message: Optional[str] = None):
    """Mark function as deprecated. Used as a decorator. 3.13 has this in standard library."""

    def decorator(func):
        def wrapper(*args, **kwargs):
            if message is not None:
                warn(message, DeprecationWarning)
            else:
                warn(f"'Function {func.__name__}' is deprecated.", DeprecationWarning)
            return func(*args, **kwargs)

        return wrapper

    return decorator


class DotDict(dict):
    """Dictionary subclass that allows accessing keys via dot notation."""

    __slots__ = ()

    def __init__(self, dct: dict):
        super().__init__()
        for k, v in dct.items():
            self[k] = self._coerce_to_dot_dict(v)

    @classmethod
    def _coerce_to_dot_dict(cls, value):
        """Coerce a value into a DotDict (if necessary.)

        Dicts will be coerced into DotDicts.
        Lists will be copied, and their items will be recursively coerced to DotDicts.
        """  # noqa: D415
        if isinstance(value, dict):
            value = cls(value)
        elif isinstance(value, list):
            value = [cls._coerce_to_dot_dict(item) for item in value]
        return value

    def __getattr__(self, attr: str) -> Any:
        """Get undefined attrs from the dict's keys.

        If the attribute name exists as a key in the DotDict, the corresponding value will be returned. Otherwise, this
        will raise an AttributeError.
        """
        if attr not in self:
            raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{attr}'")
        return self.get(attr)

    def __repr__(self) -> str:  # noqa: D105
        class_name = self.__class__.__name__
        return f"{class_name}({super().__repr__()})"


class NameSpaceObj(SimpleNamespace):
    """SimpleNamespace subclass that parses nested dictionary."""

    def __init__(self, dct: dict):
        super().__init__()
        [self.__setattr__(k, v) for k, v in dct.items()] if dct else None

    @classmethod
    def _to_namespace(cls, value: Any):
        """Parse a value into a namespace."""
        if isinstance(value, dict):
            value = cls(value)
        elif isinstance(value, list):
            value = [cls._to_namespace(i) for i in value]
        return value

    @classmethod
    def _to_dict(cls, value: Any):
        """Parse a value into a dict."""
        val = value
        if isinstance(value, SimpleNamespace):
            val = {k: cls._to_dict(v) for k, v in value.__dict__.items()}
        elif isinstance(value, list):
            val = [cls._to_dict(i) for i in value]
        return val

    def __getattr__(self, attr: str) -> Any:
        """Get attrs from the dict."""
        return super().__dict__.get(attr)

    def __setattr__(self, attr: str, value: Any) -> Any:
        """Set attrs in the dict."""
        super().__setattr__(attr, self._to_namespace(value))

    def toDict(self) -> dict:
        """Return dictionary."""
        return {k: self._to_dict(v) for k, v in self.__dict__.items()}

    def toJSON(self, pretty=False) -> str:
        """Return JSON."""
        if pretty:
            return json.dumps(self.toDict(), sort_keys=True, indent=4)
        return json.dumps(self.toDict(), sort_keys=True)

    def isValid(self) -> bool:
        """Check valid."""
        return isinstance(self.toDict(), dict)

    def __eq__(self, other) -> bool:
        """Check dict equal."""
        return self.toDict() == other.toDict()

    def __hash__(self) -> int:
        """Return dict hash."""
        return hash(f"{self.toDict()}")
