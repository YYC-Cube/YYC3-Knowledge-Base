#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from builtins import round
from concurrent import futures
import datetime
import logging
import queue
import signal
import sys
import threading
import time

import requests.exceptions as rqes  # pylint: disable=requests-import

from ngcbase.constants import (
    DEFAULT_UPLOAD_THREADS,
    EXIT_CODES,
    GiB,
    KiB,
    TRANSFER_STATES,
)
from ngcbase.errors import NgcException
from ngcbase.printer.transfer import TransferPrinter
from ngcbase.transfer.task import StatusMonitorTask
from ngcbase.transfer.utils import CreateWindowsCtrlCHandler

logger = logging.getLogger(__name__)


class TransferConfig:  # noqa: D101
    def __init__(
        self,
        max_request_concurrency=DEFAULT_UPLOAD_THREADS,
        multipart_size_threshold=1 * GiB,
        multipart_num_files_threshold=2000,
        io_chunksize=8 * KiB,
        transfer_type=None,
        resume_upload=False,
        url=None,
        destination=None,
        append_dataset=False,
        org=None,
        team=None,
        suffix_url=None,
    ):
        """Configurations for the transfer manager."""  # noqa: D401
        # max_request_concurrency: The maximum number of Storage requests that can happen at one time
        self.max_request_concurrency = max_request_concurrency
        # Used for summary printing and for grpc upload requests
        self.transfer_type = transfer_type
        # io_chunksize: The max size of each chunk in the io queue.
        #     Currently, this is size used when reading from the downloaded stream as well.
        #     Writes on Linux+ext3 for the size of 4096, and on Windows+NTFS for the size of 1024 bytes are atomic.
        self.io_chunksize = io_chunksize
        # multipart_size_threshold: The minimum size for doing a multipart transfer
        self.multipart_size_threshold = multipart_size_threshold
        # multipart_num_files_threshold: The minimum no of files required for doing a multipart transfer
        self.multipart_num_files_threshold = multipart_num_files_threshold
        # Used during file finding to pass by already uploaded files
        self.resume_upload = resume_upload
        self.url = url
        self.org = org
        self.team = team
        self.destination = destination
        self.append_dataset = append_dataset
        self.suffix_url = suffix_url


class TransferSharedMeta:  # noqa: D101
    def __init__(
        self,
        total_size=0,
        total_files=0,
        already_uploaded_size=0,
        already_uploaded_count=0,
    ):
        self.transfer_coordinator_lock = threading.Lock()
        self.status_lock = threading.Lock()
        self.lock = threading.Lock()
        self.done = threading.Event()
        # Set once all upload file tasks are added to the queue
        self.files_finder_finished = threading.Event()
        self.time_started = time.time()
        self.started_at = datetime.datetime.now()
        self.messages = queue.Queue()
        # Hold 1000 file objects (metadata, not contents of files) in memory. Bounded queue part
        # of memory management scheme for uploads.
        self.task_q = queue.Queue(maxsize=1000)
        self.last_active_time = time.time()
        self.total_size = total_size + already_uploaded_size
        self.total_files = total_files + already_uploaded_count
        self.transferred_size = already_uploaded_size
        self.transferred_files = already_uploaded_count
        self.processed_files = 0
        # last count updated by file finders
        self.last_count_value = 0
        self.set_total_files(self.total_files)

    def __repr__(self):  # noqa: D105
        ret = ""
        ret += "Processed: {}\n".format(self.processed_files)
        ret += "Transferred: {}\n".format(self.transferred_files)
        ret += "Total: {}\n".format(self.total_files)
        ret += "Multipart Done: {}\n".format(self.multipart_done())
        ret += "Files finder finished: {}\n".format(self.files_finder_finished.is_set())
        return ret

    def set_total_files(self, total_files):  # noqa: D102
        with self.lock:
            self.total_files = total_files

    def inc_transferred_size(self, size):  # noqa: D102
        with self.lock:
            self.transferred_size += size

    def dec_transferred_size(self, size):  # noqa: D102
        with self.lock:
            self.transferred_size -= size

    def inc_processed_files(self, num=1):  # noqa: D102
        with self.lock:
            self.processed_files += num

    def inc_transferred_files(self, num=1):  # noqa: D102
        with self.lock:
            self.transferred_files += num

    def multipart_done(self):  # noqa: D102
        with self.lock:
            if self.total_files == self.processed_files:
                return True
            logger.debug(
                "multipart_done check failed:\n\ttotal_files = %d\n\tprocessed_files = %d",
                self.total_files,
                self.processed_files,
            )
        return False

    def put_message(self, new_message):  # noqa: D102
        self.messages.put(new_message)

    @property
    def number_of_files_left(self):  # noqa: D102
        return self.total_files - self.processed_files

    @property
    def passed_time(self):  # noqa: D102
        return round(time.time() - self.time_started, 2)

    @property
    def avg_time_per_file(self):  # noqa: D102
        return self.passed_time // self.processed_files

    @property
    def remaining_time(self):  # noqa: D102
        return round(self.avg_time_per_file * self.number_of_files_left, 2)

    @property
    def estimated_total_time(self):  # noqa: D102
        return round(self.avg_time_per_file * self.total_files, 2)


class TransferCoordinator:
    """A helper class to manage the TransferWorkers."""

    def __init__(self, transfer_id, shared_meta: TransferSharedMeta, config):
        self._pending_futures = set()
        self._exit_code = EXIT_CODES["SUCCESS"]
        self._shutdown_callbacks = set()
        self.transfer_id = transfer_id
        self.status = TRANSFER_STATES["NOT_STARTED"]
        self.shared_meta = shared_meta
        self.config = config

    def __repr__(self):  # noqa: D105
        return "{}(transfer_id={})".format(self.__class__.__name__, self.transfer_id)

    def done(self):  # noqa: D102
        return self.status != TRANSFER_STATES["NOT_STARTED"]

    def cancel(self):  # noqa: D102
        with self.shared_meta.status_lock:
            if not self.done():
                self.status = TRANSFER_STATES["TERMINATED"]
                self._exit_code = EXIT_CODES["TERMINATION_CTRL_C"]

        self.announce_done()

    def wait(self):  # noqa: D102
        logger.debug("transfer_coordinator (main_thread) is waiting for the transfer to complete")
        # we wait here until we receive a done signal in shared_meta and then we call the shutdown method to either
        # wait or cancel the pending futures
        # this  is where we also run all the shutdown callbacks
        self.shared_meta.done.wait(threading.TIMEOUT_MAX)
        logger.debug("shared_meta received 'done' event")

    @staticmethod
    def submit_task(executor, task):
        """Submits the task to a executor."""  # noqa: D401
        future = executor.submit(task)
        return future

    def set_exception(self, exception):  # noqa: D102
        logger.debug("Logging an exception: %s", exception, exc_info=1)
        with self.shared_meta.status_lock:
            if not self.done():
                self.status = TRANSFER_STATES["FAILED"]
                self._exit_code = EXIT_CODES["GENERAL_ERROR"]

        logger.debug("Announcing exception message")
        self.message(str(exception))
        self._print_message_q()
        logger.debug("Announcing done after publishing a message")
        self.announce_done()

    def message(self, message):  # noqa: D102
        self.shared_meta.put_message(message)

    def _print_message_q(self):
        logger.debug("Printing the message queue")
        printer = TransferPrinter(self.config)
        # Need an extra newline to account for how the status bar is being printed without a trailing newline
        printer.print_ok("")
        while not self.shared_meta.messages.empty():
            next_message = self.shared_meta.messages.get()
            printer.print_ok(next_message)

    def announce_done(self):
        """This is to be called as a callback to the final task that need to be executed."""  # noqa: D401, D404
        with self.shared_meta.status_lock:
            if not self.done():
                self.status = TRANSFER_STATES["COMPLETED"]

        logger.debug("Announcing 'done' status: %s", self.status)
        logger.debug("Shared meta values: %s", str(self.shared_meta))
        self.shared_meta.done.set()

    def exit(self):  # noqa: D102
        logger.debug("Exiting from transfer manager with exit code %s", self._exit_code)
        sys.exit(self._exit_code)


class TransferManager:  # noqa: D101
    def __init__(
        self,
        transfer_id,
        transfer_config=None,
        transfer_size=0,
        file_count=0,
        already_uploaded_size=0,
        already_uploaded_count=0,
        transfer_path=None,
        dataset_service_enabled=False,
        display_id=None,
        client=None,
    ):
        self._transfer_id = transfer_id
        self.transfer_config = transfer_config
        if not transfer_config:
            self.transfer_config = TransferConfig()

        self._client = client
        self._transfer_path = transfer_path
        self._transfer_path = self.get_transfer_dir()
        self._shared_meta = TransferSharedMeta(
            total_size=transfer_size,
            total_files=file_count,
            already_uploaded_size=already_uploaded_size,
            already_uploaded_count=already_uploaded_count,
        )

        logger.debug("Instantiating transfer coordinator with transfer id : %s", transfer_id)
        self.transfer_coordinator = TransferCoordinator(transfer_id, self._shared_meta, config=self._client.config)

        self._request_executor = futures.ThreadPoolExecutor(max_workers=self.transfer_config.max_request_concurrency)
        self._status_executor = futures.ThreadPoolExecutor(max_workers=1)
        self.printer = TransferPrinter(self._client.config)
        self._progress_future = None
        self.dataset_service_enabled = dataset_service_enabled
        self.display_id = display_id

    def __repr__(self):  # noqa: D105
        return "{}(done={})".format(self.__class__.__name__, self.transfer_coordinator.shared_meta.done.is_set())

    def shutdown(self, wait=True, exit_on_shutdown=True, dump_transfer_summary=True):
        """Shutdown all of the executors and processes."""
        logger.debug("Beginning TransferManager.shutdown")
        if not wait:
            return

        self.transfer_coordinator.wait()
        self._status_executor.shutdown()
        self._request_executor.shutdown()
        if dump_transfer_summary:
            self.dump_transfer_summary()
        if exit_on_shutdown:
            self.transfer_coordinator.exit()
        if self.transfer_coordinator.status == TRANSFER_STATES["FAILED"]:
            # raise an exception on failure to handle farther up the call stack
            raise NgcException()

    def handle_ctrl_c(self, *_, exit_on_shutdown: bool = True):  # noqa: D102
        logger.debug("Keyboard interrupt detected")
        print("\nTerminating, please wait...", flush=True)
        self.transfer_coordinator.cancel()
        self.shutdown(exit_on_shutdown=exit_on_shutdown)
        return True

    def cancel_transfer(self, *_):  # noqa: D102
        self.transfer_coordinator.cancel()
        return True

    def transfer(
        self, wait=True, exit_on_shutdown=True, disable_status_monitor=False, dump_transfer_summary=True, **kwargs
    ):
        """Begin uploading or downloading.

        Handles upload status printing, interrupts, and cleanup operations for shared threadpools

        Entrypoint to business logic sections should be placed in the _transfer method
        """
        if sys.platform == "win32":
            # Convert the windows Ctrl+C event into a SIGINT so it can be handled as a
            # KeyboardInterrupt.
            _ = CreateWindowsCtrlCHandler(self.cancel_transfer).get_handler()

        try:
            try:
                if self.transfer_coordinator.done():
                    return

                # TODO: Use thread instead of threadpool; ensure checks done status
                # before and after sleep so the thread doesn't keep printing after an interrupt
                if not self._progress_future and not disable_status_monitor:
                    self._progress_future = self.transfer_coordinator.submit_task(
                        self._status_executor,
                        StatusMonitorTask(
                            transfer_coordinator=self.transfer_coordinator,
                            kwargs={"progress_callback": self.get_progress_callback()},
                        ),
                    )
                self._transfer(**kwargs)
            # pylint: disable=broad-except
            except (
                Exception,
                rqes.Timeout,
                rqes.ConnectionError,
                rqes.RequestException,
            ) as why:
                logger.debug("Encountered an exception while in transfer code: %s", str(why))
                # we ignore all the exception here in the transfer (upload/download)
                # all the exception handling is supposed to be done by transfer_coordinator
                # so we need to notify the coordinator
                self.transfer_coordinator.set_exception(why)

            self.check_empty_transfer()

            if wait:
                self.transfer_coordinator.wait()
            if self.transfer_coordinator.status == TRANSFER_STATES["TERMINATED"]:
                raise KeyboardInterrupt

            logger.debug("Beginning final shutdown")
            self.shutdown(wait, exit_on_shutdown, dump_transfer_summary)
        except KeyboardInterrupt:
            self.handle_ctrl_c(exit_on_shutdown=exit_on_shutdown)
            if exit_on_shutdown:
                # Ignore future sigints and exit cleanly without traceback
                signal.signal(signal.SIGINT, signal.SIG_IGN)
            raise

    def get_transfer_dir(self):  # noqa: D102
        raise NotImplementedError("get_transfer_dir() should be implemented")

    def get_progress_callback(self):  # noqa: D102
        raise NotImplementedError("get_progress_callback() should be implemented")

    def _transfer(self, **kwargs):
        raise NotImplementedError("_transfer() should be implemented")

    def dump_transfer_summary(self):  # noqa: D102
        raise NotImplementedError("dump_transfer_summary() should be implemented")

    def check_empty_transfer(self):  # noqa: D102
        pass
