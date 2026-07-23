#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from argparse import ArgumentTypeError
import csv
from fnmatch import fnmatch
from itertools import chain
import logging
import os
import time
from typing import Any, Dict, Generator, List, Optional, Tuple, Union

import docker
from docker.errors import APIError, ImageNotFound, NotFound

from ngcbase.api.pagination import pagination_helper
from ngcbase.constants import BUILD_TYPE, CAS_TIMEOUT
from ngcbase.errors import (
    AccessDeniedException,
    AuthenticationException,
    NgcAPIError,
    NgcException,
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
)
from ngcbase.util.io_utils import question_yes_no
from ngcbase.util.utils import (
    confirm_remove,
    contains_glob,
    extra_args,
    format_org_team,
)
from registry.api.dockerwrappers import RegistryWrapper
from registry.api.search import RepositorySearchTransformer
from registry.api.utils import (
    apply_labels_update,
    get_label_set_labels,
    get_registry_url,
    ImageRegistryTarget,
)
from registry.data.publishing.LicenseMetadata import LicenseMetadata
from registry.data.publishing.PublishingRequest import PublishingRequest
from registry.data.publishing.Response import Response
from registry.data.registry.GetManifestByTagResponse import GetManifestByTagResponse
from registry.data.registry.ImageArchitectureVariant import ImageArchitectureVariant
from registry.data.registry.ImageScanDetails import ImageScanDetails
from registry.data.registry.MetaImageDetails import MetaImageDetails
from registry.data.registry.Repository import Repository
from registry.data.registry.RepositoryCreateRequest import RepositoryCreateRequest
from registry.data.registry.RepositoryImageDetailsList import RepositoryImageDetailsList
from registry.data.registry.RepositoryInfoUpdateRequest import (
    RepositoryInfoUpdateRequest,
)
from registry.data.registry.ScanIssue import ScanIssue
from registry.errors import ImageTagNotFound
from registry.printer.image import ImagePrinter

IMAGE_METAVAR_TAGS = "<org>/[<team>/]<image>[:<tags>]"


logger = logging.getLogger(__name__)


class ImageAPI:  # noqa: D101
    PAGE_SIZE = 1000

    def __init__(self, api_client):
        self.connection = api_client.connection
        self.config = api_client.config
        self.client = api_client
        self.resource_type = "CONTAINER"
        self.printer = ImagePrinter(api_client.config)

    # Public SDK Functions
    @extra_args
    def list(
        self,
        pattern: Optional[str] = None,
        signed: Optional[bool] = False,
        access_type: Optional[str] = None,
        product_names: Optional[str] = None,
    ) -> Union[Generator[list[RepositorySearchTransformer], Any, None], list]:
        """List image given a pattern, returns either the list of repos, or the list of images.

        Args:
            pattern: Name or pattern of images. Defaults to None.
            signed: If True, output only signed images. Defaults to False.
            access_type: If specified, output only images with matching access type. Defaults to None.
            product_names: If specified, output only images with matching product name. Defaults to None.

        Returns:
            Union[Generator[list[RepositorySearchTransformer], Any, None], list]: \
                Returns generator of list of found images.
        """
        self.config.validate_configuration(guest_mode_allowed=True, csv_allowed=True)
        irt = ImageRegistryTarget(pattern)
        repo_matcher = "/".join([f for f in [irt.org, irt.team, irt.image] if f]) or "*"
        org = irt.org or self.config.org_name
        team = irt.team or self.config.team_name

        # Only use the repo search if repo portion has a glob expression
        if contains_glob(repo_matcher):
            if access_type or product_names:
                return self.client.registry.search.search_repo(
                    org, team, repo_matcher, access_type=access_type, product_names=product_names
                )
            repos = self.client.registry.search.search_repo(org, team, repo_matcher, signed=signed)
            if not irt.tag:
                return repos

            images = self._get_images(repos)
            images = self._filter_images(images, irt.tag, signed_only=signed)
            return images

        # No glob in the repo, so we can just get the images for the repo directly.
        # NOTE: `_get_images()` expects a doubly-nested iterator, so we need two levels of brackets.
        images = self._get_images([[repo_matcher]], repo_name=repo_matcher)
        images = self._filter_images(images, irt.tag, signed_only=signed)
        return images

    @extra_args
    def info(
        self,
        image: str,
        layers: Optional[bool] = False,
        history: Optional[bool] = False,
        details: Optional[bool] = False,
        scan: Optional[bool] = False,
    ) -> Union[
        Tuple[Repository, Union[ImageScanDetails, None]],
        Tuple[
            MetaImageDetails,
            GetManifestByTagResponse,
            List[Tuple[ImageScanDetails, str]],
            List[ImageArchitectureVariant],
        ],
    ]:
        """Image info given an image name, returns either the info of the repo, or info on an image name.

        Args:
            image: Full image name. <org>/[<team>/]<image>[:<tags>]
            layers: Include layer of image. Defaults to False.
            history: Include history of image. Defaults to False.
            details: Include details of image. Defaults to False.
            scan: Include scan of image. Defaults to False.

        Raises:
            ArgumentTypeError: If invalid input
            ResourceNotFoundException: If image is not found
            AuthenticationException: If access is denied
            AccessDeniedException: If access is denied

        Returns:
            Return depending on input image argument.
            If image tag is specified, return image repository and scan information
            If image tag is not specified, return image details, manifest, scan details and architecture variants
        """
        self.config.validate_configuration(guest_mode_allowed=True)
        if contains_glob(image):
            raise ArgumentTypeError("image tag doesn't accept glob-like wildcards.")

        irt = ImageRegistryTarget(image)
        repo_name = "/".join([f for f in [irt.org, irt.team, irt.image] if f])

        if not irt.tag:
            if layers:
                raise ArgumentTypeError("--layers requires an image tag.")
            if history:
                raise ArgumentTypeError("--history requires an image tag.")
            try:
                repo_info = self.get_repo_details(irt.org, irt.team, repo_name)
                scan_info = None
                if scan:
                    tag = repo_info.latestTag or "latest"
                    scan_info = self.get_scan_details(irt.org, irt.team, repo_name, tag)
            except (ResourceNotFoundException, AuthenticationException, AccessDeniedException) as e:
                raise type(e)(f"Image repository '{image}' {str(e).lower()}.") from None

            except Exception as exc:
                raise NgcException(exc) from None
            return (repo_info, scan_info)

        if details:
            raise ArgumentTypeError("--details cannot be used with an image tag.")
        try:
            tag_manifest = self.info_image_tag(irt.org, irt.team, repo_name, irt.tag)
            tag_metadata = self.get_tag_meta(irt.org, irt.team, repo_name, irt.tag)

        except (ResourceNotFoundException, AuthenticationException, AccessDeniedException) as e:
            raise type(e)(f"Image repository '{image}' {str(e).lower()}.") from None
        except Exception as exc:
            raise NgcException(exc) from None

        if not scan:
            return (tag_metadata, tag_manifest, [], tag_metadata.architectureVariants)

        scan_details = []
        for arch_obj in tag_metadata.architectureVariants:
            try:
                report = self.get_scan_report(irt.org, irt.team, irt.image, irt.tag, arch_obj.digest)
                scan_details.append((report, arch_obj.architecture))
            except (ResourceNotFoundException, AccessDeniedException):
                # No scan info available or viewable; set the values to empty.
                pass
        return (tag_metadata, tag_manifest, scan_details, tag_metadata.architectureVariants)

    @extra_args
    def remove(self, pattern: str, default_yes: Optional[bool] = None) -> None:
        """Remove a given image, or repository of images.

        Args:
            pattern: Name or pattern of images. <org>/[<team>/]<image>[:<tags>]
            default_yes: Is confirmation enabled. Defaults to True for sdk.

        Raises:
            ArgumentTypeError: If invalid input.
            ResourceNotFoundException: If image is not found.
            AuthenticationException: If access is denied.
        """
        self.config.validate_configuration()
        default_yes = default_yes or BUILD_TYPE == "sdk"
        irt = ImageRegistryTarget(pattern, org_required=True, name_required=True)
        repo_matcher = irt.local_path()

        if contains_glob(repo_matcher):
            raise ArgumentTypeError(
                f"pattern should be in format {IMAGE_METAVAR_TAGS}, where <image> cannot have any wildcards."
            )
        if irt.tag:
            # Handle tag removal - optimize for specific tags vs glob patterns
            if contains_glob(irt.tag):
                # Only use the expensive _get_images approach for glob patterns in tags
                repo_search_iterator = self.client.registry.search.search_repo(irt.org, irt.team, repo_matcher)
                images = self._get_images(repo_search_iterator)
                images = self._filter_images(images, irt.tag)

                if not images:
                    raise ResourceNotFoundException(
                        f"No image tags found that matches the pattern '{repo_matcher}:{irt.tag}'."
                    )

                for image in images:
                    image_tag_name = f"{image.name}:{image.tag}"
                    confirm_remove(self.printer, image_tag_name, default_yes)
                    try:
                        self.remove_image_tag(
                            org_name=irt.org, team_name=irt.team, repo_name=image.name, tag_name=image.tag
                        )
                    except ResourceNotFoundException:
                        raise ResourceNotFoundException(
                            f"Image '{image.name}:{image.tag}' could not be found."
                        ) from None

                    self.printer.print_ok("Successfully removed image '{}'.".format(image_tag_name))
            else:
                # For specific tags, directly attempt removal without listing all images
                image_tag_name = f"{repo_matcher}:{irt.tag}"
                confirm_remove(self.printer, image_tag_name, default_yes)
                try:
                    self.remove_image_tag(
                        org_name=irt.org, team_name=irt.team, repo_name=repo_matcher, tag_name=irt.tag
                    )
                    self.printer.print_ok("Successfully removed image '{}'.".format(image_tag_name))
                except ResourceNotFoundException:
                    raise ResourceNotFoundException(
                        f"Image tag '{image_tag_name}' does not exist in the repository."
                    ) from None

        else:
            # Since the repo_matcher cannot have glob wildcards, we know that we need to remove exactly 1 repo
            confirm_remove(self.printer, repo_matcher, default_yes)
            try:
                self.remove_repo(irt.org, irt.team, repo_matcher)
            except ResourceNotFoundException:
                raise ResourceNotFoundException(
                    "Image repository '{}' could not be found.".format(repo_matcher)
                ) from None
            except AccessDeniedException:
                raise AccessDeniedException(
                    "Access Denied. Only org/team admin has permission to remove an image repository."
                ) from None
            self.printer.print_ok("Successfully removed image repository '{}'.".format(repo_matcher))

    @extra_args
    def create(
        self,
        image: str,
        desc: Optional[str] = None,
        overview: Optional[str] = None,
        label: Optional[List[str]] = None,
        label_set: Optional[List[str]] = None,
        logo: Optional[str] = None,
        publisher: Optional[str] = None,
        built_by: Optional[str] = None,
        multinode: Optional[bool] = False,
        display_name: Optional[str] = None,
    ) -> Repository:
        """Create an empty repository.

        Args:
            image: Full image name without tag. <org>/[<team>/]<image>
            desc: Description of image. Defaults to None.
            overview: Overview of image. Defaults to None.
            label: Label of image. Defaults to None.
            label_set: Label set of image. Defaults to None.
            logo: Logo of image. Defaults to None.
            publisher: Publisher of image. Defaults to None.
            built_by: Time of image built by. Defaults to None.
            multinode: Is image multinode. Defaults to False.
            display_name: Display name of image. Defaults to None.

        Raises:
            ValueError: If image tag is specified.
            ResourceAlreadyExistsException: If image not found.

        Returns:
            Repository: ngccli.data.registry.Repository object.
        """
        self.config.validate_configuration()
        target = ImageRegistryTarget(image)
        if target.tag:
            raise ValueError("Tag should not be specified when trying to create a repository.")

        metadata = {
            "builtBy": built_by,
            "description": overview,
            "displayName": display_name,
            "labelsV2": get_label_set_labels(self.client.registry.label_set, self.resource_type, label_set, label),
            "logo": logo,
            "publisher": publisher,
            "shortDescription": desc,
            "multinode": multinode,
            "name": target.image,
        }
        metadata = {k: v for k, v in metadata.items() if v is not None}

        try:
            response = self.create_repo_metadata(target.org, target.team, metadata)
        except ResourceAlreadyExistsException as e:
            raise ResourceAlreadyExistsException(f"Repository '{image}' already exists.") from e

        return response

    @extra_args
    def update(
        self,
        image: str,
        desc: Optional[str] = None,
        overview: Optional[str] = None,
        labels: Optional[List[str]] = None,
        add_label: Optional[List[str]] = None,
        remove_label: Optional[List[str]] = None,
        label_set: Optional[List[str]] = None,
        logo: Optional[str] = None,
        publisher: Optional[str] = None,
        built_by: Optional[str] = None,
        multinode: Optional[bool] = False,
        no_multinode: Optional[bool] = False,
        display_name: Optional[str] = None,
    ) -> None:
        """Update an image metadata.

        Args:
            image: Full image name. <org>/[<team>/]<image>[:<tags>]
            desc: Description of image. Defaults to None.
            overview: Overview of image. Defaults to None.
            labels: Labels to declare for image. Defaults to None.
            add_label: Labels to add to the image. Default to None.
            remove_label: Labels to remove from the image. Default to None.
            label_set: Label set to declare for image. Defaults to None.
            logo: Logo of image. Defaults to None.
            publisher: Publisher of image. Defaults to None.
            built_by: Time of image built by. Defaults to None.
            multinode: Is image multinode. Defaults to False.
            no_multinode: Is image not multinode. Defaults to False.
            display_name: Display name of image. Defaults to None.

        Raises:
            ArgumentTypeError: If invalid input image name.
            ArgumentTypeError: If labels or label_set used along with add_label or remove_label.
        """
        self.config.validate_configuration()
        if multinode and no_multinode:
            raise ArgumentTypeError("Cannot set multinode and no_multinode")

        parsed_image = ImageRegistryTarget(image)
        if (labels or label_set) and (add_label or remove_label):
            raise ArgumentTypeError(
                "Declaritive arguments `labels` or `label_set` "
                "cannot be used with imperative arguments `add_label` or `remove_label`"
            )

        labels_v2 = []
        if labels or label_set:
            labels_v2 = get_label_set_labels(self.client.registry.label_set, self.resource_type, label_set, labels)
        else:
            labels_v2 = (
                self.get_repo_details(parsed_image.org, parsed_image.team, parsed_image.image_path()).labels or []
            )

        metadata = {
            "builtBy": built_by,
            "description": overview,
            "displayName": display_name,
            "labelsV2": apply_labels_update(labels_v2, add_label or [], remove_label or []),
            "logo": logo,
            "publisher": publisher,
            "shortDescription": desc,
        }
        if multinode:
            metadata["isMultinodeEnabled"] = True
        elif no_multinode:
            metadata["isMultinodeEnabled"] = False

        metadata = {k: v for k, v in metadata.items() if v is not None}
        self.update_repo_metadata(parsed_image.org, parsed_image.team, parsed_image.local_path(), metadata)

    @extra_args
    def set_latest_tag(self, image: str) -> None:
        """Set a specific tag as the 'latest' tag for the repository.

        Args:
            image: Full image name with tag. <org>/[<team>/]<image>:<tag>
        """
        self.config.validate_configuration()
        irt = ImageRegistryTarget(image, org_required=True, name_required=True, tag_required=True)

        url = self._get_tag_url(irt.org, irt.team, irt.image, irt.tag)
        try:
            return self.connection.make_api_request(
                "PATCH",
                f"{url}?set-latest=true",
                content_type="application/json",
                payload="{}",
                auth_org=irt.org,
                auth_team=irt.team,
                operation_name="set tag as latest",
            )
        except ResourceNotFoundException:
            raise ResourceNotFoundException("Image tag '{}' could not be found.".format(image)) from None
        except AccessDeniedException:
            raise AccessDeniedException("Access Denied. Please ensure write access to repository.") from None

    @extra_args
    def sign(
        self,
        image: str,
    ) -> None:
        """Sign an image in repository, for security.

        Args:
            image: Full image name. <org>/[<team>/]<image>[:<tags>]

        Raises:
            NgcException: If image with no tags or http error response from signing endpoint.
            ResourceNotFoundException: If image is not found.
            AccessDeniedException: If permission denied.
        """
        self.config.validate_configuration()
        parsed_image = ImageRegistryTarget(image)
        if parsed_image.tag is None:
            try:
                details = self.get_repo_details(parsed_image.org, parsed_image.team, parsed_image.image_path())
                if not details.latestTag:
                    raise NgcException("Target '{}' has no tags available.".format(image))
            except ResourceNotFoundException:
                raise ResourceNotFoundException("Target '{}' could not be found.".format(image)) from None
            parsed_image.tag = details.latestTag
        dict_payload = {
            "artifactType": "CONTAINER",
            "targetArtifact": {
                "org": parsed_image.org,
                "team": parsed_image.team,
                "name": parsed_image.image,
                "version": parsed_image.tag,
            },
            "sign": True,
        }

        try:
            resp = self.sign_image(parsed_image.org, parsed_image.team, dict_payload)
            if resp.requestStatus.statusCode != "SUCCESS":
                logger.debug(resp.requestStatus.statusCode, resp.requestStatus.statusDescription)
                raise NgcException("Image '{}' signing failed.".format(image)) from None
        except ResourceNotFoundException:
            raise ResourceNotFoundException("Image '{}' could not be found.".format(image)) from None
        except AccessDeniedException:
            raise AccessDeniedException("Access denied signing image '{}".format(image)) from None

    @extra_args
    def push(
        self,
        image: str,
        desc: Optional[str] = None,
        overview: Optional[str] = None,
        label: Optional[List[str]] = None,
        label_set: Optional[List[str]] = None,
        logo: Optional[str] = None,
        publisher: Optional[str] = None,
        built_by: Optional[str] = None,
        multinode: Optional[bool] = None,
        display_name: Optional[str] = None,
        default_yes: Optional[bool] = False,
        output: Optional[bool] = False,
    ) -> None:
        """Push an image to the repository.

        Args:
            image: Full image name. nvcr.io/<org>/[<team>/]<image>[:<tags>]
            desc: Description of image. Defaults to None.
            overview: Overview of image. Defaults to None.
            label: Label of image. Defaults to None.
            label_set: Label set of image. Defaults to None.
            logo: Logo of image. Defaults to None.
            publisher: Publisher of image. Defaults to None.
            built_by: Time of image built by. Defaults to None.
            multinode: Is image multinode. Defaults to None.
            display_name: Display name of image. Defaults to None.
            default_yes: Is confirmation enabled. Defaults to False.
            output: Is output enabled. Defaults to False.
        """
        self.config.validate_configuration()
        metadata = {
            "builtBy": built_by,
            "description": overview,
            "displayName": display_name,
            "labelsV2": get_label_set_labels(self.client.registry.label_set, self.resource_type, label_set, label),
            "logo": logo,
            "publisher": publisher,
            "shortDescription": desc,
            "isMultinodeEnabled": multinode,
        }
        metadata = {k: v for k, v in metadata.items() if v is not None}

        registry_url = get_registry_url()
        client: docker.APIClient = RegistryWrapper(registry_url, self.client)
        self._registry_login(client, registry_url)
        parsed_image = ImageRegistryTarget(image)

        if parsed_image.tag is None:
            parsed_image.tag = "latest"

        pushed_target = self._push_image(client, parsed_image, accept_rename=default_yes, output=output)

        if any(metadata):
            if output:
                self.printer.print_ok("Setting repository metadata")
            # wait for at most 10 seconds, the repository may not ready, wait 1 second and try again
            for _ in range(10):
                try:
                    self.get_repo_details(pushed_target.org, pushed_target.team, pushed_target.local_path())
                    logger.debug("Repository found, setting metadata")
                    break
                except ResourceNotFoundException:
                    logger.debug("Repository not found yet, waiting for 1 second")
                    time.sleep(1)
                    continue

            self.update_repo_metadata(pushed_target.org, pushed_target.team, pushed_target.local_path(), metadata)
            if output:
                self.printer.print_ok("Repository metadata set.")

    @extra_args
    def pull(
        self,
        image: str,
        scan: Optional[str] = None,
    ) -> None:
        """Pull an image from the repository.

        Args:
            image: Full image name. <org>/[<team>/]<image>[:<tags>]
            scan: Scan options. Defaults to None.

        Raises:
            ResourceNotFoundException: If image is not found.
            NgcAPIError: If image API response error.
            NgcException: If NGC related error.
        """
        self.config.validate_configuration(guest_mode_allowed=True)

        if scan:
            return self._pull_scan_report(image, scan)

        registry_url = get_registry_url()
        client: docker.APIClient = RegistryWrapper(registry_url, self.client)
        self._registry_login(client, registry_url)
        parsed_image = ImageRegistryTarget(image)

        # Mimic docker CLI's default tag of 'latest' if not specified
        if parsed_image.tag is None:
            parsed_image.tag = "latest"

        try:
            results = client.pull(parsed_image.image_path(), parsed_image.tag)
            for img in results:
                self.printer.print_image_pull_stream(img)
        except NotFound as err:
            raise ResourceNotFoundException(err.explanation or str(err)) from None
        except APIError as err:
            raise NgcAPIError(err.explanation or str(err)) from None
        except NgcException:
            raise
        except Exception as exc:
            raise NgcException(exc) from None
        return None

    @extra_args
    def publish(
        self,
        target,
        source: Optional[str] = None,
        metadata_only=False,
        version_only=False,
        visibility_only=False,
        allow_guest: Optional[bool] = False,
        discoverable: Optional[bool] = False,
        public: Optional[bool] = False,
        sign: Optional[bool] = False,
        access_type: Optional[str] = None,
        product_names: Optional[List[str]] = None,
        license_terms_specs: Optional[List[LicenseMetadata]] = None,
        nspect_id: Optional[str] = None,
    ):
        """Publishes a docker image with various options for metadata, versioning, and visibility.

        This method manages the publication of docker images to a repository, handling
        different aspects of the publication such as metadata only, version only, and
        visibility adjustments. It validates the combination of arguments provided
        and processes the publication accordingly.
        There are two seperate publishing flows in the follow precedence:
            unified catalog publishing: sets the product names and access type of the image.
            legacy publishing: sets the discoverable, public, allow_guest of the image.
        """  # noqa: D401
        self.config.validate_configuration(guest_mode_allowed=False)
        if not metadata_only and source:
            _source = ImageRegistryTarget(source, org_required=True, name_required=True)
            if _source.tag is None:
                _tag = self.get_repo_details(_source.org, _source.team, _source.image_path()).latestTag
                source += f":{_tag}" if _tag else ""
                logger.info("No tag specified for %s, using tag: %s", source, _tag)
        return self.client.registry.publish.publish(
            self.resource_type,
            self.config.org_name,
            self.config.team_name,
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
            False,  # upload pending is model/ resource related
            license_terms_specs,
            nspect_id,
        )

    def update_license_terms(self, target, license_terms_specs: Optional[List[LicenseMetadata]] = None):
        """Update a image's license terms of services.

        Args:
            target: Full image name. Format: org/[team/]name.
            license_terms_specs: License terms to.
        """
        self.config.validate_configuration(guest_mode_allowed=False)
        return self.client.registry.publish.update_license_terms(
            self.resource_type,
            target,
            self.config.org_name,
            self.config.team_name,
            license_terms_specs,
        )

    # End of Public SDK Functions
    def _pull_scan_report(self, image, scan):
        self.config.validate_configuration()
        irt = ImageRegistryTarget(image)
        if not irt.tag:
            raise ArgumentTypeError("--scan requires an image tag.")

        tag_digests = self.get_digest_for_tag(irt.org, irt.team, irt.image, irt.tag)
        multi_arch = len(tag_digests) > 1
        file_written = False
        for arch_type, digest in tag_digests.items():
            scan_info = self.get_scan_report(irt.org, irt.team, irt.image, irt.tag, digest)
            if multi_arch:
                nm, ext = os.path.splitext(scan)
                filename = f"{nm}-{arch_type}{ext}"
            else:
                filename = scan
            if not scan_info.scanIssues:
                continue

            # Need to count the number of issues and parse out the headers from ScanIssue properties
            file_written = True
            num_issues = 0
            fieldnames = []
            for key, value in ScanIssue.__dict__.items():
                if isinstance(value, property):
                    fieldnames.append(key)

            # Write the issues to a CSV file
            with open(filename, "w", newline="", encoding="utf-8") as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                for issue in scan_info.scanIssues:
                    writer.writerow(issue.toDict())
                    num_issues += 1
            self.printer.print_ok(f"Wrote {num_issues} issues to file {filename}")
        if not file_written:
            self.printer.print_ok("No issues found. Skipping file write.")

    def _push_image(self, client: docker.APIClient, parsed_image, accept_rename=False, output=False):
        try:
            results = client.push(parsed_image.image_path(), parsed_image.tag)
            if output:
                for msg in results:
                    self.printer.print_image_push_stream(msg)

        except ImageTagNotFound as exc:
            self.printer.print_error(
                "Error: "
                + str(exc)
                + "\nImage must be tagged in format: <registry>/<org>/[<team>/]<image-name>[:<tag>]"
            )
            parsed_image = self._tag_and_push(client, parsed_image, accept_rename, output=output)
            # _tag_and_push calls this function also, so return early as to not print the success message twice
            return parsed_image

        except (APIError, NgcException, ImageNotFound) as exc:
            raise exc

        if output:
            self.printer.print_ok("Successfully pushed '{}' to the registry.".format(str(parsed_image)))
        return parsed_image

    def _tag_and_push(self, client: docker.APIClient, parsed_image, accept_rename, output=False):
        suggested_name = self._generate_suggested_tag(parsed_image, client.registry_url)
        msg = "Would you like to tag '{}' as '{}' and push?".format(str(parsed_image), suggested_name)
        if question_yes_no(self.printer, msg, default="no", default_yes=accept_rename):
            self._tag_image(client, parsed_image, suggested_name)

            return self._push_image(client, ImageRegistryTarget(suggested_name), output=output)

        raise NgcException("Aborted image tag and push operation.")

    @staticmethod
    def _tag_image(client: docker.APIClient, parsed_image, suggested_name):
        parsed_suggested_name = ImageRegistryTarget(suggested_name)
        try:
            client.tag(str(parsed_image), parsed_suggested_name.image_path(), parsed_suggested_name.tag)
        except ImageNotFound:
            raise NgcException("Error: Image '{}' not found. Tagging image failed.".format(str(parsed_image))) from None
        logger.debug("Image '%s' successfully tagged '%s'", parsed_image.image_path(), suggested_name)

    def _generate_suggested_tag(self, parsed_image, registry_url):
        team = parsed_image.team or self.config.team_name
        if team == "no-team":
            team = None

        filtered_path = [
            x
            for x in [registry_url, parsed_image.org or self.config.org_name, team, parsed_image.image]
            if x is not None
        ]
        full_path = "/".join(filtered_path)
        suggested_tag = full_path + ":" + parsed_image.tag
        return suggested_tag

    def _registry_login(self, client: docker.APIClient, registry_url: str):
        username = "$oauthtoken"
        app_key = self.config.app_key

        if app_key:
            self.printer.print_ok("Logging in to {}...".format(registry_url), end=" ")
            try:
                client.login(username, app_key)
            except (APIError, ConnectionError) as err:
                self.printer.print_error("login failed.")
                raise NgcException(err) from None
            self.printer.print_ok("login successful.")
        else:
            logger.debug("Operating in guest mode - not logging in to registry")

    @staticmethod
    def get_architectures(image_obj, tag) -> List[ImageArchitectureVariant]:
        """Return a list of an image's `architectureVariants` that can be used to get details about an image."""
        if isinstance(image_obj, RepositoryImageDetailsList):
            image_obj = image_obj.toDict()
        images = image_obj.get("images", [])
        if not images:
            # No architecture information
            return []
        image = [img for img in images if img["tag"] == tag]
        if image:
            return image[0].get("architectureVariants", [])
        return []

    @staticmethod
    def _parse_repo_name(repo_name):
        repo_name = repo_name.split("/")
        org = repo_name.pop(0)
        try:
            image = repo_name.pop()
        except IndexError:
            raise ValueError("name of the image not found while parsing the repo name") from None
        # we try to get the team embedded in the pattern
        try:
            team = repo_name.pop()
        except IndexError:
            team = None
        return org, team, image

    @staticmethod
    def _get_repo_url(org, team, repo=None, page_size=None):
        """We need to create the image url - `/v2/org/{org-name}/team/{team-name}/repos`"""  # noqa: D415
        org_team = format_org_team(org, team)
        parts = ["v2", org_team, "repos", repo]
        ep = "/".join([part for part in parts if part])
        if page_size:
            ep = f"{ep}?page-size={ImageAPI.PAGE_SIZE}"
        return ep

    def _get_image_url(self, org, team, repo, image_id_or_tag=None):
        """We need to create the image url
        - `/v2/org/{org-name}/team/{team-name}/repos/{repo-name}/images/{image_id}`.
        """  # noqa: D205
        repo_url = self._get_repo_url(org, team, repo)
        return "/".join([itm for itm in [repo_url, "images", image_id_or_tag] if itm])

    def _get_scan_url(self, org, team, repo, tag, digest=None):
        """Endpoint for image scan status."""
        repo_url = self._get_repo_url(org, team, repo)
        if digest:
            parts = [repo_url, "images", tag, "digest", digest, "scan"]
        else:
            parts = [repo_url, "images", tag, "scan"]
        return "/".join(parts)

    def _get_tag_url(self, org, team, repo, tag=None):
        """We need to create the tag url
        - `/org/{orgName}/team/{teamName}/repos/{repository}/tags/{tagName}`.
        """  # noqa: D205
        repo_url = self._get_repo_url(org, team, repo)
        return "/".join([itm for itm in [repo_url, "tags", tag] if itm])

    @staticmethod
    def _get_publickey_url():
        """Endpoint for retrieving the image signing publickey."""
        return "v2/catalog/containers/public-key"

    def list_images(self, repo_name):  # noqa: D102
        if not repo_name:
            return []
        org, team, repo = self._parse_repo_name(repo_name)
        url = self._get_image_url(org, team, repo)
        list_image_dicts = list(
            pagination_helper(self.connection, url, org_name=org, team_name=team, operation_name="list_images")
        )
        if not list_image_dicts:
            return []
        # `list_image_dicts` will have the following structure, depending on the total number of images.
        # [
        #     {"images": [...]},
        #     {"images": [...]},
        #     {"images": [...]},
        # ]
        all_images = {"images": []}
        for image_dict in list_image_dicts:
            all_images["images"].extend(image_dict["images"])
        image_list = RepositoryImageDetailsList(all_images)

        def _set_image_name(image):
            setattr(image, "name", repo_name)
            return image

        return list(map(_set_image_name, image_list.images or []))

    def get_digest_for_tag(self, org, team, repo, tag) -> Dict[str, str]:
        """Returns a dict in the format of {architecture: sha256_digest}."""  # noqa: D401
        response = self.connection.make_api_request(
            "GET",
            self._get_image_url(org, team, repo),
            auth_org=org,
            auth_team=team,
            operation_name="get_tag_digests",
        )
        image_list = response.get("images")
        if not image_list:
            raise ResourceNotFoundException(f"No images found for the repo '{repo}'.")
        images = [img for img in image_list if img["tag"] == tag]
        if not images:
            raise ImageTagNotFound(f"Tag '{tag}' was not found.")
        image = images[0]
        return {arch["architecture"]: arch["digest"] for arch in image["architectureVariants"]}

    def get_repo_details(self, org_name, team_name, repo_name):
        """Returns information about a repository, such as:
        * Description
        * Labels
        * Latest Tag
        * Image Size
        """  # noqa: D205, D401, D415
        org, team, repo = self._parse_repo_name(repo_name)
        url = self._get_repo_url(org, team, repo)
        params = {"resolve-labels": "false"}
        response = self.connection.make_api_request(
            "GET",
            url,
            auth_org=org_name,
            auth_team=team_name,
            params=params,
            operation_name="get_repo_details",
        )
        return Repository(response)

    def get_scan_details(self, org_name, team_name, repo_name, tag):  # noqa: D102
        org, team, repo = self._parse_repo_name(repo_name)
        url = self._get_scan_url(org, team, repo, tag)
        try:
            scan_data = self.connection.make_api_request(
                "GET",
                url,
                auth_org=org_name,
                auth_team=team_name,
                operation_name="get_repo_scan_details",
            )
        except (ResourceNotFoundException, AccessDeniedException):
            # No scan info available or viewable; set the values to empty.
            scan_data = {}
        return ImageScanDetails(scan_data)

    def create_repo_metadata(self, org, team, metadata):
        """Create an empty image repository."""
        request = RepositoryCreateRequest(metadata)
        request.isValid()

        response = self.connection.make_api_request(
            "POST",
            self._get_repo_url(org, team),
            payload=request.toJSON(),
            auth_org=org,
            auth_team=team,
            operation_name="create_repo_metadata",
        )

        return Repository(response)

    def update_repo_metadata(self, org_name, team_name, repo_name, metadata):  # noqa: D102
        org, team, repo = self._parse_repo_name(repo_name)

        request_payload = RepositoryInfoUpdateRequest(metadata)
        request_payload.isValid()

        response = self.connection.make_api_request(
            "PATCH",
            self._get_repo_url(org, team, repo),
            payload=request_payload.toJSON(),
            auth_org=org_name,
            auth_team=team_name,
            operation_name="update_repo_metadata",
        )

        return response

    def remove_repo(self, org_name, team_name, repo_name):  # noqa: D102
        _org, _team, _image = self._parse_repo_name(repo_name)
        response = self.connection.make_api_request(
            "DELETE",
            self._get_repo_url(_org, _team, _image),
            auth_org=org_name,
            auth_team=team_name,
            operation_name="delete_repo",
            timeout=CAS_TIMEOUT,
        )
        return response

    def remove_image_tag(self, org_name, team_name, repo_name, tag_name):  # noqa: D102
        _org, _team, _image = self._parse_repo_name(repo_name)
        response = self.connection.make_api_request(
            "DELETE",
            self._get_image_url(_org, _team, _image, tag_name),
            auth_org=org_name,
            auth_team=team_name,
            operation_name="delete_image_tag",
            timeout=CAS_TIMEOUT,
        )
        return response

    def sign_image(self, org_name, team_name, dict_payload) -> Response:  # noqa: D102
        request_payload = PublishingRequest(dict_payload)
        request_payload.isValid()
        logger.debug(request_payload)
        response = self.connection.make_api_request(
            "POST",
            endpoint=self._get_image_signing_url(),
            auth_org=org_name,
            auth_team=team_name,
            operation_name="sign_image",
            payload=request_payload.toJSON(),
        )
        return Response(response)

    def get_tag_meta(self, org_name, team_name, repo_name, tag_name):
        """Get tag metadata, including malware-scan, arch-variants, etc."""
        _org, _team, _image = self._parse_repo_name(repo_name)
        url = self._get_tag_url(_org, _team, _image, tag_name)
        response = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="get_tag_meta"
        )
        return MetaImageDetails(response)

    def info_image_tag(self, org_name, team_name, repo_name, tag_name):  # noqa: D102
        _org, _team, _image = self._parse_repo_name(repo_name)
        url = self._get_image_url(_org, _team, _image, tag_name)
        response = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="info_image_tag"
        )
        return GetManifestByTagResponse(response)

    def extended_image_info(
        self, org_name, team_name, repo_name, tag_name, scan=False
    ) -> Tuple[RepositoryImageDetailsList, GetManifestByTagResponse, List[Tuple[ImageScanDetails, str]]]:
        """Concurrently requests information about the images in a given repository for more detail."""
        org, team, image = self._parse_repo_name(repo_name)
        tag_list_url = self._get_image_url(org, team, image)
        tag_info_url = self._get_image_url(org, team, image, tag_name)
        tag_list = list(
            pagination_helper(
                self.connection,
                tag_list_url,
                org_name=org,
                team_name=team,
                operation_name="list_images",
            )
        )
        # `tag_list` will have the following structure, depending on the total number of images.
        # [
        #     {"images": [...]},
        #     {"images": [...]},
        #     {"images": [...]},
        # ]
        all_tags = {"images": []}
        for tag_dict in tag_list:
            all_tags["images"].extend(tag_dict["images"])
        tag_info = self.connection.make_api_request(
            "GET",
            tag_info_url,
            auth_org=org,
            auth_team=team,
            operation_name="get_tag_details",
        )
        scan_info = []
        if scan:
            arch_digests = self.get_digest_for_tag(org, team, image, tag_name)
            for arch, digest in arch_digests.items():
                scan_url = self._get_scan_url(org, team, image, tag_name, digest)
                try:
                    response = self.connection.make_api_request(
                        "GET", scan_url, auth_org=org_name, auth_team=team_name, operation_name="image digest scan info"
                    )
                    # The response doesn't contain the arch info, so return it in a tuple with the image scan.
                    # We can then parse that tuple during printing to display that information.
                    scan_info.append((response, arch))
                except (ResourceNotFoundException, AccessDeniedException):
                    # No scan info available or viewable; set the values to empty.
                    continue
        # scan_info will be an empty list when called with scan=False, but the ImageScanDetails object will still be
        # valid.
        return (
            RepositoryImageDetailsList(all_tags),
            GetManifestByTagResponse(tag_info),
            [(ImageScanDetails(info[0]), info[1]) for info in scan_info],
        )

    def start_scan(self, org, team, repo, tag):
        """Mark the image represented by `repo:tag` to be scanned.

        Returns immediately with no return value.
        """
        base_url = self._get_image_url(org, team, repo, tag)
        url = "/".join([base_url, "scan"])
        self.connection.make_api_request(
            "POST", url, auth_org=org, auth_team=team, operation_name="start_scan", json_response=False
        )

    def start_digest_scan(self, org, team, repo, tag, digest):
        """Marks the image represented by `repo:tag` and the image digest to be scanned. This is required because
        multi-arch images will not be scanned by tag alone.

        Returns immediately with no return value.
        """  # noqa: D205, D401
        base_url = self._get_image_url(org, team, repo, tag)
        url = "/".join([base_url, "digest", digest, "scan"])
        self.connection.make_api_request(
            "POST", url, auth_org=org, auth_team=team, operation_name="start_digest_scan", json_response=False
        )

    def get_scan_report(self, org, team, repo, tag, digest=None):  # noqa: D102
        url = self._get_scan_url(org, team, repo, tag, digest=digest)
        resp = self.connection.make_api_request("GET", url, auth_org=org, auth_team=team, operation_name="scan_report")
        return ImageScanDetails(resp)

    def get_publickey(self):  # noqa: D102
        url = self._get_publickey_url()
        return self.connection.make_api_request("GET", url, json_response=False, operation_name="image publickey")

    def _get_images(self, repos, repo_name=None):
        images = []
        for repo_search in repos or []:
            for repo in repo_search or []:
                repo_name = repo_name or repo.resourceId
                images.append(self.list_images(repo_name=repo_name))
        return chain(*images)

    @staticmethod
    def _filter_images(images, tag_matcher, signed_only=False):
        if tag_matcher:
            images = [image for image in images if fnmatch(image.tag, tag_matcher)]
        if signed_only:
            images = [image for image in images if hasattr(image, "isSigned") and image.isSigned]
        return images

    @staticmethod
    def _get_image_signing_url():
        """Endpoint for signing an image."""
        return "v2/catalog/containers/signature"


class GuestImageAPI(ImageAPI):  # noqa: D101
    @staticmethod
    def _get_repo_url(org=None, team=None, repo=None, page_size=None):
        """We need to create the url for public repos
        `/v2/repos/{org-name}/{team-name}/{repo-name}`
        """  # noqa: D205, D415
        ep = "v2/repos"
        if org:
            ep = "/".join([ep, "{}".format(org)])
        if team:
            ep = "/".join([ep, "{}".format(team)])
        if repo:
            ep = "/".join([ep, repo])
        if page_size:
            ep = "?".join([ep, "page-size={}".format(ImageAPI.PAGE_SIZE)])
        return ep

    def _get_image_url(self, org=None, team=None, repo=None, image_id_or_tag=None):
        """We need to create the url for public image
        `/v2/repos/{org-name}/{team-name}/{repo-name}/images/{image-tag}`
        """  # noqa: D205, D415
        ep = self._get_repo_url(org, team, repo)
        ep = "/".join([ep, "images"])
        if image_id_or_tag:
            ep = "/".join([ep, image_id_or_tag])
        return ep

    def _get_license_terms(self, target):
        """Get license terms for an image repository."""
        irt = ImageRegistryTarget(target)
        repo_name = "/".join([f for f in [irt.org, irt.team, irt.image] if f])
        resp = self.get_repo_details(irt.org, irt.team, repo_name)
        return resp.licenseTerms if hasattr(resp, "licenseTerms") else None

    @extra_args
    def pull(
        self,
        image: str,
        scan: Optional[str] = None,
        agree_license: bool = False,
    ) -> None:
        """Pull an image from the repository.

        Args:
            image: Full image name. <org>/[<team>/]<image>[:<tags>]
            scan: Scan options. Defaults to None.
            agree_license: Optional; if True, skip license checking. Defaults to False.

        Raises:
            ResourceNotFoundException: If image is not found.
            NgcAPIError: If image API response error.
            NgcException: If NGC related error.
        """
        # Perform license check for guest downloads
        self.client.registry.publish.check_license_for_guest_download(self, image, agree_license)

        # Call parent pull method
        return super().pull(image, scan)
