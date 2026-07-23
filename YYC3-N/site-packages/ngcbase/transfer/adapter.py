#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import base64
from copy import deepcopy
from functools import wraps
import http.client
import logging
import pathlib
import posixpath
import random
import threading
import time
from urllib.parse import quote
from urllib.request import getproxies

try:
    import grpc

    # pylint: disable=no-name-in-module, ungrouped-imports,import-error
    from ngcbase.transfer.grpc.proto_py.upload_pb2 import PutRequest
except ModuleNotFoundError:
    grpc = None
    PutRequest = None


import requests  # pylint: disable=requests-import
from requests_toolbelt import MultipartEncoderMonitor  # pylint: disable=requests-import
import urllib3

from ngcbase.api.utils import create_api_error_from_http_exception, raise_for_status
from ngcbase.constants import GRPC_BUFFER_SIZE, REQUEST_TIMEOUT_SECONDS, USER_AGENT
from ngcbase.environ import NGC_CLI_USER_AGENT_TEXT
from ngcbase.errors import (
    AuthenticationException,
    InsufficientStorageException,
    NgcAPIRetryableError,
    NgcException,
)
from ngcbase.tracing import GetTracer, TracedSession
from ngcbase.util.io_utils import mask_string

# pylint: disable=no-name-in-module


logger = logging.getLogger(__name__)

HTTP_RETRYABLE_ERRORS = (
    requests.exceptions.ConnectionError,
    requests.exceptions.ReadTimeout,
    requests.exceptions.ConnectTimeout,
    requests.exceptions.ChunkedEncodingError,
    NgcAPIRetryableError,
)

GRPC_RETRYABLE_ERRORS = (
    (NgcAPIRetryableError, grpc.FutureCancelledError, grpc.RpcError) if grpc else (NgcAPIRetryableError)
)
GRPC_TIMEOUT_SECONDS = 60

INITIAL_DELAY = 10
BACKOFF = 2
MAX_DELAY = 80
MAX_RETRIES = 15

# 7GiB file size maximum (1024 * 1024 * 1024 * 7).
# See: model service: src/main/java/com/nvidia/ngc/modelservice/rest/commands/v1/common/AbstractUploadFileCommand.java
# for where this value is stored server-side.
MAX_HTTP_VERSION_FILE_SIZE = 7516192768
MULTIPART_ENCODER_OVERHEAD_BYTES = 123
MULTIPART_ENCODER_FILENAME_FIELD_OVERHEAD_BYTES = 13

INSUFFICIENT_STORAGE_MESSAGE = "Insufficient storage. Please expand the storage space and retry the upload."


def jitter_retry(exception_to_check, delay=INITIAL_DELAY, backoff=BACKOFF, tmax_delay=MAX_DELAY):  # noqa: D103
    def retry_this(f):
        @wraps(f)
        def f_retry(*args, **kwargs):
            retry_count = MAX_RETRIES
            mdelay = delay
            while True:
                try:
                    return f(*args, **kwargs)
                except exception_to_check as why:
                    # Hacky: For gRPC, enables us to stop the upload with ctrl+c and exit cleanly. Otherwise
                    # control is never returned to the user.
                    try:
                        coordinator = kwargs["transfer_coordinator"]
                        if coordinator.done():
                            return None
                    except KeyError:
                        pass

                    if retry_count <= 0:
                        raise NgcException(
                            f"Maximum retry attempts reached ({MAX_RETRIES}). Unable to complete transfer."
                        ) from None

                    # display retry message to overwrite status bar when server encouters transfer error exception
                    retry_msg_string = ("{}{}{:<120}").format(
                        "\r[Transfer Error] Retrying in ", str(mdelay), " seconds..."
                    )
                    try:
                        printer = kwargs["printer"]
                        if printer:
                            printer.print_ok(retry_msg_string)
                    except KeyError:
                        pass

                    logger.debug("%s, retrying in %s seconds", str(why), mdelay)
                    time.sleep(mdelay)
                    mdelay = random.randrange(
                        0,
                        min(
                            tmax_delay,
                            int(delay * backoff ** (MAX_RETRIES - retry_count + 1)),
                        ),
                    )
                    retry_count -= 1
                    logger.debug("Max transfer delay reached. Retries remaining: %d", retry_count)

                except AuthenticationException:
                    # we don't want to sleep in case of authentication error, just need a new token
                    # before raising this exception we need to make sure that we are actually fetching new token
                    # with the new request
                    logger.debug("Retrying with new jwt token")

        return f_retry

    return retry_this


class Adapter:  # noqa: D101
    renew = True

    def __init__(self, url, client=None, org=None, team=None, transfer_type=None):
        self._span = GetTracer().get_span()
        self.url = url
        self._client = client
        self._org = org
        self._team = team
        self.transfer_type = transfer_type

    @staticmethod
    def _parse_api_response(response):
        logger.debug("Response is: %s", response.text)
        raise_for_status(response)
        create_api_error_from_http_exception(response)

    def get_token(self):  # noqa: D102
        _org = self._org or self._client.config.org_name
        _team = self._team or self._client.config.team_name
        renew = Adapter.renew
        Adapter.renew = False
        return self._client.authentication.get_token(org=_org, team=_team, renew=renew)

    def __repr__(self):  # noqa: D105
        return "{}(url={})".format(self.__class__.__name__, self.url)


class HTTPDownloadAdapter(Adapter):  # noqa: D101
    # TODO: See how similar this one is with connection.py now
    @jitter_retry(HTTP_RETRYABLE_ERRORS)
    def submit_request(  # noqa: D102
        self,
        fileobj,
        download_manager,
        extra_headers=None,
        allow_redirects=False,
        suffix_url=None,
        params=None,
        **_kwargs,
    ):
        # If this was started from a new process, the active span will break, but the parent span should be stored
        # during the init phase of every adapter. This updates the span in this process to allow the trace to attach
        # to the main process' spans.
        if GetTracer().get_span() is None:
            GetTracer().update_span(span=self._span)
        headers = extra_headers or {}
        # we need to implement token caching for more speed up
        token = self.get_token()
        url = posixpath.join(self.url, quote(suffix_url)) if suffix_url else self.url
        if params:
            url = posixpath.join(url, params)

        # ignore SSL warnings
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        if token:
            headers["Authorization"] = "Bearer " + base64.b64encode(token.encode("utf-8")).decode("utf-8")
        headers["User-Agent"] = f"{USER_AGENT} {NGC_CLI_USER_AGENT_TEXT}" if NGC_CLI_USER_AGENT_TEXT else USER_AGENT
        debug_headers = deepcopy(headers)
        if "Authorization" in debug_headers:
            debug_headers["Authorization"] = mask_string(debug_headers["Authorization"])
        logger.debug("Headers:")
        logger.debug(debug_headers)
        with TracedSession() as session:
            response = session.request(
                "GET",
                url,
                operation_name="http download request",
                headers=headers,
                timeout=REQUEST_TIMEOUT_SECONDS,
                allow_redirects=allow_redirects,
                stream=True,
                proxies=getproxies(),
            )
            # pylint: disable=no-member
            logger.debug("Response for url %s: status: %s", url, response.status_code)
            if response.status_code == http.client.OK:
                return response

            # pylint: disable=no-member
            if http.client.BAD_REQUEST <= response.status_code <= http.client.INSUFFICIENT_STORAGE:
                logger.debug(response.text)
                # pylint: disable=no-member
                if response.status_code in [
                    http.client.INTERNAL_SERVER_ERROR,
                    http.client.BAD_GATEWAY,
                    http.client.SERVICE_UNAVAILABLE,
                ]:
                    raise NgcAPIRetryableError("internal server error, can be retried", response)

                # pylint: disable=no-member
                if response.status_code == http.client.UNAUTHORIZED:
                    raise AuthenticationException("authentication error", response)

                # pylint: disable=no-member
                if response.status_code == http.client.NOT_FOUND:
                    logger.debug("File '%s' not found on the remote server.", fileobj.name)
                    download_manager.transfer_coordinator.message("{} not found, skipping.".format(fileobj.name))
                    raise FileNotFoundError(fileobj.name + " not found.")

        return self._parse_api_response(response)


class TransferState:  # noqa: D101
    def __init__(self, shared_meta):
        self._total_transferred = 0
        self._total_transferred_last_session = 0
        self._shared_meta = shared_meta

    def bytes_read(self, bytes_read):  # noqa: D102
        self._total_transferred_last_session = self._total_transferred
        self._total_transferred = bytes_read
        self._shared_meta.inc_transferred_size(self._total_transferred - self._total_transferred_last_session)

    def reset_on_error(self):  # noqa: D102
        self._shared_meta.inc_transferred_size(0 - self._total_transferred)


class HTTPUploadAdapter(Adapter):  # noqa: D101
    def _get_headers(self, filemeta, extra_headers, content_type):
        headers = extra_headers or {}
        headers["Expect"] = "100-continue"
        headers["User-Agent"] = f"{USER_AGENT} {NGC_CLI_USER_AGENT_TEXT}" if NGC_CLI_USER_AGENT_TEXT else USER_AGENT
        headers["Authorization"] = "Bearer " + base64.b64encode(self.get_token().encode("utf-8")).decode("utf-8")
        headers["Content-Type"] = content_type
        if filemeta.permissions:
            headers["file-permission"] = oct(filemeta.permissions)
        debug_headers = deepcopy(headers)
        if "Authorization" in debug_headers:
            debug_headers["Authorization"] = mask_string(debug_headers["Authorization"])
        logger.debug("Headers:")
        logger.debug(debug_headers)
        return headers

    @jitter_retry(HTTP_RETRYABLE_ERRORS)
    def submit_request(self, filemeta, extra_headers=None, transfer_coordinator=None, **_kwargs):  # noqa: D102
        # If this was started from a new process, the active span will break, but the parent span should be stored
        # during the init phase of every adapter. This updates the span in this process to allow the trace to attach
        # to the main process' spans.
        if GetTracer().get_span() is None:
            GetTracer().update_span(span=self._span)

        # Refuse to upload files larger than 7GiB. Requests (urllib3, Python's http lib) does not wait for the
        # response to the Expect: 100-continue header before streaming file contents. If the upload file size
        # exceeds the set limit on the server side, the server responds with 400/413 (Payload Too Large) and
        # drops the connection. Requests is still trying to upload the file, and eventually see
        # ('Connection aborted.', error(32, 'Broken pipe')).
        # SEE: http://nvbugs/200598394 for more details and links.
        if filemeta.size >= MAX_HTTP_VERSION_FILE_SIZE:
            raise NgcException(f"The file '{filemeta.abspath}' exceeds the maximum allowed file size of 7 GiB.")

        if transfer_coordinator.done():
            return

        with TracedSession() as session:
            logger.debug("Starting HTTP multipart upload of file %s", filemeta.abspath)
            shared_meta = transfer_coordinator.shared_meta
            state = TransferState(shared_meta)
            # session.mount('https://', HTTPAdapter(pool_connections=16, pool_maxsize=16))
            # build the url and make the request
            url = "{storage_url}/{file_name}".format(storage_url=self.url, file_name=filemeta.encoded_relpath)
            logger.debug("Upload URL: %s", url)

            # ignore SSL warnings
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

            def progress_callback(encoder):
                bytes_read = (
                    encoder.bytes_read
                    - MULTIPART_ENCODER_OVERHEAD_BYTES
                    - len(filemeta.encoded_relpath)
                    - MULTIPART_ENCODER_FILENAME_FIELD_OVERHEAD_BYTES
                )
                state.bytes_read(bytes_read)

            with open(filemeta.abspath, "rb") as stream:
                # stream.seek(0)
                monitor = MultipartEncoderMonitor.from_fields(
                    fields={"file": (filemeta.encoded_relpath, stream)},
                    callback=progress_callback,
                )

                headers = self._get_headers(filemeta, extra_headers, monitor.content_type)
                try:
                    response = session.put(
                        url=url,
                        data=monitor,
                        headers=headers,
                        operation_name="http upload request",
                        proxies=getproxies(),
                    )
                    logger.debug("Time taken for upload request: %s seconds", response.elapsed)
                except Exception:
                    state.reset_on_error()
                    raise
            # fetch new token if you get 401 from CSS
            # pylint: disable=no-member
            if response.status_code == http.client.OK:
                return

            # we have got error in uploading, we need to reset it 0, as everything is lost
            state.reset_on_error()

            # HTTP 400 BAD_REQUEST; HTTP 504 Gateway Timeout
            # pylint: disable=no-member
            if http.client.BAD_REQUEST <= response.status_code <= http.client.GATEWAY_TIMEOUT:
                logger.debug(response.text)
                # pylint: disable=no-member
                if response.status_code in (
                    http.client.INTERNAL_SERVER_ERROR,
                    http.client.BAD_GATEWAY,
                    http.client.SERVICE_UNAVAILABLE,
                ):
                    raise NgcAPIRetryableError("Internal server error, can be retried", response)

                # pylint: disable=no-member
                if response.status_code == http.client.UNAUTHORIZED:
                    logger.debug("Token expired. Fetching new token.")
                    raise AuthenticationException("authentication error", response)

                # HTTP 507 Insufficient Storage
                # pylint: disable=no-member
                if response.status_code == http.client.INSUFFICIENT_STORAGE:
                    raise InsufficientStorageException(INSUFFICIENT_STORAGE_MESSAGE)

            self._parse_api_response(response)


class GRPCUploadAdapter(Adapter):  # noqa: D101
    RESPONSE_STATUS_STARTED = 1
    RESPONSE_STATUS_CHUNK = 2
    RESPONSE_STATUS_FINISHED = 3
    RESPONSE_STATUS_ERROR_GENERAL = 4
    RESPONSE_STATUS_ERROR_STORAGE_QUOTA_EXCEEDED = 507

    def __init__(
        self,
        destination,
        append_dataset=False,
        resume_dataset=False,
        owner_id=None,
        owner_org=None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.destination = destination
        self._skip_bytes = 0
        self._file_bytes_sent = 0
        self.append_dataset = append_dataset
        self.resume_dataset = resume_dataset
        self.owner_id = owner_id
        self.owner_org = owner_org

    def _file_header(self, filemeta):
        """Yields a header chunk as the first chunk for each new file uploaded."""  # noqa: D401
        if self.destination:
            file_path = str(pathlib.PurePosixPath(self.destination).joinpath(filemeta.relpath))
        else:
            file_path = filemeta.relpath
        return PutRequest(key=PutRequest.Key(key=file_path, requestContinuation=True, permission=filemeta.permissions))

    def _chunk_file(self, filemeta, transfer_coordinator, barrier):
        """Yields gRPC-encapsulated chunks from a file based on constant BUFFER_SIZE.

        Also increments the total bytes sent for status updates.
        """  # noqa: D401
        logger.debug("Yielding file header for %s", filemeta.abspath)
        yield self._file_header(filemeta)

        if self.transfer_type == "dataset":
            logger.debug("Reaching barrier from thread %d", threading.get_ident())
            barrier.wait()

        logger.debug(
            "skip_bytes is %d; filemeta.size is %d, append_dataset is %s",
            self._skip_bytes,
            filemeta.size,
            self.append_dataset,
        )
        if self.append_dataset and (self._skip_bytes == filemeta.size):
            logger.debug("File %s already uploaded. Ending file upload.", filemeta.abspath)
            yield PutRequest(chunk=PutRequest.Chunk(last=True))
            return

        logger.debug("Chunking file %s", filemeta.abspath)
        yield from self._yield_content_chunks(filemeta, transfer_coordinator)

    def _yield_content_chunks(self, filemeta, transfer_coordinator):
        shared_meta = transfer_coordinator.shared_meta

        with open(filemeta.abspath, "rb") as f:
            curr_position = 0
            while not transfer_coordinator.done():
                b = f.read(GRPC_BUFFER_SIZE)
                if b:
                    byte_length = len(b)
                    shared_meta.inc_transferred_size(byte_length)
                    self._file_bytes_sent += byte_length
                    # Note: position isn't used by DSS anymore - legacy code
                    grpc_chunk = PutRequest.Chunk(last=False, data=b, position=curr_position)
                    yield PutRequest(chunk=grpc_chunk)
                    curr_position += byte_length
                else:
                    # Tells gRPC server this is the last chunk for this file
                    grpc_chunk = PutRequest.Chunk(last=True)
                    yield PutRequest(chunk=grpc_chunk)
                    break
        logger.debug("Transferred %d bytes from file %s", self._file_bytes_sent, filemeta.abspath)

    @jitter_retry(GRPC_RETRYABLE_ERRORS)
    def submit_request(self, client, filemeta, transfer_coordinator=None, **_kwargs):
        """Logic for uploading datasets and workspaces with gRPC."""
        # Dataset uploads require a synchronization point (barrier) to check how many bytes have already
        # been uploaded:
        #  - All dataset upload paths require checking how many bytes have been uploaded in case a timeout
        #    occurs and we restart the upload. Without checking this, we can reupload existing bytes
        #    into the same file and corrupt the file. This is because all operations are effectively appending
        #    to a file and we cannot overwrite bytes/files.
        #  - append operations for adding files to a dataset skip files already uploaded, so we check if the
        #    bytes received by the server match the file size. If they match, we skip uploading.
        barrier = threading.Barrier(2)

        auth_token = self.get_token()
        if not auth_token:
            raise AuthenticationException("Failed to retrieve an auth token for upload.")

        try:
            # The Python gRPC client is inherently asynchronous when it streams gRPC requests
            # to the server and we need to stop the client from consuming the rest of the file
            # chunk generator until we receive RESPONSE_STATUS_STARTED.
            #
            # On timeout, will raise DEADLINE_EXCEEDED for status_code.value
            metadata = [
                (b"jwt", auth_token),
                (b"id", transfer_coordinator.transfer_id),
                (b"type", self.transfer_type),
                (b"x-nvidia-fss-service", "grpc"),
            ]
            if self.owner_id and self.owner_org:
                metadata.append((b"owner-client-id", str(self.owner_id)))
                metadata.append((b"org-name", self.owner_org))

            responses = client.Put(
                self._chunk_file(filemeta, transfer_coordinator, barrier),
                metadata=metadata,
            )
            for response in responses:
                if transfer_coordinator.done():
                    return

                logger.debug(
                    "Received message. Status: %s. File: %s. Message %s.",
                    response.status,
                    response.fileName,
                    response.message,
                )

                # Clauses ordered in frequency so we exit early in the most likely cases.
                if response.status == self.RESPONSE_STATUS_STARTED:
                    logger.debug(
                        "Received response status: STARTED. Skipping %d bytes ahead.",
                        response.totalTransfered,
                    )
                    self._skip_bytes = response.totalTransfered
                    if self.transfer_type == "dataset":
                        logger.debug(
                            "Reached the response barrier on thread %d",
                            threading.get_ident(),
                        )
                        barrier.wait()

                if response.status == self.RESPONSE_STATUS_FINISHED:
                    return

                if response.status == self.RESPONSE_STATUS_ERROR_GENERAL:
                    raise NgcAPIRetryableError("Internal server error: {}. Retrying.".format(response.message))
                if response.status == self.RESPONSE_STATUS_ERROR_STORAGE_QUOTA_EXCEEDED:
                    raise InsufficientStorageException(INSUFFICIENT_STORAGE_MESSAGE)

        except grpc.FutureCancelledError:
            logger.debug("gRPC worker was cancelled.")
            raise

        except grpc.RpcError as err:
            # pylint: disable=no-member
            if err.code() == grpc.StatusCode.DATA_LOSS:
                logger.debug(
                    "Error uploading due to data loss. Retrying upload of %s from the beginning.",
                    filemeta.abspath,
                )
            # pylint: disable=no-member
            elif err.code() == grpc.StatusCode.DEADLINE_EXCEEDED:
                logger.debug("gRPC timeout. Retrying upload of file %s", filemeta.abspath)
            else:
                logger.debug(
                    "Unexpected gRPC error encountered: %s (err code: %s). Retrying.",
                    str(err),
                    err.code(),
                )

            self._reset_uploaded_bytes(transfer_coordinator)
            raise err

    def _reset_uploaded_bytes(self, transfer_coordinator):
        """Resets shared state by the internal counter and resets the internal counter to zero."""  # noqa: D401
        shared_meta = transfer_coordinator.shared_meta
        shared_meta.dec_transferred_size(self._file_bytes_sent)
        self._file_bytes_sent = 0
