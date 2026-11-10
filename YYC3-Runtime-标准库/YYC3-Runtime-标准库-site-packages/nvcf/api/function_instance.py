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

from __future__ import annotations

from datetime import datetime
import json
from typing import Generator, Optional, TYPE_CHECKING, Union

from nvcf.api.sse_handler import ServerSentEvent, ServerSentEventsHandler

from ngcbase.api.utils import DotDict
from ngcbase.constants import SCOPED_KEY_PREFIX
from ngcbase.errors import NgcAPIError, NgcException
from ngcbase.util.utils import extra_args

if TYPE_CHECKING:
    import ngcsdk

    import ngccli.api.apiclient

    Client = Union[ngccli.api.apiclient.APIClient, ngcsdk.APIClient]


class FunctionInstanceAPI:  # noqa: D101
    def __init__(self, api_client) -> None:
        self.connection = api_client.connection
        self.config = api_client.config
        self.client = api_client

    @staticmethod
    def _construct_skyway_ep(
        entry: str,
        org_name: str,
        function_id: str,
        function_version_id: str,
        team_name: Optional[str] = None,
    ):
        ep: str = f"v2/orgs/{org_name}"
        if team_name:
            ep += f"/teams/{team_name}"
        ep += "/skyway"
        if function_id and function_version_id:
            ep += f"/{entry}/functions/{function_id}/versions/{function_version_id}"
        return ep

    @staticmethod
    def _construct_instances_ep(
        org_name: str,
        function_id: str,
        function_version_id: str,
        team_name: Optional[str] = None,
    ):
        return FunctionInstanceAPI._construct_skyway_ep(
            "instances", org_name, function_id, function_version_id, team_name
        )

    @staticmethod
    def _construct_execute_commands_ep(
        org_name: str,
        function_id: str,
        function_version_id: str,
        instance_id: str,
        pod_name: str,
        container_name: str,
        timeout: Optional[int] = None,
        team_name: Optional[str] = None,
    ):
        ep = FunctionInstanceAPI._construct_skyway_ep("commands", org_name, function_id, function_version_id, team_name)
        ep += f"?instanceId={instance_id}"
        ep += f"&podName={pod_name}"
        ep += f"&containerName={container_name}"
        if timeout:
            ep += f"&timeoutSeconds={timeout}"
        return ep

    @staticmethod
    def _construct_logs_ep(
        org_name: str,
        function_id: str,
        function_version_id: str,
        instance_id: str,
        pod_name: Optional[str] = None,
        container_name: Optional[str] = None,
        since: Optional[str] = None,
        since_time: Optional[datetime] = None,
        timeout: Optional[int] = None,
        team_name: Optional[str] = None,
    ):
        ep: str = FunctionInstanceAPI._construct_skyway_ep(
            "logs", org_name, function_id, function_version_id, team_name
        )

        query_params = []

        query_params.append(f"instanceId={instance_id}")
        if pod_name:
            query_params.append(f"podName={pod_name}")
        if container_name:
            query_params.append(f"containerName={container_name}")
        if since:
            query_params.append(f"since={since}")
        if since_time:
            query_params.append(f"sinceTime={since_time}")
        if timeout:
            query_params.append(f"timeout={timeout}")
        return ep + ("?" + "&".join(query_params) if query_params else "")

    @staticmethod
    def _construct_error_message(
        action: str,
        error: NgcAPIError,
        function_id: str,
        function_version_id: str,
    ) -> str:
        """Create error message from NgcAPIError."""
        error_message = f"Failed to {action} function '{function_id}:{function_version_id}'"
        if error and error.explanation:
            error_message += f"\nError code {error.status_code}: {json.loads(error.explanation).get('detail')}"
        return error_message

    @extra_args
    def list(self, function_id: str, function_version_id: str) -> DotDict:
        """List instances of a given function's version."""
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url = self._construct_instances_ep(org_name, function_id, function_version_id, team_name)
        response = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="get function version instances"
        )
        return DotDict(response)

    @extra_args
    def query_logs(
        self,
        function_id: str,
        function_version_id: str,
        instance_id: str,
        pod_name: Optional[str] = None,
        container_name: Optional[str] = None,
        since: Optional[str] = None,
        since_time: Optional[datetime] = None,
        timeout: Optional[int] = 300,
    ) -> Generator[ServerSentEvent, None, None]:
        """Real-time streaming logs.

        Args:
            function_id: Id of function logs are pulled from.
            function_version_id: Version to specify for function id.
            pod_name: Name of the function instance pod
            container_name: Name of the function instance container in the target pod
            instance_id: Id of the function instance
            since_time: Specifies the start time for querying logs.  Only one of since-time / since may be used. Default: None.
            since: Specifies a relative duration like 5s, 2m, or 3h for querying logs. Defaults to 1h if both since_time and since not specify
            timeout: Timeout of the request processing. Default to 60 seconds.

        Raises:
            NgcException: Matching HTTP Response code if fails in any way.

        Returns:
            Generator[bytes, None, None]: Streaming response of function logs.
        """  # noqa: E501
        self.client.config.validate_configuration()
        if not self.client.config.app_key or not self.client.config.app_key.startswith(SCOPED_KEY_PREFIX):
            # Will only present this through SDK, CLI has additional method of passing in through getpaswd
            raise NgcException("Please use a personal API Key.")

        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url: str = self._construct_logs_ep(
            org_name,
            function_id=function_id,
            function_version_id=function_version_id,
            instance_id=instance_id,
            pod_name=pod_name,
            container_name=container_name,
            since=since,
            since_time=since_time,
            timeout=timeout,
            team_name=team_name,
        )
        with ServerSentEventsHandler(
            starfleet_api_key=self.client.config.app_key,
        ) as sse_handler:
            return sse_handler.make_sse_request(
                url=self.connection.create_full_URL(url),
                operation_name="query function logs in real-time",
                request_timeout=timeout,
            )

    @extra_args
    def execute_commands(
        self,
        function_id: str,
        function_version_id: str,
        instance_id: str,
        pod_name: str,
        container_name: str,
        command: str,
        timeout: int = 60,
    ) -> DotDict:
        """Execute command on selected container for specific function version deployments.

        Args:
            function_id: Id of function logs are pulled from.
            function_version_id: Version to specify for function id.
            instance_id: Id of the function instance
            pod_name: Name of the function instance pod
            container_name: Name of the function instance container in the target pod
            command: Command to be execute.
            timeout: Timeout of the request processing. Default to 60 seconds.

        Returns:
            Iterator: Use to recieve logs one by one.
        """
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url: str = self._construct_execute_commands_ep(
            org_name,
            function_id=function_id,
            function_version_id=function_version_id,
            instance_id=instance_id,
            pod_name=pod_name,
            container_name=container_name,
            timeout=timeout,
            team_name=team_name,
        )
        payload = json.dumps({"command": command})
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="execute commands",
            payload=payload,
            timeout=timeout,
        )

        return DotDict(resp)
