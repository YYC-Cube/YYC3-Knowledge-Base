#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from __future__ import division

from argparse import ArgumentTypeError
from builtins import round
import errno
from fnmatch import fnmatch
import logging
import math
import numbers
import os
import os.path
import pathlib
import platform
import re
import shutil
import stat
import sys
import tempfile
from urllib.parse import quote

import psutil

from ngcbase import environ
from ngcbase.constants import (
    KiB,
    MAX_HTTP_VERSION_FILE_SIZE,
    MiB,
    UPLOAD_INVALID_FILE_PATTERN,
)
from ngcbase.errors import NgcException, ValidationException

logger = logging.getLogger(__name__)


def scantree(path, onerror=None, followlinks=False):
    """Like os.walk, but yields raw DirEntry objects (implement Path-like APIs)
    for files and directories under a top directory from os.scandir instead of a
    tuple of (dirpath, dirnames, filenames).

    NOTE: This does *not* return the top-level directory entry, only everything underneath.

    Raises `NotADirectoryError` if you pass a filename instead of a directory
    """  # noqa: D205
    walk_dirs = []
    try:
        scanner = os.scandir(path)
    except NotADirectoryError:
        raise
    except OSError as err:
        if onerror:
            onerror(err)
        return

    with scanner:
        while True:
            try:
                entry = next(scanner)
            except StopIteration:
                break
            except OSError as err:
                if onerror:
                    onerror(err)
                return

            try:
                is_dir = entry.is_dir()
            except OSError:
                # see stdlib os.walk implementation
                is_dir = False

            try:
                is_symlink = entry.is_symlink()
            except OSError:
                # If is_symlink() raises an OSError, consider that the
                # entry is not a symbolic link, same behaviour than
                # os.path.islink().
                is_symlink = False

            if is_dir:
                if followlinks:
                    walk_into = True
                else:
                    walk_into = not is_symlink

                if walk_into:
                    walk_dirs.append(entry)

            # Regardless if we need to recurse, we want to yield it
            if followlinks:
                yield entry
            else:
                if not is_symlink:
                    yield entry

    for new_path in walk_dirs:
        yield from scantree(new_path, onerror, followlinks)


def delete_directories(path, pattern=None):
    """If a pattern is provided, delete all directories in path that match it. Otherwise, delete path."""
    try:
        if pattern:
            for content in os.listdir(path):
                abs_content_path = os.path.join(path, content)
                if re.search(pattern, content) and os.path.isdir(abs_content_path):
                    shutil.rmtree(abs_content_path)
        elif os.path.isdir(path):
            shutil.rmtree(path)
    except OSError as ose:
        raise NgcException(str(ose)) from None


def dir_hierarchy_size(path):  # noqa: D103
    total_size = 0
    top = pathlib.Path(path)

    try:
        total_size += get_path_block_size(top, blocksize=512)

        for entry in scantree(path):
            try:
                total_size += get_path_block_size(entry, blocksize=512)
            except OSError as err:
                if err.errno == errno.EACCES:
                    logger.debug(
                        "Could not read file %s when measuring disk space.",
                        err.filename,
                    )
                    continue
                raise err
    except OSError:
        err_msg = "Error reading files in directory path '{}'. There may be too many levels of symbolic links.".format(
            path
        )
        return err_msg

    return human_size(total_size)


def get_path_block_size(entry, blocksize=512):
    """Return a file's size multiplied by blocksize.

    Intended to be used with Path-like objects (DirEntry, pathlib.Path, etc.)

    Windows reports size of entry in bytes, Unix systems report blocksize, like `du`.
    """
    if platform.system() == "Windows":
        return entry.stat().st_size

    return entry.stat().st_blocks * blocksize


def get_cli_config_dir():  # noqa: D103
    base_path = environ.NGC_CLI_HOME or "~"
    path = os.path.join(base_path, ".ngc")
    expanded_path = os.path.expanduser(path)
    return expanded_path


def get_cli_token_file():
    """Returns token file path."""  # noqa: D401
    return os.path.join(get_cli_config_dir(), "tokens.json")


def get_mem_usage():
    """Returns information about system memory usage.

    Returns a tuple containing three values:
      * a string describing total available memory in GB
      * a string describing current free memory in GB
      * a float describing current usage
    """  # noqa: D401
    memory = psutil.virtual_memory()
    total_mem = human_size(memory.total)
    free_mem = human_size(memory.free)
    return total_mem, free_mem, memory.percent


def get_disk_usage(directory):
    """Returns information about disk space given a directory on a filesystem.

    Return tuple contains three values:
        * a string describing total size of partition in GB
        * a string describing total free space in GB, excluding reserved space
        * a float describing current usage
    """  # noqa: D401
    if "~" in directory:
        directory = os.path.expanduser(directory)

    usage = psutil.disk_usage(directory)

    tot_size = human_size(usage.total)
    tot_free = human_size(usage.free)
    return tot_size, tot_free, usage.percent


def convert_mib_to_gib(input_in_mib):  # noqa: D103
    return input_in_mib / KiB


def convert_mib_to_bytes(input_in_mib):  # noqa: D103
    return input_in_mib * MiB


def get_incremented_filename(path):
    """Adds a numeric extension to a file path to ensure uniqueness.

    If the file name has a single period, it is assumed that it is in "name.extension" format, and
    the extension is added to the file name. Example: "foo.txt" would be incremented to "foo-0.txt"

    With any other count of periods, assume that the file name is a single unit, and append the
    extension to the end. Example: "foo-1.2.3" would be incremented to "foo-1.2.3-0"
    """  # noqa: D401
    if not os.path.exists(path):
        return path
    dirpath, fname = os.path.split(path)
    # The separator can be with a forward slash or a backslash, and isn't always the same as os.path.sep
    sep = path[len(dirpath)] if dirpath else ""
    periods = fname.count(".")
    if periods == 1:
        pattern = "{0}-{1}{2}"
        root_name, extension = os.path.splitext(fname)
    else:
        # Don't treat as 'name.ext'
        pattern = "{0}-{1}"
        root_name = fname
        extension = ""

    i = 1
    while os.path.exists(os.path.join(dirpath, fname)):
        fname = pattern.format(root_name, i, extension)
        i += 1
    return f"{dirpath}{sep}{fname}"


def _is_integer(val):
    """Quick and dirty way to determine if the provided value is an integer.

    CLI used to use Decimal()._isinteger here.
    """
    return val == int(val)


def human_size(num_bytes, precision=2, force_decimal=False):  # noqa: D103
    if num_bytes is None:
        return ""
    if not isinstance(num_bytes, numbers.Number):
        raise TypeError("Bytes must be a numerical value")
    if num_bytes <= 0:
        return "0 B"

    units = ("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
    digit_groups = max(0, math.floor(math.log10(num_bytes) / math.log10(KiB)))

    if digit_groups >= len(units):
        raise ValueError("Cannot format greater than 999 YB.")

    num_val = num_bytes / math.pow(KiB, digit_groups)
    num_val = round(num_val, precision)

    if force_decimal:
        formatted = f"{num_val:.{precision}f}"
    elif _is_integer(num_val):
        formatted = "%d" % num_val
    else:
        formatted = "%g" % num_val

    return "{0} {1}".format(formatted, units[int(digit_groups)])


def glob_match_path(path, patterns):
    """Returns the first pattern that matches the path, None otherwise."""  # noqa: D401
    if patterns:
        for pattern in patterns:
            if fnmatch(path, pattern):
                # TODO: when --dry-run is implemented for all commands, return just True
                return pattern
    return None


def glob_filter_out_paths(paths, patterns):
    """Returns a list of file paths that do not match the supplied patterns. If no patterns are supplied,
    the original list of paths is returned.
    """  # noqa: D205, D401
    if patterns:
        return [path for path in paths if not glob_match_path(path, patterns)]
    return paths


def glob_filter_in_paths(paths, patterns):
    """Returns a list of file paths that match any of the supplied patterns."""  # noqa: D401
    # TODO: when --dry-run is implemented for all commands, remove the two lists below:
    filtered_paths = []
    matched_patterns = set()
    if patterns:
        # TODO: when --dry-run is implemented for all commands, replace everything in this if statement with:
        # return [path for path in paths if glob_match_path(path, patterns)]
        for path in paths:
            matched_pattern = glob_match_path(path, patterns)
            if matched_pattern:
                filtered_paths.append(path)
                matched_patterns.add(matched_pattern)
        for unmatched_pattern in set(patterns) - matched_patterns:
            logger.info("%s not found, skipping.", unmatched_pattern)
        return filtered_paths
    return []


def filter_path(file_path, include_patterns=None, exclude_patterns=None):  # noqa: D103
    if exclude_patterns and glob_match_path(file_path, exclude_patterns):
        return False
    if include_patterns is not None:
        return bool(glob_match_path(file_path, include_patterns))
    return True


def filter_directory_contents(source_path, include_patterns=None, exclude_patterns=None):  # noqa: D103
    # If the source path is a file, the basename is returned instead.
    if os.path.isfile(source_path) and filter_path(source_path, include_patterns, exclude_patterns):
        yield os.path.basename(source_path)
    else:
        for entry in scantree(source_path):
            rel_file_path = os.path.relpath(entry.path, source_path)
            if entry.is_file() and filter_path(rel_file_path, include_patterns, exclude_patterns):
                yield rel_file_path


def tree_size_and_count(
    path,
    omit_links,
    show_progress=False,
    exclude_patterns=None,
    print_paths=False,
    dryrun_option=False,
    check_max_size=False,
):
    """Returns tuple of two integers representing total file size and file count.

    If `check_max_size` is True, files are checked against the maximum file size defined in
    constants.MAX_HTTP_VERSION_FILE_SIZE, and an NgcException will be raised if any exceed that limit.
    """  # noqa: D401
    exclude_patterns = exclude_patterns or []
    total_count = 0
    total_size = 0
    followlinks = not omit_links
    too_big_files = []
    try:
        for i, entry in enumerate(scantree(path, followlinks=followlinks)):
            # Entry full name is simply the file/dir path relative to the source path passed in by the user.
            entry_full_name = re.sub(re.escape(path), "", entry.path)
            if glob_match_path(entry_full_name, exclude_patterns):
                continue

            if entry.is_file() and (not entry.is_symlink() or followlinks):
                try:
                    verify(entry_full_name)
                except ValidationException:
                    continue

                if not dryrun_option and show_progress and (i % 100000 == 0):
                    sys.stdout.write(".")
                    sys.stdout.flush()

                if print_paths:
                    logger.info(entry_full_name)

                file_size = entry.stat().st_size
                if check_max_size and file_size > MAX_HTTP_VERSION_FILE_SIZE:
                    too_big_files.append((entry_full_name, file_size))
                    continue
                total_size += file_size
                total_count += 1
            elif entry.is_symlink() and not os.path.exists(entry):
                # this is not a warning, as it is not intended to break scripts.
                logger.info("Skipping: %s (file is a symbolic link that points to nothing.)", entry_full_name)
    except NotADirectoryError:
        # Corner case - exclude pattern matches a single file to be uploaded.
        if glob_match_path(path, exclude_patterns):
            return 0, 0
        file_path = pathlib.Path(path)
        if print_paths:
            logger.info(str(file_path))
        return file_path.stat().st_size, 1

    if too_big_files:
        # Will only be populated if `check_max_size` is True
        file_list = "\n".join([f"  {tbf[0]}: {human_size(tbf[1])}" for tbf in too_big_files])
        max_size = human_size(MAX_HTTP_VERSION_FILE_SIZE)
        msg = f"The following file(s) exceed the maximum file size limit of {max_size}:\n{file_list}"
        raise NgcException(msg)
    if show_progress:
        sys.stdout.write("\n")
        sys.stdout.flush()
    return total_size, total_count


def get_path_permissions(path):
    """Returns permissions of a given path-like object (DirEntry, pathlib.Path)."""  # noqa: D401
    if platform.system() == "Windows":
        return None
    return stat.S_IMODE(path.stat().st_mode)


def mkdir_path(path):  # noqa: D103
    if path:
        try:
            os.makedirs(path)
        except os.error as e:
            if e.errno == errno.EEXIST:
                return  # not a problem, we want it to exist
            if e.errno == errno.EACCES:
                raise OSError("Permission denied while creating at {}".format(os.path.abspath(path))) from None
            if e.errno == errno.EROFS:
                raise OSError("Read-only file system, unable to create at {}".format(os.path.abspath(path))) from None
            # else we just re-raise the error
            raise


def verify(relpath):  # noqa: D103
    if relpath and not re.search(UPLOAD_INVALID_FILE_PATTERN, relpath):
        raise ValidationException(
            "File name '{}' does not match the regex pattern: {}".format(relpath, UPLOAD_INVALID_FILE_PATTERN)
        )


class FileMeta:  # noqa: D101
    def __init__(self, entry, relpath):
        try:
            self.abspath = entry.path
        except AttributeError:
            self.abspath = str(entry.absolute())

        self.relpath = relpath
        self.size = entry.stat().st_size
        self.stream = None
        self.permissions = get_path_permissions(entry)
        verify(self.relpath)

    @property
    def encoded_relpath(self):  # noqa: D102
        return quote(self.relpath)

    @property
    def basename(self):  # noqa: D102
        return os.path.basename(self.encoded_relpath)


class TemporaryFileCreator:  # noqa: D101
    def __init__(self, file_name, dir_name=tempfile.mkdtemp()):
        self._file_name = file_name
        self._root_dir = dir_name

    def __enter__(self):  # noqa: D105
        return os.path.join(self._root_dir, self._file_name)

    def __exit__(self, _exc_type, _exc_val, _exc_tb):  # noqa: D105
        try:
            os.remove(os.path.join(self._root_dir, self._file_name))
        # OSError: file-system related errors
        except OSError:
            # See if you can remove it
            pass


def get_file_contents(filename, arg_name, binary=False):
    """Read contents of a file into a string.

    filename - filename to read from
    arg_name - arg name that triggered the read, used for error msg.
    binary - indicates that the file contents are binary

    This is used by registry commands to read in large large data fields.
    """
    if filename is None:
        return None
    mode = "rb" if binary else "r"
    try:
        with open(filename, mode, encoding="utf-8") as fd:
            data = fd.read()
            return data
    except IOError as e:
        raise ArgumentTypeError("Invalid argument for '{}' - '{}'".format(arg_name, e)) from None


def get_transfer_path(path):  # noqa: D103
    transfer_path = os.path.abspath(path)
    if not os.path.exists(transfer_path):
        raise NgcException(f"The path: '{transfer_path}' does not exist.")
    return transfer_path


def helm_format(name, vers):  # noqa: D103
    return f"{name}-{vers}.tgz"
