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

from datetime import datetime, timezone
import time

from isodate import Duration

from basecommand.constants import (
    TELEMETRY_TYPE_ENUM,
    TELEMETRY_TYPE_ENUM_STG,
    TELEMETRY_TYPE_MIG_NA,
)
from ngcbase.constants import BUILD_ENV, CANARY_ENV, PRODUCTION_ENV
from ngcbase.printer.nvPrettyPrint import format_date, NVPrettyPrint, str_
from ngcbase.util.datetime_utils import diff_in_minutes, isoduration_to_dhms
from ngcbase.util.file_utils import convert_mib_to_bytes, human_size


class BatchPrinter(NVPrettyPrint):
    """The printer should be responsible for printing objects and lists of objects of the associated type
    This prints all the related information of batch.
    """  # noqa: D205

    def _get_storage_info(self, job_status, job_history=None, workspaces=None):
        # NOTE: using job_status on advice of Richard Ran Li b/c job_status is what the node saw and,
        # job_definition is what the user specified
        if job_status.jobDataLocations is None:
            return []

        # jobDefinition.WorkspaceMounts is deprecated -> use jobStatus.jobDataLocations
        # jobDefinition.datasetMounts is deprecated -> use jobStatus.jobDataLocations
        # jobDefinition.resultContainerMountPoint deprecated -> use jobStatus.jobDataLocations
        (dataset_info, workspace_info, result_info, _others) = _unpack_job_data_locations(job_status.jobDataLocations)

        storage_tbl = self.add_sub_table(outline=True)

        if any((dataset_info, workspace_info, result_info)):
            storage_tbl.set_title("Datasets, Workspaces and Results")

            for dataset in sorted(dataset_info or [], key=lambda x: x.resourceId):
                if job_history:
                    is_prepop = _is_dataset_prepopulated(dataset.resourceId, job_history[0].jobDataLocations)
                else:
                    is_prepop = False

                storage_tbl.add_label_line("Dataset ID", dataset.resourceId, level=1)
                storage_tbl.add_label_line("Dataset Name", dataset.name if hasattr(dataset, "name") else None, level=2)
                storage_tbl.add_label_line("Dataset Mount Point", dataset.mountPoint, level=2)
                storage_tbl.add_label_line("Prepopulated", "Yes" if is_prepop else "No", level=2)

            ws_names = {ws.id: ws.name for ws in workspaces} if workspaces else {}
            for workspace in sorted(workspace_info or [], key=lambda x: x.resourceId):
                storage_tbl.add_label_line("Workspace ID", workspace.resourceId, level=1)
                storage_tbl.add_label_line("Workspace Name", ws_names.get(workspace.resourceId), level=2)
                storage_tbl.add_label_line("Workspace Mount Point", workspace.mountPoint, level=2)
                storage_tbl.add_label_line("Workspace Mount Mode", workspace.accessRights, level=2)

        # I think there should only be one result_info entry
        if result_info:
            storage_tbl.add_label_line("Result Mount Point", result_info[0].mountPoint, level=1)
        return storage_tbl

    @staticmethod
    def _all_hostnames_present(port_mappings):
        if port_mappings:
            return not any(True for mapping in port_mappings if not mapping.hostName)
        return False

    # New jobs won't have job_history
    def print_job(self, input_job, job_history=None, print_job_status=False):  # noqa: C901, D102
        if self.format_type == "json":
            if not print_job_status:
                self.print_data(
                    {
                        "job": input_job.toDict() if input_job else {},
                        "jobStatusHistory": [i.toDict() for i in job_history if i] if job_history else [],
                    }
                )
            else:
                job_status = input_job.jobStatus
                job_status_dict = {
                    "createdDate": input_job.createdDate,
                    "startedAt": job_status.startedAt,
                    "endedAt": job_status.endedAt,
                    "totalRuntimeSeconds": (
                        isoduration_to_dhms(Duration(seconds=job_status.totalRuntimeSeconds))
                        if job_status.totalRuntimeSeconds
                        else ""
                    ),
                    "status": job_status.status,
                    "statusDetails": job_status.statusDetails,
                    "statusType": job_status.statusType,
                    "terminationRequestedDate": format_date(input_job.terminationRequestedDate),
                    "terminationRequestedByUserName": input_job.terminationRequestedByUserName,
                    "terminationReason": input_job.terminationReason,
                    "preemptionRequestedDate": format_date(input_job.preemptionRequestedDate),
                    "preemptionRequestedByUser": input_job.preemptionRequestedByUser,
                    "resumeRequestedDate": format_date(input_job.resumeRequestedDate),
                    "resumeRequestedByUser": input_job.resumeRequestedByUser,
                }
                job_status_dict = {k: v for k, v in job_status_dict.items() if v not in [None, ""]}
                self.print_data({"jobStatus": job_status_dict})
        else:
            tbl = self.create_output(header=False)
            tbl.add_separator_line()
            tbl.set_title("Job Information")
            job_definition = input_job.jobDefinition
            job_status = input_job.jobStatus
            exp_tracking_params = job_definition.expTrackingParams or None
            secret_spec = job_definition.userSecretsSpec or None
            if not print_job_status:
                tbl.add_label_line_no_blanks("Id", input_job.id)
                tbl.add_label_line_no_blanks("Name", job_definition.name)
                tbl.add_label_line_no_blanks("Description", job_definition.description)
                tbl.add_label_line_no_blanks("Number of Replicas", job_definition.replicaCount)
                tbl.add_label_line_no_blanks("Job Type", job_definition.jobType)
                tbl.add_label_line_no_blanks("Array Type", job_definition.arrayType)
                tbl.add_label_line_no_blanks("Network Type", job_definition.networkType)
                tbl.add_label_line_no_blanks("Topology Constraints", job_definition.topologyConstraint)
                tbl.add_label_line_no_blanks("Submitted By", input_job.submittedByUser)
                tbl.add_label_line_no_blanks("Order", input_job.jobOrder)
                tbl.add_label_line_no_blanks("Priority", input_job.jobPriority)

                cont_info_tbl = self.add_sub_table(outline=True)
                cont_info_tbl.set_title("Job Container Information")
                cont_info_tbl.add_label_line_no_blanks("Docker Image URL", job_definition.dockerImage)

                if self._all_hostnames_present(job_definition.portMappings):
                    cont_info_tbl.add_label_line_no_blanks("Port Mappings", None)
                    for port_mapping in sorted(job_definition.portMappings, key=lambda x: x.containerPort):
                        container_port = port_mapping.containerPort
                        if port_mapping.name:
                            container_port = f"{port_mapping.name}:{container_port}"
                        if port_mapping.protocol:
                            container_port = f"{container_port}/{port_mapping.protocol}"
                        cont_info_tbl.add_label_line_no_blanks(
                            "Container port",
                            f"{container_port} mapped to {port_mapping.hostName}",
                            level=1,
                        )
                cont_info_tbl.add_label_line_no_blanks("Container name", job_status.containerName)

                command_table = self.add_sub_table(outline=True)
                command_table.set_title("Job Commands")
                command_table.add_label_line_no_blanks("Command", job_definition.command)
                command_table.add_label_line_no_blanks("Entrypoint", job_definition.entryPoint)
                command_table.add_label_line_no_blanks("Dockerfile Image Entrypoint", job_definition.useImageEntryPoint)

                # Datasets, Workspace, Results information
                workspaces = input_job.workspaces
                self._get_storage_info(job_status, job_history, workspaces)

                resource_tbl = self.add_sub_table(outline=True)
                resource_tbl.set_title("Job Resources")
                job_resources = job_definition.resources
                resource_tbl.add_label_line_no_blanks("Instance Type", job_resources.name)
                memory_gib = human_size(convert_mib_to_bytes(job_resources.systemMemory))
                if job_resources.type == "MIG":
                    resource_tbl.add_label_line_no_blanks(
                        "Instance Details",
                        "{0}/{1} MIG, {2} CPU, {3} System Memory".format(
                            int(job_resources.migSlice),
                            int(job_resources.migTotalSlice),
                            int(job_resources.cpuCores),
                            memory_gib,
                        ),
                    )
                else:
                    resource_tbl.add_label_line_no_blanks(
                        "Instance Details",
                        f"{job_resources.gpus} GPU, {job_resources.cpuCores} CPU, {memory_gib} System Memory",
                    )
                resource_tbl.add_label_line_no_blanks("ACE", input_job.aceName)
                resource_tbl.add_label_line_no_blanks("Cluster", job_definition.clusterId)
                resource_tbl.add_label_line_no_blanks("Team", input_job.teamName)
                self.add_job_labels(input_job)

            status_tbl = self.add_sub_table(outline=True)
            status_tbl.set_title("Job Status")
            status_tbl.add_label_line_no_blanks("Created at", format_date(input_job.createdDate))
            status_tbl.add_label_line_no_blanks("Started at", format_date(job_status.startedAt))
            status_tbl.add_label_line_no_blanks("Ended at", format_date(job_status.endedAt))
            if job_status.totalRuntimeSeconds:
                status_tbl.add_label_line_no_blanks(
                    "Duration", isoduration_to_dhms(Duration(seconds=job_status.totalRuntimeSeconds))
                )
            status_tbl.add_label_line_no_blanks("Status", job_status.status)
            status_tbl.add_label_line_no_blanks("Status Details", job_status.statusDetails)
            status_tbl.add_label_line_no_blanks("Status Type", job_status.statusType)

            run_policy = job_definition.runPolicy
            if run_policy and not print_job_status:
                status_tbl.add_label_line_no_blanks("Preempt Class", run_policy.preemptClass)
                if run_policy.totalRuntimeSeconds:
                    status_tbl.add_label_line_no_blanks(
                        "Total Runtime", isoduration_to_dhms(Duration(seconds=run_policy.totalRuntimeSeconds))
                    )
                if run_policy.minTimesliceSeconds:
                    status_tbl.add_label_line_no_blanks(
                        "Minimum Timeslice", isoduration_to_dhms(Duration(seconds=run_policy.minTimesliceSeconds))
                    )

            status_tbl.add_label_line_no_blanks(
                "Termination Requested By User at", format_date(input_job.terminationRequestedDate)
            )
            status_tbl.add_label_line_no_blanks(
                "Termination Requested By User", input_job.terminationRequestedByUserName
            )
            status_tbl.add_label_line_no_blanks("Termination Reason", input_job.terminationReason)
            status_tbl.add_label_line_no_blanks(
                "Preemption Requested By User at", format_date(input_job.preemptionRequestedDate)
            )
            status_tbl.add_label_line_no_blanks("Preemption Requested By User ID", input_job.preemptionRequestedByUser)
            status_tbl.add_label_line_no_blanks(
                "Resume Requested By User at", format_date(input_job.resumeRequestedDate)
            )
            status_tbl.add_label_line_no_blanks("Resume Requested By User ID", input_job.resumeRequestedByUser)

            if job_definition.envs:
                env_var_tbl = self.add_sub_table(outline=True)
                env_var_tbl.set_title("Environmental Variables")
                for kv in job_definition.envs or []:
                    env_var_tbl.add_label_line_no_blanks(kv.name, kv.value or " ")

            if secret_spec:
                secret_tbl = self.add_sub_table(outline=True)
                secret_tbl.set_title("Secrets")
                for secret in secret_spec or []:
                    secret_tbl.add_label_line_no_blanks("Secret", secret.name)
                    if secret.allKeys:
                        secret_tbl.add_label_line_no_blanks("All Keys Included", str(secret.allKeys))
                    if secret.keysSpec:
                        for secret_key_spec in secret.keysSpec or []:
                            secret_tbl.add_label_line_no_blanks("Key Name", secret_key_spec.keyName)
                            secret_tbl.add_label_line_no_blanks("Alias", secret_key_spec.envName, level=3)

            if exp_tracking_params:
                exp_tracking_table = self.add_sub_table(outline=True)
                exp_tracking_table.set_title("Experiment Tracking Parameters")
                exp_tracking_table.add_label_line_no_blanks("Experiment Tracking URL", input_job.expTrackingURL)
                exp_tracking_table.add_label_line_no_blanks("Experiment Project Name", exp_tracking_params.projectName)
                exp_tracking_table.add_label_line_no_blanks("Experiment Type", exp_tracking_params.type)
                exp_tracking_table.add_label_line_no_blanks("Experiment Name", exp_tracking_params.name)

            tbl.add_separator_line()
            tbl.print()

    def print_job_status_short_table(self, input_jobs, all_users=False, columns=None):  # noqa: D102
        list_of_jobs = []
        if self.format_type == "json":
            for Job in input_jobs or []:
                list_of_jobs.append(Job)
        else:
            if not columns:
                if all_users:
                    columns = [
                        ("id", "Id"),
                        ("replicas", "Replicas"),
                        ("name", "Name"),
                        ("team", "Team"),
                        ("submitted", "Submitted By"),
                        ("status", "Status"),
                        ("duration", "Duration"),
                        ("details", "Status Details"),
                    ]
                else:
                    columns = [
                        ("id", "Id"),
                        ("replicas", "Replicas"),
                        ("name", "Name"),
                        ("team", "Team"),
                        ("status", "Status"),
                        ("duration", "Duration"),
                        ("details", "Status Details"),
                    ]
            else:
                columns = [("type_", col[1]) if col[0] == "type" else col for col in columns]

            list_of_jobs = self.generate_job_list(input_jobs, columns)

        self.print_data(list_of_jobs, is_table=True)

    def print_job_status_table(self, input_jobs, columns=None):  # noqa: D102
        list_of_jobs = []
        if self.format_type == "json":
            for Job in input_jobs or []:
                list_of_jobs.append(Job)
        else:
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("replicas", "Replicas"),
                    ("name", "Name"),
                    ("submitted", "Submitted By"),
                    ("status", "Status"),
                    ("details", "Status Details"),
                    ("type_", "Status Type"),
                    ("created", "Created"),
                    ("started", "Started"),
                    ("ended", "Ended"),
                    ("termination", "Termination"),
                    ("ace", "ACE"),
                    ("team", "Team"),
                    ("instance", "Instance Name"),
                ]
            else:
                columns = [("type_", col[1]) if col[0] == "type" else col for col in columns]

            list_of_jobs = self.generate_job_list(input_jobs, columns)
        self.print_data(list_of_jobs, is_table=True)

    def print_measurements_table(self, measurements, instance_type=None):  # noqa: D102
        if self.format_type == "json":
            list_of_measurements = measurements or []
        else:
            list_of_measurements = []
            column_added = False
            for measurement in measurements or []:
                if measurement and measurement.series:
                    for series in [_f for _f in measurement.series or [] if _f]:
                        tags = series.tags
                        if tags:
                            tag_key = tags[0].tagKey
                            tag_value = tags[0].tagValue
                        if not column_added:
                            # the column name comes from influx db and there has been a change in the way
                            # data is stored to fix the bug where it accidentally used to get overwritten.
                            # now the column name is actually the app telemetry name

                            # http://nvbugs/200520285
                            # we need to hardcode the column name as there is not much that we can do about it
                            _columns = ["Name", "Time", "Measurement"]
                            _columns = [self.ATRIB + x + self.ENDC for x in _columns]
                            list_of_measurements.append(_columns)
                            column_added = True

                        for value in series.values or []:
                            _value = value.value
                            if instance_type == "MIG" and series.name in TELEMETRY_TYPE_MIG_NA:
                                _value[1] = "N/A"
                            if tags:
                                _value.insert(0, series.name + "_" + tag_key + "_" + tag_value)
                            else:
                                _value.insert(0, series.name)
                            list_of_measurements.append(_value)

        if list_of_measurements:
            # convert to new csv format
            if self.format_type == "csv":
                measurements_list = list_of_measurements

                # each mesurement result is formated as ['Name', 'Time', 'Measurement'] tuple
                #   index=0: get 'Name' field item
                #   index=1: get 'Time' field item
                name_list = _get_unique_elements_from_list_of_measurements(measurements_list, 0)
                time_list = _get_unique_elements_from_list_of_measurements(measurements_list, 1)

                # base on lambda function's time format to sort 'time_list'
                time_list.sort(key=lambda x: time.mktime(time.strptime(x, "%Y-%m-%dT%H:%M:%SZ")))

                # convert query result to chronological order csv format
                list_of_measurements = _convert_query_result_to_new_telemetry_format(
                    measurements_list, name_list, time_list
                )
        else:
            if self.format_type == "ascii":
                _columns = ["Name", "Time", "Measurement"]
            if self.format_type == "csv":
                _columns = TELEMETRY_TYPE_ENUM if BUILD_ENV in (PRODUCTION_ENV, CANARY_ENV) else TELEMETRY_TYPE_ENUM_STG
                _columns.insert(0, "Time")

            list_of_measurements.append(_columns)

        self.print_data(list_of_measurements, is_table=True)

    def print_replica(self, input_replica):  # noqa: D102
        if self.format_type == "json":
            self.print_data(input_replica)
        else:
            replica_status = input_replica.replicaStatus
            tbl = self.create_output(header=False)
            tbl.set_title("Replica Information")
            tbl.add_label_line("Replica", "{}:{}".format(input_replica.jobId, input_replica.replicaId))
            tbl.add_label_line("Created At", format_date(input_replica.createdDate))
            tbl.add_label_line("Submitted By", input_replica.submittedByUser)

            tbl.add_label_line("ACE", input_replica.aceName)
            tbl.add_label_line("Team", input_replica.teamName)

            if self._all_hostnames_present(replica_status.portMappings):
                tbl.add_label_line("Port Mappings", None)
                for port_mapping in sorted(replica_status.portMappings, key=lambda x: x.containerPort):
                    container_port = port_mapping.containerPort
                    if port_mapping.name:
                        container_port = f"{port_mapping.name}:{container_port}"
                    if port_mapping.protocol:
                        container_port = f"{container_port}/{port_mapping.protocol}"
                    tbl.add_label_line("Container port", f"{container_port} mapped to {port_mapping.hostName}")

            rep_tbl = self.add_sub_table(outline=True)
            rep_tbl.set_title("Replica Status")
            rep_tbl.add_label_line("Started at", format_date(replica_status.startedAt))
            rep_tbl.add_label_line("Ended at", format_date(replica_status.endedAt))
            rep_tbl.add_label_line("Status", replica_status.status)
            rep_tbl.add_label_line("Status Details", replica_status.statusDetails)
            rep_tbl.add_label_line("Status Type", replica_status.statusType)
            tbl.print()

    def print_update(self, job_update):  # noqa: D102
        if self.format_type == "json":
            self.print_data(job_update)
        else:
            tbl = self.create_output(header=False)
            tbl.set_min_width(24)
            tbl.add_separator_line()
            tbl.set_title("Job Update Information")
            tbl.add_label_line("Id", job_update.jobId)
            tbl.add_label_line("Org", job_update.orgName)
            if job_update.teamName:
                tbl.add_label_line("Team", job_update.teamName)
            self.add_job_labels(job_update)
            tbl.add_separator_line()
            tbl.print()

    def print_log(self, log_file):  # noqa: D102
        for line in log_file:
            self.print_ok(line, end="")

    @staticmethod
    def generate_job_list(gen, columns):  # noqa: D102
        [cols, disp] = zip(*columns)
        yield list(disp)
        for job in gen or []:
            out = JobOutput(job)
            yield [getattr(out, col, None) for col in cols]

    def add_job_labels(self, job):  # noqa: D102
        lbl_tbl = self.add_sub_table(outline=True)
        if job.labels is not None:
            lbl_tbl.set_title("Job Labels")
            if job.labels.isLocked is not None:
                lbl_tbl.add_label_line("Locked", job.labels.isLocked)
            if job.labels.userLabels.values:
                lbl_tbl.add_label_line("User", ", ".join(job.labels.userLabels.values))
            if job.labels.reservedLabels.values:
                lbl_tbl.add_label_line("Reserved", ", ".join(job.labels.reservedLabels.values))
            if job.labels.systemLabels.values:
                lbl_tbl.add_label_line("System", ", ".join(job.labels.systemLabels.values))


def _unpack_job_data_locations(location_list):
    workspace_info = [x for x in location_list if x.type == "WORKSPACE"]
    result_info = [x for x in location_list if x.type == "RESULTSET"]
    dataset_info = [x for x in location_list if x.type == "DATASET"]
    other_info = [x for x in location_list if x.type not in ("WORKSPACE", "RESULTSET", "DATASET")]
    return (dataset_info, workspace_info, result_info, other_info)


def _is_dataset_prepopulated(dataset_id, history):
    for snapshot in history:
        if snapshot.resourceId == dataset_id and snapshot.protocol == "LOCAL":
            return True
    return False


def _get_unique_elements_from_list_of_measurements(measurement_list, index):
    result = []
    for line in measurement_list[1:]:
        if line[index] not in result:
            result.append(line[index])
    return result


def _convert_query_result_to_new_telemetry_format(measurement_list, name_list, time_list):
    line_count = 0
    field1_count = 0
    final_row = []
    new_format = []

    if line_count == 0:
        for name_item in name_list:
            if field1_count == 0:
                final_row.append("Time")
                field1_count += 1
            # In order to match with UI implementation, need to change measurement query result type
            # 'ngcjob_appmetrics_' to 'App Metrics:'
            final_row.append(name_item.replace("ngcjob_appmetrics_", "App Metrics:"))
            field1_count += 1
        new_format.append(final_row)
        line_count += 1

    final_row = []
    for time_item in time_list:
        final_row.append(time_item)
        for name_item in name_list:
            # record a '' if query result is not available for the specified time interval
            add_item = ""
            for row in measurement_list[1:]:
                # The original telemetry csv format is 'Name,Time,Measurement'
                name_ele = row[0]
                time_ele = row[1]
                value_ele = row[2]
                if time_ele == time_item and name_ele == name_item:
                    add_item = value_ele
            final_row.append(add_item)
        new_format.append(final_row)
        final_row = []

    return new_format


class JobOutput:  # noqa: D101
    def __init__(self, job):
        self.job = job

    @property
    def id(self):  # noqa: D102
        return self.job.id

    @property
    def replicas(self):  # noqa: D102
        return self.job.jobDefinition.replicaCount

    @property
    def name(self):  # noqa: D102
        return self.job.jobDefinition.name

    @property
    def org(self):  # noqa: D102
        return str_(self.job.orgName)

    @property
    def team(self):  # noqa: D102
        return str_(self.job.teamName)

    @property
    def ace(self):  # noqa: D102
        return str_(self.job.aceName)

    @property
    def started(self):  # noqa: D102
        created = self.job.createdDate
        started = self.job.jobStatus.startedAt
        return "+{0}".format(diff_in_minutes(created, started)) if created and started else ""

    @property
    def created(self):  # noqa: D102
        return format_date(self.job.createdDate)

    @property
    def ended(self):  # noqa: D102
        created = self.job.createdDate
        ended = self.job.jobStatus.endedAt
        return "+{0}".format(diff_in_minutes(created, ended)) if created and ended else ""

    @property
    def status(self):  # noqa: D102
        return self.job.jobStatus.status

    @property
    def details(self):  # noqa: D102
        details = self.job.jobStatus.statusDetails
        return details if self.status in ["FAILED", "KILLED_BY_USER", "KILLED_BY_ADMIN"] and details else ""

    @property
    def type_(self):  # noqa: D102
        type_ = self.job.jobStatus.statusType
        return type_ if self.status in ["FAILED", "KILLED_BY_USER", "KILLED_BY_ADMIN"] and type_ else ""

    @property
    def submitted(self):  # noqa: D102
        return self.job.submittedByUser

    @property
    def termination(self):  # noqa: D102
        return format_date(self.job.terminationRequestedDate)

    @property
    def reason(self):  # noqa: D102
        return self.job.terminationReason or ""

    @property
    def instance(self):  # noqa: D102
        return str_(self.job.jobDefinition.resources.name)

    @property
    def duration(self):  # noqa: D102
        started = self.job.jobStatus.startedAt
        if self.status == "RUNNING":
            ended = datetime.now(timezone.utc)
        else:
            ended = self.job.jobStatus.endedAt
        return "{0}".format(diff_in_minutes(started, ended)) if started and ended else "-"

    @property
    def labels(self):  # noqa: D102
        lbls = []
        if self.job.labels.userLabels.values:
            lbls.extend(self.job.labels.userLabels.values)
        if self.job.labels.reservedLabels.values:
            lbls.extend(self.job.labels.reservedLabels.values)
        if self.job.labels.systemLabels.values:
            lbls.extend(self.job.labels.systemLabels.values)
        return ", ".join(lbls)

    @property
    def locked(self):  # noqa: D102
        return self.job.labels.isLocked if self.job.labels.isLocked is not None else ""

    @property
    def order(self):  # noqa: D102
        return self.job.jobOrder if self.job.jobOrder is not None else ""

    @property
    def priority(self):  # noqa: D102
        return self.job.jobPriority if self.job.jobPriority is not None else ""
