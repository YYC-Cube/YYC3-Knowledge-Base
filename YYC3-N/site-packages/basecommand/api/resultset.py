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
from fnmatch import fnmatch
import json
import os
from typing import List, Optional, Union

import psutil

from basecommand.api.utils import is_dataset_service_enabled
from basecommand.constants import DATASET_SERVICE_API_VERSION, STATES_BEFORE_RUNNING
from basecommand.data.api.ResultsetFile import ResultsetFile
from basecommand.data.api.ResultsetResponse import ResultsetResponse
from basecommand.printer.result import ResultPrinter
from ngcbase.api.pagination import pagination_helper_use_page_reference
from ngcbase.constants import API_VERSION
from ngcbase.errors import NgcException, ResourceNotFoundException
from ngcbase.transfer.async_download import AsyncDownload
from ngcbase.transfer.utils import get_download_files_size
from ngcbase.util.file_utils import human_size, tree_size_and_count
from ngcbase.util.utils import confirm_remove, contains_glob, extra_args

PAGE_SIZE = 1000


class ResultsetAPI:  # noqa: D101
    def __init__(self, api_client, dataset_service_connection=None):
        self.config = api_client.config
        self.connection = api_client.connection
        self.client = api_client
        self.printer = ResultPrinter(api_client.config)
        self.dataset_service_connection = dataset_service_connection
        self.org_api = api_client.organization.organization

    @staticmethod
    def _construct_url(org_name, resultset_id, replica_id=None, dataset_service_enabled=False):
        """Constructs ace url depending on given parameters."""  # noqa: D401
        api_version = DATASET_SERVICE_API_VERSION if dataset_service_enabled else API_VERSION
        url_method = "{api}/org/{org}/resultsets/{res_id}".format(api=api_version, org=org_name, res_id=resultset_id)

        if replica_id is not None:
            url_method = "{base}/replicas/{rep_id}".format(base=url_method, rep_id=replica_id)
        return url_method

    @staticmethod
    def _match_job_patterns(job_id, patterns):
        for pat in patterns or []:
            if isinstance(pat, list):
                if pat[0] <= job_id <= pat[1]:
                    return True
            elif fnmatch(str(job_id), str(pat)):
                return True

        return False

    def _check_result_downloadable(self, org_name, job_id):
        # joblog.log is generated just before the RUNNING state, before that there are no results in storage
        # we need to generate exception to prevent fetching the results from storage for any states before RUNNING
        job = self.client.basecommand.jobs.get_job(org_name, job_id)
        if job.jobStatus.status in STATES_BEFORE_RUNNING:
            raise NgcException("Job is not yet started, cannot download results.")

    def _remove_result(self, job_id, dry_run, default_yes):
        fail_message = "Removing of result for job ID: {0} failed: {1}"
        success_message = "Result for job ID: {0} removed from org: {1}."
        dry_run_message = "Would remove result for job ID: {0} from org: {1}"
        try:
            if not dry_run:
                # don't ask user when dry running
                confirm_remove(self.printer, job_id, default_yes)
                self.remove_resultset(org_name=self.config.org_name, resultset_id=job_id)
            self.printer.print_ok(
                (dry_run_message if dry_run else success_message).format(job_id, self.config.org_name)
            )
        except ResourceNotFoundException:
            self.printer.print_error("Result for job '{}' not found".format(job_id))
        except NgcException as why:
            self.printer.print_error(fail_message.format(job_id, str(why)))

    def get_result_meta(self, org_name, resultset_id, replica_id):  # noqa: D102
        result_iterator = self.get_resultset(
            org_name=org_name, resultset_id=resultset_id, replica_id=replica_id, page_size=1
        )
        try:
            return next(result_iterator)
        except StopIteration:
            return None

    def get_resultset(self, org_name, resultset_id, replica_id, page_size=PAGE_SIZE, enable_paging=True):
        """Gets resultset details for given job ID."""  # noqa: D401
        dataset_service_enabled = is_dataset_service_enabled(org_api=self.org_api, org_name=org_name)
        base_url = self._construct_url(
            org_name, resultset_id=resultset_id, replica_id=replica_id, dataset_service_enabled=dataset_service_enabled
        )
        connection = self.dataset_service_connection if dataset_service_enabled else self.connection
        extra_auth_headers = {"nv-ngc-org": org_name} if dataset_service_enabled else None

        if enable_paging:
            query = "{url}?page-size={page_size}".format(url=base_url, page_size=page_size)
            for response in pagination_helper_use_page_reference(
                connection,
                query,
                org_name=org_name,
                operation_name="get resultset paginated",
                kas_direct=dataset_service_enabled,
                extra_auth_headers=extra_auth_headers,
            ):
                yield ResultsetResponse(response).resultset
        else:
            response = connection.make_api_request(
                "GET",
                base_url,
                auth_org=org_name,
                operation_name="get resultset",
                kas_direct=dataset_service_enabled,
                extra_auth_headers=extra_auth_headers,
            )
            yield ResultsetResponse(response).resultset

    def get_resultset_files(self, org_name, resultset_id, file_filter=None, page_size=PAGE_SIZE):
        """Gets resultset files for given job ID."""  # noqa: D401
        base_url = self._construct_url(org_name, resultset_id=resultset_id)
        query = f"{base_url}/listFiles/?flat-dir=true&page-size={page_size}"
        if file_filter:
            query = f"{query}&filter={file_filter}"
        response = self.connection.make_api_request(
            "GET",
            query,
            auth_org=org_name,
            operation_name="get resultset files",
        )
        return response

    def remove_resultset(self, org_name, resultset_id):
        """Removes resultset given resultset ID."""  # noqa: D401
        response = self.connection.make_api_request(
            "DELETE",
            self._construct_url(org_name, resultset_id=resultset_id),
            auth_org=org_name,
            operation_name="delete resultset",
        )
        return response

    def get_download_url(self, org_name, resultset_id, replica_id):  # noqa: D102

        resultset_url = self._construct_url(org_name, resultset_id=resultset_id, replica_id=replica_id)
        download_url = f"{self.connection.base_url or self.config.base_url}/{resultset_url}/file/"
        return download_url

    def get_log_url(self, org_name, resultset_id, replica_id=None, lines=10, head=None, tail=None):  # noqa: D102

        download_url = self.get_download_url(org_name, resultset_id=resultset_id, replica_id=replica_id)
        log_url = f"{download_url}joblog.log"

        if lines:
            if head:
                log_url = f"{log_url}?lines={lines}&log-order=FIRST&offset="
            elif tail:
                log_url = f"{log_url}?lines={lines}&log-order=LAST&offset="

        return log_url

    @extra_args
    def info(
        self,
        job_id: int,
        replica_id: Optional[int] = None,
        org: Optional[int] = None,
        team: Optional[int] = None,
        ace: Optional[int] = None,
        files: Optional[bool] = None,
    ):
        """Gets resultset details for given job ID."""  # noqa: D401
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team = team or self.config.team_name
        ace = ace or self.config.ace_name

        # non multinode requests use replica_id of zero
        replica_id = replica_id or 0

        resultset_meta = self.get_result_meta(org_name, job_id, replica_id)
        if resultset_meta:
            if files:
                response = self.get_resultset_files(org_name=org_name, resultset_id=job_id)
                if response:
                    fls = response.get("storageObjects", [])
                    resultset_meta.files = sorted(
                        (
                            ResultsetFile(
                                {
                                    "path": f.get("path", None),
                                    "fileSize": f.get("size", None),
                                    "isDir": f.get("isDir", None),
                                }
                            )
                            for f in fls
                            if f
                        ),
                        key=lambda result: result.path,
                    )
        else:
            raise NgcException("Result response is empty.")

        return resultset_meta

    @extra_args
    def download(
        self,
        job_id: int,
        replica_id: Optional[int] = None,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        dest: Optional[str] = ".",
        files: Optional[List[str]] = None,
        dirs: Optional[List[str]] = None,
        exclude: Optional[List[str]] = None,
        do_zip: Optional[bool] = None,
        dry_run: Optional[bool] = None,
        resume: Optional[str] = None,
    ):
        """Download resultset for given job ID."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team = team or self.config.team_name
        ace = ace or self.config.ace_name

        absolute_path = os.path.abspath(dest)
        disk_info = psutil.disk_usage(absolute_path)

        # destination is a valid directory
        if not os.path.isdir(absolute_path):
            raise NgcException("Given destination is not a valid directory: '{0}'.".format(dest))

        # non multinode requests use replica_id of zero
        replica_id = replica_id or 0

        self._check_result_downloadable(org_name, job_id)
        # get the download URL from CAS
        resultset_meta = self.get_result_meta(org_name, job_id, replica_id)

        transfer_id = job_id
        download_url = self.get_download_url(self.config.org_name, job_id, replica_id)
        if replica_id:
            transfer_id = "_".join([job_id, replica_id])

        async_downloader = AsyncDownload(self.client, transfer_id, org_name=self.config.org_name)
        download_size = resultset_meta.size
        download_files = None

        if files or dirs or exclude:
            if not resultset_meta:
                raise NgcException("There are no files available to download yet.")
            resultset_files = []
            for file_filter in list(set((files or []))) or [None]:
                response = self.get_resultset_files(org_name=org_name, resultset_id=job_id, file_filter=file_filter)
                if response:
                    resultset_files.extend(response.get("storageObjects", []))

            fls = {f.get("path", None): f.get("size", None) for f in resultset_files if not f.get("isDir", False)}
            download_files, download_size = get_download_files_size(fls, dir_patterns=dirs, exclude_patterns=exclude)
        elif resume:
            try:
                if os.path.exists(resume):
                    dest = os.path.dirname(resume)
                    downloaded_size, _ = tree_size_and_count(os.path.abspath(dest), True)
                    download_size -= downloaded_size
                    with open(resume, "r", encoding="utf-8") as f:
                        download_files = json.loads(f.read())
                else:
                    raise NgcException(f"File {resume} doesn't exist.") from None
            except (OSError, FileNotFoundError, ValueError, json.decoder.JSONDecodeError):
                raise NgcException(f"Unable to read file {resume}") from None

        if dry_run:
            self.printer.print_ok("Total download size: {}".format(human_size(download_size)))
            return

        if download_size > disk_info.free:
            raise NgcException("Not enough space on local disk to download the resultset.")

        if download_files:
            async_downloader.download_files(dest, download_url, download_files)
        else:
            async_downloader.download_zip(dest, download_url, do_zip)

    @extra_args
    def remove(
        self,
        job_ids: List[Union[str, int]] = None,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        status: Optional[List[str]] = None,
        default_yes: Optional[bool] = None,
        dry_run: Optional[bool] = None,
        job_name: Optional[str] = None,
    ):
        """Remove resultset details for given job ID."""
        self.config.validate_configuration()
        org_name = org or self.config.org_name
        team = team or self.config.team_name
        ace = ace or self.config.ace_name

        user_id = self.client.users.user_who().user.id

        # TODO - args.jobs is now a generator.  For now we're consuming to a list.
        # We should refactor this in a way that args.jobids is only processed once.
        jobids = list(job_ids)

        if [x for x in jobids if contains_glob(x)] or job_name or status:
            job_iterator = self.client.basecommand.jobs.get_jobs(org_name=org_name, user_id=user_id, status=status)

            jobs = [job for job in job_iterator if self._match_job_patterns(job.id, jobids)]

            if job_name:
                jobs = [job for job in jobs if fnmatch(job.jobDefinition.name, job_name)]

            jobids = [job.id for job in jobs]

            if not jobids:
                self.printer.print_ok("No jobs found belonging to you.")

        for job_id in jobids:
            self._remove_result(job_id, dry_run, default_yes)
