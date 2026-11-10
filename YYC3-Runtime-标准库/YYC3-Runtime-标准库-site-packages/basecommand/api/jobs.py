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
from argparse import Namespace
from builtins import int
from datetime import datetime, timedelta
from itertools import chain, cycle, islice
import json
import os
import tempfile
from typing import List, Optional, Tuple, Union

from basecommand.api.utils import (
    check_batch_run_args,
    check_multinode_job_args,
    parse_job_labels,
    parse_secrets,
)
from basecommand.constants import STATES_BEFORE_RUNNING
from basecommand.data.api.Env import Env
from basecommand.data.api.ExpTrackingParams import ExpTrackingParams
from basecommand.data.api.JobCreateRequest import JobCreateRequest
from basecommand.data.api.JobDatasetMountInfo import JobDatasetMountInfo
from basecommand.data.api.JobLabelResponse import JobLabelResponse
from basecommand.data.api.JobListResponse import JobListResponse
from basecommand.data.api.JobPortMapping import JobPortMapping
from basecommand.data.api.JobResponse import JobResponse
from basecommand.data.api.JobRunPolicy import JobRunPolicy
from basecommand.data.api.JobWorkspaceMountInfo import JobWorkspaceMountInfo
from basecommand.data.api.ReplicaResponse import ReplicaResponse
from ngcbase.api.pagination import pagination_helper
from ngcbase.constants import API_VERSION, PAGE_SIZE
from ngcbase.errors import InvalidArgumentError, NgcException
from ngcbase.transfer.controller import TransferController
from ngcbase.transfer.manager import TransferConfig
from ngcbase.util.datetime_utils import calculate_date_range
from ngcbase.util.utils import extra_args, parse_key_value_pairs
from registry.api.utils import ImageRegistryTarget

REQUEST_TIMEOUT_SECONDS_SUBMIT_JOB = 120
OBJECT_DATASET_MOUNT_POINT = "no-mount"


class JobsAPI:  # noqa: D101
    def __init__(self, api_client):
        self.config = api_client.config
        self.connection = api_client.connection
        self.client = api_client

    @property
    def printer(self):
        """Printer."""
        return self.client.printer

    @staticmethod
    def _construct_url(org_name, team_name=None, job_id=None):
        """Constructs ace url depending on given parameters."""  # noqa: D401
        base_method = "{api_version}/org/{org_name}".format(api_version=API_VERSION, org_name=org_name)
        if team_name:
            base_method = "{base_method}/team/{team_name}".format(base_method=base_method, team_name=team_name)

        if job_id or job_id == 0:
            base_method = "{url_method}/jobs/{id}".format(url_method=base_method, id=job_id)
        else:
            base_method = "{url_method}/jobs".format(url_method=base_method)
        return base_method

    @staticmethod
    def _get_replicas_endpoint(org_name=None, team_name=None, job_id=None, replica_id=None):
        ep = JobsAPI._construct_url(org_name, team_name, job_id)
        ep = "/".join([ep, "replicas"])
        # version can be zero
        if replica_id is not None:
            ep = "/".join([ep, str(replica_id)])
        return ep

    @staticmethod
    def _parse_job_submit_file(file_name):
        json_data = None
        with open(file_name, encoding="utf-8") as json_file:
            try:
                json_data = json.load(json_file)
            except ValueError as e:
                raise ValueError("ERROR: Json file is not valid: {0}".format(e)) from None
        job_create_request = JobCreateRequest(
            json_data if "jobDefinition" not in json_data else json_data["jobDefinition"]
        )
        return job_create_request

    def _get_parsed_json(self, org_name, jobid, team_name):
        job_request = self.get_job_request_json(org_name, jobid, team_name)
        # remove auto kill policy
        if job_request:
            parsed = json.loads(job_request)

            if "autoKillPolicy" in parsed:
                del parsed["autoKillPolicy"]

            if "datasetMounts" in parsed and not parsed["datasetMounts"]:
                del parsed["datasetMounts"]

            return parsed

        raise NgcException("Job request response is empty.")

    def _get_job_create_request(self, args):  # noqa: C901
        job_create_request = JobCreateRequest()

        if args.file:
            # parse the job definition file
            job_create_request = self._parse_job_submit_file(args.file)
        elif args.clone:
            parsed = self._get_parsed_json(
                args.org or self.config.org_name, args.clone, args.team or self.config.team_name
            )
            job_create_request = JobCreateRequest(parsed)

        job_create_request.aceName = args.ace or self.config.ace_name or job_create_request.aceName

        valid_image = ImageRegistryTarget(args.image)
        job_create_request.dockerImageName = valid_image.local_path_and_tag() or job_create_request.dockerImageName

        job_create_request.name = args.name or job_create_request.name
        job_create_request.description = args.description or job_create_request.description
        job_create_request.command = args.commandline or job_create_request.command
        job_create_request.entryPoint = args.entrypoint or job_create_request.entryPoint
        job_create_request.useImageEntryPoint = args.use_image_entrypoint or job_create_request.useImageEntryPoint
        job_create_request.aceInstance = args.instance or job_create_request.aceInstance

        job_labels = parse_job_labels(args.label, args.lock_label)
        job_create_request.isLabelLocked = job_labels.isLocked or job_create_request.isLabelLocked
        # Merge the labels from the files and args.
        for label_attr in ("userLabels", "reservedLabels", "systemLabels"):
            labels_from_file = getattr(job_create_request, label_attr) or []
            labels_from_cli = getattr(job_labels, label_attr).values or []
            merged_labels = [*labels_from_file, *labels_from_cli] or None
            setattr(job_create_request, label_attr, merged_labels)

        job_port_mappings = []
        for port in args.port or []:
            job_port_mapping = JobPortMapping()
            job_port_mapping.name, job_port_mapping.containerPort, job_port_mapping.protocol = port
            job_port_mappings.append(job_port_mapping)

        for port in job_create_request.publishedContainerPorts or []:
            job_port_mapping = JobPortMapping()
            job_port_mapping.containerPort = port
            job_port_mapping.protocol = "HTTPS"
            job_port_mappings.append(job_port_mapping)

        if job_create_request.portMappings is not None:
            for job_port_mapping in job_create_request.portMappings or []:
                job_port_mapping.protocol = job_port_mapping.protocol or "HTTPS"
            job_create_request.portMappings.extend(job_port_mappings)
        else:
            job_create_request.portMappings = job_port_mappings

        job_create_request.resultContainerMountPoint = args.result or job_create_request.resultContainerMountPoint
        if args.replicas is not None:
            job_create_request.replicaCount = args.replicas
        job_create_request.networkType = args.network or job_create_request.networkType
        job_create_request.minAvailability = (
            args.replicas if args.coscheduling else args.min_availability
        ) or job_create_request.minAvailability
        job_create_request.arrayType = args.array_type or job_create_request.arrayType
        job_create_request.topologyConstraint = args.topology_constraint or job_create_request.topologyConstraint

        job_dataset_array = []
        for d in args.dataset or []:
            dataset_obj = JobDatasetMountInfo()
            _id, _mt = islice(chain(d.split(":"), cycle([None])), 2)
            if _id and _id.isdigit():
                dataset_obj.id = _id
            else:
                dataset_obj.uuid = _id
                if not _validate_mountpoint(_mt):
                    # only validate mount point for uuid, since it can be either object based or file based
                    raise InvalidArgumentError(f"Invalid mount point {_mt} for dataset {_id}")
            dataset_obj.containerMountPoint = _mt
            job_dataset_array.append(dataset_obj)

        if job_create_request.datasetMounts is not None:
            job_create_request.datasetMounts.extend(job_dataset_array)
        else:
            job_create_request.datasetMounts = job_dataset_array

        job_workspace_array = []
        for ws in args.workspace or []:
            workspace_obj = JobWorkspaceMountInfo()
            ws_info = ws.split(":")
            workspace_obj.id = ws_info[0]
            workspace_obj.containerMountPoint = ws_info[1]
            if len(ws_info) == 3:
                workspace_obj.mountMode = ws_info[2]
            job_workspace_array.append(workspace_obj)

        if job_create_request.workspaceMounts is not None:
            job_create_request.workspaceMounts.extend(job_workspace_array)
        else:
            job_create_request.workspaceMounts = job_workspace_array

        run_policy = job_create_request.runPolicy or JobRunPolicy()
        run_policy.preemptClass = args.preempt or run_policy.preemptClass or "RUNONCE"
        if args.total_runtime:
            run_policy.totalRuntimeSeconds = args.total_runtime.total_seconds() or run_policy.totalRuntimeSeconds
        if args.min_timeslice:
            run_policy.minTimesliceSeconds = args.min_timeslice.total_seconds() or run_policy.minTimesliceSeconds
        job_create_request.runPolicy = run_policy

        job_create_request.jobOrder = args.order or job_create_request.jobOrder
        job_create_request.jobPriority = args.priority or job_create_request.jobPriority

        exp_tracking_params = job_create_request.expTrackingParams or ExpTrackingParams()
        if args.experiment_flow_type:
            exp_tracking_params.type = args.experiment_flow_type or exp_tracking_params.type
        if args.experiment_project_name:
            exp_tracking_params.projectName = args.experiment_project_name or exp_tracking_params.projectName
        if args.experiment_name:
            exp_tracking_params.name = args.experiment_name or exp_tracking_params.name
        if exp_tracking_params.toDict():
            job_create_request.expTrackingParams = exp_tracking_params

        if args.env_var:
            env_vars = [Env({"name": k, "value": v}) for k, v in parse_key_value_pairs(args.env_var).items()]
            if job_create_request.envs is not None:
                job_create_request.envs.extend(env_vars)
            else:
                job_create_request.envs = env_vars

        if args.secret:
            secrets = parse_secrets(args.secret)
            if job_create_request.userSecretsSpec is not None:
                job_create_request.userSecretsSpec.extend(secrets)
            else:
                job_create_request.userSecretsSpec = secrets

        job_create_request.isValid()
        return job_create_request

    def _check_job_args(self, job_create_request, org_name, team_name):
        ace_id = job_create_request.aceName
        ace_details = self.client.basecommand.aces.get_ace_details(
            org_name=org_name, ace_id=ace_id, team_name=team_name
        )

        irt = ImageRegistryTarget(job_create_request.dockerImageName)
        repo_name = "/".join([f for f in [irt.org, irt.team, irt.image] if f])
        if not irt.tag:
            repo_info = self.client.registry.image.get_repo_details(irt.org, irt.team, repo_name)
            irt.tag = repo_info.latestTag or "latest"
        (image_list, _, _) = self.client.registry.image.extended_image_info(irt.org, irt.team, repo_name, irt.tag)
        archs = [
            [(arch.architecture, arch.os) for arch in image.architectureVariants or []]
            for image in image_list.images or []
            if image.tag == irt.tag
        ]

        if (
            job_create_request.runPolicy.totalRuntimeSeconds
            and ace_details.maxRuntimeSeconds
            and job_create_request.runPolicy.totalRuntimeSeconds > ace_details.maxRuntimeSeconds
        ):
            raise NgcException("Total Runtime Seconds exceeds ACE maximum.")

        for instance in ace_details.instances or []:
            if instance.name == job_create_request.aceInstance:
                if instance.type == "MIG":
                    if job_create_request.replicaCount and job_create_request.replicaCount > 1:
                        raise InvalidArgumentError(
                            "argument: --replicas argument can not be greater than 1 for MIG jobs"
                        )
                    if (
                        job_create_request.runPolicy.preemptClass
                        and job_create_request.runPolicy.preemptClass != "RUNONCE"
                    ):
                        raise InvalidArgumentError("argument: --preempt argument can only be `RUNONCE` for MIG jobs")
                if instance.architecture and instance.os and (instance.architecture, instance.os) not in archs[0]:
                    raise NgcException("Instance and image architecture do not match.")
                break

        for job_port_mapping in job_create_request.portMappings or []:
            if job_port_mapping.protocol == "GRPC" and not ace_details.grpcEnabled:
                raise NgcException("Ace does not support GRPC protocol.")

    def _get_user_id(self, org_name):
        current_user_info = self.client.users.user_who(org_name)
        return current_user_info.user.id

    def _kill_job(self, jobid, reason=None, org_name=None, team_name=None):
        try:
            org_name = org_name or self.config.org_name
            team_name = team_name or self.config.team_name
            self.kill_job(org_name=org_name, job_id=jobid, team_name=team_name, reason=reason)
            self.printer.print_ok("Submitted job kill request for Job ID: '{0}'".format(jobid))
        # There are too many errors that can occur when killing a job to be listed individually
        except Exception as error_str:  # pylint: disable=broad-except
            msg = "Killing of job ID: '{0}' failed: {1}".format(jobid, error_str)
            self.printer.print_error(msg)

    def _get_jobids_by_status(self, status_list, org_name):
        """Return list of jobids filtered by status."""
        jobs_response = self.get_jobs(org_name=org_name, user_id=self._get_user_id(org_name), status=status_list)
        return [x.id for x in jobs_response]

    def kill_job(self, org_name, job_id, team_name=None, reason=None):  # noqa: D102
        url = self._construct_url(org_name=org_name, job_id=job_id)
        if reason:
            url = f"{url}?reason={reason}"
        self.connection.make_api_request(
            "DELETE", url, auth_org=org_name, auth_team=team_name, operation_name="kill job"
        )

    # TODO: Remove ace_ids once backwards compatibility support is removed
    def get_jobs_created_between(  # noqa: D102
        self,
        org_name,
        from_date,
        to_date,
        team_name=None,
        status_code=None,
        user_id=None,
        ace_names=None,
        ace_ids=None,
        labels=None,
        exclude_labels=None,
        priority=None,
    ):
        if not ace_names:
            ace_names = ace_ids

        url = self._construct_url(org_name=org_name, team_name=team_name)
        query = "{url}?orderBy=CREATED_DATE_DESC&fromDate={from_date}&toDate={to_date}&page-size={page_size}".format(
            url=url, from_date=from_date, to_date=to_date, page_size=PAGE_SIZE
        )
        if status_code is not None:
            for s in status_code:
                query += "&status={}".format(s)

        if user_id is not None:
            query += "&created-by={}".format(user_id)

        if ace_names is not None:
            for a in ace_names:
                try:
                    int(a)
                    query += "&aceIds={}".format(a)
                except ValueError:
                    query += "&aceNames={}".format(a)

        if labels or exclude_labels:
            query += "&filter=FILTER_BY_LABELS"
            if labels:
                lbls = ",".join(labels)
                query += f"&includeLabels={lbls}"
            if exclude_labels:
                excl = ",".join(exclude_labels)
                query += f"&excludeLabels={excl}"

        if priority:
            for p in priority:
                query += f"&jobPriority={p}"

        return self.__helper_get_jobs(query, org_name=org_name, team_name=team_name)

    def get_jobs(self, org_name, user_id=None, team_name=None, status=None):  # noqa: D102
        url = self._construct_url(org_name=org_name, team_name=team_name)
        query = "{url}?page-size={page_size}".format(url=url, page_size=PAGE_SIZE)
        if user_id:
            query += "&created-by={user_id}".format(user_id=user_id)
        if status is not None:
            for s in status:
                query += "&status={}".format(s)

        return chain(
            *[
                JobListResponse(res).jobs
                for res in pagination_helper(
                    self.connection, query, org_name=org_name, team_name=team_name, operation_name="get all jobs"
                )
                if JobListResponse(res).jobs
            ]
        )

    def __helper_get_jobs(self, query, org_name=None, team_name=None):

        jobs_list_pages = pagination_helper(
            self.connection, query, org_name=org_name, team_name=team_name, operation_name="get jobs"
        )
        list_of_jobs = []

        for page in jobs_list_pages:
            list_of_jobs.extend(JobListResponse(page).jobs or [])

        return list_of_jobs

    def get_job(self, org_name, job_id, team_name=None):  # noqa: D102
        url = self._construct_url(org_name=org_name, job_id=job_id)
        job = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="get job"
        )
        return JobResponse(job).job

    def get_job_and_history(self, org_name, job_id, team_name=None):  # noqa: D102
        url = self._construct_url(org_name=org_name, job_id=job_id)
        job = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="get job"
        )
        job_info = JobResponse(job).job
        job_history = JobResponse(job).jobStatusHistory
        return (job_info, job_history)

    def get_job_request_json(self, org_name, job_id, team_name=None):  # noqa: D102
        url = self._construct_url(org_name=org_name, job_id=job_id)
        job = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="get job json"
        )
        return JobResponse(job).jobRequestJson

    def preempt_job(self, org_name, job_id, team_name=None):  # noqa: D102
        url = self._construct_url(org_name=org_name, job_id=job_id)
        self.connection.make_api_request(
            "PATCH", "{}/preempt".format(url), auth_org=org_name, auth_team=team_name, operation_name="preempt job"
        )

    def resume_job(self, org_name, job_id, team_name=None):  # noqa: D102
        url = self._construct_url(org_name=org_name, job_id=job_id)
        self.connection.make_api_request(
            "PATCH", "{}/resume".format(url), auth_org=org_name, auth_team=team_name, operation_name="resume job"
        )

    def submit_job(self, org_name, job_create_request, team_name=None):  # noqa: D102
        url = self._construct_url(org_name=org_name, team_name=team_name)
        job = self.connection.make_api_request(
            "POST",
            url,
            payload=job_create_request.toJSON(False),
            disable_non_auth_retry=True,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="submit job",
        )
        return JobResponse(job).job

    def get_replica(self, job_id, replica_id, org_name, team_name=None):  # noqa: D102
        url = self._get_replicas_endpoint(org_name=org_name, job_id=job_id, replica_id=replica_id)
        replica = self.connection.make_api_request(
            "GET", url, auth_org=org_name, auth_team=team_name, operation_name="get replica"
        )
        return ReplicaResponse(replica).replica

    def post_labels(self, org_name, job_id, job_labels, team_name=None, overwrite="false"):  # noqa: D102
        url = self._construct_url(org_name=org_name, job_id=job_id)
        response = self.connection.make_api_request(
            "POST",
            f"{url}/labels?overwriteLabels={overwrite}",
            payload=job_labels.toJSON(),
            auth_org=org_name,
            auth_team=team_name,
            operation_name="post labels",
        )
        return JobLabelResponse(response)

    def patch_labels(self, org_name, job_id, job_labels, team_name=None):  # noqa: D102
        url = self._construct_url(org_name=org_name, job_id=job_id)
        response = self.connection.make_api_request(
            "PATCH",
            f"{url}/labels/remove",
            payload=job_labels.toJSON(),
            auth_org=org_name,
            auth_team=team_name,
            operation_name="patch labels",
        )
        return JobLabelResponse(response)

    @extra_args
    def list(
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        list_all: Optional[bool] = None,
        duration: Optional[timedelta] = None,
        end_time: Optional[datetime] = None,
        begin_time: Optional[datetime] = None,
        status: Optional[list[str]] = None,
        labels: Optional[list[str]] = None,
        exclude_labels: Optional[list[str]] = None,
        priority: Optional[list[str]] = None,
    ):
        """List jobs."""
        self.config.validate_configuration(csv_allowed=True)
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ace_name = ace or self.config.ace_name

        job_status = status if status is not None else []
        ace_names = [ace_name] if ace_name is not None else []
        user_id = None if list_all else self.client.users.user_who(org_name).user.id

        try:
            (from_date, to_date) = calculate_date_range(begin_time, end_time, duration)
        except Exception as e:
            raise NgcException(e) from None

        list_of_jobs = self.get_jobs_created_between(
            org_name=org_name,
            team_name=team_name,
            from_date=from_date,
            to_date=to_date,
            status_code=job_status,
            user_id=user_id,
            ace_names=ace_names,
            labels=labels,
            exclude_labels=exclude_labels,
            priority=priority,
        )
        return list_of_jobs

    @extra_args
    def preempt(self, job_id: int, org: Optional[str] = None, team: Optional[str] = None, ace: Optional[str] = None):
        """Preempt a running job."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ace = ace or self.config.ace_name
        self.preempt_job(org_name=org_name, job_id=job_id, team_name=team_name)

    @extra_args
    def resume(self, job_id: int, org: Optional[str] = None, team: Optional[str] = None, ace: Optional[str] = None):
        """Resume a preempted job."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ace = ace or self.config.ace_name
        self.resume_job(org_name=org_name, job_id=job_id, team_name=team_name)

    @extra_args
    def run(
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        name: Optional[str] = None,
        image: Optional[str] = None,
        file: Optional[str] = None,
        commandline: Optional[str] = None,
        entrypoint: Optional[str] = None,
        use_image_entrypoint: Optional[bool] = None,
        description: Optional[str] = None,
        dataset: Optional[List[str]] = None,
        instance: Optional[str] = None,
        replicas: Optional[int] = None,
        array_type: Optional[str] = None,
        coscheduling: Optional[bool] = None,
        min_availability: Optional[int] = None,
        network: Optional[str] = None,
        topology_constraint: Optional[str] = None,
        port: Optional[List[tuple[str, int, str]]] = None,
        result: Optional[str] = None,
        preempt: Optional[str] = None,
        total_runtime: Optional[timedelta] = None,
        min_timeslice: Optional[timedelta] = None,
        workspace: Optional[List[str]] = None,
        clone: Optional[int] = None,
        label: Optional[List[str]] = None,
        lock_label: Optional[bool] = None,
        order: Optional[int] = None,
        priority: Optional[str] = None,
        secret: Optional[List[Union[Tuple[str], Tuple[str, str], Tuple[str, str, str]]]] = None,
        env_var: Optional[List[str]] = None,
        experiment_flow_type: Optional[str] = None,
        experiment_project_name: Optional[str] = None,
        experiment_name: Optional[str] = None,
    ):
        """Submit a job. The following arguments are required if the clone or file argument is not specified.
        ace: Ace name.
        instance: Ace instance type.
        name: Job name.
        image: Image repository.
        result: Result mount point.
        """  # noqa: D205
        args = Namespace(
            org=org,
            team=team,
            ace=ace,
            name=name,
            image=image,
            file=file,
            commandline=commandline,
            entrypoint=entrypoint,
            use_image_entrypoint=use_image_entrypoint,
            description=description,
            dataset=dataset,
            instance=instance,
            replicas=replicas,
            array_type=array_type,
            coscheduling=coscheduling,
            min_availability=min_availability,
            network=network,
            topology_constraint=topology_constraint,
            port=port,
            result=result,
            preempt=preempt,
            total_runtime=total_runtime,
            min_timeslice=min_timeslice,
            workspace=workspace,
            clone=clone,
            label=label,
            lock_label=lock_label,
            order=order,
            priority=priority,
            secret=secret,
            env_var=env_var,
            experiment_flow_type=experiment_flow_type,
            experiment_project_name=experiment_project_name,
            experiment_name=experiment_name,
        )
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ace_name = ace or self.config.ace_name

        check_batch_run_args(args, ace_name)
        check_multinode_job_args(args)

        job_create_request = self._get_job_create_request(args)
        self._check_job_args(job_create_request, org_name, team_name)

        job = self.submit_job(org_name=org_name, team_name=team_name, job_create_request=job_create_request)
        return job

    @extra_args
    def info(
        self,
        job_id: int,
        replica_id: Optional[int] = None,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
    ):
        """Get job info."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ace = ace or self.config.ace_name
        if replica_id:
            replica = self.get_replica(job_id=job_id, replica_id=replica_id, org_name=org_name, team_name=team_name)
            return replica

        (job, history) = self.get_job_and_history(org_name=org_name, job_id=job_id, team_name=team_name)
        return (job, history)

    @extra_args
    def kill(
        self,
        job_ids: List[int],
        org: Optional[int] = None,
        team: Optional[int] = None,
        ace: Optional[int] = None,
        status: Optional[List[str]] = None,
        dry_run: Optional[bool] = None,
        reason: Optional[str] = None,
    ):
        """Kill a job."""

        def dry_run_check(_job_id, reason, org_name, team_name):
            if dry_run:
                self.printer.print_ok(str(_job_id))
            else:
                self._kill_job(_job_id, reason, org_name, team_name)

        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ace = ace or self.config.ace_name

        filtered_jobid_list = self._get_jobids_by_status(status, org_name) if status else []

        jobs_to_kill = False
        if dry_run:
            self.printer.print_ok("Jobs to be killed:")
        for job_id in job_ids:
            if status:
                if job_id in filtered_jobid_list:
                    jobs_to_kill = True
                    dry_run_check(job_id, reason, org_name, team_name)
            else:
                jobs_to_kill = True
                dry_run_check(job_id, reason, org_name, team_name)

        if jobs_to_kill is False and dry_run is False:
            self.printer.print_error("No jobs to kill.")

    @extra_args
    def telemetry(
        self,
        job_id: int,
        replica_id: Optional[int] = None,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        interval_unit: Optional[str] = "MINUTE",
        interval_time: Optional[int] = 1,
        types: Optional[List[str]] = None,
        statistics: Optional[str] = "MEAN",
    ):
        """Get job telemetry."""
        self.config.validate_configuration(csv_allowed=True)
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ace = ace or self.config.ace_name

        job = self.get_job(org_name, job_id, team_name)
        if job.jobStatus.status in STATES_BEFORE_RUNNING:
            raise NgcException("Job is not yet started, there is no telemetry data available.")

        from_date = job.jobStatus.startedAt or job.jobStatus.createdDate
        to_date = job.jobStatus.endedAt or datetime.today().utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ")

        storage_type = None
        ace_id = job.aceId
        ace_details = self.client.basecommand.aces.get_ace_details(
            org_name=org_name, ace_id=ace_id, team_name=team_name
        )
        if ace_details:
            for sc in ace_details.storageServiceConfig or []:
                if sc and sc.isDefault:
                    storage_type = sc.type
                    break

        measurements = self.client.basecommand.measurements.get_all_job_measurements(
            org_name=org_name,
            job_id=job_id,
            replica_id=replica_id,
            from_date=from_date,
            to_date=to_date,
            interval_type=interval_unit,
            interval_time=interval_time,
            aggregation=statistics,
            types=types,
            stype=storage_type,
        )
        return (measurements, job)

    @extra_args
    def get_json(self, job_id: int, org: Optional[str] = None, team: Optional[str] = None, ace: Optional[str] = None):
        """Get job definition json."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ace = ace or self.config.ace_name
        parsed = self._get_parsed_json(org_name=org_name, jobid=job_id, team_name=team_name)
        return parsed

    @extra_args
    def update(
        self,
        job_id: int,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        label: Optional[List[str]] = None,
        remove_label: Optional[List[str]] = None,
        clear_label: Optional[bool] = None,
        lock_label: Optional[bool] = None,
        unlock_label: Optional[bool] = None,
    ):
        """Update a job."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ace = ace or self.config.ace_name

        lock = True if lock_label else False if unlock_label else None

        job_labels = parse_job_labels(label, lock, "update", clear_label)
        job_remove_labels = parse_job_labels(remove_label, lock, "remove")

        if clear_label:
            resp = self.post_labels(org_name, job_id, job_labels, team_name, overwrite="true")
        elif label or remove_label or lock is not None:
            if remove_label:
                resp = self.patch_labels(org_name, job_id, job_remove_labels, team_name)
            if label or lock is not None:
                resp = self.post_labels(org_name, job_id, job_labels, team_name)
        else:
            raise InvalidArgumentError("No arguments provided for job update") from None

        return resp

    @extra_args
    def log(
        self,
        job_id: int,
        replica_id: Optional[int] = None,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        head: Optional[bool] = None,
        lines: Optional[int] = None,
        tail: Optional[bool] = None,
    ):
        """Get job log."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ace = ace or self.config.ace_name

        if (tail or head) and not lines:
            lines = 10
        elif lines and not (head or tail):
            raise NgcException("Argument head or tail is required with lines.")

        job = self.get_job(org_name, job_id, team_name)
        if job.jobStatus.status in STATES_BEFORE_RUNNING:
            raise NgcException("Job is not yet started, there is no log data available.")

        # non multinode requests use replica_id of zero
        replica_id = replica_id or 0

        resultset_meta = self.client.basecommand.resultset.get_result_meta(org_name, job_id, replica_id)
        if not resultset_meta:
            raise NgcException("There is no log file available to download yet.")

        log_url = self.client.basecommand.resultset.get_log_url(
            org_name,
            resultset_id=job_id,
            replica_id=replica_id,
            lines=lines,
            head=head,
            tail=tail,
        )
        transfer_config = TransferConfig(url=log_url, org=org_name, team=team_name)
        controller = TransferController(job_id, transfer_config, client=self.client)
        try:
            with tempfile.TemporaryDirectory() as tempdir:
                controller.download_zip_submission(
                    dest=tempdir,
                    do_zip=True,
                    allow_redirects=True,
                    exit_on_shutdown=False,
                    disable_status_monitor=True,
                    dump_transfer_summary=False,
                )
                log_file = os.path.join(tempdir, f"{job_id}", f"{job_id}.zip")
                with open(log_file, encoding="utf-8") as infile:
                    yield from infile
        except (OSError, IOError, PermissionError):
            raise NgcException(
                "Unable to download the log file, check storage and permissions before retrying."
            ) from None


def _validate_mountpoint(input_mountpoint: str) -> bool:
    is_valid = input_mountpoint and (input_mountpoint == OBJECT_DATASET_MOUNT_POINT or input_mountpoint.startswith("/"))
    return is_valid
