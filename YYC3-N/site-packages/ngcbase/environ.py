#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
# pylint: disable=os-environ
import multiprocessing
from os import environ

from ngcbase.util.io_utils import mask_string

###
# Environmental variables meant to be user configurable should only be accessed here.
# The _doc_ prefix is picked up by sphinx auto documentation, so only include it on
# variables you want exposed in documentation.
#
# Feature flags, by convention, are boolean values True if they are in the environment
# and False otherwise. Configurable variables will be either set to their value if
# they are found or None otherwise.
#
# Naming convention is that all environment variable start with the NGC_CLI_ prefix.
# The variables in here that don't start with NGC_CLI_ are legacy and should not be
# removed to maintain compatibility with existing scripts. Documentation should only
# expose the proper NGC_CLI_ variant. Feature flags should end in _DISABLE or _ENABLE
# to show that they are boolean values and act as one-way switches, ie. setting an
# _ENABLE as false will still enable the flag.
###

_doc_NGC_CLI_ACE = "Specifies the ace to run batch jobs on."
NGC_CLI_ACE = environ.get("NGC_CLI_ACE") or environ.get("NGC_CONTEXT_ACE")

_doc_NGC_CLI_API_KEY = "Specifies the NGC access key (API Key). This is essentially the password to access NGC."
NGC_CLI_API_KEY = environ.get("NGC_CLI_API_KEY") or environ.get("NGC_API_KEY") or environ.get("NGC_APP_KEY")

_doc_NVCF_SAK = "Specifies the key which to invoke functions with"
NVCF_SAK = environ.get("NVCF_SAK")

_doc_NGC_CLI_EMAIL = (
    "Specifies the Email to be used for browser login. Required in order to receive Authentication Login URL."
)
NGC_CLI_EMAIL = environ.get("NGC_CLI_EMAIL")

# we don't want to expose API url to users. This has to be used for internal purpose
NGC_CLI_API_URL = environ.get("NGC_CLI_API_URL") or environ.get("NGC_CLI_URL")

# we don't want to expose API url to users. This has to be used for internal purpose
NGC_CLI_AUTH_URL = environ.get("NGC_CLI_AUTH_URL")

_doc_NGC_CLI_FORMAT_TYPE = "Specifies the output format type: JSON, CSV, or ASCII."
NGC_CLI_FORMAT_TYPE = environ.get("NGC_CLI_FORMAT_TYPE")

_doc_NGC_CLI_HOME = "Specifies the home directory for NGC (the default is `~/.ngc`)."
NGC_CLI_HOME = environ.get("NGC_CLI_HOME")

_doc_NGC_CLI_ORG = "Specifies the organization name."
NGC_CLI_ORG = environ.get("NGC_CLI_ORG") or environ.get("NGC_CONTEXT_ORG")

# NGC_CLI_USER_AGENT_TEXT is meant to provide additional context into purpose of requests. For internal use only.
NGC_CLI_USER_AGENT_TEXT = environ.get("NGC_CLI_USER_AGENT_TEXT") or ""

# This can be used to enable commands which are disabled for specific CLI distro.
# Inherently this will disable all the feature tagging that has been done
# TODO: Need implementation
NGC_CLI_SUPER_ADMIN_ENABLE = "NGC_CLI_SUPER_ADMIN_ENABLE" in environ or "ENABLE_SUPER_ADMIN" in environ

_doc_NGC_CLI_TEAM = "Specifies the team name."
NGC_CLI_TEAM = environ.get("NGC_CLI_TEAM")

# This has to be used by developers for triaging and debugging
NGC_CLI_TRACE_DISABLE = "NGC_CLI_TRACE_DISABLE" in environ

# Feature flag for rich-formatted output
NGC_CLI_RICH_OUTPUT = "NGC_CLI_RICH_OUTPUT" in environ

# Feature flag for Forge functionality
NGC_CLI_FORGE_ENABLE = "NGC_CLI_FORGE_ENABLE" in environ

# This should enable the http request logs
NGC_CLI_HTTP_DEBUG = "NGC_CLI_HTTP_DEBUG" in environ

# If specified, send logs to this file.
NGC_CLI_DEBUG_LOG = environ.get("NGC_CLI_DEBUG_LOG")

# If specified, ensure output are ascii only
NGC_CLI_ENSURE_ASCII = "NGC_CLI_ENSURE_ASCII" in environ

# Internal override of the service URLs
NGC_CLI_SEARCH_SERVICE_URL = environ.get("NGC_CLI_SEARCH_SERVICE_URL")

# Control display of upload/download progress bars.
NGC_CLI_PROGRESS_BAR_STYLE = environ.get("NGC_CLI_PROGRESS_BAR_STYLE", "DEFAULT")

# Feature flag for CSP and deployment meta and deployments
NGC_CLI_DEPLOYMENT_ENABLE = "NGC_CLI_DEPLOYMENT_ENABLE" in environ

# Feature flag for base-command
NGC_CLI_BASE_COMMAND_ENABLE = "NGC_CLI_BASE_COMMAND_ENABLE" in environ

# Feature flag for Multiple Key Configurations,
# Relates to Scoped API Key (SAK) Feature (AKA Starfleet API Key, AKA Personal/Service Keys) due to
# the user having the ability to create many SAK's with.
NGC_CLI_ENABLE_MULTIPLE_CONFIGS = "NGC_CLI_ENABLE_MULTIPLE_CONFIGS" in environ
NGC_CLI_DOWNLOAD_RETRIES = int(environ.get("NGC_CLI_DOWNLOAD_RETRIES", "5"))
NGC_CLI_UPLOAD_RETRIES = int(environ.get("NGC_CLI_UPLOAD_RETRIES", "5"))
# user may have a lot of cores, but all concurrently using the same core
NGC_CLI_MAX_CONCURRENCY = int(environ.get("NGC_CLI_MAX_CONCURRENCY", "0")) or min(
    max(multiprocessing.cpu_count() * 2, 4), 20
)  # minimum: 4, maximum: 30, default: cpu count*2

NGC_CLI_TRANSFER_TIMEOUT = int(environ.get("NGC_CLI_TRANSFER_TIMEOUT", "30"))
NGC_CLI_TRANSFER_CHUNK_SIZE = int(environ.get("NGC_CLI_TRANSFER_CHUNK_SIZE", "131072"))  # 128*1024
NGC_CLI_TRANSFER_DEBUG_MAX_FUNCTION_NAME_LENGTH = int(
    environ.get("NGC_CLI_TRANSFER_DEBUG_MAX_FUNCTION_NAME_LENGTH", "15")
)
NGC_CLI_TRANSFER_DEBUG_MAX_WORKER_LENGTH = int(environ.get("NGC_CLI_TRANSFER_DEBUG_MAX_WORKER_LENGTH", "15"))

NGC_CLI_PROGRESS_UPDATE_FREQUENCY = float(environ.get("NGC_CLI_PROGRESS_UPDATE_FREQUENCY", "0.25"))

NGC_CLI_CURL_DEBUG = environ.get("NGC_CLI_CURL_DEBUG") or None


def generate_warnings():
    """Generates a list of warnings about deprecated environment variables."""  # noqa: D401
    _WARNING_FORMAT = "{} is a deprecated environment variable. Please use {} instead."

    # maps deprecated env var to its replacement
    _deprecated_env_vars = {
        "NGC_APP_KEY": "NGC_CLI_API_KEY",
        "NGC_CONTEXT_ACE": "NGC_CLI_ACE",
        "NGC_CLI_URL": "NGC_CLI_API_URL",
        "NGC_CONTEXT_ORG": "NGC_CLI_ORG",
        "ENABLE_SUPER_ADMIN": "NGC_CLI_SUPER_ADMIN_ENABLE",
    }

    warnings = []
    for key, value in _deprecated_env_vars.items():
        if environ.get(key):
            warnings.append(_WARNING_FORMAT.format(key, value))
    return warnings


def get_debug_mapping():  # noqa: D103
    debug_map = {}

    for key, value in globals().items():
        if key.startswith("NGC_CLI_") and value is not None:
            debug_map[key] = value

        if (
            key
            in (
                "NGC_CLI_API_KEY",
                "NGC_API_KEY",
                "NGC_APP_KEY",
                "NGC_CLI_EMAIL",
            )
            and value is not None
        ):
            debug_map[key] = mask_string(value)

    return debug_map


def config_visible_vars():
    """Produce a dict of user-visible environment variables and their values."""
    config_map = {}
    hide_list = [
        "NGC_CLI_HTTP_DEBUG",
        "NGC_CLI_DEBUG_LOG",
        "NGC_CLI_TRACE_DISABLE",
        "NGC_CLI_SUPER_ADMIN_ENABLE",
        "NGC_CLI_API_URL",
        "NGC_CLI_BYPASS_CAS_MODEL_SERVICE_PROXY",
        "NGC_CLI_SEARCH_SERVICE_URL",
        "NGC_CLI_REGISTRY_SERVICE_URL",
        "NGC_CLI_REGISTRY_META_SERVICE_URL",
        "NGC_CLI_EGX_CONSOLE_ENABLE",
        "NGC_CLI_RICH_OUTPUT",
        "NGC_CLI_IMG_SCAN_ENABLE",
        "NGC_CLI_AUTH_URL",
        "NGC_CLI_ALERT_ENABLE",
        "NGC_CLI_FORGE_ENABLE",
        "NGC_CLI_CARDSPP_ENABLE",
        "NGC_CLI_BASE_COMMAND_ENABLE",
        "NGC_CLI_CURL_DEBUG",
    ]

    for key, value in globals().items():
        if key.startswith("NGC_CLI_") and key not in hide_list:
            if value is not None:
                config_map[key] = value
            else:
                config_map[key] = "<value not set>"
    return config_map


def visible_vars():  # noqa: D103
    visible = config_visible_vars()
    del visible["NGC_CLI_ACE"]
    del visible["NGC_CLI_ORG"]
    del visible["NGC_CLI_TEAM"]
    return visible
