#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
#
from copy import deepcopy
import json
import logging
import time
from typing import Any, Generator, Optional

from nvcf.api.utils import get_nvcf_url_per_environment

from ngcbase.api.connection import rest_utils
from ngcbase.constants import REQUEST_TIMEOUT_SECONDS, USER_AGENT
from ngcbase.environ import NGC_CLI_USER_AGENT_TEXT
from ngcbase.errors import NgcException, PollingTimeoutException
from ngcbase.tracing import TracedSession
from ngcbase.util.file_utils import get_incremented_filename

# Extra functions available if tritonclient is installed
try:
    # pylint: disable=import-error
    import grpc
    import tritonclient
    from tritonclient.grpc import service_pb2_grpc
except ModuleNotFoundError:
    tritonclient = None
    service_pb2_grpc = None


logger = logging.getLogger(__name__)


class TritonGRPCInvocationHandler:
    """Provides a managed Handler for Triton Client based Invocations on NVCF."""

    def __init__(self, starfleet_api_key: str, base_url: Optional[str] = None):
        if tritonclient is None:
            raise NgcException("Only available if library `tritonclient` is in environment")
        self.base_url = base_url or get_nvcf_url_per_environment()
        self.auth_key = starfleet_api_key
        self.channel = None
        self.triton_client = None

    def _metadata(self, function_id: str, function_version_id: Optional[str] = None) -> list:
        metadata = [("function-id", function_id), ("authorization", "Bearer " + self.auth_key)]
        if function_version_id:
            metadata += [("function-version-id", function_version_id)]
        return metadata

    def __exit__(self, exc_type, exc_value, exc_tb):  # noqa: D105
        if self.channel:
            self.channel.close()
        logger.debug("Closed grpc channel %s")

    def __enter__(self):  # noqa: D105
        self.channel = grpc.secure_channel(self.base_url, grpc.ssl_channel_credentials())
        self.triton_client = service_pb2_grpc.GRPCInferenceServiceStub(self.channel)
        logger.debug("Created a grpc client with URL: %s", self.base_url)
        return self

    def make_invocation_request(  # noqa: D102
        self,
        function_id: str,
        function_request: Any,
        function_version_id: Optional[str] = None,
    ):
        logger.debug("Making request to function %s", function_id)
        metadata = self._metadata(function_id, function_version_id)
        return self.triton_client.ModelInfer(function_request, metadata=metadata)

    def make_streaming_invocation_request(  # noqa: D102
        self,
        function_id: str,
        function_request: Any,
        function_version_id: Optional[str] = None,
    ) -> Generator[Any, None, None]:
        logger.debug("Making request to function %s", function_id)
        metadata = self._metadata(function_id, function_version_id)
        return self.triton_client.ModelStreamInfer(iter([function_request]), metadata=metadata)


class HTTPSInvocationHandler:
    """Provides a managed Handler for HTTPS based Invocations on NVCF."""

    def __init__(self, starfleet_api_key: str, base_url: Optional[str] = None):
        self.base_url = base_url or get_nvcf_url_per_environment()
        self.auth_key = starfleet_api_key
        self.session = None

    def __enter__(self):  # noqa: D105
        self.session = TracedSession()
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):  # noqa: D105
        if self.session:
            self.session.close()

    def _get_headers(self, asset_ids: Optional[list[str]] = None, poll_timeout_secs: Optional[int] = None) -> dict:
        headers = {"Authorization": f"Bearer {self.auth_key}"}
        headers["User-Agent"] = f"{USER_AGENT} {NGC_CLI_USER_AGENT_TEXT}" if NGC_CLI_USER_AGENT_TEXT else USER_AGENT
        headers["Content-Type"] = "application/json"
        if poll_timeout_secs:
            headers["NVCF-POLL_SECONDS"] = str(poll_timeout_secs)
        if asset_ids:
            headers["NVCF-INPUT-ASSET-REFERENCES"] = ",".join(asset_ids)
        debug_headers = deepcopy(headers)
        debug_headers.pop("Authorization")
        logger.debug("Headers")
        logger.debug(debug_headers)
        return headers

    def _get_invoke_endpoint(
        self,
        request_id: Optional[str] = None,
        function_id: Optional[str] = None,
        function_version_id: Optional[str] = None,
    ) -> str:
        url: str = f"{self.base_url}/v2/nvcf/pexec"
        if request_id:
            return f"{url}/status/{request_id}"

        if function_id:
            url += f"/functions/{function_id}"
        if function_version_id:
            url += f"/versions/{function_version_id}"

        return url

    def make_streaming_invocation_request(  # noqa: D102
        self,
        function_id: str,
        data: dict,
        function_version_id: Optional[str] = None,
        asset_ids: Optional[list[str]] = None,
        request_timeout: Optional[int] = 300,
    ) -> Generator[bytes, None, None]:
        headers = self._get_headers(asset_ids)
        headers["Accept"] = "text/event-stream"

        function_url = self._get_invoke_endpoint(function_id=function_id, function_version_id=function_version_id)
        response = self.session.request(
            method="POST",
            url=function_url,
            data=json.dumps(data),
            headers=headers,
            operation_name="invoke function",
            timeout=request_timeout,
            stream=True,
        )
        logger.debug("Response for url %s: status: %s", function_url, response.status_code)
        for line in response.iter_lines():
            yield line

    def make_invocation_request(  # noqa: D102
        self,
        function_id: str,
        data: dict,
        function_version_id: Optional[str] = None,
        asset_ids: Optional[list[str]] = None,
        output_zip_path: Optional[str] = None,
        polling_request_timeout: Optional[int] = 300,
        pending_request_timeout: Optional[int] = 600,
        pending_request_interval: Optional[float] = 1.0,
    ) -> dict:
        headers = self._get_headers(asset_ids, polling_request_timeout)
        headers["Accept"] = "application/json"

        # prevent bombarding endpoint
        if pending_request_interval < 0.5:
            pending_request_interval = 1.0
            logger.warning("`pending_request_interval` must be at least 1.0 seconds")

        response = {}
        start_time = time.time()

        function_url = self._get_invoke_endpoint(function_id=function_id, function_version_id=function_version_id)
        response = self.session.request(
            method="POST",
            url=function_url,
            data=json.dumps(data),
            headers=headers,
            operation_name="invoke function",
            timeout=polling_request_timeout + REQUEST_TIMEOUT_SECONDS,
        )
        logger.debug("Response for url %s: status: %s", function_url, response.status_code)
        req_id = response.headers.get("NVCF-REQID")
        status_url = self._get_invoke_endpoint(request_id=req_id)
        while response.status_code == 202:
            response = self.session.request(
                url=status_url,
                method="GET",
                operation_name="poll invocation",
                headers=headers,
                timeout=polling_request_timeout + REQUEST_TIMEOUT_SECONDS,
                allow_redirects=False,
            )
            logger.debug("Response for url %s: status: %s", status_url, response.status_code)

            # raise error if waiting too long for result
            if time.time() - start_time < pending_request_timeout:
                time.sleep(pending_request_interval)
            else:
                raise PollingTimeoutException(
                    f"The request took longer then allowed! {pending_request_timeout} seconds"
                )

        if response.status_code == 302:
            presigned_zip_url = response.headers["Location"]
            logger.debug("Redirected for zip download: %s", presigned_zip_url)
            if not output_zip_path:
                output_zip_path = get_incremented_filename("output.zip")
                logger.debug("Writing file to %s", output_zip_path)

            response = self.session.request(
                url=presigned_zip_url,
                method="GET",
                timeout=REQUEST_TIMEOUT_SECONDS,
                stream=True,
                operation_name="download output zip",
            )
            with open(output_zip_path, "wb") as output_buffer:
                output_buffer.write(response.content)
            return {"response_code": response.status_code, "output_zip_path": output_zip_path}

        rest_utils.raise_for_status(response)
        return response.json()
