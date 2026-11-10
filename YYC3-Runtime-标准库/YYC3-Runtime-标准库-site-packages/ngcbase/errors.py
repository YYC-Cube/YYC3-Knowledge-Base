#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from argparse import ArgumentError
import json
import logging

import requests  # pylint: disable=requests-import

logger = logging.getLogger(__name__)


class NgcException(Exception):
    """A base class for NGC SDK exceptions."""


class ConfigFileException(NgcException):  # noqa: D101
    pass


class ValidationException(NgcException):  # noqa: D101
    pass


class MissingConfigFileException(ConfigFileException):  # noqa: D101
    def __init__(self, message="Config file is missing."):  # pylint: disable=useless-super-delegation
        super().__init__(message)


class PollingTimeoutException(NgcException):  # noqa: D101
    pass


class NgcAPIError(requests.exceptions.HTTPError, NgcException):
    """An HTTP error from the API."""

    def __init__(self, message, response=None, explanation=None, status_code=None):
        super().__init__(message)
        self.response = response
        self.explanation = explanation
        self.status_code = status_code or getattr(response, "status_code", "")

    def __str__(self):  # noqa: D105
        message = super().__str__()
        status_description = ""
        request_id = ""

        if self.response is None:
            message = "Error: {}".format(message)
            return message

        url = self.response.url

        if self.explanation:
            o = json.loads(self.explanation)
            try:
                if "requestStatus" in self.explanation:
                    request_status = o["requestStatus"]
                    status_description = request_status.get("statusDescription", "")
                    request_id = request_status.get("requestId", "")
                elif "detail" in self.explanation:
                    status_description = o.get("detail")
            except TypeError as e:
                logger.error(str(e))

        if self.is_client_error():
            message = "Client Error: {0} Response: {1} - Request Id: {2} Url: {3}".format(
                self.status_code, status_description, request_id, url
            )
        elif self.is_server_error():
            message = "Server Error: {0} Response: {1} - Request Id: {2} Url: {3}".format(
                self.status_code, status_description, request_id, url
            )
        else:
            if self.explanation:
                message = "Error {} Response: {} - Request Id: {}".format(
                    self.status_code, status_description, request_id
                )
        return message

    def is_client_error(self):  # noqa: D102
        if self.status_code is None:
            return False
        return 400 <= self.status_code < 500

    def is_server_error(self):  # noqa: D102
        if self.status_code is None:
            return False
        return 500 <= self.status_code < 600


class BadRequestException(NgcAPIError):  # noqa: D101
    pass


class AuthenticationException(NgcAPIError):  # noqa: D101
    pass


class AccessDeniedException(NgcAPIError):  # noqa: D101
    pass


class ResourceNotFoundException(NgcAPIError):  # noqa: D101
    pass


class ResourceFilesNotFoundException(NgcAPIError):  # noqa: D101
    pass


class ResourceAlreadyExistsException(NgcAPIError):  # noqa: D101
    pass


class TooManyRequestsException(NgcAPIError):  # noqa: D101
    pass


class InternalServerException(NgcAPIError):  # noqa: D101
    pass


class NotImplementedException(NgcAPIError):  # noqa: D101
    pass


class BadGatewayException(NgcAPIError):  # noqa: D101
    pass


class ServiceUnavailableException(NgcAPIError):  # noqa: D101
    pass


class GatewayTimeoutException(NgcAPIError):  # noqa: D101
    pass


class InsufficientStorageException(NgcAPIError):  # noqa: D101
    pass


class NgcAPIRetryableError(NgcAPIError):  # noqa: D101
    pass


class InvalidArgumentError(ArgumentError):  # noqa: D101
    def __init__(self, arg_name, message=None):
        if message is None:
            super().__init__(None, "Invalid {arg_name}.".format(arg_name=arg_name))
        else:
            super().__init__(None, message)


class UnsupportedPlatformException(NgcException):  # noqa: D101
    def __init__(self, platform=None, hostname=None, token=None, port=None):
        message = f"{platform if platform else 'Your operating system'} is not supported."
        self.hostname = hostname
        self.token = token
        self.port = port
        super().__init__(message)


class DownloadFileSizeMismatch(NgcException):  # noqa: D101
    pass
