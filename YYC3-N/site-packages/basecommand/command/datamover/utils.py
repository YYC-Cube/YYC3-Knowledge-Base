#!/usr/bin/env python
# Copyright (c) 2025, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import re

import shortuuid

from basecommand.api.datamover import (
    BcpJobType,
    BcpResourceType,
    JobSettingsAzureBlob,
    JobSettingsOciPreauth,
    JobSettingsS3,
)
from basecommand.api.dataset import DatasetNotFoundHandler
from basecommand.api.utils import check_existing_workspace_name
from basecommand.command.workspace import WorkspaceNotFoundHandler
from basecommand.constants import DATA_MOVER_SERVICE_URL_MAPPING
from basecommand.data.api.DatasetCreateRequest import DatasetCreateRequest
from basecommand.data.api.JobCreateRequest import JobCreateRequest
from basecommand.data.api.JobDatasetMountInfo import JobDatasetMountInfo
from basecommand.data.api.JobWorkspaceMountInfo import JobWorkspaceMountInfo
from basecommand.data.api.SecretSpec import SecretSpec
from basecommand.data.api.WorkspaceCreateRequest import WorkspaceCreateRequest
from basecommand.environ import NGC_CLI_DM_IMAGE, NGC_CLI_DM_LOG_LEVEL
from basecommand.printer.datamover import DataMoverPrinter
from ngcbase.api.authentication import Authentication
from ngcbase.constants import CANARY_ENV, PRODUCTION_ENV, STAGING_ENV
from ngcbase.errors import (
    InvalidArgumentError,
    NgcAPIError,
    NgcException,
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
)
from ngcbase.util.utils import get_environ_tag

DEFAULT_AWS_REGION = "us-east-1"

API_ENDPOINT = {
    PRODUCTION_ENV: f"{DATA_MOVER_SERVICE_URL_MAPPING['prod']}/v1",
    CANARY_ENV: f"{DATA_MOVER_SERVICE_URL_MAPPING['canary']}/v1",
    STAGING_ENV: f"{DATA_MOVER_SERVICE_URL_MAPPING['stg']}/v1",
}

SQS_ENDPOINT = {
    PRODUCTION_ENV: f"{DATA_MOVER_SERVICE_URL_MAPPING['prod']}/messages",
    CANARY_ENV: f"{DATA_MOVER_SERVICE_URL_MAPPING['canary']}/messages",
    STAGING_ENV: f"{DATA_MOVER_SERVICE_URL_MAPPING['stg']}/messages",
}

IMAGES = {
    PRODUCTION_ENV: "nvidia/datamover/data-mover:1.0",
    STAGING_ENV: "nvidia/data-movement/data-mover:1.0",
    CANARY_ENV: "nvidia/datamover/data-mover:1.0",
}

STORAGE_TYPE_S3 = "s3"
STORAGE_TYPE_OCIPREAUTH = "ocipreauth"
STORAGE_TYPE_AZUREBLOB = "azureblob"
STORAGE_TYPE = {"s3": STORAGE_TYPE_S3, "url": STORAGE_TYPE_OCIPREAUTH, "azureblob": STORAGE_TYPE_AZUREBLOB}

# TODO: command line?
NGC_API_SECRET_NAME = "ngc"

NGC_API_SECRET_KEY_NAME = "ngc_api_key"
S3_ACCESS_KEY_ID_KEY_NAME = "aws_access_key_id"
S3_SECRET_ACCESS_KEY_KEY_NAME = "aws_secret_access_key"
OCI_PREAUTH_URL_KEY_NAME = "oci_preauth_url"
AZUREBLOB_ACCESS_KEY_NAME = "azureblob_access_key"
NGC_API_KEY_SECRET = "ngc_api_key_secret"
SECRETS_REQUIREMENTS = {
    STORAGE_TYPE_S3: {
        "description": "S3 credentials",
        "required_keys": [S3_ACCESS_KEY_ID_KEY_NAME, S3_SECRET_ACCESS_KEY_KEY_NAME],
    },
    STORAGE_TYPE_OCIPREAUTH: {"description": "OCI URL", "required_keys": [OCI_PREAUTH_URL_KEY_NAME]},
    STORAGE_TYPE_AZUREBLOB: {"description": "Azure Blob access key", "required_keys": [AZUREBLOB_ACCESS_KEY_NAME]},
    NGC_API_KEY_SECRET: {"description": "NGC API key", "required_keys": [NGC_API_SECRET_KEY_NAME]},
}

NGC_JOB_LABEL_DM_GENERIC = "_nvsvc_datamover_job"
NGC_JOB_LABEL_DM_SPECIFIC = "_nvsvc_datamover_{resource_type}_{job_type}"


def _add_job_secrets(job_request, dm_job, args):
    if dm_job.job_type == BcpJobType.IMPORT:
        storage_details = dm_job.origin
    else:
        storage_details = dm_job.destination

    env_prefix = "SRC" if dm_job.job_type == BcpJobType.IMPORT else "DST"
    if isinstance(storage_details, JobSettingsS3):
        storage_keys_spec = [
            {"keyName": S3_ACCESS_KEY_ID_KEY_NAME, "envName": f"{env_prefix}_AWS_ACCESS_KEY_ID"},
            {"keyName": S3_SECRET_ACCESS_KEY_KEY_NAME, "envName": f"{env_prefix}_AWS_SECRET_ACCESS_KEY"},
        ]
    elif isinstance(storage_details, JobSettingsOciPreauth):
        storage_keys_spec = [
            {"keyName": OCI_PREAUTH_URL_KEY_NAME, "envName": "OCI_PRE_URL"},
        ]
    elif isinstance(storage_details, JobSettingsAzureBlob):
        storage_keys_spec = [
            {"keyName": AZUREBLOB_ACCESS_KEY_NAME, "envName": f"{env_prefix}_AZURE_STORAGE_ACCESS_KEY"},
        ]
    else:
        raise RuntimeError(f"Unexpected storage type {storage_details.type}")
    secret_spec = SecretSpec(
        propDict={
            "name": args.secret,
            "keysSpec": storage_keys_spec,
            "allKeys": False,
        }
    )
    if not job_request.userSecretsSpec:
        job_request.userSecretsSpec = [secret_spec]
    else:
        job_request.userSecretsSpec.append(secret_spec)
    api_secret = SecretSpec(
        propDict={
            "name": NGC_API_SECRET_NAME,
            "keysSpec": [
                {"keyName": NGC_API_SECRET_KEY_NAME, "envName": "API_KEY"},
            ],
            "allKeys": False,
        }
    )
    job_request.userSecretsSpec.append(api_secret)


def _add_job_resources(job_request, dm_job):
    if dm_job.job_type == BcpJobType.IMPORT and dm_job.bcp_job.destination_resource_type == BcpResourceType.DATASET:
        return

    # TODO: handle prefixes into a dataset/workspace
    if dm_job.bcp_job.origin_resource_type == BcpResourceType.DATASET:
        mount = JobDatasetMountInfo()
        mount_field = "datasetMounts"
        mount.containerMountPoint = dm_job.origin.path[0]
        mount.id = dm_job.bcp_job.origin_resource_id
    elif dm_job.bcp_job.origin_resource_type == BcpResourceType.WORKSPACE:
        mount = JobWorkspaceMountInfo()
        mount_field = "workspaceMounts"
        mount.containerMountPoint = dm_job.origin.path[0]
        mount.id = dm_job.bcp_job.origin_resource_id
    elif dm_job.bcp_job.destination_resource_type == BcpResourceType.WORKSPACE:
        mount = JobWorkspaceMountInfo()
        mount_field = "workspaceMounts"
        mount.containerMountPoint = dm_job.destination.path[0]
        mount.id = dm_job.bcp_job.destination_resource_id

    if not getattr(job_request, mount_field):
        setattr(job_request, mount_field, [mount])
    else:
        getattr(job_request, mount_field).append(mount)


def create_batch_job_request(ace, job_api_endpoint, args, dm_job):  # noqa: D103
    job_request = JobCreateRequest()
    job_request.aceName = ace
    job_request.dockerImageName = _data_mover_image()
    job_request.command = (
        f"/data-mover --sqs-proxy-url {job_api_endpoint} "
        f"--auth-url https://{Authentication.get_auth_url()}/token "
        f"--period 30000 --job {dm_job.id} --data-movement-api {api_endpoint()}"
    )
    if NGC_CLI_DM_LOG_LEVEL:
        job_request.command += f" --log {NGC_CLI_DM_LOG_LEVEL}"
    job_request.aceInstance = args.instance
    job_request.resultContainerMountPoint = "/result"
    job_request.name = "Data Mover job"

    job_type = dm_job.job_type
    if job_type == BcpJobType.IMPORT:
        resource_type = dm_job.bcp_job.destination_resource_type
        if resource_type == BcpResourceType.DATASET:
            # We usually don't care much about the path to resultsets, but when we're importing a dataset, we do.
            # By default, we mount them at /result, on dataset imports we use whatever is set in the job definition.
            job_request.resultContainerMountPoint = dm_job.destination.path[0]
    else:
        resource_type = dm_job.bcp_job.origin_resource_type

    job_request.reservedLabels = [
        NGC_JOB_LABEL_DM_GENERIC,
        NGC_JOB_LABEL_DM_SPECIFIC.format(resource_type=resource_type, job_type=job_type),
    ]

    _add_job_secrets(job_request, dm_job, args)
    _add_job_resources(job_request, dm_job)
    return job_request


def _data_mover_image():
    return NGC_CLI_DM_IMAGE if NGC_CLI_DM_IMAGE else IMAGES.get(get_environ_tag())


def api_endpoint():  # noqa: D103
    return API_ENDPOINT.get(get_environ_tag())


def sqs_proxy_endpoint():  # noqa: D103
    return SQS_ENDPOINT.get(get_environ_tag())


def check_secret_keys(storage_type, secret_name, secrets_client):  # noqa: D103
    for name, secret_requirements in [
        (secret_name, SECRETS_REQUIREMENTS[storage_type]),
        (NGC_API_SECRET_NAME, SECRETS_REQUIREMENTS[NGC_API_KEY_SECRET]),
    ]:
        try:
            _ = secrets_client.info(secret_name=name, key_names=secret_requirements["required_keys"])
        except ResourceNotFoundException as e:
            raise InvalidArgumentError(
                "secret",
                message=(
                    f"Invalid format of secret '{name}' for {secret_requirements['description']}. "
                    f"Required {'keys' if len(secret_requirements['required_keys']) > 1 else 'key'}: "
                    f"{', '.join(secret_requirements['required_keys'])}."
                ),
            ) from e


def parse_storage_arguments(args, secrets_client):  # noqa: D103
    storage_type = STORAGE_TYPE.get(args.protocol)
    if not storage_type:
        raise RuntimeError("Unexpected storage type")
    storage_details = {
        "type": storage_type,
    }
    if storage_details["type"] == STORAGE_TYPE_S3:
        if args.endpoint is None:
            raise RuntimeError("--endpoint is required with s3 protocol")
        if args.bucket is None:
            raise RuntimeError("--bucket is required with s3 protocol")
        storage_details["endpoint"] = args.endpoint
        storage_details["bucket"] = args.bucket
        prefix = None
        if args.prefix:
            prefix = args.prefix.strip("/")
        storage_details["prefix"] = [prefix] if prefix else ["/"]
        storage_details["region"] = args.region
    elif storage_details["type"] == STORAGE_TYPE_OCIPREAUTH:
        pass
    elif storage_details["type"] == STORAGE_TYPE_AZUREBLOB:
        if args.account_name is None:
            raise RuntimeError("--account-name is required with azureblob protocol")
        if args.container is None:
            raise RuntimeError("--container is required with azureblob protocol")
        storage_details["account_name"] = args.account_name
        storage_details["container"] = args.container
        prefix = None
        if args.prefix:
            prefix = args.prefix.strip("/")
        storage_details["prefix"] = [prefix] if prefix else ["/"]
        storage_details["service_url"] = args.service_url
    else:
        raise RuntimeError("Unexpected storage type")
    check_secret_keys(storage_details["type"], args.secret, secrets_client)
    return storage_details


def job_list_columns():  # noqa: D103
    return {
        "id": "Id",
        "source": "Source",
        "destination": "Destination",
        "status": "Status",
        "start_time": "Start time",
        "end_time": "End time",
    }


def get_dataset_list(client, ace, org, team=None):  # noqa: D103
    dataset_list = client.basecommand.dataset.list(
        org=org,
        team=team,
        ace=ace,
        owned=False,
        list_all=True,
    )
    for page in dataset_list or []:
        for dataset in page or []:
            yield dataset.id


def get_workspace_list(client, ace, org, team=None):  # noqa: D103
    workspace_list = client.basecommand.workspace.list(
        org=org,
        team=team,
        ace=ace,
        owned=False,
        list_all=True,
    )
    for page in workspace_list or []:
        for wks in page or []:
            yield wks.id


def read_manifest(manifest):  # noqa: D103
    lines = []
    with open(manifest, "r", encoding="utf-8") as mf:
        lines = mf.readlines()
    ls = []
    for line in lines:
        stripped_line = line.strip()
        if stripped_line != "":
            ls.append(stripped_line)
    return ls


def parse_resourceid_manifest(manifest):  # noqa: D103
    ds_list = read_manifest(manifest)
    return ds_list


def parse_s3url_manifest(manifest):  # noqa: D103
    url_list = read_manifest(manifest)
    buckets = []
    prefixes = []
    for s3_url in url_list:
        if not s3_url.startswith("s3://"):
            raise ValueError("One or more entries in the manifest don't match the format for S3 protocol")
        s3 = s3_url.removeprefix("s3://")
        parts = s3.split(sep="/", maxsplit=1)
        buckets.append(parts[0])
        prefixes.append(parts[1] if len(parts) == 2 and parts[1] != "" else None)
    return buckets, prefixes


def parse_ociprefixes_manifest(manifest):  # noqa: D103
    manifest_list = read_manifest(manifest)
    prefix_list = []
    for prefix in manifest_list:
        if not prefix.startswith("oci://"):
            raise ValueError("One or more entries in the manifest don't match the format for URL protocol")
        prefix_list.append(prefix.removeprefix("oci://"))
    return prefix_list


def parse_azureblobprefixes_manifest(manifest):  # noqa: D103
    url_list = read_manifest(manifest)
    containers = []
    prefixes = []
    for azb_url in url_list:
        if not azb_url.startswith("azb://"):
            raise ValueError("One or more entries in the manifest don't match the format for Azure Blob protocol")
        azb = azb_url.removeprefix("azb://")
        parts = azb.split(sep="/", maxsplit=1)
        containers.append(parts[0])
        prefixes.append(parts[1] if len(parts) == 2 and parts[1] != "" else None)
    return containers, prefixes


def generate_name_for_import_dataset(dm_import_job, original_dataset=None, name=None):  # noqa: D103
    # Default name if none is provided
    generated_name = f"Data Mover job {dm_import_job.id}"
    rand_id = shortuuid.uuid()[:6]
    alternative_name = generated_name + f" - {rand_id}"

    # Name if we're getting it from another dataset
    if original_dataset:
        if original_dataset.name is not None:
            generated_name = original_dataset.name + f" - DM {dm_import_job.id}"
            alternative_name = generated_name + f" - {rand_id}"

    # Name if user is providing a name
    if name is not None:
        generated_name = name
        alternative_name = generated_name + f" - DM {dm_import_job.id} - {rand_id}"

    return generated_name, alternative_name


def finish_dataset_copy(  # noqa: D103
    bcp_client,
    dm_client,
    org_name,
    team_name,
    ace_name,
    dm_job,
    original_dataset_id=None,
    name=None,
    desc=None,
    bcp_copy=None,
    preserve_ownership=True,
):
    dataset_create_request = DatasetCreateRequest()
    dataset_create_request.aceName = ace_name
    dataset_create_request.resultsetIdForBaseDataSource = dm_job.bcp_job.tmp_resource_id
    dataset_create_request.nfsRoot = "/root"
    dataset_create_request.nfsShare = "/share"
    # Get metadata from original dataset (if passed)
    original_dataset = None

    user_resp = bcp_client.users.user_who(org_name)
    user_id = user_resp.user.id

    if original_dataset_id:
        with DatasetNotFoundHandler(original_dataset_id):
            original_dataset = bcp_client.basecommand.dataset.get_dataset_meta(
                org_name=org_name, dataset_id=original_dataset_id, team_name=team_name
            )
        dataset_create_request.description = original_dataset.description

        if preserve_ownership and original_dataset.creatorUserId and original_dataset.creatorUserId != user_id:
            try:
                _ = bcp_client.users.info(user_id=original_dataset.creatorUserId, org=org_name, team=team_name)
                dataset_create_request.onBehalfOf = original_dataset.creatorUserId
            except ResourceNotFoundException:
                # If we fail at getting the original owner's info, we just won't preserve ownership
                pass

    # Name and description passed explicitly in command line overwrite metadata from original dataset
    if desc is not None:
        dataset_create_request.description = desc

    dataset_create_request.name, alternative_name = generate_name_for_import_dataset(dm_job, original_dataset, name)
    printer = DataMoverPrinter(bcp_client.config)
    try:
        dataset = bcp_client.basecommand.dataset.create_dataset(
            org_name=org_name, dataset_create_request=dataset_create_request
        )
    except ResourceAlreadyExistsException:
        printer.print_error(
            f"Dataset '{dataset_create_request.name}' already exists in organization, trying different name"
        )
        dataset_create_request.name = alternative_name
        dataset = bcp_client.basecommand.dataset.create_dataset(
            org_name=org_name, dataset_create_request=dataset_create_request
        )
    msg = f"Dataset with ID {dataset.id} created in ACE {ace_name} from resultset {dm_job.bcp_job.tmp_resource_id}"
    if bcp_copy:
        msg += f" (Data Mover copy {bcp_copy.id})"
    printer.print_ok(msg)

    dm_job.bcp_job.destination_resource_id = dataset.id
    dm_client.update_job(job=dm_job, org_name=org_name, team_name=team_name)

    if original_dataset_id and original_dataset.shared:
        if original_dataset.sharedWithOrg is not None:
            bcp_client.basecommand.dataset.share_dataset(
                org_name=original_dataset.sharedWithOrg.name, dataset_id=dataset.id
            )
        if original_dataset.sharedWithTeams is not None:
            for team in original_dataset.sharedWithTeams:
                bcp_client.basecommand.dataset.share_dataset(
                    org_name=org_name, dataset_id=dataset.id, target_team_name=team.name
                )


def create_workspace(  # noqa: D103
    bcp_client, org_name, ace_name, original_workspace_id=None, name=None, desc=None, preserve_ownership=True
):
    workspace_create_request = WorkspaceCreateRequest()
    workspace_create_request.aceName = ace_name

    user_resp = bcp_client.users.user_who(org_name)
    user_client_id = user_resp.user.clientId

    # Before submitting DM job, create the workspace
    original_workspace = None
    if original_workspace_id:
        with WorkspaceNotFoundHandler(original_workspace_id):
            original_workspace = bcp_client.basecommand.workspace.get_workspace(org_name, original_workspace_id)

        if original_workspace.name:
            rand_id = shortuuid.uuid()[:6]
            ws_name = original_workspace.name + f"-DM-{rand_id}"
            # workspace name cannot be exactly 22 characters
            if len(ws_name) == 22:
                ws_name = ws_name + "1"
            workspace_create_request.name = ws_name

        if original_workspace.description:
            workspace_create_request.description = original_workspace.description

        if (
            preserve_ownership
            and original_workspace.creatorUserId
            and original_workspace.creatorUserId != user_client_id
        ):
            workspace_create_request.onBehalfOf = original_workspace.creatorUserId

    if name:
        workspace_create_request.name = name

    if desc:
        workspace_create_request.description = desc

    try:
        workspace_create_request.isValid()
        workspace = bcp_client.basecommand.workspace.create_workspace(
            org_name=org_name, workspace_create_request=workspace_create_request
        )
    except ResourceNotFoundException:
        # If we get an error about the original user not existing, we will just not try to preserver ownership
        if preserve_ownership:
            return create_workspace(
                bcp_client, org_name, ace_name, original_workspace_id, name, desc, preserve_ownership=False
            )
        raise
    except NgcAPIError as nae:
        if nae.response.status_code == 400 and "User's token doesn't have group info " in str(nae):
            # If we get an error about the original user not existing, we will just not try to preserver ownership
            if preserve_ownership:
                return create_workspace(
                    bcp_client, org_name, ace_name, original_workspace_id, name, desc, preserve_ownership=False
                )
            raise
        # Name already taken error
        check_existing_workspace_name(nae, workspace_create_request.name, org_name)
        raise
    except ValueError as ve:
        # 22-character limit error
        if re.search(r".*doesnt match requirement: pattern:", str(ve)) and name and len(name) == 22:
            raise NgcException(
                "Workspace name cannot be exactly 22 characters. Enter a shorter or longer name."
            ) from None
        # Everything else gets passed down to the user
        raise

    if original_workspace and original_workspace.shared:
        for item in original_workspace.sharedWith:
            s = item.split("/", 1)
            team = None
            if len(s) > 1:
                team = s[1]
            bcp_client.basecommand.workspace.share_workspace(s[0], workspace.id, team)

    return workspace


def filter_paginated_jobs(jobs_pages, bcp_job_type, bcp_resource_type):  # noqa: D103
    new_pages = []
    for page in jobs_pages:
        new_page = []
        for job in page:
            if bcp_job_type == BcpJobType.IMPORT:
                if bcp_resource_type == BcpResourceType.WORKSPACE:
                    if job.bcp_job.destination_resource_type == BcpResourceType.WORKSPACE:
                        new_page.append(job)
                elif bcp_resource_type == BcpResourceType.DATASET:
                    if (
                        job.bcp_job.destination_resource_type == BcpResourceType.DATASET
                        or job.bcp_job.tmp_resource_type == BcpResourceType.RESULTSET
                    ):
                        new_page.append(job)
                else:
                    raise ValueError(f"`{bcp_resource_type}` is not a valid BcpResourceType to be imported")
            elif bcp_job_type == BcpJobType.EXPORT:
                if bcp_resource_type == BcpResourceType.WORKSPACE:
                    if job.bcp_job.origin_resource_type == BcpResourceType.WORKSPACE:
                        new_page.append(job)
                elif bcp_resource_type == BcpResourceType.DATASET:
                    if job.bcp_job.origin_resource_type == BcpResourceType.DATASET:
                        new_page.append(job)
                else:
                    raise ValueError(f"`{bcp_resource_type}` is not a valid BcpResourceType to be exported")
            else:
                raise ValueError(f"`{bcp_job_type}` is not a valid BcpJobType to filter")
        new_pages.append(new_page)
    return new_pages
