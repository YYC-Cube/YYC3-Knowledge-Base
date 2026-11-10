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

import logging

from nvcf.api.asset import AssetAPI
from nvcf.api.cluster import ClusterAPI
from nvcf.api.deploy import DeployAPI
from nvcf.api.function import FunctionAPI
from nvcf.api.gpu import GPUAPI
from nvcf.api.registry_credential import RegistryCredentialAPI
from nvcf.api.task import TaskAPI
from nvcf.api.telemetry_endpoint import TelemetryEndpointAPI

logger = logging.getLogger(__name__)


class CloudFunctionAPI:  # noqa: D101
    def __init__(self, api_client):
        self.client = api_client

    @property
    def deployments(self):  # noqa: D102
        logger.warning(
            (
                "WARNING: Property clt.cloud_function.deployments is deprecated,"
                "use clt.cloud_function.functions.deployments instead."
            )
        )
        return DeployAPI(api_client=self.client)

    @property
    def functions(self):  # noqa: D102
        return FunctionAPI(api_client=self.client)

    @property
    def tasks(self):  # noqa: D102
        return TaskAPI(api_client=self.client)

    @property
    def assets(self):  # noqa: D102
        return AssetAPI(api_client=self.client)

    @property
    def gpus(self):  # noqa: D102
        return GPUAPI(api_client=self.client)

    @property
    def clusters(self):  # noqa: D102
        return ClusterAPI(api_client=self.client)

    @property
    def telemetry_endpoints(self):  # noqa: D102
        return TelemetryEndpointAPI(api_client=self.client)

    @property
    def registry_credentials(self):  # noqa: D102
        return RegistryCredentialAPI(api_client=self.client)
