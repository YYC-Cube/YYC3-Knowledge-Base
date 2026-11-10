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

from argparse import ArgumentTypeError
import json
import re
from typing import Any, Literal, NamedTuple, Optional, Sequence

from basecommand.api.utils import parse_secrets
from basecommand.constants import QUICKSTART_API_VERSION
from basecommand.data.api.NetworkProtocolEnum import NetworkProtocolEnum
from basecommand.data.pym.ClusterComponentModifyParams import (
    ClusterComponentModifyParams,
)
from basecommand.data.pym.ClusterComponentParams import ClusterComponentParams
from basecommand.data.pym.ClusterCreateRequest import ClusterCreateRequest
from basecommand.data.pym.ClusterListResponse import ClusterListResponse
from basecommand.data.pym.ClusterModifyParams import ClusterModifyParams
from basecommand.data.pym.ClusterModifyRequest import ClusterModifyRequest
from basecommand.data.pym.ClusterParams import ClusterParams
from basecommand.data.pym.DataInput import DataInput
from basecommand.data.pym.Dataset import Dataset
from basecommand.data.pym.Workspace import Workspace
from basecommand.printer.quickstart_cluster import QuickStartClusterPrinter
from ngcbase.errors import InvalidArgumentError, NgcException
from ngcbase.util.datetime_utils import dhms_to_isoduration
from ngcbase.util.utils import format_org_team

PAGE_SIZE = 1000
VALID_PROTOCOLS = rf"({'|'.join(NetworkProtocolEnum)})"
RW_TRUE = ("true", "t", "yes", "y", "rw", "1")
RW_FALSE = ("false", "f", "no", "n", "ro", "0")


class ClusterParamError(NgcException):
    """Failed to generate cluster params."""

    def __str__(self):  # noqa: D105
        return "Failed to generate cluster params. See stdout/stderr for more info."


class EmptyClusterUpdateError(NgcException):
    """The cluster update payload was going to be empty."""


class _ConfigValues(NamedTuple):  # pylint: disable=inherit-non-class
    org: Optional[str]
    team: Optional[str]
    ace: Optional[str]


def _get_overridden_values(config, org=None, team=None, ace=None) -> _ConfigValues:
    org = org or config.org_name
    team = team or config.team_name
    ace = ace or config.ace_name
    if org == "no-org":
        org = None
    if team == "no-team":
        team = None
    if ace == "no-ace":
        ace = None

    return _ConfigValues(org=org, team=team, ace=ace)


def valid_port_mapping(val):
    """Returns the string if it is valid; otherwise raises an ArgumentTypeError.

    Port mappings should be in the form '[name:]port[/protocol]'.
    """  # noqa: D401
    if val is None:
        return val
    if not isinstance(val, str):
        raise ArgumentTypeError("Additional port mappings must be strings")
    # First character alpha, rest alphanum, max 10, followed by colon
    name_pat = "[a-zA-Z][a-zA-z0-9]{0,9}:"
    matched = re.match(rf"^({name_pat})?\d+(/{VALID_PROTOCOLS})?$", val)
    if not matched:
        raise ArgumentTypeError(f"Port mappings should be in the form '[name:]port[/protocol]'; received '{val}'.")
    # The HTTPS and GRPC protocols don't support names
    groups = matched.groups()
    name = groups[0]
    proto = groups[-1] or "HTTPS"
    no_name_protos = (None, "HTTPS", "GRPC")
    if proto in no_name_protos:
        if name:
            raise ArgumentTypeError("HTTPS and GRPC protocols do no support names")
    else:
        if not name:
            raise ArgumentTypeError(f"The '{proto}' protocol requires a name for the mapping")
    return val


def _extract_port_mappings(mappings):
    """Given a string in the format '[name:]port/protocol', return a list of dicts in the format required by the API."""
    if mappings is None:
        return []
    return_mappings = []
    if not isinstance(mappings, (list, tuple)):
        mappings = [mappings]
    for mapping in mappings:
        # Validate the mapping, in case the value didn't already get validated by argparse.
        valid_port_mapping(mapping)

        name, port_prot = mapping.split(":") if ":" in mapping else (None, mapping)
        port, prot = port_prot.split("/") if "/" in port_prot else (port_prot, "HTTPS")
        port_dict = {"containerPort": f"{port}", "protocol": f"{prot}"}
        if name and prot not in ("HTTPS", "GRPC"):
            port_dict["name"] = name
        return_mappings.append(port_dict)
    return return_mappings


def _validate_lifetime(val, param_name):
    """Ensure that the value specified for 'cluster_lifetime' and 'expiry_duration' is in a valid format."""
    err_msg = (
        f"The '--{param_name.replace('_', '-')}' argument '{val}' is not valid. It should be in the format <num>X, "
        "where 'X' is a single letter representing the unit of time: <d|h|m|s>, for days, hours, minutes, and seconds, "
        "respectively."
    )
    num, unit = val[:-1], val[-1]
    try:
        int(num)
    except ValueError:
        raise InvalidArgumentError("cluster-lifetime", message=err_msg) from None
    if unit.lower() not in "dhms":
        raise InvalidArgumentError("cluster-lifetime", message=err_msg) from None


def create_data_input_obj(
    dataset_mount=None,
    workspace_mount=None,
):
    """The `dataInput` object is a nested combination of dataset and workspace info."""  # noqa: D401
    # Some args are not present when creating a cluster from a project.
    new_dataset_mount = new_workspace_mount = None
    # Create the dataset mounts
    if dataset_mount:
        new_dataset_mount = []
        for dsm in dataset_mount:
            try:
                id_, mp = dsm.split(":")
            except ValueError:
                err_msg = f"\nDataset mounts must be in the format 'id:path'. Your argument of '{dsm}' is not valid"
                raise InvalidArgumentError(err_msg) from None
            try:
                id_ = int(id_)
            except ValueError:
                err_msg = f"\nThe 'id' portion of the dataset mount argument must be an integer, not '{id_}'."
                raise InvalidArgumentError(err_msg) from None
            new_dataset_mount.append(Dataset({"id": id_, "mountPoint": mp}))
    # Create the workspace mounts
    if workspace_mount:
        new_workspace_mount = []
        for dsm in workspace_mount:
            try:
                id_, mp, rw = dsm.split(":")
            except ValueError:
                err_msg = (
                    f"\nWorkspace mounts must be in the format 'id:path:rw'. Your argument of '{dsm}' is not valid"
                )
                raise InvalidArgumentError("workspace-mount", message=err_msg) from None
            if rw not in RW_TRUE and rw not in RW_FALSE:
                err_msg = f"\nThe 'rw' argument for workspace mounts should be 'true' or 'false', not '{rw}'."
                raise InvalidArgumentError("workspace-mount", message=err_msg) from None

            new_workspace_mount.append(Workspace({"id": id_, "mountPoint": mp, "rw": rw.lower() in RW_TRUE}))
    dataset_mount_dicts = [dsm.toDict() for dsm in new_dataset_mount] if new_dataset_mount else {}
    workspace_mount_dicts = [wsm.toDict() for wsm in new_workspace_mount] if new_workspace_mount else {}
    data_input_obj = DataInput({"datasetMounts": dataset_mount_dicts, "workspaceMounts": workspace_mount_dicts})
    if data_input_obj.toDict():
        return data_input_obj
    return {}


def split_key_vals(kv_list):
    """Given a list of key-value pairs in the format `name:value`, return a list of dicts, one for each pair. If any of
    the values are incorrectly formatted, a ValueError will be raised.
    """  # noqa: D205
    ret = []
    if kv_list and not isinstance(kv_list, (list, tuple)):
        kv_list = [kv_list]
    for item in kv_list or []:
        try:
            name, value = item.split(":", 1)
        except ValueError:
            raise ValueError(f"key/value pairs should be in the format 'key_name:value'. Got: '{item}'.") from None
        ret.append({"name": name, "value": value})
    return ret


def _validate_ace(ace, is_create, config):
    # 'ace' is not allowed when updating a cluster.
    if ace and not is_create:
        print("\nYou cannot update the ace for an existing cluster.\n")
        return False
    # 'ace' is required for create. Since it is a general option, we can't make the arg required, so test it here.
    ace = ace or config.ace_name
    if is_create and not ace:
        print(
            "\nYou must specify an ACE for the cluster, either in your configuration, "
            "or by specifying the '--ace' argument\n"
        )
        return False
    return ace


def _create_components(
    component_cls,
    scheduler_env_var=None,
    scheduler_dashboard_address=None,
    scheduler_instance_type=None,
    scheduler_startup_script=None,
    scheduler_reserved_gpus=None,
    worker_env_var=None,
    worker_dashboard_address=None,
    worker_instance_type=None,
    worker_startup_script=None,
    worker_reserved_gpus=None,
):
    """Create the scheduler obj and the worker obj, if present.

    Raises a ValueError if arguments are invalid.
    """
    sched_obj = worker_obj = None
    if component_cls:
        # Will raise ValueError if not in the right format
        scheduler_vars = split_key_vals(scheduler_env_var)
        # Create the scheduler object
        sched_obj = component_cls(
            {
                "dashboardAddress": scheduler_dashboard_address,
                "instanceType": scheduler_instance_type,
                "startupScript": scheduler_startup_script,
                "envVariables": scheduler_vars,
                "gpuReserved": scheduler_reserved_gpus,
            }
        )
        # Will raise ValueError if not in the right format
        worker_vars = split_key_vals(worker_env_var)
        # Create the worker object
        worker_obj = component_cls(
            {
                "dashboardAddress": worker_dashboard_address,
                "instanceType": worker_instance_type,
                "startupScript": worker_startup_script,
                "envVariables": worker_vars,
                "gpuReserved": worker_reserved_gpus,
            }
        )
    return sched_obj, worker_obj


def _add_scheduler_workers(cluster_param_dict, sched_obj, worker_obj):
    if sched_obj.toDict():
        cluster_param_dict["scheduler"] = sched_obj
    if worker_obj.toDict():
        cluster_param_dict["worker"] = worker_obj


def _validate_min_time_slice(val):
    if val is None:
        return val
    if isinstance(val, str):
        return int(dhms_to_isoduration(val).total_seconds())
    # datetime
    return int(val.total_seconds())


def create_cluster_params(
    config,
    is_create,
    param_cls,
    obj_cls,
    component_cls,
    return_params=False,
    *,
    ace=None,
    cluster_type=None,
    worker_instance_type=None,
    additional_open_ports=None,
    additional_port_mappings=None,
    cluster_lifetime=None,
    expiry_duration=None,
    user_secret=None,
    options=None,
    multi_node=None,
    label=None,
    min_time_slice=None,
    container_image=None,
    data_output_mount_point=None,
    labels_locked=None,
    job_order=None,
    job_priority=None,
    min_availability=None,
    cluster_name=None,
    nworkers=None,
    preempt_class=None,
    scheduler_port=None,
    topology_constraint=None,
    conda_packages=None,
    pip_packages=None,
    system_packages=None,
    name=None,
    scheduler_env_var=None,
    scheduler_dashboard_address=None,
    scheduler_instance_type=None,
    scheduler_startup_script=None,
    scheduler_reserved_gpus=None,
    worker_env_var=None,
    worker_dashboard_address=None,
    worker_startup_script=None,
    worker_reserved_gpus=None,
    dataset_mount=None,
    workspace_mount=None,
):
    """Both `create` and `update` follow the same parameter pattern, and that largely holds for clusters defined in a
    template, too. Create an object from the params and return it. If there are any invalid parameters, print an error
    message and return None. If `return_params` is True, the cluster param dict is returned instead of the param object.

    Raises:
        InvalidArgumentError
    """  # noqa: D205
    cluster_name = cluster_name or name
    ace = _validate_ace(ace, is_create, config)
    if ace is False:
        return None
    # The worker_instance_type argument is required for dask clusters and not used in jupyterlab
    qs_printer = QuickStartClusterPrinter(config)
    if is_create and cluster_type == "dask" and not worker_instance_type:
        # TODO: Make special errors for these
        qs_printer.print_ok("\nThe argument `--worker-instance-type` is required for dask cluster types.")
        return None
    if cluster_type == "jupyterlab" and worker_instance_type:
        # TODO: Make special errors for these
        qs_printer.print_ok("\nThe argument `--worker-instance-type` is ignored for jupyterlab cluster types.")
        worker_instance_type = None

    # Ensure that the additional ports, additional port mappings, and cluster lifetime arguments are well-formed.
    addl_ports = additional_open_ports
    addl_port_mappings = _extract_port_mappings(additional_port_mappings)
    if is_create or cluster_lifetime:
        _validate_lifetime(cluster_lifetime, "cluster_lifetime")
    if expiry_duration:
        _validate_lifetime(expiry_duration, "expiry_duration")

    try:
        sched_obj, worker_obj = _create_components(
            component_cls,
            scheduler_env_var=scheduler_env_var,
            scheduler_dashboard_address=scheduler_dashboard_address,
            scheduler_instance_type=scheduler_instance_type,
            scheduler_startup_script=scheduler_startup_script,
            scheduler_reserved_gpus=scheduler_reserved_gpus,
            worker_env_var=worker_env_var,
            worker_dashboard_address=worker_dashboard_address,
            worker_instance_type=worker_instance_type,
            worker_startup_script=worker_startup_script,
            worker_reserved_gpus=worker_reserved_gpus,
        )
    except ValueError:
        return None
    # Create the dataset mounts
    try:
        data_input_obj = create_data_input_obj(
            dataset_mount=dataset_mount,
            workspace_mount=workspace_mount,
        )
    except InvalidArgumentError as e:
        print(e)
        return None
    # Parse the user secrets
    parsed_list = []
    for secret in user_secret or []:
        parts = secret.split(":")
        name = parts[0]
        key_name = env_name = None
        if len(parts) > 1:
            key_name = parts[1]
        if len(parts) > 2:
            env_name = parts[2]
        parsed_list.append([item for item in [name, key_name, env_name] if item])
    secrets = [secret.toDict() for secret in parse_secrets(parsed_list)]
    options = split_key_vals(options)
    if cluster_type:
        multinode = True if cluster_type == "dask" else multi_node
    else:
        multinode = multi_node
    if is_create:
        # Needed so the UI can determine it is a quickstart job
        label = label or []
        label.append(f"quick_start_{cluster_type}")
    min_time_slice = _validate_min_time_slice(min_time_slice)

    cluster_param_dict = {
        "ace": ace,
        "additionalOpenPorts": addl_ports,
        "additionalPortMappings": addl_port_mappings,
        "clusterLifetime": cluster_lifetime,
        "containerImage": container_image,
        "dataInput": data_input_obj,
        "dataOutputMountPoint": data_output_mount_point,
        "expiryDuration": expiry_duration,
        "isLabelLocked": labels_locked,
        "isMultiNode": multinode,
        "jobOrder": job_order,
        "jobPriority": job_priority,
        "labels": label,
        "minAvailability": min_availability,
        "minTimesliceSeconds": min_time_slice,
        "name": cluster_name,
        "nworkers": nworkers,
        "options": options,
        "preemptClass": preempt_class,
        "schedulerPort": scheduler_port,
        "topologyConstraint": topology_constraint,
        "userSecretsSpec": secrets,
    }
    _add_scheduler_workers(cluster_param_dict, sched_obj, worker_obj)

    if conda_packages and not isinstance(conda_packages, (list, tuple)):
        conda_packages = [conda_packages]
    cluster_param_dict["condaPackages"] = conda_packages
    if pip_packages and not isinstance(pip_packages, (list, tuple)):
        pip_packages = [pip_packages]
    cluster_param_dict["pipPackages"] = pip_packages
    if system_packages and not isinstance(system_packages, (list, tuple)):
        system_packages = [system_packages]
    cluster_param_dict["systemPackages"] = system_packages
    cluster_params = param_cls(cluster_param_dict)
    if return_params:
        return cluster_params
    cluster_obj = obj_cls({"params": cluster_params, "version": QUICKSTART_API_VERSION})
    return cluster_obj


def remove_empty_input_obj_values(obj, sub_param_name=None):  # noqa: D103
    # For updates, the dataInput, scheduler, and worker objects should be replaced by None if they have no values.
    param_obj = obj.params
    sub_param_obj = getattr(param_obj, sub_param_name) if sub_param_name else None
    for att in ("dataInput", "scheduler", "worker"):
        for p_obj in (param_obj, sub_param_obj):
            if not p_obj:
                continue
            att_obj = getattr(p_obj, att, None)
            if att_obj:
                att_val = att_obj.toDict()
                if not att_val:
                    setattr(p_obj, att, None)


def format_update(  # noqa: D103
    obj, args=None, has_remove_args=True, *, remove_dataset_mounts=None, remove_workspace_mounts=None
):
    if not has_remove_args:
        return obj.toJSON()
    upd_dict = obj.toDict()
    if args is None:
        rem_data = remove_dataset_mounts
        rem_workmount = remove_workspace_mounts
    else:
        rem_data = args.remove_dataset_mounts
        rem_workmount = args.remove_workspace_mounts
    params = upd_dict.get("params", {})
    cluster_params = params.get("clusterParams", {})
    if rem_data or rem_workmount:
        # Make sure that the params.dataInput object exists
        if "dataInput" not in cluster_params:
            cluster_params["dataInput"] = {}
    if rem_data and rem_workmount:
        # The dataInput value is already an empty dict, so no need to change
        pass
    elif rem_data:
        cluster_params["dataInput"]["datasetMounts"] = []
    elif rem_workmount:
        cluster_params["dataInput"]["workspaceMounts"] = []
    params["clusterParams"] = cluster_params
    upd_dict["params"] = params
    return json.dumps(upd_dict)


class QuickStartClusterAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.config = api_client.config

    @staticmethod
    def _get_cluster_endpoint(org_name=None, team_name=None):
        org_team = format_org_team(org_name, team_name, plural_form=True)
        segments = ["v2"]
        if org_team:
            segments.append(org_team)
        segments.extend(["pym", "clusters"])
        return "/".join(segments)

    @staticmethod
    def _get_project_cluster_endpoint(project_id: str, *, org: Optional[str] = None, team: Optional[str] = None) -> str:
        segments = ["v2"]
        org_team = format_org_team(org, team, plural_form=True)
        if org_team:
            segments.append(org_team)
        segments.extend(["pym", "projects", project_id, "clusters"])
        return "/".join(segments)

    def list(
        self,
        cluster_type: Literal["dask", "jupyterlab"],
        *,
        org: Optional[str] = None,
        team: Optional[str] = None,
        org_only: bool = False,
        owned: bool = False,
    ):
        """List clusters."""
        self.config.validate_configuration(guest_mode_allowed=True, csv_allowed=True)
        org, team, _ = _get_overridden_values(self.config, org=org, team=team)
        ep = self._get_cluster_endpoint(org, team)
        all_objects = "false" if owned else "true"
        all_levels = "false" if org_only else "true"
        url = f"{ep}?type={cluster_type}&allObjects={all_objects}&allLevels={all_levels}"
        resp = self.connection.make_api_request(
            "GET",
            url,
            auth_org=org,
            auth_team=team,
            operation_name="list_clusters",
        )
        clusters = ClusterListResponse(resp).clusters

        return [cluster.toDict() for cluster in clusters]

    def list_instance_types(
        self,
        cluster_type: str,
        *,
        multinode: bool = False,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
    ):
        """List all available instance types."""
        self.config.validate_configuration(guest_mode_allowed=True)
        org, team, ace = _get_overridden_values(self.config, org=org, team=team, ace=ace)

        ep = self._get_cluster_endpoint(org, team)
        url = f"{ep}/instance-types?type={cluster_type}&ace={ace}&multi-node={str(multinode).lower()}"

        resp = self.connection.make_api_request(
            "GET",
            url,
            auth_org=org,
            auth_team=team,
            operation_name="list_instance_types",
        )
        return resp

    def info(
        self,
        cluster_id: str,
        *,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        """Get information about a cluster."""
        self.config.validate_configuration(guest_mode_allowed=True)
        org, team, _ = _get_overridden_values(self.config, org=org, team=team)
        ep = self._get_cluster_endpoint(org, team)
        url = f"{ep}/{cluster_id}/info"

        resp = self.connection.make_api_request(
            "GET",
            url,
            auth_org=org,
            auth_team=team,
            operation_name="cluster_info",
        )
        return resp.get("clusterInfo")

    def status(
        self,
        cluster_id: str,
        *,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        """Get the status of a cluster."""
        self.config.validate_configuration(guest_mode_allowed=True)
        org, team, _ = _get_overridden_values(self.config, org=org, team=team)

        ep = self._get_cluster_endpoint(org, team)
        url = f"{ep}/{cluster_id}/status"

        resp = self.connection.make_api_request(
            "GET",
            url,
            auth_org=org,
            auth_team=team,
            operation_name="cluster_status",
        )
        return resp.get("clusterStatus")

    def remove(  # noqa: D417
        self,
        cluster_id: str,
        *,
        project_id: Optional[str] = None,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        """Shutdown and delete a cluster.

        Args:
            project_id: If provided, will remove the cluster from the specified project.
            org: Specify the organization name (or use 'no-org' to override other sources and specify no org.)
            team: Specify the team name (or use 'no-team' to override other sources and specify no team.)
        """
        self.config.validate_configuration(guest_mode_allowed=False)
        org, team, _ = _get_overridden_values(self.config, org=org, team=team)
        if project_id is None:
            endpoint = self._get_cluster_endpoint(org, team)
            operation_name = "cluster_remove"
        else:
            endpoint = self._get_project_cluster_endpoint(project_id, org=org, team=team)
            operation_name = "project_cluster_remove"

        url = f"{endpoint}/{cluster_id}"

        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org,
            auth_team=team,
            operation_name=operation_name,
        )
        return resp.get("clusterStatus")

    def stop(
        self,
        cluster_id: str,
        *,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        """Stop a cluster."""
        self.config.validate_configuration(guest_mode_allowed=False)
        org, team, _ = _get_overridden_values(self.config, org=org, team=team)
        ep = self._get_cluster_endpoint(org, team)
        url = f"{ep}/{cluster_id}/stop"

        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org,
            auth_team=team,
            operation_name="cluster_stop",
        )
        return resp.get("clusterStatus")

    def start(
        self,
        cluster_id: str,
        *,
        org: Optional[str] = None,
        team: Optional[str] = None,
    ):
        """Start a cluster that is in the STOPPED or FAILED state."""
        self.config.validate_configuration(guest_mode_allowed=False)
        org, team, _ = _get_overridden_values(self.config, org=org, team=team)
        ep = self._get_cluster_endpoint(org, team)
        url = f"{ep}/{cluster_id}/start"

        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org,
            auth_team=team,
            operation_name="cluster_start",
        )
        return resp.get("clusterStatus")

    def create(  # noqa: D102
        self,
        *,
        cluster_lifetime: str,
        cluster_type: Literal["dask", "jupyterlab"],
        container_image: str,
        data_output_mount_point: str,
        nworkers: int,
        scheduler_instance_type: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        additional_port_mappings: Optional[Sequence[str]] = None,
        conda_packages: Optional[Sequence[str]] = None,
        dataset_mount: Optional[Sequence[str]] = None,
        expiry_duration: Optional[str] = None,
        job_order: Optional[int] = None,
        job_priority: Optional[str] = None,
        label: Optional[Sequence[str]] = None,
        labels_locked: bool = False,
        min_availability: Optional[int] = None,
        min_time_slice: Optional[str] = None,
        multi_node: bool = False,
        name: Optional[str] = None,
        options: Optional[Sequence[str]] = None,
        pip_packages: Optional[Sequence[str]] = None,
        preempt_class: Optional[str] = None,
        project_id: Optional[str] = None,
        scheduler_dashboard_address: Optional[str] = None,
        scheduler_env_var: Optional[Sequence[str]] = None,
        scheduler_port: Optional[int] = None,
        scheduler_reserved_gpus: Optional[int] = None,
        scheduler_startup_script: Optional[str] = None,
        system_packages: Optional[Sequence[str]] = None,
        topology_constraint: Optional[Literal["pack", "any"]] = None,
        user_secret: Optional[Sequence[str]] = None,
        worker_dashboard_address: Optional[str] = None,
        worker_env_var: Optional[Sequence[str]] = None,
        worker_instance_type: Optional[str] = None,
        worker_reserved_gpus: Optional[int] = None,
        worker_startup_script: Optional[str] = None,
        workspace_mount: Optional[Sequence[str]] = None,
        _deprecated_additional_open_ports: Optional[Sequence[int]] = None,
    ) -> dict[str, Any]:
        self.config.validate_configuration(guest_mode_allowed=False)
        org, team, ace = _get_overridden_values(self.config, org=org, team=team, ace=ace)

        if project_id is None:
            endpoint = self._get_cluster_endpoint(org, team)
            operation_name = "cluster_create"
        else:
            endpoint = self._get_project_cluster_endpoint(project_id, org=org, team=team)
            operation_name = "project_add_cluster"
        url = f"{endpoint}?type={cluster_type}"

        cluster_param_obj = create_cluster_params(
            config=self.config,
            is_create=True,
            param_cls=ClusterParams,
            obj_cls=ClusterCreateRequest,
            component_cls=ClusterComponentParams,
            ace=ace,
            cluster_type=cluster_type,
            worker_instance_type=worker_instance_type,
            additional_open_ports=_deprecated_additional_open_ports,
            additional_port_mappings=additional_port_mappings,
            cluster_lifetime=cluster_lifetime,
            expiry_duration=expiry_duration,
            user_secret=user_secret,
            options=options,
            multi_node=multi_node,
            label=label,
            min_time_slice=min_time_slice,
            container_image=container_image,
            data_output_mount_point=data_output_mount_point,
            labels_locked=labels_locked,
            job_order=job_order,
            job_priority=job_priority,
            min_availability=min_availability,
            nworkers=nworkers,
            preempt_class=preempt_class,
            scheduler_port=scheduler_port,
            topology_constraint=topology_constraint,
            conda_packages=conda_packages,
            pip_packages=pip_packages,
            system_packages=system_packages,
            name=name,
            scheduler_env_var=scheduler_env_var,
            scheduler_dashboard_address=scheduler_dashboard_address,
            scheduler_instance_type=scheduler_instance_type,
            scheduler_startup_script=scheduler_startup_script,
            scheduler_reserved_gpus=scheduler_reserved_gpus,
            worker_env_var=worker_env_var,
            worker_dashboard_address=worker_dashboard_address,
            worker_startup_script=worker_startup_script,
            worker_reserved_gpus=worker_reserved_gpus,
            dataset_mount=dataset_mount,
            workspace_mount=workspace_mount,
        )
        if not cluster_param_obj:
            # Errors in the params will result in an empty value
            # TODO: raise more specific errors.
            raise ClusterParamError()

        # Verify that the parameters for creating a cluster are valid.
        cluster_param_obj.isValid()
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org,
            auth_team=team,
            payload=cluster_param_obj.toJSON(),
            operation_name=operation_name,
        )
        return resp["clusterStatus"]

    def update(  # noqa: D102
        self,
        cluster_id: str,
        *,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        additional_port_mappings: Optional[Sequence[str]] = None,
        cluster_lifetime: Optional[str] = None,
        conda_packages: Optional[Sequence[str]] = None,
        container_image: Optional[str] = None,
        data_output_mount_point: Optional[str] = None,
        dataset_mount: Optional[Sequence[str]] = None,
        expiry_duration: Optional[str] = None,
        job_order: Optional[int] = None,
        job_priority: Optional[str] = None,
        label: Optional[Sequence[str]] = None,
        labels_locked: Optional[bool] = None,
        min_availability: Optional[int] = None,
        min_time_slice: Optional[str] = None,
        multi_node: Optional[bool] = None,
        name: Optional[str] = None,
        nworkers: Optional[int] = None,
        options: Optional[Sequence[str]] = None,
        pip_packages: Optional[Sequence[str]] = None,
        preempt_class: Optional[str] = None,
        remove_dataset_mounts: Optional[bool] = None,
        remove_workspace_mounts: Optional[bool] = None,
        scheduler_dashboard_address: Optional[str] = None,
        scheduler_env_var: Optional[Sequence[str]] = None,
        scheduler_instance_type: Optional[str] = None,
        scheduler_port: Optional[int] = None,
        scheduler_reserved_gpus: Optional[int] = None,
        scheduler_startup_script: Optional[str] = None,
        system_packages: Optional[Sequence[str]] = None,
        topology_constraint: Optional[Literal["pack", "any"]] = None,
        user_secret: Optional[Sequence[str]] = None,
        worker_dashboard_address: Optional[str] = None,
        worker_env_var: Optional[Sequence[str]] = None,
        worker_instance_type: Optional[str] = None,
        worker_reserved_gpus: Optional[int] = None,
        worker_startup_script: Optional[str] = None,
        workspace_mount: Optional[Sequence[str]] = None,
        _deprecated_additional_open_ports: Optional[Sequence[int]] = None,
    ):
        self.config.validate_configuration(guest_mode_allowed=False)
        cluster_info = self.info(cluster_id, org=org, team=team)
        cluster_type = cluster_info["clusterStatus"].get("type")
        if cluster_type == "dask":
            if multi_node is not None:
                QuickStartClusterPrinter(self.config).print_ok(
                    "\nDask clusters are always multi-node; ignoring this argument"
                )
            multi_node = None
        org, team, _ = _get_overridden_values(self.config, org=org, team=team)

        update_obj = create_cluster_params(
            config=self.config,
            is_create=False,
            param_cls=ClusterModifyParams,
            obj_cls=ClusterModifyRequest,
            component_cls=ClusterComponentModifyParams,
            ace=ace,
            cluster_type=cluster_type,
            worker_instance_type=worker_instance_type,
            additional_open_ports=_deprecated_additional_open_ports,
            additional_port_mappings=additional_port_mappings,
            cluster_lifetime=cluster_lifetime,
            expiry_duration=expiry_duration,
            user_secret=user_secret,
            options=options,
            multi_node=multi_node,
            label=label,
            min_time_slice=min_time_slice,
            container_image=container_image,
            data_output_mount_point=data_output_mount_point,
            labels_locked=labels_locked,
            job_order=job_order,
            job_priority=job_priority,
            min_availability=min_availability,
            nworkers=nworkers,
            preempt_class=preempt_class,
            scheduler_port=scheduler_port,
            topology_constraint=topology_constraint,
            conda_packages=conda_packages,
            pip_packages=pip_packages,
            system_packages=system_packages,
            name=name,
            scheduler_env_var=scheduler_env_var,
            scheduler_dashboard_address=scheduler_dashboard_address,
            scheduler_instance_type=scheduler_instance_type,
            scheduler_startup_script=scheduler_startup_script,
            scheduler_reserved_gpus=scheduler_reserved_gpus,
            worker_env_var=worker_env_var,
            worker_dashboard_address=worker_dashboard_address,
            worker_startup_script=worker_startup_script,
            worker_reserved_gpus=worker_reserved_gpus,
            dataset_mount=dataset_mount,
            workspace_mount=workspace_mount,
        )
        if not update_obj:
            # Errors in the params will result in an empty value
            raise ClusterParamError()

        # This is necessary, as the deeply-nested structure of the update request can have sub-objects with no content.
        # Without nulling them out, they are interpreted by the backend service as a request to remove any existing
        # value in those fields.
        remove_empty_input_obj_values(update_obj)

        update = update_obj.toDict()
        has_remove_args = any([remove_dataset_mounts, remove_workspace_mounts])
        if not (update["params"] or has_remove_args):
            raise EmptyClusterUpdateError("You must include at least one field to update.")

        if not has_remove_args:
            update_json = update_obj.toJSON()
        else:
            update_json = format_update(
                update_obj,
                remove_dataset_mounts=remove_dataset_mounts,
                remove_workspace_mounts=remove_workspace_mounts,
            )

        ep = self._get_cluster_endpoint(org, team)
        url = f"{ep}/{cluster_id}"

        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org,
            auth_team=team,
            payload=update_json,
            operation_name="cluster_update",
        )
        return resp["clusterStatus"]


class GuestQuickStartClusterAPI(QuickStartClusterAPI):  # noqa: D101
    pass
