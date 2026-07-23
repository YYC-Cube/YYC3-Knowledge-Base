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

#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from basecommand.api.quickstart_cluster import (
    GuestQuickStartClusterAPI,
    QuickStartClusterAPI,
)
from basecommand.api.quickstart_project import (
    GuestQuickStartProjectAPI,
    QuickStartProjectAPI,
)


class BaseQuickStartAPI:  # noqa: D101
    def __init__(self, api_client):
        self.client = api_client

    @property
    def cluster(self) -> QuickStartClusterAPI:  # noqa: D102
        if self.client.config.app_key:
            return QuickStartClusterAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestQuickStartClusterAPI(api_client=self.client)

    @property
    def project(self) -> QuickStartProjectAPI:  # noqa: D102
        if self.client.config.app_key:
            return QuickStartProjectAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestQuickStartProjectAPI(api_client=self.client)
