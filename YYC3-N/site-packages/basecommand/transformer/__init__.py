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
from basecommand.data.search.SearchResponseResultResource import (
    SearchResponseResultResource,
)


class BaseSearchTransformer(SearchResponseResultResource):  # noqa: D101

    SEARCH_RESOURCE_KEY_MAPPING = {}
    SEARCH_RESOURCE_TOP_KEY_MAPPING = {}

    def __init__(self, search_response):
        self._resources = search_response.toDict()
        # handle top level keys
        for from_key, to_key in self.SEARCH_RESOURCE_TOP_KEY_MAPPING.items():
            self._resources.update({to_key: self._resources.get(from_key, None)})
        for attr in search_response.attributes or []:
            self._resources.update({self.SEARCH_RESOURCE_KEY_MAPPING.get(attr.key, attr.key): attr.value})
        for label in search_response.labels or []:
            self._resources.update({self.SEARCH_RESOURCE_KEY_MAPPING.get(label.key, label.key): " ".join(label.values)})
        super().__init__(self._resources)
