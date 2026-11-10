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

import functools

from basecommand.api.aces import AceAPI
from basecommand.api.datamover import DataMoverAPI
from basecommand.api.dataset import DatasetAPI
from basecommand.api.jobs import JobsAPI
from basecommand.api.measurements import MeasurementsAPI
from basecommand.api.quickstart import BaseQuickStartAPI
from basecommand.api.resource import ResourceAPI
from basecommand.api.resultset import ResultsetAPI
from basecommand.api.search import BaseCommandSearchAPI
from basecommand.api.utils import get_data_mover_service_url, get_dataset_service_url
from basecommand.api.workspace import WorkspaceAPI
from ngcbase.api.connection import Connection
from ngcbase.environ import NGC_CLI_SEARCH_SERVICE_URL


class BasecommandAPI:  # noqa: D101
    def __init__(self, api_client):
        self.client = api_client
        self.data_mover_connection = Connection(base_url=get_data_mover_service_url(), api_client=api_client)
        self.dataset_service_connection = Connection(base_url=get_dataset_service_url(), api_client=api_client)

    @functools.cached_property
    def jobs(self):  # noqa: D102
        return JobsAPI(api_client=self.client)

    @functools.cached_property
    def measurements(self):  # noqa: D102
        return MeasurementsAPI(api_client=self.client)

    @functools.cached_property
    def aces(self):  # noqa: D102
        return AceAPI(api_client=self.client)

    @functools.cached_property
    def dataset(self):  # noqa: D102
        return DatasetAPI(
            api_client=self.client,
            dataset_service_connection=self.dataset_service_connection,
        )

    @functools.cached_property
    def resultset(self):  # noqa: D102
        return ResultsetAPI(
            api_client=self.client,
            dataset_service_connection=self.dataset_service_connection,
        )

    @functools.cached_property
    def workspace(self):  # noqa: D102
        return WorkspaceAPI(
            api_client=self.client,
            dataset_service_connection=self.dataset_service_connection,
        )

    @functools.cached_property
    def quickstart(self) -> BaseQuickStartAPI:  # noqa: D102
        return BaseQuickStartAPI(api_client=self.client)

    @functools.cached_property
    def data_mover(self):  # noqa: D102
        return DataMoverAPI(api_client=self.client, connection=self.data_mover_connection)

    @functools.cached_property
    def search(self):  # noqa: D102
        connection = (
            Connection(base_url=NGC_CLI_SEARCH_SERVICE_URL, api_client=self.client)
            if NGC_CLI_SEARCH_SERVICE_URL
            else self.client.connection
        )
        return BaseCommandSearchAPI(api_client=self.client, connection=connection)

    @functools.cached_property
    def resource(self):  # noqa: D102
        return ResourceAPI(api_client=self.client)
