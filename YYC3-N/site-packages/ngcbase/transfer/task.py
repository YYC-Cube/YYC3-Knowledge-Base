#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import errno
import logging
import os
import pathlib
import queue
import re
import shutil
import zipfile

from ngcbase.constants import WIN_MAX_PATH_LENGTH
from ngcbase.errors import InsufficientStorageException, ValidationException
from ngcbase.util.file_utils import FileMeta, glob_match_path, scantree

logger = logging.getLogger(__name__)


class Task:
    """Task that are to be executed by the pool.

    ProcessPool only takes picklable tasks, so need to make sure all the kwargs can be pickle
    """

    def __init__(self, transfer_coordinator, callbacks=None, kwargs=None, printer=None):
        self._transfer_coordinator = transfer_coordinator
        self._submit_kwargs = kwargs or {}
        self._callbacks = callbacks or []
        self._printer = printer

    def __call__(self):
        """This is the callable for concurrent.futures for process pool and thread pools."""  # noqa: D401, D404
        try:
            if not self._transfer_coordinator.done():
                return self.submit(**self._submit_kwargs)
        except Exception as e:  # pylint: disable=broad-except
            self._set_exception(e)
        finally:
            self._run_callbacks()
        return None

    def _run_callbacks(self):
        try:
            for callback in self._callbacks:
                callback()
        except Exception as e:  # pylint: disable=broad-except
            self._set_exception(e)

    def _set_exception(self, exception):
        self._transfer_coordinator.set_exception(exception)

    def submit(self, **kwargs):
        """The method executed by the threadpool."""  # noqa: D401
        raise NotImplementedError("submit() must be implemented")

    def __repr__(self):  # noqa: D105
        return "{}({})".format(self.__class__.__name__, self._submit_kwargs)


class WriteFileTask(Task):  # noqa: D101
    # pylint: disable=arguments-differ
    # method adds args to base method
    def submit(self, fileobj, chunk, offset):  # noqa: D102
        to_write = len(chunk)
        fileobj.seek(offset)
        written = fileobj.write(chunk)
        fileobj.flush()

        if written != to_write:
            raise IOError(
                "bytes written ({}) to file {} do not match length of bytes to write: {}".format(
                    written, fileobj, to_write
                )
            )
        return written

    def __repr__(self):  # noqa: D105
        return "{}({} at offset {})".format(
            self.__class__.__name__,
            self._submit_kwargs.get("fileobj"),
            self._submit_kwargs.get("offset"),
        )


class DownloadAndWriteFileTask(Task):
    """Task to make a download request and then write the response chunks to a file."""

    # pylint: disable=arguments-differ
    def submit(  # noqa: D102
        self,
        adapter,
        fileobj,
        download_manager,
        extra_headers=None,
        allow_redirects=False,
        suffix_url=None,
        chunk_size=None,
        unzip_path=None,
        params=None,
    ):
        self._transfer_coordinator.shared_meta.inc_processed_files()
        try:
            response = adapter.submit_request(
                fileobj=fileobj,
                download_manager=download_manager,
                extra_headers=extra_headers,
                allow_redirects=allow_redirects,
                suffix_url=suffix_url,
                params=params,
                printer=self._printer,
            )
        except FileNotFoundError:
            fileobj.close()
            try:
                os.remove(fileobj.name)
            except OSError as err:
                logger.debug(
                    "OSError encountered when downloading file %s. %s",
                    fileobj.name,
                    err,
                )
            return None

        self.write_response_stream(fileobj, response, chunk_size)
        logger.debug("Done writing, closing file %s.", fileobj.name)
        self._transfer_coordinator.shared_meta.inc_transferred_files()
        return fileobj

    def write_response_stream(self, fileobj, response, chunk_size):  # noqa: D102
        logger.debug("Streaming response to file")
        offset = 0

        for chunk in response.iter_content(chunk_size=int(chunk_size)):
            if chunk:
                written = WriteFileTask(
                    self._transfer_coordinator,
                    kwargs={"fileobj": fileobj, "chunk": chunk, "offset": offset},
                )()

                offset += written
                self._transfer_coordinator.shared_meta.inc_transferred_size(written)
        fileobj.close()


class DownloadAndUnzipTask(DownloadAndWriteFileTask):  # noqa: D101
    # pylint: disable=arguments-differ
    def submit(  # noqa: D102
        self,
        adapter,
        fileobj,
        download_manager,
        extra_headers=None,
        allow_redirects=False,
        suffix_url=None,
        chunk_size=None,
        unzip_path=None,
        params=None,
    ):
        # TODO: Manage the files from this layer, not the FileDownloader layer
        self._transfer_coordinator.shared_meta.inc_processed_files()
        try:
            response = adapter.submit_request(
                fileobj=fileobj,
                download_manager=download_manager,
                extra_headers=extra_headers,
                allow_redirects=allow_redirects,
                suffix_url=suffix_url,
                params=params,
                printer=self._printer,
            )
        except FileNotFoundError:
            fileobj.close()
            try:
                logger.debug("Removing file %s.", fileobj.name)
                os.remove(fileobj.name)
            except OSError as err:
                logger.debug(
                    "OSError encountered when downloading file %s. %s",
                    fileobj.name,
                    err,
                )
            return None
        self.write_response_stream(fileobj, response, chunk_size)

        self._transfer_coordinator.shared_meta.inc_transferred_files()

        UnzipFileSubmission(
            transfer_coordinator=self._transfer_coordinator,
            kwargs={"fileobj": fileobj, "dest": unzip_path},
        )()

        RemoveFileTask(
            transfer_coordinator=self._transfer_coordinator,
            kwargs={"fileobj": fileobj.name},
        )()
        return unzip_path


class RenameTask(Task):
    """A task to rename a temporary file to its final filename."""

    # pylint: disable=arguments-differ
    # method adds args to base method
    def submit(self, old, new):  # noqa: D102
        logger.debug("Renaming %s to %s", old, new)
        shutil.move(old, new)


class RemoveFileTask(Task):
    """Task to remove a file."""

    # pylint: disable=arguments-differ
    def submit(self, fileobj):  # noqa: D102
        logger.debug("Removing file %s", fileobj)
        os.remove(fileobj)


class UnzipFileSubmission(Task):
    """This task opens a zip file for parallel unzipping submission.

    This task is executed after we recieve done to the coordinator
    """  # noqa: D404

    # pylint: disable=arguments-differ
    # method adds args to base method
    def submit(self, fileobj, dest):  # noqa: D102
        fileobj.close()
        logger.debug("unzipping %s to %s", fileobj.name, dest)
        try:
            with open(fileobj.name, "rb") as f:
                zf = zipfile.ZipFile(f.name)  # pylint: disable=consider-using-with
                zf.extractall(path=dest)
                num_files = len(zf.namelist())
                # -1 because the zip file counted as one
                self._transfer_coordinator.shared_meta.inc_transferred_files(num_files - 1)
        except os.error as e:
            if e.errno == errno.ENOENT:
                if os.name == "nt" and len(e.filename) > WIN_MAX_PATH_LENGTH:
                    raise OSError(
                        "Unable to unzip {}:  filename exceeds maximum character length for target OS".format(
                            fileobj.name
                        )
                    ) from None
            if e.errno == errno.EACCES:
                raise OSError(f"Permission denied while {fileobj.name} unzipping to {os.path.abspath(dest)}") from None
            if e.errno == errno.EROFS:
                raise OSError("Read-only file system, unable to unzip at {}".format(os.path.abspath(dest))) from None
            # else we just re-raise the error
            raise
        except zipfile.BadZipFile:
            self._transfer_coordinator.shared_meta.inc_transferred_files(num=-1)
            logger.debug("Caught the BadZipFile exception which might mean that the downloaded directory is empty.")
            if os.stat(fileobj.name).st_size != 0:
                raise
            try:
                os.mkdir(dest)
            except FileExistsError:
                return
            except OSError as ose:
                raise OSError(f"Failed to create empty directory {dest}: {ose}") from None


class StatusMonitorTask(Task):
    """This task monitors the progress of the transfer."""  # noqa: D404

    # pylint: disable=arguments-differ
    # method adds args to base method
    def submit(self, progress_callback):  # noqa: D102
        progress_callback(self._transfer_coordinator)


class UploadFileTask(Task):  # noqa: D101
    # pylint: disable=arguments-differ
    # method adds args to base method
    def submit(self, client, adapter, filemeta, extra_headers=None):  # noqa: D102
        # FIXME: This is redundant with another opening of the file in GRPCUploadAdapter
        with open(filemeta.abspath, "rb") as filemeta.stream:
            if not self._transfer_coordinator.done():
                adapter.submit_request(
                    client=client,
                    filemeta=filemeta,
                    extra_headers=extra_headers,
                    transfer_coordinator=self._transfer_coordinator,
                    printer=self._printer,
                )

                self._transfer_coordinator.shared_meta.inc_transferred_files()
            return filemeta

    def _set_exception(self, exception):
        if isinstance(exception, InsufficientStorageException):
            self._transfer_coordinator.set_exception(
                "You have exceeded the storage quota, Please expand your storage space."
            )
        else:
            self._transfer_coordinator.set_exception(exception)

    def __repr__(self):  # noqa: D105
        return "{}({})".format(self.__class__.__name__, self._submit_kwargs.get("filemeta").relpath)


class FilesToQueueTask(Task):  # noqa: D101
    def _can_transfer_file(self, entry, transfer_path, omit_links, exclude_patterns=None):
        try:
            # For multiple files (DirEntry obj)
            file_path = entry.path
        except AttributeError:
            # For single files (Path obj)
            file_path = str(entry.absolute())

        # 1. Remove the upload path specified by the user from the file_path.
        rel_file_path = re.sub(re.escape(transfer_path), "", file_path)
        # 2. If the exclude_pattern matches the path from (1), return None
        if glob_match_path(rel_file_path, exclude_patterns):
            return None

        if omit_links and entry.is_symlink():
            logger.info("Skipping link %s.", file_path)
            return None

        if file_path == transfer_path:
            # If absolute_file_path is equal dataset_path, we know we're dealing
            # with a single file. In this case, relative file_path is just the
            # file name.
            relative_file_path = entry.name
        else:
            relative_file_path = os.path.relpath(file_path, transfer_path)
            relative_file_path = os.path.normpath(relative_file_path).replace("\\", "/")

        try:
            file_meta = FileMeta(entry, relative_file_path)
        except ValidationException as ve:
            self._printer.print_error("{} - Skipping file.".format(ve))
            return None

        return file_meta

    def _yield_next_file(self, transfer_path, omit_links, exclude_patterns=None):
        transfer_path = os.path.normpath(transfer_path)
        try:
            for entry in scantree(transfer_path, followlinks=not omit_links):
                # Links are files too
                if entry.is_file():
                    yield self._can_transfer_file(
                        entry,
                        transfer_path,
                        omit_links,
                        exclude_patterns=exclude_patterns,
                    )
        except NotADirectoryError:
            path_obj = pathlib.Path(transfer_path)
            yield self._can_transfer_file(path_obj, transfer_path, omit_links, exclude_patterns=exclude_patterns)

    # pylint: disable=arguments-differ
    # method adds args to base method
    def submit(  # noqa: D102
        self,
        transfer_path,
        omit_links,
        resume_upload,
        upload_cache,
        threads,
        exclude_patterns=None,
    ):
        for task in self._yield_next_file(transfer_path, omit_links, exclude_patterns=exclude_patterns):
            if resume_upload:
                if task.abspath in upload_cache:
                    logger.debug("File %s found in cache. Skipping upload.", task.abspath)
                    self._transfer_coordinator.shared_meta.inc_processed_files()
                    continue

            if task:
                logger.debug("Putting new file in task queue - %s", task)
                self._transfer_coordinator.shared_meta.task_q.put(task)

        for _ in range(threads):
            # Sentinel for each thread to mark end of tasks
            self._transfer_coordinator.shared_meta.task_q.put(StopIteration)

        self._transfer_coordinator.shared_meta.files_finder_finished.set()


def yield_from_q(source_q):  # noqa: D103
    while True:
        try:
            item = source_q.get(timeout=1)
            if item is StopIteration:
                logger.debug("StopIteration found, no more files to upload.")
                source_q.task_done()
                break
        except queue.Empty:
            # Keep trying until StopIteration encountered
            continue

        logger.debug("Yielding a task from the queue")
        yield item
