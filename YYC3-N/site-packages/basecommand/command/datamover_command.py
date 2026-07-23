# Copyright (c) 2025, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from argparse import Namespace
import time

import requests.exceptions as rqes  # pylint: disable=requests-import

from basecommand.api.datamover import (
    BcpCopyActionType,
    BcpCopyType,
    BcpJob,
    BcpResourceType,
    JobState,
    ObjectProtocol,
)
from basecommand.command.base_command import BaseCommand
from basecommand.command.datamover.utils import (
    create_batch_job_request,
    create_workspace,
    DEFAULT_AWS_REGION,
    finish_dataset_copy,
    get_dataset_list,
    get_workspace_list,
    parse_azureblobprefixes_manifest,
    parse_ociprefixes_manifest,
    parse_resourceid_manifest,
    parse_s3url_manifest,
    sqs_proxy_endpoint,
    STORAGE_TYPE,
)
from basecommand.environ import NGC_CLI_DM_MANIFEST_ENABLE
from basecommand.printer.datamover import DataMoverPrinter
from ngcbase.command.args_validation import check_url, SingleUseAction
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import CANARY_ENV, CONFIG_TYPE, DISABLE_TYPE
from ngcbase.errors import NgcException
from ngcbase.util.io_utils import question_yes_no
from ngcbase.util.utils import get_environ_tag

MAX_BATCH_RESOURCES = 30
UPDATE_LOOP_INTERVAL_SECONDS = 10


class DataMoverCommand(BaseCommand):  # noqa: D101
    CMD_NAME = "datamover"
    HELP = "Data Mover Commands"
    DESC = "Data Mover commands to assist copying resources to/from an object storage or to another ACE"

    CLI_HELP = CONFIG_TYPE if (get_environ_tag() <= CANARY_ENV) else DISABLE_TYPE
    COMMAND_DISABLE = get_environ_tag() > CANARY_ENV

    CMD_ALIAS = ["dm"]

    origin = {
        "type": "local",
        "path": ["/data"],
    }

    protocol_help = f"Access protocol for the destination. Options: {', '.join(STORAGE_TYPE.keys())}."

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.make_bottom_commands(parser)
        self.config = self.client.config
        self.data_mover_api = self.client.basecommand.data_mover
        self.printer = DataMoverPrinter(self.client.config)

    enqueue_str = "Add copy job(s) to Data Mover queue."
    update_str = "Move available jobs to the next data movement stage."
    list_str = "List status of Data Mover jobs."

    @CLICommand.command(help=enqueue_str, description=enqueue_str)
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
        "--region",
        metavar="<region>",
        help=f"S3 region (optional). Default: {DEFAULT_AWS_REGION}. Only applies when --protocol is `s3`.",
        type=str,
        default=DEFAULT_AWS_REGION,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--account-name",
        metavar="<account-name>",
        help="Azure Blob account name. Only applies when --protocol is `azureblob`.",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--container",
        metavar="<container>",
        help="Azure Blob container name. Only applies when --protocol is `azureblob`.",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--service-url",
        metavar="<service-url>",
        help="Azure Blob service url (optional). Only applies when --protocol is `azureblob`.",
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
        "--secret",
        metavar="<secret>",
        help="NGC Secret object to use.",
        type=str,
        action=SingleUseAction,
        required=True,
    )
    @CLICommand.arguments(
        "--origin-instance",
        metavar="<origin-instance>",
        help="Instance to use for the data export.",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--destination-instance",
        metavar="<destination-instance>",
        help="Instance to use for the data import.",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--origin-ace",
        metavar="<origin-ace>",
        help="Origin ACE name",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--destination-ace",
        metavar="<destination-ace>",
        help="Destination ACE name",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--resource-type",
        metavar="<resource_type>",
        help="Type of resource to be copied. Options: dataset, workspace",
        type=str,
        choices=["dataset", "workspace"],
        action=SingleUseAction,
        required=True,
    )
    @CLICommand.arguments(
        "--manifest",
        metavar="<manifest>",
        help="Copy all resources from provided manifest file",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--id",
        metavar="<id>",
        help="Id of the single resource to be copied",
        type=str,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--all-from-org", help="Copy all resources from organization", action="store_true", default=False
    )
    @CLICommand.arguments("--all-from-team", help="Copy all resources from team", action="store_true", default=False)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    @CLICommand.mutex(["all-from-org"], ["all-from-team"], ["manifest"], ["id"])
    def enqueue(self, args):  # noqa: C901, D102
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        if args.origin_ace == "no-ace":
            args.origin_ace = None
        if args.destination_ace == "no-ace":
            args.destination_ace = None
        args.protocol = STORAGE_TYPE.get(args.protocol)
        # api-server expects a list of buckets and/or prefixes in batch requests, even if we're only copying a
        # single resource
        args.buckets = []
        args.prefixes = []
        args.containers = []
        args.generate_manifest = NGC_CLI_DM_MANIFEST_ENABLE

        self._validate_enqueue_args(org_name, team_name, args)

        import_job = bool(not args.origin_ace)
        prompt_msg = "This operation will enqueue a new copy job "

        if import_job:
            # import from object store
            if args.manifest:
                if args.protocol == ObjectProtocol.S3:
                    args.buckets, args.prefixes = parse_s3url_manifest(args.manifest)
                    prompt_msg += "for each S3 URL in your manifest file."
                elif args.protocol == ObjectProtocol.OCI_PREAUTH:
                    args.prefixes = parse_ociprefixes_manifest(args.manifest)
                    prompt_msg += "for each URL entry in your manifest file."
                elif args.protocol == ObjectProtocol.AZUREBLOB:
                    args.containers, args.prefixes = parse_azureblobprefixes_manifest(args.manifest)
                    prompt_msg += "for each Azure Blob URL entry in your manifest file."
            else:
                if args.bucket:
                    args.buckets.append(args.bucket)
                if args.prefix:
                    args.prefixes.append(args.prefix)
                if args.container:
                    args.containers.append(args.container)
                prompt_msg += f"to copy all your data from your {args.protocol} source."

            if not question_yes_no(
                self.printer,
                prompt_msg + " Are you sure you want to continue?",
                default="no",
                default_yes=args.default_yes,
            ):
                raise NgcException("Enqueue confirmation failed, cancelling.")

            self.data_mover_api.create_bcpcopies(org_name, team_name, None, args)
        else:
            # export or ace2ace use-cases
            resources = []
            if args.id:
                resources = iter([args.id])
                prompt_msg += f"for {args.resource_type} {args.id}."
            elif args.manifest:
                resources = iter(parse_resourceid_manifest(args.manifest))
                prompt_msg += "for each entry in your manifest file."
            elif args.all_from_org or args.all_from_team:
                if args.all_from_org:
                    team_name = None
                if args.resource_type == BcpResourceType.DATASET:
                    resources = get_dataset_list(self.client, args.origin_ace, org_name, team_name)
                if args.resource_type == BcpResourceType.WORKSPACE:
                    resources = get_workspace_list(self.client, args.origin_ace, org_name, team_name)

                if args.all_from_org:
                    prompt_msg += f"for each {args.resource_type} in org {org_name}."
                else:
                    prompt_msg += f"for each {args.resource_type} in team {team_name} from org {org_name}."
            else:
                raise ValueError("Must provide resource to copy")

            if not question_yes_no(
                self.printer,
                prompt_msg + " Are you sure you want to continue?",
                default="no",
                default_yes=args.default_yes,
            ):
                raise NgcException("Enqueue confirmation failed, cancelling.")

            # batch items in resources list
            rsc_list = []
            for item in resources:
                rsc_list.append(item)
                args.buckets.append(args.bucket)
                resource_str = f"dm{args.resource_type}{item}"
                args.prefixes.append(f"{args.prefix}/{resource_str}" if args.prefix else resource_str)
                args.containers.append(args.container)
                if len(rsc_list) == MAX_BATCH_RESOURCES:
                    self.data_mover_api.create_bcpcopies(org_name, team_name, rsc_list, args)
                    rsc_list = []

            # process remaining items
            if rsc_list:
                self.data_mover_api.create_bcpcopies(org_name, team_name, rsc_list, args)

        # always call update
        self.printer.print_ok("Successfully enqueued Data Mover copies.\nRunning `update`...")
        self._update()
        self.printer.print_ok(
            "Please remember to run the `update` command periodically until all your copies are finished."
        )

    @classmethod
    def _validate_enqueue_args(cls, org_name, team_name, args):  # noqa: C901
        if not org_name:
            raise ValueError("org name must be provided")

        if args.all_from_team and team_name is None:
            raise ValueError("if --all-from-team set, team name must be provided in --team flag")

        if args.id and (args.all_from_org or args.all_from_team):
            raise ValueError("--all-from-args and --all-from-teams can't be used together with --id")

        if not args.origin_ace and not args.destination_ace:
            raise ValueError("At least one of --origin-ace or --destination-ace must be provided")

        import_job = bool(not args.origin_ace)

        if import_job and (args.id or args.all_from_org or args.all_from_team):
            raise ValueError("when importing from object store, use either --manifest or --bucket and --prefix flags")

        if import_job and (args.all_from_org or args.all_from_team):
            raise ValueError("--all-from-args and --all-from-teams can't be used on import jobs")

        if args.manifest and (args.all_from_org or args.all_from_team):
            raise ValueError("'--manifest' cannot be specified with arguments: [--all-from-org, --all-from-team]")

        if args.protocol == ObjectProtocol.S3 and not args.endpoint:
            raise ValueError("--endpoint is required with s3 protocol")

        if args.protocol == ObjectProtocol.AZUREBLOB and not args.account_name:
            raise ValueError("--account-name is required with azureblob protocol")

        if import_job and args.manifest:
            if args.protocol == ObjectProtocol.S3 and (args.bucket or args.prefix):
                raise ValueError("when using --manifest to list buckets, don't use either --bucket or --prefix flag")
            if args.protocol == ObjectProtocol.OCI_PREAUTH and args.prefix:
                raise ValueError("when using --manifest to list OCI prefixes, don't use --prefix flag")
            if args.protocol == ObjectProtocol.AZUREBLOB and (args.container or args.prefix):
                raise ValueError(
                    "when using --manifest to list containers, don't use either --container or --prefix flag"
                )
        elif import_job:
            if args.protocol == ObjectProtocol.S3 and not args.bucket:
                raise ValueError(
                    f"--bucket is required when importing without a manifest through {args.protocol} protocol"
                )
            if args.protocol == ObjectProtocol.AZUREBLOB and not args.container:
                raise ValueError(
                    f"--container is required when importing without a manifest through {args.protocol} protocol"
                )
        elif not import_job:
            if args.protocol == ObjectProtocol.S3 and not args.bucket:
                raise ValueError(
                    f"--bucket is required when copying from a dataset or workspace through {args.protocol} protocol"
                )
            if args.protocol == ObjectProtocol.AZUREBLOB and not args.container:
                raise ValueError(
                    f"--container is required when copying from a dataset or workspace through {args.protocol} protocol"
                )
            if args.protocol != ObjectProtocol.AZUREBLOB and (args.account_name or args.container):
                raise ValueError(f"--account-name or --container cannot be specified with {args.protocol} protocol")

    def _update(self):
        for page in self.data_mover_api.get_bcpcopies(None, None, pending_action=True):
            for bcp_copy in page:
                if bcp_copy.action.type == BcpCopyActionType.CREATE:
                    try:
                        self.create_new_bcp_job(bcp_copy)
                    except Exception as e:  # noqa: W0703  pylint: disable=broad-except
                        self.printer.print_error(
                            f"An error occurred while trying to create BCP job for Data Mover copy {bcp_copy.id}: {e}"
                        )
                elif bcp_copy.action.type == BcpCopyActionType.FINISH:
                    try:
                        self.finish_dataset_copy(bcp_copy)
                    except Exception as e:  # noqa: W0703  pylint: disable=broad-except
                        self.printer.print_error(
                            "An error occurred while trying to convert resultset "
                            f"{bcp_copy.multi_stage_job.jobs[bcp_copy.action.job_index].bcp_job.tmp_resource_id} into "
                            f"dataset for Data Mover copy {bcp_copy.id}: {e}"
                        )

    def create_new_bcp_job(self, bcp_copy):  # noqa: D102
        action = bcp_copy.action
        msj = bcp_copy.multi_stage_job
        dm_job = msj.jobs[action.job_index]

        # determine if this is an import or export job:
        export = True
        if bcp_copy.bcp_copy_type == BcpCopyType.ACE2ACE:
            export = bool(action.job_index == 0)
        elif bcp_copy.bcp_copy_type == BcpCopyType.IMPORT:
            export = False
        elif bcp_copy.bcp_copy_type == BcpCopyType.EXPORT:
            export = True

        dm_job.bcp_job = BcpJob()

        if export:
            ace_name = bcp_copy.origin_ace
            instance = bcp_copy.origin_instance
            dm_job.bcp_job.origin_resource_type = bcp_copy.resource_type
            dm_job.bcp_job.origin_resource_id = bcp_copy.resource_id
        else:
            # import
            ace_name = bcp_copy.destination_ace
            instance = bcp_copy.destination_instance
            dm_job.bcp_job.destination_resource_type = bcp_copy.resource_type
            if bcp_copy.resource_type == BcpResourceType.DATASET:
                dm_job.bcp_job.tmp_resource_type = BcpResourceType.RESULTSET
            else:
                # Workspace import. Create workspace and assign its ID to the BCP Job
                original_workspace_id = bcp_copy.resource_id if bcp_copy.bcp_copy_type == BcpCopyType.ACE2ACE else None
                workspace = create_workspace(
                    bcp_client=self.client,
                    org_name=bcp_copy.bcp_org,
                    ace_name=ace_name,
                    original_workspace_id=original_workspace_id,
                    name=None,
                    desc=None,
                )
                dm_job.bcp_job.destination_resource_id = workspace.id

        secret = bcp_copy.secret
        jobs_args = Namespace(
            instance=instance,
            secret=secret,
        )

        request = create_batch_job_request(
            ace_name,
            f"{sqs_proxy_endpoint()}/{dm_job.id}",
            jobs_args,
            dm_job,
        )

        try:
            batch_job = self.client.basecommand.jobs.submit_job(
                org_name=bcp_copy.bcp_org, team_name=bcp_copy.bcp_team, job_create_request=request
            )
            dm_job.bcp_job.job_id = batch_job.id

        # Unsure what all the exceptions submit_job can raise, but we will reraise it
        except Exception as why:  # pylint: disable=broad-except
            if not export and bcp_copy.resource_type == BcpResourceType.WORKSPACE:
                try:
                    self.client.basecommand.workspace.remove_workspace(
                        org_name=bcp_copy.bcp_org, workspace_id=workspace.id
                    )
                # RuntimeError: catch anything not covered by the most likely errors that are listed below
                # ConnectionError and HTTPError: can occur when removing a workspace
                # Regardless of the error, we want to preserve the original
                # exception
                except (RuntimeError, rqes.RequestException, rqes.ConnectionError, rqes.HTTPError):
                    raise why from None
            raise

        if not export and bcp_copy.resource_type == BcpResourceType.DATASET:
            dm_job.bcp_job.tmp_resource_id = batch_job.id

        self.data_mover_api.update_job(job=dm_job, org_name=None, team_name=None)
        self.printer.print_ok(f"Created batch job {batch_job.id} for Data Mover copy {bcp_copy.id}")

    def finish_dataset_copy(self, bcp_copy):  # noqa: D102
        if bcp_copy.resource_type != BcpResourceType.DATASET:
            return

        if not bcp_copy.action or bcp_copy.action.type != BcpCopyActionType.FINISH:
            return

        job_detail = bcp_copy.multi_stage_job.jobs[bcp_copy.action.job_index]
        if job_detail.state != JobState.FINISHED:
            return

        original_dataset_id = bcp_copy.resource_id if bcp_copy.bcp_copy_type == BcpCopyType.ACE2ACE else None
        finish_dataset_copy(
            bcp_client=self.client,
            dm_client=self.data_mover_api,
            org_name=bcp_copy.bcp_org,
            team_name=bcp_copy.bcp_team,
            ace_name=bcp_copy.destination_ace,
            dm_job=job_detail,
            original_dataset_id=original_dataset_id,
            name=None,
            desc=None,
            bcp_copy=bcp_copy,
        )

    @CLICommand.arguments(
        "--loop",
        help="Run the update command in an endless loop.",
        action="store_true",
        default=False,
    )
    @CLICommand.arguments(
        "--interval",
        metavar="<seconds>",
        help=f"Interval in seconds for endless loop. Default: {UPDATE_LOOP_INTERVAL_SECONDS}",
        type=int,
        default=UPDATE_LOOP_INTERVAL_SECONDS,
    )
    @CLICommand.command(help=update_str, description=update_str)
    def update(self, args):  # noqa: D102
        while True:
            self._update()
            if not args.loop:
                break
            time.sleep(args.interval)

    @CLICommand.command(help=list_str, description=list_str)
    def list(self, args):  # pylint: disable=unused-argument  # noqa: D102
        self.printer.print_bcp_copies(self.data_mover_api.get_bcpcopies(None, None))
