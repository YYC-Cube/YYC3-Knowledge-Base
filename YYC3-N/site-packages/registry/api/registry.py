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
from ngcbase.api.connection import Connection
from ngcbase.environ import NGC_CLI_SEARCH_SERVICE_URL
from registry.api.chart import ChartAPI, GuestChartAPI
from registry.api.collection import CollectionAPI
from registry.api.csp import CSPAPI
from registry.api.deploy import DeployAPI
from registry.api.encryption_key import EncryptionKeyAPI
from registry.api.image import GuestImageAPI, ImageAPI
from registry.api.label_set import GuestLabelSetAPI, LabelSetAPI
from registry.api.models import GuestModelAPI, ModelAPI
from registry.api.playground import GuestPlaygroundAPI, PlaygroundAPI
from registry.api.publish import PublishAPI
from registry.api.resources import GuestResourceAPI, ResourceAPI
from registry.api.search import RegistryGuestSearchAPI, RegistrySearchAPI
from registry.api.usage import UsageAPI
from registry.api.utils import get_helm_repo_url


class RegistryAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client
        self.config = api_client.config
        self.chart_repo_connection = Connection(base_url=get_helm_repo_url(), api_client=self.client)

    @property
    def model(self):  # noqa: D102
        if self.config.app_key:
            return ModelAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestModelAPI(api_client=self.client)

    @property
    def chart(self):  # noqa: D102
        if self.config.app_key:
            return ChartAPI(api_client=self.client, repo_connection=self.chart_repo_connection)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestChartAPI(api_client=self.client, repo_connection=self.chart_repo_connection)

    @property
    def image(self):  # noqa: D102
        if self.config.app_key:
            return ImageAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        ret = GuestImageAPI(api_client=self.client)
        return ret

    @property
    def resource(self):  # noqa: D102
        if self.config.app_key:
            return ResourceAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestResourceAPI(api_client=self.client)

    @property
    def label_set(self):  # noqa: D102
        if self.config.app_key:
            return LabelSetAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestLabelSetAPI(api_client=self.client)

    @property
    def encryption_key(self):  # noqa: D102
        return EncryptionKeyAPI(api_client=self.client)

    @property
    def collection(self):  # noqa: D102
        return CollectionAPI(api_client=self.client)

    @property
    def publish(self):  # noqa: D102
        return PublishAPI(api_client=self.client)

    @property
    def csp(self):  # noqa: D102
        return CSPAPI(api_client=self.client)

    @property
    def deploy(self):  # noqa: D102
        return DeployAPI(api_client=self.client)

    @property
    def usage(self):  # noqa: D102
        return UsageAPI(api_client=self.client)

    @property
    def search(self):  # noqa: D102
        connection = (
            Connection(base_url=NGC_CLI_SEARCH_SERVICE_URL, api_client=self.client)
            if NGC_CLI_SEARCH_SERVICE_URL
            else self.connection
        )
        if self.config.app_key:
            return RegistrySearchAPI(api_client=self.client, connection=connection)
            # guest is wide open and can access w/o api key
            # internally this is a different api endpoint
        return RegistryGuestSearchAPI(api_client=self.client, connection=connection)

    @property
    def playground(self):  # noqa: D102
        if self.config.app_key:
            return PlaygroundAPI(api_client=self.client)
        # guest is wide open and can access w/o api key
        # internally this is a different api endpoint
        return GuestPlaygroundAPI(api_client=self.client)
