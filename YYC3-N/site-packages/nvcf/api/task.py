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

from collections.abc import Iterable
from datetime import datetime, timedelta
from itertools import chain
import json
from typing import Any, Optional, TYPE_CHECKING, Union

import isodate
from nvcf.api.deployment_spec import GPUSpecification
from nvcf.api.task_instance import TaskInstanceAPI
from nvcf.api.utils import (
    validate_transform_helm_chart,
    validate_transform_image,
    validate_transform_model,
    validate_transform_resource,
)

from ngcbase.api.utils import DotDict
from ngcbase.errors import InvalidArgumentError, NgcAPIError, NgcException
from ngcbase.util.datetime_utils import calculate_date_range, dhms_to_isoduration
from ngcbase.util.utils import parse_key_value_pairs

if TYPE_CHECKING:
    import ngcsdk

    import ngccli.api.apiclient

    Client = Union[ngccli.api.apiclient.APIClient, ngcsdk.APIClient]


class TaskAPI:  # noqa: D101
    def __init__(self, api_client: Client = None) -> None:
        self.connection = api_client.connection
        self.config = api_client.config
        self.client = api_client

    @property
    def instances(self):  # noqa: D102
        return TaskInstanceAPI(api_client=self.client)

    @staticmethod
    def _construct_task_endpoint(
        org_name: str,
        task_id: Optional[str] = None,
        secret: bool = False,
    ) -> str:
        parts = ["v2/orgs", org_name]

        if secret:
            parts.extend(["nvct", "secrets", "tasks"])
        else:
            parts.extend(["nvct", "tasks"])

        if task_id:
            parts.extend([task_id])

        return "/".join(parts)

    @staticmethod
    def _construct_logs_endpoint(
        org_name: str,
        task_id: Optional[str] = None,
        job_id: Optional[str] = None,
    ) -> str:
        ep: str = f"v2/orgs/{org_name}/nvct/logs"

        if job_id:
            ep += f"/{job_id}"
            return ep

        ep += f"/tasks/{task_id}"
        return ep

    def _pagination_helper(self, base_url, org_name: str, operation_name: str, limit: int = 100):
        """Help query for paginated data."""
        cursor = None
        should_fetch_next_page = True
        while should_fetch_next_page:
            query = f"?limit={limit}&cursor={cursor}" if cursor else ""
            url = base_url + query
            response = self.connection.make_api_request("GET", url, auth_org=org_name, operation_name=operation_name)
            if response:
                yield response
                if "cursor" in response:
                    should_fetch_next_page = True
                    cursor = response["cursor"]
                else:
                    should_fetch_next_page = False

    def create(
        self,
        name: str,
        container_image: Optional[str] = None,
        container_args: Optional[str] = None,
        container_environment_variables: Optional[list[str]] = None,
        gpu_specification: Optional[GPUSpecification] = None,
        models: Optional[list[str]] = None,
        resources: Optional[list[str]] = None,
        tags: Optional[list[str]] = None,
        description: Optional[str] = None,
        max_runtime_duration: Optional[isodate.Duration] = None,
        max_queued_duration: Optional[isodate.Duration] = None,
        termination_grace_period_duration: Optional[isodate.Duration] = None,
        result_handling_strategy: str = "UPLOAD",
        result_location: Optional[list[str]] = None,
        secrets: Optional[list[str]] = None,
        helm_chart: Optional[str] = None,
        logs_telemetry_id: Optional[str] = None,
        metrics_telemetry_id: Optional[str] = None,
        traces_telemetry_id: Optional[str] = None,
    ):
        """Create a task with the specification provided by input.

        Args:
            name: Display name of the task.
            container_image: Container image.
            container_args: Container args.
            container_environment_variables: Container environment variables.
            gpu_specification: GPU specifications.
            models: NGC models.
            resources: NGC resources.
            tags: Optional list of tags to create the function with.
            max_runtime_duration: Maximum runtime duration for task. Defaults to forever.
            max_queued_duration: Maximum queued duration for task. Defaults to 72 hours.
            termination_grace_period_duration: Grace period after termination. Defaults to 1 hour.
            description: Description of the task.
            result_handling_strategy: How results should be handled.
            result_location: Where results should be stored. Required if result_handling_strategy is UPLOAD.
            secrets: Optional secret key/value pairs. Form: ["key1:value1", "key2:value2"].
            helm_chart: Helm Chart URL.
            logs_telemetry_id: UUID of telemetry log endpoint to map to task.
            metrics_telemetry_id: UUID of telemetry metrics endpoint to map to task.
            traces_telemetry_id: UUID of telemetry traces endpoint to map to task.

        Raises:
            InvalidArgumentError: If result handling strategy is set to upload and required fields aren't provided.
            ResourceNotFound: If the image or resource cannot be found.

        Returns:
            DotDict: Function Response provided by NVCF
        """
        self.config.validate_configuration(csv_allowed=True)
        org_name: str = self.config.org_name
        url = self._construct_task_endpoint(org_name)

        if not gpu_specification:
            raise NgcException("Must provide 'gpu_specification'")

        if not models and not container_image and not helm_chart:
            raise InvalidArgumentError("Must include either models and/or a container image or helm chart")

        if helm_chart and (container_image or models):
            raise InvalidArgumentError("Can not include helm chart with container image or models")

        # Validate container image.
        if container_image:
            container_image = validate_transform_image(self.client, container_image)

        if helm_chart:
            helm_chart = validate_transform_helm_chart(self.client, helm_chart)

        # Parse environment variables. container_environment_variables
        task_container_environment_variables: list[dict] = []
        if container_environment_variables:
            for key, value in parse_key_value_pairs(container_environment_variables).items():
                task_container_environment_variables.append({"key": key, "value": value})

        # Validate gpu specification.
        if (
            gpu_specification
            and gpu_specification.backend == "GFN"
            and (
                max_runtime_duration is None
                or max_runtime_duration.total_seconds() > isodate.Duration(hours=8).total_seconds()
            )
        ):
            raise InvalidArgumentError("Must include max-runtime-duration < 8 hours if gpu backend is GFN")

        # Validate model(s).
        task_models: list[dict] = []
        for model in models or []:
            task_models.append(validate_transform_model(self.client, model))

        # Validate resource(s).
        task_resources: list[dict] = []
        for resource in resources or []:
            task_resources.append(validate_transform_resource(self.client, resource))

        has_secret_ngc_api_key = False
        task_secrets: list[dict] = []
        if secrets:
            for key, value in parse_key_value_pairs(secrets).items():
                task_secrets.append({"name": key, "value": value})
                if key == "NGC_API_KEY":
                    has_secret_ngc_api_key = True

        # Make sure upload_location and secret "NGC_API_KEY" are provided when result handling strategy is UPLOAD.
        if result_handling_strategy == "UPLOAD":
            if not result_location:
                raise InvalidArgumentError("Must include result-location if result-handling-strategy is UPLOAD")
            if not has_secret_ngc_api_key:
                raise InvalidArgumentError(
                    "Must include 'NGC_API_KEY' in secrets if result-handling-strategy is UPLOAD"
                )

        payload: dict[str, Any] = {
            "name": name,
            "containerImage": container_image,
            "containerArgs": container_args,
            "containerEnvironment": task_container_environment_variables,
            "gpuSpecification": gpu_specification.to_dict(),
            "models": task_models,
            "resources": task_resources,
            "tags": tags,
            "maxRuntimeDuration": isodate.duration_isoformat(max_runtime_duration) if max_runtime_duration else None,
            "maxQueuedDuration": isodate.duration_isoformat(max_queued_duration) if max_queued_duration else None,
            "terminationGracePeriodDuration": (
                isodate.duration_isoformat(termination_grace_period_duration)
                if termination_grace_period_duration
                else None
            ),
            "description": description,
            "resultHandlingStrategy": result_handling_strategy,
            "resultsLocation": result_location,
            "secrets": task_secrets,
            "helmChart": helm_chart,
        }
        if logs_telemetry_id or metrics_telemetry_id or traces_telemetry_id:
            payload["telemetries"] = {
                "logsTelemetryId": logs_telemetry_id,
                "metricsTelemetryId": metrics_telemetry_id,
                "tracesTelemetryId": traces_telemetry_id,
            }

        payload = {key: val for key, val in payload.items() if val}

        response = self.connection.make_api_request(
            "POST",
            url,
            payload=json.dumps(payload),
            auth_org=org_name,
            operation_name="create task",
        )
        return DotDict(response)

    def update_secrets(self, task_id: str, secrets: list[str]):
        """Update a given task's secrets.

        Args:
            task_id: Task's ID.
            secrets: Optional secret key/value pairs.
        """
        self.config.validate_configuration()
        org_name = self.config.org_name
        url = self._construct_task_endpoint(org_name, task_id, secret=True)
        task_secrets: list[dict] = []
        if secrets:
            task_secrets = [{"name": k, "value": v} for k, v in parse_key_value_pairs(secrets).items()]
        payload: dict[str, Any] = {
            "secrets": task_secrets,
        }

        self.connection.make_api_request(
            "PUT",
            url,
            payload=json.dumps(payload),
            auth_org=org_name,
            operation_name="update task secrets",
            json_response=False,
        )

    def list(self, limit: int = 100) -> list[DotDict]:
        """List tasks available to the organization currently set.

        Returns:
            A list of task DotDicts.
        """
        self.config.validate_configuration(csv_allowed=True)
        org_name: str = self.config.org_name
        return self._list_tasks(org_name, limit)

    def _list_tasks(self, org_name: str, limit: int) -> iter:
        """Aggregate lists of tasks."""
        url = self._construct_task_endpoint(org_name)
        return chain(
            *[
                res["tasks"]
                for res in self._pagination_helper(url, org_name=org_name, operation_name="list tasks", limit=limit)
            ]
        )

    def info(self, task_id: str) -> DotDict:
        """Get information about a given task.

        Args:
            task_id: The task to get information about.

        Returns:
            dict: DotDict of task information.
        """
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        url = self._construct_task_endpoint(org_name, task_id)
        response = self.connection.make_api_request("GET", url, auth_org=org_name, operation_name="get task")
        return DotDict(response)

    def delete(self, task_id):
        """Delete a task.

        Args:
            task_id: The task to delete.
        """
        self.config.validate_configuration()
        org_name = self.config.org_name
        url = self._construct_task_endpoint(org_name, task_id)
        self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            operation_name="delete task",
            json_response=False,
        )

    def cancel(self, task_id):
        """Cancel a task.

        Args:
            task_id: The task to cancel
        """
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        url = self._construct_task_endpoint(org_name, task_id) + "/cancel"
        try:
            self.connection.make_api_request("POST", url, auth_org=org_name, operation_name="cancel task")
        except NgcAPIError as e:
            raise NgcAPIError(e) from None

    def events(self, task_id: str, limit: int = 100) -> Iterable[DotDict]:
        """Get a list of the task's events.

        Returns:
            Iterable[DotDict]: Iterable of DotDict of task events.
        """
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        return self._list_events(task_id, org_name=org_name, limit=limit)

    def _list_events(self, task_id: str, org_name: str, limit: int) -> iter:
        """Aggregate lists of events for a task."""
        url = self._construct_task_endpoint(org_name, task_id) + "/events"
        return chain(
            *[
                res["events"]
                for res in self._pagination_helper(
                    url, org_name=org_name, operation_name="list task events", limit=limit
                )
            ]
        )

    def results(self, task_id: str, limit: int = 100) -> Iterable[DotDict]:
        """Get a list of the task's results.

        Returns:
            Iterable[DotDict]: Iterable of DotDict of task results
        """
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        return self._list_results(task_id, org_name=org_name, limit=limit)

    def _list_results(self, task_id: str, org_name: str, limit: int) -> iter:
        """Aggregate lists of results for a task."""
        url = self._construct_task_endpoint(org_name, task_id) + "/results"
        return chain(
            *[
                res["results"]
                for res in self._pagination_helper(
                    url, org_name=org_name, operation_name="list task results", limit=limit
                )
            ]
        )

    def logs(
        self,
        task_id: str,
        limit: int = 100,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        duration: Optional[timedelta] = None,
    ) -> Iterable[DotDict]:
        """Task deployment logs.

        Returns:
            Iterable[DotDict]: Iterable of DotDict of task logs.
        """
        self.config.validate_configuration()

        default_duration = dhms_to_isoduration("1H")
        parsed_duration = dhms_to_isoduration(duration) if duration else None
        (from_date, to_date) = calculate_date_range(
            start_time,
            end_time,
            parsed_duration,
            default_duration=default_duration,
            datetime_format="%Y-%m-%d %H:%M:%S",
        )
        org_name: str = self.config.org_name

        url = self._construct_logs_endpoint(org_name, task_id=task_id)
        parameters = [
            {"name": "start", "value": from_date},
            {"name": "end", "value": to_date},
        ]
        payload = {"parameters": parameters}
        resp = self.connection.make_api_request(
            "POST", url, auth_org=org_name, payload=json.dumps(payload), operation_name="query task logs"
        )
        job_id = resp.get("jobId", "")

        return self._list_logs(job_id, org_name=org_name, limit=limit)

    def _list_logs(self, job_id: str, org_name: str, limit: int) -> iter:
        """Aggregate lists of logs for a task."""
        url = self._construct_logs_endpoint(org_name=org_name, job_id=job_id)
        return chain(
            *[
                res["data"]
                for res in self._pagination_helper(url, org_name=org_name, operation_name="list task logs", limit=limit)
            ]
        )
