#
# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
"""API interface for Collections."""
import asyncio
import logging
import sys
from typing import List, Optional

from ngcbase.api.pagination import pagination_helper
from ngcbase.api.utils import DotDict
from ngcbase.errors import NgcAPIError
from ngcbase.transfer import utils as xfer_utils
from ngcbase.util.utils import extra_args
from registry.api.collection_spec import CollectionSpecification
from registry.api.utils import (
    apply_labels_update,
    get_auth_org_and_team,
    get_label_set_labels,
    SimpleRegistryTarget,
)
from registry.constants import CollectionArtifacts
from registry.data.model.ArtifactListResponse import ArtifactListResponse
from registry.data.model.Collection import Collection
from registry.data.model.CollectionCreateRequest import CollectionCreateRequest
from registry.data.model.CollectionListResponse import CollectionListResponse
from registry.data.model.CollectionResponse import CollectionResponse
from registry.data.model.CollectionUpdateRequest import CollectionUpdateRequest
from registry.data.model.RequestStatus import RequestStatus
from registry.printer.collection import CollectionPrinter

ENDPOINT_VERSION = "v2"

logger = logging.getLogger(__name__)


class CollectionAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client
        self.resource_type = "COLLECTION"
        self.printer = CollectionPrinter(api_client.config)
        self.config = api_client.config

    @staticmethod
    def _get_guest_base_endpoint():
        """Build out the base collection endpoint which can be extended to all possible endpoints (/v2/collections)."""
        return [ENDPOINT_VERSION, "collections"]

    def _get_guest_endpoint(self, org: str, team: Optional[str] = None):
        """Interpolate org and team parameters onto guest endpoint in the form `/v2/collections/{org}[/team]`."""
        endpoint = self._get_guest_base_endpoint()
        endpoint.append(org)
        if team:
            endpoint.append(team)
        return endpoint

    @staticmethod
    def _get_auth_endpoint(org: str, team: Optional[str] = None):
        """Build base auth endpoint which requires org in all cases, unlike the guest endpoint.  Construct in the form
        /v2/org/{org}/[team/{team}/]collections
        """  # noqa: D205, D415
        endpoint = [ENDPOINT_VERSION, "org", org]
        if team:
            endpoint.extend(["team", team])
        endpoint.append("collections")
        return endpoint

    @staticmethod
    def _get_find_endpoint(
        org: str, artifact_type: str, artifact_name: str, team: Optional[str] = None, has_key: bool = False
    ):
        """Build the find endpoint which takes on a different form than the rest of the ones in the collections
        controller.  The authenticated endpoint is in the form
            /v2/org/{org}/[team/{team}/]{artifact_type}/{artifact_name}/collections
        The guest endpoints is in the form
            /v2/{artifact_type}/org/{org}/team/{team}/{artifact_name}/collections
        """  # noqa: D205, D415
        endpoint = [ENDPOINT_VERSION]
        org_team = ["org", org]
        if team:
            org_team.append("team")
            org_team.append(team)

        if has_key:
            endpoint.extend(org_team)
            endpoint.append(artifact_type)
        else:
            endpoint.append(artifact_type)
            endpoint.extend(org_team)

        endpoint.append(artifact_name)
        endpoint.append("collections")

        return endpoint

    def create(
        self,
        collection_spec: CollectionSpecification,
        images: list[str],
        charts: list[str],
        models: list[str],
        resources: list[str],
    ):
        """Create a collection.

        Args:
            collection_spec: Specifications of a collection.
            images: Names of images to include in the collection.
            charts: Names of charts to include in the collection.
            models: Names of models to include in the collection.
            resources: Names of resources to include in the collection.

        Raises:
            NgcAPIError: If there is an error from the API.
        """
        self.config.validate_configuration()

        reg_target = SimpleRegistryTarget(collection_spec.target, org_required=True, name_required=True)
        collection_create_request = CollectionCreateRequest(
            {
                "name": reg_target.name,
                "displayName": collection_spec.display_name,
                "labels": None,
                "labelsV2": get_label_set_labels(
                    self.client.registry.label_set,
                    self.resource_type,
                    collection_spec.label_set,
                    collection_spec.label,
                ),
                "logo": collection_spec.logo,
                "description": collection_spec.overview_filename,  # Read from the markdown file
                "builtBy": collection_spec.built_by,
                "publisher": collection_spec.publisher,
                "shortDescription": collection_spec.short_desc,
                "category": collection_spec.category,
            }
        )

        collection_response = self._create_collection(collection_create_request, reg_target)

        artifacts_response, errors = self.make_artifacts_requests(
            images, charts, models, resources, reg_target, verb="PUT"
        )

        return (collection_response, artifacts_response, errors)

    def _create_collection(self, collection_create_request: CollectionCreateRequest, reg_target: SimpleRegistryTarget):
        """Get enpoint and call API to create collection."""
        endpoint = "/".join(self._get_auth_endpoint(reg_target.org, team=reg_target.team))

        collection_response = self.connection.make_api_request(
            "POST",
            endpoint,
            payload=collection_create_request.toJSON(),
            auth_org=reg_target.org,
            auth_team=reg_target.team,
            operation_name="post collection",
        )
        collection_response = CollectionResponse(collection_response)
        if not collection_response.collection:
            collection_response.collection = Collection()
        return collection_response

    def update(
        self,
        collection_spec: CollectionSpecification,
        add_label: Optional[str],
        remove_label: Optional[str],
        add_images: list[str],
        add_charts: list[str],
        add_models: list[str],
        add_resources: list[str],
        remove_images: list[str],
        remove_charts: list[str],
        remove_models: list[str],
        remove_resources: list[str],
    ):
        """Update a collection.

        Args:
            collection_spec: Specifications of a collection.
            add_label: Label for the collection to add.
            remove_label: Label for the collection to remove.
            add_images: Names of images to include in the collection.
            add_charts: Names of charts to include in the collection.
            add_models: Names of models to include in the collection.
            add_resources: Names of resources to include in the collection.
            remove_images: Names of images to remove from the collection.
            remove_charts: Names of charts to remove from the collection.
            remove_models: Names of models to remove from the collection.
            remove_resources: Names of resources to remove from the collection.

        Raises:
            NgcAPIError: If there is an error from the API.
        """
        self.config.validate_configuration(guest_mode_allowed=False)
        reg_target = SimpleRegistryTarget(collection_spec.target, org_required=True, name_required=True)
        # API layer should also validation
        # if (args.label or args.label_set) and (args.add_label or args.remove_label):
        #     raise argparse.ArgumentTypeError(
        #         "Declaritive arguments `labels` or `label_set` "
        #         "cannot be used with imperative arguments `add_label` or `remove_label`"
        #     )

        labels_v2 = []
        if collection_spec.label or collection_spec.label_set:
            labels_v2 = get_label_set_labels(
                self.client.registry.label_set, self.resource_type, collection_spec.label_set, collection_spec.label
            )
        else:
            for response in self.get_info(reg_target.org, reg_target.team, reg_target.name, has_key=True):
                if "collection" in response:
                    labels_v2 = CollectionResponse(response).collection.labels or []
                    break
        collection_update_request = CollectionUpdateRequest(
            {
                "displayName": collection_spec.display_name,
                "labels": None,
                "labelsV2": apply_labels_update(labels_v2, add_label or [], remove_label or []),
                "logo": collection_spec.logo,
                "description": collection_spec.overview_filename,  # Read from the markdown file
                "builtBy": collection_spec.built_by,
                "publisher": collection_spec.publisher,
                "shortDescription": collection_spec.short_desc,
                "category": collection_spec.category,
            }
        )

        collection_response = self._update_collection(collection_update_request, reg_target)

        _, add_errors = self.make_artifacts_requests(
            add_images, add_charts, add_models, add_resources, reg_target, verb="PUT"
        )

        _, remove_errors = self.make_artifacts_requests(
            remove_images, remove_charts, remove_models, remove_resources, reg_target, verb="DELETE"
        )

        return (collection_response, add_errors, remove_errors)

    def _update_collection(self, collection_update_request: CollectionUpdateRequest, reg_target: SimpleRegistryTarget):
        """Get endpoing and call API to update collection."""
        endpoint = self._get_auth_endpoint(reg_target.org, team=reg_target.team)
        endpoint.append(reg_target.name)
        endpoint = "/".join(endpoint)

        collection_response = self.connection.make_api_request(
            "PATCH",
            endpoint,
            payload=collection_update_request.toJSON(),
            auth_org=reg_target.org,
            auth_team=reg_target.team,
            operation_name="patch collection",
        )
        return CollectionResponse(collection_response)

    def make_artifacts_requests(
        self,
        images: list[str],
        charts: list[str],
        models: list[str],
        resources: list[str],
        reg_target: SimpleRegistryTarget,
        verb: str = "PUT",
    ):
        """Create or remove artifacts for a collection."""
        header_apitarget_artifacts = (
            ("Images", CollectionArtifacts["IMAGES"].value, images),
            ("Charts", CollectionArtifacts["HELM_CHARTS"].value, charts),
            ("Models", CollectionArtifacts["MODELS"].value, models),
            ("Resources", CollectionArtifacts["RESOURCES"].value, resources),
        )

        request_dict = {}
        for header, apitarget, artifacts in header_apitarget_artifacts:
            request_dict[header] = set()
            for artifact in artifacts:
                artifact_target = SimpleRegistryTarget(artifact, org_required=True, name_required=True)
                request_dict[header].add((artifact_target.org, artifact_target.team, artifact_target.name, apitarget))
        endpoint = "/".join(self._get_auth_endpoint(reg_target.org, team=reg_target.team))
        if sys.version_info[0] == 3 and sys.version_info[1] >= 8 and sys.platform.startswith("win"):
            # Windows has been unable to close the asyncio loop successfully. This line of code is a fix
            # to handle the asyncio loop failures. Without it, code is unable to CTRL-C or finish.
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        return asyncio.run(
            self._make_artifacts_requests(
                endpoint, request_dict, reg_target.org, reg_target.name, reg_target.team, verb
            )
        )

    @staticmethod
    def _flatten_request_items(request_dict: dict):
        flat = []
        for key, requests in request_dict.items():
            flat.extend([(key, itm) for itm in requests])
        return flat

    async def _make_artifacts_requests(
        self, endpoint: str, request_dict: dict, org: str, collection_name: str, team: str, verb: str
    ):
        response_dict = {key: [] for key in request_dict}
        error_dict = {key: [] for key in request_dict}
        request_items = self._flatten_request_items(request_dict)
        results = await xfer_utils.gather(
            [
                self._artifact_request(collection_name, verb, endpoint, key, request, org, team)
                for key, request in request_items
            ],
        )
        for success, fail in results:
            for key, val in success.items():
                response_dict[key].append(val)
            for key, val in fail.items():
                error_dict[key].append(val)
        return response_dict, error_dict

    async def _artifact_request(
        self, collection_name: str, verb: str, endpoint: str, key: str, request, org: str, team: str
    ):
        succeed = {}
        fail = {}
        artifact_org, artifact_team, artifact_name, api_target = request
        org_team = ["org", artifact_org]
        if artifact_team:
            org_team.append("team")
            org_team.append(artifact_team)
        org_team = "/".join(org_team)
        artifact_target = [artifact_org]
        if artifact_team:
            artifact_target.append(artifact_team)
        artifact_target.append(artifact_name)
        artifact_target = "/".join(artifact_target)
        try:
            response = await self.connection.make_async_api_request(
                verb,
                f"{endpoint}/{collection_name}/artifacts/{org_team}/{api_target}/{artifact_name}",
                auth_org=org,
                auth_team=team,
                operation_name="put collection artifact",
            )
            response = RequestStatus(response["requestStatus"])
            succeed[key] = (artifact_target, response)
        except NgcAPIError as e:
            request_status = e.explanation["requestStatus"]
            response = RequestStatus(request_status)
            fail[key] = (artifact_target, response)
        return succeed, fail

    def list(
        self,
        target: Optional[str],
        access_type: Optional[str] = None,
        product_names: Optional[str] = None,
    ):
        """Get a list of available collection in the registry.

        Args:
            target: Collection to create.  Format: org/[team/]name.
            access_type: Optional; filter the collections based on the access type.
            product_names: Optional; filter collections based on product names.

        Raises:
            NgcAPIError: If there is an error from the API.
        """
        self.config.validate_configuration(guest_mode_allowed=True, csv_allowed=True)
        org = self.config.org_name
        team = self.config.team_name
        # If target specified then need to parse and validate
        if target:
            srt = SimpleRegistryTarget(target, name_required=True, glob_allowed=True)
            org, team = get_auth_org_and_team(srt.org, srt.team, org, team)

        return self.client.registry.search.search_collections(
            org, team, target or "*", access_type=access_type, product_names=product_names
        )

    def info(self, target: Optional[str]):
        """Get information about a collection in the registry.

        Args:
            target: Collection to create.  Format: org/[team/]name.

        Raises:
            NgcAPIError: If there is an error from the API.
        """
        self.config.validate_configuration(guest_mode_allowed=True)
        srt = SimpleRegistryTarget(target, org_required=True, name_required=True)
        has_key = bool(self.config.app_key)
        org, team = get_auth_org_and_team(srt.org, srt.team, self.config.org_name, self.config.team_name)
        target = srt.name
        # Reponses are asynchronous and come in any order, need to construct into relevant objects
        collection = CollectionResponse()
        artifacts_dict = {"Images": [], "Charts": [], "Models": [], "Resources": []}
        for response in self.get_info(org, team, target, has_key):
            if "collection" in response:
                collection = CollectionResponse(response)
            elif "artifacts" in response and response["artifacts"]:
                artifacts = ArtifactListResponse(response).artifacts
                if artifacts[0].artifactType == "MODEL":
                    artifacts_dict["Models"] = artifacts
                elif artifacts[0].artifactType == "REPOSITORY":
                    artifacts_dict["Images"] = artifacts
                elif artifacts[0].artifactType == "HELM_CHART":
                    artifacts_dict["Charts"] = artifacts
                elif artifacts[0].artifactType == "MODEL_SCRIPT":
                    artifacts_dict["Resources"] = artifacts
                else:
                    raise ValueError(f"Unrecognized response type '{artifacts[0].artifactType}'")

        return DotDict({"collection": collection.collection, "artifacts": artifacts_dict})

    def get_info(self, org: str, team: str, name: str, has_key: bool = False):
        """Get endpoint and call API to get information about a target.

        Args:
            org: The collection's organization.
            team: The collection's team.
            name: The collection's name.

        Keword Args:
            has_key: Whether or not there is an app key in use.

        Raises:
            NgcAPIError: If there is an error from the API.
        """
        urls = []
        base = []
        if has_key:
            base = self._get_auth_endpoint(org, team)
        else:
            base = self._get_guest_endpoint(org, team)
        base.append(name)

        urls.append("/".join(base))
        for artifact in CollectionArtifacts:
            base = urls[0]
            urls.append(base + f"/artifacts/{artifact.value}")

        # Parameterize URL encodings
        params = [None] * len(urls)
        params[0] = {"resolve-labels": "false"}

        resp = self.connection.make_multiple_request(
            "GET", urls, params=params, auth_org=org, auth_team=team, operation_name="get collection"
        )

        return resp

    @extra_args
    def remove(self, target: str):
        """Remove a collection.

        Args:
            target: Collection to create.  Format: org/[team/]name.

        Raises:
            NgcAPIError: If there is an error from the API.
        """
        self.config.validate_configuration(guest_mode_allowed=False)
        reg_target = SimpleRegistryTarget(target, org_required=True, name_required=True)

        return self._remove_collection(reg_target)

    def _remove_collection(self, reg_target: SimpleRegistryTarget):
        """Get endpoing and call API to delete collection."""
        endpoint = self._get_auth_endpoint(reg_target.org, team=reg_target.team)
        endpoint.append(reg_target.name)
        endpoint = "/".join(endpoint)
        return self.connection.make_api_request(
            "DELETE", endpoint, auth_org=reg_target.org, auth_team=reg_target.team, operation_name="delete collection"
        )

    @extra_args
    def find(self, artifact_target: str, artifact_type: str):
        """Get list of collections containing an artifact.

        Args:
            artifact_target: Target artifact to look for.  Format: org/[team/]name.
            artifact_type: Type of artifact to look for.

        Raises:
            NgcAPIError: If there is an error from the API.
        """
        self.config.validate_configuration(guest_mode_allowed=True)

        collections = []
        for page in self._find_artifact(artifact_target, artifact_type):
            response_list = CollectionListResponse(page)
            collections.extend(response_list.collections or [])
        return collections

    def _find_artifact(self, artifact_target: str, artifact_type: str):
        """Get endpoing and return a response."""
        srt = SimpleRegistryTarget(artifact_target, org_required=True, name_required=True)
        has_key = bool(self.config.app_key)
        endpoint = self._get_find_endpoint(
            srt.org,
            CollectionArtifacts[artifact_type].value,
            srt.name,
            team=srt.team,
            has_key=has_key,
        )
        endpoint = "/".join(endpoint) + "?"  # Hack to mark the end of the API and start of params from pagination

        for page in pagination_helper(
            self.connection,
            endpoint,
            org_name=srt.org,
            team_name=srt.team,
            operation_name="get artifact collection list",
        ):
            yield page

    @extra_args
    def publish(
        self,
        target: str,
        source: Optional[str] = None,
        metadata_only=False,
        visibility_only=False,
        allow_guest: Optional[bool] = False,
        discoverable: Optional[bool] = False,
        public: Optional[bool] = False,
        access_type: Optional[str] = None,
        product_names: Optional[List[str]] = None,
    ):
        """Publishes a collection with options for metadata, and visibility.

        This method manages the publication of a collection of artifacts, handling
        different aspects of the publication such as metadata only, and
        visibility adjustments. It validates the combination of arguments provided
        and processes the publication accordingly.
        """  # noqa: D401
        self.config.validate_configuration(guest_mode_allowed=False)
        return self.client.registry.publish.publish(
            self.resource_type,
            self.config.org_name,
            self.config.team_name,
            target,
            source,
            metadata_only,
            False,
            visibility_only,
            allow_guest,
            discoverable,
            public,
            False,
            access_type,
            product_names,
        )
