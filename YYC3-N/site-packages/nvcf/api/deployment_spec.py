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
from typing import Optional, Type, TypeVar
from warnings import warn

from nvcf.api.constants import MAX_REQUEST_CONCURRENCY

from ngcbase.errors import NgcException
from ngcbase.util.utils import snake_to_camel_case

T1 = TypeVar("T1", bound="DeploymentSpecification")
T2 = TypeVar("T2", bound="TargetedDeploymentSpecification")
T3 = TypeVar("T3", bound="GPUSpecification")


class DeploymentSpecification:
    """Represents a deployment specification for NVCF."""

    @classmethod
    def from_str(cls: Type[T1], in_str: str, configuration: Optional[dict] = None) -> T1:
        """Create an instance from a colon-separated string.

        The string must be in the following form:
        backend:gpu:instanceType:minInstances:maxInstances[:maxRequestConcurrency]

        Args:
            in_str: A colon-separated string.
            configuration: Optional arg to include with deployment specification. For Helm chart overrides.

        Returns:
            The created `DeploymentSpecification` instance.

        Raises:
            NgcException: If `in_str` is not in the expected format
        """
        try:
            values = in_str.split(":")
            backend = values[0]
            gpu = values[1]
            instance_type = values[2]
            min_instances = int(values[3])
            max_instances = int(values[4])
            max_request_concurrency = int(values[5]) if len(values) > 5 else 1
            return cls(
                backend=backend,
                gpu=gpu,
                instance_type=instance_type,
                min_instances=min_instances,
                max_instances=max_instances,
                max_request_concurrency=max_request_concurrency,
                configuration=configuration,
            )
        except (IndexError, ValueError):
            raise NgcException(
                "Incorrect deployment specification format: expected "
                "backend:gpu:instanceType:minInstances:maxInstances[:maxRequestConcurrency]."
            ) from None

    @classmethod
    def from_dict(cls: Type[T1], in_dict: dict) -> T1:
        """Create an instance from a dictionary.

        Args:
            in_dict: Dictionary input with keys matching deployment spec.

        Returns:
            The created `DeploymentSpecification` instance.
        """
        backend = in_dict["backend"]
        gpu = in_dict["gpu"]
        min_instances = int(in_dict["minInstances"])
        max_instances = int(in_dict["maxInstances"])
        instance_type = in_dict.get("instanceType", None)
        availability_zones = in_dict.get("availabilityZones", None)
        max_request_concurrency = in_dict.get("maxRequestConcurrency", 1)
        configuration = in_dict.get("configuration", None)
        return cls(
            gpu=gpu,
            backend=backend,
            max_instances=max_instances,
            min_instances=min_instances,
            instance_type=instance_type,
            availability_zones=availability_zones,
            max_request_concurrency=max_request_concurrency,
            configuration=configuration,
        )

    def __init__(
        self,
        backend: str,
        gpu: str,
        min_instances: int,
        max_instances: int,
        instance_type: Optional[str] = None,
        availability_zones: Optional[list[str]] = None,
        max_request_concurrency: Optional[int] = None,
        configuration: Optional[dict] = None,
    ):
        """Deployment specification."""  # noqa: D401
        warn("This class is deprecated, please use TargetedDeploymentSpecification", PendingDeprecationWarning)
        self.gpu = gpu
        self.backend = backend
        self.minInstances = min_instances
        self.maxInstances = max_instances
        self.instanceType = instance_type
        self.availabilityZones = availability_zones
        self.maxRequestConcurrency = max_request_concurrency
        self.configuration = configuration

        if self.minInstances < 0:
            raise NgcException("MinimumInstances cannot be negative")

        if self.maxInstances < self.minInstances:
            raise NgcException("Max Instances must be more than or equal to MinimumInstances")

        if self.maxRequestConcurrency and (
            self.maxRequestConcurrency < 1 or self.maxRequestConcurrency > MAX_REQUEST_CONCURRENCY
        ):
            raise NgcException(f"Max concurrency request must be in between 1 and {MAX_REQUEST_CONCURRENCY}.")

    def to_dict(self) -> dict:
        """Convert the instance into a dictionary representation."""
        return {key: val for key, val in vars(self).items() if val or val == 0}

    def to_str(self) -> str:
        """Convert the instance into a colon-separated string.

        Returns:
            A colon-separated string representation of the instance.
        """
        return (
            f"{self.backend}:{self.gpu}:{self.instance_type}:"
            f"{self.min_instances}:{self.max_instances}:{self.max_request_concurrency}"
        )


class TargetedDeploymentSpecification:
    """Represents the new deployment specification for NVCF."""

    @classmethod
    def from_str(cls: Type[T2], in_str: str, configuration: Optional[dict] = None) -> T2:
        """Create an instance from a colon-separated string.

        The string must be in the following form:
        gpu:instanceType:minInstances:maxInstances[:maxRequestConcurrency][:cluster_1,cluster_2][:region_1,region_2][:attribute_1,attribute_2][:preferredOrder]

        Args:
            in_str: A colon-separated string.
            configuration: Optional arg to include with deployment specification.

        Returns:
            The created `TargetedDeploymentSpecification` instance.

        Raises:
            NgcException: If `in_str` is not in the expected format
        """
        try:
            values = in_str.split(":")
            gpu = values[0]
            instance_type = values[1]
            min_instances = int(values[2])
            max_instances = int(values[3])
            max_request_concurrency = int(values[4]) if len(values) > 4 else 1
            clusters = values[5].split(",") if len(values) > 5 and values[5] else None
            regions = values[6].split(",") if len(values) > 6 and values[6] else None
            attributes = values[7].split(",") if len(values) > 7 and values[7] else None
            preferred_order = int(values[8]) if len(values) > 8 else 1

            return cls(
                gpu=gpu,
                instance_type=instance_type,
                min_instances=min_instances,
                max_instances=max_instances,
                max_request_concurrency=max_request_concurrency,
                clusters=clusters,
                regions=regions,
                attributes=attributes,
                preferred_order=preferred_order,
                configuration=configuration,
            )
        except (IndexError, ValueError) as e:
            raise NgcException(
                "Incorrect deployment specification format: expected "
                "gpu:instanceType:minInstances:maxInstances"
                "[:maxRequestConcurrency][:cluster_1,cluster_2]"
                "[:region_1,region_2][:attribute_1,attribute_2][:preferredOrder]."
            ) from e

    @classmethod
    def from_dict(cls: Type[T2], in_dict: dict) -> T2:
        """Create an instance from a dictionary.

        Args:
            in_dict: Dictionary input with keys matching deployment spec.

        Returns:
            The created `DeploymentSpecification` instance.
        """
        gpu = in_dict["gpu"]
        min_instances = int(in_dict["minInstances"])
        max_instances = int(in_dict["maxInstances"])
        instance_type = in_dict["instanceType"]
        max_request_concurrency = in_dict.get("maxRequestConcurrency", 1)
        regions = in_dict.get("regions", [])
        attributes = in_dict.get("attributes ", [])
        preferred_order = in_dict.get("preferredOrder ", 1)

        return cls(
            gpu=gpu,
            max_instances=max_instances,
            min_instances=min_instances,
            instance_type=instance_type,
            max_request_concurrency=max_request_concurrency,
            regions=regions,
            attributes=attributes,
            preferred_order=preferred_order,
        )

    def __init__(
        self,
        gpu: str,
        min_instances: int,
        max_instances: int,
        instance_type: str,
        *,
        max_request_concurrency: Optional[int] = None,
        attributes: Optional[list[str]] = None,
        regions: Optional[list[str]] = None,
        clusters: Optional[list[str]] = None,
        preferred_order: Optional[int] = 1,
        configuration: Optional[dict] = None,
    ):
        """Deployment specification for new NVCF deployment flow."""
        self.gpu = gpu
        self.min_instances = min_instances
        self.max_instances = max_instances
        self.instance_type = instance_type
        self.max_request_concurrency = max_request_concurrency
        self.attributes = attributes
        self.regions = regions
        self.clusters = clusters
        self.preferred_order = preferred_order
        self.configuration = configuration

        if self.min_instances < 0:
            raise NgcException("MinimumInstances cannot be negative")

        if self.max_instances < self.min_instances:
            raise NgcException("Max Instances must be more than or equal to MinimumInstances")

        if self.max_request_concurrency and (
            self.max_request_concurrency < 1 or self.max_request_concurrency >= MAX_REQUEST_CONCURRENCY
        ):
            raise NgcException(f"Max concurrency request must be in between 1 and {MAX_REQUEST_CONCURRENCY}.")

    def to_dict(self) -> dict:
        """Convert the instance into a dictionary representation."""
        return {snake_to_camel_case(key): val for key, val in vars(self).items() if val or val == 0}

    def to_str(self) -> str:
        """Create a colon-separated string from the instance.

        Returns:
            A colon-separated string representation of the instance.
        """
        clusters_str = ",".join(self.clusters) if self.clusters else ""
        regions_str = ",".join(self.regions) if self.regions else ""
        attributes_str = ",".join(self.attributes) if self.attributes else ""

        return ":".join(
            [
                self.gpu,
                self.instance_type,
                str(self.min_instances),
                str(self.max_instances),
                str(self.max_request_concurrency),
                clusters_str,
                regions_str,
                attributes_str,
                str(self.preferred_order),
            ]
        )


class GPUSpecification:  # noqa: D101
    @classmethod
    def from_str(cls: Type[T3], in_str: str, configuration: Optional[dict] = None) -> T3:
        """Create an instance from a colon-separated string.

        The string must be in the following form:
        gpu:instanceType[:backend]:[:cluster_1,cluster_2]

        Args:
            in_str: A colon-separated string.
            configuration: Optional arg to include with deployment specification. For Helm chart overrides.

        Returns:
            The created `GPUSpecification` instance.

        Raises:
            NgcException: If `in_str` is not in the expected format
        """
        try:
            values = in_str.split(":")
            gpu = values[0]
            instance_type = values[1]
            backend = values[2] if len(values) > 2 and values[2] else None
            clusters = values[3].split(",") if len(values) > 3 and values[3] else None

            return cls(
                gpu=gpu,
                instance_type=instance_type,
                backend=backend,
                configuration=configuration,
                clusters=clusters,
            )
        except (IndexError, ValueError):
            raise NgcException(
                "Incorrect GPUObject format: expected gpu:instanceType[:backend][:cluster_1,cluster_2]"
            ) from None

    def __init__(
        self,
        gpu: str,
        instance_type: str,
        backend: Optional[str] = None,
        configuration: Optional[dict] = None,
        clusters: Optional[list[str]] = None,
    ):
        self.gpu = gpu
        self.instance_type = instance_type
        self.backend = backend
        self.configuration = configuration
        self.clusters = clusters

    def to_dict(self) -> dict:
        """Convert the instance into a dictionary representation."""
        return {snake_to_camel_case(key): val for key, val in vars(self).items() if val}


class GPUObject:  # noqa: D101
    def __init__(self, name, instances, backend):
        self.name = name
        self.instances = instances
        self.backend = backend


def get_available_gpus_from_cluster_groups(cluster_groups: list) -> list[GPUObject]:
    """Returns a list of GPUs from the cluster_groups endpoint."""  # noqa: D401
    gpus = []
    for cluster_group in cluster_groups:
        backend = cluster_group.get("name")
        for gpu in cluster_group.get("gpus", []):
            gpu_name = gpu.get("name")
            instance_types = gpu.get("instanceTypes", [])
            instance_names = [instance_type.get("name") for instance_type in instance_types]
            gpus.append(GPUObject(gpu_name, instance_names, backend))
    return gpus
