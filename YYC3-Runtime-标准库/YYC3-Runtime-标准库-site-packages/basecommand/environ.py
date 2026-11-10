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

NGC_CLI_IM_ENABLE = "NGC_CLI_IM_ENABLE" in environ

NGC_CLI_DM_IMAGE = environ.get("NGC_CLI_DM_IMAGE")
NGC_CLI_DM_LOG_LEVEL = environ.get("NGC_CLI_DM_LOG_LEVEL")
NGC_CLI_DM_MANIFEST_ENABLE = "NGC_CLI_DM_MANIFEST_ENABLE" in environ
