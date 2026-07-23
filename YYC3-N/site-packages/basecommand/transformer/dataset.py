#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from basecommand.data.api.Dataset import Dataset
from basecommand.transformer import BaseSearchTransformer


class DatasetSearchTransformer(Dataset, BaseSearchTransformer):  # noqa: D101

    SEARCH_RESOURCE_KEY_MAPPING = {
        "aceName": "aceName",
        "uploadStatus": "status",
        "createdByUserName": "creatorUserName",
        "size": "size",
        "storageResourcesById": "id",
    }
    SEARCH_RESOURCE_TOP_KEY_MAPPING = {
        "dateCreated": "createdDate",
        "dateModified": "modifiedDate",
        "resourceId": "datasetUuid",
    }

    def __init__(self, search_response):
        BaseSearchTransformer.__init__(self, search_response)
        Dataset.__init__(self, self._resources)
