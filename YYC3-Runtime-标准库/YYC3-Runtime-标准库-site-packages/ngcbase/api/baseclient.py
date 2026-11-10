#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import functools

from ngcbase.api.authentication import Authentication
from ngcbase.api.configuration import Configuration
from ngcbase.api.connection import Connection
from ngcbase.api.search import GuestSearchAPI, SearchAPI
from ngcbase.environ import NGC_CLI_SEARCH_SERVICE_URL
from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class BaseClient:  # noqa: D101
    def __init__(self, base_url=None, api_key=None):
        self.api_key = api_key
        self.base_url = base_url
        self.config = Configuration(api_client=self)
        self.authentication = Authentication(api_client=self)
        self.connection = Connection(base_url=base_url, api_client=self)
        self.printer = NVPrettyPrint(config=self.config)

    @functools.cached_property
    def search(self):  # noqa: D102
        connection = (
            Connection(base_url=NGC_CLI_SEARCH_SERVICE_URL, api_client=self)
            if NGC_CLI_SEARCH_SERVICE_URL
            else self.connection
        )
        if self.config.app_key:
            return SearchAPI(api_client=self, connection=connection)
            # guest is wide open and can access w/o api key
            # internally this is a different api endpoint
        return GuestSearchAPI(api_client=self, connection=connection)
