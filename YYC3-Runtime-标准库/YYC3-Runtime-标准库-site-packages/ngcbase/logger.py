#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import http.client
import logging
import pathlib
import sys

from ngcbase.environ import NGC_CLI_DEBUG_LOG, NGC_CLI_HTTP_DEBUG


def set_log_level(log_level):
    """Change each handler to specific log_level."""
    for handler in logging.getLogger().handlers:
        handler.setLevel(log_level)

    if log_level == logging.DEBUG and NGC_CLI_HTTP_DEBUG:
        # when logging level is DEBUG, we print all the headers, body of all the http requests for verbose debugging
        set_http_log_level(log_level)
    else:
        # Suppress warnings about cnxn pools by default
        set_http_log_level(logging.ERROR)


def setup_logger():
    """Top-level logger configuration."""
    logger = logging.getLogger()

    console_formatter = logging.Formatter("%(message)s")
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    # Leave this on DEBUG so handlers can decide on their own if they want to use debug messages
    logger.setLevel(logging.DEBUG)
    set_log_level(logging.INFO)

    if NGC_CLI_DEBUG_LOG:
        # Send debug logs to NGC_CLI_DEBUG_LOG.
        # This must be done AFTER calling `set_log_level` to prevent this handler's log level from being clobbered.
        debug_log_file = pathlib.Path(NGC_CLI_DEBUG_LOG)
        debug_formatter = logging.Formatter("%(levelname)s:%(name)s: %(message)s")
        debug_handler = logging.FileHandler(debug_log_file)
        debug_handler.setFormatter(debug_formatter)
        logger.addHandler(debug_handler)


def set_http_log_level(level):
    """Set HTTP log message levels to specified level."""
    requests_log = logging.getLogger("requests.packages.urllib3")

    if level == logging.DEBUG:
        http.client.HTTPConnection.debuglevel = 2
        requests_log.propagate = True
    else:
        requests_log.propagate = False

    requests_log.setLevel(level)
