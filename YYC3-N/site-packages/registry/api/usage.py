#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.constants import API_VERSION
from registry.data.api.MeteringQueryRequest import MeteringQueryRequest
from registry.data.api.MeteringResultListResponse import MeteringResultListResponse


class UsageAPI:
    """Metering API."""

    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client
        self.config = api_client.config

    @staticmethod
    def _get_metering_endpoint(org_name):
        """Constructs the Metering base endpoint.

        {ver}/org/{org}/metering
        """  # noqa: D401
        return "{ver}/org/{org}/metering".format(ver=API_VERSION, org=org_name)

    def info(self):  # noqa: D102
        org_name = self.config.org_name

        request = MeteringQueryRequest({"measurements": [{"type": "REGISTRY_STORAGE_UTILIZATION_MONTHLY"}]})

        response = self.connection.make_api_request(
            "GET",
            self._get_metering_endpoint(org_name),
            auth_org=org_name,
            params={"q": request.toJSON()},
            content_type="application/json",
            operation_name="private registry usage",
        )

        return MeteringResultListResponse(response)
