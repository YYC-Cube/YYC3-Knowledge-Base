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

import json
from typing import Any, Optional, TYPE_CHECKING, Union

from ngcbase.api.utils import DotDict, get_api_error_class, NgcAPIError
from ngcbase.util.utils import extra_args

if TYPE_CHECKING:
    import ngcsdk

    import ngccli.api.apiclient

    Client = Union[ngccli.api.apiclient.APIClient, ngcsdk.APIClient]


class FunctionAuthorizationAPI:  # noqa: D101
    def __init__(self, api_client: Client = None) -> None:
        self.connection = api_client.connection
        self.config = api_client.config
        self.client = api_client

    @staticmethod
    def _construct_authorization_ep(
        org_name: str,
        function_id: str,
        function_version_id: Optional[str] = None,
        team_name: Optional[str] = None,
    ):
        parts = ["v2/orgs", org_name]
        if team_name:
            parts.extend(["teams", team_name])

        parts.extend(["nvcf", "authorizations", "functions", function_id])

        if function_version_id:
            parts.extend(["versions", function_version_id])

        return "/".join(parts)

    @staticmethod
    def _construct_auth_error(
        error: NgcAPIError,
    ) -> Exception:
        """Format a NVCF exception to populate like a NGC exception."""
        explanation = json.loads(error.explanation)
        error_msg = explanation.get("detail")
        explanation["requestStatus"] = {"statusDescription": error_msg}
        json_expl = json.dumps(explanation)
        cls = get_api_error_class(error.status_code)
        return cls(error, response=error.response, explanation=json_expl, status_code=error.status_code)

    @extra_args
    def info(self, function_id: str, function_version_id: Optional[str] = None) -> DotDict:
        """Get account authorization about a given function/function version.

        Args:
            function_id: Function's ID.
            function_version_id: Function's version ID.

        Returns:
            dict: JSON Response of NVCF function information.
        """
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url = self._construct_authorization_ep(org_name, function_id, function_version_id, team_name)
        try:
            response = self.connection.make_api_request(
                "GET",
                url,
                auth_org=org_name,
                auth_team=team_name,
                operation_name="get function authorization",
            )
        except NgcAPIError as err:
            raise self._construct_auth_error(err) from err

        return DotDict(response)

    @extra_args
    def clear(self, function_id: str, function_version_id: Optional[str] = None) -> DotDict:
        """Delete all extra account authorizations for a given function/function version.

        Args:
            function_id: Function's ID.
            function_version_id: Function's version ID.

        Returns:
            dict: JSON Response of NVCF function information.
        """
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url = self._construct_authorization_ep(org_name, function_id, function_version_id, team_name)

        try:
            response = self.connection.make_api_request(
                "DELETE",
                url,
                auth_org=org_name,
                auth_team=team_name,
                operation_name="delete all extra function authorization",
            )
        except NgcAPIError as err:
            raise self._construct_auth_error(err) from err

        return DotDict(response)

    @extra_args
    def remove(
        self,
        function_id: str,
        function_version_id: Optional[str] = None,
        nca_id: Optional[str] = None,
    ) -> DotDict:
        """Remove authorization for clients to invoke this function/function version.

        Args:
            function_id: Function's ID.
            function_version_id: Function's version ID.
            nca_id: NCA ID of party you wish to authorize.

        Returns:
            dict: JSON Response of NVCF function information.
        """
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url = self._construct_authorization_ep(org_name, function_id, function_version_id, team_name) + "/remove"
        payload: dict[str, Any] = {"authorizedParty": {"ncaId": nca_id}}

        try:
            response = self.connection.make_api_request(
                "PATCH",
                url,
                auth_org=org_name,
                auth_team=team_name,
                operation_name="delete authorizations from this function/version",
                payload=json.dumps(payload),
            )
        except NgcAPIError as err:
            raise self._construct_auth_error(err) from err

        return DotDict(response)

    @extra_args
    def add(
        self,
        function_id: str,
        function_version_id: Optional[str] = None,
        nca_id: Optional[str] = None,
    ) -> DotDict:
        """Authorize additional NCA ids to invoke this function/function version.

        Args:
            function_id: Function's ID.
            function_version_id: Function's version ID.
            nca_id: NCA ID of party you wish to authorize.

        Returns:
            dict: JSON Response of NVCF function information.
        """
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name

        key = "function"
        add_additional = False
        current_authorized_parties = (
            self.info(function_id, function_version_id).get(key, {}).get("authorizedParties", [])
        )
        if len(current_authorized_parties) > 0:
            add_additional = True

        url = self._construct_authorization_ep(org_name, function_id, function_version_id, team_name)
        payload: dict[str, Any] = {"authorizedParties": [{"ncaId": nca_id}]}
        method = "POST"
        if add_additional:
            url = url + "/add"
            method = "PATCH"
            payload: dict[str, Any] = {"authorizedParty": {"ncaId": nca_id}}

        try:
            response = self.connection.make_api_request(
                method,
                url,
                auth_org=org_name,
                auth_team=team_name,
                operation_name="add function authorizations",
                payload=json.dumps(payload),
            )
        except NgcAPIError as err:
            raise self._construct_auth_error(err) from err

        return DotDict(response)
