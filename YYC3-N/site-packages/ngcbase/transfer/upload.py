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
from dataclasses import dataclass
import datetime
import hashlib
import logging
from multiprocessing import Manager, Pool
import os
import signal
import sys
import threading
import time

from boto3.exceptions import S3UploadFailedError
from boto3.s3.transfer import TransferConfig
from botocore.exceptions import ClientError
from dateutil import parser as date_parser

try:
    # pylint: disable=import-error
    import grpc

    from ngcbase.transfer.grpc.proto_py import upload_pb2_grpc
except ModuleNotFoundError:
    grpc = None
    upload_pb2_grpc = None

from ngcbase.constants import (
    CLEAR_LINE_CHAR,
    DEFAULT_UPLOAD_THREADS,
    S3_MULTIPART_UPLOAD_CHUNKSIZE,
    S3_MULTIPART_UPLOAD_THRESHOLD,
    SWIFTSTACK_STORAGE_CLUSTER,
)
from ngcbase.errors import NgcException
from ngcbase.printer.nvPrettyPrint import format_date
from ngcbase.printer.transfer import TransferPrinter
from ngcbase.transfer.adapter import GRPCUploadAdapter, HTTPUploadAdapter
from ngcbase.transfer.file_cache import FileCache
from ngcbase.transfer.manager import TransferManager
from ngcbase.transfer.task import FilesToQueueTask, UploadFileTask, yield_from_q
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
    filter_directory_contents,
    human_size,
    tree_size_and_count,
)

UPLOAD_STATUS_UPDATE_INTERVAL = 1
logger = logging.getLogger(__name__)


@dataclass
class CommitEntry:  # noqa: D101
    size_bytes: int = None
    last_modified_at_ms: int = None  # epoch milliseconds
    key: str = None
    hash_value: str = None
    hash_type: str = None
    path: str = None


class S3UploadProgressTracker:  # noqa: D101
    def __init__(
        self,
        locket,
        total_files,
        bytes_uploaded,
        files_uploaded,
        upload_start_time,
        time_of_last_update,
        bytes_since_last_update,
        current_throughput,
        current_throughput_update_interval,
    ):
        self.locket = locket
        self.bytes_uploaded = bytes_uploaded
        self.files_uploaded = files_uploaded
        self.time_of_last_update = time_of_last_update
        self.bytes_since_last_update = bytes_since_last_update
        self.current_throughput = current_throughput
        self.upload_start_time = upload_start_time
        self.total_files = total_files
        self.current_throughput_update_interval = current_throughput_update_interval

    def __call__(self, chunk_size):  # noqa: D102
        with self.locket:
            # Bytes uploaded since the start of the upload process across all upload processes.
            self.bytes_uploaded.value += chunk_size
            # Used for tracking how many bytes were sent during the current throughput update interval across all
            # upload processes.
            self.bytes_since_last_update.value += chunk_size
            current_time = datetime.datetime.now()
            # Time passed since the beginning of the upload process, in seconds.
            duration = (current_time - self.upload_start_time).total_seconds()
            # Bytes sent since the beginning of the upload process / time (seconds) since the process began.
            average_throughput = self.bytes_uploaded.value / duration
            # Time elapsed since the current throughput value was updated and displayed in the status.
            time_since_last_update = (current_time - date_parser.parse(self.time_of_last_update.value)).total_seconds()
            # NOTE: The interval is for the current throughput measurement only. All other metrics get updated
            # whenever a chunck is sent to SwiftStack. Doing so provides a smoother-updating status line.
            if time_since_last_update >= self.current_throughput_update_interval:
                # Calculate the throughput based on the update interval and reset the values for the next interval.
                self.current_throughput.value = self.bytes_since_last_update.value / time_since_last_update
                self.time_of_last_update.value = str(current_time)
                self.bytes_since_last_update.value = 0

            status_string = (
                f"{CLEAR_LINE_CHAR}Uploaded"
                f" {human_size(self.bytes_uploaded.value, force_decimal=True)},"
                f" {self.files_uploaded.value}/{self.total_files} in"
                f" {duration:.0f} seconds, Average Upload Speed:"
                f" {human_size(average_throughput, force_decimal=True)}/s, Current"
                " Upload Speed:"
                f" {human_size(self.current_throughput.value, force_decimal=True)}/s"
            )
            sys.stdout.write(status_string)

    def increment_uploaded_files(self):  # noqa: D102
        with self.locket:
            self.files_uploaded.value += 1


def upload_S3_dataset(  # noqa: D103
    dataset_id,
    source_path,
    org_name=None,
    exclude_patterns=None,
    threads=DEFAULT_UPLOAD_THREADS,
    dry_run=False,
    credential_provider=None,
    is_dataset_service_enabled=None,
    resume_upload=None,
    append_dataset=None,
    config=None,
):
    printer = TransferPrinter(config)
    file_list = None
    # Manager is used as an IPC mechanism to update shared memory between individual file upload processes
    with Manager() as manager:
        # Children processes should ignore the interrupt signal so that the main thread can stop any new uploads
        # from executing after the signal has been caught.
        signal.signal(signal.SIGINT, signal.SIG_IGN)

        upp = Pool(threads)  # pylint: disable=consider-using-with

        handle_ctrl_c = create_ctrl_c_handler(upp)

        if sys.platform in ("linux", "darwin"):
            # The main thread should handle the interrupt now since the child processes have been created
            # This needs to be a different function from the one on Windows because the handler arguments are different
            # between platforms.
            signal.signal(signal.SIGINT, handle_ctrl_c)
        else:
            # Just need it to be in scope, the handling will not work otherwise.
            _ = CreateWindowsCtrlCHandler(handle_ctrl_c).get_handler()

        # TODO: Make sure that the filtering mechanism in tree_size_and_count is same as in filter_directory_contents.
        #       Combine the filtering logic if possible.
        _, file_count = tree_size_and_count(source_path, omit_links=False, exclude_patterns=exclude_patterns)

        upload_start_time = datetime.datetime.now()
        # NOTE: no-member was disabled due to a bug in pylint:
        #       https://github.com/PyCQA/pylint/issues/3313
        progress_tracker = S3UploadProgressTracker(
            locket=manager.Lock(),  # pylint: disable=no-member
            total_files=file_count,
            upload_start_time=upload_start_time,
            bytes_uploaded=manager.Value(ctypes.c_uint64, 0),
            files_uploaded=manager.Value(ctypes.c_uint64, 0),
            time_of_last_update=manager.Value(ctypes.c_char_p, str(upload_start_time)),
            bytes_since_last_update=manager.Value(ctypes.c_uint64, 0),
            current_throughput=manager.Value(ctypes.c_uint64, 0),
            current_throughput_update_interval=UPLOAD_STATUS_UPDATE_INTERVAL,
        )

        # Upload files relative to the source path
        async_results = []
        if dry_run:
            printer.print_ok("Files to be uploaded:")

        # We can't use the AccessType enum defined in basecommand since basecommand depends on this package.
        credentials = DatasetCredentials(credential_provider, dataset_id, org_name, 1)
        credentials.get_credentials()
        for file_ in filter_directory_contents(source_path, exclude_patterns=exclude_patterns):
            if dry_run:
                printer.print_ok(file_)
            else:
                async_results.append(
                    upp.apply_async(
                        upload_file_to_S3_dataset,
                        [dataset_id, os.path.join(source_path, file_), file_, progress_tracker, credentials],
                    )
                )

        if not dry_run:
            # Tell the process pool that no new processes will be started.
            upp.close()
            # Wait for the processes to finish.
            upp.join()
            # get the results

            if is_dataset_service_enabled and async_results:
                file_list = [result.get() for result in async_results]
                # print summary of the upload
                printer.print_async_upload_transfer_summary(
                    transfer_type="dataset",
                    transfer_id=dataset_id,
                    status="Complete",
                    transfer_path=source_path,
                    elapsed=(datetime.datetime.now() - upload_start_time).total_seconds(),
                    upload_count=progress_tracker.files_uploaded.value,
                    upload_size=progress_tracker.bytes_uploaded.value,
                    started_at=upload_start_time,
                    ended_at=datetime.datetime.now(),
                )

    return file_list


def upload_file_to_S3_dataset(  # noqa: D103
    dataset_id,
    file_path,
    target_file_path,
    progress_tracker,
    credentials=None,
    multipart_threshold=S3_MULTIPART_UPLOAD_THRESHOLD,
    multipart_chunksize=S3_MULTIPART_UPLOAD_CHUNKSIZE,
):
    file_commit_entry = None
    dataset_service_enabled = False
    # TODO: check that the dataset_id folder already exists

    transferConfig = TransferConfig(
        multipart_threshold=multipart_threshold,
        multipart_chunksize=multipart_chunksize,
    )

    upload_overrides = {}
    if credentials:
        upload_overrides = credentials.get_credentials()
        if "dataset_service_enabled" in upload_overrides:
            dataset_service_enabled = upload_overrides["dataset_service_enabled"]

    upload_options = {
        "access_key": get_S3_access_key_id(),
        "secret_key": get_S3_access_key(),
        "token": None,
        "endpoint_url": SWIFTSTACK_STORAGE_CLUSTER,
        "region": "us-east-1",
        "base_path": None,
        "bucket": "datasets",
        "prefix": dataset_id,
    }
    upload_options |= upload_overrides

    key = upload_options["prefix"] + "/" + target_file_path

    if dataset_service_enabled:
        file_size, file_mod_time_ms, file_hash = _calculate_file_metadata(file_path)
        file_commit_entry = CommitEntry(
            key=target_file_path,
            path=upload_options["base_path"],
            size_bytes=file_size,
            last_modified_at_ms=file_mod_time_ms,
            hash_value=file_hash,
            hash_type="SHA256",
        )

    s3_client = get_s3_client(
        aws_access_key_id=upload_options["access_key"],
        aws_secret_access_key=upload_options["secret_key"],
        aws_session_token=upload_options["token"],
        endpoint_url=upload_options["endpoint_url"],
        region_name=upload_options["region"],
    )
    try:
        if not dataset_service_enabled:
            # TODO: remove the head_object call once the call for dataset metadata is implemented in CAS
            s3_client.head_object(Bucket=upload_options["bucket"], Key=dataset_id)
        s3_client.upload_file(
            Filename=file_path,
            Bucket=upload_options["bucket"],
            Key=key,
            Config=transferConfig,
            Callback=progress_tracker,
        )

        # Mark the file as uploaded if no errors are encountered
        progress_tracker.increment_uploaded_files()
    except FileNotFoundError:
        raise NgcException("Could not find the input file: '{}'".format(file_path)) from None
    except S3UploadFailedError as ufe:
        # Network or S3 protocol error
        raise NgcException(ufe) from None
    except ClientError as ce:
        # Dataset does not exist
        raise NgcException(ce) from None

    return file_commit_entry


class UploadTransferManager(TransferManager):  # noqa: D101
    def __init__(
        self,
        transfer_id,
        ace_name=None,
        transfer_config=None,
        transfer_size=0,
        file_count=0,
        already_uploaded_size=0,
        already_uploaded_count=0,
        transfer_path=None,
        owner_id=None,
        owner_org=None,
        dataset_service_enabled=False,
        display_id=None,
        client=None,
    ):
        super().__init__(
            transfer_id,
            transfer_config=transfer_config,
            transfer_size=transfer_size,
            file_count=file_count,
            already_uploaded_size=already_uploaded_size,
            already_uploaded_count=already_uploaded_count,
            transfer_path=transfer_path,
            dataset_service_enabled=dataset_service_enabled,
            display_id=display_id,
            client=client,
        )
        self.owner_id = owner_id
        self.owner_org = owner_org
        if self.transfer_config.transfer_type == "dataset":
            logger.debug("Creating and loading file cache for dataset upload")
            self.upload_cache = FileCache(
                ace_name,
                self._transfer_id,
                transfer_path,
                resume=self.transfer_config.resume_upload,
            )
        else:
            self.upload_cache = None

    def get_transfer_dir(self):  # noqa: D102
        return self._transfer_path or os.getcwd()

    def dump_transfer_summary(self):  # noqa: D102
        shared_meta = self.transfer_coordinator.shared_meta
        end_time = format_date(datetime.datetime.now())
        start_time = format_date(shared_meta.started_at)
        transfer_type = self.transfer_config.transfer_type

        if self._client.config.format_type == "json":
            # FIXME: use transfer_type here as the key
            summary = {
                "transfer_id": self._transfer_id,
                "status": self.transfer_coordinator.status,
                "local_path": os.path.realpath(self._transfer_path),
                "files_uploaded": shared_meta.transferred_files,
                "size_uploaded": human_size(shared_meta.transferred_size),
                "upload_start": start_time,
                "upload_end": end_time,
                "upload_time": human_time(shared_meta.passed_time),
            }
            if self.dataset_service_enabled:
                summary[f"{transfer_type.title().lower()}_id"] = self.display_id
            self.printer.print_json(summary)
        else:
            self.printer.print_upload_transfer_summary(self, shared_meta, transfer_type, start_time, end_time)

    def get_progress_callback(self):  # noqa: D102
        def progress_callback(transfer_coordinator):
            shared_meta = transfer_coordinator.shared_meta
            previous_transferred_size = shared_meta.transferred_size
            while not shared_meta.done.is_set():
                time.sleep(UPLOAD_STATUS_UPDATE_INTERVAL)
                if shared_meta.done.is_set():
                    break
                # TODO: add a check for whether the transfer is done here so we don't print an
                # extra status line at the end.
                avg_upload_speed = shared_meta.transferred_size / (shared_meta.passed_time or 1)
                curr_upload_speed = float(shared_meta.transferred_size - previous_transferred_size)
                # FIXME: Format the uploaded fields and round them so we don't have to print whitespace
                # at the end and hope we overwrite what we wrote before
                status_string = (
                    "\rUploaded {}, {}/{} files in {}, Avg Upload speed: {}/s, Curr Upload Speed: {}/s                 "
                ).format(
                    human_size(shared_meta.transferred_size),
                    shared_meta.transferred_files,
                    shared_meta.total_files,
                    human_time(shared_meta.passed_time),
                    human_size(avg_upload_speed),
                    human_size(curr_upload_speed),
                )
                previous_transferred_size = shared_meta.transferred_size
                if self._client.config.format_type != "json":
                    self.printer.print_ok(status_string, end="")
                    sys.stdout.flush()

        return progress_callback

    # pylint: disable=arguments-differ
    # method adds args to base method
    def _transfer(self, omit_links, exclude_patterns=None):
        """Starts the thread to find files and yield names to the queue."""  # noqa: D401
        if self.transfer_config.resume_upload:
            logger.debug("resuming upload")
        # Spawn producer thread
        file_finder_task = FilesToQueueTask(
            transfer_coordinator=self.transfer_coordinator,
            kwargs={
                "transfer_path": self._transfer_path,
                "omit_links": omit_links,
                "resume_upload": self.transfer_config.resume_upload,
                "upload_cache": self.upload_cache,
                "exclude_patterns": exclude_patterns,
                "threads": self.transfer_config.max_request_concurrency,
            },
            printer=self.printer,
        )

        file_finder_thread = threading.Thread(target=file_finder_task, daemon=True)
        file_finder_thread.start()

        self._start_upload()

    def _start_upload(self):
        futures = []
        threads = self.transfer_config.max_request_concurrency
        source_q = self.transfer_coordinator.shared_meta.task_q

        with self._request_executor as executor:
            for _ in range(threads):
                future = executor.submit(self._upload_files)
                futures.append(future)

            # Wait for uploads to finish
            for _ in cf.as_completed(futures):
                logger.debug("Upload thread complete.")

        self._verify_multi_transfer_done(source_q)

    def _upload_files(self):
        """Main unit of work a thread performs."""  # noqa: D401
        source_q = self.transfer_coordinator.shared_meta.task_q
        task_gen = yield_from_q(source_q)

        if self.transfer_config.transfer_type in ("dataset", "workspace"):
            creds = grpc.ssl_channel_credentials()
            # TODO: Future versions of grpcio require a channel to use `close()` after completion or be used
            # inside a `with` block.
            #
            # Channels are technically thread-safe, but it's noticeably faster to use a channel per upload thread
            channel = grpc.secure_channel(self.transfer_config.url, creds)
            client = upload_pb2_grpc.DataSetServiceStub(channel)
            logger.debug(
                "Created client with ID %d on thread %d",
                id(client),
                threading.get_ident(),
            )

            adapter = GRPCUploadAdapter(
                url=self.transfer_config.url,
                client=self._client,
                destination=self.transfer_config.destination,
                append_dataset=self.transfer_config.append_dataset,
                resume_dataset=self.transfer_config.resume_upload,
                transfer_type=self.transfer_config.transfer_type,
                owner_id=self.owner_id,
                owner_org=self.owner_org,
            )
        else:
            client = None
            adapter = HTTPUploadAdapter(
                self.transfer_config.url,
                client=self._client,
                org=self.transfer_config.org,
                team=self.transfer_config.team,
                transfer_type=self.transfer_config.transfer_type,
            )

        for f in task_gen:
            # FIXME: If an error occurs at this point in the function (inside a thread), the error
            # will be ignored. Re-think where/how we're handling all of our error catching and signaling within
            # the threads. Currently inside tasks.py::Task.__call__.
            uploaded_file = UploadFileTask(
                transfer_coordinator=self.transfer_coordinator,
                kwargs={"adapter": adapter, "client": client, "filemeta": f},
            )()

            # Check coordinator status here -- otherwise, even *after* SIGINT is caught and handled by
            # the main thread, the worker thread(s) will add the interrupted file to the cache as if
            # it were completed. This causes the file to be skipped on retry attempts.
            if self.transfer_coordinator.done():
                logger.debug("transfer_coordinator.done signal is set. Returning from thread.")
                return

            source_q.task_done()
            logger.debug("file upload complete. remaining files: %d", source_q.unfinished_tasks)
            self.transfer_coordinator.shared_meta.inc_processed_files()
            if self.transfer_config.transfer_type == "dataset":
                logger.debug("Putting file %s in upload cache", uploaded_file.abspath)
                self.upload_cache.put(uploaded_file.abspath)

    def _verify_multi_transfer_done(self, source_q):
        shared_meta = self.transfer_coordinator.shared_meta
        if self.transfer_coordinator.status == "Failed":
            logger.debug("Upload failed")
            return

        logger.debug("Waiting for all tasks to be complete")
        source_q.join()
        logger.debug("All tasks complete.")
        logger.debug("Verifying upload complete.")
        if shared_meta.multipart_done():
            logger.debug("Upload complete.")
            self.transfer_coordinator.announce_done()
            if self.transfer_config.transfer_type == "dataset":
                logger.debug("Upload complete. Removing upload file cache.")
                self.upload_cache.remove_cache()
        else:
            logger.debug("Upload incomplete. Something went wrong.")


# simplified method from dataset service python client, later we will use the client directly
def _calculate_file_metadata(file_path):
    file_size = os.path.getsize(file_path)
    file_mod_time_ms = round(os.path.getmtime(file_path) * 1000)

    with open(file_path, "rb") as f:
        file_contents = f.read()
        file_hash = hashlib.sha256(file_contents).hexdigest()

    return file_size, file_mod_time_ms, file_hash


def generate_file_commit_entries(source_path) -> list:  # noqa: D103
    commit_entries = []
    for file_key in filter_directory_contents(source_path):
        full_path = os.path.join(source_path, file_key)
        file_size, file_mod_time_ms, file_hash = _calculate_file_metadata(full_path)
        file_commit_entry = CommitEntry(
            key=file_key,
            path=source_path,
            size_bytes=file_size,
            last_modified_at_ms=file_mod_time_ms,
            hash_value=file_hash,
            hash_type="SHA256",
        )
        commit_entries.append(file_commit_entry)

    return commit_entries
