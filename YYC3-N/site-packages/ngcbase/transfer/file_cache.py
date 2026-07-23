#
# Copyright (c) 2018-2020, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import logging
import os

from ngcbase.errors import NgcException
from ngcbase.util.file_utils import get_cli_config_dir, mkdir_path


class FileCache:
    """Provides an interface to file-based cache stored in temp directory.

    Used to record upload progress during multi-file uploads.
    The cache is retrieved and referenced during upload
    resume operations.  When a dataset has been completely
    uploaded, the cache file is removed.
    """

    def __init__(self, ace_name, dataset_id, location, resume=False):
        self.logger = logging.getLogger(__name__)
        # set containing the list of files already transferred
        self.cache = set()
        self.dataset_id = dataset_id
        self.location = location
        cache_name = self._get_cache_name_placeholder.format(
            ace_id=ace_name, dataset_id=dataset_id, filename=os.path.basename(location)
        )
        self.cache_path = os.path.join(self.get_temp_path(), cache_name)
        self.resume = resume

        if self.resume:
            self._load_cache()
        else:
            self._create_cache()

    def __contains__(self, key):  # noqa: D105
        return key in self.cache

    @staticmethod
    def get_temp_path():
        """Gets temp folder for storing the cache file."""  # noqa: D401
        temp_folder = get_cli_config_dir()
        # TODO: Change the directory name to something more meaningful, like 'upload_cache'
        temp_path = os.path.join(temp_folder, "ngc_cli")
        mkdir_path(temp_path)
        return temp_path

    @property
    def _get_cache_name_placeholder(self):
        return "{ace_id}_{dataset_id}_{filename}.txt"

    def _create_cache(self):
        """Create cache path and open for writing if it does not already exist."""
        self.logger.debug("Creating new cache at %s", self.cache_path)
        if not os.path.exists(self.cache_path):
            with open(self.cache_path, "w", encoding="utf-8"):
                pass
        else:
            self.logger.debug("Cache %s already exists", self.cache_path)

    def _load_cache(self):
        """Loads the cache containing a list of file names that have already
        been processed by the transfer system.
        """  # noqa: D205, D401
        exists = os.path.exists(self.cache_path)
        if self.resume and not exists:
            raise FileNotFoundError(
                f"Upload cache {self.cache_path} was not found "
                f"when attempting to resume upload for dataset {self.dataset_id}. "
                "Unable to resume upload."
            )
        if not self.resume and exists:
            raise NgcException(
                f"Found existing record of upload ({self.cache_path}) when attempting to upload a new dataset."
            )

        with open(self.cache_path, "r", encoding="utf-8") as f:
            for line in f:
                self.cache.add(line.strip())

    def put(self, key):
        """Puts key in cache."""  # noqa: D401
        # On Windows, Python does not open files with UTF-8 encoding by default
        with open(self.cache_path, "a", encoding="utf-8") as f:
            f.write("{0}\n".format(key))

    def remove_cache(self):
        """Remove cache file from disk."""
        if os.path.exists(self.cache_path) and os.path.isfile(self.cache_path):
            try:
                os.remove(self.cache_path)
            except IOError as err:
                self.logger.debug("Error encountered when removing file cache: %s", err)
