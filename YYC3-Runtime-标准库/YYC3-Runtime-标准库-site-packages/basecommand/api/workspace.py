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

import base64
import functools
from itertools import chain
import logging
import os
import pathlib
import platform
import re
import shlex
import stat
import subprocess
from typing import List, Optional

import psutil
import requests.exceptions as rqes  # pylint: disable=requests-import

from basecommand.api.utils import (
    check_existing_workspace_name,
    is_dataset_service_enabled,
    validate_storage_location,
)
from basecommand.constants import (
    DATASET_SERVICE_API_VERSION,
    STORAGE_TYPE_OBJECT,
    WORKSPACE_SERVER_PORT,
)
from basecommand.data.api.WorkspaceCreateRequest import WorkspaceCreateRequest
from basecommand.data.api.WorkspaceListResponse import WorkspaceListResponse
from basecommand.data.api.WorkspaceResponse import WorkspaceResponse
from basecommand.data.api.WorkspaceUpdateRequest import WorkspaceUpdateRequest
from basecommand.transfer.upload_manager import UploadManager
from ngcbase.api.pagination import pagination_helper
from ngcbase.constants import (
    API_VERSION,
    DEFAULT_UPLOAD_THREADS,
    UMASK_GROUP_OTHERS_READ_EXECUTE,
)
from ngcbase.errors import (
    InvalidArgumentError,
    MissingConfigFileException,
    NgcAPIError,
    NgcException,
    ResourceNotFoundException,
    UnsupportedPlatformException,
)
from ngcbase.transfer.controller import TransferController
from ngcbase.transfer.manager import TransferConfig
from ngcbase.util.file_utils import get_path_permissions, human_size, mkdir_path
from ngcbase.util.utils import (
    Command,
    extra_args,
    has_org_admin_user_role,
    has_team_role,
    MaskGranter,
    url_encode,
)

PAGE_SIZE = 1000
logger = logging.getLogger(__name__)


class WorkspaceAPI:  # noqa: D101
    def __init__(self, api_client, dataset_service_connection=None):
        self.connection = api_client.connection
        self.local_mount_dir = None
        self.server_port = WORKSPACE_SERVER_PORT
        self.config = api_client.config
        self.client = api_client
        self.printer = api_client.printer
        self.dataset_service_connection = dataset_service_connection
        self._org_api = api_client.organization.organization

    @staticmethod
    def _test_sshfs_installation():
        os_type = platform.system()
        try:
            with open(os.devnull, "w", encoding="utf-8") as fnull:
                subprocess.call(["sshfs"], stdout=fnull, stderr=fnull, env=Command.get_pre_frozen_environment())
        except OSError:
            if os_type == "Linux":
                raise NgcException(
                    "SSHFS is needed in order to mount a workspace and is currently not installed. "
                    "Please consult your distribution's documentation for the correct package to install.\n"
                    "For further help with the installation, please refer to "
                    "https://github.com/libfuse/sshfs#installation \n"
                ) from None

            if os_type == "Darwin":
                raise NgcException(
                    "SSHFS is needed in order to mount a workspace and is currently not installed. "
                    "It can be installed on MacOS from: https://github.com/osxfuse/sshfs/releases \n"
                    "SSHFS also requires OSXFuse. It can be downloaded from: https://osxfuse.github.io"
                ) from None

    def _construct_mount_command(
        self,
        workspace_id,
        server_hostname,
        auth_token,
        local_mount_dir=None,
        remote_server_url=None,
        sshfs_location="sshfs",
        read_only=False,
        control_path=False,
    ):
        """Constructs URL based on source server and the destination directory to mount at."""  # noqa: D401
        self.local_mount_dir = local_mount_dir
        command_str = None

        if remote_server_url is None:
            remote_server_url = "{auth_token}@{server_hostname}:/".format(
                auth_token=auth_token, server_hostname=server_hostname
            )
        else:
            remote_server_url = "{auth_token}@{server_hostname}:/{remote_server_url}".format(
                auth_token=auth_token, server_hostname=server_hostname, remote_server_url=remote_server_url
            )

        sshfs_command = (
            '{sshfs_location} -F /dev/null -o gid={egid} -o uid={euid} -o fsname="{fsname}" -o reconnect '
            + "-o ServerAliveInterval=15 "
            + "-o StrictHostKeyChecking=no "
            + "-o ServerAliveCountMax=30 -o cache=yes -o kernel_cache -o compression=no "
            + ("-o ControlMaster=yes -o ControlPath=none " if control_path else "")
            + "-o sshfs_sync {readonly}-p {server_port} {remote_server_url} {local_mount_dir}"
        )

        os_type = platform.system()
        if os_type == "Linux":
            # Bug 2311612: Operations such as 'git clone' or 'svn checkout' use a temporary file and
            # then rename and overwrite the target atomically. However, on Linux, SSHFS(built on SFTP)
            # does not allow renaming and overwriting a file in an atomic manner. As a result, we have
            # to overcome this limitation with a workaround by informing SSHFS to perform renaming and
            # overwriting in a non-atomic operation by specifying '-o workaround=rename' in the
            # command-line.
            sshfs_command += " -o workaround=rename"
            command_str = sshfs_command.format(
                server_port=self.server_port,
                remote_server_url=remote_server_url,
                local_mount_dir=self.local_mount_dir,
                fsname=workspace_id,
                egid=os.getegid(),  # pylint: disable=no-member
                euid=os.geteuid(),  # pylint: disable=no-member
                sshfs_location=sshfs_location,
                readonly="-o ro " if read_only else "",
            )
        elif os_type == "Darwin":
            sshfs_command += " -o defer_permissions"
            command_str = sshfs_command.format(
                server_port=self.server_port,
                remote_server_url=remote_server_url,
                local_mount_dir=self.local_mount_dir,
                fsname=workspace_id,
                egid=os.getegid(),  # pylint: disable=no-member
                euid=os.geteuid(),  # pylint: disable=no-member
                sshfs_location=sshfs_location,
                readonly="-o ro " if read_only else "",
            )

        return command_str

    @staticmethod
    def _construct_url(op, org_name, workspace_id=None, team=None, dataset_service_enabled=False):
        api_version = DATASET_SERVICE_API_VERSION if dataset_service_enabled else API_VERSION
        org_path = "/{api}/org/{org_name}/workspaces".format(api=api_version, org_name=org_name)
        url_path = org_path

        if op in ["GET", "REMOVE", "UPDATE", "SHARE", "REVOKE_SHARE"]:
            url_path = "{org_path}/{workspace_id}".format(org_path=org_path, workspace_id=workspace_id)

        if op in ["SHARE", "REVOKE_SHARE"]:
            if team:
                url_path = "{url_path}/shares/team/{target_team}".format(url_path=url_path, target_team=team)
            else:
                url_path = "{url_path}/shares/org".format(url_path=url_path)

        return url_path

    def create_workspace(self, org_name, workspace_create_request):
        """Creates a new workspace."""  # noqa: D401
        response = self.connection.make_api_request(
            "POST",
            self._construct_url("CREATE", org_name) + "/",
            payload=workspace_create_request.toJSON(False),
            auth_org=org_name,
            operation_name="create workspace",
        )
        return WorkspaceResponse(response).workspace

    def remove_workspace(self, org_name, workspace_id):
        """Removes workspace with given name or workspace ID."""  # noqa: D401
        response = self.connection.make_api_request(
            "DELETE",
            self._construct_url("REMOVE", org_name, workspace_id=workspace_id),
            auth_org=org_name,
            operation_name="remove workspace",
        )
        return response

    def get_workspace(self, org_name, workspace_id):
        """Get workspace details for given workspace ID."""
        dataset_service_enabled = is_dataset_service_enabled(org_api=self._org_api, org_name=org_name)
        connection = self.dataset_service_connection if dataset_service_enabled else self.connection
        extra_auth_headers = {"nv-ngc-org": org_name} if dataset_service_enabled else None
        base_url = self._construct_url(
            "GET", org_name=org_name, workspace_id=workspace_id, dataset_service_enabled=dataset_service_enabled
        )
        response = connection.make_api_request(
            "GET",
            base_url,
            auth_org=org_name,
            operation_name="get workspace",
            kas_direct=dataset_service_enabled,
            extra_auth_headers=extra_auth_headers,
        )
        return WorkspaceResponse(response).workspace

    def update_workspace(self, org_name, workspace_id, name=None, desc=None):
        """Update workspace."""
        workspace_update_request = WorkspaceUpdateRequest()
        if name:
            workspace_update_request.name = name
        if desc:
            workspace_update_request.description = desc
        url = self._construct_url("UPDATE", org_name, workspace_id=workspace_id)
        response = self.connection.make_api_request(
            "PATCH",
            url,
            payload=workspace_update_request.toJSON(False),
            auth_org=org_name,
            operation_name="update workspace",
        )
        return WorkspaceResponse(response)

    @staticmethod
    def _list_workspace_url(org_name, team_name=None, ace_name=None, exclude_shared=False, page_size=PAGE_SIZE):
        base_url = "{api_version}/org/{org_name}".format(api_version=API_VERSION, org_name=org_name)
        if team_name:
            team_name_enc = url_encode(team_name)
            base_url = "{base_method}/team/{team_name}/workspaces".format(base_method=base_url, team_name=team_name_enc)
        else:
            base_url = "{base_method}/workspaces".format(base_method=base_url)

        query = "{url}?page-size={page_size}".format(url=base_url, page_size=page_size)

        if ace_name:
            ace_name_enc = url_encode(ace_name)
            query += "&ace-name={ace_name}".format(ace_name=ace_name_enc)
        if exclude_shared:
            query += "&exclude-shared=true"

        return query

    def list_workspace(  # noqa: D102
        self, org_name, team_name=None, ace_name=None, exclude_shared=False, page_size=PAGE_SIZE
    ):

        query = self._list_workspace_url(org_name, team_name, ace_name, exclude_shared, page_size=page_size)

        return chain(
            *[
                WorkspaceListResponse(response).workspaces
                for response in pagination_helper(
                    self.connection,
                    query,
                    org_name=org_name,
                    team_name=team_name,
                    operation_name="list workspace paginated",
                )
                if WorkspaceListResponse(response).workspaces
            ]
        )

    def share_workspace(self, org_name, workspace_id, target_team_name=None):
        """Shares workspace with the org/team."""
        url_path = self._construct_url("SHARE", org_name, workspace_id, target_team_name)
        response = self.connection.make_api_request(
            "PUT",
            url_path,
            auth_org=org_name,
            auth_team=target_team_name,
            operation_name="share workspace",
        )
        return response

    def revoke_share_workspace(self, org_name, workspace_id, target_team_name=None):
        """Stops sharing workspace with the org/team."""  # noqa: D401
        url_path = self._construct_url("REVOKE_SHARE", org_name, workspace_id, target_team_name)
        response = self.connection.make_api_request(
            "DELETE",
            url_path,
            auth_org=org_name,
            auth_team=target_team_name,
            operation_name="revoke share workspace",
        )
        return response

    def mount_workspace(
        self,
        workspace_id,
        local_mount_dir,
        remote_server_url,
        server_hostname,
        force=False,
        read_only=False,
        org_name=None,
        control_path=False,
        ace_sftp_port=None,
    ):
        """Mount a workspace on users local machine."""
        if force:
            self._run_unmount(local_mount_dir)

        if not os.path.isdir(local_mount_dir):
            with MaskGranter(UMASK_GROUP_OTHERS_READ_EXECUTE):
                mkdir_path(local_mount_dir)

        if os.listdir(local_mount_dir):
            raise NgcException("The mount point is not empty. You can only mount in an empty directory!")

        # ensure user has write permissions
        if not os.access(local_mount_dir, os.W_OK):
            raise IOError(
                "IOError: Unable to write to {local_mount_dir}. "
                "Please ensure you have write permissions to the mount directory".format(
                    local_mount_dir=local_mount_dir
                )
            )

        if os.path.ismount(local_mount_dir):
            raise NgcException("Already mounted.")

        username = f"{self.config.app_key},,,{workspace_id},,,{org_name}".encode("utf-8")
        auth_token = base64.b64encode(username).decode("utf-8")

        abs_mount_dir = os.path.abspath(local_mount_dir)
        self.server_port = ace_sftp_port if ace_sftp_port else self.server_port

        if platform.system() == "Windows":
            raise UnsupportedPlatformException(
                platform="Windows", hostname=server_hostname, token=auth_token, port=self.server_port
            )

        mount_command = self._construct_mount_command(
            workspace_id,
            server_hostname,
            auth_token,
            abs_mount_dir,
            remote_server_url,
            read_only=read_only,
            control_path=control_path,
        )

        self._test_sshfs_installation()

        # perform the actual mount
        with MaskGranter(UMASK_GROUP_OTHERS_READ_EXECUTE):
            mount_result = Command(shlex.split(mount_command)).run()
            logger.debug(mount_result)
            mount_result.on_error(
                error="Permission denied", raise_exception=NgcException(f"{_gen_path_warnings(local_mount_dir)}")
            )
            mount_result.on_error(
                raise_exception=NgcException(f"Permission denied, check owned or shared, {mount_result.stderr}")
            )
        return mount_result.rc

    @staticmethod
    def _run_unmount(local_mount_dir):
        abs_mount_dir = os.path.abspath(local_mount_dir)
        umount_command = ""
        os_type = platform.system()
        if os_type == "Linux":
            umount_command = "fusermount -u -z {}".format(abs_mount_dir)
        elif os_type == "Darwin":
            umount_command = "diskutil unmount force {}".format(abs_mount_dir)

        with MaskGranter(UMASK_GROUP_OTHERS_READ_EXECUTE):
            umount_result = Command(shlex.split(umount_command)).run()
            logger.debug(umount_result)
            umount_result.on_error(
                error="Permission denied", raise_exception=NgcException(f"{_gen_path_warnings(local_mount_dir)}")
            )
        return umount_result

    def unmount_workspace(self, local_mount_dir):  # noqa: D102
        umount_result = self._run_unmount(local_mount_dir)
        umount_result.on_error(raise_exception=NgcException(umount_result.stderr))
        return umount_result.rc

    @extra_args
    def create(
        self,
        name: Optional[str] = None,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
    ):
        """Create a workspace."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team = team or self.config.team_name
        ace_name = ace or self.config.ace_name
        # TODO handle with require configs?
        if not ace_name:
            raise MissingConfigFileException(
                "Provide ACE name using --ace option, or set ACE name using ngc config set."
            )
        workspace_create_request = WorkspaceCreateRequest()
        workspace_create_request.aceName = ace_name
        if name:
            workspace_create_request.name = name
        try:
            workspace_create_request.isValid()
            workspace = self.create_workspace(org_name=org_name, workspace_create_request=workspace_create_request)
        except NgcAPIError as nae:
            # Name already taken error
            check_existing_workspace_name(nae, name, org_name)
            raise
        except ValueError as ve:
            # 22-character limit error
            if re.search(r".*doesnt match requirement: pattern:", str(ve)) and name and len(name) == 22:
                raise NgcException(
                    "Workspace name cannot be exactly 22 characters. Enter a shorter or longer name."
                ) from None
            # Everything else gets passed down to the user
            raise

        return workspace

    @extra_args
    def remove(
        self, workspace_id: str, org: Optional[str] = None, team: Optional[str] = None, ace: Optional[str] = None
    ):
        """Remove a workspace."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team = team or self.config.team_name
        ace = ace or self.config.ace_name
        fail_message = "Removing of workspace with ID or name: '{0}' failed: {1}."
        try:
            resp = self.remove_workspace(org_name=org_name, workspace_id=workspace_id)
            return resp
        # RuntimeError: catch anything not covered by the most likely errors that are listed below
        # ResourceNotFoundException: in case the client was not created correctly
        # ConnectionError and HTTPError: can occur when removing a workspace
        except (RuntimeError, ResourceNotFoundException, rqes.ConnectionError, rqes.HTTPError) as e:
            raise NgcException(fail_message.format(workspace_id, e)) from None

    @extra_args
    def info(self, workspace_id: str, org: Optional[str] = None, team: Optional[str] = None, ace: Optional[str] = None):
        """Get workspace details."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team = team or self.config.team_name
        ace = ace or self.config.ace_name
        workspace = self.get_workspace(org_name=org_name, workspace_id=workspace_id)
        return workspace

    @extra_args
    def update(
        self,
        workspace_id: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        name: Optional[str] = None,
        desc: Optional[str] = None,
    ):
        """Update a workspace."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team = team or self.config.team_name
        ace = ace or self.config.ace_name
        if name:
            # check if workspace already has a name
            workspace = self.get_workspace(org_name=org_name, workspace_id=workspace_id)
            if workspace.name:
                raise NgcException(
                    f"Workspace name can only be set once. Workspace with ID '{workspace_id}' has already been named."
                )

        try:
            resp = self.update_workspace(org_name=org_name, workspace_id=workspace_id, name=name, desc=desc)
            return resp
        except NgcAPIError as apie:
            # Name already taken error
            check_existing_workspace_name(apie, name, org_name)
            # 22 character limit error
            if re.match(r".*doesnt match requirement: pattern:", str(apie)) and name and len(name) == 22:
                raise NgcException(
                    "Workspace name cannot be exactly 22 characters. Enter a shorter or longer name."
                ) from None
            raise

    @extra_args
    def list(
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        owned: Optional[bool] = None,
        list_all: Optional[bool] = None,
        name: Optional[str] = None,
    ):
        """List workspaces."""
        self.config.validate_configuration(csv_allowed=True)
        org = org or self.config.org_name
        team = team or self.config.team_name
        ace = ace or self.config.ace_name
        list_team = None

        user_resp = self.client.users.user_who(org)
        user_client_id = user_resp.user.clientId

        # TODO: ADMIN is deprecated.
        can_list_all = has_org_admin_user_role(
            user_resp, org, ["ADMIN", "BASE_COMMAND_ADMIN", "BASE_COMMAND_VIEWER"], ["USER", "BASE_COMMAND_USER"]
        )
        if can_list_all is None and team:
            list_team = team
            can_list_all = has_team_role(user_resp, team, ["ADMIN", "BASE_COMMAND_ADMIN", "BASE_COMMAND_VIEWER"])

        workspace_search_results = self.client.basecommand.search.search_workspaces(
            org=org,
            team=team,
            ace=ace,
            user_client_id=user_client_id,
            owned=owned,
            list_all=can_list_all and list_all,
            name=name,
            list_team=list_team,
        )
        return workspace_search_results

    @extra_args
    def share(self, workspace_id: str, org: Optional[str] = None, team: Optional[str] = None):
        """Share a workspace."""
        self.config.validate_configuration()
        org = org or self.config.org_name
        team = team or self.config.team_name
        resp = self.share_workspace(org_name=org, workspace_id=workspace_id, target_team_name=team)
        return resp

    @extra_args
    def revoke_share(self, workspace_id: str, org: Optional[str] = None, team: Optional[str] = None):
        """Unshare a workspace."""
        self.config.validate_configuration()
        org = org or self.config.org_name
        team = team or self.config.team_name
        resp = self.revoke_share_workspace(org_name=org, workspace_id=workspace_id, target_team_name=team)
        return resp

    @extra_args
    def upload(
        self,
        workspace_id: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        source: Optional[str] = ".",
        destination: Optional[str] = "/",
        exclude: Optional[List[str]] = None,
        dry_run: Optional[bool] = None,
        threads: Optional[int] = DEFAULT_UPLOAD_THREADS,
    ):
        """Upload to a workspace."""
        self.config.validate_configuration()
        absolute_path = os.path.abspath(source)
        org_name = org or self.config.org_name
        team = team or self.config.team_name
        ace_name = ace or self.config.ace_name

        if not os.path.exists(absolute_path):
            raise NgcException("The path: '{0}' does not exist.".format(absolute_path))

        if not ace_name:
            raise NgcException("Provide ACE using --ace option or set ACE name using `ngc config set`.")

        if "\\" in destination:
            raise InvalidArgumentError("argument: -d/--destination requires a POSIX-formatted path.")

        workspace = self.get_workspace(org_name=org_name, workspace_id=workspace_id)

        dataset_service_enabled = is_dataset_service_enabled(org_api=self._org_api, org_name=org_name)

        if not dataset_service_enabled and workspace.aceName.lower() != ace_name.lower():
            raise ResourceNotFoundException(f"Workspace {workspace_id} not found in ace: '{ace_name}'.")
        workspace_id = workspace.id

        manager = UploadManager(threads=threads, api_client=self.client)
        manager.upload_workspace(
            workspace_id=workspace_id,
            absolute_path=absolute_path,
            destination=destination,
            exclude_patterns=exclude,
            dry_run=dry_run,
            org=org_name,
            ace=ace_name,
            is_dataset_service_enabled=dataset_service_enabled,
        )

    @extra_args
    def download(
        self,
        workspace_id: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        dest: Optional[str] = ".",
        files: Optional[List[str]] = None,
        dirs: Optional[List[str]] = None,
        do_zip: Optional[bool] = None,
        dry_run: Optional[bool] = None,
    ):
        """Download a workspace."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team = team or self.config.team_name
        ace = ace or self.config.ace_name
        absolute_path = os.path.abspath(dest)
        disk_info = psutil.disk_usage(absolute_path)
        if not os.path.isdir(absolute_path):
            raise NgcException("The path: '{0}' does not exist.".format(dest))

        dataset_service_enabled = is_dataset_service_enabled(org_api=self._org_api, org_name=org_name)
        workspace_meta = self.get_workspace(org_name, workspace_id)

        download_id = _derive_workspace_download_id(workspace_meta, dataset_service_enabled)
        download_url = "{}/v1/downloads/buckets/workspaces/{}".format(workspace_meta.aceStorageServiceUrl, download_id)

        owner_client_id_url_query = f"?owner-client-id={workspace_meta.creatorUserId}&org-name={org_name}"

        config = TransferConfig(url=download_url, transfer_type="workspace")
        controller = TransferController(download_id, config, dataset_service_enabled, workspace_id, client=self.client)
        if files or dirs:
            # Get the list of files from DSS for filtering the non-existent files
            # Right now we just pass the file/dir name that the user supplies and let the download fail
            # if that file is not present in the workspace
            controller.download_files_submission(
                dest=dest,
                files={file_path: 0 for file_path in files or []},
                dirs=dirs or [],
                dry_run=dry_run,
                params=owner_client_id_url_query,
                exit_on_shutdown=False,
            )
        else:
            if not dataset_service_enabled and workspace_meta.sizeInBytes > disk_info.free:
                raise NgcException(
                    "Not enough space on local disk to download the entire workspace. Download size: "
                    f"{human_size(workspace_meta.sizeInBytes)}  Available space: {human_size(disk_info.free)}"
                )
            # Download whole workspace as a zip file
            if dry_run:
                self.printer.print_ok(f"Total size of the download: {human_size(workspace_meta.sizeInBytes)}")
                return
            controller.download_zip_submission(
                dest, do_zip=do_zip, params=owner_client_id_url_query, exit_on_shutdown=False
            )


def _gen_path_warnings(local_mount_dir):
    """Returns a warning string containing problem paths and a suggested command to fix permissions.

    Used to help discover path issues on NFS mounts. Do not use on Windows.
    """  # noqa: D401
    path_msg = ""
    suggested_command = ""
    mount_path = pathlib.Path(local_mount_dir)
    path_strings = _find_problem_paths(mount_path)

    if path_strings:
        closest_dir = functools.reduce(lambda x, y: x if len(x) > len(y) else y, path_strings)
        path_msg = " (" + ", ".join(path_strings) + ")"
        suggested_command = f"The following command may help:\nchmod ugo+rx {closest_dir}"

    return (
        f"ngc unmount failed due to local permissions{path_msg}. All directories from the root to the "
        f"mount point must be readable and executable.\n{suggested_command}"
    )


def _find_problem_paths(mount_path):
    """Paths from mount point to root are returned as problematic if read and
    execute permissions are not set for 'group' and 'others'.
    """  # noqa: D205
    path_list = []
    current_path = mount_path.absolute()
    while str(current_path) != "/":
        mode = get_path_permissions(current_path)
        if mode:
            group_readable = bool(mode & stat.S_IRGRP)
            group_executable = bool(mode & stat.S_IXGRP)
            other_readable = bool(mode & stat.S_IROTH)
            other_executable = bool(mode & stat.S_IXOTH)
            if not all([group_readable, group_executable, other_readable, other_executable]):
                path_list.append(str(current_path))

        current_path = current_path.parent

    return path_list


def _derive_workspace_download_id(workspace_meta, dataset_service_enabled):
    if dataset_service_enabled:
        validate_storage_location(workspace_meta)
        if workspace_meta.storageLocations[0].storageType.lower() == STORAGE_TYPE_OBJECT:
            raise NgcException(f"object storageType is not supported for workspace {workspace_meta.id}")
        download_id = workspace_meta.storageLocations[0].id
    else:
        download_id = workspace_meta.id
    return download_id
