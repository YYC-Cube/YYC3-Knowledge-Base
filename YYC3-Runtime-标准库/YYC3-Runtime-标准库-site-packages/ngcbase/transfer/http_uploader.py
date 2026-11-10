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

import asyncio
import base64
from collections import defaultdict
from contextlib import asynccontextmanager
import copy
import http.client
import json
import logging
import os
import ssl
import sys
import time
from urllib import parse

from aiohttp import (
    ClientSession,
    ClientTimeout,
    ContentTypeError,
    TCPConnector,
    TraceConfig,
)
import certifi
import charset_normalizer

try:
    from opentelemetry import propagate
except ModuleNotFoundError:
    propagate = None


from ngcbase.api.utils import add_scheme
from ngcbase.constants import MiB
from ngcbase.environ import NGC_CLI_MAX_CONCURRENCY, NGC_CLI_UPLOAD_RETRIES
from ngcbase.tracing import add_tags, GetTracer, set_url_tags
from ngcbase.transfer import utils as xfer_utils
from ngcbase.transfer.utils import get_headers
from ngcbase.util.datetime_utils import human_time
from ngcbase.util.file_utils import human_size

logger = logging.getLogger(__name__)

MAX_TRIES = 2
DEFAULT_TIMEOUT = 60
DEFAULT_CHUNK_SIZE = 1048576  # 1MB
S3_PART_SIZE = 500000000
# Set the number of simultaneous uploads to be 1/2 the number of processors.
failed_count = 0
failed_size = 0
file_count = 0
upload_count = 0
upload_size = 0
total_file_count = 0
upload_total_size = 0
# We need to track the progress of each part, so if the upload fails, we can re-set the progress bar by the amount that
# needs to be retried
progress_tracker = defaultdict(int)
# This needs to be in the global namespace for tracing
upload_operation_name = None
PROPAGATOR = propagate.get_global_textmap() if propagate else None


# Progress output
printer = None
# There is only ever a single progress_bar and a single task.
progress_bar = None
task = None


@asynccontextmanager
async def start_as_current_span_async(tracer, *args, **kwargs):  # noqa: D103
    with tracer.start_as_current_span(*args, **kwargs) as span:
        yield span


async def _update_progress(advance):
    async with asyncio.Lock():
        printer.update_task(task, advance=advance)


async def _update_file_column():
    file_text = f"[blue]Total: {file_count} - Completed: {upload_count} - Failed: {failed_count}"
    progress_bar.file_column.text_format = file_text


async def _update_stats(pth, size, success, resp_status, resp_data):
    global failed_count, failed_size, upload_count, upload_size
    async with asyncio.Lock():
        if resp_status and resp_data:
            if success:
                logger.debug("Finished: %s - %s", resp_status, pth)
                upload_count += 1
                upload_size += size
            else:
                logger.debug(
                    "Failed to upload %s; status=%s, message=%s",
                    pth,
                    resp_status,
                    resp_data,
                )
                failed_count += 1
                failed_size += size
        else:
            # An exception occurred before this value could be set
            logger.debug("Failed to upload %s", pth)
            failed_count += 1
            failed_size += size
        await _update_progress(advance=0)
        await _update_file_column()


def _reset_stats():
    global failed_count, failed_size, upload_count, upload_size, file_count, total_file_count, upload_total_size
    failed_count = 0
    failed_size = 0
    upload_count = 0
    upload_size = 0
    file_count = 0
    total_file_count = 0
    upload_total_size = 0


# pylint: disable=unused-argument
async def on_request_start(session, trace_config_ctx, params):
    """Set the operation name for this request."""
    params.headers["operation_name"] = upload_operation_name


async def _complete_multipart(body, url, upload_id, pth, checksum, client_timeout, headers):
    # We don't need the 'size' key for this call
    body.pop("size", None)
    body.pop("partNumberList", None)
    body["uploadID"] = upload_id
    body["sha256"] = checksum
    headers["Content-Type"] = "application/json"
    return await _multipart_done("COMPLETE", url, pth, body, client_timeout, headers)


async def _abort_multipart(body, url, upload_id, pth, client_timeout, headers):
    """Send a request to S3 to abort the upload, and delete any uploaded parts. AWS charges for storage on these parts,
    so it makes sense to delete them if they are not going to be used.
    """  # noqa: D205
    # We don't need the 'size' key for this call
    body.pop("size", None)
    body.pop("partNumberList", None)
    # If the sha256 value has been added, remove it
    body.pop("sha256", None)
    body["uploadID"] = upload_id
    headers["Content-Type"] = "application/json"
    return await _multipart_done("ABORT", url, pth, body, client_timeout, headers)


async def _multipart_done(action, url, pth, body, client_timeout, headers):
    """Common code for _complete_multipart() and _abort_multipart()."""  # noqa: D401
    logger.debug("Calling _multipart_done() for file '%s' and action '%s'", pth, action)
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    connector = TCPConnector(ssl=ssl_context)
    async with ClientSession(timeout=client_timeout, trace_configs=[], connector=connector, trust_env=True) as session:
        if action.upper() == "ABORT":
            session_method = session.delete
            err_msg = "Error in abort for"
        else:
            session_method = session.put
            err_msg = "Error in upload for"
        tries = 0
        success = False
        while tries < MAX_TRIES:
            tries += 1
            try:
                resp = await session_method(url, json=body, headers=headers)
                try:
                    resp_data = await resp.json()
                except (AttributeError, ContentTypeError, json.JSONDecodeError):
                    resp_data = await resp.text()
                resp_status = resp.status
                logger.debug(
                    "Response for _multipart_done(): %s - %s (%s)",
                    resp_status,
                    resp_data,
                    pth,
                )
                if resp_status == http.client.UNAUTHORIZED:
                    # Auth failure; return immediately
                    return resp_status
                if resp_status < 300:
                    success = True
                    break
            except Exception as e:  # pylint: disable=broad-except
                logger.info("%s %s: %s, %s", err_msg, pth, type(e), e)
    logger.debug(
        "Finished _multipart_done() for file '%s' and action '%s'; success=%s",
        pth,
        action,
        success,
    )
    return resp_status


async def file_reader(pth, offset, part_size, part_key, chunk_size=DEFAULT_CHUNK_SIZE):  # noqa: D103
    global progress_tracker
    with open(pth, "rb") as ff:
        ff.seek(offset)
        remaining = part_size
        chunk = ff.read(min(remaining, chunk_size))
        while chunk:
            actual_size = len(chunk)
            progress_tracker[part_key] += actual_size
            await _update_progress(advance=actual_size)
            remaining -= actual_size
            yield chunk
            chunk = ff.read(min(remaining, chunk_size))


async def _upload_part(semaphore, pth, part_num, part_size, url, part_auth_kwargs, client_timeout):
    """Upload an individual part of a file."""
    global progress_tracker
    async with semaphore:
        offset = part_size * part_num
        file_size = min(S3_PART_SIZE, os.stat(pth).st_size - offset)
        logger.debug(
            "\n_upload_part called for file '%s', part #%s, size=%s",
            pth,
            part_num,
            file_size,
        )
        part_key = f"{pth}-{part_num}"
        curr_timeout = client_timeout.total
        timeout = max(curr_timeout, curr_timeout * (float(file_size) / MiB))
        logger.debug("\nTimeout for file '%s', part #%s: %s", pth, part_num, human_time(timeout))
        client_timeout = ClientTimeout(total=timeout)

        host = parse.urlparse(url).netloc
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = TCPConnector(ssl=ssl_context)  # if platform.system() == "Darwin" else None
        async with ClientSession(timeout=client_timeout, connector=connector, trust_env=True) as session:
            success = False
            headers = {"Content-Length": f"{file_size}", "Host": host}
            attempts = 0
            while attempts <= NGC_CLI_UPLOAD_RETRIES:
                attempts += 1
                try:
                    resp = await session.put(
                        url,
                        data=file_reader(pth, offset, part_size, part_key),
                        headers=headers,
                        auth=None,
                    )
                    try:
                        resp_data = await resp.json()
                    except (AttributeError, ContentTypeError, json.JSONDecodeError):
                        resp_data = await resp.text()
                    resp_status = resp.status
                    logger.debug("Part Upload Response: %s (%s): %s", resp_status, pth, resp_data)
                    success = resp_status < 300
                    if success:
                        break
                    if resp_status in (401, 403):
                        await _revert_progress(part_key)
                        # AWS uses 1-based part numbering, while we use 0-based.
                        part_auth_kwargs["body"]["partNumberList"] = [part_num + 1]
                        status, data = await _get_upload_details(**part_auth_kwargs)
                        logger.debug("Multipart Create Response: %s - %s (%s)", status, data, pth)
                        success = status < 300
                        if success:
                            # Get the new pre-auth URL
                            url = data["urls"][0]
                            continue
                except Exception as e:  # pylint: disable=broad-except
                    logger.info("Error uploading part #%s of %s: %s", part_num, pth, e)
                    await _revert_progress(part_key)
        return success


async def _revert_progress(part_key):
    global progress_tracker
    part_progress = progress_tracker.get(part_key, 0)
    progress_tracker[part_key] = 0
    await _update_progress(advance=-1 * part_progress)


@asynccontextmanager
async def _semaphore_context_for_cancellation(semaphore):
    # we moved away from xfer_utils, which wrapped cancelledError for coroutines
    # so we wrap them here, which wraps arround file read
    async with semaphore:
        try:
            yield
        except asyncio.CancelledError:
            pass


async def _upload_parts(child_semaphore, pth, part_size, urls, part_auth_kwargs, client_timeout):
    """Upload the parts of the file."""
    results = await asyncio.gather(
        *[
            _upload_part(
                _semaphore_context_for_cancellation(child_semaphore),
                pth,
                num,
                part_size,
                url,
                part_auth_kwargs,
                client_timeout,
            )
            for num, url in enumerate(urls)
        ]
    )
    # Return True if all parts succeeded
    return all(results)


async def _get_upload_details(operation_name, body, session, url, headers):
    """Routine for getting the parts and URLs for the file upload."""
    with GetTracer() as tracer:
        async with start_as_current_span_async(tracer, operation_name, end_on_exit=True) as scope:
            set_url_tags(scope, "POST", url)
            PROPAGATOR.inject(carrier=headers)

            add_tags(scope, headers)
            add_tags(scope, {"span.kind": "client"})

            # Get the upload information
            resp = await session.post(url, json=body, headers=headers)
            resp_status = resp.status
            try:
                resp_data = await resp.json()
            except (AttributeError, ContentTypeError, json.JSONDecodeError):
                resp_data = await resp.text()
            add_tags(scope, {"http.status_code": resp_status})
            if resp_status >= 400:
                add_tags(scope, {"error": True})
            # save request id header as a tag so it is searchable
            if resp.headers is not None and "nv-request-id" in resp.headers:
                add_tags(scope, {"request-id": resp.headers["nv-request-id"]})
    return resp_status, resp_data


async def _upload(  # noqa: C901
    api_client,
    file_semaphore,
    partition_semaphore,
    source,
    entry,
    url,
    name,
    version,
    auth_org,
    auth_team,
    artifact_type,
    headers=None,
    timeout=None,
    operation_name=None,
):
    """Asynchronously upload a file to the specified URL."""
    async with file_semaphore:
        headers = get_headers(api_client, headers or {}, auth_org, auth_team)
        timeout = timeout or DEFAULT_TIMEOUT
        client_timeout = ClientTimeout(total=timeout)
        pth = entry.path
        rel_path = entry.name if pth == source else os.path.relpath(pth, source)
        rel_path = rel_path.replace(os.sep, "/")
        size = entry.stat().st_size
        body = {
            "name": name,
            "version": version,
            "artifactType": artifact_type,
            "filePath": rel_path,
            "size": size,
        }
        operation_name = upload_operation_name or operation_name

        logger.debug(
            "_upload() called with source=%s, pth=%s, relative path=%s, url=%s, headers=%s",
            source,
            pth,
            rel_path,
            url,
            headers,
        )
        trace_config = TraceConfig()
        trace_config.on_request_start.append(on_request_start)
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = TCPConnector(ssl=ssl_context)

        async with ClientSession(
            timeout=client_timeout,
            trace_configs=[trace_config],
            connector=connector,
            trust_env=True,
        ) as session:
            tries = 0
            success = False
            upload_id = None
            status = None
            data = None
            part_auth_kwargs = {
                "operation_name": operation_name,
                "body": copy.deepcopy(body),
                "session": session,
                "url": url,
                "headers": headers,
            }

            while tries < MAX_TRIES:
                tries += 1
                try:
                    status, data = await _get_upload_details(**part_auth_kwargs)
                    logger.debug("Multipart Create Response: %s - %s (%s)", status, data, pth)
                    success = status < 300
                    if success:
                        break
                except Exception as e:  # pylint: disable=broad-except
                    # The exception happened after the response was received, so record that info.
                    logger.debug("Failed: Status=%s Text=%s - Error: %s", status, data, e)
                    logger.debug("Retrying; attempt #%s failed (%s)", tries, pth)

            # We have the info for uploading
            if status and (status < 300):
                upload_id = part_auth_kwargs["body"]["uploadID"] = data["uploadID"]
                success = await _upload_parts(
                    partition_semaphore,
                    pth,
                    data["partSize"],
                    data["urls"],
                    part_auth_kwargs,
                    client_timeout,
                )
            logger.debug("Finished file '%s'; success=%s", pth, success)
            if success:
                checksum = xfer_utils.get_sha256_checksum(pth, as_digest=True)
                enc_check = base64.b64encode(checksum).decode("utf-8")
                logger.debug(
                    "Calling _complete_multipart() for file '%s'; encoded checksum='%s'",
                    pth,
                    enc_check,
                )
                status = await _complete_multipart(body, url, upload_id, pth, enc_check, client_timeout, headers)
                if status == http.client.UNAUTHORIZED:
                    # auth token expired during upload; fetch a new one
                    logger.debug(
                        "Got auth error for _complete_multipart() with file '%s'; retrying with fresh token",
                        pth,
                    )
                    headers = get_headers(api_client, headers or {}, auth_org, auth_team)
                    status = await _complete_multipart(body, url, upload_id, pth, enc_check, client_timeout, headers)
                logger.debug("Result for _complete_multipart() for '%s': %s", pth, status)
            else:
                # If the call to `create` succeeded, there will be an upload_id. If not, nothing to do.
                if upload_id:
                    logger.debug("Calling _abort_multipart() for file '%s'", pth)
                    status = await _abort_multipart(body, url, upload_id, pth, client_timeout, headers)
                    if status == http.client.UNAUTHORIZED:
                        # auth token expired during upload; fetch a new one
                        logger.debug(
                            "Got auth error for _abort_multipart() with file '%s'; retrying with fresh token",
                            pth,
                        )
                        headers = get_headers(api_client, headers or {}, auth_org, auth_team)
                        status = await _abort_multipart(body, url, upload_id, pth, client_timeout, headers)
                    logger.debug("Result for _abort_multipart() for '%s': %s", pth, status)
            await _update_stats(pth, size, success, locals().get("status"), locals().get("data"))
            return (success, pth)


async def _gather_files(pth):
    """Recursively generate a list of files for a given path."""
    global file_count
    files = []
    for entry in os.scandir(pth):
        if entry.is_dir():
            dir_files = await _gather_files(entry.path)
            files.extend(dir_files)
        else:
            files.append(entry)
    file_count = len(files)
    return files


async def _upload_directory(
    api_client,
    source_path,
    dest_url,
    name,
    version,
    auth_org,
    auth_team,
    artifact_type,
    headers=None,
    count=None,
    operation_name=None,
):
    """Asynchronously upload all the files in the specified directory to the given URL."""
    global printer, progress_bar, task, total_file_count, upload_total_size, file_count

    if os.path.isfile(source_path):
        gen = os.scandir(os.path.dirname(source_path))
        all_files = [pth for pth in gen if pth.name == os.path.basename(source_path)]
        file_count = len(all_files)
    else:
        all_files = await _gather_files(source_path)
    total_size = sum(f_entry.stat().st_size for f_entry in all_files)
    logger.debug("Num files: %s in %s", len(all_files), source_path)
    printer = api_client.printer
    progress_bar = printer.create_transfer_progress_bar()
    task = progress_bar.add_task("Uploading...", start=True, total=total_size, completed=0)
    total_file_count = len(all_files)
    upload_total_size = progress_bar.tasks[0].total
    # Need to do this because it is nearly impossible to mock out the above for testing
    try:
        display_size = human_size(upload_total_size)
    except TypeError:
        display_size = "0 B"
    printer.print_ok(f"Starting upload of {total_file_count} files ({display_size})")
    await _update_progress(advance=0)
    await _update_file_column()

    _concurrency = NGC_CLI_MAX_CONCURRENCY
    file_semaphore = asyncio.Semaphore(value=_concurrency)
    partition_semaphore = asyncio.Semaphore(value=_concurrency)
    # we previously give global semaphore to children coroutines to control high parition count
    # but it deadlocks for file count>=semaphore count because parent semaphore aquired all and
    # not releasing before upload complete but child coroutines cannot aquire to upload
    # here introduces two different sempahores to avoid deadlocking while control concurrency

    with progress_bar:
        return await asyncio.gather(
            *[
                _upload(
                    api_client,
                    file_semaphore,
                    partition_semaphore,
                    source_path,
                    fpth,
                    dest_url,
                    name,
                    version,
                    auth_org,
                    auth_team,
                    artifact_type,
                    headers=headers,
                    operation_name=operation_name,
                )
                for fpth in all_files
            ]
        )


def upload_directory(
    api_client,
    source_path,
    dest_url,
    name,
    version,
    auth_org,
    auth_team,
    artifact_type,
    headers=None,
    count=None,
    operation_name=None,
):
    """Given a source path and a destination URL, asynchronously uploads the files in the directory to that URL
    endpoint.
    """  # noqa: D205
    if sys.platform.startswith("win"):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # This is necessary because charset_normalizer emits a lot of DEBUG messages that we don't need.
    charset_normalizer.api.logger.setLevel(logging.INFO)
    global upload_operation_name, total_file_count, upload_total_size
    upload_operation_name = operation_name
    time_started = time.monotonic()
    logger.debug("Starting async upload loop")
    _reset_stats()

    dest_url = add_scheme(dest_url)
    try:
        asyncio.run(
            _upload_directory(
                api_client,
                source_path,
                dest_url,
                name,
                version,
                auth_org,
                auth_team,
                artifact_type,
                headers=headers,
                count=count,
                operation_name=operation_name,
            )
        )
    except KeyboardInterrupt:
        pass
    elapsed = time.monotonic() - time_started
    logger.debug(
        "Uploaded %s to %s. Elapsed time: %s. Uploaded %s files of %s bytes.",
        source_path,
        dest_url,
        elapsed,
        upload_count,
        upload_size,
    )
    if failed_count:
        logger.debug("Failed to upload %s files of %s bytes.", failed_count, failed_size)
    return (
        elapsed,
        upload_count,
        upload_size,
        failed_count,
        upload_total_size,
        total_file_count,
        failed_size,
    )
