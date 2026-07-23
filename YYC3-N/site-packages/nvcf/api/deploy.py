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

from datetime import datetime, timedelta
import json
from typing import Any, Iterator, Literal, Optional, TYPE_CHECKING, Union
import warnings

from nvcf.api.deployment_spec import (
    DeploymentSpecification,
    TargetedDeploymentSpecification,
)

from ngcbase.api.utils import deprecated, DotDict
from ngcbase.errors import NgcException, ResourceNotFoundException
from ngcbase.util.datetime_utils import calculate_date_range, dhms_to_isoduration
from ngcbase.util.utils import extra_args

if TYPE_CHECKING:
    import ngcsdk

    import ngccli.api.apiclient

    Client = Union[ngccli.api.apiclient.APIClient, ngcsdk.APIClient]

STATUS = Literal[
    "ACTIVE",
    "ERROR",
]


class DeployAPI:  # noqa: D101
    def __init__(self, api_client: Client = None) -> None:
        self.connection = api_client.connection
        self.config = api_client.config
        self.client = api_client

    @staticmethod
    def _construct_base_ep(
        org_name: str,
        team_name: Optional[str] = None,
    ):
        parts = ["v2", "orgs", org_name]
        if team_name:
            parts.extend(["teams", team_name])
        parts.append("nvcf")

        return "/".join(parts)

    @staticmethod
    def _construct_deploy_ep(
        org_name: str,
        team_name: Optional[str] = None,
        function_id: Optional[str] = None,
        function_version_id: Optional[str] = None,
    ):
        parts = [DeployAPI._construct_base_ep(org_name, team_name), "deployments"]
        if function_id and function_version_id:
            parts.extend(["functions", function_id, "versions", function_version_id])
        return "/".join(parts)

    @staticmethod
    def _construct_logs_ep(
        org_name: str,
        function_id: Optional[str] = None,
        team_name: Optional[str] = None,
        function_version_id: Optional[str] = None,
        job_id: Optional[str] = None,
    ) -> str:
        parts = [DeployAPI._construct_base_ep(org_name, team_name), "logs"]

        if job_id:
            parts.append(job_id)
            return "/".join(parts)

        parts.extend(["functions", function_id])
        if function_version_id:
            parts.extend(["versions", function_version_id])
        return "/".join(parts)

    @staticmethod
    def _dep_spec_deprecation_validator(
        deployment_specifications: Optional[list[DeploymentSpecification]] = None,
        targeted_deployment_specifications: Optional[list[TargetedDeploymentSpecification]] = None,
    ):
        if deployment_specifications:
            warnings.warn(
                (
                    "The 'deployment_specifications' argument is deprecated and will be removed soon."
                    "Use targeted_deployment_specifications"
                ),
                PendingDeprecationWarning,
            )

        if deployment_specifications and targeted_deployment_specifications:
            raise NgcException("Cannot use 'targeted_deployment_specifications' with 'deployment_specifications'")

        if not deployment_specifications and not targeted_deployment_specifications:
            raise NgcException("Specify either 'targeted_deployment_specifications' or 'deployment_specifications'")

    @extra_args
    def list(self, status: Optional[STATUS] = None) -> DotDict:
        """List current deployments."""
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url = self._construct_deploy_ep(org_name, team_name)
        response = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="list deployments"
        )
        if status:
            response = {
                "deployments": [dp for dp in response.get("deployments", []) if dp.get("functionStatus") == status]
            }
        return DotDict(response)

    @extra_args
    def info(self, function_id: str, function_version_id: str) -> DotDict:
        """Get information about a given function's deployment."""
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url = self._construct_deploy_ep(org_name, team_name, function_id, function_version_id)
        response = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="get deployment"
        )
        return DotDict(response)

    @extra_args
    def restart(self, function_id: str, function_version_id: str) -> DotDict:
        """Restart a currently deployed function."""
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url = self._construct_deploy_ep(org_name, team_name, function_id, function_version_id)
        payload = {}

        # Apply the same deployment specifications to the restarting function
        try:
            deployment = self.info(function_id, function_version_id)
            payload = {"deploymentSpecifications": deployment.deployment.deploymentSpecifications}
        except ResourceNotFoundException as e:
            raise NgcException("This function does not have a deployment.") from e

        self.delete(function_id, function_version_id, graceful=True)

        response = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(payload),
            operation_name="restart deployment",
        )
        return DotDict(response)

    @extra_args
    def delete(self, function_id: str, function_version_id: str, *, graceful: bool = False):
        """Delete a given deployment."""
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url = self._construct_deploy_ep(org_name, team_name, function_id, function_version_id)
        if graceful:
            url = f"{url}?graceful=true"
        return self.connection.make_api_request(
            "DELETE", url, auth_org=org_name, auth_team=team_name, operation_name="delete deployment"
        )

    @extra_args
    def update(
        self,
        function_id: str,
        function_version_id: str,
        deployment_specifications: Optional[list[DeploymentSpecification]] = None,
        targeted_deployment_specifications: Optional[list[TargetedDeploymentSpecification]] = None,
    ) -> DotDict:
        """Update a given deployment."""
        self._dep_spec_deprecation_validator(deployment_specifications, targeted_deployment_specifications)
        self.config.validate_configuration()
        org_name = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url = self._construct_deploy_ep(org_name, team_name, function_id, function_version_id)
        dep_specs = deployment_specifications if deployment_specifications else targeted_deployment_specifications

        # Check if function exists
        try:
            fn = self.client.cloud_function.functions.info(function_id, function_version_id)
            if "containerImage" in fn.function and any(bool(dep_spec.configuration) for dep_spec in dep_specs):
                raise NgcException("Can not supply configuration on container image function.")
        except ResourceNotFoundException as e:
            raise NgcException(f"Function {function_id}:{function_version_id} doesn't exist") from e

        payload: dict[str, Any] = {"deploymentSpecifications": [dep_spec.to_dict() for dep_spec in dep_specs]}
        payload = {key: val for key, val in payload.items() if val}

        response = self.connection.make_api_request(
            "PUT",
            url,
            payload=json.dumps(payload),
            auth_org=org_name,
            auth_team=team_name,
            operation_name="update deployment",
        )
        return DotDict(response)

    @extra_args
    def create(
        self,
        function_id: str,
        function_version_id: str,
        deployment_specifications: Optional[list[DeploymentSpecification]] = None,
        targeted_deployment_specifications: Optional[list[TargetedDeploymentSpecification]] = None,
    ) -> DotDict:
        """Create a deployment with a function id, version and a set of available deployment specifications."""
        self._dep_spec_deprecation_validator(deployment_specifications, targeted_deployment_specifications)
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url = self._construct_deploy_ep(org_name, team_name, function_id, function_version_id)
        dep_specs = deployment_specifications if deployment_specifications else targeted_deployment_specifications

        # Check if function exists
        try:
            fn = self.client.cloud_function.functions.info(function_id, function_version_id)
            if "containerImage" in fn.function and any(bool(dep_spec.configuration) for dep_spec in dep_specs):
                raise NgcException("Can not supply configuration on container image function.")
        except ResourceNotFoundException as e:
            raise NgcException(f"Function {function_id}:{function_version_id} doesn't exist") from e

        # Check if function deployment already exists
        try:
            self.info(function_id, function_version_id)
            raise NgcException("This function already has a deployment")
        except ResourceNotFoundException:
            pass

        dep_specs = deployment_specifications if deployment_specifications else targeted_deployment_specifications
        payload: dict[str, Any] = {"deploymentSpecifications": [dep_spec.to_dict() for dep_spec in dep_specs]}
        payload = {key: val for key, val in payload.items() if val}

        response = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(payload),
            operation_name="create deployment",
        )

        return DotDict(response)

    @deprecated()
    @extra_args
    def list_cluster_groups(self) -> DotDict:
        """Get the available cluster groups given your organization."""
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url: str = f"{self._construct_base_ep(org_name, team_name)}/clusterGroups"
        resp = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="get cluster groups"
        )
        return DotDict(resp)

    @extra_args
    def query_logs(
        self,
        function_id: str,
        function_version_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        duration: Optional[timedelta] = None,
    ) -> Iterator[dict]:
        """Deployment logs.

        Args:
            function_id: Id of function logs are pulled from.
            duration: Specifies the duration of time, either after begin-time or before end-time.
                Format: [nD][nH][nM][nS]. Default: 1 day, doesn't respect decimal measurements.
            start_time: Specifies the start time for querying logs. Default: None.
            end_time: Specifies the end_time time for querying logs. Default: Now.
            function_version_id: Optional version to specify for function id.

        Returns:
            Iterator: Use to recieve logs one by one.
        """
        helm_function = False
        try:
            function_info = self.client.cloud_function.functions.info(function_id, function_version_id)["function"]
            if function_info.get("helmChart", ""):
                helm_function = True
        except ResourceNotFoundException as e:
            raise NgcException(f"Function {function_id}:{function_version_id} doesn't exist") from e

        default_duration = dhms_to_isoduration("1H")

        (from_date, to_date) = calculate_date_range(
            start_time,
            end_time,
            duration,
            default_duration=default_duration,
            datetime_format="%Y-%m-%d %H:%M:%S",
        )
        org_name = self.config.org_name
        team_name = self.config.team_name
        url: str = self._construct_logs_ep(
            org_name, team_name=team_name, function_id=function_id, function_version_id=function_version_id
        )

        parameters = [
            {"name": "start", "value": from_date},
            {"name": "end", "value": to_date},
        ]
        if helm_function:
            parameters.append({"name": "helm", "value": True})

        payload = {"parameters": parameters}
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(payload),
            operation_name="query logs",
        )
        job_id, metadata = resp.get("jobId", ""), resp.get("metadata", {})
        total_pages, next_page = metadata.get("totalPages", 0), metadata.get("page", 0) + 1
        yield from resp.get("data", [])

        job_url = self._construct_logs_ep(org_name=org_name, team_name=team_name, job_id=job_id)
        next_format_url = job_url + "?page={next_page}&page_size=100"
        while total_pages >= next_page:
            next_url = next_format_url.format(next_page=next_page)
            resp = self.connection.make_api_request(
                "GET", next_url, auth_org=org_name, auth_team=team_name, operation_name="query logs"
            )

            yield from resp.get("data", [])
            next_page += 1
