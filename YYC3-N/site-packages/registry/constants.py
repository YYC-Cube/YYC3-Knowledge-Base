#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
# Holds all the constants used in the module

from enum import Enum

HELM_URL_MAPPING = {
    "prod": "https://helm.ngc.nvidia.com",
    "stg": "https://helm.stg.ngc.nvidia.com",
    "canary": "https://helm.canary.ngc.nvidia.com",
    "dev": "https://helm.dev.ngc.nvidia.com",
}

REGISTRY_URL_MAPPING = {"prod": "nvcr.io", "stg": "stg.nvcr.io", "canary": "canary.nvcr.io", "dev": "dev.nvcr.io"}

# TODO: all dynamic values in this file should be replaced by configuration profiles


class CollectionArtifacts(Enum):
    """Enums with their mappings between their contemporary names and API definitions."""

    MODEL = "models"
    MODELS = "models"
    CHART = "helm-charts"
    HELM_CHARTS = "helm-charts"
    RESOURCE = "recipes"
    RESOURCES = "recipes"
    IMAGE = "repositories"
    IMAGES = "repositories"
