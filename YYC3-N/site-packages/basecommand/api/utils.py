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
from argparse import ArgumentTypeError
import re
import string

from basecommand.constants import (
    DATA_MOVER_SERVICE_URL_MAPPING,
    DATASET_SERVICE_URL_MAPPING,
)
from basecommand.data.api.JobLabelDeleteRequest import JobLabelDeleteRequest
from basecommand.data.api.JobLabels import JobLabels
from basecommand.data.api.JobLabelUpdateRequest import JobLabelUpdateRequest
from basecommand.data.api.ReservedLabels import ReservedLabels
from basecommand.data.api.SecretKeySpec import SecretKeySpec
from basecommand.data.api.SecretSpec import SecretSpec
from basecommand.data.api.SystemLabels import SystemLabels
from basecommand.data.api.UserLabels import UserLabels
from ngcbase.constants import CANARY_ENV, DEV_ENV, PRODUCTION_ENV, STAGING_ENV
from ngcbase.errors import InvalidArgumentError, NgcException, ValidationException
from ngcbase.util.utils import get_environ_tag, has_org_role
from organization.api.orgs import OrgAPI

env_mapping = {PRODUCTION_ENV: "prod", CANARY_ENV: "canary", STAGING_ENV: "stg", DEV_ENV: "dev"}


def get_data_mover_service_url():
    """Return the appropriate URL for the data mover service."""
    tag = get_environ_tag()
    env = env_mapping.get(tag)
    return DATA_MOVER_SERVICE_URL_MAPPING[env]


def get_dataset_service_url():
    """Return the appropriate URL for the dataset service."""
    tag = get_environ_tag()
    env = env_mapping.get(tag)
    return DATASET_SERVICE_URL_MAPPING[env]


class JobTarget:
    """This class represents a job target.

    target pattern: <job[:<task>]>
    """  # noqa: D404

    def __init__(self, target_string):
        self._target = target_string
        self.job_id = None
        self.replica_id = None
        self._parse_target()
        self._validate()

    def _parse_target(self):
        self._error = "Invalid job id: '{}'. ".format(self._target)
        self._error = self._error + "Pattern should be in format <job id>[:replica_id]"

        if self._target:
            _pattern = self._target.split(":")

            if len(_pattern) > 2:
                raise ArgumentTypeError(self._error)

            try:
                self.replica_id = _pattern[1]
            except IndexError:
                pass
            self.job_id = _pattern[0]

    def _validate(self):

        validate_job = self.job_id and self.job_id.isdigit()
        validate_task = self.replica_id.isdigit() if self.replica_id is not None else True

        if not (validate_job and validate_task):
            raise ArgumentTypeError(self._error)

    def __str__(self):  # noqa: D105
        return self._target


class QuickStartClusterTarget:
    """This class represents a dask cluster target.

    target pattern: [org/[team/]]name

    Examples:
        nvidian/nves/foo - {org=nvidian, team=nves, name=foo}
        nvidian/nves/* - {org=nvidian, team=nves, name=*}
        nvidian/nves/bar:10 - {org=nvidian, team=nves, name=bar}
        nvidian/bar - {org=nvidian, team=None, name=bar}
    """  # noqa: D404

    def __init__(self, target_string):
        self.target = target_string
        self.org = None
        self.team = None
        self.name = None
        self._parse_target()

    def __str__(self):  # noqa: D105
        return "/".join([x for x in [self.org, self.team, self.name] if x is not None])

    def _parse_target(self):
        if self.target is not None:
            pattern = self.target.split("/")

            # handle the /foo case
            if pattern[0] == "":
                raise ArgumentTypeError("Target cannot start with '/'.")
            if len(pattern) > 3:
                raise ArgumentTypeError("Target does not match pattern of 'org/team/name'.")
            try:
                self.name = pattern.pop()
            except IndexError:
                raise ArgumentTypeError("No name provided") from None
            if len(pattern) == 2:
                self.team = pattern.pop()
            try:
                self.org = pattern.pop()
            except IndexError:
                self.org = None


def get_storage_resource_owner_id(client, org_name, storage_resource_creator_id):  # noqa: D103
    user_info_response = client.users.user_who(org_name)

    if user_info_response.user.id == storage_resource_creator_id:
        return user_info_response.user.clientId

    # TODO: ADMIN are deprecated.
    enhanced_read_perms = has_org_role(
        user_info_response, org_name, ["ADMIN", "BASE_COMMAND_ADMIN", "BASE_COMMAND_VIEWER"]
    )

    if user_info_response.user.id != storage_resource_creator_id and enhanced_read_perms:
        owner_info = client.users.get_user_details(org_name, None, storage_resource_creator_id)
        return owner_info.user.clientId
    return None


def get_storage_resource_ownership_query_param(client, org_name, storage_resource_creator_id):  # noqa: D103
    owner_id = get_storage_resource_owner_id(client, org_name, storage_resource_creator_id)
    if owner_id:
        return f"?owner-client-id={owner_id}&org-name={org_name}"
    return None


def check_existing_workspace_name(exception, workspace_name, org_name):  # noqa: D103
    if "Workspace with such name already exists." in str(exception):
        suggested_name_match = re.search("You can take `(.*)`", str(exception))
        if suggested_name_match is not None:
            suggested_name = f"'{suggested_name_match.group(1)}'"
        else:
            suggested_name = "no alternative name"
        raise NgcException(
            f"Workspace with name '{workspace_name}' already exists in org '{org_name}'. "
            f"However, {suggested_name} is available."
        )


def parse_job_labels(labels, lock, request_type=None, clear=None):
    """Given a list of labels from the user in a create or update request, return the JobLabels object with its
    subobjects' values appropriately filled.
    """  # noqa: D205
    system_labels = SystemLabels()
    reserved_labels = ReservedLabels()
    user_labels = UserLabels()

    def add_label(obj, label):
        if obj.values:
            if len(obj.values) >= 20:
                raise ArgumentTypeError("A maximum of 20 user, reserved or system labels are allowed.")
            obj.values.append(label)
        else:
            obj.values = [label]

    for label in labels or []:
        if label:
            obj = system_labels if label.startswith("__") else reserved_labels if label.startswith("_") else user_labels
            add_label(obj, label)
    if request_type == "update":
        clear_value = [] if clear else None
        job_labels = JobLabelUpdateRequest(
            {
                "lockLabels": lock,
                "systemLabels": system_labels.values or clear_value,
                "reservedLabels": reserved_labels.values or clear_value,
                "userLabels": user_labels.values or clear_value,
            }
        )
    elif request_type == "remove":
        job_labels = JobLabelDeleteRequest(
            {
                "systemLabels": system_labels.values,
                "reservedLabels": reserved_labels.values,
                "userLabels": user_labels.values,
            }
        )
    else:
        job_labels = JobLabels(
            {
                "isLocked": lock,
                "systemLabels": system_labels,
                "reservedLabels": reserved_labels,
                "userLabels": user_labels,
            }
        )
    return job_labels


def parse_secrets(secrets):
    """Given Secret Spec in the form [["secret","key_name","alias"],["secret2","key_name2","alias2"]]
    returns the union in the form of [secretspec]
    check_secret_pattern guarantees at least one string is in each entry.
    """  # noqa: D205
    secret_spec_dict = {}
    for secret in secrets or []:
        name = secret[0]
        if name in secret_spec_dict:
            secret_spec = secret_spec_dict[name]
        else:
            secret_spec = SecretSpec()
            secret_spec.name = name
            secret_spec.keysSpec = []

        if len(secret) == 1:
            secret_spec.allKeys = True
        else:
            secret_key_spec = SecretKeySpec()
            secret_key_spec.keyName = secret[1]
            secret_spec.allKeys = False

            if len(secret) == 3:
                secret_key_spec.envName = secret[2]
            secret_spec.keysSpec.append(secret_key_spec)
        secret_spec_dict[name] = secret_spec
    return list(secret_spec_dict.values())


def check_batch_run_args(args, ace_name):  # noqa: D103
    if not (args.file or args.clone):
        if not args.name:
            raise InvalidArgumentError("argument: name is required")
        if not args.image:
            raise InvalidArgumentError("argument: image is required")
        if not args.result:
            raise InvalidArgumentError("argument: result is required")
        if not ace_name:
            raise ValidationException("Provide ACE name using ace option, or set ACE name using config.")

    port_list = list(zip(*(args.port or [])))
    if port_list:
        port_names = list(filter(None, port_list[0]))
        port_numbers = port_list[1]

        if len(port_names) > len(set(port_names)):
            raise ValidationException("Duplicate port names are not allowed.")

        if len(port_numbers) > len(set(port_numbers)):
            raise ValidationException("Duplicate port numbers are not allowed.")

    if (
        args.experiment_flow_type
        and not args.experiment_project_name
        or args.experiment_project_name
        and not args.experiment_flow_type
    ):
        raise InvalidArgumentError(
            "argument: if experiment_project_name/experiment_flow_type specified, the other is required"
        )


def check_multinode_job_args(args):  # noqa: D103
    if args.replicas and args.replicas > 1:
        if args.preempt and args.preempt not in ["RUNONCE", "RESUMABLE"]:
            raise InvalidArgumentError(
                "argument: preempt argument can only be `RUNONCE` or `RESUMABLE` for multi-node jobs"
            )
        if not args.total_runtime:
            raise InvalidArgumentError("argument: total_runtime is required for multi-node jobs with replicas > 1")
        if not args.array_type:
            raise InvalidArgumentError("argument: array_type is required for multi-node jobs with replicas > 1")
    else:
        if args.topology_constraint:
            raise InvalidArgumentError("argument: topology_constraint is only valid for multi-node jobs")
        if args.array_type:
            raise InvalidArgumentError("argument: array_type is only valid for multi-node jobs")


def is_dataset_service_enabled(org_api: OrgAPI, org_name: string):  # noqa: D103
    org_detail = org_api.get_org_detail(org_name=org_name)
    # For tests: Don't treat dumb objects as having the dataset service enabled.
    is_enabled = org_detail.isDatasetServiceEnabled
    if is_enabled in {True, False}:
        return is_enabled
    return None


def validate_storage_location(dataset_meta):  # noqa: D103
    if not dataset_meta.storageLocations:
        raise NgcException(f"storageLocation is empty for {dataset_meta.id}")
    if not dataset_meta.storageLocations[0].storageType:
        raise NgcException(f"storageType is empty for {dataset_meta.id}")
