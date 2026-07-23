#
# Copyright (c) 2018-2020, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import asyncio
import base64
import ctypes
from dataclasses import dataclass
import datetime
from datetime import timezone
import functools
from functools import lru_cache
import hashlib
import inspect
from itertools import chain
import logging
import math
import multiprocessing
import os
import signal
import sys
import threading
import time
from typing import Any, Callable, Iterator, List, Literal, Optional, Tuple, Type, Union
import uuid

import boto3
from botocore.config import Config
from yarl import URL

from ngcbase.constants import EXIT_CODES, KiB, TRANSFER_STATES_EXIT_CODE
from ngcbase.environ import (
    NGC_CLI_PROGRESS_UPDATE_FREQUENCY,
    NGC_CLI_TRANSFER_DEBUG_MAX_FUNCTION_NAME_LENGTH,
    NGC_CLI_TRANSFER_DEBUG_MAX_WORKER_LENGTH,
)
from ngcbase.errors import NgcException
from ngcbase.tracing import GetMeter
from ngcbase.util.file_utils import glob_filter_in_paths, glob_filter_out_paths
from ngcbase.util.utils import flatten_dict, get_transfer_info

if sys.platform == "win32":
    from ctypes import wintypes

# Default for reading in files for sha256 checksums
DEFAULT_CHUNK_SIZE = 64 * KiB


# NOTE: since the design is still in flux, the access key ID and the access key functions may merge into one
def get_S3_access_key_id():  # noqa: D103
    # TODO: Contact NvSTS with the JWT to get S3 user ID
    pass


def get_S3_access_key():  # noqa: D103
    # TODO: Contact NvSTS with the JWT to get the S3 password
    pass


class CreateWindowsCtrlCHandler:  # noqa: D101
    def __init__(self, handler_function):
        self.handle_ctrl_c = handler_function
        self.kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        HANDLER_ROUTINE = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.DWORD)
        self.kernel32.SetConsoleCtrlHandler.argtypes = (HANDLER_ROUTINE, wintypes.BOOL)
        self.HANDLER_ROUTINE = HANDLER_ROUTINE

    def get_handler(self):  # noqa: D102
        @self.HANDLER_ROUTINE
        def handler(ctrl):
            if ctrl == signal.CTRL_C_EVENT:  # pylint: disable=no-member
                handled = self.handle_ctrl_c()
            else:
                handled = False
            # If not handled, call the next handler.
            return handled

        if not self.kernel32.SetConsoleCtrlHandler(handler, True):
            raise ctypes.WinError(ctypes.get_last_error())

        return handler


def create_ctrl_c_handler(process_pool):  # noqa: D103
    def handle_ctrl_c(*_):
        print("Caught Ctrl-C, terminating dataset upload.")
        # Stop existing upload processes.
        process_pool.terminate()
        # Wait for the processes to come back.
        process_pool.join()
        print("Terminated dataset upload.")
        return True

    return handle_ctrl_c


def get_download_files(files, dirs, file_patterns=None, dir_patterns=None, exclude_patterns=None):  # noqa: D103
    file_paths = files.keys()
    # if no file/dir patterns given, do not filter these at all
    if file_patterns or dir_patterns:
        file_paths = glob_filter_in_paths(file_paths, file_patterns)
        dirs = glob_filter_in_paths(dirs, dir_patterns)

    # remove all dirs which are children of dirs_filtered_by_exclude
    dirs_filtered_by_exclude = [dir_ for dir_ in dirs if dir_ not in glob_filter_out_paths(dirs, exclude_patterns)]
    for dir_ in dirs:
        if _parent_exists(dir_, dirs_filtered_by_exclude):
            dirs_filtered_by_exclude.append(dir_)
    dirs = [dir_ for dir_ in dirs if dir_ not in dirs_filtered_by_exclude]
    # remove parents of the dirs_filtered_by_exclude to avoid downloading the excluded directories through ancestors
    parents_of_excluded_dirs = list(
        set(chain.from_iterable([_get_ancestors(dir_, dirs) for dir_ in dirs_filtered_by_exclude]))
    )
    dirs = [dir_ for dir_ in dirs if dir_ not in parents_of_excluded_dirs]

    # remove files that are in directories excluded by an exclude pattern
    file_paths = [file_ for file_ in file_paths if not _see_if_file_in_dirs(file_, dirs_filtered_by_exclude)]

    # filter all the child directories so that they don't get downloaded again.
    # do this last or it interferes with prior user filtering
    dirs = _filter_child_directories(dirs)

    individual_file_paths_from_dirs = []
    for dir_ in dirs:
        # NOTE: need to remove "/" from directory paths because the paths are specified absolute paths in storage
        individual_file_paths_from_dirs = [file_path for file_path in files.keys() if file_path.startswith(dir_)]

    # add files that are in directories and not in file paths
    file_paths = list(set(chain(file_paths, individual_file_paths_from_dirs)))
    # filter out the files which matches the exclude pattern
    file_paths = glob_filter_out_paths(file_paths, exclude_patterns)
    # raise if no files to download
    if not file_paths:
        raise NgcException("No files to download, exiting.")

    # Sum the sizes of individual files
    download_size = sum(files[file_path] for file_path in file_paths)

    return file_paths, download_size


def get_download_files_size(files, dir_patterns, exclude_patterns):  # noqa: D103
    file_paths = files.keys()
    # filter in the files which matches the dirs pattern
    if dir_patterns:
        file_paths = glob_filter_in_paths(file_paths, dir_patterns)
    # filter out the files which matches the exclude pattern
    if exclude_patterns:
        file_paths = glob_filter_out_paths(file_paths, exclude_patterns)
    # raise if no files to download
    if not file_paths:
        raise NgcException("No files to download, exiting.")

    # Sum the sizes of individual files
    download_size = sum(files[file_path] for file_path in file_paths)

    return file_paths, download_size


def _filter_child_directories(dirs):
    if dirs:
        return [_target for _target in dirs if not _parent_exists(_target, dirs)]
    return dirs


def _parent_exists(_target, _dir_list):
    """Determine if any parent dirs exist.

    Given a target and directory list,
    check if any dirs in the directory list
    are a parent of the target.
    """
    _target_split = [_f for _f in _target.split("/") if _f]
    for _dir in _dir_list:
        _dir_split = [_f for _f in _dir.split("/") if _f]
        _len = len(_dir_split)
        # don't process the target
        if _target_split == _dir_split:
            continue
        # potential parents will have len >= target
        if len(_target_split) < _len:
            continue
        if _dir_split == _target_split[:_len]:
            return True
    return False


def _get_ancestors(_target, _dir_list):
    """Get all of the ancestors of the target."""
    parents = []
    _target_split = [_f for _f in _target.split("/") if _f]
    for dir_ in _dir_list:
        _dir_split = [_f for _f in dir_.split("/") if _f]
        _len = len(_dir_split)
        # don't process the target
        if _target_split == _dir_split:
            continue
        # potential parents will have len >= target
        if len(_target_split) < _len:
            continue
        if _dir_split == _target_split[:_len]:
            parents.append(dir_)
    return parents


def _see_if_file_in_dirs(name, dirs):
    if not name or not dirs:
        return False
    if "/" in dirs and name != "/":
        return True
    while name and name.rfind("/") > 0:
        name = name[: name.rfind("/")]
        if any(True for dir_ in dirs if name.strip("/") == dir_.strip("/")):
            return True
    return False


def get_sha256_checksum(pth=None, content=None, chunk_size=None, return_object=False, as_digest=False):
    """Returns the SHA256 checksum for the given file or bytes.

    You may specify either a path with the `pth` parameter, or the literal bytes with the `content` parameter. If you
    specify both, the `pth` will be ignored, and the `content` used instead.

    Because files may be very large, they will be read in chunks determined by the `chunk_size` parameter. If that is
    not specified, a default chunk_size of 64KiB will be used. If you pass content directly, the `chunk_size` parameter
    is ignored.

    There are 2 parameters that determine what is returned. If `return_object` is True, the sha256 hash object is
    returned. If `as_digest` is True, then the digest() version (bytes) is returned. If neither are set to True, the
    hexdigest() value (string) will be returned instead.
    """  # noqa: D401
    result = hashlib.sha256()
    if content:
        if isinstance(content, str):
            content = content.encode()
        result.update(content)
    else:
        # Read in the file in chunk_size parts
        chunk_size = chunk_size or DEFAULT_CHUNK_SIZE
        with open(pth, "rb") as ff:
            chunk = ff.read(chunk_size)
            while chunk:
                result.update(chunk)
                chunk = ff.read(chunk_size)
    if return_object:
        return result
    if as_digest:
        return result.digest()
    return result.hexdigest()


async def gather(coroutines, count=None, return_exceptions=True):
    """Override aysncio gather to implement semaphore handling
    :param coroutines args: Coroutines to run with a limited number of semaphores
    :param int count: Number of semaphores to have
    :return list: list of returns from coroutines
    """  # noqa: D205, D415
    if not count:
        # Default to a reasonable value based on available CPUs
        count = multiprocessing.cpu_count() * 4
    semaphore = asyncio.Semaphore(value=count)

    async def func(coroutine):
        async with semaphore:
            try:
                return await coroutine
            except asyncio.CancelledError:
                pass

    return await asyncio.gather(*[func(coro) for coro in coroutines], return_exceptions=return_exceptions)


def get_headers(api_client, headers, auth_org, auth_team):  # noqa: D103
    header_override = api_client.authentication.auth_header(auth_org=auth_org, auth_team=auth_team)
    headers.update(header_override)
    return headers


global credential_lock
credential_lock = threading.Lock()


class DatasetCredentials:  # noqa: D101
    def __init__(self, credential_provider, dataset_id, org_name, access_type):
        self.upload_overrides = {}
        self.credential_provider = credential_provider
        self.dataset_id = dataset_id
        self.org_name = org_name
        self.access_type = access_type

    def get_credentials(self):  # noqa: D102
        expire_time = (datetime.datetime.now(timezone.utc) - datetime.timedelta(minutes=15)).isoformat()
        if "expiration" not in self.upload_overrides or self.upload_overrides["expiration"] < expire_time:
            self._update_dataset_upload_options()
        return self.upload_overrides

    def _update_dataset_upload_options(self):
        with credential_lock:
            self.upload_overrides["dataset_service_enabled"] = True
            getStorageAccessResponse = self.credential_provider.get_storage_access_credentials(
                dataset_id=self.dataset_id, org_name=self.org_name, access_type=self.access_type
            )
            self.upload_overrides["endpoint_url"] = getStorageAccessResponse["endpoint_url"]
            self.upload_overrides["region"] = getStorageAccessResponse["region"]
            self.upload_overrides["base_path"] = getStorageAccessResponse["base_path"]
            credentials = getStorageAccessResponse["Credentials"]["S3Credentials"]
            self.upload_overrides["access_key"] = credentials["access_key"]
            self.upload_overrides["secret_key"] = credentials["secret_key"]
            self.upload_overrides["token"] = credentials["token"]
            self.upload_overrides["expiration"] = credentials["expiration"]
            self.upload_overrides["bucket"], self.upload_overrides["prefix"] = getStorageAccessResponse[
                "base_path"
            ].split("/", 1)


@lru_cache()
def get_s3_client(aws_access_key_id, aws_secret_access_key, aws_session_token, endpoint_url, region_name):  # noqa: D103
    config = Config(max_pool_connections=20)
    return boto3.Session().client(
        service_name="s3",
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        aws_session_token=aws_session_token,
        endpoint_url=endpoint_url,
        region_name=region_name,
        config=config,
    )


def use_noncanonical_url(url: str) -> URL:  # noqa: D103
    # https://docs.aiohttp.org/en/stable/client_quickstart.html#passing-parameters-in-urls
    return URL(url, encoded=True)


@lru_cache(maxsize=50)
def obfuscate_string(string: str) -> str:
    """Encodes a string into a base64 string to obfuscate the original string.

    Args:
        string (str): The original string to be obfuscated.

    Returns:
        str: A base64-encoded string representing the obfuscated string.
    """  # noqa: D401
    return base64.b64encode(string.encode()).decode()


def bitmask_get_set_bits(bitmask: int, length: int) -> List[int]:
    """Returns a list of positions where bits are set to 1 in a given bitmask.

    Args:
        bitmask (int): The bitmask integer to analyze.
        length (int): The number of least significant bits to check.

    Returns:
        List[int]: A list of indices (0-indexed) where bits are set.
    """  # noqa: D401
    ret = []
    for i in range(length):
        if bitmask & (1 << i):
            ret.append(i)
    return ret


def bitmask_clear_bit(bitmask: int, index: int) -> int:
    """Returns a new bitmask with the bit at the specified index cleared (set to 0).

    Args:
        bitmask (int): The original bitmask.
        index (int): The position of the bit to clear.

    Returns:
        int: The new bitmask with the specified bit cleared.
    """  # noqa: D401
    return bitmask & ~(1 << index)


def bitmask_is_bit_set(bitmask: int, index: int) -> bool:
    """Checks if the bit at the specified index is set (1) in the bitmask.

    Args:
        bitmask (int): The bitmask to check.
        index (int): The position of the bit to check.

    Returns:
        bool: True if the bit is set, False otherwise.
    """  # noqa: D401
    return bool(bitmask & (1 << index))


def bitmask_set_bit_in_size(bitmask: int, size: int, partition_size: int) -> int:
    """Calculates the total number of bits set in a bitmask for given partition sizes within a specified total size.

    Args:
        bitmask (int): Integer representation of the bitmask.
        size (int): Total size in which bits are to be checked.
        partition_size (int): Size of each partition to check for set bits.

    Returns:
        int: The total number of set bits calculated across all partitions.
    """  # noqa: D401
    assert size >= 0, "file size cannot be less than zero"
    if size == 0:
        return 0
    n = (size - 1) // partition_size
    total = 0
    for i in range(n):
        total += partition_size * bitmask_is_bit_set(bitmask, i)
    total += (size % partition_size or partition_size) * bitmask_is_bit_set(bitmask, n)
    return total


def async_retry(
    exception_to_check: Union[Type[BaseException], Tuple[Type[BaseException], ...]] = Exception,
    tries=10,
    delay=100,
    backoff=1,
):
    """A decorator to retry a function asynchronously if an exception occurs, with exponential backoff.

    Args:
        exception_to_check (Exception, optional): The exception or tuple of exceptions to check for retries.
            Defaults to Exception.
        tries (int, optional): Maximum number of retries. Defaults to 10.
        delay (int, optional): Initial delay between retries in milliseconds. Defaults to 100.
        backoff (int, optional): Factor by which the delay increases after each retry. Defaults to 1.

    Returns:
        function: A wrapper function that includes retry logic.

    Behavior in Recursive Use Case:
        When applied to a recursive function, the decorator will manage retries for each individual call
        in the recursion. If an exception occurs during any of the recursive calls, the retry logic will
        handle that specific call according to the specified retry parameters (tries, delay, backoff),
        without interfering with the retries of other calls in the recursion chain.

    """  # noqa: D401

    def retry_this(f):
        @functools.wraps(f)
        async def f_retry(*args, **kwargs):
            mtries, mdelay = tries, delay
            while mtries > 1:
                try:
                    return await f(*args, **kwargs)

                except exception_to_check as e:  # pylint: disable=broad-except
                    # pylint: disable=deprecated-method
                    log_debug(
                        f.__name__,
                        getattr(args[0], "worker_type", "retry") if args and hasattr(args[0], "__class__") else "retry",
                        f"{str(e)}, Retrying in {mdelay} milliseconds..., retry: {tries - mtries + 1}/{tries}",
                    )
                    await asyncio.sleep(mdelay / 1000)
                    mtries -= 1
                    mdelay *= backoff
            return await f(*args, **kwargs)

        return f_retry

    return retry_this


def get_full_paths(source: str) -> Iterator[str]:
    """Generate full file paths under the specified directory or just the file path if a single file is specified.

    Args:
        source (str): The directory or file path.

    Returns:
        Iterator[str]: An iterator that yields full paths to files under the specified directory or the file itself.
    """
    if os.path.isfile(source):
        yield source
    else:
        for dir_path, _, file_names in os.walk(source):
            for _file_name in file_names:
                yield os.path.join(dir_path, _file_name)


def sanitize_path(path: str) -> str:
    """Sanitize the file path to make it a valid file name by replacing directory delimiters with a specified character.

    Args:
        path (str): The file path to sanitize.

    Returns:
        str: The sanitized file path with directory delimiters replaced by '_'.
    """
    # Choose a replacement that is unlikely to be in the original path
    replacement_char = "_"
    sanitized_name = path.replace(os.sep, replacement_char)
    return sanitized_name


def get_sha256_file_checksum(pth: str, chunk_size: int = 50 * 1024 * 1024, canceling_event=None) -> bytes:
    """Computes the SHA256 checksum of a file in chunks, useful for large files.

    A file can be multi terabyte, use canceling_event for cooperative stop.

    Args:
        pth (str): Path to the file.
        chunk_size (int): The size of each chunk read from the file. Defaults to 1 MB.
        canceling_event(threading.Event): The optional threading event to stop the process.

    Returns:
        bytes: The SHA256 checksum of the file.
    """  # noqa: D401
    f_size = os.path.getsize(pth)
    result = hashlib.sha256()
    _loop, _mod = divmod(f_size, chunk_size)
    with open(pth, "rb", buffering=0) as f:
        for i in range(_loop):
            # if 500mb/s hash speed
            # this checks 500/64 times per sec
            if canceling_event and i & 63 == 0 and canceling_event.is_set():
                raise asyncio.CancelledError("cancellation event is set")
            result.update(f.read(chunk_size))

        result.update(f.read(_mod))
    return result.digest()


def log_debug(function, worker, message):
    """Logs a debug message with a timestamp, truncating and padding the function and worker names.

    Args:
        function (str): The function name to log.
        worker (str): The worker or module name associated with the message.
        message (str): The message to log.
    """  # noqa: D401
    truncated_function = function[:NGC_CLI_TRANSFER_DEBUG_MAX_FUNCTION_NAME_LENGTH]
    truncated_function = truncated_function.ljust(NGC_CLI_TRANSFER_DEBUG_MAX_FUNCTION_NAME_LENGTH)
    truncated_worker = worker[:NGC_CLI_TRANSFER_DEBUG_MAX_WORKER_LENGTH]
    truncated_worker = truncated_worker.ljust(NGC_CLI_TRANSFER_DEBUG_MAX_WORKER_LENGTH)

    frame = inspect.currentframe()
    module = inspect.getmodule(frame)

    logger = logging.getLogger(module.__name__ if module else None)

    t_now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.debug("[%s] [%s] [%s] %s", t_now, truncated_function, truncated_worker, message)


def logistic_scale(x, max_val=50, k=0.1, x0=0, min_val=2):
    """Logistic function to scale values smoothly with a minimum value and rounding.

    max_val: the curve's maximum value
    k: the logistic growth rate or steepness
    x0: the x-value of the sigmoid's midpoint
    min_val: the minimum value of the logistic function
    """
    scaled_value = max_val / (1 + math.exp(-k * (x - x0)))
    # Ensure the value is at least min_val and round to the nearest integer
    return round(max(min_val, scaled_value))


@dataclass(frozen=True)
class TransferStats:
    """Compact read-only status class for output."""

    completed_bytes: int
    failed_bytes: int
    total_bytes: int
    completed_count: int
    failed_count: int
    total_count: int
    status: Literal["Not Started", "In Progress", "Failed", "Completed", "Terminated"]


class ThreadTransferProgress:
    """Tracks the state of a file during thread transfer.

    Track overall transfer progress for a transfer, providing safe thread updates and callback
    at a specified maximum update rate.
    """

    def __init__(
        self,
        completed_bytes: int = 0,
        failed_bytes: int = 0,
        total_bytes: int = 0,
        completed_count: int = 0,
        failed_count: int = 0,
        total_count: int = 0,
        callback_func: Optional[  # pylint: disable=unsubscriptable-object
            Callable[[int, int, int, int, int, int], Any]
        ] = None,
        update_rate=NGC_CLI_PROGRESS_UPDATE_FREQUENCY,
    ):
        """Initialize the ThreadTransferProgress instance.

        Args:
            completed_bytes (int): The number of completed bytes.
            failed_bytes (int): The number of failed bytes.
            total_bytes (int): The total number of bytes.
            completed_count (int): The number of completed items.
            failed_count (int): The number of failed items.
            total_count (int): The total number of items.
            callback_func (Optional[Callable[[int, int, int, int, int, int], Any]]):
                A callback function that accepts six integers representing
                completed_bytes, failed_bytes, total_bytes, completed_count,
                failed_count, and total_count respectively. If provided,
                this function will be called to report progress.
                If set to None, progress updates will not be reported.
            update_rate (float): The maximum update rate for the callback function,
                in seconds. Progress updates will be reported at most once per
                this duration. Ignored if callback_func is None.

        """
        self.lock = threading.Lock()
        self.completed_bytes = completed_bytes
        self.failed_bytes = failed_bytes
        self.total_bytes = total_bytes
        self.completed_count = completed_count
        self.failed_count = failed_count
        self.total_count = total_count
        self.callback_func = callback_func
        self.running = False
        self.status: Literal["Not Started", "In Progress", "Failed", "Completed", "Terminated"] = "Not Started"
        self.update_rate = update_rate if callback_func else -1
        self.monitor_thread: threading.Thread

        _uuid = str(uuid.uuid1())
        frame = inspect.currentframe()
        module = inspect.getmodule(frame)
        logger = logging.getLogger(module.__name__ if module else None)
        logger.debug("UUID for metric: %s", _uuid)
        self.telemetry_counter = GetMeter(
            additional_resources={"uuid": _uuid, **flatten_dict(get_transfer_info())}
        ).meter.create_counter("ngc_cli_download_total_bytes", unit="By", description="Total bytes downloaded")

    def start_monitoring(self):
        """Start the monitoring thread."""
        if self.callback_func and not self.running:
            self.running = True
            self.monitor_thread = threading.Thread(target=self.monitor_progress, daemon=True)
            self.monitor_thread.start()

    def __enter__(self):  # noqa: D105
        self.start_monitoring()
        return self

    def __exit__(self, _exc_type, _exc_val, _exc_tb):  # noqa: D105
        self.running = False

    def monitor_progress(self):
        """Update progress with configured maximum update_rate."""
        if self.callback_func and self.update_rate > 0:
            while self.running:
                self.update_progress()
                time.sleep(self.update_rate)

    def update_progress(self):
        """Call the update progress callback function with the current progress metrics."""
        if self.callback_func:
            self.callback_func(
                self.completed_bytes,
                self.failed_bytes,
                self.total_bytes,
                self.completed_count,
                self.failed_count,
                self.total_count,
            )

    def advance(self, size_in_bytes: int, count: int):
        """Advance the progress by adding completed bytes and item count.

        use negatives to undo
        """
        with self.lock:
            self.completed_bytes += size_in_bytes
            self.completed_count += count
            self.telemetry_counter.add(max(size_in_bytes, 0), {"operation": "ngc registry download"})

    def fail(self, size_in_bytes: int, count: int):
        """Update the progress by adding failed bytes and item count.

        use negatives to undo
        """
        with self.lock:
            self.failed_bytes += size_in_bytes
            self.failed_count += count
            self.status = "Failed"

    def read_progress(self):
        """Read the current progress metrics."""
        return (
            self.completed_bytes,
            self.failed_bytes,
            self.total_bytes,
            self.completed_count,
            self.failed_count,
            self.total_count,
        )

    def to_stats(self) -> TransferStats:
        """Freeze stats into a dataclass for output."""
        return TransferStats(
            self.completed_bytes,
            self.failed_bytes,
            self.total_bytes,
            self.completed_count,
            self.failed_count,
            self.total_count,
            self.status,
        )


def handle_transfer_exit_code(result) -> None:
    """Handle exit codes for transfer operations based on the result status.

    Args:
        result: Transfer result DotDict returned by make_transfer_result()
                (from registry.api.utils). Contains 'status' key with transfer status.

    Raises:
        SystemExit: With appropriate exit code based on transfer status
    """
    if not result or not isinstance(result, dict):
        return

    status = result.get("status", "").strip()
    if not status:
        return

    exit_code = TRANSFER_STATES_EXIT_CODE.get(status, EXIT_CODES["GENERAL_ERROR"])

    if exit_code == EXIT_CODES["SUCCESS"]:
        return

    sys.exit(exit_code)
