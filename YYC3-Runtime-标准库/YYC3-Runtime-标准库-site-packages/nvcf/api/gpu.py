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

from typing import Optional, TYPE_CHECKING, Union

from ngcbase.api.utils import DotDict
from ngcbase.util.utils import extra_args

if TYPE_CHECKING:
    import ngcsdk

    import ngccli.api.apiclient

    Client = Union[ngccli.api.apiclient.APIClient, ngcsdk.APIClient]


class GPUAPI:
    """API for NVCF GPUs."""

    def __init__(self, api_client: Client = None) -> None:
        self.connection = api_client.connection
        self.config = api_client.config
        self.client = api_client

    @staticmethod
    def _construct_gpu_ep(
        org_name: str,
        team_name: Optional[str] = None,
        gpus: Optional[list[str]] = None,
        regions: Optional[list[str]] = None,
        version: Optional[str] = "v2",
    ):
        ep: str = f"{version}/orgs/{org_name}"
        if team_name:
            ep += f"/teams/{team_name}"
        ep += "/ngc/nvcf/deployments/instanceTypes"

        query_params = []
        if gpus is not None:
            query_params.append(f"gpus={','.join(gpus)}")
        if regions is not None:
            query_params.append(f"regions={','.join(regions)}")

        return ep + ("?" + "&".join(query_params) if query_params else "")

    @extra_args
    def capacity(
        self,
        gpus: Optional[list[str]] = None,
        regions: Optional[list[str]] = None,
    ) -> DotDict:
        """Get the available gpus for a given type."""
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url: str = self._construct_gpu_ep(
            org_name,
            team_name,
            version="v3",
            gpus=gpus,
            regions=regions,
        )
        resp = self.connection.make_api_request(
            "GET",
            url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="list gpu capacity",
        )
        return DotDict(resp)

    @extra_args
    def list(self) -> DotDict:
        """Get the available gpus for a given type."""
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        url: str = f"{self._construct_gpu_ep(org_name, team_name)}"
        resp = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="list gpu"
        )
        return DotDict(resp)

    @extra_args
    def info(self, gpu: Optional[str] = None) -> DotDict:
        """Get the available gpus for a given type."""
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        team_name: Optional[str] = self.config.team_name
        if gpu:
            gpu = [gpu]
        url: str = f"{self._construct_gpu_ep(self.config.org_name, self.config.team_name, gpu)}"
        resp = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="info gpu"
        )
        return DotDict(resp)
