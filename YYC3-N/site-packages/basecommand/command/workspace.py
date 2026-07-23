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

#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import base64
from collections import namedtuple
import platform

from basecommand.command.base_command import BaseCommand
from basecommand.command.completers import workspace_id_completer
from basecommand.constants import WORKSPACE_SERVER_PORT
from basecommand.printer.workspace import WorkspacePrinter
from ngcbase.api.utils import remove_scheme
from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_valid_columns,
    SingleUseAction,
    valid_value,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import (
    CONFIG_TYPE,
    DEFAULT_UPLOAD_THREADS,
    MAX_UPLOAD_THREADS,
    STAGING_ENV,
)
from ngcbase.errors import (
    MissingConfigFileException,
    NgcException,
    ResourceNotFoundException,
    UnsupportedPlatformException,
)
from ngcbase.util.io_utils import question_yes_no
from ngcbase.util.utils import (
    get_columns_help,
    get_environ_tag,
    has_org_role,
    share_targets,
)


class WorkspaceCommand(BaseCommand, CLICommand):  # noqa: D101
    CMD_NAME = "workspace"
    HELP = "Workspace Commands"
    DESC = "Workspace Commands"

    CLI_HELP = CONFIG_TYPE
    COMMAND_DISABLE = False

    WARN_MSG = " (Warning: 'ngc workspace' is deprecated, use 'ngc base-command workspace'.)"
    WARN_COND = CLICommand if get_environ_tag() <= STAGING_ENV else None
    CMD_ALIAS = []

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.make_bottom_commands(parser)
        self.config = self.client.config
        self.printer = WorkspacePrinter(self.client.config)

    create_workspace_str = "Create a new workspace."

    @CLICommand.command(help=create_workspace_str, description=create_workspace_str)
    @CLICommand.arguments(
        "--name",
        metavar="<name>",
        help="Set the workspace name. This may only be done once.",
        type=str,
        action=SingleUseAction,
    )
    def create(self, args):  # noqa: D102
        workspace = self.client.basecommand.workspace.create(name=args.name, org=args.org, team=args.team, ace=args.ace)
        self.printer.print_head("Successfully created workspace with ID: '{0}'".format(workspace.id))
        self.printer.print_workspace_info(workspace)

    remove_workspace = "Remove a workspace."

    @CLICommand.command(help=remove_workspace, description=remove_workspace)
    @CLICommand.arguments(
        "workspace_id", metavar="<workspace>", help="Workspace Name or ID", type=str, completer=workspace_id_completer
    )
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    def remove(self, args):  # noqa: D102
        workspace_id = args.workspace_id
        org_name = args.org or self.config.org_name
        question = (
            "Are you sure you would like to remove the workspace with ID or name: '{workspace_id}' from "
            "org: '{org_name}'?".format(workspace_id=workspace_id, org_name=org_name)
        )
        answer = question_yes_no(self.printer, question, default_yes=args.default_yes)
        if not answer:
            self.printer.print_head("Workspace with ID '{0}' was not deleted.".format(workspace_id))
            return

        success_message = "Successfully removed workspace with ID or name: '{0}' from org: '{1}'."
        self.client.basecommand.workspace.remove(org=org_name, workspace_id=workspace_id)
        self.printer.print_head(success_message.format(workspace_id, org_name))

    mount_workspace = "Mount an existing workspace."

    @CLICommand.command(help=mount_workspace, description=mount_workspace)
    @CLICommand.arguments(
        "workspace_id", metavar="<workspace>", help="Workspace Name or ID", type=str, completer=workspace_id_completer
    )
    @CLICommand.arguments("local_path", metavar="<local path>", help="Local Mount Point Name", type=str)
    @CLICommand.arguments(
        "--remote-path",
        metavar="<path>",
        help="Path on the remote server inside the workspace.",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--force",
        dest="force",
        action="store_true",
        default=False,
        help="Force mount; this will remount if there is a broken mount point.",
    )
    @CLICommand.arguments(
        "-y",
        "--yes",
        dest="default_yes",
        action="store_true",
        help="Automatically say yes to all interactive questions.",
    )
    @CLICommand.arguments(
        "--control-path",
        dest="control_path",
        action="store_true",
        help="Set contol path to none and enable control master.",
    )
    @CLICommand.arguments(
        "--mode",
        metavar="<mode>",
        type=str,
        action=SingleUseAction,
        required=True,
        choices=["RO", "RW"],
        help="Mount mode. Valid values: RW, RO",
    )
    def mount(self, args):  # noqa: D102
        self.config.validate_configuration()
        local_path = args.local_path
        workspace_id = args.workspace_id
        remote_path = args.remote_path
        org_name = self.config.org_name
        ace_name = self.config.ace_name

        if not self.config.ace_name:
            raise MissingConfigFileException(
                "Provide ACE name using --ace option, or set ACE name using ngc config set."
            )

        user_resp = self.client.users.user_who(org_name)

        # TODO: ADMIN is deprecated.
        is_admin_user = has_org_role(user_resp, org_name, ["ADMIN", "BASE_COMMAND_ADMIN", "USER", "BASE_COMMAND_USER"])

        workspace = self.client.basecommand.workspace.get_workspace(org_name=org_name, workspace_id=args.workspace_id)

        if not (workspace.owned or is_admin_user) and args.mode == "RW":
            raise NgcException("The owner, admin or shared user can mount the workspace in 'RW' mode.")

        if workspace.aceName.lower() != ace_name.lower():
            raise ResourceNotFoundException(
                "Workspace '{id}' not found in ace: '{ace_name}'.".format(id=workspace_id, ace_name=ace_name)
            )
        server_hostname = remove_scheme(workspace.aceStorageServiceUrl)
        ace_sftp_port = None
        ace_details = self.client.basecommand.aces.get_ace_details(org_name=org_name, ace_name=ace_name)

        if ace_details:
            for sc in ace_details.storageServiceConfig or []:
                if sc and sc.isDefault:
                    ace_sftp_port = sc.sftpPort

        try:
            self.client.basecommand.workspace.mount_workspace(
                workspace.id,
                local_path,
                remote_path,
                server_hostname,
                args.force,
                args.mode == "RO",
                org_name=org_name,
                control_path=args.control_path,
                ace_sftp_port=ace_sftp_port,
            )
        except UnsupportedPlatformException as e:
            self.printer.print_windows_instr(e.token, e.hostname, e.port)
            return
        self.printer.print_ok("Mounting complete.")

    unmount_workspace = "Unmount a workspace."

    @CLICommand.command(help=unmount_workspace, description=unmount_workspace)
    @CLICommand.arguments("local_path", metavar="<local path>", help="Local Mount Point Name", type=str)
    def unmount(self, args):  # noqa: D102
        self.config.validate_configuration()
        if platform.system() == "Windows":
            raise NgcException("To unmount, manually unmount the drive in which the server is mounted in")
        local_path = args.local_path
        self.client.basecommand.workspace.unmount_workspace(local_path)
        self.printer.print_ok("Successfully unmounted workspace.")

    get_details_str = "Get workspace details."

    @CLICommand.command(help=get_details_str, description=get_details_str)
    @CLICommand.arguments(
        "workspace_id", metavar="<workspace>", help="Workspace Name or ID", type=str, completer=workspace_id_completer
    )
    @CLICommand.arguments(
        "--show-sftp",
        help="Show hostname, port and token for sftp.",
        dest="show_sftp",
        action="store_true",
    )
    def info(self, args):  # noqa: D102
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        ace_name = args.ace or self.config.ace_name

        # get workspace details
        workspace = self.client.basecommand.workspace.info(org=org_name, workspace_id=args.workspace_id)
        sftp_info = None
        if args.show_sftp:
            hostname = remove_scheme(workspace.aceStorageServiceUrl)
            port = WORKSPACE_SERVER_PORT
            ace_details = self.client.basecommand.aces.get_ace_details(org_name=org_name, ace_name=ace_name)
            if ace_details:
                for sc in ace_details.storageServiceConfig or []:
                    if sc and sc.isDefault:
                        port = sc.sftpPort

            username = f"{self.config.app_key},,,{workspace.id},,,{org_name}".encode("utf-8")
            token = base64.b64encode(username).decode("utf-8")
            SftpInfo = namedtuple("SftpInfo", "hostname port token")
            sftp_info = SftpInfo(hostname, port, token)

        self.printer.print_workspace_info(workspace, sftp_info)

    set_workspace = "Set name and/or description for a workspace."

    @CLICommand.command(help=set_workspace, description=set_workspace)
    @CLICommand.arguments(
        "workspace_id", metavar="<workspaceid>", help="Workspace ID", type=str, completer=workspace_id_completer
    )
    @CLICommand.arguments(
        "-n",
        "--name",
        metavar="<name>",
        help="Set a workspace name.  This may be done once.",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--desc",
        metavar="<desc>",
        help="Set a workspace description.  This may be done once.",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    def set(self, args):  # noqa: D102
        workspace_id = args.workspace_id
        name = args.name
        desc = args.desc

        if name:
            question = "Workspace name can only be set once, are you sure you want to continue?"
            answer = question_yes_no(self.printer, question, default_yes=args.default_yes)
            if not answer:
                self.printer.print_head("Workspace name for workspace with ID '{0}' was not set.".format(workspace_id))
                return

        self.client.basecommand.workspace.update(
            workspace_id=workspace_id, org=args.org, team=args.team, ace=args.ace, name=args.name, desc=args.desc
        )

        if name and desc:
            self.printer.print_head(
                "Workspace name and description for workspace with ID '{0}' have been set.".format(workspace_id)
            )
        elif desc:
            self.printer.print_head(
                "Workspace description for workspace with ID '{0}' has been set.".format(workspace_id)
            )
        elif name:
            self.printer.print_head("Workspace name for workspace with ID '{0}' has been set.".format(workspace_id))
        else:
            self.printer.print_head("Provide name or description to be set using the --name or --desc argument.")

    list_workspace = "List all accessible workspaces. Current ACE and team will be used to filter the output."

    columns_dict = {
        "name": "Name",
        "org": "Org",
        "team": "Team",
        "updated": "Updated Date",
        "created": "Created Date",
        "creator": "Creator UserName",
        "description": "Description",
        "shared": "Shared",
        "owned": "Owned",
        "ace": "Ace",
        "size": "Size",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)

    @CLICommand.command(help=list_workspace, description=list_workspace)
    @CLICommand.arguments("--owned", help="Include only owned workspaces.", action="store_true", default=False)
    @CLICommand.arguments(
        "--name",
        metavar="<name>",
        help="Include only workspaces with name <name>; the wildcards '*' and '?' are allowed.",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--all", help="(For administrators only) Show all workspaces across all users.", action="store_true"
    )
    # pylint:disable=undefined-variable
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.mutex(["all"], ["owned"])
    def list(self, args):  # noqa: D102
        self.config.validate_configuration(csv_allowed=True)
        user_resp = self.client.users.user_who(self.config.org_name)
        user_client_id = user_resp.user.clientId
        workspace_search_results = self.client.basecommand.workspace.list(
            org=args.org,
            team=args.team,
            ace=args.ace,
            owned=args.owned,
            list_all=args.all,
            name=args.name,
        )
        check_add_args_columns(args.column, WorkspaceCommand.columns_default)
        self.printer.print_workspace_list(workspace_search_results, user_client_id, columns=args.column)

    share_str = "Share a workspace with an org or team."

    @CLICommand.command(name="share", help=share_str, description=share_str)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    @CLICommand.arguments(
        "workspace_id", metavar="<workspace>", help="Workspace Name or ID", type=str, completer=workspace_id_completer
    )
    def share(self, args):  # noqa: D102
        self.config.validate_configuration()
        org = self.config.org_name
        team = self.config.team_name
        workspace_id = args.workspace_id

        (share_entity_type, share_entity_name) = share_targets(org, team)

        if team:
            share_str = "Do you want to share workspace '{}' with team '{}'?".format(workspace_id, team)
        else:
            share_str = "Do you want to share workspace '{}' with org '{}'?".format(workspace_id, org)
        answer = question_yes_no(self.printer, share_str, default_yes=args.default_yes)

        if answer:
            self.client.basecommand.workspace.share(org=org, workspace_id=workspace_id, team=team)
        else:
            return
        self.printer.print_ok(
            f"Workspace '{workspace_id}' successfully shared with {share_entity_type} '{share_entity_name}'."
        )

    revoke_share_str = "Revoke workspace sharing with an org or team."

    @CLICommand.command(name="revoke-share", help=revoke_share_str, description=revoke_share_str)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    @CLICommand.arguments(
        "workspace_id", metavar="<workspace>", help="Workspace Name or ID", type=str, completer=workspace_id_completer
    )
    def revoke_share(self, args):  # noqa: D102
        self.config.validate_configuration()
        org = self.config.org_name
        team = self.config.team_name
        workspace_id = args.workspace_id

        (revoke_entity_type, revoke_entity_name) = share_targets(org, team)

        if team:
            share_str = "Do you want to revoke the sharing of workspace '{}' with team '{}'?".format(workspace_id, team)
        else:
            share_str = "Do you want to revoke the sharing of workspace '{}' with org '{}'?".format(workspace_id, org)
        answer = question_yes_no(self.printer, share_str, default_yes=args.default_yes)

        if answer:
            self.client.basecommand.workspace.revoke_share(org=org, workspace_id=workspace_id, team=team)
        else:
            return
        self.printer.print_ok(
            "Workspace share '{}' successfully revoked from {} '{}'.".format(
                workspace_id, revoke_entity_type, revoke_entity_name
            )
        )

    workspace_upload_str = "Upload files to a workspace."

    @CLICommand.command(help=workspace_upload_str, description=workspace_upload_str)
    @CLICommand.arguments(
        "workspace_id", metavar="<workspace>", help="Workspace Name or ID", type=str, completer=workspace_id_completer
    )
    @CLICommand.arguments(
        "--threads",
        metavar="<t>",
        help=(
            "Number of threads to be used while uploading the workspace (default: "
            f"{DEFAULT_UPLOAD_THREADS}, max: {MAX_UPLOAD_THREADS})"
        ),
        type=int,
        default=DEFAULT_UPLOAD_THREADS,
        action=valid_value(1, MAX_UPLOAD_THREADS, CLICommand.CLI_CLIENT),
    )
    @CLICommand.arguments(
        "--source",
        metavar="<path>",
        help="Provide the path to the file(s) to be uploaded.  Default: .",
        type=str,
        default=".",
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--destination",
        metavar="<path>",
        help="Provide a target directory within the workspace for the upload.  Default: /",
        type=str,
        default="/",
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--exclude",
        metavar="<wildcard>",
        action="append",
        default=[],
        help=(
            "Exclude files or directories from the source path. "
            "Supports standard Unix shell-style wildcards like (?, [abc], [!a-z], etc..). "
            "May be used multiple times in the same command."
        ),
    )
    @CLICommand.arguments(
        "--dry-run",
        help="List file paths, total upload size and file count without performing the upload.",
        action="store_true",
        default=False,
        dest="dry_run",
    )
    def upload(self, args):  # noqa: D102
        self.client.basecommand.workspace.upload(
            workspace_id=args.workspace_id,
            org=args.org,
            team=args.team,
            ace=args.ace,
            source=args.source,
            destination=args.destination,
            exclude=args.exclude,
            dry_run=args.dry_run,
            threads=args.threads,
        )

    workspace_download_str = "Download a workspace."

    @CLICommand.command(help=workspace_download_str, description=workspace_download_str)
    @CLICommand.arguments(
        "workspace",
        metavar="<workspace>",
        type=str,
        completer=workspace_id_completer,
        help="Workspace Name or ID",
    )
    @CLICommand.arguments(
        "--dest",
        metavar="<path>",
        help="Specify the path to store the downloaded workspace.  Default: .",
        type=str,
        default=".",
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--file",
        metavar="<path>",
        action="append",
        help=(
            "Specify file(s) to download. This flag can be used multiple times.\n"
            "If omitted, the entire workspace directory will be downloaded."
        ),
    )
    @CLICommand.arguments(
        "--dir",
        metavar="<path>",
        action="append",
        help=(
            "Specify one or more directories to download. "
            "If omitted, the entire workspace directory will be downloaded."
        ),
    )
    @CLICommand.arguments(
        "--zip", help="Download the entire dataset directory as a zip file.", dest="zip", action="store_true"
    )
    @CLICommand.arguments(
        "--dry-run",
        help="List total size of the download without performing the download.",
        action="store_true",
        default=False,
        dest="dry_run",
    )
    @CLICommand.mutex(["zip", "dry_run"], ["file", "dir"])
    def download(self, args):  # noqa: D102
        self.client.basecommand.workspace.download(
            workspace_id=args.workspace,
            org=args.org,
            team=args.team,
            ace=args.ace,
            dest=args.dest,
            files=args.file,
            dirs=args.dir,
            do_zip=args.zip,
            dry_run=args.dry_run,
        )


class WorkspaceNotFoundHandler:
    """Common handler for workspace not found exceptions."""

    def __init__(self, workspace_id):
        self._id = workspace_id

    def __enter__(self):  # noqa: D105
        pass

    def __exit__(self, _type, value, _traceback):  # noqa: D105
        if _type == ResourceNotFoundException:
            r = value.response
            msg = r.json()["requestStatus"]["statusDescription"] if r.content else f"Workspace {self._id} not found."
            raise NgcException(msg)
