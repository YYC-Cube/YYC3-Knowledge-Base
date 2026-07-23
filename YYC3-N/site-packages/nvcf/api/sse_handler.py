#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
#
import logging
from typing import Generator, Optional

import requests  # pylint: disable=requests-import

from ngcbase.api.connection import rest_utils
from ngcbase.constants import USER_AGENT
from ngcbase.environ import NGC_CLI_USER_AGENT_TEXT
from ngcbase.tracing import TracedSession

logger = logging.getLogger(__name__)
SSE_EVENT_DELIMITERS = (b"\r\r", b"\n\n", b"\r\n\r\n")
_FIELD_SEPARATOR = ":"


class ServerSentEvent:
    """Object to represent a SSE event."""

    def __init__(self, id=None, event=None, data=""):  # pylint: disable=redefined-builtin
        self.id = id
        self.event = event
        self.data = data


class ServerSentEventsHandler:
    """Provides a managed Handler for SSE events."""

    def __init__(self, starfleet_api_key: str):
        self.auth_key = starfleet_api_key
        self.session = None

    def __enter__(self):  # noqa: D105
        self.session = TracedSession()
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):  # noqa: D105
        if self.session:
            self.session.close()

    def _get_headers(self) -> dict:
        headers = {"Authorization": f"Bearer {self.auth_key}"}
        headers["User-Agent"] = f"{USER_AGENT} {NGC_CLI_USER_AGENT_TEXT}" if NGC_CLI_USER_AGENT_TEXT else USER_AGENT
        headers["Content-Type"] = "application/json"
        headers["Accept"] = "text/event-stream"
        return headers

    def make_sse_request(  # noqa: D102
        self, url: str, operation_name: str, request_timeout: Optional[int] = 300, encoding: str = "utf-8"
    ) -> Generator[ServerSentEvent, None, None]:
        headers = self._get_headers()
        response = self.session.request(  # type: ignore
            method="GET",
            url=url,
            operation_name=operation_name,
            headers=headers,
            timeout=request_timeout,
            stream=True,
        )
        logger.debug("Response for url %s: status: %s", url, response.status_code)
        rest_utils.raise_for_status(response)
        return self._process_sse_response(response=response, encoding=encoding)

    def _process_sse_response(  # pylint: disable=no-self-use
        self, response: requests.Response, encoding: str
    ) -> Generator[ServerSentEvent, None, None]:
        for line in response.iter_lines():
            line = line.decode(encoding)
            event = ServerSentEvent()
            if not line.strip() or line.startswith(_FIELD_SEPARATOR):
                continue
            data = line.split(_FIELD_SEPARATOR, 1)
            field = data[0]
            if field not in event.__dict__:
                continue

            if len(data) > 1 and data[1].strip():
                if data[1].startswith(" "):
                    value = data[1][1:]
                else:
                    value = data[1]
            else:
                continue

            if field == "data":
                event.__dict__[field] += value + "\n"
            else:
                event.__dict__[field] = value

            if not event.data:
                continue
            if event.data.endswith("\n"):
                event.data = event.data[0:-1]
            yield event
