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
# and any modifications thereto. Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import json

from basecommand.api.quickstart_cluster import (
    ClusterParamError,
    EmptyClusterUpdateError,
    valid_port_mapping,
    VALID_PROTOCOLS,
)
from basecommand.command.args_validation import check_secret_pattern
from basecommand.command.batch import TOPOLOGY_CONSTRAINT_ENUM
from basecommand.command.quickstart import QuickStartCommand
from basecommand.data.pym.ClusterInfoResponse import ClusterInfoResponse
from basecommand.data.pym.ClusterInstanceTypesResponse import (
    ClusterInstanceTypesResponse,
)
from basecommand.data.pym.ClusterRequestStatus import ClusterRequestStatus
from basecommand.printer.quickstart_cluster import QuickStartClusterPrinter
from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_dhms_duration,
    check_key_value_pattern,
    check_valid_columns,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.errors import ResourceAlreadyExistsException
from ngcbase.util.utils import confirm_remove, get_columns_help

RW_TRUE = ("true", "t", "yes", "y", "rw", "1")
RW_FALSE = ("false", "f", "no", "n", "ro", "0")


LIST_HELP = "List clusters."
CLUSTER_TYPE_ENUM = ["dask", "jupyterlab"]
CLUSTER_TYPE_HELP = f"The type of cluster: choose from {CLUSTER_TYPE_ENUM}."
CREATE_TARGET_HELP = "Name of the cluster to create. Format: org/[team/]cluster_name."
# common cluster attributes
REMOVE_HELP = "Remove a cluster"
COLUMNS_DICT = {
    "additionalInfo": "Additional Info",
    "id": "ID",
    "name": "Name",
    "org": "Org",
    "status": "Status",
    "team": "Team",
    "type": "Type",
}
COLUMNS_DEFAULT = ("name", "Name")
COLUMNS_HELP = get_columns_help(COLUMNS_DICT, COLUMNS_DEFAULT)
DATASET_MOUNT_HELP = (
    "A mount point for a dataset. Enter in the format of: '<id>:<mount point path>' The 'id' value must be an "
    "integer. You may include more than one dataset mountpoint by specifying multiple '--dataset-mount' arguments."
)
WORKSPACE_MOUNT_HELP = (
    "A mount point for a workspace. Enter in the format of: '<id>:<mount point path>:<rw>' The 'rw' value should be "
    "'true' if the mount is read/write, and 'false' if it is read-only. You may include more than one workspace "
    "mountpoint by specifying multiple '--workspace-mount' arguments."
)
CLUSTER_LIFETIME_HELP = (
    "The lifetime for the cluster. The format is <num>X, where 'X' is a single letter representing the unit of time: "
    "<d|h|m|s>, for days, hours, minutes, and seconds, respectively."
)
EXPIRY_DURATION_HELP = (
    "The expiry duration for the cluster. The format is <num>X, where 'X' is a single letter representing the unit of "
    "time: <d|h|m|s>, for days, hours, minutes, and seconds, respectively."
)
ADDITIONAL_PORT_HELP = (
    "(deprecated; use `additional-port-mappings` instead) Any additional ports to open for the cluster. You may "
    "include more than one additional port mapping by specifying multiple `--additional-open-ports` arguments."
)
PORT_MAPPING_HELP = (
    "Additional ports to open on the cluster. Mappings should be in the format '[name:]port[/protocol]'. If `protocol` "
    "is not specified, HTTPS will be used. The `name` portion cannot be included for HTTPS and GRPC protocols; it is "
    f"required for the others. Valid protocols: {VALID_PROTOCOLS}. You may include more than one additional port "
    "mapping by specifying multiple `--additional-port-mappings` arguments."
)
LABEL_HELP = (
    "A user/reserved/system label that describes this job. You may define more than one label by specifying "
    "multiple '--label' arguments."
)
MIN_TIME_SLICE_HELP = (
    "Minimum duration (in the format [nD][nH][nM][nS]) the job is expected (not guaranteed) to be in the RUNNING "
    "state once scheduled to assure forward progress."
)
MULTI_NODE_HELP = (
    "Only used for jupyterlab cluster types. Determines if the cluster is multi-node or not. Default=False"
)
OPTIONS_HELP = (
    "A custom envronment variable to add to job in the form of a key-pair. A key name must be between 1-63 characters "
    "and contain letters, numbers or './-_'. May be used multiple times in the same command."
)
PREEMPT_HELP = (
    "Describes the job class for preemption and scheduling behavior. It must be one of 'RESUMABLE', 'RESTARTABLE', or "
    "'RUNONCE' (default)."
)
TOPOLOGY_CONSTRAINT_HELP = (
    "Specifies a topology constraint for the job. Only available for multi-node jobs. Choices: "
    f"{', '.join(TOPOLOGY_CONSTRAINT_ENUM)}."
)
USER_SECRET_HELP = (
    "Specify secret name for the jab. Format: '<secret[:key_name:alias_name]>'. Multiple secret arguments are allowed. "
    "Unless specified all key value pairs will be included in the job. Overrides of the key are available optionally "
    "per key-value pair."
)
SCHEDULER_ENVVAR_HELP = (
    "An environment variable to be set in the scheduler node. It must be in the format 'var_name:value'. You may "
    "define more than one envrionment variable by specifying multiple '--scheduler-env-var' arguments."
)
WORKER_ENVVAR_HELP = (
    "An environment variable to be set in the worker node. It must be in the format 'var_name:value'. You may "
    "define more than one envrionment variable by specifying multiple '--worker-env-var' arguments. Only used for "
    "'dask' cluster type."
)
CONDA_PACKAGE_HELP = (
    "List of packages to install on the scheduler and worker using 'conda install' command. You may define more than "
    "one package by specifying multiple '--conda-packages' arguments."
)
PIP_PACKAGE_HELP = (
    "List of packages to install on the scheduler and worker using 'pip install' command. You may define more than "
    "one package by specifying multiple '--pip-packages' arguments."
)
SYSTEM_PACKAGE_HELP = (
    "List of packages to install on the scheduler and worker using 'apt install' or 'yum install' command. (apt or "
    "yum command is chosen depending on the flavour of the Linux image in the Container). You may define more than "
    "one package by specifying multiple '--system-packages' arguments."
)


class QuickStartClusterSubCommand(QuickStartCommand):  # noqa: D101
    CMD_NAME = "cluster"
    HELP = "QuickStart Cluster Commands"
    DESC = "QuickStart Cluster Commands"
    CMD_ALIAS = []
    CMD_ALT_NAME = ""

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.basecommand.quickstart.cluster

    @property
    def printer(self):
        """Printer."""
        return QuickStartClusterPrinter(self.client.config)

    @staticmethod
    def _col_translate(columns):
        translate_table = {
            "created": "dateCreated",
            "updated": "dateModified",
            "public": "isPublic",
        }
        return [(translate_table.get(col, col), disp) for col, disp in columns]

    @CLICommand.arguments("--cluster-type", help=CLUSTER_TYPE_HELP, choices=CLUSTER_TYPE_ENUM, required=True)
    @CLICommand.arguments("--multinode", help="Show multinode instance types. Default=False", action="store_true")
    @CLICommand.command(
        name="list-instance-types",
        help="List all available instance types",
        description="Show a list of all available instance types",
    )
    def list_instance_types(self, args):
        """List instance types."""
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        ace = args.ace or self.config.ace_name
        instance_types = self.api.list_instance_types(
            cluster_type=args.cluster_type,
            org=org_name,
            team=team_name,
            ace=ace,
            multinode=args.multinode,
        )
        self.printer.print_instance_types(ClusterInstanceTypesResponse(instance_types))

    # pylint:disable=undefined-variable
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=COLUMNS_HELP,
        default=None,
        action="append",
        type=lambda value, columns_dict=COLUMNS_DICT: check_valid_columns(value, COLUMNS_DICT),
    )
    @CLICommand.arguments("--cluster-type", help=CLUSTER_TYPE_HELP, choices=CLUSTER_TYPE_ENUM, required=True)
    @CLICommand.arguments("--org-only", help="Don't return clusters created at the team level", action="store_true")
    @CLICommand.arguments("--owned", help="Only return clusters I own (admin only)", action="store_true")
    @CLICommand.command(name="list", help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List clusters."""
        arg_cols = args.column if hasattr(args, "column") else None
        columns = self._col_translate(arg_cols) if arg_cols else None
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name

        check_add_args_columns(columns, COLUMNS_DEFAULT)
        cluster_list = self.api.list(
            cluster_type=args.cluster_type,
            org=org_name,
            team=team_name,
            org_only=args.org_only,
            owned=args.owned,
        )
        cluster_list = [ClusterRequestStatus(cluster) for cluster in cluster_list]
        self.printer.print_cluster_list(cluster_list, columns=columns)

    @CLICommand.arguments("cluster_id", help="The ID of the cluster", type=str)
    @CLICommand.command(
        name="info",
        help="Information about a cluster",
        description="Show information about a cluster",
    )
    def info(self, args):
        """Return information about a specific cluster."""
        cfg_org_name = self.config.org_name
        cfg_team_name = self.config.team_name
        info = self.api.info(args.cluster_id, org=cfg_org_name, team=cfg_team_name)
        self.printer.print_info(ClusterInfoResponse({"clusterInfo": info}))

    @CLICommand.arguments("cluster_id", help="The ID of the cluster", type=str)
    @CLICommand.command(
        name="status",
        help="The status of a cluster",
        description="Show the status of a cluster",
    )
    def status(self, args):
        """Return status of a specific cluster."""
        cfg_org_name = self.config.org_name
        cfg_team_name = self.config.team_name
        status = self.api.status(args.cluster_id, org=cfg_org_name, team=cfg_team_name)
        self.printer.print_status(ClusterRequestStatus(status))

    @CLICommand.arguments("cluster_id", help="The ID of the cluster", type=str)
    @CLICommand.command(
        name="remove",
        help="Remove a cluster",
        description="Shutdown and delete a cluster",
    )
    def remove(self, args):
        """Shutdown and delete a specific cluster."""
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        confirm_remove(printer=self.printer, target=args.cluster_id, default=False)
        remove_info = self.api.remove(args.cluster_id, org=org_name, team=team_name)
        self.printer.print_remove(ClusterRequestStatus(remove_info))

    @CLICommand.arguments("cluster_id", help="The ID of the cluster", type=str)
    @CLICommand.command(
        name="stop",
        help="Stop a cluster",
        description="Stop a cluster",
    )
    def stop(self, args):
        """Stop a specific cluster."""
        cfg_org_name = self.config.org_name
        cfg_team_name = self.config.team_name
        try:
            stop_info = self.api.stop(args.cluster_id, org=cfg_org_name, team=cfg_team_name)
        except ResourceAlreadyExistsException as e:
            reason = e.explanation or e.response.content or "-unknown conflict-"
            if reason:
                try:
                    loaded_reason = json.loads(reason)
                    if "reason" in loaded_reason:
                        reason = loaded_reason["reason"]
                    elif "requestStatus" in loaded_reason:
                        rstatus = loaded_reason["requestStatus"]
                        if "statusDescription" in rstatus:
                            reason = rstatus["statusDescription"]
                except (TypeError, json.JSONDecodeError):
                    pass
            print(f"\nYour request could not be completed: {reason}.\n")
            return
        self.printer.print_stop(ClusterRequestStatus(stop_info))

    @CLICommand.arguments("cluster_id", help="The ID of the cluster", type=str)
    @CLICommand.command(
        name="start",
        help="Start a cluster that is in the STOPPED or FAILED state",
        description="Start a cluster",
    )
    def start(self, args):
        """Start a specific cluster."""
        cfg_org_name = self.config.org_name
        cfg_team_name = self.config.team_name
        start_info = self.api.start(args.cluster_id, org=cfg_org_name, team=cfg_team_name)
        self.printer.print_start(ClusterRequestStatus(start_info))

    @CLICommand.arguments("--name", help="The name of the cluster", type=str)
    @CLICommand.arguments("--cluster-type", help=CLUSTER_TYPE_HELP, choices=CLUSTER_TYPE_ENUM, required=True)
    @CLICommand.arguments(
        "--scheduler-dashboard-address",
        help="The dashboard address for the scheduler. Only used for 'dask' cluster type.",
        type=str,
    )
    @CLICommand.arguments(
        "--scheduler-instance-type", help="The instance type of the scheduler", type=str, required=True
    )
    @CLICommand.arguments(
        "--scheduler-port", help="The port to use for the scheduler. Only used for 'dask' cluster type.", type=int
    )
    @CLICommand.arguments("--scheduler-startup-script", help="The startup script for the scheduler", type=str)
    @CLICommand.arguments("--scheduler-reserved-gpus", help="The number of GPUs reserved for the scheduler", type=int)
    @CLICommand.arguments("--scheduler-env-var", help=SCHEDULER_ENVVAR_HELP, type=str, action="append")
    @CLICommand.arguments(
        "--worker-dashboard-address",
        help="The dashboard address for the worker. Only used for 'dask' cluster type.",
        type=str,
    )
    @CLICommand.arguments(
        "--worker-instance-type",
        help="The instance type of the worker. Required for 'dask' cluster type; ignored otherwise.",
        type=str,
    )
    @CLICommand.arguments(
        "--worker-startup-script",
        help="The startup script for the worker. Only used for 'dask' cluster type.",
        type=str,
    )
    @CLICommand.arguments(
        "--worker-reserved-gpus",
        help="The number of GPUs reserved for the worker. Only used for 'dask' cluster type.",
        type=int,
    )
    @CLICommand.arguments("--worker-env-var", help=WORKER_ENVVAR_HELP, type=str, action="append")
    @CLICommand.arguments("--system-packages", help=SYSTEM_PACKAGE_HELP, type=str, action="append")
    @CLICommand.arguments("--conda-packages", help=CONDA_PACKAGE_HELP, type=str, action="append")
    @CLICommand.arguments("--pip-packages", help=PIP_PACKAGE_HELP, type=str, action="append")
    @CLICommand.arguments("--nworkers", help="Number of workers in the cluster", type=int, required=True)
    @CLICommand.arguments("--container-image", help="The container image to use", type=str, required=True)
    @CLICommand.arguments(
        "--data-output-mount-point", help="The path to where the data output will be mounted", type=str, required=True
    )
    @CLICommand.arguments("--cluster-lifetime", help=CLUSTER_LIFETIME_HELP, type=str, required=True)
    @CLICommand.arguments("--expiry-duration", help=EXPIRY_DURATION_HELP, type=str)
    @CLICommand.arguments("--additional-open-ports", help=ADDITIONAL_PORT_HELP, type=int, action="append")
    @CLICommand.arguments(
        "--additional-port-mappings", help=PORT_MAPPING_HELP, type=valid_port_mapping, action="append"
    )
    @CLICommand.arguments("--dataset-mount", help=DATASET_MOUNT_HELP, default=None, action="append", type=str)
    @CLICommand.arguments("--workspace-mount", help=WORKSPACE_MOUNT_HELP, default=None, action="append", type=str)
    @CLICommand.arguments("--label", help=LABEL_HELP, type=str, action="append")
    @CLICommand.arguments(
        "--labels-locked", help="Labels will not be able to be changed. Default=False", action="store_true"
    )
    @CLICommand.arguments("--multi-node", help=MULTI_NODE_HELP, action="store_true")
    @CLICommand.arguments("--job-order", help="Order of the job; from 1 to 99.", type=int)
    @CLICommand.arguments(
        "--job-priority", help="Priority of the job; choose from 'LOW', 'NORMAL', or 'HIGH'. Default='NORMAL'", type=str
    )
    @CLICommand.arguments(
        "--min-availability", help="Minimum replicas that need to be scheduled to start a multi-node job.", type=int
    )
    @CLICommand.arguments("--min-time-slice", help=MIN_TIME_SLICE_HELP, type=str, action=check_dhms_duration())
    @CLICommand.arguments(
        "--options",
        metavar="<key:value>",
        type=check_key_value_pattern,
        default=None,
        help=OPTIONS_HELP,
        action="append",
    )
    @CLICommand.arguments("--preempt-class", help=PREEMPT_HELP, type=str)
    @CLICommand.arguments(
        "--topology-constraint", help=TOPOLOGY_CONSTRAINT_HELP, type=str, choices=TOPOLOGY_CONSTRAINT_ENUM
    )
    @CLICommand.arguments(
        "--user-secret",
        metavar="<secret[:key_name:alias_name]>",
        help=USER_SECRET_HELP,
        type=check_secret_pattern,
        default=None,
        action="append",
    )
    @CLICommand.command(
        name="create",
        help="Create a cluster",
        description="Create a new cluster",
    )
    def create(self, args):
        """Create a new cluster."""
        try:
            cluster_request_status = self.api.create(
                ace=getattr(args, "ace", None),
                cluster_type=getattr(args, "cluster_type", None),
                worker_instance_type=getattr(args, "worker_instance_type", None),
                additional_port_mappings=getattr(args, "additional_port_mappings", None),
                cluster_lifetime=getattr(args, "cluster_lifetime", None),
                expiry_duration=getattr(args, "expiry_duration", None),
                user_secret=getattr(args, "user_secret", None),
                options=getattr(args, "options", None),
                multi_node=getattr(args, "multi_node", None),
                label=getattr(args, "label", None),
                min_time_slice=getattr(args, "min_time_slice", None),
                container_image=getattr(args, "container_image", None),
                data_output_mount_point=getattr(args, "data_output_mount_point", None),
                labels_locked=getattr(args, "labels_locked", None),
                job_order=getattr(args, "job_order", None),
                job_priority=getattr(args, "job_priority", None),
                min_availability=getattr(args, "min_availability", None),
                nworkers=getattr(args, "nworkers", None),
                preempt_class=getattr(args, "preempt_class", None),
                scheduler_port=getattr(args, "scheduler_port", None),
                topology_constraint=getattr(args, "topology_constraint", None),
                conda_packages=getattr(args, "conda_packages", None),
                pip_packages=getattr(args, "pip_packages", None),
                system_packages=getattr(args, "system_packages", None),
                name=getattr(args, "name", None),
                scheduler_env_var=getattr(args, "scheduler_env_var", None),
                scheduler_dashboard_address=getattr(args, "scheduler_dashboard_address", None),
                scheduler_instance_type=getattr(args, "scheduler_instance_type", None),
                scheduler_startup_script=getattr(args, "scheduler_startup_script", None),
                scheduler_reserved_gpus=getattr(args, "scheduler_reserved_gpus", None),
                worker_env_var=getattr(args, "worker_env_var", None),
                worker_dashboard_address=getattr(args, "worker_dashboard_address", None),
                worker_startup_script=getattr(args, "worker_startup_script", None),
                worker_reserved_gpus=getattr(args, "worker_reserved_gpus", None),
                dataset_mount=getattr(args, "dataset_mount", None),
                workspace_mount=getattr(args, "workspace_mount", None),
                _deprecated_additional_open_ports=getattr(args, "additional_open_ports", None),
            )
        except ClusterParamError:
            # TODO: Make this raise an actual error.
            return
        if cluster_request_status:
            # Errors will result in an empty response
            self.printer.print_create(ClusterRequestStatus(cluster_request_status))

    @CLICommand.arguments("cluster_id", help="The ID of the cluster", type=str)
    @CLICommand.arguments("--name", help="The name of the cluster", type=str)
    @CLICommand.arguments(
        "--scheduler-dashboard-address",
        help="The dashboard address for the scheduler. Only used for 'dask' cluster type.",
        type=str,
    )
    @CLICommand.arguments("--scheduler-instance-type", help="The instance type of the scheduler", type=str)
    @CLICommand.arguments(
        "--scheduler-port", help="The port to use for the scheduler. Only used for 'dask' cluster type.", type=int
    )
    @CLICommand.arguments("--scheduler-startup-script", help="The startup script for the scheduler", type=str)
    @CLICommand.arguments("--scheduler-reserved-gpus", help="The number of GPUs reserved for the scheduler", type=int)
    @CLICommand.arguments("--scheduler-env-var", help=SCHEDULER_ENVVAR_HELP, type=str, action="append")
    @CLICommand.arguments(
        "--worker-dashboard-address",
        help="The dashboard address for the worker. Only used for 'dask' cluster type.",
        type=str,
    )
    @CLICommand.arguments(
        "--worker-instance-type",
        help="The instance type of the worker. Only used for 'dask' cluster type.",
        type=str,
    )
    @CLICommand.arguments(
        "--worker-startup-script",
        help="The startup script for the worker. Only used for 'dask' cluster type.",
        type=str,
    )
    @CLICommand.arguments(
        "--worker-reserved-gpus",
        help="The number of GPUs reserved for the worker. Only used for 'dask' cluster type.",
        type=int,
    )
    @CLICommand.arguments("--worker-env-var", help=WORKER_ENVVAR_HELP, type=str, action="append")
    @CLICommand.arguments("--system-packages", help=SYSTEM_PACKAGE_HELP, type=str, action="append")
    @CLICommand.arguments("--conda-packages", help=CONDA_PACKAGE_HELP, type=str, action="append")
    @CLICommand.arguments("--pip-packages", help=PIP_PACKAGE_HELP, type=str, action="append")
    @CLICommand.arguments("--nworkers", help="Number of workers in the cluster", type=int)
    @CLICommand.arguments("--container-image", help="The container image to use", type=str)
    @CLICommand.arguments(
        "--data-output-mount-point",
        help="The path to where the data output will be mounted",
        type=str,
    )
    @CLICommand.arguments("--cluster-lifetime", help=CLUSTER_LIFETIME_HELP, type=str)
    @CLICommand.arguments("--expiry-duration", help=EXPIRY_DURATION_HELP, type=str)
    @CLICommand.arguments("--additional-open-ports", help=ADDITIONAL_PORT_HELP, type=int, action="append")
    @CLICommand.arguments(
        "--additional-port-mappings", help=PORT_MAPPING_HELP, type=valid_port_mapping, action="append"
    )
    @CLICommand.arguments(
        "--dataset-mount",
        help=DATASET_MOUNT_HELP,
        default=None,
        action="append",
        type=str,
    )
    @CLICommand.arguments(
        "--workspace-mount",
        help=WORKSPACE_MOUNT_HELP,
        default=None,
        action="append",
        type=str,
    )
    @CLICommand.arguments("--label", help=LABEL_HELP, type=str, action="append")
    @CLICommand.arguments(
        "--labels-locked", help="Labels will not be able to be changed. Default=False", action="store_const", const=True
    )
    @CLICommand.arguments(
        "--multi-node", help="Is this a multi-node cluster? Default=False", action="store_const", const=True
    )
    @CLICommand.arguments("--job-order", help="Order of the job; from 1 to 99.", type=int)
    @CLICommand.arguments(
        "--job-priority", help="Priority of the job; choose from 'LOW', 'NORMAL', or 'HIGH'. Default='NORMAL'", type=str
    )
    @CLICommand.arguments(
        "--min-availability", help="Minimum replicas that need to be scheduled to start a multi-node job.", type=int
    )
    @CLICommand.arguments("--min-time-slice", help=MIN_TIME_SLICE_HELP, type=str, action=check_dhms_duration())
    @CLICommand.arguments(
        "--options",
        metavar="<key:value>",
        type=check_key_value_pattern,
        default=None,
        help=OPTIONS_HELP,
        action="append",
    )
    @CLICommand.arguments("--preempt-class", help=PREEMPT_HELP, type=str)
    @CLICommand.arguments(
        "--topology-constraint", help=TOPOLOGY_CONSTRAINT_HELP, type=str, choices=TOPOLOGY_CONSTRAINT_ENUM
    )
    @CLICommand.arguments(
        "--user-secret",
        metavar="<secret[:key_name:alias_name]>",
        help=USER_SECRET_HELP,
        type=check_secret_pattern,
        default=None,
        action="append",
    )
    @CLICommand.arguments(
        "--remove-dataset-mounts", help="Remove any existing dataset mounts for this cluster", action="store_true"
    )
    @CLICommand.arguments(
        "--remove-workspace-mounts", help="Remove any existing workspace mounts for this cluster", action="store_true"
    )
    @CLICommand.mutex(["remove_dataset_mounts"], ["dataset_mount"])
    @CLICommand.mutex(["remove_workspace_mounts"], ["workspace_mount"])
    @CLICommand.command(
        name="update",
        help="Update an existing cluster in the STOPPED or FAILED state",
        description="Update an existing cluster",
    )
    def update(self, args):
        """Update an existing cluster."""
        try:
            update_resp = self.api.update(
                cluster_id=getattr(args, "cluster_id", None),
                org=getattr(args, "org", None),
                team=getattr(args, "team", None),
                additional_port_mappings=getattr(args, "additional_port_mappings", None),
                cluster_lifetime=getattr(args, "cluster_lifetime", None),
                conda_packages=getattr(args, "conda_packages", None),
                container_image=getattr(args, "container_image", None),
                data_output_mount_point=getattr(args, "data_output_mount_point", None),
                dataset_mount=getattr(args, "dataset_mount", None),
                expiry_duration=getattr(args, "expiry_duration", None),
                job_order=getattr(args, "job_order", None),
                job_priority=getattr(args, "job_priority", None),
                label=getattr(args, "label", None),
                labels_locked=getattr(args, "labels_locked", None),
                min_availability=getattr(args, "min_availability", None),
                min_time_slice=getattr(args, "min_time_slice", None),
                multi_node=getattr(args, "multi_node", None),
                name=getattr(args, "name", None),
                nworkers=getattr(args, "nworkers", None),
                options=getattr(args, "options", None),
                pip_packages=getattr(args, "pip_packages", None),
                preempt_class=getattr(args, "preempt_class", None),
                remove_dataset_mounts=getattr(args, "remove_dataset_mounts", None),
                remove_workspace_mounts=getattr(args, "remove_workspace_mounts", None),
                scheduler_dashboard_address=getattr(args, "scheduler_dashboard_address", None),
                scheduler_env_var=getattr(args, "scheduler_env_var", None),
                scheduler_instance_type=getattr(args, "scheduler_instance_type", None),
                scheduler_port=getattr(args, "scheduler_port", None),
                scheduler_reserved_gpus=getattr(args, "scheduler_reserved_gpus", None),
                scheduler_startup_script=getattr(args, "scheduler_startup_script", None),
                system_packages=getattr(args, "system_packages", None),
                topology_constraint=getattr(args, "topology_constraint", None),
                user_secret=getattr(args, "user_secret", None),
                worker_dashboard_address=getattr(args, "worker_dashboard_address", None),
                worker_env_var=getattr(args, "worker_env_var", None),
                worker_instance_type=getattr(args, "worker_instance_type", None),
                worker_reserved_gpus=getattr(args, "worker_reserved_gpus", None),
                worker_startup_script=getattr(args, "worker_startup_script", None),
                workspace_mount=getattr(args, "workspace_mount", None),
                _deprecated_additional_open_ports=getattr(args, "additional_open_ports", None),
            )
        except ClusterParamError:
            # TODO: Make this raise an actual error.
            return
        except EmptyClusterUpdateError as err:
            self.printer.print_error(f"\n{err}\n")
            # TODO: Make this return non-zero
            return

        if update_resp:
            # Errors will result in an empty response
            self.printer.print_update(ClusterRequestStatus(update_resp))
