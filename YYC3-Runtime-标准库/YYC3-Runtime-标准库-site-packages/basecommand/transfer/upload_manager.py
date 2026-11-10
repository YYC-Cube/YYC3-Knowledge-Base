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

from __future__ import absolute_import, division, print_function

from dataclasses import dataclass
import logging
import re

from basecommand.api.utils import (
    get_storage_resource_owner_id,
    validate_storage_location,
)
from basecommand.constants import STORAGE_TYPE_FS, STORAGE_TYPE_OBJECT
from basecommand.data.api.DatasetCreateRequest import DatasetCreateRequest
from ngcbase.constants import DEFAULT_UPLOAD_THREADS, GiB
from ngcbase.errors import (
    InsufficientStorageException,
    NgcAPIError,
    NgcException,
    ResourceAlreadyExistsException,
)
from ngcbase.printer.transfer import TransferPrinter
from ngcbase.transfer.manager import TransferConfig
from ngcbase.transfer.upload import (
    generate_file_commit_entries,
    upload_S3_dataset,
    UploadTransferManager,
)
from ngcbase.util.file_utils import human_size, tree_size_and_count
from ngcbase.util.io_utils import question_yes_no
from ngcbase.util.utils import has_org_role

RESUME_QUESTION = "Do you want to resume previous dataset upload {0}?"
APPEND_QUESTION = "Do you want to append to dataset {0}?"
INSUFFICIENT_STORAGE = "You have exceeded the storage quota in given ACE: {0}. Please expand your storage space."
DATASET_STATE_UNKNOWN = "Dataset: {0} Id: {1} is unknown."

logger = logging.getLogger(__name__)


@dataclass()
class AceMissingDefaultStorageError(NgcException):
    """The ACE does not have a storage service marked as its default."""

    ace: str

    def __str__(self) -> str:
        """Format the user-facing error message."""
        return f"ACE {self.ace!r} is missing a default configuration for storage service."


@dataclass()
class DefaultStorageMissingGrpcPortError(NgcException):
    """The ACE's default storage service does not have a gRPC port.

    Old ACEs did not guarantee a gRPC port, but nowadays, all ACEs should have them. If this error shows up in the wild,
    then the ACE most likely needs to be updated.
    """

    ace: str

    def __str__(self) -> str:
        """Format the user-facing error message."""
        return f"ACE {self.ace!r} is missing gRPC configuration for storage service."


class UploadManager:
    """Interface for uploading files."""

    def __init__(self, threads=DEFAULT_UPLOAD_THREADS, api_client=None):
        self.config = api_client.config
        self.client = api_client
        self.printer = TransferPrinter(api_client.config)
        self.format_type = self.config.format_type
        self.threads = threads
        self._user_id = None

    def _set_number_of_threads_used(self, file_count):
        """Determine number of threads used for uploads."""
        if not file_count:
            return

        if file_count < self.threads:
            self.threads = file_count
        logger.debug("%d threads being used for upload.", self.threads)

    def create_dataset(self, org_name, ace_name, dataset_name, description=None):  # noqa: D102
        dataset_create_request = DatasetCreateRequest()
        dataset_create_request.aceName = ace_name
        dataset_create_request.name = dataset_name
        dataset_create_request.description = description

        logger.debug("Making POST call to create dataset.")
        dataset = self.client.basecommand.dataset.create_dataset(
            org_name=org_name, dataset_create_request=dataset_create_request
        )
        return dataset

    def find_dataset_id_by_name(self, org_name, dataset_name, ace_name):
        """Iterate through a list of all datasets under org_name and ace_name and return
        the dataset ID that matches the dataset name.
        """  # noqa: D205
        dataset_list = next(
            self.client.basecommand.search.search_dataset(
                org=org_name, team=None, ace=None, list_all=True, name=dataset_name
            )
        )
        for dataset in dataset_list:
            if dataset.name == dataset_name:
                for attr in dataset.attributes:
                    if attr.key == "aceName" and attr.value != ace_name:
                        raise NgcException(
                            "A dataset already exists with the name '{}' in org '{}'. "
                            "Dataset names must be unique in an org.".format(dataset_name, org_name)
                        )
                    if attr.key == "storageResourcesById":
                        return attr.value
        return None

    def find_dataset_by_name(self, org_name, dataset_name):
        """Iterate through a list of all datasets under org_name and ace_name and return
        the dataset ID that matches the dataset name.
        """  # noqa: D205
        dataset_list = next(
            self.client.basecommand.search.search_dataset(
                org=org_name, team=None, ace=None, list_all=True, name=dataset_name
            )
        )
        for dataset in dataset_list:
            if dataset.name == dataset_name:
                return dataset
        return None

    def upload_dataset(  # noqa: C901
        self,
        dataset_name,
        absolute_path,
        description=None,
        omit_links=False,
        default_yes=False,
        dry_run=False,
        org=None,
        ace=None,
        is_dataset_service_enabled=False,
    ):
        """Interface for uploading datasets via gRPC.

        What happens:
          1. Check available storage on ACE
          2. Try to create the dataset
            a. It exists (409 response), get a list of all datasets and find id by matching the name
              - ask the user if they want to continue adding to the dataset. If so, we use the upload cache
                to continue the upload and skip already uploaded files.
            b. It's created and we have the ID
          3. Upload it
        """
        org_name = org or self.config.org_name
        ace_name = ace or self.config.ace_name

        progress = False
        if self.format_type != "json":
            progress = True

        if dry_run:
            print("Files to be uploaded:")
            dataset_size, file_count = tree_size_and_count(
                absolute_path, omit_links, show_progress=progress, print_paths=True, dryrun_option=True
            )
            print("Total Size: ", human_size(dataset_size))
            print("Number of Files: ", file_count)
            return None

        self.printer.print_ok("Calculating dataset size and file count.")
        dataset_size, file_count = tree_size_and_count(absolute_path, omit_links, show_progress=progress)
        self.printer.print_ok(f"Found {file_count} files with a total size of {human_size(dataset_size)}.")
        logger.debug("Dataset size to be uploaded: %s", human_size(dataset_size))
        # This changes based on whether we're continuing an upload or not
        upload_size = dataset_size
        upload_count = file_count
        already_uploaded_size = already_uploaded_count = 0

        self._set_number_of_threads_used(file_count)

        # Set when a dataset is in 'UPLOAD_PENDING' state
        resume_upload = False
        # Set when a dataset is in 'UPLOAD_COMPLETE' state
        append_dataset = False

        default_storage = None
        if not is_dataset_service_enabled:
            default_storage = self.get_default_storage(org_name, ace_name)
            self.printer.print_ok("Checking available space.")
            if not self.check_available_space(org_name, ace_name, dataset_size, default_storage):
                raise NgcException(INSUFFICIENT_STORAGE.format(ace_name))

        owner_id = None
        owner_org = None
        dataset_exists = None

        try:
            logger.debug("Checking if dataset with id %r exists.", dataset_name)
            dataset_generator = self.client.basecommand.dataset.get_dataset(org_name=org_name, dataset_id=dataset_name)
            dataset_info = next(dataset_generator)
            dataset_id = dataset_name
            dataset_name = dataset_info.name
            dataset_exists = True
        except (NgcAPIError, NgcException, AttributeError, TypeError, ValueError):
            logger.debug(
                "Dataset with id %r doesn't exist. This means %r is likely a name, not an id.",
                dataset_name,
                dataset_name,
            )
            dataset_exists = False

        if not dataset_exists:
            try:
                self.printer.print_ok("Attempting to create the dataset.")
                logger.debug("Attempting to create the dataset with name %r", dataset_name)
                dataset_info = self.create_dataset(org_name, ace_name, dataset_name, description)
                if is_dataset_service_enabled and dataset_info.datasetUuid is not None:
                    dataset_id = dataset_info.datasetUuid
                    dataset_generator = self.client.basecommand.dataset.get_dataset(
                        org_name=org_name, dataset_id=dataset_id
                    )
                    dataset_info = next(dataset_generator)
                else:
                    dataset_id = dataset_info.id
            except ResourceAlreadyExistsException:
                logger.debug("Dataset with name %r already exists", dataset_name)

                if is_dataset_service_enabled:
                    dataset = self.find_dataset_by_name(org_name, dataset_name)
                    dataset_id = dataset.datasetUuid
                    dataset_generator = self.client.basecommand.dataset.get_dataset(
                        org_name=org_name, dataset_id=dataset_id
                    )
                    dataset_info = next(dataset_generator)
                    # dataset_info is incomplete, merge in the results from the search
                    dataset_info.status = dataset.status
                else:
                    dataset_id = self.find_dataset_id_by_name(org_name, dataset_name, ace_name)
                    dataset_generator = self.client.basecommand.dataset.get_dataset(
                        org_name=org_name, dataset_id=dataset_id
                    )
                    dataset_info = next(dataset_generator)

                dataset_exists = True

        if dataset_exists:
            if not dataset_info:
                raise NgcException(
                    f"A dataset already exists with the name '{dataset_name}' but its status and ID are unknown. "
                    "Please use another name or try with the same name later."
                ) from None

            if not dataset_info.status:
                raise NgcException(
                    f"Dataset '{dataset_name}' with ID '{dataset_id}' is in an unknown state. Unable to upload."
                ) from None

            owner_id = get_storage_resource_owner_id(self.client, org_name, dataset_info.creatorUserId)
            owner_org = org_name

            if dataset_info.status == "UPLOAD_PENDING":
                upload_str = RESUME_QUESTION.format(dataset_id)
                already_uploaded_size = dataset_info.size
                already_uploaded_count = dataset_info.totalFiles
                upload_size = abs(dataset_size - already_uploaded_size)
                upload_count = abs(file_count - already_uploaded_count)
                # Use the cache leftover from the incomplete upload. Cache is removed once upload is complete.
                resume_upload = True
                self.printer.print_ok("Resuming upload to dataset '{}' (ID: '{}').".format(dataset_name, dataset_id))
            elif dataset_info.status in ["UPLOAD_COMPLETE", "INITIALIZING", "COMPLETED"]:
                upload_str = APPEND_QUESTION.format(dataset_id)

                self.printer.print_ok(
                    "Appending to dataset '{}' (ID: '{}'). Existing files will be skipped.".format(
                        dataset_name, dataset_id
                    )
                )
                append_dataset = True
                upload_size = dataset_size
            else:
                raise NgcException(DATASET_STATE_UNKNOWN.format(dataset_name, dataset_id)) from None

            answer = question_yes_no(self.printer, upload_str, default_yes=default_yes)
            if not answer:
                return None

            if answer and dataset_info.status == "UPLOAD_COMPLETE":
                self.client.basecommand.dataset.set_dataset_state(org_name, dataset_id, state="UPLOAD_PENDING")

            if description:
                # If description was passed, we should overwrite the old one.
                self.printer.print_ok("Updating dataset description.")
                self.client.basecommand.dataset.set_dataset_description(org_name, dataset_id, description)

        commit_entries = None

        if is_dataset_service_enabled:
            validate_storage_location(dataset_info)
            storage_type = dataset_info.storageLocations[0].storageType.lower()
        else:
            storage_type = STORAGE_TYPE_FS

        if storage_type == STORAGE_TYPE_OBJECT:
            commit_entries = upload_S3_dataset(
                dataset_id,
                absolute_path,
                org_name=org_name,
                credential_provider=self.client.basecommand.dataset,
                is_dataset_service_enabled=is_dataset_service_enabled,
                threads=self.threads,
                resume_upload=resume_upload,
                append_dataset=append_dataset,
                config=self.config,
            )
        elif storage_type == STORAGE_TYPE_FS:
            default_storage = default_storage or self.get_default_storage(org_name, ace_name)
            storage_url = self.get_grpc_url(dataset_info.aceStorageServiceUrl, default_storage)
            logger.debug("dataset_id is %s, storage_url is %s", dataset_id, storage_url)

            transfer_type = "dataset"
            xfer_config = TransferConfig(
                max_request_concurrency=self.threads,
                transfer_type=transfer_type,
                resume_upload=resume_upload,
                url=storage_url,
                destination=None,
                append_dataset=append_dataset,
            )

            if is_dataset_service_enabled:
                transfer_id = dataset_info.storageLocations[0].id
            else:
                transfer_id = dataset_id
            manager = UploadTransferManager(
                transfer_id=str(transfer_id),
                ace_name=ace_name,
                transfer_config=xfer_config,
                file_count=upload_count,
                transfer_size=upload_size,
                already_uploaded_count=already_uploaded_count,
                already_uploaded_size=already_uploaded_size,
                transfer_path=absolute_path,
                owner_id=owner_id,
                owner_org=owner_org,
                dataset_service_enabled=is_dataset_service_enabled,
                display_id=dataset_id,
                client=self.client,
            )
            try:
                manager.transfer(exit_on_shutdown=False, omit_links=omit_links)
            except InsufficientStorageException:
                self._handle_insufficient_storage(org_name, ace_name)

            # generate commit entries once upload succeeds
            if is_dataset_service_enabled:
                commit_entries = generate_file_commit_entries(absolute_path)

        # Commit file entries to dataset service
        if commit_entries:
            self.client.basecommand.dataset.commit_to_dataset(dataset_id, org_name, commit_entries)

        # Update dataset state
        self.client.basecommand.dataset.set_dataset_state(org_name, dataset_id, state="UPLOAD_COMPLETE")

        # Return the identifying parts of `dataset_info`.
        return {
            "id": dataset_info.id,
            "datasetUuid": dataset_info.datasetUuid,
        }

    def get_default_storage(self, org_name, ace_name):
        """Return the ACE's default storage config."""
        ace_details = self.client.basecommand.aces.get_ace_details(org_name=org_name, ace_name=ace_name)

        storage_configs = ace_details and ace_details.storageServiceConfig or []
        found_default = next((config for config in storage_configs if config.isDefault), None)

        if found_default is None:
            raise AceMissingDefaultStorageError(ace=ace_name)
        if not found_default.grpcPort:
            raise DefaultStorageMissingGrpcPortError(ace=ace_name)
        return found_default

    def check_available_space(self, org_name, ace_name, upload_size, default_storage):
        """Check if space is available for upload in given ACE."""
        is_space_avail = True  # when user uploads for first time storage quota is empty so return True.
        user_id = self._get_user_id(org_name)
        storage_info = self.client.users.get_user_storage_quota(org_name=org_name, user_id=user_id, ace_name=ace_name)

        if default_storage:
            remaining_quota = None
            if default_storage.initialDefaultQuotaSizeGb is not None:
                logger.debug("Storage Default %s", default_storage.initialDefaultQuotaSizeGb * GiB)
                remaining_quota = (default_storage.initialDefaultQuotaSizeGb * GiB) - upload_size
            non_managed_storage_info = storage_info[0]
            for storage in non_managed_storage_info or []:
                if storage.storageClusterUuid == default_storage.storageClusterUuid and storage.available is not None:
                    logger.debug("Storage Available %s", storage.available)
                    remaining_quota = storage.available - upload_size
            # check remaining space
            if remaining_quota is not None and remaining_quota < 0:
                is_space_avail = False

        return is_space_avail

    def _get_user_id(self, org_name):
        """Return cached user id or fetch and cache."""
        if not self._user_id:
            user_details = self.client.users.user_who(org_name)
            self._user_id = user_details.user.id
        return self._user_id

    def _request_storage(self, org_name, ace_name):
        try:
            self.client.storage.request_user_storage_quota(org_name, ace_name)
        except NgcException as e:
            logger.warning("Failed to request storage: %s", e)

    @staticmethod
    def get_grpc_url(url, default_storage):  # noqa: D102
        if url.startswith("http"):
            url = re.sub(r"^https?://", "", url)
        grpc_port = default_storage.grpcPort
        full_address = "{}:{}".format(url, grpc_port)
        logger.debug("Connecting to grpc server at %s", full_address)
        return full_address

    def upload_workspace(  # noqa: D102
        self,
        workspace_id,
        absolute_path,
        destination,
        exclude_patterns=None,
        dry_run=False,
        org=None,
        ace=None,
        is_dataset_service_enabled=False,
    ):
        ace_name = ace or self.config.ace_name
        org_name = org or self.config.org_name
        # Workspace upload defaults to leaving in symlinks
        omit_links = False

        logger.debug("Getting workspace size and file count...")

        if dry_run:
            print("Files to be uploaded:")
            transfer_size, file_count = tree_size_and_count(
                absolute_path,
                omit_links=omit_links,
                exclude_patterns=exclude_patterns,
                print_paths=True,
                dryrun_option=True,
            )
            print("Total Size: ", human_size(transfer_size))
            print("Number of Files: ", file_count)
            return

        transfer_size, file_count = tree_size_and_count(
            absolute_path, omit_links=omit_links, exclude_patterns=exclude_patterns
        )

        if file_count == 0:
            raise NgcException("Nothing to upload.")

        default_storage = self.get_default_storage(org_name, ace_name)

        logger.debug("Checking available storage...")

        self._set_number_of_threads_used(file_count)

        if not is_dataset_service_enabled and not self.check_available_space(
            org_name, ace_name, transfer_size, default_storage
        ):
            raise NgcException(INSUFFICIENT_STORAGE.format(ace_name))

        workspace_info = self.client.basecommand.workspace.get_workspace(org_name, workspace_id)

        owner_id = None
        user_info_response = self.client.users.user_who(org_name)

        # TODO: ADMIN is deprecated.
        if has_org_role(user_info_response, org_name, ["ADMIN", "BASE_COMMAND_ADMIN"]):
            owner_id = workspace_info.creatorUserId
        elif not has_org_role(user_info_response, org_name, ["USER", "BASE_COMMAND_USER"]):
            raise NgcException("BASE_COMMAND_VIEWER is not authorized to upload workspace.")

        storage_url = self.get_grpc_url(workspace_info.aceStorageServiceUrl, default_storage)

        transfer_type = "workspace"
        xfer_config = TransferConfig(
            max_request_concurrency=self.threads,
            transfer_type=transfer_type,
            resume_upload=False,
            url=storage_url,
            destination=destination,
        )

        if is_dataset_service_enabled:
            validate_storage_location(workspace_info)
            if workspace_info.storageLocations[0].storageType.lower() == STORAGE_TYPE_OBJECT:
                raise NgcException(f"object storageType is not supported for workspace {workspace_info.id}")
            transfer_id = workspace_info.storageLocations[0].id
        else:
            transfer_id = workspace_info.id
        logger.debug("Setting up transfer manager with transfer id: %s", str(transfer_id))
        manager = UploadTransferManager(
            transfer_id=str(transfer_id),
            transfer_config=xfer_config,
            transfer_size=transfer_size,
            file_count=file_count,
            transfer_path=absolute_path,
            owner_id=owner_id,
            owner_org=org_name,
            dataset_service_enabled=is_dataset_service_enabled,
            display_id=workspace_info.id,
            client=self.client,
        )
        try:
            manager.transfer(exit_on_shutdown=False, omit_links=omit_links, exclude_patterns=exclude_patterns)
        except InsufficientStorageException:
            self._handle_insufficient_storage(org_name, ace_name)
        except Exception as exc:
            logger.error("Exception encountered while uploading workspace: %s", exc)
            raise exc

    def _handle_insufficient_storage(self, org_name, ace_name):
        self._request_storage(org_name=org_name, ace_name=ace_name)
        raise InsufficientStorageException(
            "Insufficient storage encountered during upload.\n"
            "A request has been made to increase remote storage.\n"
            "Please wait until storage is increased and try again."
        )
