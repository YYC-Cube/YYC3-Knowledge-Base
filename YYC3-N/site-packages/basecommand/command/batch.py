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

from __future__ import division

from builtins import round
import logging
import os
import sys
import threading
import time

from isodate import duration_isoformat

from basecommand.api.dockerwrappers import ContainerWrapper
from basecommand.api.kubewrappers import KubeWrapper
from basecommand.api.utils import JobTarget
from basecommand.command.args_validation import (
    check_batch_datasetid,
    check_batch_label,
    check_batch_label_match,
    check_batch_reason,
    check_batch_workspaceid,
    check_job_submit_json_file,
    check_port_mapping,
    check_secret_pattern,
    check_shell_support,
    JobSelector,
)
from basecommand.command.base_command import BaseCommand
from basecommand.command.completers import (
    get_dataset_id_completer,
    get_job_id_completer,
    get_workspace_id_completer,
)
from basecommand.constants import (
    DEFAULT_INTERVAL_TIME,
    DEFAULT_INTERVAL_UNIT,
    DEFAULT_STATISTIC_TYPE,
    JOB_LIST_REFRESH_VALUES,
    JOB_RESOURCE_VALUES,
    RUNNING_STATES,
    SHELL_BUFFER_SECONDS,
    SHELL_START_DEADLINE_DEFAULT,
    SHELL_TOTAL_RUNTIME_DEFAULT,
    SHELL_WARNING_SECONDS,
    STATES_BEFORE_RUNNING,
    STATES_BEFORE_TERMINAL,
    TELEMETRY_TYPE_ENUM,
    TELEMETRY_TYPE_ENUM_STG,
    TERMINAL_STATES,
)
from basecommand.data.api.JobArrayTypeEnum import JobArrayTypeEnum
from basecommand.data.api.JobFlowTypeEnum import JobFlowTypeEnum
from basecommand.data.api.JobPriorityEnum import JobPriorityEnum
from basecommand.data.api.JobRunPolicy import JobRunPolicy
from basecommand.data.api.JobStatusEnum import JobStatusEnum
from basecommand.data.api.NetworkProtocolEnum import NetworkProtocolEnum
from basecommand.data.api.NetworkTypeEnum import NetworkTypeEnum
from basecommand.errors import JobTimeoutException
from basecommand.printer.batch import BatchPrinter
from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_dhms_duration,
    check_dhms_valid_past_time_range,
    check_key_value_pattern,
    check_positive_int_32_bit,
    check_range,
    check_valid_columns,
    check_ymd_hms_datetime,
    SingleUseAction,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import (
    BUILD_ENV,
    CANARY_ENV,
    CONFIG_TYPE,
    EXIT_CODES,
    LONG_MAX_VALUE,
    PRODUCTION_ENV,
    STAGING_ENV,
)
from ngcbase.errors import InvalidArgumentError, NgcException, ResourceNotFoundException
from ngcbase.util.datetime_utils import (
    calculate_date_range,
    dhms_to_isoduration,
    diff_in_minutes,
    human_time,
)
from ngcbase.util.utils import clear, get_columns_help, get_environ_tag

logger = logging.getLogger(__name__)

if sys.platform == "win32":
    try:
        from colorama import init

        init()
    except ImportError as error:
        logger.debug(error)

# job status line max length
# Job Status: FAILED_RUN_LIMIT_EXCEEDED (Press Ctrl-C to exit, kill job)..........
job_status_max = " " * 80

# TODO we need to get this from schema and/or CAS.
# For this iteration, we will only meet REQ-T5 in the multi-node SRD.
# For a first cut, we should add these values into an enum in the scheme.
# To meet later requirments, we will need to query the target ACE for valid values.
TOPOLOGY_CONSTRAINT_ENUM = ["pack", "any"]


class Batch(BaseCommand, CLICommand):  # noqa: D101
    CMD_NAME = "batch"
    HELP = "Job Commands"
    DESC = "Job Commands"

    CLI_HELP = CONFIG_TYPE
    COMMAND_DISABLE = False

    WARN_MSG = " (Warning: 'ngc batch' is deprecated, use 'ngc base-command job'.)"
    WARN_COND = CLICommand if get_environ_tag() <= STAGING_ENV else None
    CMD_ALIAS = []
    CMD_ALT_NAME = "job"
    CMD_ALT_COND = BaseCommand

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.make_bottom_commands(parser)

    @property
    def batch_printer(self):
        """Printer."""
        return BatchPrinter(self.client.config)

    interval_min = JOB_LIST_REFRESH_VALUES["intervalInSecondsMin"]
    interval_max = JOB_LIST_REFRESH_VALUES["intervalInSecondsMax"]
    job_status_list = JobStatusEnum
    job_id_completer = get_job_id_completer(CLICommand.CLI_CLIENT)
    dataset_id_completer = get_dataset_id_completer(CLICommand.CLI_CLIENT)
    workspace_id_completer = get_workspace_id_completer(CLICommand.CLI_CLIENT)

    list_jobs_str = (
        "List all jobs belonging to the user in the last week, filtered by configured ACE and team "
        "name. "
        "You can also specify the time range using up to two of the options --begin-time, --end-time,"
        " and --duration.  "
        "Acceptable combinations include:  "
        "--begin-time <t> --end-time <t> (time range is between begin-time and end-time),  "
        "--begin-time <t> --duration <t> (time range is for a period specified by duration after "
        "begin-time),  "
        "--end-time <t> --duration <t>  (time range is for a period specified by duration up to "
        "end-time),  "
        "--end-time <t> (time range is a period of 7 days before end-time),  "
        "--begin-time <t> (time range is between begin-time and now),  "
        "--duration <t>  (time range is the specified amount of time before now)"
    )
    list_label_help = (
        "Filter listed jobs by the label. Multiple label arguments are allowed, support standard Unix "
        "shell-style wildcards like '*' and '?'."
    )
    list_exclude_help = (
        "Exclude listed jobs by the label. Multiple exclude label arguments are allowed, support "
        "standard Unix shell-style wildcards like '*' and '?'. Filters jobs without labels."
    )

    columns_dict = {
        "replicas": "Replicas",
        "name": "Name",
        "submitted": "Submitted By",
        "status": "Status",
        "details": "Status Details",
        "type": "Status Type",
        "created": "Created",
        "started": "Started",
        "ended": "Ended",
        "termination": "Termination",
        "ace": "Ace",
        "team": "Team",
        "org": "Org",
        "instance": "Instance Name",
        "duration": "Duration",
        "reason": "Termination Reason",
        "labels": "Labels",
        "locked": "Labels Locked",
        "order": "Order",
        "priority": "Priority",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)

    @CLICommand.command(help=list_jobs_str, description=list_jobs_str)
    @CLICommand.arguments(
        "--all", help="(For administrators only) Show all jobs across all users.", action="store_true"
    )
    @CLICommand.arguments("--long", help="Include additional information in the job status table.", action="store_true")
    @CLICommand.arguments(
        "--duration",
        metavar="<t>",
        help=(
            "Specifies the duration of time, either after begin-time or before end-time, for listing"
            " jobs created. Format: [nD][nH][nM][nS]. Default: 7 days"
        ),
        type=str,
        action=check_dhms_valid_past_time_range(),
    )
    @CLICommand.arguments(
        "--end-time",
        metavar="<t>",
        help="Specifies the period end time for listing jobs created. Format: [yyyy-MM-dd::HH:mm:ss]. Default: now",
        type=str,
        action=check_ymd_hms_datetime(),
    )
    @CLICommand.arguments(
        "--begin-time",
        metavar="<t>",
        help="Specifies the start time for listing jobs created. Format: [yyyy-MM-dd::HH:mm:ss].",
        type=str,
        action=check_ymd_hms_datetime(),
    )
    @CLICommand.arguments("--refresh", action="store_true", help="Enables refreshing of list.")
    @CLICommand.arguments(
        "--interval",
        metavar="<num>",
        help="Refresh interval in seconds. Allowed range [%d-%d]" % (interval_min, interval_max)
        + " Default: %(default)s",
        type=int,
        default=5,
        action=check_range(interval_min, interval_max),
    )
    @CLICommand.arguments(
        "--status",
        metavar="<s>",
        help="Filter jobs listed according to input status. Options: %(choices)s",
        default=None,
        type=str,
        choices=job_status_list,
        action="append",
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
    @CLICommand.arguments(
        "--label", metavar="<label>", help=list_label_help, type=check_batch_label_match, action="extend"
    )
    @CLICommand.arguments(
        "--exclude-label", metavar="<label>", help=list_exclude_help, type=check_batch_label_match, action="extend"
    )
    @CLICommand.arguments(
        "--priority",
        metavar="<priority>",
        help="Filter jobs listed according to priority. Options: %(choices)s",
        default=None,
        type=str,
        choices=JobPriorityEnum,
        action="append",
    )
    def list(self, args):  # noqa: D102
        check_add_args_columns(args.column, Batch.columns_default)
        heading_prefix = "All" if args.all else "My"

        while True:
            # date range is calculated in the while loop to allow the --refresh option to see new jobs.

            list_of_jobs = self.client.basecommand.jobs.list(
                org=args.org,
                team=args.team,
                ace=args.ace,
                list_all=args.all,
                duration=args.duration,
                end_time=args.end_time,
                begin_time=args.begin_time,
                status=args.status,
                labels=args.label,
                exclude_labels=args.exclude_label,
                priority=args.priority,
            )

            if args.refresh:
                # if output is not redirected then clear the screen
                if sys.stdout.isatty():
                    clear()

                try:
                    (from_date, to_date) = calculate_date_range(args.begin_time, args.end_time, args.duration)
                except Exception as e:
                    raise NgcException(e) from None

                self.batch_printer.print_ok(
                    "{} Jobs submitted in the last {}".format(
                        heading_prefix, human_time(diff_in_minutes(from_date, to_date).total_seconds())
                    )
                )

            # print jobs status
            if args.long:
                self.batch_printer.print_job_status_table(list_of_jobs, columns=args.column)
            else:
                if args.all:
                    self.batch_printer.print_job_status_short_table(list_of_jobs, all_users=True, columns=args.column)
                else:
                    self.batch_printer.print_job_status_short_table(list_of_jobs, all_users=False, columns=args.column)

            if args.refresh:
                sys.stdout.write("Press Ctrl-C to exit ")
                sys.stdout.flush()
                # float division expected
                sleep = args.interval / 10
                for _ in range(0, 10, 1):
                    sys.stdout.write(".")
                    sys.stdout.flush()
                    time.sleep(sleep)
            else:
                break

    batch_preempt_help = (
        "Preempt the job. This begins a graceful shutdown of a job. Once preempted, the job will remain in a PREEMPTED "
        "state until acted on to resume or kill the job. "
    )

    @CLICommand.command(help=batch_preempt_help, description=batch_preempt_help)
    @CLICommand.arguments("jobid", metavar="<job id>", help="Job ID", type=int, completer=job_id_completer)
    def preempt(self, args):  # noqa: D102
        try:
            self.client.basecommand.jobs.preempt(job_id=args.jobid, org=args.org, team=args.team)
            self.batch_printer.print_ok("Submitted job preempt request for Job ID: '{0}'".format(args.jobid))
        # There are too many errors that can occur when preempting a job to be listed individually
        except Exception as why:  # pylint: disable=broad-except
            self.batch_printer.print_error("Preemption of job ID: '{0}' failed: {1}".format(args.jobid, str(why)))
            sys.exit(1)

    batch_resume_help = (
        "Resume the preempted job. This takes the job in PREEMPTED state and resubmits the job in the queue."
    )

    @CLICommand.command(help=batch_resume_help, description=batch_resume_help)
    @CLICommand.arguments("jobid", metavar="<job id>", help="Job ID", type=int, completer=job_id_completer)
    def resume(self, args):  # noqa: D102
        try:
            self.client.basecommand.jobs.resume(job_id=args.jobid, org=args.org, team=args.team)
            self.batch_printer.print_ok("Submitted job resume request for Job ID: '{0}'".format(args.jobid))
        # There are too many errors that can occur when resuming a job to be listed individually
        except Exception as why:  # pylint: disable=broad-except
            self.batch_printer.print_error("Resume of job ID: '{0}' failed: {1}".format(args.jobid, str(why)))
            sys.exit(1)

    def _may_set_workspace_name(self, org_name, workspace):
        workspace_name = None
        try:
            workspace_name = self.client.basecommand.workspace.get_workspace(
                org_name=org_name, workspace_id=workspace.id
            ).name
        except ResourceNotFoundException:
            # if the workspace is removed, we silently want to ignore the error in that case
            pass
        finally:
            if workspace_name:
                setattr(workspace, "name", workspace_name)
        return workspace

    run_job_help = "Submit a new job. ACE must be set to run this command."
    shell_help = (
        "Automatically exec into the running container once the job starts with an optionally "
        "supplied command (defaults to /bin/bash). If --commandline is not supplied with "
        "this option, 'sleep' will be used to hold the container open. --total-runtime controls "
        "the duration of the sleep command and defaults to {}.".format(SHELL_TOTAL_RUNTIME_DEFAULT)
    )
    port_help = (
        "Set ports to open on the docker container. Ports on the host do not need to be specified.\n"
        "Allowed range for containerPort is "
        f"[{JOB_RESOURCE_VALUES['containerPortMin']}-{JOB_RESOURCE_VALUES['containerPortNotAllowed'] - 1}]"
        f"[{JOB_RESOURCE_VALUES['containerPortNotAllowed'] + 1}-{JOB_RESOURCE_VALUES['containerPortMax']}]. "
        "Multiple port arguments are allowed.\n"
        "ACEs that allow exposed port supports the format name:containerPort/protocol. "
        f"Choices for the protocol are: {', '.join(NetworkProtocolEnum)}. "
        "Name must contain only alphanumeric characters, start with an alphabet and be no more than 10 chars. "
        "HTTPS and GRPC protocols do not support name. HTTPS is applied if the protocol is not specfied."
    )
    label_help = (
        "Specify labels for the job. Multiple label arguments are allowed. "
        "Labels must start with alphabetic characters or '_' and valid characters are "
        "alphanumeric and '_'. It must be no more than 256 characters. "
        "Reserved labels start with '_'. "
        "System labels start with '__' and only admins can assign or remove system labels. "
        "A maximum of 20 user, reserved or system labels are allowed."
    )
    secret_help = (
        "Specify secret name for the job. Multiple secret arguments are allowed. "
        "Unless specified all key value pairs will be included in the job. "
        "Optionally per key-value pair, overrides of the key are available. "
    )
    custom_env_variable_help = (
        "A custom env variable to add to job in the form of a key-pair"
        "A key name must be between 1-63 characters and contain letters, numbers or ./-_"
        " May be used multiple times in the same command."
    )

    @CLICommand.command(help=run_job_help, description=run_job_help)
    @CLICommand.arguments(
        "-n", "--name", metavar="<name>", help="Set a job name.", default=None, type=str, action=SingleUseAction
    )
    @CLICommand.arguments(
        "-i", "--image", metavar="<url>", help="Set a docker image URL.", default=None, type=str, action=SingleUseAction
    )
    @CLICommand.arguments(
        "-f",
        "--file",
        metavar="<file>",
        help="Submit a new job using a JSON File (other arguments will override corresponding json values).",
        default=None,
        action=check_job_submit_json_file(),
    )
    @CLICommand.arguments(
        "-c",
        "--commandline",
        metavar="<c>",
        help="Provide a command for the job to run.",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--entrypoint",
        metavar="<entry>",
        help="Overwrite the default `ENTRYPOINT` set by the image.",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--use-image-entrypoint",
        help="Use the `ENTRYPOINT` defined in the image manifest",
        default=False,
        action="store_true",
    )
    @CLICommand.arguments(
        "-d",
        "--description",
        metavar="<desc>",
        help="Set a job description.",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--datasetid",
        metavar="<id>",
        help=(
            "Specify a dataset ID with container mountpoint or `no-mount` for a object based dataset"
            "(format: dataset-id:mountPoint or dataset-id:no-mount) to be bound to the job."
            " This can be supplied multiple times."
            " If `no-mount` is provided, the job will try to the fetch the dataset through"
            " storage specific protocol(e.g. s3 protocol)."
        ),
        type=check_batch_datasetid,
        default=None,
        action="append",
        completer=dataset_id_completer,
    )
    @CLICommand.arguments(
        "-in", "--instance", metavar="<type>", help="Instance type.", type=str, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--replicas",
        metavar="<num>",
        type=int,
        help="Specifies the number of child replicas created for multi-node parallel job.",
    )
    @CLICommand.arguments(
        "--array-type",
        metavar="<type>",
        type=str,
        action=SingleUseAction,
        help="Specifies the type of Job. Choices: {}.".format(", ".join(JobArrayTypeEnum)),
        choices=JobArrayTypeEnum,
    )
    @CLICommand.arguments(
        "--coscheduling",
        action="store_true",
        default=True,
        help="Specifies if coscheduling would be allowed for the multi-node parallel job submission.",
    )
    @CLICommand.arguments(
        "--min-availability",
        metavar="<num>",
        type=int,
        action=check_positive_int_32_bit(),
        help=(
            "Minimum replicas that need to be scheduled to start a multi-node job. "
            "--min-availability is not allowed with --coscheduling."
        ),
    )
    @CLICommand.arguments(
        "--network",
        metavar="<type>",
        type=str,
        action=SingleUseAction,
        default=None,
        help="Specify the information pertaining to network or switch. Choices: {}. Default: ETHERNET".format(
            ", ".join(NetworkTypeEnum)
        ),
        choices=NetworkTypeEnum,
    )
    @CLICommand.arguments(
        "--topology-constraint",
        metavar="<specifier>",
        type=str,
        action=SingleUseAction,
        help="Specifies a topology constraint for the job.  Only available for multi-node jobs. Choices: {}.".format(
            ", ".join(TOPOLOGY_CONSTRAINT_ENUM)
        ),
        choices=TOPOLOGY_CONSTRAINT_ENUM,
    )
    @CLICommand.arguments("-p", "--port", metavar="<port>", action="append", type=check_port_mapping, help=port_help)
    @CLICommand.arguments("--result", metavar="<mntpt>", help="Mount point for the job result.", action=SingleUseAction)
    @CLICommand.arguments(
        "--preempt",
        metavar="<class>",
        help=(
            "Specify the job class for preemption and "
            "scheduling behavior. One of RESUMABLE, "
            "RESTARTABLE, or RUNONCE (default for non-shell jobs)."
        ),
        choices=JobRunPolicy.PreemptClassEnum,
        default=None,
    )
    @CLICommand.arguments(
        "--total-runtime",
        metavar="<t>",
        help=(
            "Maximum cumulative duration (in the format "
            "[nD][nH][nM][nS]) the job is in the RUNNING "
            "state before it gets gracefully shut down by "
            "the system."
        ),
        type=str,
        default=None,
        action=check_dhms_duration(),
    )
    @CLICommand.arguments(
        "--min-timeslice",
        metavar="<t>",
        help=(
            "Minimum duration (in the format "
            "[nD][nH][nM][nS]) the job is expected (not "
            "guaranteed) to be in the RUNNING state once "
            "scheduled to assure forward progress."
        ),
        type=str,
        default=None,
        action=check_dhms_duration(),
    )
    @CLICommand.arguments(
        "--waitrun",
        help="The CLI will block until the job reaches a RUNNING status or user exits with Ctrl-C.",
        action="store_true",
    )
    @CLICommand.arguments(
        "--waitend",
        help="The CLI will block until the job reaches a terminal status or user exits with Ctrl-C.",
        action="store_true",
    )
    @CLICommand.arguments(
        "--start-deadline",
        metavar="<t>",
        help=(
            "Maximum duration (in the format [nD][nH][nM][nS]) the job will have to reach a RUNNING "
            "status before it is automatically killed. May only be used with --shell. "
            "Default: %s"
        )
        % SHELL_START_DEADLINE_DEFAULT,
        type=str,
        default=None,
        action=check_dhms_duration(),
    )
    @CLICommand.arguments(
        "--shell", metavar="CMD", help=shell_help, const="/bin/bash", nargs="?", type=str, action=SingleUseAction
    )
    @CLICommand.arguments(
        "-w",
        "--workspace",
        metavar="<wkspce>",
        help=(
            "Specify the workspace to be bound to the job. "
            "(format: <workspace-id|workspace-name>:<mountpoint>:<mount-mode>). "
            "<mount-mode>  can take values RW (read-write), RO (read-only) (default: RW). "
            "Multiple workspace arguments are allowed. "
        ),
        type=check_batch_workspaceid,
        default=None,
        action="append",
        completer=workspace_id_completer,
    )
    @CLICommand.arguments(
        "--clone",
        metavar="<jobid>",
        help="Submit a new job by cloning an existing job (other arguments will override corresponding values).",
        type=int,
        completer=job_id_completer,
    )
    @CLICommand.arguments("--label", metavar="<label>", help=label_help, type=check_batch_label, action="extend")
    @CLICommand.arguments("--lock-label", help="Lock labels for the job. Default is unlocked.", action="store_true")
    @CLICommand.arguments(
        "--order",
        metavar="<order>",
        help="Specify order for the job. Default is 50. Job order is from 1 to 99.",
        type=int,
        default=None,
        action=check_range(1, 99),
    )
    @CLICommand.arguments(
        "--priority",
        metavar="<priority>",
        help="Specify priority for the job. Default is NORMAL. Choices %(choices)s",
        type=str,
        default=None,
        choices=JobPriorityEnum,
    )
    @CLICommand.arguments(
        "--secret",
        metavar="<secret[:key_name:alias_name]>",
        help=secret_help,
        type=check_secret_pattern,
        default=None,
        action="append",
    )
    @CLICommand.arguments(
        "--env-var",
        metavar="<key:value>",
        type=check_key_value_pattern,
        default=None,
        help=custom_env_variable_help,
        action="append",
    )
    @CLICommand.arguments(
        "--experiment-flow-type",
        metavar="<type>",
        type=str,
        action=SingleUseAction,
        help=(
            "Third-party experiment flow type which will be used to export specific environment variables to associate"
            " the project/experiment name to the job and decide the format of the experimentation tracking URLSpecifies"
            " the type of Job. Choices: {}.".format(", ".join(JobFlowTypeEnum))
        ),
        choices=JobFlowTypeEnum,
    )
    @CLICommand.arguments(
        "--experiment-project-name",
        metavar="<type>",
        type=str,
        action=SingleUseAction,
        help="Third-party project/environment name to associate the current job/run",
    )
    @CLICommand.arguments(
        "--experiment-name",
        metavar="<type>",
        type=str,
        action=SingleUseAction,
        help="Optional Third-party experiment name to group the jobs/runs",
    )
    @CLICommand.mutex(["waitrun"], ["waitend"])
    @CLICommand.mutex(["preempt", "min_timeslice"], ["shell"])
    @CLICommand.mutex(["entrypoint"], ["use_image_entrypoint"])
    @CLICommand.mutex(["coscheduling"], ["min_availability"])
    @CLICommand.mutex(["file"], ["clone"])
    def run(self, args):  # noqa: D102
        self._apply_shell_defaults(args)

        if args.start_deadline and not args.shell:
            raise InvalidArgumentError("argument: --start-deadline can only be set with --shell")

        if args.shell:
            check_shell_support(args)

        job = self.client.basecommand.jobs.run(
            org=args.org,
            team=args.team,
            ace=args.ace,
            name=args.name,
            image=args.image,
            file=args.file,
            commandline=args.commandline,
            entrypoint=args.entrypoint,
            use_image_entrypoint=args.use_image_entrypoint,
            description=args.description,
            dataset=args.datasetid,
            instance=args.instance,
            replicas=args.replicas,
            array_type=args.array_type,
            coscheduling=args.coscheduling,
            min_availability=args.min_availability,
            network=args.network,
            topology_constraint=args.topology_constraint,
            port=args.port,
            result=args.result,
            preempt=args.preempt,
            total_runtime=args.total_runtime,
            min_timeslice=args.min_timeslice,
            workspace=args.workspace,
            clone=args.clone,
            label=args.label,
            lock_label=args.lock_label,
            order=args.order,
            priority=args.priority,
            secret=args.secret,
            env_var=args.env_var,
            experiment_flow_type=args.experiment_flow_type,
            experiment_project_name=args.experiment_project_name,
            experiment_name=args.experiment_name,
        )
        # set the name of the workspace while printing the status
        # TODO: need API to do this instead
        if job.jobDefinition.workspaceMounts:
            job.jobDefinition.workspaceMounts = [
                self._may_set_workspace_name(self.configuration.org_name, w) for w in job.jobDefinition.workspaceMounts
            ]

        self.batch_printer.print_job(job)
        try:
            if args.shell:
                self._shell_into_job(job.id, args.start_deadline, args.total_runtime.total_seconds(), args.shell)
            if args.waitrun:
                self._wait_job_status(job.id, RUNNING_STATES, STATES_BEFORE_RUNNING)
            if args.waitend:
                self._wait_job_status(job.id, TERMINAL_STATES, STATES_BEFORE_TERMINAL)
        except KeyboardInterrupt:
            if sys.stdout.isatty():
                print(job_status_max, end="\r", flush=True)
            self._kill_job_with_message(job.id, "Exited.")
            raise

    @staticmethod
    def _apply_shell_defaults(args):
        """Apply default parameters based on the --shell argument.

        * --total-runtime defaults to 8H if not specified
        * --command defaults to 'sleep' if not specified

        mutates the args passed in
        """
        if args.shell:
            if not args.total_runtime:
                args.total_runtime = dhms_to_isoduration(SHELL_TOTAL_RUNTIME_DEFAULT)

            if not args.commandline:
                sleep_format = "%Hh %Mm %Ss"
                sleep_time = duration_isoformat(args.total_runtime, sleep_format)
                args.commandline = "sleep {}".format(sleep_time)

            if not args.start_deadline:
                args.start_deadline = dhms_to_isoduration(SHELL_START_DEADLINE_DEFAULT)

            args.min_timeslice = args.total_runtime
        else:
            args.total_runtime = args.total_runtime or dhms_to_isoduration("0S")
            args.min_timeslice = args.min_timeslice or dhms_to_isoduration("0S")
        return args

    def _get_job(self, org_name, job_id, team_name):
        job = self.client.basecommand.jobs.get_job(org_name, job_id, team_name)
        if hasattr(job.jobDefinition, "workspaceMounts") and job.jobDefinition.workspaceMounts:
            job.jobDefinition.workspaceMounts = [
                self._may_set_workspace_name(org_name, w) for w in job.jobDefinition.workspaceMounts
            ]
        return job

    batch_info_str = "Get job details by job ID."

    @CLICommand.command(help=batch_info_str, description=batch_info_str)
    @CLICommand.arguments(
        "jobid", metavar="<job_id>[:replica_id]>", help="Job ID", type=str, completer=job_id_completer
    )
    def info(self, args):  # noqa: D102
        job_target = JobTarget(args.jobid)
        org_name = args.org or self.configuration.org_name
        if job_target.replica_id:
            replica = self.client.basecommand.jobs.info(
                job_id=job_target.job_id, replica_id=job_target.replica_id, org=args.org, team=args.team, ace=args.ace
            )
            self.batch_printer.print_replica(replica)
        else:
            (job, history) = self.client.basecommand.jobs.info(
                job_id=job_target.job_id, org=args.ace, team=args.team, ace=args.ace
            )
            if hasattr(job.jobDefinition, "workspaceMounts") and job.jobDefinition.workspaceMounts:
                job.jobDefinition.workspaceMounts = [
                    self._may_set_workspace_name(org_name, w) for w in job.jobDefinition.workspaceMounts
                ]
            self.batch_printer.print_job(job, history)

    batch_attach_str = "Attach to the container running the provided job."

    @CLICommand.command(help=batch_attach_str, description=batch_attach_str)
    @CLICommand.arguments(
        "jobid", metavar="<job_id>[:replica_id]>", help="Job ID", type=str, completer=job_id_completer
    )
    def attach(self, args):  # noqa: D102
        self.configuration.validate_configuration()
        org_name = self.configuration.org_name
        team_name = self.configuration.team_name
        job_target = JobTarget(args.jobid)
        (docker_daemon_ip, container_id, cluster_id, proxy_ip, replica_count) = self._get_container_info(
            org_name, job_target.job_id, job_target.replica_id, team_name
        )
        try:
            replica_id = (
                0
                if (replica_count is not None and replica_count > 1 and job_target.replica_id is None)
                else job_target.replica_id
            )
            kube_wrapper = KubeWrapper(
                self.client, org_name, team_name, job_target.job_id, proxy_ip, container_id, replica_id
            )
            kube_wrapper.attach()
            return
        except ResourceNotFoundException:
            logger.debug("Kube exec not found, trying docker.")
            try:
                with ContainerWrapper(
                    self.client,
                    org_name,
                    team_name,
                    job_target.job_id,
                    docker_daemon_ip,
                    proxy_ip,
                    cluster_id,
                    job_target.replica_id,
                ) as container_wrapper:
                    container_wrapper.attach(container_id)
            except ConnectionError as err:
                # Default message is messy - clean up and present relevant parts. Should cover differences
                # in messages between unix/windows systems
                if "failed to establish" in str(err).lower():
                    raise NgcException("Error: Failed to establish connection: Connection refused.") from None
                raise NgcException(str(err)) from None

    batch_exec_str = "Exec to the container running the provided job."

    @CLICommand.command(name="exec", help=batch_exec_str, description=batch_exec_str)
    @CLICommand.arguments(
        "jobid", metavar="<job_id>[:replica_id]>", help="Job ID", type=str, completer=job_id_completer
    )
    @CLICommand.arguments(
        "--commandline",
        metavar="",
        help="The command you want to execute with exec.",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments("--detach", help="Detach from the exec command.", action="store_true")
    def execute(self, args):  # noqa: D102
        self.configuration.validate_configuration()
        job_target = JobTarget(args.jobid)
        if args.commandline == "":
            raise NgcException("Command cannot be empty")
        if args.commandline is None:
            if os.name == "nt":
                raise NgcException(
                    "Default command '/bin/bash' is not supported for Windows, but you can "
                    "still use 'ngc batch exec --commandline'."
                )
            args.commandline = "/bin/bash"

        self._exec_into_job(job_target.job_id, args.commandline, replica_id=job_target.replica_id, detach=args.detach)

    job_kill_list = STATES_BEFORE_TERMINAL
    batch_submit_str = "Submit a request to kill jobs by job ID."

    @CLICommand.command(help=batch_submit_str, description=batch_submit_str)
    @CLICommand.arguments(
        "jobids",
        metavar="<jobid|jobrange|joblist>",
        help="Job ID(s).  Valid Examples: '1-5', '333', '1, 2', '1,10-15'",
        type=str,
        action=JobSelector,
        minimum=0,
        maximum=LONG_MAX_VALUE,
        completer=job_id_completer,
    )
    @CLICommand.arguments(
        "--status",
        help="Kill jobs that match the provided status. Multiple --status flags will OR together. Options: %(choices)s",
        action="append",
        metavar="<s>",
        default=None,
        type=str,
        choices=job_kill_list,
    )
    @CLICommand.arguments(
        "--dry-run",
        help="List jobs to be killed without performing the action.",
        action="store_true",
        default=False,
        dest="dry_run",
    )
    @CLICommand.arguments(
        "--reason",
        metavar="<reason>",
        help="Reason to terminate the job (required for administrators).",
        default=None,
        type=check_batch_reason,
    )
    def kill(self, args):  # noqa: D102
        self.client.basecommand.jobs.kill(
            job_ids=args.jobids,
            status=args.status,
            dry_run=args.dry_run,
            reason=args.reason,
        )

    def _kill_job_with_message(self, jobid, message, post_message=None):
        post_message = post_message or ""
        try:
            self.batch_printer.print_head(
                f"{message} Submitting job kill request for Job ID: '{jobid}'. {post_message}"
            )
            org_name = self.configuration.org_name
            team_name = self.configuration.team_name
            self.client.basecommand.jobs.kill_job(org_name=org_name, job_id=jobid, team_name=team_name)
        except Exception as exc:
            raise NgcException(f"Killing of job ID: '{jobid}' failed: {exc}") from None

    telemetry_job_str = "List telemetry data for the given job."

    @CLICommand.command(help=telemetry_job_str, description=telemetry_job_str)
    @CLICommand.arguments(
        "jobid", metavar="<<job id>[:replica_id]>", help="Job ID", type=str, completer=job_id_completer
    )
    @CLICommand.arguments(
        "--interval-unit",
        metavar="<u>",
        help=f"Data collection interval unit. Options: %(choices)s.  Default: {DEFAULT_INTERVAL_UNIT}",
        default=DEFAULT_INTERVAL_UNIT,
        choices=["SECOND", "MINUTE", "HOUR"],
    )
    @CLICommand.arguments(
        "--interval-time",
        metavar="<t>",
        help=f"Data collection interval time value.  Default: {DEFAULT_INTERVAL_TIME}",
        type=int,
        action=check_positive_int_32_bit(),
        default=DEFAULT_INTERVAL_TIME,
    )
    # TODO: NGC-15202: A global telementry type list used before updating the MeasurementTypeEnum
    @CLICommand.arguments(
        "--type",
        metavar="<type>",
        action="append",
        help="A telemetry type to report. Options: %(choices)s. Default: None",
        default=None,
        type=str,
        choices=TELEMETRY_TYPE_ENUM if BUILD_ENV in (PRODUCTION_ENV, CANARY_ENV) else TELEMETRY_TYPE_ENUM_STG,
    )
    @CLICommand.arguments(
        "--statistics",
        metavar="<form>",
        help=f"Statistical form of the data to report. Options: %(choices)s.  Default: {DEFAULT_STATISTIC_TYPE}",
        default=DEFAULT_STATISTIC_TYPE,
        choices=["MIN", "MAX", "MEAN"],
    )
    def telemetry(self, args):  # noqa: D102
        job_target = JobTarget(args.jobid)
        measurements, job = self.client.basecommand.jobs.telemetry(
            job_id=job_target.job_id,
            replica_id=job_target.replica_id,
            org=args.org,
            team=args.team,
            ace=args.ace,
            interval_unit=args.interval_unit,
            interval_time=args.interval_time,
            statistics=args.statistics,
            types=args.type,
        )

        self.batch_printer.print_measurements_table(measurements, job.jobDefinition.resources.type)

    batch_generate_str = "Generate a json file containing the given job.  This can be used to submit that job."

    @CLICommand.command(name="get-json", help=batch_generate_str, description=batch_generate_str)
    @CLICommand.arguments("jobid", metavar="<job id>", help="Job ID", type=int, completer=job_id_completer)
    def get_json(self, args):  # noqa: D102
        parsed = self.client.basecommand.jobs.get_json(job_id=args.jobid, org=args.org, team=args.team, ace=args.ace)
        self.batch_printer.print_json(parsed)

    def _wait_job_status(self, jobid, goal_statuses, allowed_states, interval_seconds=5, timeout_seconds=None):
        start_time = time.time()
        org_name = self.configuration.org_name
        team_name = self.configuration.team_name
        job = self._get_job(org_name, jobid, team_name)
        job_status = job.jobStatus.status
        prev_job_status = job_status
        self.batch_printer.print_job(job, print_job_status=True)
        while job_status not in goal_statuses:
            time_waited = round(time.time() - start_time)

            if prev_job_status != job_status:
                self.batch_printer.print_job(job, print_job_status=True)

            prev_job_status = job_status
            if job_status not in allowed_states:
                self.batch_printer.print_error("Job status reached unexpected state: {0}".format(job_status))
                raise SystemExit(1)

            if timeout_seconds:
                if time_waited > timeout_seconds:
                    raise JobTimeoutException

            if sys.stdout.isatty():
                print("Job Status: {0} (Press Ctrl-C to exit, kill job)".format(job_status), end="", flush=True)
                # float division expected
                sleep_seconds = interval_seconds / 10
                for _ in range(10):
                    print(".", end="", flush=True)
                    time.sleep(sleep_seconds)
                print("", end="\r", flush=True)
                print(job_status_max, end="\r", flush=True)
            else:
                time.sleep(interval_seconds)

            job = self._get_job(org_name, jobid, team_name)
            job_status = job.jobStatus.status

        seconds_elapsed = round(time.time() - start_time)
        self.batch_printer.print_job(job, print_job_status=True)
        self.batch_printer.print_head(
            "Job Status: {0} Time spent waiting: {1} seconds".format(job_status, seconds_elapsed)
        )

    update_help = "Update a job's labels."
    remove_help = (
        "Remove a label. Multiple remove label arguments are allowed, support standard Unix shell-style "
        "wildcards like '*' and '?'."
    )

    @CLICommand.command(name="update", help=update_help, description=update_help)
    @CLICommand.arguments("jobid", metavar="<job id>", help="Job ID", type=int, completer=job_id_completer)
    @CLICommand.arguments("--label", metavar="<label>", help=label_help, type=check_batch_label, action="extend")
    @CLICommand.arguments("--remove-label", help=remove_help, type=check_batch_label_match, action="extend")
    @CLICommand.arguments("--clear-label", help="Remove all labels for the job.", action="store_true")
    @CLICommand.arguments("--lock-label", help="Lock Labels.", action="store_true")
    @CLICommand.arguments("--unlock-label", help="Unlock Labels.", action="store_true")
    @CLICommand.mutex(["remove-label"], ["clear-label"])
    @CLICommand.mutex(["lock-label"], ["unlock-label"])
    def update(self, args):  # noqa: D102
        resp = self.client.basecommand.jobs.update(
            job_id=args.jobid,
            org=args.org,
            team=args.team,
            ace=args.ace,
            label=args.label,
            remove_label=args.remove_label,
            clear_label=args.clear_label,
            lock_label=args.lock_label,
            unlock_label=args.unlock_label,
        )
        self.batch_printer.print_update(resp)

    log_help = "Print a job's log."

    @CLICommand.command(name="log", help=log_help, description=log_help)
    @CLICommand.arguments(
        "jobid", metavar="<job_id>[:replica_id]>", help="Job ID", type=str, completer=job_id_completer
    )
    @CLICommand.arguments(
        "--head", help="Print the first part of the log file. Default is 10 lines.", action="store_true"
    )
    @CLICommand.arguments(
        "--lines",
        metavar="<lines>",
        help="Specify the number of lines to print. Must specify --head or --tail.",
        type=int,
    )
    @CLICommand.arguments(
        "--tail", help="Print the last part of the log file. Default is 10 lines.", action="store_true"
    )
    @CLICommand.mutex(["tail"], ["head"])
    def log(self, args):  # noqa: D102
        job_target = JobTarget(args.jobid)
        try:
            log_file = self.client.basecommand.jobs.log(
                job_id=job_target.job_id,
                replica_id=job_target.replica_id,
                org=args.org,
                team=args.team,
                ace=args.ace,
                head=args.head,
                lines=args.lines,
                tail=args.tail,
            )
            self.batch_printer.print_log(log_file)
        except (OSError, IOError, PermissionError):
            raise NgcException(
                "Unable to download the log file, check storage and permissions before retrying."
            ) from None

    class ShellWarningThread(threading.Thread):  # noqa: D106
        def __init__(self, shell_warning_fn, jobid, total_runtime_seconds, buffer_time):
            threading.Thread.__init__(self)
            self.shell_warning_fn = shell_warning_fn
            self.jobid = jobid
            self.total_runtime_seconds = total_runtime_seconds
            self.buffer_time = buffer_time
            # deamon threads will not hold the process open. No resources to be cleaned up here.
            self.daemon = True

        def run(self):  # noqa: D102
            self.shell_warning_fn(self.jobid, self.total_runtime_seconds, self.buffer_time)

    def _shell_into_job(self, jobid, start_deadline, total_runtime_seconds, exec_cmd):
        try:
            self._wait_job_status(
                jobid, RUNNING_STATES, STATES_BEFORE_RUNNING, timeout_seconds=start_deadline.total_seconds()
            )
        except JobTimeoutException:
            self._kill_job_with_message(
                jobid,
                "Start deadline exceeded.",
                "Please see the '--start-deadline' flag in 'ngc batch run --help' for more information.",
            )
            raise

        for buffer_time in SHELL_WARNING_SECONDS:
            Batch.ShellWarningThread(self._shell_warning, jobid, total_runtime_seconds, buffer_time).start()

        if sys.stdout.isatty():
            clear()

        # Exit codes we end the shell session for
        valid_exit_codes = (
            EXIT_CODES["SUCCESS"],
            EXIT_CODES["DOCKER_CONTAINER_KILLED"],
            EXIT_CODES["TERMINATION_CTRL_C"],
        )

        exit_code = self._exec_into_job(jobid, exec_cmd)
        # Keep exec'ing into the container until we exit with 0 or the container is killed (job complete)
        while exit_code not in valid_exit_codes:
            try:
                exit_code = self._exec_into_job(jobid, exec_cmd)
            except KeyboardInterrupt:
                pass

        if exit_code == EXIT_CODES["DOCKER_CONTAINER_KILLED"]:
            self.batch_printer.print_ok("Container shut down. Shell session closed.")
        elif exit_code == EXIT_CODES["SUCCESS"]:
            self._kill_job_with_message(jobid, "Shell session exited.")

    def _shell_warning(self, jobid, duration, buffer_time):
        sleep_time = int(duration - buffer_time - SHELL_BUFFER_SECONDS)
        if sleep_time <= 0:
            return
        time.sleep(sleep_time)
        org_name = self.configuration.org_name
        team_name = self.configuration.team_name
        job = self.client.basecommand.jobs.get_job(org_name, jobid, team_name)
        job_status = job.jobStatus.status
        if job_status in RUNNING_STATES:
            self.batch_printer.print_shell_warning(buffer_time)

    def _exec_into_job(self, jobid, command, replica_id=None, detach=False):
        org_name = self.configuration.org_name
        team_name = self.configuration.team_name
        (docker_daemon_ip, container_id, cluster_id, proxy_ip, replica_count) = self._get_container_info(
            org_name, jobid, replica_id, team_name
        )
        try:
            replica_id = 0 if (replica_count is not None and replica_count > 1 and replica_id is None) else replica_id
            kube_wrapper = KubeWrapper(self.client, org_name, team_name, jobid, proxy_ip, container_id, replica_id)
            return kube_wrapper.exec_(command)
        except ResourceNotFoundException:
            logger.debug("Kube exec not found, trying docker.")
            with ContainerWrapper(
                self.client, org_name, team_name, jobid, docker_daemon_ip, proxy_ip, cluster_id, replica_id
            ) as container_wrapper:
                return container_wrapper.exec_(command, container_id, detach)

    def _get_container_info(self, org_name, job_id, replica_id, team_name):
        if replica_id:
            (docker_daemon_ip, container_id, ace_id, cluster_id, replica_count) = self._get_replica_container_info(
                org_name, job_id, replica_id, team_name
            )
        else:
            (docker_daemon_ip, container_id, ace_id, cluster_id, replica_count) = self._get_job_container_info(
                org_name, job_id, ("RUNNING",), team_name
            )
        proxy_ip = self._get_proxy_ip(org_name, ace_id, team_name)
        return docker_daemon_ip, container_id, cluster_id, proxy_ip, replica_count

    def _get_replica_container_info(self, org_name, job_id, replica_id, team_name):
        job = self.client.basecommand.jobs.get_job(org_name, job_id, team_name)
        cluster_id = job.jobDefinition.clusterId
        replica_count = job.jobDefinition.replicaCount
        ace_id = job.aceId
        replica = self.client.basecommand.jobs.get_replica(
            job_id=job_id, replica_id=replica_id, org_name=org_name, team_name=team_name
        )
        if replica.replicaStatus.status not in ["RUNNING"]:
            raise NgcException(
                "Error: Cannot run command as job '{}:{}' is {}".format(
                    job_id, replica_id, replica.replicaStatus.status
                )
            )
        if replica.replicaStatus.selectedNodes is None:
            raise NgcException("Error: Node name is `None` for job ID: '{}:{}'".format(job_id, replica_id))

        container_id = replica.replicaStatus.containerName
        try:
            task_node = [str(node.ipAddress) for node in replica.replicaStatus.selectedNodes if node.ipAddress]
            docker_daemon_ip = task_node[0]
        except IndexError:
            raise NgcException("Error: Node IP is not assigned") from None

        return docker_daemon_ip, container_id, ace_id, cluster_id, replica_count

    def _get_job_container_info(self, org_name, job_id, job_status_list, team_name):
        """Gets container information from a job id."""  # noqa: D401
        job = self.client.basecommand.jobs.get_job(org_name, job_id, team_name)
        if job.jobStatus.status in job_status_list:
            if job.jobStatus.containerName is None:
                raise NgcException("Container name is None for job ID: '{0}'".format(job_id))

            if job.jobStatus.selectedNodes is None:
                raise NgcException("Node name is None for job ID: '{0}'".format(job_id))

            job_nodes = [str(node.ipAddress) for node in job.jobStatus.selectedNodes if node.ipAddress]
            container_id = job.jobStatus.containerName
            docker_daemon_ip = job_nodes[0]
            ace_id = job.aceId
            cluster_id = job.jobDefinition.clusterId
            replica_count = job.jobDefinition.replicaCount
        else:
            raise NgcException("Cannot run command as job is in: {0} state".format(job.jobStatus.status))
        return docker_daemon_ip, container_id, ace_id, cluster_id, replica_count

    def _get_proxy_ip(self, org_name, ace_id, team_name):
        ace_details = self.client.basecommand.aces.get_ace_details(
            org_name=org_name, ace_id=ace_id, team_name=team_name
        )
        if ace_details.proxyServiceUrl is None:
            raise NgcException("Proxy URL is None for ACE ID: '{0}'".format(ace_id))
        dns = ace_details.proxyServiceUrl.split("//")[-1].split("/")[0]
        return dns
