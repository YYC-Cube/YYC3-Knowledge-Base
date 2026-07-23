#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from builtins import int
from itertools import chain
import logging
import sys

from basecommand.command.args_validation import DatasetSelector
from basecommand.command.base_command import BaseCommand
from basecommand.command.completers import (
    get_dataset_id_completer,
    get_job_id_completer,
)
from basecommand.data.api.StorageResourceStatusEnum import StorageResourceStatusEnum
from basecommand.printer.dataset import DatasetPrinter
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
    EXIT_CODES,
    LONG_MAX_VALUE,
    MAX_UPLOAD_THREADS,
    STAGING_ENV,
)
from ngcbase.errors import (
    AccessDeniedException,
    NgcException,
    ResourceNotFoundException,
)
from ngcbase.util.io_utils import question_yes_no
from ngcbase.util.utils import get_columns_help, get_environ_tag, share_targets

DATASET_LIST_PAGE_SIZE = 50

logger = logging.getLogger(__name__)


class DataCommand(BaseCommand, CLICommand):  # noqa: D101
    CMD_NAME = "dataset"
    HELP = "Data Commands"
    DESC = "Data Commands"

    CLI_HELP = CONFIG_TYPE
    COMMAND_DISABLE = False

    WARN_MSG = " (Warning: 'ngc dataset' is deprecated, use 'ngc base-command dataset'.)"
    WARN_COND = CLICommand if get_environ_tag() <= STAGING_ENV else None
    CMD_ALIAS = []

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.make_bottom_commands(parser)
        self.config = self.client.config
        self.search_api = self.client.basecommand.search
        self.printer = DatasetPrinter(self.client.config)

    data_list_str = "List all accessible datasets. Set ACE and team will be used to filter list."
    job_id_completer = get_job_id_completer(CLICommand.CLI_CLIENT)
    dataset_id_completer = get_dataset_id_completer(CLICommand.CLI_CLIENT)

    columns_dict = {
        "id": "Integer Id",
        "name": "Name",
        "org": "Org",
        "team": "Team",
        "modified": "Modified Date",
        "created": "Created Date",
        "creator": "Creator UserName",
        "description": "Description",
        "shared": "Shared",
        "owned": "Owned",
        "ace": "Ace",
        "status": "Status",
        "size": "Size",
        "prepop": "Pre-pop",
    }
    columns_default = ("uid", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)

    @CLICommand.command(help=data_list_str, description=data_list_str)
    @CLICommand.arguments("--owned", help="Include only owned datasets.", action="store_true", default=False)
    @CLICommand.arguments(
        "--prepopulated", help="Include only pre-populated datasets.", action="store_true", default=False
    )
    @CLICommand.arguments(
        "--name",
        metavar="<name>",
        help="Include only datasets with name <name>, wildcards '*' and '?' are allowed.",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--status",
        metavar="<status>",
        help="Include only datasets with status <status>. Options: %(choices)s.",
        type=str,
        default=None,
        choices=StorageResourceStatusEnum,
        action="append",
    )
    @CLICommand.arguments(
        "--all", help="(For administrators only) Show all datasets across all users.", action="store_true"
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
        ds_search_results = self.client.basecommand.dataset.list(
            org=args.org,
            team=args.team,
            ace=args.ace,
            owned=args.owned,
            list_all=args.all,
            name=args.name,
            status=args.status,
        )
        check_add_args_columns(args.column, DataCommand.columns_default)
        self.printer.print_dataset_list(
            ds_search_results, user_client_id, filter_prepopulated=args.prepopulated, columns=args.column
        )

    info_help = "Retrieve details of a dataset given dataset ID"

    @CLICommand.command(help=info_help, description=info_help)
    @CLICommand.arguments(
        "datasetid", metavar="<dataset id>", help="Dataset ID", type=str, completer=dataset_id_completer
    )
    @CLICommand.arguments(
        "--files",
        help="List files in addition to details for a dataset. Default value is False",
        dest="list_files",
        action="store_true",
        default=False,
    )
    def info(self, args):  # noqa: D102
        dataset_generator = self.client.basecommand.dataset.info(
            dataset_id=args.datasetid,
            org=args.org,
            team=args.team,
            ace=args.ace,
        )
        # peek the first item of the generator
        first_dataset = next(dataset_generator, None)
        dataset_generator = chain([first_dataset], dataset_generator)

        if first_dataset:
            creator_user = None
            try:
                creator_details = self.client.users.get_user_details(
                    org_name=self.config.org_name,
                    team_name=self.config.team_name,
                    user_id=first_dataset.creatorUserId,
                )
                creator_user = creator_details.user
            except (ResourceNotFoundException, AccessDeniedException):
                # Creator could not be found, or is not in current user's org (eg public datasets)
                # This is fine, just don't attempt to print the creator information
                pass

            first_dataset.creator = creator_user.name if creator_user else ""
            first_dataset.email = creator_user.email if creator_user else ""

            cur_user = self.client.users.user_who(self.config.org_name).user
            self.printer.print_dataset_details(first_dataset, cur_user.id, dataset_generator, args.list_files)
        else:
            raise NgcException("Dataset response is empty.")

    data_share_str = "Share a dataset with an org or team. If team is set it will be shared with that team."

    @CLICommand.command(name="share", help=data_share_str, description=data_share_str)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    @CLICommand.arguments(
        "datasetid", metavar="<dataset id>", help="Dataset ID", type=str, completer=dataset_id_completer
    )
    def share(self, args):  # noqa: D102
        self.config.validate_configuration()
        config_org = self.config.org_name
        target_team = self.config.team_name

        (share_entity_type, share_entity_name) = share_targets(config_org, target_team)

        if target_team:
            share_str = "Share dataset '{}' with team '{}'?".format(args.datasetid, target_team)
        else:
            share_str = "Share dataset '{}' with org '{}'?".format(args.datasetid, config_org)

        answer = question_yes_no(self.printer, share_str, default_yes=args.default_yes)
        if answer:
            self.client.basecommand.dataset.share(org=config_org, dataset_id=args.datasetid, team=target_team)
        else:
            return

        self.printer.print_ok(
            f"Dataset '{args.datasetid}' successfully shared with {share_entity_type} '{share_entity_name}'."
        )

    data_revoke_share_str = "Revoke dataset sharing with an org or team."

    @CLICommand.command(name="revoke-share", help=data_revoke_share_str, description=data_revoke_share_str)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    @CLICommand.arguments(
        "datasetid", metavar="<dataset id>", help="Dataset ID", type=str, completer=dataset_id_completer
    )
    def revoke_share(self, args):  # noqa: D102
        self.config.validate_configuration()
        config_org = self.config.org_name
        target_team = self.config.team_name

        (revoke_entity_type, revoke_entity_name) = share_targets(config_org, target_team)

        share_str = "Revoke the sharing of dataset '{}' with {} '{}'?".format(
            args.datasetid, "team" if target_team else "org", target_team or config_org
        )
        answer = question_yes_no(self.printer, share_str, default_yes=args.default_yes)
        if answer:
            self.client.basecommand.dataset.revoke_share(org=config_org, dataset_id=args.datasetid, team=target_team)
        else:
            return

        self.printer.print_ok(
            f"Dataset '{args.datasetid}' share successfully revoked from {revoke_entity_type} '{revoke_entity_name}'."
        )

    data_upload_str = "Upload a dataset to a given ACE. Dataset will be local to the set ACE."

    @CLICommand.command(help=data_upload_str, description=data_upload_str)
    @CLICommand.arguments("name", metavar="<dataset>", help="Dataset Name or ID", type=str)
    @CLICommand.arguments("--desc", metavar="<desc>", help="Dataset Description", type=str, action=SingleUseAction)
    @CLICommand.arguments(
        "--source",
        metavar="<path>",
        help="Path to the file(s) to be uploaded.  Default: .",
        type=str,
        default=".",
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--threads",
        metavar="<t>",
        help="Number of threads to be used while uploading the dataset (default: {}, max: {})".format(
            DEFAULT_UPLOAD_THREADS, MAX_UPLOAD_THREADS
        ),
        type=int,
        default=DEFAULT_UPLOAD_THREADS,
        action=valid_value(1, MAX_UPLOAD_THREADS, CLICommand.CLI_CLIENT),
    )
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    @CLICommand.arguments("--omit-links", help="Do not follow symbolic links.", action="store_true", default=False)
    @CLICommand.arguments(
        "--dry-run",
        help="List file paths, total upload size and file count without performing the upload.",
        action="store_true",
        default=False,
        dest="dry_run",
    )
    @CLICommand.arguments(
        "--share",
        metavar="<team>",
        action="append",
        type=str,
        nargs="?",
        help=(
            "Share the dataset with a team after upload. Can be used multiple times. If no team "
            "is specified, the currently set team will be used."
        ),
    )
    def upload(self, args):  # noqa: D102
        self.client.basecommand.dataset.upload(
            name=args.name,
            org=args.org,
            team=args.team,
            ace=args.ace,
            desc=args.desc,
            source=args.source,
            threads=args.threads,
            default_yes=args.default_yes,
            omit_links=args.omit_links,
            dry_run=args.dry_run,
            share=args.share,
        )

    data_download_str = "Download datasets by ID."

    @CLICommand.command(help=data_download_str, description=data_download_str)
    @CLICommand.arguments(
        "datasetid",
        metavar="<dataset id>",
        completer=dataset_id_completer,
        type=str,
        help="Dataset ID",
    )
    @CLICommand.arguments(
        "--dest",
        metavar="<path>",
        type=str,
        default=".",
        help="Specify the path to store the downloaded files.  Default: .",
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--file",
        metavar="<wildcard>",
        action="append",
        help=(
            "Specify individual files to download from the dataset.\n"
            "Supports standard Unix shell-style wildcards like (?, [abc], [!a-z], etc..) "
            "May be used multiple times in the same command."
        ),
    )
    # TODO: Add additional support for a txt file.
    @CLICommand.arguments(
        "--resume",
        metavar="<resume>",
        type=str,
        help=(
            "Resume the download for the dataset. "
            "Specify the file name saved by the download. "
            "Files will be downloaded to the directory of the file name."
        ),
    )
    @CLICommand.arguments(
        "--dir",
        metavar="<wildcard>",
        action="append",
        help=(
            "Specify directories to download from dataset. "
            "Supports standard Unix shell-style wildcards like (?, [abc], [!a-z], etc..) "
            "May be used multiple times in the same command."
        ),
    )
    @CLICommand.arguments(
        "--zip", help="Download the entire dataset directory as a zip file.", dest="zip", action="store_true"
    )
    @CLICommand.arguments(
        "--exclude",
        metavar="<wildcard>",
        action="append",
        help=(
            "Exclude files or directories from the downloaded dataset. "
            "Supports standard Unix shell-style wildcards like (?, [abc], [!a-z], etc..). "
            "May be used multiple times in the same command."
        ),
    )
    @CLICommand.arguments(
        "--dry-run",
        help="List total size of the download without performing the download.",
        action="store_true",
        default=False,
        dest="dry_run",
    )
    @CLICommand.mutex(["zip"], ["file", "dir", "exclude"], ["resume"])
    def download(self, args):  # noqa: D102
        self.client.basecommand.dataset.download(
            dataset_id=args.datasetid,
            org=args.org,
            team=args.team,
            ace=args.ace,
            dest=args.dest,
            files=args.file,
            resume=args.resume,
            dirs=args.dir,
            do_zip=args.zip,
            exclude=args.exclude,
            dry_run=args.dry_run,
        )

    remove_dataset_str = "Remove a dataset."

    @CLICommand.command(name="remove", help=remove_dataset_str, description=remove_dataset_str)
    @CLICommand.arguments(
        "datasetids",
        metavar="<datasetid|datasetrange|datasetlist>",
        help=(
            "Dataset ID(s). Valid Examples: '1-5', '333', '1,2', '1,10-15'. Do not include any spaces between IDs."
            " Dataset range is not supported while using Data Platform API."
        ),
        completer=dataset_id_completer,
        type=str,
        action=DatasetSelector,
        minimum=0,
        maximum=LONG_MAX_VALUE,
    )
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    def remove(self, args):  # noqa: D102
        is_error = self.client.basecommand.dataset.remove(
            ids=args.datasetids, org=args.org, team=args.team, ace=args.ace, default_yes=args.default_yes
        )

        if is_error:
            sys.exit(EXIT_CODES["GENERAL_ERROR"])

    convert_dataset_str = "Convert data from a variety of sources to a dataset in the set ACE."

    @CLICommand.command(name="convert", help=convert_dataset_str, description=convert_dataset_str)
    @CLICommand.arguments("name", metavar="<name>", help="Dataset Name", type=str)
    @CLICommand.arguments(
        "--desc", metavar="<desc>", help="Provide a description for the dataset.", type=str, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--from-result",
        metavar="<id>",
        help=(
            "Job result to convert to a dataset. Must be in the same ACE as target. "
            "Result files are no longer available after conversion."
        ),
        type=int,
        default=None,
        required=True,
        completer=job_id_completer,
    )
    def convert_dataset(self, args):  # noqa: D102
        dataset = self.client.basecommand.dataset.convert(
            name=args.name,
            result=args.from_result,
            org=args.org,
            team=args.team,
            ace=args.ace,
            desc=args.desc,
        )
        self.printer.print_head("Dataset with ID: '{0}' created in ACE: '{1}'.".format(dataset.id, dataset.aceName))
