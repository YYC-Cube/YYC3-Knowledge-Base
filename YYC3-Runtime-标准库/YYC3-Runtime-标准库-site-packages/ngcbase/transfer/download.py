#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from __future__ import division

import concurrent.futures as cf
import ctypes
import datetime
import errno
import logging
from multiprocessing import Manager, Pool
import os
import shutil
import signal
import sys
import time

from boto3.exceptions import S3TransferFailedError
from botocore.exceptions import ClientError

from ngcbase.constants import (
    CLEAR_LINE_CHAR,
    EXIT_CODES,
    MAX_REQUEST_THREADS,
    SWIFTSTACK_STORAGE_CLUSTER,
)
from ngcbase.errors import NgcException
from ngcbase.printer.transfer import TransferPrinter
from ngcbase.transfer.adapter import HTTPDownloadAdapter
from ngcbase.transfer.manager import TransferManager
from ngcbase.transfer.task import (
    DownloadAndUnzipTask,
    DownloadAndWriteFileTask,
    RenameTask,
    UnzipFileSubmission,
)
from ngcbase.transfer.utils import (
    create_ctrl_c_handler,
    CreateWindowsCtrlCHandler,
    DatasetCredentials,
    get_S3_access_key,
    get_S3_access_key_id,
    get_s3_client,
)
from ngcbase.util.datetime_utils import human_time
from ngcbase.util.file_utils import (
    filter_path,
    get_incremented_filename,
    human_size,
    mkdir_path,
)

DOWNLOAD_STATUS_UPDATE_INTERVAL = 1
logger = logging.getLogger(__name__)


class S3DownloadProgressTracker:  # noqa: D101
    # TODO: check if the interruption of the download affects the final status output for the number of downloaded files
    def __init__(self, locket, bytes_downloaded, download_start_time, files_downloaded):
        self.locket = locket
        self.bytes_downloaded = bytes_downloaded
        self.download_start_time = download_start_time
        self.files_downloaded = files_downloaded

    def __call__(self, chunk_size):  # noqa: D102
        with self.locket:
            # Bytes downloaded since the start of the download process across all download processes.
            self.bytes_downloaded.value += chunk_size
            current_time = datetime.datetime.now()
            # Time passed since the beginning of the download process, in seconds.
            duration = (current_time - self.download_start_time).total_seconds()
            # Bytes sent since the beginning of the download process / time (seconds) since the process began.
            average_throughput = self.bytes_downloaded.value / duration

            status_string = (
                f"{CLEAR_LINE_CHAR}Downloaded "
                f"{human_size(self.bytes_downloaded.value, force_decimal=True)} "
                f"in {human_time(duration)}, Download speed: "
                f"{human_size(average_throughput, force_decimal=True)}/s"
            )
            sys.stdout.write(status_string)

    def increment_downloaded_files(self):  # noqa: D102
        with self.locket:
            self.files_downloaded.value += 1


def filter_S3_files(  # noqa: D103
    storage_type,
    storage_id,
    credentials=None,
    page_size=100,
    include_patterns=None,
    exclude_patterns=None,
):
    # TODO: volume-based accounts will have empty files representing directories, which are indistinguishable
    # from truly empty files. Storage needs to make the directory files identifiable, maybe through metadata.
    # Once that is implemented on the storage side, add a check in the filtering logic to screen them out.
    # This affects only results since datasets are object-only.
    # storage_type - 'datasets' or 'results'
    # storage_id - ID of the dataset or the result

    upload_options = {
        "access_key": get_S3_access_key_id(),
        "secret_key": get_S3_access_key(),
        "token": None,
        "endpoint_url": SWIFTSTACK_STORAGE_CLUSTER,
        "region": "us-east-1",
        "base_path": None,
        "bucket": storage_type,
        "prefix": storage_id,
    }
    upload_overrides = {}
    if credentials:
        upload_overrides = credentials.get_credentials()
    upload_options |= upload_overrides

    s3_client = get_s3_client(
        aws_access_key_id=upload_options["access_key"],
        aws_secret_access_key=upload_options["secret_key"],
        aws_session_token=upload_options["token"],
        endpoint_url=upload_options["endpoint_url"],
        region_name=upload_options["region"],
    )
    paginator = s3_client.get_paginator("list_objects")
    page_iterator = paginator.paginate(
        Bucket=upload_options["bucket"], Prefix=upload_options["prefix"], PaginationConfig={"PageSize": page_size}
    )
    # NOTE: there is no separation between files and dirs in the include_patterns list
    for page in page_iterator:
        for obj in page["Contents"]:
            # Remove the dataset ID from the beginning of the path
            file_path = obj["Key"].lstrip(storage_id)
            # Filter files
            if filter_path(file_path, include_patterns, exclude_patterns):
                yield file_path


def download_S3_file(  # noqa: D103
    storage_type, storage_id, file_path, destination, progress_tracker, credentials=None
):
    # storage_type - 'datasets' or 'results'
    # storage_id - ID of the dataset or the result
    upload_options = {
        "access_key": get_S3_access_key_id(),
        "secret_key": get_S3_access_key(),
        "token": None,
        "endpoint_url": SWIFTSTACK_STORAGE_CLUSTER,
        "region": "us-east-1",
        "base_path": None,
        "bucket": storage_type,
        "prefix": storage_id,
        "key": f"{storage_id}/{file_path.lstrip('/')}",
    }
    upload_overrides = {}
    if credentials:
        upload_overrides = credentials.get_credentials()
    upload_options |= upload_overrides

    s3_client = get_s3_client(
        aws_access_key_id=upload_options["access_key"],
        aws_secret_access_key=upload_options["secret_key"],
        aws_session_token=upload_options["token"],
        endpoint_url=upload_options["endpoint_url"],
        region_name=upload_options["region"],
    )
    try:
        local_directory = os.path.dirname(destination)
        os.makedirs(local_directory, exist_ok=True)
        s3_client.download_file(
            Bucket=upload_options["bucket"],
            Key=upload_options["key"],
            Filename=destination,
            Callback=progress_tracker,
        )
        progress_tracker.increment_downloaded_files()
    except S3TransferFailedError as ufe:
        raise NgcException(str(ufe)) from None
    except ClientError:
        raise NgcException(f"'{file_path}' not found in {storage_type.rstrip('s')} {storage_id}") from None


def download_S3_dataset_or_result(  # noqa: D103
    storage_type,
    storage_id,
    dry_run=False,
    include_patterns=None,
    exclude_patterns=None,
    threads=MAX_REQUEST_THREADS,
    destination=".",
    org_name=None,
    credential_provider=None,
    dataset_files=None,
    do_zip=False,
    is_dataset_service_enabled=False,
    config=None,
):
    # Manager is used as an IPC mechanism to update shared memory between individual file upload processes
    with Manager() as manager:
        printer = TransferPrinter(config)
        # Create the destination directory
        destination_dir = get_incremented_filename(os.path.join(destination, storage_id))
        try:
            os.mkdir(destination_dir)
        except OSError:
            raise NgcException(f"Unable to make directory: '{destination_dir}'") from None
        # Children processes should ignore the interrupt signal so that the main thread can stop any new downloads
        # from executing after the signal has been caught.
        signal.signal(signal.SIGINT, signal.SIG_IGN)

        # dpp - Download Process Pool
        dpp = Pool(threads)  # pylint: disable=consider-using-with

        handle_ctrl_c = create_ctrl_c_handler(dpp)

        def ctrl_c_wrapper(*_):
            handle_ctrl_c()
            printer.print_download_final_status(
                storage_id,
                "Failed",
                destination_dir,
                progress_tracker.files_downloaded.value,
                progress_tracker.bytes_downloaded.value,
                download_start_time,
                datetime.datetime.now(),
            )
            # Unlike uploads, downloads print the final status in the end.
            # An exit has to be called to avoid printing the second time.
            sys.exit(EXIT_CODES["TERMINATION_CTRL_C"])

        download_start_time = datetime.datetime.now()
        # TODO: get the total size of the files prior to performing the download (difficult to do ahead of time with S3)
        # NOTE: no-member was disabled due to a bug in pylint:
        #       https://github.com/PyCQA/pylint/issues/3313
        progress_tracker = S3DownloadProgressTracker(
            locket=manager.Lock(),  # pylint: disable=no-member
            bytes_downloaded=manager.Value(ctypes.c_uint64, 0),
            download_start_time=download_start_time,
            files_downloaded=manager.Value(ctypes.c_uint64, 0),
        )

        if sys.platform in ("linux", "darwin"):
            # The main thread should handle the interrupt now since the child processes have been created
            # This needs to be a different function from the one on Windows because the handler arguments are different
            # between platforms.
            signal.signal(signal.SIGINT, ctrl_c_wrapper)
        else:
            # Just need it to be in scope, the handling will not work otherwise.
            _ = CreateWindowsCtrlCHandler(ctrl_c_wrapper).get_handler()

        if dry_run:
            total_size = 0
            printer.print_ok("Files to be downloaded:")

        download_path = storage_id
        credentials = None
        if is_dataset_service_enabled:
            # We can't use the AccessType enum defined in basecommand since basecommand depends on this package.
            credentials = DatasetCredentials(credential_provider, storage_id, org_name, 0)
            upload_overrides = credentials.get_credentials()
            download_path = upload_overrides["prefix"]

        dataset_file_generator = (
            dataset_files
            if dataset_files
            else filter_S3_files(
                storage_type,
                storage_id,
                credentials=credentials,
                include_patterns=include_patterns,
                exclude_patterns=exclude_patterns,
            )
        )

        for dataset_file in dataset_file_generator:
            file_path = dataset_file.path if is_dataset_service_enabled else dataset_file
            if dry_run:
                printer.print_ok(file_path)
                total_size += dataset_file.fileSize if is_dataset_service_enabled else 0
            else:
                dpp.apply_async(
                    download_S3_file,
                    [
                        storage_type,
                        download_path,
                        file_path,
                        os.path.join(destination_dir, file_path.lstrip("/")),
                        progress_tracker,
                        credentials,
                    ],
                )

        if not dry_run:
            # Tell the process pool that no new processes will be started.
            dpp.close()
            # Wait for the processes to finish.
            dpp.join()
            # Final update to the status line
            progress_tracker(0)
            # zip the results if requested
            if is_dataset_service_enabled and do_zip:
                base_dir = os.path.basename(os.path.normpath(destination_dir))
                shutil.make_archive(base_name=destination_dir, base_dir=base_dir, root_dir=destination, format="zip")
                shutil.rmtree(destination_dir)
                destination_dir += ".zip"
            # Total download status
            printer.print_download_final_status(
                storage_id,
                "Completed",
                destination_dir,
                progress_tracker.files_downloaded.value,
                progress_tracker.bytes_downloaded.value,
                download_start_time,
                datetime.datetime.now(),
            )
        else:
            if is_dataset_service_enabled:
                printer.print_ok(f"Total size of the download: {human_size(total_size)}")


class DownloadTransferManager(TransferManager):  # noqa: D101
    def get_transfer_dir(self):  # noqa: D102
        return get_incremented_filename(os.path.join(self._transfer_path or os.getcwd(), str(self._transfer_id)))

    @staticmethod
    def open_file_for_write(file_name):  # noqa: D102
        try:
            fileobj = open(file_name, "wb")  # pylint: disable=consider-using-with
        except IOError as err:
            if err.errno == errno.EACCES:
                raise IOError("Error: Unable to write file {} to disk.".format(file_name)) from None

            raise err

        return fileobj

    def dump_transfer_summary(self):  # noqa: D102
        self.printer.print_download_transfer_summary(self)

    def get_progress_callback(self):  # noqa: D102
        def progress_callback(transfer_coordinator):
            shared_meta = transfer_coordinator.shared_meta
            while not shared_meta.done.is_set():
                time.sleep(DOWNLOAD_STATUS_UPDATE_INTERVAL)
                download_speed = shared_meta.transferred_size / (shared_meta.passed_time or 1)
                status_string = "\rDownloaded {} in {}, Download speed: {}/s               ".format(
                    human_size(shared_meta.transferred_size),
                    human_time(shared_meta.passed_time),
                    human_size(download_speed),
                )
                self.printer.print_ok(status_string, end="")

        return progress_callback

    def _transfer(self, **_kwargs):
        raise NotImplementedError("This class is still a base class, not used directly")


class ZipDownloadTransferManager(DownloadTransferManager):  # noqa: D101
    def _check_multipart_done(self):
        logger.debug("Checking if multipart DL is done: %s", self._shared_meta)
        if self._shared_meta.multipart_done():
            logger.debug("Multipart download done - announcing done")
            self.transfer_coordinator.announce_done()

    # TODO: Collapse this helper and the one in MultiDownloadTransferManager
    def _make_unzip_dest(self):
        logger.debug("Making unzip destination")
        if not self.transfer_coordinator.done():
            mkdir_path(self._transfer_path)

    # pylint: disable=arguments-differ
    def _transfer(
        self,
        file_name,
        unzip=True,
        allow_redirects=False,
        suffix_url=None,
        unzip_dest=None,
        params=None,
    ):
        logger.debug("Starting zip download _transfer method")

        total_files = self.transfer_coordinator.shared_meta.total_files
        total_size = self.transfer_coordinator.shared_meta.total_size

        part_size = int(
            self.transfer_config.multipart_size_threshold
            // min(total_files, self.transfer_config.multipart_num_files_threshold)
        )
        # TODO: can we multipart the transfer? Look back at file history for previous effort.
        logger.debug("total size (%s) and part size (%s)", total_size, part_size)
        self._download_single_part(
            file_name,
            unzip=unzip,
            allow_redirects=allow_redirects,
            suffix_url=suffix_url,
            unzip_dest=unzip_dest,
            params=params,
        )

    def _download_single_part(
        self,
        file_name,
        unzip=True,
        allow_redirects=False,
        suffix_url=None,
        unzip_dest=None,
        params=None,
    ):
        logger.debug("Starting single-part zip download")
        unzip_dest = unzip_dest.strip("/") if unzip_dest else ""
        unzip_dest = os.path.join(self._transfer_path, unzip_dest)

        http_adapter = HTTPDownloadAdapter(
            self.transfer_config.url,
            self._client,
            org=self.transfer_config.org,
            team=self.transfer_config.team,
        )

        # TODO: Think about context manager for file that stores in tmp dir, only writing
        # to destination when it's complete & successful
        fileobj = self.open_file_for_write(file_name)

        logger.debug("Running single-part download task in main thread, writing concurrently")
        # TODO: Use DownloadAndUnzipTask if possible - may be tricky. This path uses a tmpdir and
        # then unzips + moves into place. MultiFileDownloadManager doesn't use tmp files.
        DownloadAndWriteFileTask(
            transfer_coordinator=self.transfer_coordinator,
            kwargs={
                "adapter": http_adapter,
                "fileobj": fileobj,
                "download_manager": self,
                "allow_redirects": allow_redirects,
                "suffix_url": suffix_url,
                "chunk_size": self.transfer_config.io_chunksize,
                "params": params,
            },
        )()

        self._make_unzip_dest()
        if unzip:
            UnzipFileSubmission(
                transfer_coordinator=self.transfer_coordinator,
                kwargs={"fileobj": fileobj, "dest": unzip_dest},
            )()
        else:
            RenameTask(
                transfer_coordinator=self.transfer_coordinator,
                kwargs={
                    "old": fileobj.name,
                    "new": os.path.join(self._transfer_path, os.path.basename(fileobj.name)),
                },
            )()
        self._check_multipart_done()


class MultiFileDownloadManager(ZipDownloadTransferManager):  # noqa: D101
    # TODO: Combine this helper and the one in ZipDownloadTransferManager
    def _mkdir_path(self, file_name):
        file_path = os.path.normpath(os.path.join(self._transfer_path, os.path.normpath(file_name.strip("/"))))
        mkdir_path(os.path.dirname(file_path))
        return file_path

    # pylint: disable=arguments-differ
    # method adds args to base method
    def _transfer(self, files, dirs=None, allow_redirects=False, **_kwargs):
        logger.debug("Starting _transfer method of MultiFileDownloader")
        task_list = []
        http_adapter = HTTPDownloadAdapter(
            self.transfer_config.url,
            self._client,
            org=self.transfer_config.org,
            team=self.transfer_config.team,
        )
        if len(files) == 1:
            # Specifying a single file should not keep directory structure.
            # This will download the file directly to download_dir; not within the directory/directories specified in
            # the NGC artifact.
            file_name = next(iter(files))
            file_basename = os.path.basename(file_name)
            file_path = self._mkdir_path(file_basename)
            future = self._request_and_write_file(
                file_name,
                file_path,
                http_adapter,
                params=_kwargs["params"],
                allow_redirects=allow_redirects,
            )
            task_list.append(future)
        else:
            for file_name in files:
                file_path = self._mkdir_path(file_name)
                future = self._request_and_write_file(
                    file_name,
                    file_path,
                    http_adapter,
                    params=_kwargs["params"],
                    allow_redirects=allow_redirects,
                )
                task_list.append(future)

        # TODO: Why index? For conflicts?
        for _index, dir_name in enumerate(dirs or []):
            dir_path = self._mkdir_path(dir_name)
            future = self._request_and_write_dir(
                dir_path,
                dir_name,
                http_adapter,
                params=_kwargs["params"],
                allow_redirects=allow_redirects,
            )
            task_list.append(future)

        # Wait for the transfer to finish. This is a potential memory leak, but this code path is only
        # hit when the user specifies --file or --dir. These are options that will probably only
        # be used a few at a time. number of --file or --dir options will be the size of this list
        # in memory.
        for future in cf.as_completed(task_list):
            downloaded_file = future.result()
            logger.debug("Finished downloading %s", downloaded_file)

        self._check_multipart_done()

    def _request_and_write_file(self, file_name, file_path, adapter, params=None, allow_redirects=False):
        # NOTE: Remove the leading '/' in file_name to avoid creating a non-normalized URL
        file_name = file_name.lstrip("/")
        logger.debug("Downloading file: %s", file_name)
        # TODO: Consider moving management of file objects to a task
        fileobj = self.open_file_for_write(file_path)
        future = self.transfer_coordinator.submit_task(
            self._request_executor,
            DownloadAndWriteFileTask(
                transfer_coordinator=self.transfer_coordinator,
                kwargs={
                    "adapter": adapter,
                    "fileobj": fileobj,
                    "download_manager": self,
                    "allow_redirects": allow_redirects,
                    "suffix_url": file_name,
                    "chunk_size": self.transfer_config.io_chunksize,
                    "params": params,
                },
            ),
        )
        return future

    def _request_and_write_dir(self, dir_path, dir_name, adapter, params=None, allow_redirects=False):
        logger.debug("Downloading directory %s", dir_name)
        zip_path = self._mkdir_path(dir_name + ".zip")
        fileobj = self.open_file_for_write(zip_path)
        future = self.transfer_coordinator.submit_task(
            self._request_executor,
            DownloadAndUnzipTask(
                transfer_coordinator=self.transfer_coordinator,
                kwargs={
                    "adapter": adapter,
                    "fileobj": fileobj,
                    "download_manager": self,
                    "allow_redirects": allow_redirects,
                    "suffix_url": dir_name.lstrip("/"),
                    "chunk_size": self.transfer_config.io_chunksize,
                    "unzip_path": dir_path,
                    "params": params,
                },
            ),
        )
        return future

    # Used for workspace downloads with only nonexistent user-specified directories - same exit message as other paths
    def check_empty_transfer(self):  # noqa: D102
        if self._shared_meta.transferred_files == 0:
            try:
                os.rmdir(self._transfer_path)
            except OSError:  # this is the case where the directory does not exist
                pass
            self.shutdown(exit_on_shutdown=False, dump_transfer_summary=False)
            raise NgcException("No files to download, exiting.")
