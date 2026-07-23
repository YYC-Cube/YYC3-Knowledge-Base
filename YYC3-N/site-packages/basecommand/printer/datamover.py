#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from basecommand.api.datamover import (
    BcpCopyType,
    BcpResourceType,
    JobSettingsLocal,
    JobState,
)
from ngcbase.printer.nvPrettyPrint import format_date, NVPrettyPrint, str_

JOB_STATE_OUTPUT_STR_MAPPING = {
    JobState.NOT_STARTED: "QUEUED",
    JobState.STARTED: "RUNNING",
    JobState.FINISHED: "FINISHED_SUCCESS",
    JobState.FINISHED_WITH_ERRORS: "FAILED",
}

RESOURCE_TYPE_STR_MAPPING = {
    BcpResourceType.DATASET: "Dataset",
    BcpResourceType.WORKSPACE: "Workspace",
    BcpResourceType.RESULTSET: "Restulset",
}

BCP_COPY_TYPE_MAPPING = {
    BcpCopyType.ACE2ACE: "ACE to ACE",
    BcpCopyType.IMPORT: "Import",
    BcpCopyType.EXPORT: "Export",
}


class BcpCopyOutput:  # noqa: D101
    def __init__(self, bcpCopy):
        self.bcpCopy = bcpCopy

    @property
    def bcp_copy_and_resource_type(self):  # noqa: D102
        return f"{self.bcp_copy_type} - {self.resource_type}"

    @property
    def bcp_copy_type(self):  # noqa: D102
        return BCP_COPY_TYPE_MAPPING[self.bcpCopy.bcp_copy_type]

    @property
    def resource_type(self):  # noqa: D102
        return RESOURCE_TYPE_STR_MAPPING[self.bcpCopy.resource_type]

    @property
    def origin_resource_id(self):  # noqa: D102
        return str_(self.bcpCopy.resource_id)

    @property
    def destination_resource_id(self):  # noqa: D102
        msj = self.bcpCopy.multi_stage_job
        job = None
        if self.bcpCopy.bcp_copy_type == BcpCopyType.ACE2ACE and len(msj.jobs) > 1:
            job = msj.jobs[1]
        if self.bcpCopy.bcp_copy_type == BcpCopyType.IMPORT and len(msj.jobs) > 0:
            job = msj.jobs[0]

        if job and job.bcp_job and job.bcp_job.destination_resource_id:
            return job.bcp_job.destination_resource_id

        return ""

    @property
    def bucket_prefix(self):  # noqa: D102
        bucket = self.bcpCopy.bucket if self.bcpCopy.bucket else ""
        prefix = self.bcpCopy.prefix if self.bcpCopy.prefix else ""
        if bucket and prefix:
            return str_("/".join([bucket, prefix]))
        if bucket:
            return str_(bucket)
        if prefix:
            return str_(prefix)

        return ""

    @property
    def origin_and_destination_aces(self):  # noqa: D102
        return (
            f"{self.origin_ace if self.origin_ace != '' else 'N/A'} -> "
            f"{self.destination_ace if self.destination_ace != '' else 'N/A'}"
        )

    @property
    def origin_ace(self):  # noqa: D102
        return str_(self.bcpCopy.origin_ace)

    @property
    def destination_ace(self):  # noqa: D102
        return str_(self.bcpCopy.destination_ace)

    @property
    def id(self):  # noqa: D102
        return str_(self.bcpCopy.id)

    @property
    def export_job_id(self):  # noqa: D102
        if self.bcpCopy.bcp_copy_type in {BcpCopyType.ACE2ACE, BcpCopyType.EXPORT}:
            msj = self.bcpCopy.multi_stage_job
            if len(msj.jobs) > 0:
                job = msj.jobs[0]
                return job.bcp_job.job_id if job.bcp_job else ""

        return ""

    @property
    def export_job_status(self):  # noqa: D102
        if self.bcpCopy.bcp_copy_type in {BcpCopyType.ACE2ACE, BcpCopyType.EXPORT}:
            msj = self.bcpCopy.multi_stage_job
            if len(msj.jobs) > 0:
                job = msj.jobs[0]
                return JOB_STATE_OUTPUT_STR_MAPPING[job.state]

        return ""

    @property
    def import_job_id(self):  # noqa: D102
        msj = self.bcpCopy.multi_stage_job
        job = None
        if self.bcpCopy.bcp_copy_type == BcpCopyType.ACE2ACE and len(msj.jobs) > 1:
            job = msj.jobs[1]
        if self.bcpCopy.bcp_copy_type == BcpCopyType.IMPORT and len(msj.jobs) > 0:
            job = msj.jobs[0]

        if job and job.bcp_job and job.bcp_job.job_id:
            return job.bcp_job.job_id

        return ""

    @property
    def import_job_status(self):  # noqa: D102
        msj = self.bcpCopy.multi_stage_job
        job = None
        if self.bcpCopy.bcp_copy_type == BcpCopyType.ACE2ACE and len(msj.jobs) > 1:
            job = msj.jobs[1]
        if self.bcpCopy.bcp_copy_type == BcpCopyType.IMPORT and len(msj.jobs) > 0:
            job = msj.jobs[0]

        if job:
            return JOB_STATE_OUTPUT_STR_MAPPING[job.state]
            # return job.bcp_job.job_id + " - " + JOB_STATE_OUTPUT_STR_MAPPING[job.state]

        return ""

    def dict(self):  # noqa: D102
        return {
            k: getattr(self, k)
            for k, v in self.__class__.__dict__.items()
            if isinstance(v, property) and getattr(self, k) != ""
        }


class DataMoverPrinter(NVPrettyPrint):
    """The printer is responsible for printing dataset ouput."""

    should_print_pending_actions: bool = False

    def print_bcp_copies(self, copy_list):  # noqa: D102
        self.print_data(self._generate_copy_list(copy_list), is_table=True, no_wrap_columns=["Id"])
        if self.should_print_pending_actions:
            self.print_ok(
                "\n WARNING: some of your copy jobs are waiting for new actions to be performed. Please run "
                "`ngc base-command datamover update` to keep your jobs making progress."
            )

    def _generate_copy_list(self, copy_list):
        if self.format_type == "json":
            for page in copy_list or []:
                for copy in page or []:
                    if not self.should_print_pending_actions and copy.action is not None:
                        self.should_print_pending_actions = True
                    bcp_copy_output_dict = BcpCopyOutput(copy).dict()
                    del bcp_copy_output_dict["bcp_copy_and_resource_type"]
                    del bcp_copy_output_dict["origin_and_destination_aces"]
                    yield bcp_copy_output_dict
        else:
            columns = [
                ("id", "Id"),
                ("bcp_copy_and_resource_type", "Type"),
                ("origin_resource_id", "Origin Resource Id"),
                ("destination_resource_id", "Dest. Resource Id"),
                ("bucket_prefix", "Bucket"),
                ("origin_and_destination_aces", "Origin -> Dest. ACE"),
                ("export_job_id", "Export Job ID"),
                ("export_job_status", "Export Status"),
                ("import_job_id", "Import Job ID"),
                ("import_job_status", "Import Status"),
            ]
            yield from self._get_bcp_copy_output(copy_list, columns)

    @classmethod
    def _get_bcp_copy_output(self, copy_list, columns):
        cols, disp = zip(*columns)
        yield list(disp)

        for page in copy_list or []:
            for copy in page or []:
                if not self.should_print_pending_actions and copy.action is not None:
                    self.should_print_pending_actions = True
                out = BcpCopyOutput(copy)
                yield [getattr(out, col, None) for col in cols]

    def print_jobs_list(self, jobs_list, columns=None):  # noqa: D102
        self.print_data(self._generate_job_list(jobs_list, columns), is_table=True)

    def _generate_job_list(self, jobs_list, columns=None):
        """Print jobs list."""
        if self.format_type == "json":
            for page in jobs_list or []:
                for job in page or []:
                    yield JobOutput(job).dict()
        else:
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("source", "Source"),
                    ("destination", "Destination"),
                    ("status", "Status"),
                    ("start_time", "Start time"),
                    ("end_time", "End time"),
                ]
            yield from self._generate_table_jobs_list(jobs_list, columns)

    @staticmethod
    def _generate_table_jobs_list(jobs_list, columns):
        cols, disp = zip(*columns)
        yield list(disp)

        for page in jobs_list or []:
            for job in page or []:
                out = JobOutput(job)
                yield [getattr(out, col, None) for col in cols]

    def print_job(self, job, columns=None):  # noqa: D102
        out = JobOutput(job)
        if self.format_type == "json":
            self.print_data(out.dict())
            return
        tbl = self.create_output(header=False)
        tbl.add_separator_line()
        if out.is_import():
            if job.bcp_job.destination_resource_type == BcpResourceType.DATASET:
                title = "Dataset Import Job Details"
            else:
                title = "Workspace Import Job Details"
        else:
            if job.bcp_job.origin_resource_type == BcpResourceType.DATASET:
                title = "Dataset Export Job Details"
            else:
                title = "Workspace Export Job Details"
        tbl.set_title(title)
        if not columns:
            fields = [
                ("Id", "id"),
                ("Source", "source"),
                ("Destination", "destination"),
                ("Status", "status"),
                ("Start time", "start_time"),
                ("Finish time", "end_time"),
                ("Directories found", "directories_found"),
                ("Directories traversed", "directories_enumerated"),
                ("Files found", "files_found"),
                ("Files copied", "files_copied"),
                ("Files skipped", "files_skipped"),
                ("Total bytes copied", "bytes_copied"),
            ]
            if out.file_errors not in ["", "0"]:
                fields.append(("File copy errors", "file_errors"))
            if out.directory_errors not in ["", "0"]:
                fields.append(("Directory traversal errors", "directory_errors"))
        else:
            fields = [(v, k) for k, v in columns]
        for k, v in fields:
            tbl.add_label_line(k, getattr(out, v))
        tbl.add_separator_line()
        tbl.print()


class JobOutput:  # noqa: D101
    def __init__(self, job):
        self.job = job

    def _format_location(self, location):
        if isinstance(location, JobSettingsLocal):
            if self.job.bcp_job.origin_resource_id:
                field_prefix = "origin_resource_"
            elif self.job.bcp_job.destination_resource_id:
                field_prefix = "destination_resource_"
            elif self.job.bcp_job.tmp_resource_id:
                field_prefix = "tmp_resource_"
            else:
                return ",".join(location.path)
            return (
                f"{getattr(self.job.bcp_job, field_prefix + 'type')} {getattr(self.job.bcp_job, field_prefix + 'id')}"
            )
        return str(location)

    def is_import(self):  # noqa: D102
        return isinstance(self.job.destination, JobSettingsLocal)

    @property
    def id(self):  # noqa: D102
        return str_(self.job.bcp_job.job_id)

    @property
    def source(self):  # noqa: D102
        return self._format_location(self.job.origin)

    @property
    def destination(self):  # noqa: D102
        return self._format_location(self.job.destination)

    @property
    def status(self):  # noqa: D102
        return JOB_STATE_OUTPUT_STR_MAPPING[self.job.state]

    @property
    def start_time(self):  # noqa: D102
        return format_date(self.job.copy_start_time)

    @property
    def end_time(self):  # noqa: D102
        return format_date(self.job.copy_end_time)

    @property
    def files_copied(self):  # noqa: D102
        return str_(self.job.files_copied)

    @property
    def files_found(self):  # noqa: D102
        return str_(self.job.files_found)

    @property
    def files_skipped(self):  # noqa: D102
        return str_(self.job.files_skipped)

    @property
    def file_errors(self):  # noqa: D102
        return str_(self.job.errors)

    @property
    def directories_found(self):  # noqa: D102
        return str_(self.job.directories_found)

    @property
    def directories_enumerated(self):  # noqa: D102
        return str_(self.job.directories_enumerated)

    @property
    def directory_errors(self):  # noqa: D102
        return str_(self.job.directory_errors)

    @property
    def bytes_copied(self):  # noqa: D102
        return str_(self.job.bytes_copied)

    def dict(self):  # noqa: D102
        return {
            k: getattr(self, k)
            for k, v in self.__class__.__dict__.items()
            if isinstance(v, property) and getattr(self, k) != ""
        }
