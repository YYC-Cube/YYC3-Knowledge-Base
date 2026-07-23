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

#
import json

from ngcbase.api.pagination import pagination_helper
from ngcbase.errors import ResourceNotFoundException
from registry.data.model.CloudServiceProvider import CloudServiceProvider
from registry.data.model.CloudServiceProviderListResponse import (
    CloudServiceProviderListResponse,
)
from registry.data.model.DeploymentParameters import DeploymentParameters
from registry.data.model.DeploymentParametersMeta import DeploymentParametersMeta
from registry.data.model.Response import Response
from registry.errors import CSPNotFoundException


class CSPAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client
        self.endpoint_version = "v2"

    def _get_url(self, csp=None):
        """Build an endpoint with the csp value if provided, e.g. /v2/csps[/csp]"""  # noqa: D415
        parts = [self.endpoint_version, "csps"]
        if csp:
            parts.append(csp)
        return "/".join(parts)

    def _get_defaults_url(self, csp):
        """Build an endpoint with the csp value, e.g. /v2/csps/{csp}/deployments/params"""  # noqa: D415
        return f"{self.endpoint_version}/csps/{csp}/deployments/params"

    def _get_settings_url(self, csp):
        """Build an endpoint with the csp value, e.g. /v2/csps/{csp}/deployments/params/meta"""  # noqa: D415
        return f"{self._get_defaults_url(csp)}/meta"

    def create(self, create_request, org=None, team=None):
        """POST a create request to the API."""
        endpoint = self._get_url()
        response = self.connection.make_api_request(
            "POST", endpoint, payload=create_request.toJSON(), auth_org=org, auth_team=team, operation_name="create csp"
        )
        return CloudServiceProvider(response)

    def info(self, name, org=None, team=None):
        """GET CSP info by name key."""
        endpoint = self._get_url(name)
        response = self.connection.make_api_request(
            "GET", endpoint, payload=None, auth_org=org, auth_team=team, operation_name="info csp"
        )
        return CloudServiceProvider(response)

    def update(self, name, update_request, org=None, team=None):
        """PATCH an update to a CSP."""
        endpoint = self._get_url(name)
        response = self.connection.make_api_request(
            "PATCH",
            endpoint,
            payload=update_request.toJSON(),
            auth_org=org,
            auth_team=team,
            operation_name="update csp",
        )
        return CloudServiceProvider(response)

    def list(self, org=None, team=None, enabled_only=False):
        """GET a list of CSPs."""
        include_all = not enabled_only
        endpoint = f"{self._get_url()}/?include-disabled={str(include_all).lower()}"
        for page in pagination_helper(
            self.connection, endpoint, org_name=org, team_name=team, operation_name="list csp"
        ):
            yield CloudServiceProviderListResponse(page)

    def remove(self, name, org=None, team=None):
        """DELETE a CSP."""
        endpoint = self._get_url(name)
        response = self.connection.make_api_request(
            "DELETE", endpoint, payload=None, auth_org=org, auth_team=team, operation_name="delete csp"
        )
        return Response(response)

    def info_settings(self, csp, org=None, team=None):
        """GET parameter info from API."""
        ep = self._get_url(csp)
        # Make sure that the CSP exists
        try:
            response = self.connection.make_api_request(
                "HEAD", ep, auth_org=org, auth_team=team, json_response=False, operation_name="csp head"
            )
        except ResourceNotFoundException:
            # Raise a specific exception to distinguish from a legitimate CSP with no settings.
            raise CSPNotFoundException(csp_name=csp) from None
        ep = self._get_settings_url(csp)
        response = self.connection.make_api_request(
            "GET", ep, payload=None, auth_org=org, auth_team=team, operation_name="info csp settings"
        )
        settings = DeploymentParametersMeta(response)
        ep = self._get_defaults_url(csp)
        response = self.connection.make_api_request(
            "GET", ep, payload=None, auth_org=org, auth_team=team, operation_name="info csp defaults"
        )
        defaults = DeploymentParameters(response)
        return (settings, defaults)

    def create_settings(self, csp, settings_create_request, defaults_create_request, org=None, team=None):
        """POST constraints on deployments for a CSP."""
        ep = self._get_settings_url(csp)
        payload = settings_create_request.toJSON()
        settings_response = self.connection.make_api_request(
            "POST",
            ep,
            payload=payload,
            auth_org=org,
            auth_team=team,
            operation_name="create csp settings",
        )
        settings = DeploymentParametersMeta(settings_response)
        defaults = None
        payload = defaults_create_request.toJSON()
        if payload:
            ep = self._get_defaults_url(csp)
            defaults_response = self.connection.make_api_request(
                "POST",
                ep,
                payload=payload,
                auth_org=org,
                auth_team=team,
                operation_name="create csp defaults",
            )
            defaults = DeploymentParameters(defaults_response)
        return (settings, defaults)

    def update_settings(self, csp, settings_payload, defaults_payload, org=None, team=None):
        """PATCH constraints on deployments for a CSP."""
        if settings_payload:
            ep = self._get_settings_url(csp)
            payload = json.dumps(settings_payload)
            response = self.connection.make_api_request(
                "PATCH", ep, payload=payload, auth_org=org, auth_team=team, operation_name="update csp settings"
            )
            settings = DeploymentParametersMeta(response)
        if defaults_payload:
            ep = self._get_defaults_url(csp)
            payload = json.dumps(defaults_payload)
            response = self.connection.make_api_request(
                "PATCH", ep, payload=payload, auth_org=org, auth_team=team, operation_name="update csp defaults"
            )
            defaults = DeploymentParameters(response)
        return (settings, defaults)

    def remove_settings(self, csp, org=None, team=None):
        """DELETE constraints for a CSP."""
        ep = self._get_settings_url(csp)
        response = self.connection.make_api_request(
            "DELETE", ep, payload=None, auth_org=org, auth_team=team, operation_name="delete csp settings"
        )
        settings_response = Response(response)
        ep = self._get_defaults_url(csp)
        response = self.connection.make_api_request(
            "DELETE", ep, payload=None, auth_org=org, auth_team=team, operation_name="delete csp defaults"
        )
        defaults_response = Response(response)
        return (settings_response, defaults_response)
