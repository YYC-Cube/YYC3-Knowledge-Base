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
import re

from basecommand.api.quickstart_cluster import (
    ClusterParamError,
    EmptyClusterUpdateError,
    valid_port_mapping,
)
from basecommand.command.args_validation import check_secret_pattern
from basecommand.command.batch import TOPOLOGY_CONSTRAINT_ENUM
from basecommand.command.quickstart import QuickStartCommand
from basecommand.command.quickstart_cluster import (
    ADDITIONAL_PORT_HELP,
    CLUSTER_LIFETIME_HELP,
    CLUSTER_TYPE_ENUM,
    CLUSTER_TYPE_HELP,
    CONDA_PACKAGE_HELP,
    DATASET_MOUNT_HELP,
    EXPIRY_DURATION_HELP,
    LABEL_HELP,
    MIN_TIME_SLICE_HELP,
    MULTI_NODE_HELP,
    OPTIONS_HELP,
    PIP_PACKAGE_HELP,
    PORT_MAPPING_HELP,
    PREEMPT_HELP,
    SCHEDULER_ENVVAR_HELP,
    SYSTEM_PACKAGE_HELP,
    TOPOLOGY_CONSTRAINT_HELP,
    USER_SECRET_HELP,
    WORKER_ENVVAR_HELP,
    WORKSPACE_MOUNT_HELP,
)
from basecommand.constants import QUICKSTART_API_VERSION, QUICKSTART_TEMPLATE_TYPE_ENUM
from basecommand.data.pym.ClusterRequestStatus import ClusterRequestStatus
from basecommand.data.pym.ProjectCreateRequest import ProjectCreateRequest
from basecommand.data.pym.ProjectInfoResponse import ProjectInfoResponse
from basecommand.data.pym.ProjectListResponse import ProjectListResponse
from basecommand.data.pym.ProjectModifyParams import ProjectModifyParams
from basecommand.data.pym.ProjectModifyRequest import ProjectModifyRequest
from basecommand.data.pym.ProjectParams import ProjectParams
from basecommand.data.pym.ProjectRequestStatus import ProjectRequestStatus
from basecommand.data.pym.ProjectTemplateInfoResponse import ProjectTemplateInfoResponse
from basecommand.data.pym.ProjectTemplateListResponse import ProjectTemplateListResponse
from basecommand.data.pym.ProjectTemplateRequestStatus import (
    ProjectTemplateRequestStatus,
)
from basecommand.printer.quickstart_project import QuickStartProjectPrinter
from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_key_value_pattern,
    check_valid_columns,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.errors import (
    NgcAPIError,
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
)
from ngcbase.util.utils import confirm_remove, get_columns_help


class QuickStartProjectSubCommand(QuickStartCommand):  # noqa: D101
    CMD_NAME = "project"
    HELP = "QuickStart Project Commands"
    DESC = "QuickStart Project Commands"
    CMD_ALIAS = []
    CMD_ALT_NAME = ""

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.basecommand.quickstart.project
        self.cluster_api = self.client.basecommand.quickstart.cluster
        self.image_api = self.client.registry.image
        self.label_set_api = self.client.registry.label_set
        self.user_api = self.client.users

    @property
    def printer(self):
        """Printer."""
        return QuickStartProjectPrinter(self.client.config)

    LIST_HELP = "List projects."
    TEMPLATE_TYPE_HELP = (
        f"Type of template to show. Choices: {', '.join(QUICKSTART_TEMPLATE_TYPE_ENUM)}. Default='dask'"
    )
    TEMPLATE_LIST_HELP = "List project templates."
    CREATE_TARGET_HELP = "Name of the project to create. Format: org/[team/]project_name."
    CREATE_OWNER_HELP = "The owner of the project. If not specified, the email for the current user will be used."
    # common project attributes
    REMOVE_HELP = "Remove a project"

    columns_dict = {
        "ace": "ACE",
        "description": "Description",
        "id": "ID",
        "name": "Name",
        "org": "Org",
        "owner": "Owner",
        "team": "Team",
    }
    columns_default = ("name", "Name")
    columns_help = get_columns_help(columns_dict, columns_default)

    template_columns_dict = {
        "id": "ID",
        "name": "Name",
        "description": "Description",
        "display-image-url": "Display Image",
    }
    template_columns_default = ("name", "Name")
    template_columns_help = get_columns_help(template_columns_dict, template_columns_default)

    # pylint:disable=undefined-variable
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.arguments("--org-only", help="Don't return clusters created at the team level", action="store_true")
    @CLICommand.arguments("--owned", help="Only return clusters I own (admin only)", action="store_true")
    @CLICommand.command(name="list", help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List projects."""
        arg_cols = args.column if hasattr(args, "column") else None
        columns = self._col_translate(arg_cols) if arg_cols else None

        check_add_args_columns(columns, QuickStartProjectSubCommand.columns_default)
        project_list = self.api.list(org=args.org, team=args.team, org_only=args.org_only, owned=args.owned)
        project_list_response = ProjectListResponse({"projects": project_list})
        self.printer.print_project_list(project_list_response.projects, columns=columns)

    @staticmethod
    def _col_translate(columns):
        translate_table = {
            "container-image": "container_image",
            "display-image-url": "display_image_url",
            "nworkers": "Workers",
            "cluster-lifetime": "cluster_lifetime",
            "scheduler-startup-script": "scheduler_startup_script",
            "worker-startup-script": "worker_startup_script",
        }
        return [(translate_table.get(col, col), disp) for col, disp in columns]

    @CLICommand.arguments("--name", help="The name of the project", type=str, required=True)
    @CLICommand.arguments("--owner", help=CREATE_OWNER_HELP, type=str)
    @CLICommand.arguments("--description", help="A desription of the project", type=str, required=True)
    @CLICommand.command(name="create", help="Create a project", description="Create a new project")
    def create(self, args):
        """Create a new project."""
        self.config.validate_configuration(guest_mode_allowed=False)
        # 'ace' is required for create. Since it is a general option, we can't make the arg required, so test it here.
        ace = args.ace or self.config.ace_name
        owner = args.owner or self._get_owner()
        if not ace:
            print(
                "\nYou must specify an ACE for the project, either in your configuration, "
                "or by specifying the '--ace' argument\n"
            )
            return
        project_params = ProjectParams({"description": args.description, "name": args.name})
        project_create_obj = ProjectCreateRequest(
            {"ace": ace, "owner": owner, "params": project_params, "version": QUICKSTART_API_VERSION}
        )
        # Verify that the parameters for creating a project are valid.
        project_create_obj.isValid()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        project_response = self.api.create(org_name, team_name, project_create_obj)
        if project_response:
            # Errors will result in an empty response
            self.printer.print_create(project_response)

    def _get_owner(self):
        user_response = self.user_api.user_who()
        return user_response.user.email

    @CLICommand.arguments("project_id", help="The ID of the project", type=str)
    @CLICommand.arguments("--name", help="The name of the project", type=str)
    @CLICommand.arguments("--description", help="A desription of the project", type=str)
    @CLICommand.command(name="update", help="Update a project", description="Update a project")
    def update(self, args):
        """Update a project."""
        self.config.validate_configuration(guest_mode_allowed=False)
        param_obj = ProjectModifyParams({"description": args.description, "name": args.name})
        update_obj = ProjectModifyRequest({"version": QUICKSTART_API_VERSION, "params": param_obj})
        update_obj.isValid()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        update_resp = self.api.update(org_name, team_name, args.project_id, update_obj)
        self.printer.print_update(update_resp)

    @CLICommand.arguments("project_id", help="The ID of the project", type=str)
    @CLICommand.command(
        name="info",
        help="Information about a project",
        description="Show information about a project",
    )
    def info(self, args):
        """Return information about a specific project."""
        try:
            info = self.api.info(args.project_id, org=args.org, team=args.team)
        except ResourceNotFoundException:
            msg = f"\nProject '{args.project_id}' does not exist.\n"
            self.printer.print_error(msg)
            return
        self.printer.print_info(ProjectInfoResponse(info))

    @CLICommand.arguments("project_id", help="The ID of the project", type=str)
    @CLICommand.command(name="remove", help="Remove a project", description="Delete a project")
    def remove(self, args):
        """Delete a specific project."""
        confirm_remove(printer=self.printer, target=args.project_id, default=False)
        remove_info = self.api.remove(args.project_id, org=args.org, team=args.team)
        self.printer.print_remove(ProjectRequestStatus(remove_info))

    @CLICommand.arguments("project_id", help="The ID of the project", type=str)
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
    @CLICommand.arguments("--min-time-slice", help=MIN_TIME_SLICE_HELP, type=str)
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
        name="cluster-create",
        help="Create a cluster for the specified project",
        description="Create a new cluster for the specified project",
    )
    def cluster_create(self, args):
        """Create a new cluster."""
        try:
            cluster_response = self.cluster_api.create(
                project_id=args.project_id,
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
        except ResourceAlreadyExistsException as e:
            reason = e.explanation or e.response.content or "-unknown conflict-"
            details = str(e)
            if reason:
                try:
                    detail_dict = json.loads(reason)
                    details = detail_dict.get("requestStatus", {}).get("statusDescription", str(e))
                except (TypeError, json.JSONDecodeError):
                    pass
            self.printer.print_error(f"\nYour request could not be completed: {details}\n")
            return
        except ResourceNotFoundException as e:
            # Either the project doesn't exist, or the container image doesn't exist, or there was an invalid instance
            # type.
            reason = e.explanation or e.response.content or "-not found-"
            identified = False
            if f"Project: {args.project_id} not found" in reason:
                reason = f"There is no project with the ID of '{args.project_id}'"
                identified = True
            else:
                # Try the container image
                img = args.container_image
                if ":" in img:
                    repo, tag = args.container_image.split(":")
                else:
                    repo = img
                    tag = ""
                org_name = args.org or self.config.org_name
                team_name = args.team or self.config.team_name
                try:
                    self.image_api.extended_image_info(org_name, team_name, repo, tag)
                except (ValueError, ResourceNotFoundException):
                    reason = f"Container image '{args.container_image}' does not exist"
                    identified = True
            if not identified:
                # Check the instance types
                ace_name = args.ace or self.config.ace_name
                resp = self.cluster_api.list_instance_types(
                    org=args.org,
                    team=args.team,
                    ace=ace_name,
                    cluster_type=args.cluster_type,
                    multinode=args.multi_node,
                )
                valid_types = set()
                components = resp["clusterComponents"]
                for component in components:
                    valid_types.update([typ["machineType"] for typ in component["instanceTypes"]])
                if args.scheduler_instance_type not in valid_types:
                    reason = f"Invalid scheduler instance type: '{args.scheduler_instance_type}'"
                elif args.worker_instance_type not in valid_types:
                    reason = f"Invalid worker instance type: '{args.worker_instance_type}'"
            self.printer.print_error(f"\nYour request could not be completed: {reason}.\n")
            return

        self.printer.print_add_cluster(ClusterRequestStatus(cluster_response))

    @CLICommand.arguments("project_id", help="The ID of the project", type=str)
    @CLICommand.arguments("--cluster-id", help="The ID of the cluster to remove", type=str, required=True)
    @CLICommand.command(
        name="cluster-remove",
        help="Remove a cluster from a project",
        description="Shutdown and delete a cluster from a project",
    )
    def cluster_remove(self, args):
        """Shutdown and delete a specific cluster."""
        confirm_remove(printer=self.printer, target=args.cluster_id, default=False)
        remove_cluster_resp = self.cluster_api.remove(
            args.cluster_id, org=args.org, team=args.team, project_id=args.project_id
        )
        self.printer.print_remove_cluster(ClusterRequestStatus(remove_cluster_resp))

    @CLICommand.arguments("--name", help="The name of the project template", required=True, type=str)
    @CLICommand.arguments("--cluster-name", help="The name of the cluster", type=str)
    @CLICommand.arguments("--description", help="A desription of the project template", required=True, type=str)
    @CLICommand.arguments("--cluster-type", help=CLUSTER_TYPE_HELP, choices=CLUSTER_TYPE_ENUM, required=True)
    @CLICommand.arguments("--container-image", help="Container image for the template", required=True, type=str)
    @CLICommand.arguments(
        "--display-image-url", help="URL of the image to display for the template", required=True, type=str
    )
    @CLICommand.arguments("--nworkers", help="Number of workers", required=True, type=int)
    @CLICommand.arguments("--cluster-lifetime", help=CLUSTER_LIFETIME_HELP, required=True, type=str)
    @CLICommand.arguments("--expiry-duration", help=EXPIRY_DURATION_HELP, type=str)
    @CLICommand.arguments("--additional-open-ports", help=ADDITIONAL_PORT_HELP, type=int, action="append")
    @CLICommand.arguments(
        "--additional-port-mappings", help=PORT_MAPPING_HELP, type=valid_port_mapping, action="append"
    )
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
    @CLICommand.arguments(
        "--data-output-mount-point", help="The path to where the data output will be mounted", type=str, required=True
    )
    @CLICommand.arguments("--dataset-mount", help=DATASET_MOUNT_HELP, default=None, action="append", type=str)
    @CLICommand.arguments("--workspace-mount", help=WORKSPACE_MOUNT_HELP, default=None, action="append", type=str)
    @CLICommand.arguments("--label", help=LABEL_HELP, type=str, action="append")
    @CLICommand.arguments(
        "--labels-locked", help="Labels will not be able to be changed. Default=False", action="store_true"
    )
    @CLICommand.arguments(
        "--default", help="Set this template as the default for the cluster type. Admin only", action="store_true"
    )
    @CLICommand.arguments("--multi-node", help=MULTI_NODE_HELP, action="store_true")
    @CLICommand.arguments("--job-order", help="Order of the job; from 1 to 99.", type=int)
    @CLICommand.arguments(
        "--job-priority", help="Priority of the job; choose from 'LOW', 'NORMAL', or 'HIGH'. Default='NORMAL'", type=str
    )
    @CLICommand.arguments(
        "--min-availability", help="Minimum replicas that need to be scheduled to start a multi-node job.", type=int
    )
    @CLICommand.arguments("--min-time-slice", help=MIN_TIME_SLICE_HELP, type=str)
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
        name="create-template", help="Create a project template", description="Create a new project template"
    )
    def create_template(self, args):
        """Create a new project template."""
        try:
            template_response = self.api.create_template(
                cluster_type=getattr(args, "cluster_type", None),
                ace=getattr(args, "ace", None),
                org=getattr(args, "org", None),
                team=getattr(args, "team", None),
                name=getattr(args, "name", None),
                description=getattr(args, "description", None),
                display_image_url=getattr(args, "display_image_url", None),
                default=getattr(args, "default", None),
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
                cluster_name=getattr(args, "cluster_name", None),
                nworkers=getattr(args, "nworkers", None),
                preempt_class=getattr(args, "preempt_class", None),
                scheduler_port=getattr(args, "scheduler_port", None),
                topology_constraint=getattr(args, "topology_constraint", None),
                conda_packages=getattr(args, "conda_packages", None),
                pip_packages=getattr(args, "pip_packages", None),
                system_packages=getattr(args, "system_packages", None),
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
        except NgcAPIError as e:
            if args.default:
                # Check if there is a conflict
                resp = e.response.json()
                msg = resp.get("requestStatus", {}).get("statusDescription", "")
                match = re.match(r".+Conflict with existing default template \[([0-9a-f-]+)\]$", msg)
                if match:
                    curr_id = match.groups()[0]
                    self.printer.print_error(
                        f"\nThere is an existing default template ('{curr_id}'). You must update that to remove the "
                        "default setting before creating a new default template."
                    )
                    return
            # Not a conflict with default; raise the original exception
            raise
        if template_response:
            # Errors will result in an empty response
            self.printer.print_create_template(ProjectTemplateRequestStatus(template_response))

    @CLICommand.arguments("template_id", help="The ID of the template", type=str)
    @CLICommand.arguments("--name", help="The name of the project template", type=str)
    @CLICommand.arguments("--cluster-name", help="The name of the cluster", type=str)
    @CLICommand.arguments("--description", help="A desription of the project template", type=str)
    @CLICommand.arguments("--container-image", help="Container image for the template", type=str)
    @CLICommand.arguments("--display-image-url", help="URL of the image to display for the template", type=str)
    @CLICommand.arguments("--nworkers", help="Number of workers", type=int)
    @CLICommand.arguments("--cluster-lifetime", help=CLUSTER_LIFETIME_HELP, type=str)
    @CLICommand.arguments("--expiry-duration", help=EXPIRY_DURATION_HELP, type=str)
    @CLICommand.arguments("--additional-open-ports", help=ADDITIONAL_PORT_HELP, type=int, action="append")
    @CLICommand.arguments(
        "--additional-port-mappings", help=PORT_MAPPING_HELP, type=valid_port_mapping, action="append"
    )
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
        "--worker-instance-type", help="The instance type of the worker. Only used for 'dask' cluster type.", type=str
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
    @CLICommand.arguments(
        "--data-output-mount-point", help="The path to where the data output will be mounted", type=str
    )
    @CLICommand.arguments("--dataset-mount", help=DATASET_MOUNT_HELP, default=None, action="append", type=str)
    @CLICommand.arguments("--workspace-mount", help=WORKSPACE_MOUNT_HELP, default=None, action="append", type=str)
    @CLICommand.arguments("--label", help=LABEL_HELP, type=str, action="append")
    @CLICommand.arguments(
        "--labels-locked",
        help="Labels will not be able to be changed. Default=False",
        action="store_true",
        default=None,
    )
    @CLICommand.arguments(
        "--default", help="Set this template as the default for the cluster type. Admin only", action="store_true"
    )
    @CLICommand.arguments(
        "--remove-default",
        help="Unmark this template as the default for this template's cluster type. Admin only",
        action="store_true",
    )
    @CLICommand.arguments("--multi-node", help=MULTI_NODE_HELP, action="store_true", default=None)
    @CLICommand.arguments("--job-order", help="Order of the job; from 1 to 99.", type=int)
    @CLICommand.arguments(
        "--job-priority", help="Priority of the job; choose from 'LOW', 'NORMAL', or 'HIGH'. Default='NORMAL'", type=str
    )
    @CLICommand.arguments(
        "--min-availability", help="Minimum replicas that need to be scheduled to start a multi-node job.", type=int
    )
    @CLICommand.arguments("--min-time-slice", help=MIN_TIME_SLICE_HELP, type=str)
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
    @CLICommand.mutex(["remove_default"], ["default"])
    @CLICommand.command(
        name="update-template", help="Modify a project template", description="Modify a project template"
    )
    def update_template(self, args):
        """Update a project template."""
        try:
            template_response = self.api.update_template(
                args.template_id,
                org=getattr(args, "org", None),
                team=getattr(args, "team", None),
                additional_port_mappings=getattr(args, "additional_port_mappings", None),
                cluster_lifetime=getattr(args, "cluster_lifetime", None),
                cluster_name=getattr(args, "cluster_name", None),
                conda_packages=getattr(args, "conda_packages", None),
                container_image=getattr(args, "container_image", None),
                data_output_mount_point=getattr(args, "data_output_mount_point", None),
                dataset_mount=getattr(args, "dataset_mount", None),
                default=getattr(args, "default", None),
                description=getattr(args, "description", None),
                display_image_url=getattr(args, "display_image_url", None),
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
                remove_default=getattr(args, "remove_default", None),
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
        except NgcAPIError as e:
            if args.default:
                # Check if there is a conflict
                resp = e.response.json()
                msg = resp.get("requestStatus", {}).get("statusDescription", "")
                match = re.match(r".+Conflict with existing default template \[([0-9a-f-]+)\]$", msg)
                if match:
                    curr_id = match.groups()[0]
                    self.printer.print_error(
                        f"\nThere is an existing default template ('{curr_id}'). You must update that to remove the "
                        "default setting before creating a new default template."
                    )
                    return
            # Not a conflict with default; raise the original exception
            raise
        if template_response:
            # Errors will result in an empty response
            self.printer.print_update_template(ProjectTemplateRequestStatus(template_response))

    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=template_columns_help,
        default=None,
        action="append",
        type=lambda value, template_columns_dict=template_columns_dict: check_valid_columns(
            value, template_columns_dict
        ),
    )
    @CLICommand.arguments("--default-only", help="Only list default template", action="store_true")
    @CLICommand.arguments("--template-type", help=TEMPLATE_TYPE_HELP, default="dask")
    @CLICommand.command(name="list-templates", help=TEMPLATE_LIST_HELP, description=TEMPLATE_LIST_HELP)
    def list_templates(self, args):
        """List project templates."""
        arg_cols = args.column if hasattr(args, "column") else None
        columns = self._col_translate(arg_cols) if arg_cols else None
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name

        check_add_args_columns(columns, QuickStartProjectSubCommand.template_columns_default)
        template_list = self.api.list_templates(
            org=org_name, team=team_name, default_only=args.default_only, template_type=args.template_type
        )
        self.printer.print_template_list(ProjectTemplateListResponse(template_list), columns=columns)

    @CLICommand.arguments("template_id", help="The ID of the template", type=str)
    @CLICommand.command(
        name="remove-template", help="Remove a project template", description="Delete a project template"
    )
    def remove_template(self, args):
        """Delete a specific project template."""
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        confirm_remove(printer=self.printer, target=args.template_id, default=False)
        # We need to get the name of the template to display in the results.
        template_info = self.api.info_template(args.template_id, org=org_name, team=team_name)
        template_name = template_info.get("params", {}).get("name")
        self.api.remove_template(args.template_id, org=org_name, team=team_name)
        self.printer.print_remove_template(args.template_id, template_name)

    @CLICommand.arguments("template_id", help="The ID of the template", type=str)
    @CLICommand.command(
        name="info-template",
        help="Get information about a project template",
        description="Get information about a project template",
    )
    def info_template(self, args):
        """Return information about a specific project template."""
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        info = self.api.info_template(args.template_id, org=org_name, team=team_name)
        self.printer.print_info_template(ProjectTemplateInfoResponse(info))
