#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import json
import logging
import os
from typing import Callable, List, Optional

from ngcbase.api.utils import DotDict
from ngcbase.errors import InvalidArgumentError, NgcException
from ngcbase.util.file_utils import mkdir_path
from registry.api.utils import (
    ChartRegistryTarget,
    ImageRegistryTarget,
    ModelRegistryTarget,
    SimpleRegistryTarget,
)
from registry.data.publishing.Artifact import Artifact
from registry.data.publishing.LicenseMetadata import LicenseMetadata
from registry.data.publishing.PublishingRequest import PublishingRequest
from registry.data.publishing.PublishingWorkflowDetails import PublishingWorkflowDetails
from registry.data.publishing.Response import Response
from registry.printer.publish import PublishPrinter

logger = logging.getLogger(__name__)

COMMAND_NAME_MAP = {
    "CONTAINER": "image",
    "COLLECTION": "collection",
    "RESOURCE": "resource",
    "MODEL": "model",
    "HELM_CHART": "chart",
}
REGISTRY_TARGET_MAP = {
    "CONTAINER": ImageRegistryTarget,
    "COLLECTION": SimpleRegistryTarget,
    "RESOURCE": ModelRegistryTarget,
    "MODEL": ModelRegistryTarget,
    "HELM_CHART": ChartRegistryTarget,
}
NAME_VERSION_ATTRIBUTE_MAP = {
    "CONTAINER": ("image", "tag"),
    "COLLECTION": ("name", "_"),
    "RESOURCE": ("name", "version"),
    "MODEL": ("name", "version"),
    "HELM_CHART": ("name", "version"),
}
PATH_SEGMENT_MAP = {
    "CONTAINER": "containers",
    "COLLECTION": "collections",
    "RESOURCE": "resources",
    "MODEL": "models",
    "HELM_CHART": "helm-charts",
}


class PublishAPI:  # noqa: D101
    PAGE_SIZE = 1000

    def __init__(self, api_client):
        self.connection = api_client.connection
        self.config = api_client.config
        self.publish_printer = PublishPrinter(api_client.config)

    @staticmethod
    def validate_args(
        target,
        source: Optional[str] = None,
        metadata_only=False,
        version_only=False,
        visibility_only=False,
        allow_guest: Optional[bool] = False,
        discoverable: Optional[bool] = False,
        public: Optional[bool] = False,
        sign: Optional[bool] = False,  # pylint: disable=unused-argument
        access_type: Optional[str] = None,
        product_names: Optional[List[str]] = None,
        upload_pending: bool = False,
    ):
        """This is common validation for all artifact types,
        each artifact type should impose artifact specific validations.
        """  # noqa: D205, D401, D404
        if bool(product_names) ^ bool(access_type):
            raise InvalidArgumentError(
                "If specify one of 'product-name' or 'access-type', you must specify the other."
            ) from None

        if (
            not (access_type and product_names)  # legacy publishing, non unified catalog
            and not (visibility_only or metadata_only or version_only)  # intention is to publish
            and not (source and target)
        ):
            raise InvalidArgumentError(
                "You must specify `source` and `target` argument when making a publishing request"
            )

        if sum([metadata_only, version_only, visibility_only]) > 1:
            raise InvalidArgumentError(
                "metadata_only",
                "You can only specify at most one in the argument list: [`metadata_only`,`version_only`,"
                " `visibility_only`]",
            )
        if source and visibility_only:
            raise InvalidArgumentError(
                "You cannot specify a `source` argument when making a `visibility_only` publishing request"
            )
        # copy metadata
        if metadata_only and not (source and target):
            raise InvalidArgumentError(
                "You must specify `source` and `target` argument when making a `metadata_only` publishing request"
            )
        # copy version
        if version_only and not (source and target):
            raise InvalidArgumentError(
                "You must specify `source` and `target` argument when making a `version_only` publishing request"
            )
        # visibility
        if discoverable and not (allow_guest or public):
            raise InvalidArgumentError(
                "discoverable",
                "An item cannot be published as 'discoverable' unless either 'public' or 'allow_guest' is True",
            )
        if upload_pending and not (source and target):
            raise InvalidArgumentError(
                "You must specify `source` and `target` argument when making a `upload_pending` publishing request"
            )
        if upload_pending and (metadata_only or visibility_only):
            raise InvalidArgumentError(
                "'upload_pending' is used when publishing a version, "
                + "cannot be used with 'metadata_only' or 'visibility_only'",
            )

    @staticmethod
    def get_base_url(artifact_type):
        """Return the base URL.  Most endpoints should be built off of this."""
        return f"v2/catalog/{artifact_type}"

    @staticmethod
    def get_product_base_url(artifact_type):
        """Return the base URL for publishing an entity under a Product.
        For models, resources, helm-charts, and images. To publish a collection under a Product,
        use the `get_base_url`.
        """  # noqa: D205
        return f"v2/catalog/{artifact_type}/product"

    def publish(
        self,
        artifact_type: str,
        auth_org: str,
        auth_team: str,
        target: str,
        source: Optional[str] = None,
        metadata_only: bool = False,
        version_only: bool = False,
        visibility_only: bool = False,
        allow_guest: bool = False,
        discoverable: bool = False,
        public: bool = False,
        sign: bool = False,
        access_type: Optional[str] = None,
        product_names: Optional[List[str]] = None,
        upload_pending: bool = False,
        license_terms_specs: Optional[List[LicenseMetadata]] = None,
        nspect_id: Optional[str] = None,
        validation_callback: Optional[Callable] = None,
    ):  # noqa: D102
        """Publishes a artifact with various options for metadata, versioning, and visibility.

        This method manages the publication of artifacts to a repository, handling
        different aspects of the publication such as metadata only, version only, and
        visibility adjustments. It validates the combination of arguments provided
        and processes the publication accordingly.
        There are two seperate publishing flows in the follow precedence:
            unified catalog publishing: sets the product names and access type of the artifact.
            legacy publishing: sets the discoverable, public, allow_guest of the artifact.
        """  # noqa: D401
        target_cls = REGISTRY_TARGET_MAP[artifact_type]
        _name_attr, _ver_attr = NAME_VERSION_ATTRIBUTE_MAP[artifact_type]

        self.validate_args(
            target,
            source,
            metadata_only,
            version_only,
            visibility_only,
            allow_guest,
            discoverable,
            public,
            sign,
            access_type,
            product_names,
            upload_pending,
        )

        request = PublishingRequest()
        request.artifactType = artifact_type

        request.publishToPublic = public
        request.publishWithGuestAccess = allow_guest
        request.publishAsListedToPublic = discoverable
        request.sign = sign
        request.accessType = access_type
        request.productNames = product_names
        request.uploadPending = upload_pending
        request.licenseTerms = license_terms_specs
        request.nspectId = nspect_id

        request.targetArtifact = Artifact()
        _target = target_cls(target, org_required=True, name_required=True)
        request.targetArtifact.org = _target.org
        request.targetArtifact.team = _target.team
        request.targetArtifact.name = getattr(_target, _name_attr)
        request.targetArtifact.version = getattr(_target, _ver_attr, None)

        if source:
            request.sourceArtifact = Artifact()
            _source = target_cls(source, org_required=True, name_required=True)
            request.sourceArtifact.org = _source.org
            request.sourceArtifact.team = _source.team
            request.sourceArtifact.name = getattr(_source, _name_attr)
            request.sourceArtifact.version = getattr(_source, _ver_attr, None)
            if request.targetArtifact.version is None:
                _target.version = request.sourceArtifact.version
                request.targetArtifact.version = request.sourceArtifact.version
                source += f":{request.sourceArtifact.version}"
            if upload_pending and str(_target) == str(_source):
                raise NgcException(
                    "Publishing target to the UPLOAD_PENDING status "
                    f"cannot have the same source as target: target [{str(_target)}], source [{str(_source)}]"
                )

        if validation_callback:
            # this handles dynamic validations which can be different for each artifact
            validation_callback(**{k: v for k, v in locals().items() if k != "self"})

        if metadata_only:
            self._copy_metadata_request(request, PATH_SEGMENT_MAP[artifact_type], auth_org, auth_team)
        elif version_only:

            self._copy_version_request(request, PATH_SEGMENT_MAP[artifact_type], auth_org, auth_team)
        elif visibility_only:
            self._update_visibility_request(request, PATH_SEGMENT_MAP[artifact_type], auth_org, auth_team)
        else:
            resp = Response(
                self._publish_artifact_request(request, PATH_SEGMENT_MAP[artifact_type], auth_org, auth_team)
            )
            if resp.requestStatus and resp.requestStatus.statusCode == "ACCEPTED":
                return resp.requestStatus.workflowId
        return None

    def _publish_artifact_request(self, publish_request: PublishingRequest, artifact_type, org=None, team=None):
        """Publish an artifact: Model, Resource, Helm-Chart, Collection."""
        is_unified_catalog = publish_request.productNames and publish_request.accessType
        # collections only contain metadata, 2 steps for both publishing path
        # product publish: copy meta + product publish
        # artifact publish: copy meta + change visibility
        if artifact_type == "collections":
            if publish_request.sourceArtifact:
                self._copy_metadata_request(publish_request, artifact_type, org, team)
            if not is_unified_catalog:
                return self._update_visibility_request(publish_request, artifact_type, org, team)

        if is_unified_catalog:
            url = self.get_product_base_url(artifact_type)
        else:
            url = f"{self.get_base_url(artifact_type)}/publish"
        return self.connection.make_api_request(
            "POST",
            url,
            payload=publish_request.toJSON(),
            auth_org=org,
            auth_team=team,
            extra_scopes=["artifact"],
            renew_token=True,
            operation_name=f"post {artifact_type} publish",
        )

    def _copy_metadata_request(self, publish_request, artifact_type, org=None, team=None):
        """Copy the metadata of an artifact instead of a deep copy."""
        url = f"{self.get_base_url(artifact_type).lower()}/metadata/copy"
        return self.connection.make_api_request(
            "POST",
            url,
            payload=publish_request.toJSON(),
            auth_org=org,
            auth_team=team,
            extra_scopes=["artifact"],
            renew_token=True,
            operation_name=f"post {artifact_type} metadata copy",
        )

    def _copy_container_version_request(self, publish_request, org=None, team=None):
        """Copy the specified version of a container with no metadata changes to the main artifact."""
        file_url = self.get_base_url("containers") + "/images/copy"
        return self.connection.make_api_request(
            "POST",
            file_url,
            payload=publish_request.toJSON(),
            auth_org=org,
            auth_team=team,
            extra_scopes=["artifact"],
            renew_token=True,
            operation_name="post containers version files copy",
        )

    def _copy_version_request(self, publish_request, artifact_type, org=None, team=None):
        """Copy the specified version of an artifact with no metadata changes to the main artifact."""
        for key in ("publishToPublic", "publishAsListedToPublic", "publishWithGuestAccess"):
            setattr(publish_request, key, None)

        if artifact_type == "containers":
            return self._copy_container_version_request(publish_request, org, team)

        meta_url = f"{self.get_base_url(artifact_type)}/versions/metadata/copy"
        file_url = f"{self.get_base_url(artifact_type)}/versions/files/copy"

        # First, copy the version metadata
        self.connection.make_api_request(
            "POST",
            meta_url,
            payload=publish_request.toJSON(),
            auth_org=org,
            auth_team=team,
            extra_scopes=["artifact"],
            renew_token=True,
            operation_name=f"post {artifact_type} version metadata copy",
        )
        # Next, copy the file(s) for the version
        return self.connection.make_api_request(
            "POST",
            file_url,
            payload=publish_request.toJSON(),
            auth_org=org,
            auth_team=team,
            extra_scopes=["artifact"],
            renew_token=True,
            operation_name=f"post {artifact_type} version files copy",
        )

    def _update_visibility_request(self, publish_request, artifact_type, org=None, team=None):
        """Update the visibility settings without changing the metadata or versions/files."""
        url = f"{self.get_base_url(artifact_type).lower()}/share"
        # Only the target info is needed
        publish_request.sourceArtifact = None

        return self.connection.make_api_request(
            "POST",
            url,
            payload=publish_request.toJSON(),
            auth_org=org,
            auth_team=team,
            extra_scopes=["artifact"],
            renew_token=True,
            operation_name=f"post {artifact_type} update visibility",
        )

    def status(self, workflow_id: str) -> PublishingWorkflowDetails:
        """Get the status of the publishing async workflow, given the workflow_id.

        The status enums can be viewed here: \
            https://typescript.temporal.io/api/enums/proto.temporal.api.enums.v1.WorkflowExecutionStatus .
        """
        params = {"id": workflow_id, "getHistory": True}
        url = self.get_base_url("publish/status")
        return PublishingWorkflowDetails(
            self.connection.make_api_request(
                "GET",
                url,
                params=params,
                operation_name="get publish status",
            )
        )

    def update_license_terms(
        self,
        artifact_type: str,
        target: str,
        auth_org: str,
        auth_team: str,
        license_term_specs: Optional[List[LicenseMetadata]] = None,
    ):
        """Update an artifact's license terms of services.

        Args:
            artifact_type: The type of the artifact.
            target: The artifact to update.
            auth_org: The user's org.
            auth_team: The user's team.
            license_term_specs: License terms to.

        Raises:
            InvalidArgumentError: If the passed arguments are invalid.
        """
        target_cls = REGISTRY_TARGET_MAP[artifact_type]
        _name_attr, _ = NAME_VERSION_ATTRIBUTE_MAP[artifact_type]
        url = f"{self.get_base_url(PATH_SEGMENT_MAP[artifact_type])}/terms-of-service"

        _target = target_cls(target, org_required=True, name_required=True)
        update_request = DotDict(
            {
                "artifactType": artifact_type,
                "licenseTerms": [license_term.toDict() for license_term in license_term_specs or []],
                "targetArtifact": {"org": _target.org, "team": _target.team, "name": getattr(_target, _name_attr)},
            }
        )

        return self.connection.make_api_request(
            "POST",
            url,
            payload=json.dumps(update_request),
            auth_org=auth_org,
            auth_team=auth_team,
            operation_name=f"post {artifact_type} update license terms",
        )

    def get_public_key(self, artifact_type: str, destination: str):
        """Download the public key used to sign an artifact type.

        Args:
            artifact_type: The type of the artifact.
            destination: Where to save the file.

        Raises:
            NgcException: If the destination isn't valid.
        """
        download_dir = os.path.abspath(destination)
        if not os.path.isdir(download_dir):
            raise NgcException(f"The path: '{destination}' does not exist.")
        response = self.connection.make_api_request(
            "GET", self._get_public_key_url(artifact_type), operation_name=f"get public key for {artifact_type}"
        )
        response.raise_for_status()
        outfile = os.path.join(download_dir, "publicKey.pem")
        mkdir_path(os.path.dirname(outfile))
        with open(outfile, "w", encoding="utf-8") as file:
            file.write(response.content)

    def _get_public_key_url(self, artifact_type):
        endpoint = self.get_base_url(PATH_SEGMENT_MAP[artifact_type]) + "/public-key"
        return self.connection.create_full_URL(endpoint)

    def check_license_for_guest_download(self, artifact_instance, target: str, agree_license: bool = False):
        """Check license terms for guest download and log appropriate warnings.

        Args:
            artifact_instance: The artifact API instance (e.g., GuestModelAPI, GuestChartAPI).
            target: The artifact identifier to check license terms for.
            agree_license: Whether the user has agreed to license terms.
        """
        license_terms = artifact_instance._get_license_terms(target)

        if license_terms and not agree_license:
            licenses = [(lic.needsAcceptance, lic.licenseId, lic.licenseVersion) for lic in license_terms]
            licenses.sort()
            details = "\n".join(
                [
                    "   {}:{} (User acceptance {}required)".format(
                        license_id, license_version, "not " if not needs_acceptance else ""
                    )
                    for needs_acceptance, license_id, license_version in licenses
                ]
            )
            # Get artifact name from the instance's resource_type attribute
            artifact_name = COMMAND_NAME_MAP.get(getattr(artifact_instance, "resource_type", "UNKNOWN"), "artifact")
            message = "This {} has the following license(s):\n{}".format(artifact_name, details)
            log_method = logger.warning if any(lic.needsAcceptance for lic in license_terms) else logger.info
            log_method(message)
