#
# Copyright (c) 2018-2020, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from itertools import chain
import logging
import os
import re

import psutil

from ngcbase.errors import NgcException
from ngcbase.printer.transfer import TransferPrinter
from ngcbase.transfer.download import (
    MultiFileDownloadManager,
    ZipDownloadTransferManager,
)
from ngcbase.transfer.utils import (
    _filter_child_directories,
    _get_ancestors,
    _parent_exists,
    _see_if_file_in_dirs,
)
from ngcbase.util.file_utils import (
    glob_filter_in_paths,
    glob_filter_out_paths,
    human_size,
    TemporaryFileCreator,
)

logger = logging.getLogger(__name__)


class TransferController:  # noqa: D101
    def __init__(self, transfer_id, transfer_config=None, dataset_service_enabled=False, display_id=None, client=None):
        self._manager = None
        self._transfer_config = transfer_config
        self._transfer_id = transfer_id
        self.printer = TransferPrinter(client.config)
        self._dataset_service_enabled = dataset_service_enabled
        self._display_id = display_id
        self._client = client

    @staticmethod
    def _get_total_files(files, dirs):
        total_files = 0
        if files:
            total_files += len(files)
        if dirs:
            total_files += len(dirs)
        return total_files

    def download_files_submission(  # noqa: D102
        self,
        dest,
        files,
        dirs,
        file_patterns=None,
        dir_patterns=None,
        exclude_patterns=None,
        dry_run=False,
        params=None,
        allow_redirects=False,
        exit_on_shutdown=True,
    ):
        logger.debug("Downloading multiple files")
        file_paths = files.keys()
        # if no file/dir patterns given, do not filter these at all
        if file_patterns or dir_patterns:
            file_paths = glob_filter_in_paths(file_paths, file_patterns)
            dirs = glob_filter_in_paths(dirs, dir_patterns)

        # TODO - how do you filter a file that exists in dirs?
        # filter out the files which matches the exclude pattern
        file_paths_after_exclude = glob_filter_out_paths(file_paths, exclude_patterns)
        # Get files which were filtered by the exclude pattern in order to remove directories later which contain these
        # files.
        files_filtered_by_exclude = [file_ for file_ in file_paths if file_ not in file_paths_after_exclude]
        file_paths = file_paths_after_exclude
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

        # Do not download dirs which contain filtered out individual file paths, since those file paths will get
        # downloaded along with the directory.
        # 1: get a list from dirs that includes directories containing the excluded files in (1)
        dirs_with_filtered_out_file_paths = []
        for dir_ in dirs:
            if any(_see_if_file_in_dirs(file_, [dir_]) for file_ in files_filtered_by_exclude):
                dirs_with_filtered_out_file_paths.append(dir_)
        # 2: remove directories which contain excluded files
        dirs = [dir_ for dir_ in dirs if dir_ not in dirs_with_filtered_out_file_paths]
        # 3: remove files that are in directories excluded by an exclude pattern
        file_paths = [file_ for file_ in file_paths if not _see_if_file_in_dirs(file_, dirs_filtered_by_exclude)]

        # filter all the child directories so that they don't get downloaded again.
        # do this last or it interferes with prior user filtering
        dirs = _filter_child_directories(dirs)

        # filter files if they are in the dir
        if file_paths and dirs:
            file_paths = [f for f in file_paths if not _see_if_file_in_dirs(f, dirs)]

        if not any([file_paths, dirs]):
            raise NgcException("No files to download, exiting.")

        # Sum the sizes of individual files
        download_size = sum(files[file_path] for file_path in file_paths)
        # Sum the size of all files in the directories that will be downloaded
        for dir_ in dirs:
            # NOTE: need to remove "/" from directory paths because the paths are specified absolute paths in storage
            individual_file_paths_from_dirs = [
                file_path for file_path in files.keys() if file_path.startswith(re.sub(r"^\/", "", dir_))
            ]
            download_size += sum(files[file_path] for file_path in individual_file_paths_from_dirs)

        if dry_run:
            self.printer.print_ok("Total size of the download: {}".format(human_size(download_size)))
            return

        disk_info = psutil.disk_usage(os.path.abspath(dest))
        if download_size > disk_info.free:
            raise NgcException(
                "Not enough space on local disk. Download size: {dl}  Available space: {available}".format(
                    dl=human_size(download_size), available=disk_info.free
                )
            )

        logger.debug("files to download: %s", file_paths)
        logger.debug("directories to download: %s", dirs)
        self._manager = MultiFileDownloadManager(
            transfer_id=self._transfer_id,
            transfer_config=self._transfer_config,
            file_count=self._get_total_files(file_paths, dirs),
            transfer_path=dest,
            dataset_service_enabled=self._dataset_service_enabled,
            display_id=self._display_id,
            client=self._client,
        )

        self._manager.transfer(
            files=set(file_paths),
            dirs=dirs,
            params=params,
            allow_redirects=allow_redirects,
            exit_on_shutdown=exit_on_shutdown,
        )

    def download_zip_submission(  # noqa: D102
        self,
        dest,
        do_zip=False,
        allow_redirects=False,
        exit_on_shutdown=True,
        disable_status_monitor=False,
        dump_transfer_summary=True,
        params=None,
    ):
        self._manager = ZipDownloadTransferManager(
            transfer_id=self._transfer_id,
            transfer_config=self._transfer_config,
            file_count=1,
            transfer_path=dest,
            dataset_service_enabled=self._dataset_service_enabled,
            display_id=self._display_id,
            client=self._client,
        )

        temp_name = "{}.zip".format(self._transfer_id)

        with TemporaryFileCreator(temp_name, dest) as zip_filename:
            self._manager.transfer(
                exit_on_shutdown=exit_on_shutdown,
                disable_status_monitor=disable_status_monitor,
                dump_transfer_summary=dump_transfer_summary,
                file_name=zip_filename,
                unzip=(not do_zip),
                allow_redirects=allow_redirects,
                params=params,
            )
