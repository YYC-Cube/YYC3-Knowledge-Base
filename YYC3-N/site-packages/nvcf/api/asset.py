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
import logging
from mimetypes import guess_type
import os
from typing import Optional

from nvcf.api.utils import get_nvcf_url_per_environment

from ngcbase.api.connection import Connection
from ngcbase.constants import SCOPED_KEY_PREFIX
from ngcbase.environ import NVCF_SAK
from ngcbase.errors import NgcException
from ngcbase.tracing import TracedSession
from ngcbase.util.utils import extra_args

logger = logging.getLogger(__name__)


class AssetAPI:  # noqa: D101
    def __init__(self, api_client) -> None:
        self.connection = api_client.connection
        self.config = api_client.config
        self.nvcf_connection = Connection(get_nvcf_url_per_environment(), api_client)

    @staticmethod
    def _construct_url(asset_id: Optional[str] = None) -> str:
        ep: str = "v2/nvcf/assets"
        if asset_id:
            ep += f"/{asset_id}"
        return ep

    @extra_args
    def list(self, starfleet_api_key: Optional[str] = None) -> dict:
        """List assets available to the account.

        Args:
            starfleet_api_key: api key with access to invoke functions

        Returns:
            dict: Keyed List of Functions.
        """
        conf_sf_key = None
        if self.config.app_key and self.config.app_key.startswith(SCOPED_KEY_PREFIX):
            conf_sf_key = self.config.app_key
        starfleet_api_key = starfleet_api_key or conf_sf_key or NVCF_SAK
        if not starfleet_api_key:
            # Will only present this through SDK, CLI has additional method of passing in through getpaswd
            raise NgcException("Please set the environment variable $NVCF_SAK or pass key in as sak_key")

        extra_auth_headers = {"Authorization": f"Bearer {starfleet_api_key}"}
        org_name = self.config.org_name
        url = self._construct_url()
        response = self.nvcf_connection.make_api_request(
            "GET", url, auth_org=org_name, operation_name="list assets", extra_auth_headers=extra_auth_headers
        )
        return response

    @extra_args
    def info(self, asset_id: str, starfleet_api_key: Optional[str] = None) -> dict:
        """Get metadata about a given function and version id.

        Args:
            asset_id: A unique identifier for the asset.

            starfleet_api_key: An API key with access to manage assets.

        Returns:
            dict: JSON Response of NVCF function information.
        """
        conf_sf_key = None
        if self.config.app_key and self.config.app_key.startswith(SCOPED_KEY_PREFIX):
            conf_sf_key = self.config.app_key
        starfleet_api_key = starfleet_api_key or conf_sf_key or NVCF_SAK
        if not starfleet_api_key:
            # Will only present this through SDK, CLI has additional method of passing in through getpaswd
            raise NgcException("Please set the environment variable $NVCF_SAK or pass key in as sak_key")

        extra_auth_headers = {"Authorization": f"Bearer {starfleet_api_key}"}

        url = self._construct_url(asset_id=asset_id)
        response = self.nvcf_connection.make_api_request(
            "GET", url, operation_name="get asset", extra_auth_headers=extra_auth_headers
        )
        return response

    @extra_args
    def delete(self, asset_id: str, starfleet_api_key: Optional[str] = None) -> None:
        """Delete a given asset, removing the ability to use for future invocations.

        Args:
            asset_id: A unique identifier for the asset.

            starfleet_api_key: An API key with access to manage assets.

        Returns:
            dict: JSON Response of NVCF function information.
        """
        conf_sf_key = None
        if self.config.app_key and self.config.app_key.startswith(SCOPED_KEY_PREFIX):
            conf_sf_key = self.config.app_key
        starfleet_api_key = starfleet_api_key or conf_sf_key or NVCF_SAK
        if not starfleet_api_key:
            # Will only present this through SDK, CLI has additional method of passing in through getpaswd
            raise NgcException("Please set the environment variable $NVCF_SAK or pass key in as sak_key")

        extra_auth_headers = {"Authorization": f"Bearer {starfleet_api_key}"}

        url = self._construct_url(asset_id=asset_id)
        self.nvcf_connection.make_api_request(
            "DELETE", url, operation_name="delete asset", extra_auth_headers=extra_auth_headers, json_response=False
        )

    @extra_args
    def upload(self, path: str, description: str, starfleet_api_key: Optional[str] = None) -> dict:  # noqa: D417
        """Upload a given metadata about a given function and version id.

        Args:
            asset_id: A unique identifier for the asset.

            starfleet_api_key: An API key with access to manage assets.

        Returns:
            dict: JSON Response of NVCF function information.
        """
        conf_sf_key = None
        if self.config.app_key and self.config.app_key.startswith(SCOPED_KEY_PREFIX):
            conf_sf_key = self.config.app_key
        starfleet_api_key = starfleet_api_key or conf_sf_key or NVCF_SAK
        if not starfleet_api_key:
            # Will only present this through SDK, CLI has additional method of passing in through getpaswd
            raise NgcException("Please set the environment variable $NVCF_SAK or pass key in as sak_key")

        if not os.path.exists(path) or not os.path.isfile(path):
            raise NgcException("Given path doesn't exist or isn't a file")
        mime, _ = guess_type(path, strict=False)
        if mime is None:
            mime = "application/octet-stream"

        extra_auth_headers = {"Authorization": f"Bearer {starfleet_api_key}", "accept": "application/json"}
        url = self._construct_url()
        payload = {"contentType": mime, "description": description}
        response = self.nvcf_connection.make_api_request(
            "POST",
            url,
            payload=json.dumps(payload),
            operation_name="create asset",
            extra_auth_headers=extra_auth_headers,
        )
        asset_id, upload_url = response.get("assetId"), response.get("uploadUrl")
        upload_response = self._upload_to_s3(path, mime, description, upload_url)
        response = {
            "asset_id": asset_id,
            "response_code": upload_response.status_code,
        }
        return response

    @staticmethod
    def _upload_to_s3(path: str, content_type, description: str, presigned_url: str):
        headers = {
            "Content-Type": content_type,
            "x-amz-meta-nvcf-asset-description": description,
        }
        with open(path, "rb") as asset_buff:
            logger.debug("Uploading asset from path %s", path)
            with TracedSession() as session:
                response = session.request(
                    method="PUT",
                    url=presigned_url,
                    data=asset_buff,
                    headers=headers,
                    operation_name="upload asset",
                )
                logger.debug("Response for upload, status: %s", response.status_code)
                return response
