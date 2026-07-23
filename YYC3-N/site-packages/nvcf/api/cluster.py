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
from typing import Any, Literal, Optional, TYPE_CHECKING, Union

from ngcbase.api.utils import DotDict
from ngcbase.errors import ResourceNotFoundException
from ngcbase.util.utils import extra_args
from registry.api.utils import get_chart_url

if TYPE_CHECKING:
    import ngcsdk

    import ngccli.api.apiclient

    Client = Union[ngccli.api.apiclient.APIClient, ngcsdk.APIClient]

CLOUD_PROVIDER = Literal["AZURE", "AWS", "OCI", "ON-PREM", "GCP", "DGX-CLOUD"]
REGION = Literal[
    "us-east-1",
    "us-west-1",
    "us-west-2",
    "eu-central-1",
    "eu-west-1",
    "eu-north-1",
    "eu-south-1",
    "ap-east-1",
]


class ClusterAPI:
    """API for NVCF Clusters."""

    def __init__(self, api_client: Client = None) -> None:
        self.connection = api_client.connection
        self.config = api_client.config
        self.client = api_client

    @staticmethod
    def _construct_cluster_ep(
        org_name: str,
        cluster_id: Optional[str] = None,
    ):
        parts = ["v2", "orgs", org_name, "sis", "clusters"]
        if cluster_id:
            parts.append(cluster_id)
        return "/".join(parts)

    @staticmethod
    def _construct_cluster_versions_ep(org_name: str):
        parts = ["v2", "orgs", org_name, "sis", "clusterVersions"]
        return "/".join(parts)

    @staticmethod
    def _construct_key_ep(org_name: str):
        parts = ["v3", "orgs", org_name, "keys", "type", "CLUSTER_KEY"]
        return "/".join(parts)

    def _create_cluster_key(
        self,
        org_name: str,
        cluster_id: str,
        cluster_name: str,
    ) -> DotDict:
        url: str = self._construct_key_ep(org_name)
        expiry_date = datetime.now() + timedelta(weeks=12)
        expiry_date_str = expiry_date.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        payload = {
            "name": cluster_name,
            "expiryDate": expiry_date_str,
            "policies": [
                {
                    "product": "nvcf-cluster-management",
                    "resources": [{"id": cluster_id, "type": "cluster"}],
                    "scopes": ["nvca-cluster"],
                },
                {
                    "product": "nv-cloud-functions",
                    "resources": [{"id": cluster_id, "type": "cluster"}],
                    "scopes": ["nvcf:getCluster"],
                },
                {"product": "artifact-catalog"},
                {"product": "helm-reval", "scopes": ["helmreval:validate", "helmreval:render"]},
            ],
            "type": "CLUSTER_KEY",
        }

        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org_name,
            operation_name="create cluster key",
            payload=json.dumps(payload),
        )
        return DotDict(resp)

    def _versions(
        self,
        org_name: str,
    ) -> DotDict:
        """Get a list of current cluster versions."""
        self.config.validate_configuration()
        url: str = f"{self._construct_cluster_versions_ep(org_name)}"
        resp = self.connection.make_api_request(
            "GET",
            url,
            auth_org=org_name,
            operation_name="list cluster versions",
        )
        return DotDict(resp)

    def _register(
        self,
        cluster_name: str,
        cluster_group_name: str,
        cluster_description: str,
        cloud_provider: CLOUD_PROVIDER,
        region: REGION,
        ssa_client_id: str,
        *,
        capabilities: Optional[list[str]],
        attributes: Optional[list[str]] = None,
        custom_attributes: Optional[list[str]] = None,
        authorized_nca_ids: Optional[list[str]] = None,
        nvca_version: Optional[str] = None,
    ) -> tuple[str, str, str, str]:
        """Cluster Configuration Field Descriptions. Only supported with Device Login Authorization. CLI Only.

        Args:
            cluster_name: The name for the cluster. This field is not changeable once configured.
            cluster_group_name: The name of the cluster group, typically identical to the cluster name,
                allowing function deployment across grouped clusters.
            compute_platform: The cloud platform on which the cluster is deployed.
                Standard label format is <Platform>.GPU.<GPUName>.
            cluster_description: Optional description providing additional context about the cluster.
            cloud_provider: Cloud provider to which cluster belongs.
            region: The region where the cluster is deployed.
            ssa_client_id: Starfleet Service Account (SSA) Client
                ID is required to verify your cluster with Cloud Functions.

        Keyword Args:
            nca_id: Owner's nca id.
            capabilities: Capabilities of the cluster.
            attributes: Attributes related to the cluster.
            custom_attributes: Custom attributes related to the cluster.
            nvca_version: Cluster Agent Version. If not specified will use the latest.
            authorized_nca_ids: List of NVIDIA Cloud Account IDs to share this cluster with.

        Returns:
            cluster_id, api_key, nca_id, operator_url: Needed for registration.
        """
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        url: str = f"{self._construct_cluster_ep(org_name)}"
        nca_id = self.client.organization.organization.get_org_detail(org_name).billingAccountId
        versions = self.client.cloud_function.clusters._versions(org_name).get("nvcaVersions", [])
        operator_version = versions[0].get("operatorVersion", "") if len(versions) > 0 else ""
        operator_url = f"{get_chart_url()}/nvidia/nvcf-byoc/charts/nvca-operator-{operator_version}"

        if not nvca_version:
            nvca_version = versions[0].get("version", "") if len(versions) > 0 else ""

        payload: dict[str, Any] = {
            "clusterName": cluster_name,
            "clusterGroupName": cluster_group_name,
            "clusterDescription": cluster_description,
            "authorizedNCAIds": authorized_nca_ids,
            "cloudProvider": cloud_provider,
            "region": region,
            "ssaClientId": ssa_client_id,
            "ncaId": nca_id,
            "attributes": attributes,
            "customAttributes": custom_attributes,
            "nvcaVersion": nvca_version,
            "capabilities": capabilities,
        }
        payload = {key: val for key, val in payload.items() if val}
        cluster = DotDict(
            self.connection.make_api_request(
                "POST",
                url,
                auth_org=org_name,
                operation_name="register cluster",
                payload=json.dumps(payload),
            )
        )
        cluster_id = cluster.clusterId
        key = self._create_cluster_key(org_name, cluster_id, cluster_name).apiKey.value
        return cluster_id, key, nca_id, operator_url

    @extra_args
    def delete(self, cluster_id: str):
        """Delete a given cluster.

        Args:
            cluster_id: UUID of the cluster.
        """
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        url: str = f"{self._construct_cluster_ep(org_name, cluster_id)}"
        self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org_name,
            operation_name="delete cluster",
            json_response=False,
        )

    @extra_args
    def info(self, cluster_id: str) -> DotDict:
        """Get info for a given cluster.

        Args:
            cluster_id: UUID of the cluster.
        """
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        # When info endpoint is proxied we can just call that.
        url: str = f"{self._construct_cluster_ep(org_name)}"
        resp = self.connection.make_api_request("GET", url, auth_org=org_name, operation_name="info cluster")
        for cluster in resp:
            if cluster.get("clusterId", None) == cluster_id:
                return DotDict(cluster)
        raise ResourceNotFoundException(f"{cluster_id} not found") from None

    @extra_args
    def list(self) -> list[DotDict]:
        """Get the available clusters."""
        self.config.validate_configuration()
        org_name: str = self.config.org_name
        url: str = f"{self._construct_cluster_ep(org_name)}"
        resp = self.connection.make_api_request("GET", url, auth_org=org_name, operation_name="list cluster")
        return [DotDict(cluster) for cluster in resp]
