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

from organization.api.alert import AlertAPI
from organization.api.audit import AuditAPI
from organization.api.orgs import OrgAPI
from organization.api.secrets import SecretsAPI
from organization.api.storage import StorageAPI
from organization.api.subscription import SubscriptionAPI
from organization.api.teams import TeamAPI
from organization.api.users import UsersAPI


class API:  # noqa: D101
    def __init__(self, api_client):
        self.client = api_client

    @property
    def alert(self):  # noqa: D102
        return AlertAPI(api_client=self.client)

    @property
    def audit(self):  # noqa: D102
        return AuditAPI(api_client=self.client)

    @property
    def organization(self):  # noqa: D102
        return OrgAPI(api_client=self.client)

    @property
    def secrets(self):  # noqa: D102
        return SecretsAPI(api_client=self.client)

    @property
    def storage(self):  # noqa: D102
        return StorageAPI(api_client=self.client)

    @property
    def subscription(self):  # noqa: D102
        return SubscriptionAPI(api_client=self.client)

    @property
    def team(self):  # noqa: D102
        return TeamAPI(api_client=self.client)

    @property
    def user(self):  # noqa: D102
        return UsersAPI(api_client=self.client)
