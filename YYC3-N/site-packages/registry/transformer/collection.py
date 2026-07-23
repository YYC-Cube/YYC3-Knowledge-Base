#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from registry.data.model.Collection import Collection
from registry.transformer import BaseSearchTransformer


class CollectionSearchTransformer(Collection, BaseSearchTransformer):  # noqa: D101

    SEARCH_RESOURCE_KEY_MAPPING = {"format": "modelFormat"}
    SEARCH_RESOURCE_TOP_KEY_MAPPING = {"dateModified": "updatedDate", "dateCreated": "createdDate"}

    def __init__(self, search_response):
        BaseSearchTransformer.__init__(self, search_response)
        Collection.__init__(self, self._resources)
