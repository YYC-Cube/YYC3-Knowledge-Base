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
from ngcbase.constants import API_VERSION


class StorageAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection

    def request_user_storage_quota(self, org_name, ace_name):
        """Request user storage quota for current logged in user for a specific ACE."""
        base_url = "{api_version}/org/{org_name}/aces/{ace_name}/storage/request".format(
            api_version=API_VERSION, org_name=org_name, ace_name=ace_name
        )
        response = self.connection.make_api_request(
            "POST", base_url, auth_org=org_name, operation_name="request user storage quota"
        )
        return response
