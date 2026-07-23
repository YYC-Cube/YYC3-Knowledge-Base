#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from dataclasses import asdict
from itertools import chain
import json
import logging
import os
from typing import List, Optional, Union
from urllib.parse import urlparse

import psutil
import requests.exceptions as rqes  # pylint: disable=requests-import

from basecommand.api.utils import is_dataset_service_enabled, validate_storage_location
from basecommand.constants import (
    DATASET_SERVICE_API_VERSION,
    STORAGE_TYPE_FS,
    STORAGE_TYPE_OBJECT,
)
from basecommand.data.api.DatasetCreateRequest import DatasetCreateRequest
from basecommand.data.api.DatasetFile import DatasetFile
from basecommand.data.api.DatasetListResponse import DatasetListResponse
from basecommand.data.api.DatasetResponse import DatasetResponse
from basecommand.data.api.DatasetStatusEnum import DatasetStatusEnum
from basecommand.data.api.DatasetUpdateRequest import DatasetUpdateRequest
from basecommand.model.dataset import (
    DatasetCommitRequest,
    DatasetCommitResponse,
    GetStorageAccessRequest,
    GetStorageAccessResponse,
)
from basecommand.printer.dataset import DatasetPrinter
from basecommand.transfer.upload_manager import UploadManager
from ngcbase.api.pagination import (
    pagination_helper,
    pagination_helper_use_page_reference,
)
from ngcbase.constants import API_VERSION, BUILD_TYPE, DEFAULT_UPLOAD_THREADS
from ngcbase.errors import (
    AccessDeniedException,
    InvalidArgumentError,
    NgcAPIError,
    NgcException,
    ResourceNotFoundException,
)
from ngcbase.transfer.async_download import AsyncDownload
from ngcbase.transfer.download import download_S3_dataset_or_result
from ngcbase.transfer.utils import get_download_files
from ngcbase.util.file_utils import human_size, tree_size_and_count
from ngcbase.util.io_utils import mask_string
from ngcbase.util.utils import (
    confirm_remove,
    extra_args,
    has_org_admin_user_role,
    has_team_role,
    partition,
    url_encode,
)

PAGE_SIZE = 1000

logger = logging.getLogger(__name__)


class DatasetAPI:  # noqa: D101
    def __init__(self, api_client, dataset_service_connection=None):
        self.config = api_client.config
        self.connection = api_client.connection
        self.dataset_service_connection = dataset_service_connection
        self.search_api = api_client.basecommand.search
        self.org_api = api_client.organization.organization
        self.client = api_client
        self.printer = DatasetPrinter(api_client.config)
        self.printer.config = self.config

    @staticmethod
    def _construct_url(org_name, dataset_id=None, dataset_service_enabled=False):
        """Constructs ace url depending on given parameters."""  # noqa: D401
        api_version = DATASET_SERVICE_API_VERSION if dataset_service_enabled else API_VERSION

        org_path = "{api_version}/org/{org_name}".format(api_version=api_version, org_name=org_name)
        if dataset_id or dataset_id == 0:
            url_path = "{org_path}/datasets/{dataset_id}".format(org_path=org_path, dataset_id=dataset_id)
        else:
            url_path = "{org_path}/datasets".format(org_path=org_path)
        return url_path

    @staticmethod
    def _construct_commit_url(org_name, dataset_id):
        return "{api_version}/org/{org_name}/datasets/{dataset_id}/commit".format(
            api_version=DATASET_SERVICE_API_VERSION, org_name=org_name, dataset_id=dataset_id
        )

    @staticmethod
    def _construct_storage_access_url(org_name, dataset_id):
        return "{api_version}/org/{org_name}/datasets/{dataset_id}/access".format(
            api_version=DATASET_SERVICE_API_VERSION, org_name=org_name, dataset_id=dataset_id
        )

    # Connection.make_api_request() will pass a string instead of deserializing into a response type.
    @staticmethod
    def _get_storage_access_response_log_mask(response_text: str) -> str:
        response = json.loads(response_text)

        credentials = response.get("Credentials")
        if credentials:
            s3_credentials = credentials.get("S3Credentials")
            if s3_credentials:
                access_key = s3_credentials.get("access_key")
                if access_key:
                    s3_credentials["access_key"] = mask_string(access_key)

                secret_key = s3_credentials.get("secret_key")
                if secret_key:
                    s3_credentials["secret_key"] = mask_string(secret_key)
        return response

    @staticmethod
    def _construct_storage_quota_url(org_name):
        return "{api_version}/org/{org_name}/users/quota".format(
            api_version=DATASET_SERVICE_API_VERSION, org_name=org_name
        )

    def _construct_shares_url(self, org_name, dataset_id, target_team_name=None):
        dataset_path = self._construct_url(org_name, dataset_id)
        shares_path = "{dataset_path}/shares".format(dataset_path=dataset_path)
        if target_team_name:
            target_path = "{shares_path}/team/{target_team}".format(
                shares_path=shares_path, target_team=target_team_name
            )
        else:
            target_path = "{shares_path}/org".format(shares_path=shares_path)
        return target_path

    @staticmethod
    def _construct_list_dataset_query(
        org_name, team_name=None, ace_name=None, ace_id=None, exclude_shared=False, page_size=PAGE_SIZE
    ):
        """Generates a url for the `list_dataset` method."""  # noqa: D401
        if not ace_name:
            ace_name = ace_id

        base_url = "{api_version}/org/{org_name}".format(api_version=API_VERSION, org_name=org_name)
        if team_name:
            team_name_enc = url_encode(team_name)
            base_url = "{base_method}/team/{team_name}/datasets".format(base_method=base_url, team_name=team_name_enc)
        else:
            base_url = "{base_method}/datasets".format(base_method=base_url)

        query = "{url}?page-size={page_size}".format(url=base_url, page_size=page_size)

        if ace_name:
            ace_name_enc = url_encode(ace_name)
            query += "&ace-name={ace_name}".format(ace_name=ace_name_enc)
        if exclude_shared:
            query += "&exclude-shared=true"
        return query

    @staticmethod
    def _handle_upload_share_arg(share, team):
        """Handle setting default share team when --share passed without a
        team for dataset upload.
        """  # noqa: D205
        # args.share=[None] when --share is passed by itself (no team specified)
        if not all(share):
            share_list = [team for team in share if team]
            if not team:
                raise InvalidArgumentError(
                    None,
                    "No set team found in config. --share requires a team name to be "
                    "specified or a team to be set in your config.",
                )
            share_list.append(team)
            share = share_list
        return share

    def _update_dataset_state(self, share, name, org_name, dataset_id):
        logger.debug("Marking upload state as 'UPLOAD_COMPLETE'")
        self.set_dataset_state(org_name, dataset_id, state="UPLOAD_COMPLETE")

        # TODO: Update api.dataset with new method (share_dataset_with_teams) - this should use
        # api.connection.make_multiple_request to do it concurrently. Also rename.
        # SEE: NGC-17587.
        if share:
            for team in share or []:
                self.printer.print_ok(f"Sharing dataset '{name}' ({dataset_id}) with team '{team}'.")
                try:
                    self.share_dataset(org_name, dataset_id, target_team_name=team)
                except NgcAPIError as err:
                    self.printer.print_error(
                        f"Failed to share dataset '{name}' with team '{team}'.\nError was: {str(err)}"
                    )
                    continue
                self.printer.print_ok(f"Dataset '{name}' ({dataset_id}) successfully shared with team '{team}'.")

    @staticmethod
    def get_dataset_filenames_url(url):  # noqa: D102
        return url.replace("downloads/buckets", "buckets")

    @staticmethod
    def get_dataset_part_url(url):  # noqa: D102
        return url.replace("buckets", "buckets/part")

    def get_dataset_download_url(self, org_name, dataset_id):  # noqa: D102
        return f"{self.connection.base_url or self.config.base_url}/{self._construct_url(org_name, dataset_id)}/file/"

    def create_dataset(self, org_name, dataset_create_request):  # noqa: D102
        response = self.connection.make_api_request(
            "POST",
            self._construct_url(org_name),
            payload=dataset_create_request.toJSON(False),
            auth_org=org_name,
            operation_name="create dataset",
        )
        return DatasetResponse(response).dataset

    def get_dataset_meta(self, org_name, dataset_id, team_name=None):  # noqa: D102
        dataset_iterator = self.get_dataset(org_name=org_name, team_name=team_name, dataset_id=dataset_id, page_size=1)
        try:
            return next(dataset_iterator)
        except StopIteration:
            return None

    def get_dataset_metadata(self, org_name, dataset_id, team_name=None):  # noqa: D102
        base_url = self._construct_url(org_name=org_name, dataset_id=dataset_id)
        _, resp_headers = self.connection.make_api_request(
            "GET",
            f"{base_url}/metadata",
            operation_name="get dataset metadata",
            auth_org=org_name,
            auth_team=team_name,
            response_headers=True,
            allow_redirects=False,
            json_response=False,
        )
        return resp_headers

    # TODO: Remove ace_id once backwards compatibility support is removed
    def list_dataset(
        self, org_name, team_name=None, ace_name=None, ace_id=None, exclude_shared=False, page_size=PAGE_SIZE
    ):
        """List Datasets the user can access. For this operation file names will not be loaded."""
        query = self._construct_list_dataset_query(org_name, team_name, ace_name, ace_id, exclude_shared, page_size)
        list_of_datasets = []
        list_of_response = pagination_helper(
            self.connection, query, org_name=org_name, team_name=team_name, operation_name="list dataset paginated"
        )
        for response in list_of_response:
            list_of_datasets.extend(DatasetListResponse(response).datasets)
        return list_of_datasets

    def get_user_storage(self, org_name=None):
        """Get user storage quota for a given organization."""
        org_name = org_name or self.config.org_name
        dataset_service_enabled = is_dataset_service_enabled(org_api=self.org_api, org_name=org_name)

        if not dataset_service_enabled:
            return None

        extra_auth_headers = {"nv-ngc-org": org_name}
        base_url = self._construct_storage_quota_url(org_name)
        response = self.dataset_service_connection.make_api_request(
            "GET",
            base_url,
            operation_name="get user storage quota",
            auth_org=org_name,
            kas_direct=True,
            extra_auth_headers=extra_auth_headers,
        )
        return response

    def get_dataset(
        self,
        dataset_id,
        org_name=None,
        page_size=PAGE_SIZE,
        enable_paging=True,
        team_name=None,
    ):
        """Get dataset details for given dataset ID."""
        # Validate the input values before handing it off to the generator. This ensures that the error will be raised
        # by the initial call, rather than the first `next()` call.
        if dataset_id is None:
            raise ValueError("Invalid dataset_id: None")

        return self._get_dataset(
            dataset_id,
            org_name=org_name,
            page_size=page_size,
            enable_paging=enable_paging,
            team_name=team_name,
        )

    def _get_dataset(
        self,
        dataset_id,
        org_name=None,
        page_size=PAGE_SIZE,
        enable_paging=True,
        team_name=None,
    ):
        dataset_service_enabled = is_dataset_service_enabled(org_api=self.org_api, org_name=org_name)

        base_url = self._construct_url(org_name, dataset_id=dataset_id, dataset_service_enabled=dataset_service_enabled)
        connection = self.dataset_service_connection if dataset_service_enabled else self.connection
        extra_auth_headers = {"nv-ngc-org": org_name} if dataset_service_enabled else None

        if enable_paging:
            query = "{url}?page-size={page_size}".format(url=base_url, page_size=page_size)
            if dataset_service_enabled:
                for response in pagination_helper(
                    connection,
                    query,
                    org_name=org_name,
                    team_name=team_name,
                    operation_name="get dataset paginated",
                    kas_direct=dataset_service_enabled,
                    extra_auth_headers=extra_auth_headers,
                ):
                    yield DatasetResponse(response).dataset
            else:
                dataset_files = None
                dataset_headers = self.get_dataset_metadata(org_name, dataset_id, team_name=team_name)
                dataset_files_url = dataset_headers.get("Location", None) if dataset_headers else None
                if dataset_files_url:
                    async_downloader = AsyncDownload(self.client, dataset_id, org_name=org_name, team_name=team_name)
                    dataset_files = async_downloader.download_file_content(".", dataset_files_url)
                if dataset_files:
                    response = connection.make_api_request(
                        "GET",
                        base_url,
                        operation_name="get dataset",
                        auth_org=org_name,
                        auth_team=team_name,
                        kas_direct=dataset_service_enabled,
                        extra_auth_headers=extra_auth_headers,
                    )
                    dataset = DatasetResponse(response).dataset
                    dataset.files = [DatasetFile({"path": dataset_file}) for dataset_file in dataset_files]
                    yield dataset
                else:
                    for response in pagination_helper_use_page_reference(
                        connection,
                        query,
                        org_name=org_name,
                        team_name=team_name,
                        operation_name="get dataset paginated",
                        kas_direct=dataset_service_enabled,
                        extra_auth_headers=extra_auth_headers,
                    ):
                        yield DatasetResponse(response).dataset
        else:
            response = connection.make_api_request(
                "GET",
                base_url,
                operation_name="get dataset",
                auth_org=org_name,
                auth_team=team_name,
                kas_direct=dataset_service_enabled,
                extra_auth_headers=extra_auth_headers,
            )
            yield DatasetResponse(response).dataset

    def commit_to_dataset(self, dataset_id, org_name=None, commit_entries=None) -> DatasetCommitResponse:  # noqa: D102
        org_name = org_name or self.config.org_name

        url = self._construct_commit_url(org_name, dataset_id=dataset_id)

        extra_auth_headers = {"nv-ngc-org": org_name}

        dataset_commit_request = DatasetCommitRequest(dataset_id=dataset_id, commit_entries=commit_entries)

        payload = json.dumps(asdict(dataset_commit_request))

        return self.dataset_service_connection.make_api_request(
            "POST",
            url,
            operation_name="commit to dataset",
            auth_org=org_name,
            payload=payload,
            kas_direct=True,
            extra_auth_headers=extra_auth_headers,
        )

    def get_storage_access_credentials(  # noqa: D102
        self, dataset_id, org_name=None, access_type=None
    ) -> GetStorageAccessResponse:
        org_name = org_name or self.config.org_name

        url = self._construct_storage_access_url(org_name, dataset_id=dataset_id)

        get_storage_access_request = GetStorageAccessRequest(dataset_id=dataset_id, access_type=access_type)

        extra_auth_headers = {"nv-ngc-org": org_name}

        payload = json.dumps(asdict(get_storage_access_request))

        return self.dataset_service_connection.make_api_request(
            "POST",
            url,
            operation_name="get storage access credentials",
            auth_org=org_name,
            payload=payload,
            kas_direct=True,
            extra_auth_headers=extra_auth_headers,
            response_log_masking_fn=self._get_storage_access_response_log_mask,
        )

    def share_dataset(self, org_name, dataset_id, target_team_name=None):
        """Shares dataset with the org/team. Write accesss to the dataset required."""
        url_path = self._construct_shares_url(org_name, dataset_id, target_team_name)
        response = self.connection.make_api_request(
            "PUT", url_path, auth_org=org_name, auth_team=target_team_name, operation_name="share dataset"
        )
        return response

    def revoke_share_dataset(self, org_name, dataset_id, target_team_name=None):
        """Stops sharing dataset with the org/team. Write access to the dataset required."""  # noqa: D401
        url_path = self._construct_shares_url(org_name, dataset_id, target_team_name)
        response = self.connection.make_api_request(
            "DELETE", url_path, auth_org=org_name, auth_team=target_team_name, operation_name="revoke share dataset"
        )
        return response

    def set_dataset_state(self, org_name, dataset_id, state="UPLOAD_COMPLETE"):
        """Mark dataset as complete."""
        if state not in DatasetStatusEnum:
            raise ValueError("Dataset state not supported.")
        url = "{api_version}/org/{org_name}/datasets/{id}/status?upload-status={state}".format(
            api_version=API_VERSION, org_name=org_name, id=dataset_id, state=state
        )
        response = self.connection.make_api_request("PATCH", url, auth_org=org_name, operation_name="set dataset state")
        return response

    def set_dataset_description(self, org_name, dataset_id, description):
        """Set dataset description."""
        dataset_update_request = DatasetUpdateRequest()
        dataset_update_request.description = description
        url = self._construct_url(org_name, dataset_id=dataset_id)
        job = self.connection.make_api_request(
            "PATCH",
            "{url}".format(url=url),
            payload=dataset_update_request.toJSON(False),
            auth_org=org_name,
            operation_name="set dataset description",
        )
        return DatasetResponse(job)

    def remove_dataset(self, org_name, dataset_id):
        """Removes dataset given dataset ID."""  # noqa: D401
        response = self.connection.make_api_request(
            "DELETE",
            self._construct_url(org_name, dataset_id=dataset_id),
            auth_org=org_name,
            operation_name="remove dataset",
        )
        return response

    @extra_args
    def list(
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        owned: Optional[bool] = None,
        list_all: Optional[bool] = None,
        name: Optional[str] = None,
        status: Optional[List[str]] = None,
    ):
        """List Datasets the user can access. For this operation file names will not be loaded."""
        self.config.validate_configuration(csv_allowed=True)
        org = org or self.config.org_name
        team = team or self.config.team_name
        ace = ace or self.config.ace_name

        user_resp = self.client.users.user_who(org)
        user_client_id = user_resp.user.clientId
        list_team = None

        # TODO: ADMIN is deprecated.
        can_list_all = has_org_admin_user_role(
            user_resp, org, ["ADMIN", "BASE_COMMAND_ADMIN", "BASE_COMMAND_VIEWER"], ["USER", "BASE_COMMAND_USER"]
        )
        if can_list_all is None and team:
            list_team = team
            can_list_all = has_team_role(user_resp, team, ["ADMIN", "BASE_COMMAND_ADMIN", "BASE_COMMAND_VIEWER"])

        ds_search_results = self.search_api.search_dataset(
            org=org,
            team=team,
            ace=ace,
            user_client_id=user_client_id,
            owned=owned,
            list_all=can_list_all and list_all,
            name=name,
            status=status,
            list_team=list_team,
        )
        return ds_search_results

    @extra_args
    def info(
        self,
        dataset_id,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
    ):
        """Get dataset details for given dataset ID."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        _ = ace or self.config.ace_name

        with DatasetNotFoundHandler(dataset_id):
            # get dataset generator
            dataset_generator = self.get_dataset(
                org_name=org_name,
                team_name=team_name,
                dataset_id=dataset_id,
            )
            return dataset_generator

    @extra_args
    def share(self, dataset_id: int, org: Optional[str] = None, team: Optional[str] = None, ace: Optional[str] = None):
        """Shares dataset with the org/team. Write accesss to the dataset required."""
        self.config.validate_configuration()
        org = org or self.config.org_name
        team = team or self.config.team_name
        ace = ace or self.config.ace_name

        with DatasetNotFoundHandler(dataset_id):
            self.share_dataset(org_name=org, dataset_id=dataset_id, target_team_name=team)

    @extra_args
    def revoke_share(
        self, dataset_id: int, org: Optional[str] = None, team: Optional[str] = None, ace: Optional[str] = None
    ):
        """Stops sharing dataset with the org/team. Write access to the dataset required."""  # noqa: D401
        self.config.validate_configuration()
        org = org or self.config.org_name
        team = team or self.config.team_name
        ace = ace or self.config.ace_name

        with DatasetNotFoundHandler(dataset_id):
            dataset_meta = self.get_dataset_meta(org_name=org, dataset_id=dataset_id, team_name=team)

        # Check that the dataset is being shared with the target team (higher priority) or org (lower priority)
        if team:
            if dataset_meta.sharedWithTeams is None or team not in [team.name for team in dataset_meta.sharedWithTeams]:
                raise NgcException("Dataset '{}' is not shared with team '{}'.".format(dataset_id, team))
        elif org and (dataset_meta.sharedWithOrg is None or org != dataset_meta.sharedWithOrg.name):
            raise NgcException("Dataset '{}' is not shared with org '{}'.".format(dataset_id, org))

        try:
            self.revoke_share_dataset(org_name=org, dataset_id=dataset_id, target_team_name=team)
        except AccessDeniedException:
            raise NgcException("User does not have permission to revoke the share.") from None

    @extra_args
    def upload(
        self,
        name: Union[int, str],
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        desc: Optional[str] = None,
        source: Optional[str] = ".",
        threads: Optional[int] = DEFAULT_UPLOAD_THREADS,
        default_yes: Optional[bool] = True,
        omit_links: Optional[bool] = None,
        dry_run: Optional[bool] = None,
        share: Optional[List[str]] = None,
    ):
        """Interface for uploading datasets via gRPC.

        Upload is performed according to the following algorithm:

        1. Check available storage on ACE.
        2. Attempt to create the dataset.

           - If the dataset exists (409 response), get a list of all datasets and find the ID
             by matching the name.
             Prompt the user to continue adding to the dataset.
             If yes, use the upload cache to continue the upload and skip the previously uploaded files.

           - The dataset is created and we have the ID.
        3. Upload the dataset.

        Returns:
            A dict in the form of ``{"id": <integer>, "datasetUuid": <string>}``, that identifies the uploaded dataset.
        """
        self.config.validate_configuration()
        org = org or self.config.org_name
        team = team or self.config.team_name
        ace = ace or self.config.ace_name

        dataset_service_enabled = is_dataset_service_enabled(org_api=self.org_api, org_name=org)

        if share:
            share = self._handle_upload_share_arg(share=share, team=team)

        # TODO: Use pathlib
        absolute_path = os.path.abspath(source)
        if not os.path.exists(absolute_path):
            raise NgcException("The path: '{0}' does not exist.".format(source))
        if ace is None and not dataset_service_enabled:
            raise NgcException("Provide ACE using ace argument or set ACE name using `ngc config set`.")
        try:
            manager = UploadManager(threads=threads, api_client=self.client)
            dataset_info = manager.upload_dataset(
                dataset_name=name,
                absolute_path=absolute_path,
                description=desc,
                default_yes=default_yes,
                omit_links=omit_links,
                dry_run=dry_run,
                org=org,
                ace=ace,
                is_dataset_service_enabled=dataset_service_enabled,
            )
        except Exception as e:
            logger.debug(str(e), exc_info=1)
            raise
        dataset_id = dataset_info.get("id", dataset_info.get("datasetUuid"))
        if dataset_id:
            self._update_dataset_state(share=share, name=name, org_name=org, dataset_id=dataset_id)
        return dataset_info

    @extra_args
    def download(
        self,
        dataset_id: Union[int, str],
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        dest: Optional[str] = ".",
        files: Optional[List[str]] = None,
        resume: Optional[str] = None,
        dirs: Optional[List[str]] = None,
        do_zip: Optional[bool] = None,
        exclude: Optional[List[str]] = None,
        dry_run: Optional[bool] = None,
    ):
        """Downloads a Dataset."""  # noqa: D401
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        _ = ace or self.config.ace_name

        absolute_path = os.path.abspath(dest)
        disk_info = psutil.disk_usage(absolute_path)
        if not os.path.isdir(absolute_path):
            raise NgcException("The path: '{0}' does not exist.".format(dest))
        # start the zip download
        # get the download URL from CAS
        with DatasetNotFoundHandler(dataset_id):
            dataset_meta = self.get_dataset_meta(org_name, dataset_id, team_name=team_name)

        if not dataset_meta:
            raise NgcException("There is no information available for given dataset: '{0}'".format(dataset_id))

        dataset_service_enabled = is_dataset_service_enabled(org_api=self.org_api, org_name=org_name)

        storage_type = STORAGE_TYPE_FS
        if dataset_service_enabled:
            validate_storage_location(dataset_meta)
            storage_type = dataset_meta.storageLocations[0].storageType.lower()

        if storage_type == STORAGE_TYPE_OBJECT:
            dataset_files = chain(
                *(
                    dataset.files
                    for dataset in self.get_dataset(
                        org_name=self.config.org_name, dataset_id=dataset_id, team_name=self.config.team_name
                    )
                )
            )
            download_S3_dataset_or_result(
                "datasets",  # bucket
                storage_id=dataset_id,  # prefix
                dry_run=dry_run,
                include_patterns=None,
                exclude_patterns=exclude,
                threads=1,
                destination=dest,
                org_name=org_name,
                credential_provider=self.client.basecommand.dataset,
                dataset_files=dataset_files,
                do_zip=do_zip,
                is_dataset_service_enabled=dataset_service_enabled,
                config=self.config,
            )
        else:
            if dataset_service_enabled and not dataset_meta.aceStorageServiceUrl:
                raise NgcException(f"aceStorageServiceUrl cannot be empty for dataset {dataset_id}")

            file_download_url = dataset_meta.fileDownloadUrl
            download_id = dataset_meta.storageLocations[0].id if dataset_service_enabled else dataset_id
            download_url = self.get_dataset_download_url(org_name, download_id)

            async_downloader = AsyncDownload(self.client, download_id, org_name=org_name, team_name=team_name)
            download_size = dataset_meta.size
            part_url = self.get_dataset_part_url(file_download_url)
            download_files = None
            dataset_headers = self.get_dataset_metadata(org_name, dataset_id, team_name=team_name)
            dataset_files_url = dataset_headers.get("Location", None) if dataset_headers else None
            owner_client_id_url_query = f"?{urlparse(dataset_files_url).query}" if dataset_files_url else None

            if resume:
                try:
                    if os.path.exists(resume):
                        dest = os.path.dirname(resume)
                        downloaded_size, _ = tree_size_and_count(os.path.abspath(dest), True)
                        download_size -= downloaded_size
                        with open(resume, "r", encoding="utf-8") as f:
                            download_files = json.loads(f.read())
                    else:
                        raise NgcException(f"File {resume} doesn't exist.") from None
                except (OSError, FileNotFoundError, ValueError, json.decoder.JSONDecodeError):
                    raise NgcException(f"Unable to read file {resume}") from None
            else:
                self.printer.print_download_message("Getting files to download.")
                dataset_files = chain(
                    *(
                        dataset.files
                        for dataset in self.get_dataset(
                            org_name=self.config.org_name, dataset_id=dataset_id, team_name=self.config.team_name
                        )
                    )
                )
                _files, _dirs = partition(lambda f: f.isDir, dataset_files)
                if files or dirs or exclude:
                    if not dataset_files:
                        raise NgcException("There are no files available to download yet.")

                    download_files, _ = get_download_files(
                        {f.path: f.fileSize or 0 for f in _files}, [d.path for d in _dirs], files, dirs, exclude
                    )
                else:
                    download_files = [f.path for f in _files]

            if dry_run:
                self.printer.print_ok("Total size of the download: {}".format(human_size(download_size)))
                return

            if download_size > disk_info.free:
                raise NgcException("Not enough space on local disk to download the dataset.")

            if do_zip:
                async_downloader.download_zip(dest, download_url, do_zip, params=owner_client_id_url_query)
            else:
                part_download = True
                if owner_client_id_url_query:
                    try:
                        async_downloader.download_parts(
                            dest,
                            part_url,
                            download_files,
                            params=owner_client_id_url_query,
                            resume=resume,
                        )
                    except NgcException:
                        logger.debug("Part download is not available, downloading using files.")
                        part_download = False
                if not owner_client_id_url_query or not part_download:
                    if download_files:
                        async_downloader.download_files(
                            dest, download_url, download_files, params=owner_client_id_url_query, resume=resume
                        )
                    else:
                        async_downloader.download_zip(dest, download_url, params=owner_client_id_url_query)

    @extra_args
    def remove(
        self,
        ids: List[int],
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        default_yes: Optional[bool] = None,
    ):
        """Remove datasets."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        _ = team or self.config.team_name
        _ = ace or self.config.ace_name
        default_yes = default_yes or BUILD_TYPE == "sdk"

        fail_message = "Removing of dataset Id: {0} failed: {1}"
        success_message = "Dataset: {0} removed from org: {1}."

        is_error = False
        for ds_id in ids:
            try:
                _ = self.info(dataset_id=ds_id)
                confirm_remove(self.printer, f"the dataset {ds_id}", default_yes)
                self.remove_dataset(org_name=org_name, dataset_id=ds_id)
                self.printer.print_head(success_message.format(ds_id, org_name))
            # RuntimeError: catch anything that is not covered by the most likely errors (below)
            # SystemExit: prevent the CLI from exiting without printing a fail message
            # ResourceNotFoundException: dataset does not exist
            # HTTPError: base connection error when removing a dataset
            except ResourceNotFoundException:
                msg = fail_message.format(ds_id, "Dataset could not be found.")
                self.printer.print_error(msg)
                is_error = True
            except (RuntimeError, SystemExit, rqes.HTTPError) as e:
                msg = fail_message.format(ds_id, e)
                self.printer.print_error(msg)
                is_error = True
            except NgcException as ngce:
                is_error = True
                if str(ngce) == "Remove confirmation failed, remove cancelled.":
                    continue
                if str(ngce) == "Dataset with ID '{}' doesn't exist.".format(ds_id):
                    self.printer.print_error(ngce)
                    continue
                raise

        return is_error

    @extra_args
    def convert(
        self,
        name: str,
        result: int,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        desc: Optional[str] = None,
    ):
        """Convert resultset to a dataset."""
        org_name = org or self.config.org_name

        dataset_service_enabled = is_dataset_service_enabled(org_api=self.org_api, org_name=org_name)

        if dataset_service_enabled:
            message = (
                f"This functionality is not provided in the Data Platform API version {DATASET_SERVICE_API_VERSION}"
            )
            raise NgcException(message)

        self.config.validate_configuration()
        _ = team or self.config.team_name
        ace_name = ace or self.config.ace_name
        job = self.client.basecommand.jobs.get_job(org_name, result)
        if job.aceName != ace_name and self.config.global_ace_name is not None:
            raise InvalidArgumentError(None, message="The resultset must be present in the target ACE")
        self.config.validate_ace(job.aceName)
        ace_name = job.aceName

        dataset_create_request = DatasetCreateRequest()
        dataset_create_request.aceName = ace_name
        dataset_create_request.name = name
        # To match UI behavior, if no desc given, populate with empty string.
        # This will be removed once ngc-7805 goes in which populates empty desc on the cloud side.
        dataset_create_request.description = desc if desc else ""
        dataset_create_request.resultsetIdForBaseDataSource = result
        dataset_create_request.nfsRoot = "/root"
        dataset_create_request.nfsShare = "/share"

        dataset = self.create_dataset(org_name=org_name, dataset_create_request=dataset_create_request)
        return dataset


class DatasetNotFoundHandler:
    """Common handler for dataset not found exceptions."""

    def __init__(self, dataset_id):
        self._id = dataset_id

    def __enter__(self):  # noqa: D105
        pass

    def __exit__(self, _type, value, _traceback):  # noqa: D105
        if _type == ResourceNotFoundException:
            r = value.response
            msg = f"Dataset {self._id} not found."
            if r.content:
                # NGC Batch and NGC Dataset Service have different response schemas.
                r_json = r.json()

                if "requestStatus" in r_json:
                    # NGC Batch.
                    msg = r_json["requestStatus"]["statusDescription"]
                elif "reason" in r_json:
                    # NGC Dataset Service.
                    msg = r_json["reason"]
            raise NgcException(msg)
