#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

import argparse
from argparse import ArgumentTypeError
from datetime import datetime
from fnmatch import fnmatch
import json
import os
import re
from typing import List, Tuple

from ngcbase.api.utils import add_scheme, DotDict, remove_scheme
from ngcbase.command.args_validation import validate_credentials_json
from ngcbase.constants import CANARY_ENV, DEV_ENV, PRODUCTION_ENV, STAGING_ENV
from ngcbase.errors import NgcException, ResourceNotFoundException
from ngcbase.util.file_utils import mkdir_path
from ngcbase.util.utils import contains_glob, find_case_insensitive, get_environ_tag
from registry.constants import HELM_URL_MAPPING, REGISTRY_URL_MAPPING
from registry.data.model.CustomMetricGroup import CustomMetricGroup
from registry.data.model.Dataset import Dataset
from registry.data.publishing.Artifact import Artifact
from registry.data.publishing.LicenseMetadata import LicenseMetadata
from registry.environ import NGC_CLI_REGISTRY_SERVICE_URL


def get_nvcr_relative_url() -> str:  # noqa: D103
    tag = get_environ_tag()
    env = {
        PRODUCTION_ENV: "prod",
        CANARY_ENV: "canary",
        STAGING_ENV: "stg",
        DEV_ENV: "dev",
    }.get(tag)
    return REGISTRY_URL_MAPPING[env]


def get_registry_url():  # noqa: D103
    if NGC_CLI_REGISTRY_SERVICE_URL:
        return NGC_CLI_REGISTRY_SERVICE_URL
    tag = get_environ_tag()
    env = {
        PRODUCTION_ENV: "prod",
        CANARY_ENV: "canary",
        STAGING_ENV: "stg",
        DEV_ENV: "dev",
    }.get(tag)
    return add_scheme(REGISTRY_URL_MAPPING[env])


def get_chart_url():  # noqa: D103
    tag = get_environ_tag()
    env = {
        PRODUCTION_ENV: "prod",
        CANARY_ENV: "canary",
        STAGING_ENV: "stg",
        DEV_ENV: "dev",
    }.get(tag)
    return add_scheme(HELM_URL_MAPPING[env])


def get_helm_repo_url():
    """Get the appropriate helm chart repository url for the corresponding base_url."""
    environ_tag = get_environ_tag()
    env = {
        PRODUCTION_ENV: "prod",
        CANARY_ENV: "canary",
        STAGING_ENV: "stg",
        DEV_ENV: "dev",
    }.get(environ_tag)
    return HELM_URL_MAPPING[env]


def get_image_service_no_protocol():
    """Return the appropriate endpoint for the image management service."""
    tag = get_environ_tag()
    env = {
        PRODUCTION_ENV: "prod",
        CANARY_ENV: "canary",
        STAGING_ENV: "stg",
        DEV_ENV: "dev",
    }.get(tag)
    return f"{REGISTRY_URL_MAPPING[env]}"


def get_image_service_url():
    """Return the appropriate URL for the image management service."""
    return f"https://{get_image_service_no_protocol()}"


class RegistryTarget:
    """This class represents a registry target.

    target pattern: [org/[team/]]name[:instance]

    Examples:
        nvidian/nves/foo - {org=nvidian, team=nves, name=foo, instance=None}
        nvidian/nves/* - {org=nvidian, team=nves, name=*, instance=None}
        nvidian/nves/bar:10 - {org=nvidian, team=nves, name=bar, instance=10}
        nvidian/bar - {org=nvidian, team=None, name=bar, instance=None}
        nvidian/bar:[1-5] - {org=nvidian, team=None, name=bar, instance=[1-5]}
        nvidian/nves/bar:py3 - {org=nvidian, team=nves, name=bar, instance=py3}
    """  # noqa: D404

    def __init__(self, target_string, error, colons_in_version=False):
        self._target = target_string
        self.org = None
        self.team = None
        self._name = None
        self._instance = None
        self._error = error
        self._colons_in_version = colons_in_version
        self._parse_target()

    def __members__(self):  # noqa: D105
        return (self.org, self.team, self._name, self._target)

    def __str__(self):  # noqa: D105
        str_ = "/".join([x for x in [self.org, self.team, self._name] if x is not None])
        if self._instance:
            str_ = ":".join([str_, str(self._instance)])
        return str_

    def __hash__(self):  # noqa: D105
        return hash(self.__members__())

    def __eq__(self, other):
        """Equal if the two items are the same class and have the same significant values."""
        if self.__class__ == other.__class__:
            return self.__members__() == other.__members__()
        return False

    def _parse_target(self):
        if self._target is not None:
            maxsplit = 1 if self._colons_in_version else -1
            _pattern = self._target.split(":", maxsplit=maxsplit)

            if len(_pattern) > 2:
                raise ArgumentTypeError(self._error)

            # instance (tag)
            try:
                self._instance = _pattern[1]
            except IndexError:
                self._instance = None

            # handle the 'foo/bar:' case
            if self._instance == "":
                self._instance = None

            _pattern = _pattern[0].split("/")

            # handle the /foo case
            if _pattern[0] == "":
                raise ArgumentTypeError(self._error)

            if len(_pattern) > 3:
                raise ArgumentTypeError(self._error)

            try:
                self._name = _pattern.pop()
            except IndexError:
                raise ArgumentTypeError(self._error) from None

            if len(_pattern) == 2:
                self.team = _pattern.pop() or None

            try:
                self.org = _pattern.pop()
            except IndexError:
                self.org = None


class ImageRegistryTarget(RegistryTarget):
    """This class represents an image registry target.

    target pattern: org/[team/]image[:tag]
    """  # noqa: D404

    def __init__(
        self,
        target_string,
        org_required=False,
        name_required=False,
        validate=True,
        tag_required=False,
        tag_allowed=True,
    ):
        self.registry_addr = None
        target_string = self._take_registry_url(target_string)
        error = "Pattern should be in format org/[team/]image[:<tag>]"
        super().__init__(target_string, error)

        if validate:
            self._validate(
                org_required=org_required,
                name_required=name_required,
                tag_required=tag_required,
                tag_allowed=tag_allowed,
            )

    def _validate(self, org_required=False, name_required=False, tag_required=False, tag_allowed=True):
        # prevent more than one wildcard per query if the tag has a glob
        glob_org = contains_glob(self.org)
        glob_team = contains_glob(self.team)
        glob_image = contains_glob(self._name)
        glob_instance = contains_glob(self._instance)

        if glob_instance and (glob_org or glob_team or glob_image):
            raise ArgumentTypeError(
                "Invalid target: '{}', pattern matching is not allowed on both image and tag at the same time.".format(
                    self._target
                )
            )

        if org_required and self.org is None:
            raise ArgumentTypeError(
                "Invalid target: '{}', no `org` specified. Format: [org/[team/]]name.".format(self._target)
            )

        if name_required and not self._name:
            raise ArgumentTypeError(
                "Invalid target: '{}', no `name` specified. Format: org/[team/]name.".format(self._target)
            )

        if tag_required and self.tag is None:
            raise ArgumentTypeError(
                "Invalid target: '{}', no `tag` specified. Format: [org/[team/]]name:tag.".format(self._target)
            )

        if not tag_allowed and self.tag is not None:
            raise ArgumentTypeError(
                "Invalid target: '{}', `tag` cannot be specified. Format: [org/[team/]]name.".format(self._target)
            )

    def __str__(self):  # noqa: D105
        image_path = self.image_path()
        return self._add_tag_if_present(image_path)

    def image_path(self):
        """Returns the path to an image repository - everything before the tag."""  # noqa: D401
        filtered_fields = [x for x in [self.registry_addr, self.org, self.team, self.image] if x is not None]
        return "/".join(filtered_fields)

    def local_path_and_tag(self):
        """Returns the local path of an image, including its tag.
        Does not include the registry address.
        """  # noqa: D205, D401
        filtered_fields = [x for x in [self.org, self.team, self.image] if x is not None]
        joined = "/".join(filtered_fields)
        return self._add_tag_if_present(joined)

    def local_path(self):
        """Returns the local path (strips registry url and tag)"""  # noqa: D401, D415
        filtered_fields = [x for x in [self.org, self.team, self.image] if x is not None]
        return "/".join(filtered_fields)

    def _add_tag_if_present(self, image_path):
        if self.tag:
            return image_path + ":" + self.tag

        return image_path

    def _take_registry_url(self, input_str):
        """Removes the registry URL (if present) and stores for later use."""  # noqa: D401
        full_registry_url = get_registry_url()
        schemeless_url = remove_scheme(full_registry_url)

        # input is empty for ngc registry image list
        if input_str:
            if input_str.startswith(schemeless_url):
                url_len = len(schemeless_url)
                self.registry_addr = input_str[:url_len]
                # Remove registry addr and its slash from input
                return input_str[url_len + 1 :]  # noqa: E203

            if input_str.startswith(full_registry_url):
                url_len = len(full_registry_url)
                self.registry_addr = input_str[:url_len]
                return input_str[url_len + 1 :]  # noqa: E203

        return input_str

    @property
    def image(self):  # noqa: D102
        return self._name

    @property
    def tag(self):  # noqa: D102
        return self._instance

    @tag.setter
    def tag(self, tag):
        self._instance = tag


class ModelRegistryTarget(RegistryTarget):
    """This class represents a model registry target.

    target pattern: [org/[team/]]name[:version]
    """  # noqa: D404

    def __init__(
        self,
        target_string,
        org_required=False,
        name_required=False,
        version_required=False,
        version_allowed=True,
        glob_allowed=False,
        validate=True,
        colons_in_version=False,
    ):
        error = "Pattern should be in format [org/[team/]]name[:version]"
        super().__init__(target_string, error, colons_in_version=colons_in_version)
        # FUTURE - move this up to use in image too?
        if validate:
            self._validate(
                org_required=org_required,
                name_required=name_required,
                version_required=version_required,
                version_allowed=version_allowed,
                glob_allowed=glob_allowed,
            )

    def _validate(
        self, org_required=False, version_required=False, name_required=False, version_allowed=True, glob_allowed=False
    ):
        _glob_org = contains_glob(self.org)
        _glob_team = contains_glob(self.team)
        _glob_name = contains_glob(self.name)
        _glob_ver = contains_glob(self.version)

        if org_required and self.org is None:
            if version_allowed is True:
                raise ArgumentTypeError(
                    "Invalid target: '{}', no `org` specified. Format: [org/[team/]]name[:version].".format(
                        self._target
                    )
                )

            raise ArgumentTypeError(
                "Invalid target: '{}', no `org` specified. Format: [org/[team/]]name.".format(self._target)
            )

        if name_required and not self._name:
            if version_allowed is True:
                raise ArgumentTypeError(
                    "Invalid target: '{}', no `name` specified. Format: org/[team/]name[:version].".format(self._target)
                )

            raise ArgumentTypeError(
                "Invalid target: '{}', no `name` specified. Format: org/[team/]name.".format(self._target)
            )

        if version_required and self.version is None:
            raise ArgumentTypeError(
                "Invalid target: '{}', no `version` specified. Format: [org/[team/]]name:version.".format(self._target)
            )

        if version_allowed is False and self.version is not None:
            raise ArgumentTypeError(
                "Invalid target: '{}', `version` not allowed. Format: [org/[team/]]name.".format(self._target)
            )

        if not glob_allowed and (_glob_org or _glob_team or _glob_name or _glob_ver):
            raise ArgumentTypeError(
                "Invalid target: '{}', pattern matching not supported with this verb.".format(self._target)
            )

        if _glob_ver and (_glob_org or _glob_team or _glob_name):
            raise ArgumentTypeError(
                "Invalid target: '{}', pattern matching is not allowed on both model "
                "and version at the same time.".format(self._target)
            )

    @property
    def name(self):  # noqa: D102
        return self._name

    @property
    def version(self):  # noqa: D102
        return self._instance

    @version.setter
    def version(self, ver):
        self._instance = ver


class ChartRegistryTarget(ModelRegistryTarget):
    """Allow both the standard registry pattern of:

    [org/[team/]]name[:version]

    as well as the standard naming pattern for helm charts:

    [org/[team/]]name-version.tgz
    """  # noqa: D415

    def __init__(
        self,
        target_string,
        org_required=False,
        name_required=False,
        version_required=False,
        version_allowed=True,
        glob_allowed=False,
        validate=True,
        colons_in_version=False,
    ):
        """Keep all the superclass params, but set `colons_in_version` to True."""
        super().__init__(
            target_string=target_string,
            org_required=org_required,
            name_required=name_required,
            version_required=version_required,
            version_allowed=version_allowed,
            glob_allowed=glob_allowed,
            validate=validate,
            colons_in_version=True,
        )

    def _parse_target(self):
        # nvidia/team/edtest-0.4.0.tgz
        mtch = re.match(r"([^-]+)-(.+)\.tgz", self._target) if self._target else None
        if not mtch:
            super()._parse_target()
        else:
            # Get the org/team/name and version groups
            identifier, self.version = mtch.groups()
            name_parts = identifier.split("/")
            # The 'name' is always required, and will be the last element in the list
            self._name = name_parts.pop()
            part_len = len(name_parts)
            if part_len == 2:
                self.org, self.team = name_parts
            elif part_len == 1:
                self.org = name_parts[0]


class SimpleRegistryTarget(RegistryTarget):
    """This class represents a label set target.

    target pattern: [org/[team/]]name
    """  # noqa: D404

    def __init__(self, target_string, org_required=False, name_required=False, glob_allowed=False, validate=True):
        error = "Pattern should be in format [org/[team/]]name"

        super().__init__(target_string, error)
        # FUTURE - move this up to use in image too?
        if validate:
            self._validate(org_required=org_required, name_required=name_required, glob_allowed=glob_allowed)

    def _validate(self, org_required=False, name_required=False, glob_allowed=False):
        _glob_org = contains_glob(self.org)
        _glob_team = contains_glob(self.team)
        _glob_name = contains_glob(self.name)

        if org_required and self.org is None:
            raise ArgumentTypeError(
                "Invalid target: '{}', no `org` specified. Format: [org/[team/]]name.".format(self._target)
            )

        if name_required and not self._name:
            raise ArgumentTypeError(
                "Invalid target: '{}', no `name` specified. Format: org/[team/]name.".format(self._target)
            )

        if not glob_allowed and (_glob_org or _glob_team or _glob_name):
            raise ArgumentTypeError(
                "Invalid target: '{}', pattern matching not supported with this verb.".format(self._target)
            )

    @property
    def name(self):  # noqa: D102
        return self._name


def handle_public_dataset(args):
    """Helper to handle public datasets."""  # noqa: D401
    if (args.public_dataset_link or args.public_dataset_license) and not args.public_dataset_name:
        raise NgcException("public-dataset-name is required if public-dataset-license or public-dataset-link is set.")
    public_ds = Dataset(
        {"name": args.public_dataset_name, "link": args.public_dataset_link, "license": args.public_dataset_license}
    )
    return public_ds


def handle_public_dataset_no_args(public_dataset_link=None, public_dataset_license=None, public_dataset_name=None):
    """Helper to handle public datasets."""  # noqa: D401
    if (public_dataset_link or public_dataset_license) and not public_dataset_name:
        raise NgcException("public-dataset-name is required if public-dataset-license or public-dataset-link is set.")
    public_ds = Dataset({"name": public_dataset_name, "link": public_dataset_link, "license": public_dataset_license})
    return public_ds


def format_repo(org=None, team=None, name=None):
    """Format org, team and name into a repo.

    org/team/name
    """
    _org = ""
    _team = ""
    _name = ""
    if org is not None:
        _org = "{}/".format(org)
    if team is not None:
        _team = "{}/".format(team)
    if name is not None:
        _name = "{}".format(name)
    return "{}{}{}".format(_org, _team, _name)


def filter_version_list(version_list, target_version, signed_only=False):
    """Given a ModelVersion, RecipeVersion, or ArtifactVersion list, filter to the target_version
    using glob pattern matching in addition filter for signed versions only.
    """  # noqa: D205
    if signed_only:
        version_list = [ver for ver in version_list if getattr(ver, "isSigned", False)]
    return [
        ver
        for ver in version_list
        if fnmatch(str(ver.id), target_version) or fnmatch(str(ver.versionId), target_version)
    ]


def apply_labels_update(labels: List[str], add: List[str], remove: List[str]) -> List[str]:
    """Add or remove labels from a list of labels."""
    _remove = set(remove)
    _labels = set(labels) | set(add)

    labels.extend(add)
    return [x for x in _labels if x not in _remove]


def get_label_set_labels(client, resource_type, label_sets, labels) -> List[str]:
    """Combine label set labels and arg labels."""
    if labels or label_sets:
        glb_sets = client.list_label_sets(org_name=None, team_name=None, resource_type=resource_type)
        glb_dict = {}
        for label_set in glb_sets.labelSets or []:
            value = label_set.value.split("/")
            glb_dict.update({label.value.replace("-", "_"): value for label in label_set.labels})
        labelsV2 = []

        if label_sets:
            for label_set in label_sets or []:
                lrt = SimpleRegistryTarget(label_set, org_required=True, name_required=True)
                try:
                    resp = client.get(lrt.org, lrt.team, lrt.name)
                    for label in resp.labels or []:
                        if label.value in glb_dict:
                            labelsV2.append("{}:{}:{}".format(*glb_dict[label.value], label.value))
                        else:
                            if resp.resourceType:
                                labelsV2.append("{}:{}:{}".format(label_set, resp.resourceType, label.value))
                            else:
                                labelsV2.append("{}:{}".format(label_set, label.value))
                except ResourceNotFoundException:
                    raise ResourceNotFoundException("Label set '{}' could not be found.".format(label_set)) from None

        if labels:
            for label in labels or []:
                label_val = label.lower().replace(" ", "_")
                if label_val in glb_dict:
                    labelsV2.append("{}:{}:{}".format(*glb_dict[label_val], label_val))
                else:
                    labelsV2.append("{}".format(label))

        if labelsV2:
            return list(set(labelsV2))

    return []


def get_container_json(target):
    """Return the JSON for configuring the container field of a DeploymentUrlCreateRequest."""
    return {
        "artifactType": "REPOSITORY",
        "orgName": target.org,
        "teamName": target.team,
        "name": target.image,
        "versionId": target.tag,
    }


def verify_link_type(link_type):
    """If a link_type has been specified, make sure it is valid, and if so, convert to the canonical capitalization."""
    LINK_TYPE_VALUES = ["NGC", "Github", "Other"]
    if link_type:
        link_type = find_case_insensitive(link_type, LINK_TYPE_VALUES, "link_type")


def add_credentials_to_request(request, metric_files, credential_files):  # noqa: D103
    file_name = credential_files or metric_files
    arg_name = "credentials" if credential_files else "metrics"
    if file_name:
        request.customMetrics = []
        if len(file_name) > 3:
            raise argparse.ArgumentTypeError(
                f"argument error --{arg_name}-file: Only three credentials files may be used per model version."
            )
        for credential_file in file_name:
            with open(credential_file, "r", encoding="utf-8") as f:
                try:
                    file_contents = f.read()
                except Exception as err:
                    msg = f"Error reading {arg_name} file '{credential_file}': {err}"
                    raise argparse.ArgumentTypeError(msg) from None
            try:
                json_contents = json.loads(file_contents)
                validate_credentials_json(json_contents)
            except (argparse.ArgumentTypeError, json.JSONDecodeError) as err:
                msg = f"Error parsing {arg_name} file '{credential_file}': {err}"
                raise argparse.ArgumentTypeError(msg) from None

            new_metrics = CustomMetricGroup(json_contents)
            request.customMetrics.append(new_metrics)
    return request


def get_auth_org_and_team(resource_org, resource_team, config_org, config_team) -> Tuple:  # noqa: D103
    if (resource_org is None) and (resource_team is None):
        return config_org, config_team
    return resource_org, resource_team


def create_publish_artifact(org, team, name, version=None) -> Artifact:
    """Create the Artifact object used in publishing request, source artifact or target artifact."""
    return Artifact(
        {
            "org": org,
            "team": team,
            "name": name,
            "version": version,
        }
    )


def str_to_bool(input_str, default_value=None) -> bool:
    """Convert a string to boolean.

    Args:
        input_str: A colon-separated string.
        default_value: The default boolean value to return. Default to None.

    Returns:
        The converted boolean value.

    Raises:
        ValueError: If input_str isn't a valid value and default_value is None.
    """
    input_str = input_str.lower()
    valid_inputs = {
        "true": True,
        "t": True,
        "yes": True,
        "y": True,
        "1": True,
        "false": False,
        "f": False,
        "no": False,
        "n": False,
        "0": False,
    }
    if input_str not in valid_inputs:
        if default_value is None:
            raise ValueError(f"Epected boolean value but got {input_str}")
        return default_value
    return valid_inputs[input_str]


def str_to_license_metadata(input_str):
    """Create a LicenseMetadata for use with registry artifacts.

    Format: expected license_id:license_version:needs_user_acceptance:governing_terms.
    `needs_user_acceptance` should be resolvable into a boolean.

    Args:
        input_str: A colon-separated string.

    Returns:
        The created `LicenseMetadata` instance.

    Raises:
        NgcException: If `input_str` is not in the expected format.
    """
    try:
        values = input_str.split(":")
        if len(values) != 4:
            raise NgcException(
                "Incorrect license terms specification format: expected "
                "license_id:license_version:needs_user_acceptance:governing_terms."
            ) from None
        license_id = values[0]
        license_version = values[1]
        needs_user_acceptance = str_to_bool(values[2])
        governing_terms = values[3]
        return LicenseMetadata(
            {
                "licenseId": license_id,
                "licenseVersion": license_version,
                "needsAcceptance": needs_user_acceptance,
                "governingTerms": governing_terms,
            }
        )
    except (IndexError, ValueError):
        raise NgcException(
            "Incorrect license terms specification format: expected "
            "license_id:license_version:needs_user_acceptance:governing_terms."
        ) from None


def validate_destination(
    destination: str, mrt: ModelRegistryTarget, file_name: str, create: bool = False
):  # noqa: R0201 pylint: disable=no-self-use
    """Validate destination directory and optionally creates it.

    Args:
        destination: Description of model.
        mrt: ModelRegistryTarget of target model.
        file_name: The name of the file to to create.
        create: If True, create destination.

    Raises:
        NgcException: if the path does not exist.
    """
    download_dir = os.path.abspath(destination)
    if not os.path.isdir(download_dir):
        raise NgcException(f"The path: '{destination}' does not exist.")
    download_dir = f"{download_dir}/{mrt.name}_v{mrt.version}"
    if create:
        outfile = os.path.join(download_dir, file_name)
        mkdir_path(os.path.dirname(outfile))
        return outfile
    return download_dir


def make_transfer_result(
    xfer_id: str,
    status: str,
    transfer_path: str,
    completed_count: int,
    completed_bytes: int,
    started_at: datetime,
    ended_at: datetime,
) -> DotDict:
    """Unified SDK registry transfer return object."""
    return DotDict(
        {
            "transfer_id": xfer_id,
            "status": status,
            "path": transfer_path,
            "duration_seconds": (ended_at - started_at).total_seconds(),
            "completed_count": completed_count,
            "completed_bytes": completed_bytes,
            "started_at": started_at,
            "ended_at": ended_at,
        }
    )
