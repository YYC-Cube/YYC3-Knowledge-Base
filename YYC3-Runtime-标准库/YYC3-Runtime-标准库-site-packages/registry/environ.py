#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

# pylint: disable=os-environ
from os import environ

# Internal override of the service URLs
NGC_CLI_PUBLISH_SERVICE_URL = environ.get("NGC_CLI_PUBLISH_SERVICE_URL")
NGC_CLI_REGISTRY_SERVICE_URL = environ.get("NGC_CLI_REGISTRY_SERVICE_URL")
