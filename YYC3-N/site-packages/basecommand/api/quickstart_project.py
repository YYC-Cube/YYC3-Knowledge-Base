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

from typing import Literal, Optional, Sequence

from basecommand.api.quickstart_cluster import (
    _get_overridden_values,
    ClusterParamError,
    create_cluster_params,
    create_data_input_obj,
    EmptyClusterUpdateError,
    format_update,
    remove_empty_input_obj_values,
)
from basecommand.constants import QUICKSTART_API_VERSION, QUICKSTART_TEMPLATE_TYPE_ENUM
from basecommand.data.pym.ClusterComponentParams import ClusterComponentParams
from basecommand.data.pym.ClusterParams import ClusterParams
from basecommand.data.pym.ProjectRequestStatus import ProjectRequestStatus
from basecommand.data.pym.ProjectTemplateCreateRequest import (
    ProjectTemplateCreateRequest,
)
from basecommand.data.pym.ProjectTemplateModificationRequest import (
    ProjectTemplateModificationRequest,
)
from basecommand.data.pym.ProjectTemplateModifyParams import ProjectTemplateModifyParams
from basecommand.data.pym.ProjectTemplateParams import ProjectTemplateParams
from ngcbase.errors import InvalidArgumentError
from ngcbase.util.utils import format_org_team

PAGE_SIZE = 1000


class QuickStartProjectAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self._config = api_client.config

    @staticmethod
    def _get_project_endpoint(org_name=None, team_name=None):
        segments = ["v2"]
        org_team = format_org_team(org_name, team_name, plural_form=True)
        if org_team:
            segments.append(org_team)
        segments.extend(["pym", "projects"])
        return "/".join(segments)

    def list(
        self, *, org: Optional[str] = None, team: Optional[str] = None, org_only: bool = False, owned: bool = False
    ):
        """List projects."""
        self._config.validate_configuration(guest_mode_allowed=True, csv_allowed=True)
        org, team, _ = _get_overridden_values(self._config, org=org, team=team)
        ep = self._get_project_endpoint(org, team)
        all_objects = "false" if owned else "true"
        all_levels = "false" if org_only else "true"
        url = f"{ep}?allObjects={all_objects}&allLevels={all_levels}"
        resp = self.connection.make_api_request(
            "GET",
            url,
            auth_org=org,
            auth_team=team,
            operation_name="list_projects",
        )
        return resp["projects"]

    def create(self, org_name, team_name, create_obj):  # noqa: D102
        ep = self._get_project_endpoint(org_name, team_name)

        resp = self.connection.make_api_request(
            "POST",
            ep,
            auth_org=org_name,
            auth_team=team_name,
            payload=create_obj.toJSON(),
            operation_name="project_create",
        )
        return ProjectRequestStatus(resp.get("requestStatus"))

    def update(self, org_name, team_name, project_id, update_obj):  # noqa: D102
        ep = self._get_project_endpoint(org_name, team_name)
        url = f"{ep}/{project_id}"

        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org_name,
            auth_team=team_name,
            payload=update_obj.toJSON(),
            operation_name="project_update",
        )
        return ProjectRequestStatus(resp.get("requestStatus"))

    def info(self, project_id: str, *, org: Optional[str] = None, team: Optional[str] = None):
        """Get information about a project."""
        self._config.validate_configuration(guest_mode_allowed=True)
        org, team, _ = _get_overridden_values(self._config, org=org, team=team)
        ep = self._get_project_endpoint(org, team)
        url = f"{ep}/{project_id}"

        resp = self.connection.make_api_request(
            "GET",
            url,
            auth_org=org,
            auth_team=team,
            operation_name="quickstart_project_info",
        )
        return resp

    def remove(self, project_id: str, *, org: Optional[str] = None, team: Optional[str] = None):
        """Delete a project."""
        self._config.validate_configuration(guest_mode_allowed=False)
        org, team, _ = _get_overridden_values(self._config, org=org, team=team)
        ep = self._get_project_endpoint(org, team)
        url = f"{ep}/{project_id}"

        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org,
            auth_team=team,
            operation_name="project_remove",
        )
        return resp["requestStatus"]

    def create_template(
        self,
        *,
        cluster_lifetime: str,
        cluster_type: Literal["dask", "jupyterlab"],
        container_image: str,
        data_output_mount_point: str,
        description: str,
        display_image_url: str,
        name: str,
        nworkers: int,
        scheduler_instance_type: str,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        additional_port_mappings: Optional[Sequence[str]] = None,
        cluster_name: Optional[str] = None,
        conda_packages: Optional[Sequence[str]] = None,
        dataset_mount: Optional[Sequence[str]] = None,
        default: bool = False,
        expiry_duration: Optional[str] = None,
        job_order: Optional[int] = None,
        job_priority: Optional[str] = None,
        label: Optional[Sequence[str]] = None,
        labels_locked: bool = False,
        min_availability: Optional[int] = None,
        min_time_slice: Optional[str] = None,
        multi_node: bool = False,
        options: Optional[Sequence[str]] = None,
        pip_packages: Optional[Sequence[str]] = None,
        preempt_class: Optional[str] = None,
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
    ):
        """Create a new project template."""
        self._config.validate_configuration(guest_mode_allowed=False)
        org, team, ace = _get_overridden_values(self._config, org=org, team=team, ace=ace)
        cluster_param_obj = create_cluster_params(
            self._config,
            is_create=True,
            param_cls=ClusterParams,
            obj_cls=ProjectTemplateParams,
            component_cls=ClusterComponentParams,
            return_params=True,
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
            cluster_name=cluster_name,
            nworkers=nworkers,
            preempt_class=preempt_class,
            scheduler_port=scheduler_port,
            topology_constraint=topology_constraint,
            conda_packages=conda_packages,
            pip_packages=pip_packages,
            system_packages=system_packages,
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
            raise ClusterParamError()
        try:
            input_obj = create_data_input_obj(
                dataset_mount=dataset_mount,
                workspace_mount=workspace_mount,
            )
        except InvalidArgumentError as e:
            print(e)
            raise ClusterParamError() from e

        template_params = ProjectTemplateParams(
            {
                "name": name,
                "description": description,
                "containerImage": container_image,
                "displayImageURL": display_image_url,
                "nworkers": nworkers,
                "clusterType": cluster_type,
                "clusterLifetime": cluster_lifetime,
                "workerStartupScript": worker_startup_script,
                "schedulerStartupScript": scheduler_startup_script,
                "dataInput": input_obj,
                "dataOutputMountPoint": data_output_mount_point,
                "isDefault": default,
                "clusterParams": cluster_param_obj.toDict(),
            }
        )
        template_create_obj = ProjectTemplateCreateRequest(
            {"params": template_params, "version": QUICKSTART_API_VERSION}
        )
        # Verify that the parameters for creating a project template are valid.
        template_create_obj.isValid()

        # Can't use teams with listings currently
        # ep = self._get_project_endpoint(org_name, team_name)
        ep = self._get_project_endpoint(org)
        url = f"{ep}/templates"
        resp = self.connection.make_api_request(
            "POST",
            url,
            auth_org=org,
            auth_team=team,
            payload=template_create_obj.toJSON(),
            operation_name="project_add_template",
        )
        return resp["templateStatus"]

    def update_template(
        self,
        template_id: str,
        *,
        org: Optional[str] = None,
        team: Optional[str] = None,
        additional_port_mappings: Optional[Sequence[str]] = None,
        cluster_lifetime: Optional[str] = None,
        cluster_name: Optional[str] = None,
        conda_packages: Optional[Sequence[str]] = None,
        container_image: Optional[str] = None,
        data_output_mount_point: Optional[str] = None,
        dataset_mount: Optional[Sequence[str]] = None,
        default: Optional[bool] = None,
        description: Optional[str] = None,
        display_image_url: Optional[str] = None,
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
        remove_default: Optional[bool] = None,
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
        """Update a project template."""
        self._config.validate_configuration(guest_mode_allowed=False)
        org, team, _ = _get_overridden_values(self._config, org=org, team=team)
        cluster_param_obj = create_cluster_params(
            self._config,
            is_create=False,
            param_cls=ClusterParams,
            obj_cls=ProjectTemplateModifyParams,
            component_cls=ClusterComponentParams,
            return_params=True,
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
            cluster_name=cluster_name,
            nworkers=nworkers,
            preempt_class=preempt_class,
            scheduler_port=scheduler_port,
            topology_constraint=topology_constraint,
            conda_packages=conda_packages,
            pip_packages=pip_packages,
            system_packages=system_packages,
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
            raise ClusterParamError()
        try:
            input_obj = create_data_input_obj(
                dataset_mount=dataset_mount,
                workspace_mount=workspace_mount,
            )
        except InvalidArgumentError as e:
            print(e)
            raise ClusterParamError() from e

        template_params = ProjectTemplateModifyParams(
            {
                "name": name,
                "description": description,
                "containerImage": container_image,
                "displayImageURL": display_image_url,
                "nworkers": nworkers,
                "clusterLifetime": cluster_lifetime,
                "workerStartupScript": worker_startup_script,
                "schedulerStartupScript": scheduler_startup_script,
                "dataInput": input_obj,
                "dataOutputMountPoint": data_output_mount_point,
                "isDefault": False if remove_default else (default or None),
                "clusterParams": cluster_param_obj.toDict(),
            }
        )
        template_update_obj = ProjectTemplateModificationRequest(
            {"params": template_params, "version": QUICKSTART_API_VERSION}
        )
        # Verify that the parameters for creating a project template are valid.
        template_update_obj.isValid()
        remove_empty_input_obj_values(template_update_obj, sub_param_name="clusterParams")

        has_remove_args = any([remove_dataset_mounts, remove_workspace_mounts, remove_default])
        if not (template_update_obj or has_remove_args):
            raise EmptyClusterUpdateError("You must include at least one field to update.")
        if has_remove_args:
            template_update_json = format_update(
                template_update_obj,
                remove_dataset_mounts=remove_dataset_mounts,
                remove_workspace_mounts=remove_workspace_mounts,
            )
        else:
            template_update_json = template_update_obj.toJSON()
        # Can't use teams with listings currently
        # ep = self._get_project_endpoint(org_name, team_name)
        ep = self._get_project_endpoint(org)
        url = f"{ep}/templates/{template_id}"
        resp = self.connection.make_api_request(
            "PATCH",
            url,
            auth_org=org,
            auth_team=team,
            payload=template_update_json,
            operation_name="project_update_template",
        )
        return resp["templateStatus"]

    def list_templates(  # noqa: D102
        self,
        *,
        org: Optional[str] = None,
        team: Optional[str] = None,
        default_only: bool = False,
        template_type: Literal["dask", "jupyterlab"] = "dask",
    ):
        self._config.validate_configuration(guest_mode_allowed=True, csv_allowed=True)

        template_type = template_type.lower()
        if template_type not in QUICKSTART_TEMPLATE_TYPE_ENUM:
            # TODO: make this an SDK-specific error
            raise InvalidArgumentError(
                f"argument: '{template_type}' is not a valid value for --template-type. It must be one of "
                f"{', '.join(QUICKSTART_TEMPLATE_TYPE_ENUM)}."
            )
        org, team, _ = _get_overridden_values(self._config, org=org, team=team)
        # Can't use teams with listings currently
        # ep = self._get_project_endpoint(org_name, team_name)
        ep = self._get_project_endpoint(org)
        url = f"{ep}/templates?default={str(default_only).lower()}&type={template_type}"
        return self.connection.make_api_request(
            "GET",
            url,
            auth_org=org,
            auth_team=team,
            operation_name="project_list_templates",
        )

    def remove_template(self, template_id: str, *, org: Optional[str] = None, team: Optional[str] = None):  # noqa: D102
        self._config.validate_configuration(guest_mode_allowed=False)
        org, team, _ = _get_overridden_values(self._config, org=org, team=team)
        # Can't use teams with listings currently
        # ep = self._get_project_endpoint(org_name, team_name)
        ep = self._get_project_endpoint(org)
        url = f"{ep}/templates/{template_id}"
        resp = self.connection.make_api_request(
            "DELETE",
            url,
            auth_org=org,
            auth_team=team,
            operation_name="project_remove_template",
        )
        return resp["templateStatus"]

    def info_template(self, template_id: str, *, org: Optional[str] = None, team: Optional[str] = None):  # noqa: D102
        self._config.validate_configuration(guest_mode_allowed=True)
        org, team, _ = _get_overridden_values(self._config, org=org, team=team)
        # Can't use teams with listings currently
        # ep = self._get_project_endpoint(org_name, team_name)
        ep = self._get_project_endpoint(org)
        url = f"{ep}/templates/{template_id}"
        return self.connection.make_api_request(
            "GET",
            url,
            auth_org=org,
            auth_team=team,
            operation_name="project_info_template",
        )


class GuestQuickStartProjectAPI(QuickStartProjectAPI):  # noqa: D101
    pass
