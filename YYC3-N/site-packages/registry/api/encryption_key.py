#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

import logging
import time
from typing import Literal

from ngcbase.api.utils import DotDict
from ngcbase.util.utils import extra_args
from registry.api.utils import get_auth_org_and_team, SimpleRegistryTarget
from registry.printer.encryption_key import EncryptionKeyPrinter

PAGE_SIZE = 1000
logger = logging.getLogger(__name__)


class EncryptionKeyAPI:
    """API for managing encryption keys in the registry.

    This class provides methods to list, get info, remove, and disassociate encryption keys.
    Encryption keys are used to lock models/resources at creation time or associate them
    while the model is empty.
    """

    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client
        self.config = api_client.config
        self.printer = EncryptionKeyPrinter(api_client.config)

    @extra_args
    def list(self, team_name=None) -> DotDict:
        """List encryption keys accessible by the user in the specified scope.

        Unlike other artifacts, encryption keys are scoped to specific org/team combinations
        and cannot be used across different scopes. Organization is always inherited from
        the current configuration, but team scope can be overridden.

        Args:
            team_name (str, optional): Team name to list keys from.
                                     Uses configured team if not provided.
                                     Pass None for org-level keys only.

        Returns:
            DotDict: Dotdict containing encryption keys response scoped to specified org/team

        Raises:
            ResourceNotFoundException: If no encryption keys are found in the specified scope
        """
        self.config.validate_configuration(guest_mode_allowed=False)

        target_org = self.config.org_name
        target_team = team_name or self.config.team_name

        if target_team:
            endpoint = f"v2/artifact-registry/org/{target_org}/team/{target_team}/encryption-keys"
        else:
            endpoint = f"v2/artifact-registry/org/{target_org}/encryption-keys"

        resp = self.connection.make_api_request(
            "GET",
            endpoint,
            auth_org=target_org,
            auth_team=target_team,
            operation_name="list encryption keys",
        )
        return DotDict(resp)

    @extra_args
    def info(self, encryption_key_id: str, artifact_type: Literal["model"] = "model") -> DotDict:
        """Get encryption key details and associated artifacts.

        Args:
            encryption_key_id: Scoped encryption key target (format: [org/[team/]]keyid)
            artifact_type: Artifact type to query (default: "model")

        Returns:
            DotDict: Dotdict containing encryption key details including associated artifacts

        Raises:
            ResourceNotFoundException: If the encryption key is not found
        """
        self.config.validate_configuration(guest_mode_allowed=False)
        target = SimpleRegistryTarget(encryption_key_id, org_required=True, name_required=True)
        org_name, team_name = get_auth_org_and_team(
            target.org, target.team, self.config.org_name, self.config.team_name
        )

        if team_name:
            endpoint = f"v2/artifact-registry/org/{org_name}/team/{team_name}/encryption-keys/{target.name}"
        else:
            endpoint = f"v2/artifact-registry/org/{org_name}/encryption-keys/{target.name}"

        resp = self.connection.make_api_request(
            "GET",
            endpoint,
            auth_org=org_name,
            auth_team=team_name,
            params={"artifact-type": artifact_type.upper()},
            operation_name="get encryption key info",
        )

        result = DotDict(resp)

        # Add artifactType to each artifact since API doesn't return it
        if hasattr(result, "artifacts") and result.artifacts:
            for artifact in result.artifacts:
                if isinstance(artifact, dict):
                    artifact["artifactType"] = artifact_type.upper()
                else:
                    setattr(artifact, "artifactType", artifact_type.upper())

        return result

    @extra_args
    def remove_async(self, encryption_key_id: str) -> DotDict:
        """Remove encryption key and all associated artifacts (async operation).

        This API initiates an async operation (returns 202 Accepted) that removes
        the encryption key and all associated artifacts. The response contains a
        statusUrl that can be used to poll for completion status via the
        status() method.

        Args:
            encryption_key_id: Scoped encryption key target (format: [org/[team/]]keyid)

        Returns:
            DotDict: Response containing statusUrl and operation details.
                    HTTP 202 Accepted with statusUrl for polling.

        Raises:
            ResourceNotFoundException: If the encryption key is not found
        """
        self.config.validate_configuration(guest_mode_allowed=False)
        target = SimpleRegistryTarget(encryption_key_id, org_required=True, name_required=True)
        org_name, team_name = get_auth_org_and_team(
            target.org, target.team, self.config.org_name, self.config.team_name
        )

        if team_name:
            endpoint = f"v2/artifact-registry/org/{org_name}/team/{team_name}/encryption-keys/{target.name}"
        else:
            endpoint = f"v2/artifact-registry/org/{org_name}/encryption-keys/{target.name}"

        resp = self.connection.make_api_request(
            "DELETE",
            endpoint,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove encryption key",
        )

        return DotDict(resp)

    @extra_args
    def disassociate_async(self, model: str) -> DotDict:
        """Disassociate model from encryption key (async operation).

        This API initiates an async operation (returns 202 Accepted) that disassociates
        a model from its encryption key. The response contains a statusUrl that can be
        used to poll for completion status via the status() method.

        Args:
            model: Model to disassociate (format: org/[team/]model_name or just model_name)

        Returns:
            DotDict: Response containing statusUrl and operation details.
                    HTTP 202 Accepted with statusUrl for polling.

        Raises:
            ResourceNotFoundException: If the specified model is not found
        """
        self.config.validate_configuration(guest_mode_allowed=False)

        target = SimpleRegistryTarget(model, org_required=True, name_required=True)

        if target.team:
            endpoint = f"v2/org/{target.org}/team/{target.team}/models/{target.name}/encryption-key"
        else:
            endpoint = f"v2/org/{target.org}/models/{target.name}/encryption-key"

        resp = self.connection.make_api_request(
            "DELETE",
            endpoint,
            auth_org=target.org,
            auth_team=target.team,
            operation_name="disassociate model",
        )

        return DotDict(resp)

    @extra_args
    def status(self, status_url: str) -> DotDict:
        """Get status of encryption key workflow operations using the status URL.

        Args:
            status_url: Status URL returned from async operations \
                (e.g., "/v2/artifact-registry/org/nvidia/workflows/...")

        Returns:
            DotDict: Dotdict containing workflow status information

        Raises:
            ResourceNotFoundException: If the workflow is not found
        """
        self.config.validate_configuration(guest_mode_allowed=False)

        resp = self.connection.make_api_request(
            "GET",
            status_url,
            auth_org=self.config.org_name,
            auth_team=self.config.team_name,
            operation_name="get workflow status",
        )

        return DotDict(resp)

    def wait_for_completion(
        self, status_url: str, timeout_seconds: int = 300, poll_interval_seconds: int = 5
    ) -> DotDict:
        """Poll workflow status until completion or timeout.

        This is a convenience method for the command layer to handle polling logic.
        It repeatedly calls status() until the workflow is complete or timeout is reached.

        Args:
            status_url: Status URL returned from async operations
            timeout_seconds: Maximum time to wait in seconds (default: 300)
            poll_interval_seconds: Time between status checks in seconds (default: 5)

        Returns:
            DotDict: Final workflow status

        Raises:
            TimeoutError: If the workflow doesn't complete within timeout_seconds
            ResourceNotFoundException: If the workflow is not found
            ValueError: If the status URL format is invalid
        """
        start_time = time.time()

        while True:
            status_resp = self.status(status_url)
            workflow_status = status_resp.get("status", "").lower()
            if workflow_status.lower() in ["completed", "success", "finished"]:
                return status_resp
            if workflow_status.lower() in ["failed", "error"]:
                raise RuntimeError(f"Workflow failed with status: {workflow_status}")

            if time.time() - start_time > timeout_seconds:
                raise TimeoutError(f"Workflow did not complete within {timeout_seconds} seconds")

            time.sleep(poll_interval_seconds)
