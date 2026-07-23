#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from argparse import SUPPRESS

import requests.exceptions as rqes  # pylint: disable=requests-import

from basecommand.api.datamover import BcpJob, BcpJobType, BcpResourceType
from basecommand.command.workspace import WorkspaceCommand
from basecommand.environ import NGC_CLI_DM_MANIFEST_ENABLE
from basecommand.printer.datamover import DataMoverPrinter
from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_url,
    check_valid_columns,
    SingleUseAction,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import DISABLE_TYPE, ENABLE_TYPE, STAGING_ENV
from ngcbase.errors import MissingConfigFileException, ResourceNotFoundException
from ngcbase.util.utils import get_columns_help, get_environ_tag

from .utils import (
    create_batch_job_request,
    create_workspace,
    DEFAULT_AWS_REGION,
    filter_paginated_jobs,
    job_list_columns,
    parse_storage_arguments,
    sqs_proxy_endpoint,
    STORAGE_TYPE,
)

# TODO: Azure - remove conditional in `help` once we're go for production
INVOKE_FLAG = ENABLE_TYPE if (get_environ_tag() <= STAGING_ENV) else DISABLE_TYPE
if get_environ_tag() > STAGING_ENV and "azureblob" in STORAGE_TYPE:
    del STORAGE_TYPE["azureblob"]


class WorkspaceImportSubCommand(WorkspaceCommand):  # noqa: D101
    CMD_NAME = "import"
    HELP = "Import data from an external storage system as a workspace in an ACE"
    DESC = "Workspace Import Commands"

    destination = {
        "type": "local",
        "path": ["/workspace"],
    }

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.data_mover_api = self.client.basecommand.data_mover
        self.printer = DataMoverPrinter(self.client.config)

    import_info_str = "Status of the import job."
    import_list_str = "List all workspace import jobs"
    import_run_str = "Import of a workspace from an object store into the ACE."

    protocol_help = f"Access protocol for the source. Options: {', '.join(STORAGE_TYPE.keys())}."
    list_columns_dict = job_list_columns()
    columns_default = ("id", "Id")
    list_columns_help = get_columns_help(list_columns_dict, columns_default)

    # pylint:disable=undefined-variable
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=list_columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=list_columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.command(help=import_list_str, description=import_list_str)
    def list(self, args):  # noqa: D102
        self.config.validate_configuration(csv_allowed=True)
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        jobs = self.data_mover_api.list_jobs(org_name=org_name, team_name=team_name, job_type=BcpJobType.IMPORT)
        check_add_args_columns(args.column, WorkspaceImportSubCommand.columns_default)
        self.printer.print_jobs_list(
            filter_paginated_jobs(jobs, BcpJobType.IMPORT, BcpResourceType.WORKSPACE), columns=args.column
        )

    @CLICommand.arguments(
        "--protocol",
        metavar="<protocol>",
        help=protocol_help,
        type=str,
        default="s3",
        action=SingleUseAction,
        # pylint:disable=dict-keys-not-iterating
        choices=STORAGE_TYPE.keys(),
        required=True,
    )
    @CLICommand.arguments(
        "--endpoint",
        metavar="<endpoint>",
        help="S3 endpoint. Only applies when --protocol is `s3`.",
        type=check_url,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--bucket",
        metavar="<bucket>",
        help="S3 bucket name. Only applies when --protocol is `s3`.",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--prefix",
        metavar="<prefix>",
        help="Object prefix. Enables copying a subset of all objects in a location",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--region",
        metavar="<region>",
        help=f"S3 region (optional). Default: {DEFAULT_AWS_REGION}. Only applies when --protocol is `s3`.",
        type=str,
        default=DEFAULT_AWS_REGION,
        action=SingleUseAction,
    )
    # TODO: Azure - remove conditional in `help` once we're go for production
    @CLICommand.arguments(
        "--account-name",
        metavar="<account-name>",
        help=(
            "Azure Blob account name. Only applies when --protocol is `azureblob`."
            if (get_environ_tag() <= STAGING_ENV)
            else SUPPRESS
        ),
        type=str,
        action=SingleUseAction,
    )
    # TODO: Azure - remove conditional in `help` once we're go for production
    @CLICommand.arguments(
        "--container",
        metavar="<container>",
        help=(
            "Azure Blob container name. Only applies when --protocol is `azureblob`."
            if (get_environ_tag() <= STAGING_ENV)
            else SUPPRESS
        ),
        type=str,
        action=SingleUseAction,
    )
    # TODO: Azure - remove conditional in `help` once we're go for production
    @CLICommand.arguments(
        "--service-url",
        metavar="<service-url>",
        help=(
            "Azure Blob service url (optional). Only applies when --protocol is `azureblob`."
            if (get_environ_tag() <= STAGING_ENV)
            else SUPPRESS
        ),
        type=check_url,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--secret",
        metavar="<secret>",
        help="NGC Secret object to use.",
        type=str,
        action=SingleUseAction,
        required=True,
    )
    @CLICommand.arguments(
        "--instance",
        metavar="<instance>",
        help="Instance to use for the data import.",
        type=str,
        action=SingleUseAction,
        required=True,
    )
    @CLICommand.arguments(
        "--from-workspace",
        metavar="<id>",
        help=(
            "Workspace to import metadata from. Used during ACE to ACE copies, typically after having run a workspace "
            "export. Imported metadata: name, description, sharing information."
        ),
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--name",
        metavar="<name>",
        help="Workspace Name. If used together with --from-workspace, --name takes precedence.",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--desc",
        metavar="<desc>",
        help="Workspace Description. If used together with --from-workspace, --desc takes precedence.",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.command(help=import_run_str, description=import_run_str)
    def run(self, args):  # noqa: D102
        # Create a data-movement job,
        self.config.validate_configuration(csv_allowed=True)
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        ace_name = args.ace or self.config.ace_name
        origin = parse_storage_arguments(args, self.client.secrets)

        if not ace_name:
            raise MissingConfigFileException(
                "Provide ACE name using --ace option, or set ACE name using ngc config set."
            )

        if not args.from_workspace and not args.name:
            raise MissingConfigFileException(
                "Provide Workspace name using --name option, or workspace id using --from-workspace option"
            )

        # Before submitting DM job, create the workspace
        workspace = create_workspace(
            self.client, org_name, ace_name, args.from_workspace, args.name, args.desc, preserve_ownership=False
        )

        dm_job = self.data_mover_api.create_job(
            origin=origin,
            destination=WorkspaceImportSubCommand.destination,
            org_name=org_name,
            team_name=team_name,
            generate_manifest=NGC_CLI_DM_MANIFEST_ENABLE,
        )
        dm_job.bcp_job = BcpJob(
            destination_resource_type=BcpResourceType.WORKSPACE,
            destination_resource_id=workspace.id,
        )
        try:
            request = create_batch_job_request(ace_name, f"{sqs_proxy_endpoint()}/{dm_job.id}", args, dm_job)
            batch_job = self.client.basecommand.jobs.submit_job(
                org_name=org_name, team_name=team_name, job_create_request=request
            )
            dm_job.bcp_job.job_id = batch_job.id

        # Unsure what all the exceptions submit_job can raise, but we will reraise it
        except Exception as why:  # pylint: disable=broad-except
            try:
                self.data_mover_api.delete_job(job_id=dm_job.id, org_name=org_name, team_name=team_name, force=True)
                self.client.basecommand.workspace.remove_workspace(org_name=org_name, workspace_id=workspace.id)
            # RuntimeError: catch anything not covered by the most likely errors that are listed below
            # ConnectionError and HTTPError: can occur when removing a workspace
            # Regardless of the error, we want to preserve the original
            # exception
            except (RuntimeError, rqes.RequestException, rqes.ConnectionError, rqes.HTTPError):
                raise why from None
            raise

        self.data_mover_api.update_job(job=dm_job, org_name=org_name, team_name=team_name)
        self.printer.print_job(dm_job)

    @CLICommand.arguments("jobid", metavar="<job_id>", help="Job ID.", type=str)
    @CLICommand.command(help=import_info_str, description=import_info_str)
    def info(self, args):  # noqa: D102
        self.config.validate_configuration(csv_allowed=True)
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        job = self.data_mover_api.get_job(job_id=args.jobid, org_name=org_name, team_name=team_name, bcp_job=True)
        if job.bcp_job.destination_resource_type != BcpResourceType.WORKSPACE:
            raise ResourceNotFoundException(f"Workspace import job {args.jobid} could not be found")
        self.printer.print_job(job)
