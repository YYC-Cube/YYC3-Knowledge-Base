#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import asyncio
from functools import lru_cache, wraps
import inspect
import logging
import os
import platform
import socket
import ssl
import subprocess
import sys
import threading
from urllib.parse import quote_plus
from uuid import UUID
import warnings

import aiohttp
import psutil

from ngcbase.api.utils import remove_scheme
from ngcbase.constants import (
    BUILD_ENV,
    CANARY_ENV,
    CAS_URL_MAPPING,
    DEV_ENV,
    EGX_TO_FLEET_COMMAND_ROLE_MAPPING,
    EXTERNAL_IP_URLS,
    LRU_CACHE_SIZE,
    PRODUCTION_ENV,
    PYINSTALLED,
    STAGING_ENV,
    UMASK_GROUP_OTHERS_READ_EXECUTE,
    VERSION_NUM,
)
from ngcbase.environ import get_debug_mapping, NGC_CLI_API_URL
from ngcbase.errors import InvalidArgumentError, NgcException
from ngcbase.util.io_utils import question_yes_no

BUFFER_SIZE = 65536

logger = logging.getLogger(__name__)


# avoid parallel tests hitting cache, breaking tests.
@lru_cache(LRU_CACHE_SIZE)
def get_dll_path() -> str:
    """There are separate share libraries for each platform/architecture combo.

    This function determines the name based on the current system it is running on.
    """
    plat_system = platform.system()
    plat_machine = platform.machine()
    # Smooth out inconsistencies in platform.machine()
    if plat_machine == "aarch64":
        plat_machine = "arm64"
    if plat_machine == "AMD64":
        plat_bits = platform.architecture()[0]
        if plat_bits == "64bit":
            plat_machine = "x86_64"
        else:
            plat_machine = "x86"
    os_name = {"Darwin": "mac", "Windows": "win", "Linux": "linux"}.get(plat_system)
    ext = {"Darwin": "dylib", "Windows": "dll", "Linux": "so"}.get(plat_system)
    base_path = f"{os.path.dirname(__file__)}/shared"
    if PYINSTALLED:
        base_path = f"{os.path.dirname(os.path.realpath(sys.executable))}/crypt"
    path = f"{base_path}/{plat_machine}-{os_name}-lib.{ext}"
    return path


def get_human_readable_command():  # noqa: D103
    cmd = sys.argv[1:]
    cmd = "ngc " + " ".join(cmd)
    return cmd


# TODO: Once the migration of EGX_* to F_C_* roles is made, we should remove this as it will no longer be
#  necessary.
def convert_EGX_roles(roles_list):  # noqa: D103
    converted_roles = []
    for role in roles_list or []:
        if role in EGX_TO_FLEET_COMMAND_ROLE_MAPPING:
            converted_roles.append(EGX_TO_FLEET_COMMAND_ROLE_MAPPING[role])
        else:
            converted_roles.append(role)
    return converted_roles


def get_environ_tag():
    """Return the Environment type. Default is Staging.

    References environment variables (NGC_CLI_API_URL) for overrides
    """
    if BUILD_ENV == PRODUCTION_ENV:
        environment = PRODUCTION_ENV
    elif BUILD_ENV == CANARY_ENV:
        environment = CANARY_ENV
    else:
        environment = STAGING_ENV

    url = remove_scheme(NGC_CLI_API_URL or "")

    if url in ("localhost", "127.0.0.1", CAS_URL_MAPPING["dev"]):
        environment = DEV_ENV
    elif url == CAS_URL_MAPPING["stg"]:
        environment = STAGING_ENV
    elif url == CAS_URL_MAPPING["prod"]:
        environment = PRODUCTION_ENV
    elif url == CAS_URL_MAPPING["canary"]:
        environment = CANARY_ENV

    return environment


def get_current_user_version():
    """Returns the current version of CLI in user's machine."""  # noqa: D401
    return VERSION_NUM


def get_system_info():  # noqa: D103
    (ssl_loc, ssl_version) = get_ssl_info()
    info_map = {
        "os": platform.system() + "-" + platform.release(),
        "ngc-cli version": get_current_user_version(),
        "python executable": get_executable(),
        "python version": get_py_version(),
        "python frozen": python_frozen(),
        # pylint: disable=no-member
        "python virtual": in_virtual_env(),
        "python conda": is_conda(),
        "python path": sys.path,
        "OpenSSL location": ssl_loc,
        "OpenSSL version": ssl_version,
    }
    info_map.update({"env.{}".format(key): value for key, value in get_debug_mapping().items()})
    return info_map


def in_virtual_env():  # noqa: D103
    # pylint: disable=no-member
    return hasattr(sys, "real_prefix") or (hasattr(sys, "base_prefix") and sys.prefix != sys.base_prefix)


def is_conda():  # noqa: D103
    return os.path.exists(os.path.join(sys.prefix, "conda-meta"))


def get_ssl_info():  # noqa: D103
    location = ssl.__file__
    version = ssl.OPENSSL_VERSION
    return location, version


def get_py_version():  # noqa: D103
    return sys.version


def python_frozen():  # noqa: D103
    return getattr(sys, "frozen", False)


def get_executable():  # noqa: D103
    return sys.executable


async def queries_for_external_ip():  # noqa: D103
    list_of_external_ips = []
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3)) as session:
        for url in EXTERNAL_IP_URLS:
            async with session.get(url) as resp:
                resp_read = await resp.read()
                ip = resp_read.decode("utf-8").rstrip()
                list_of_external_ips.append(ip)
    return list_of_external_ips


def get_external_ip():
    """Return the host's externally facing IPv4 address."""
    try:
        if sys.version_info[0] == 3 and sys.version_info[1] >= 8 and sys.platform.startswith("win"):
            # Windows has been unable to close the asyncio loop successfully. This line of code is a fix
            # to handle the asyncio loop failures. Without it, code is unable to CTRL-C or finish.
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        list_of_external_ips = asyncio.run(queries_for_external_ip())
    except (asyncio.exceptions.TimeoutError, asyncio.exceptions.IncompleteReadError, aiohttp.ClientError):
        list_of_external_ips = []
    if not list_of_external_ips or len(list_of_external_ips) == 0:
        logger.debug("No externally facing IP address found")
        return None
    set_of_external_ips = set(list_of_external_ips)
    if len(set_of_external_ips) > 1:
        logger.debug("Multiple externally facing IP addresses found: %s", set_of_external_ips)
        return "Multiple externally facing IP addresses found. Run with --debug to view them."
    ip = next(iter(set_of_external_ips))
    return ip


# this function is use specifically for jobs


def clear():  # noqa: D103
    if sys.platform == "win32":
        os.system("cls")
    else:
        os.system("clear")


def url_encode(s):  # noqa: D103
    return quote_plus(s)


class FunctionWrapper:
    """This objects wraps a function with any args and kwargs given to call it."""  # noqa: D404

    def __init__(self, fn, *args, **kwargs):
        self._fn = fn
        self._args = args
        self._kwargs = kwargs

    def __call__(self):  # noqa: D102
        return self._fn(*self._args, **self._kwargs)

    def __repr__(self):  # noqa: D105
        return "{}(args={}, kwargs={})".format(self._fn, self._args, self._kwargs)


class MaskGranter:  # noqa: D101
    def __init__(self, new_mask=UMASK_GROUP_OTHERS_READ_EXECUTE):
        self._new_mask = new_mask
        self._old_mask = None

    def __enter__(self):  # noqa: D105
        self._old_mask = os.umask(self._new_mask)

    def __exit__(self, _exc_type, _exc_val, _exc_tb):  # noqa: D105
        os.umask(self._old_mask)


class Command:
    """This is wrapper for subprocess to spawn a new process. It connects the input as per the stdout and stderr."""  # noqa: D404, E501

    def __init__(self, cmd, input_file=None, input_data=None, env=None):
        self.cmd = cmd
        self.process = None
        self.result = None
        if input_file is None:
            self.input_file = subprocess.PIPE
        self.input_data = input_data
        self.env = env or Command.get_pre_frozen_environment()

    class _Result:
        def __init__(self, rc, stdout, stderr, cmd):
            self.cmd = cmd
            self.rc = rc
            self.stdout = stdout
            self.stderr = stderr

        def on_error(self, raise_exception, error=None):
            """If error is provided, it will see if that mesasage can be parsed in the either stdouor stderr
            If error is not provided, it will raise the error by checking the return code.

            :param raise_exception:
            :param error:
            """  # noqa: D205
            if error:
                if error in self.stderr or error in self.stdout:
                    raise raise_exception
            elif self.rc != 0:
                raise raise_exception

        def on_success(self, partial):
            if self.rc == 0:
                partial()

        def __repr__(self):
            return str(
                {
                    "command": self.cmd,
                    "stdout": self.stdout,
                    "stderr": self.stderr,
                    "rc": self.rc,
                }
            )

    @staticmethod
    def _get_stdout_encoding():
        encoding = getattr(sys.__stdout__, "encoding", None)
        if encoding is None:
            encoding = "utf-8"
        return encoding

    @staticmethod
    def get_pre_frozen_environment():  # noqa: D102
        system_env = dict(os.environ)
        if getattr(sys, "frozen", False):
            system_env["LD_LIBRARY_PATH"] = system_env.pop("LD_LIBRARY_PATH_ORIG", None)
            if system_env["LD_LIBRARY_PATH"] is None:
                system_env.pop("LD_LIBRARY_PATH")
        return system_env

    def run(self, timeout=60, wait_for_completion=True):
        """Spawns a subprocess and executes it."""

        def __target():
            self.process = subprocess.Popen(  # pylint: disable=consider-using-with
                self.cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=self.input_file,
                env=self.env,
            )
            if wait_for_completion:
                self.complete_process(self.process)

        thread = threading.Thread(target=__target)
        thread.start()
        thread.join(timeout)
        if thread.is_alive():
            self.process.terminate()
            thread.join()
            self.result = self._Result(
                self.process.returncode,
                "",
                "command taking too long, terminating",
                self.cmd,
            )

        if not wait_for_completion:
            return self.process

        return self.result

    def complete_process(self, process):  # noqa: D102
        stdout_encoding = Command._get_stdout_encoding()
        stdout, stderr = process.communicate()
        self.result = self._Result(
            self.process.returncode,
            stdout.decode(stdout_encoding),
            stderr.decode(stdout_encoding),
            self.cmd,
        )
        return self.result


def partition(predicate, iterable):
    """Use a predicate (truthy function) to partition entries into false entries and true entries.

    Example:
      >>> is_even = lambda x: x % 2 == 0
      >>> false_set, true_set = partition(is_even, range(1, 10))
      >>> assert false_set ==  [1, 3, 5, 7, 9]
      >>> assert true_set == [2, 4, 6, 8]
    """
    # This implementation is consumes less memory and doesn't loop the iterable twice
    true_set = []
    false_set = []
    for x in iterable:
        if predicate(x):
            true_set.append(x)
        else:
            false_set.append(x)
    return false_set, true_set


def get_columns_help(columns_dict, columns_default):  # noqa: D103
    columns_str = ", ".join(
        ["{}[={}]".format(key, '"' + value + '"' if " " in value else value) for key, value in columns_dict.items()]
    )
    default_str = (
        "{}[={}] or {}[={}] for versions".format(*columns_default[0], *columns_default[1])
        if isinstance(columns_default, list)
        else "{}[={}]".format(*columns_default)
    )
    columns_help = (
        "Specify output column as column[=header], header is optional, default is {}."
        " Valid columns are {}. Use quotes with spaces. Multiple column arguments are"
        " allowed. ".format(default_str, columns_str)
    )

    return columns_help


def get_location_columns_help(default_columns, location_columns, system_columns):  # noqa: D103
    location_str = ", ".join(["{}[={}]".format(col[0], col[1]) for col in location_columns])

    system_str = ", ".join(["{}[={}]".format(col[0], col[1]) for col in system_columns])

    default_str = "The default is {}[={}] for both locations and systems".format(*default_columns)

    columns_help = (
        "Specify output column as column[=header]. The header is optional. {}.         "
        "           Valid location columns are {}. Valid system columns are {}.        "
        "            Use quotes with spaces. Multiple column arguments are allowed.    "
        "               ".format(default_str, location_str, system_str)
    )

    return columns_help


def get_managed_gpus_columns_help(columns_dict, default_columns):  # noqa: D103
    # NOTE: default_columns is expected to be a list of pairs
    available_columns_str = ", ".join(
        [f"{col_key}[='{col_header}']" for col_key, col_header in columns_dict.items() if col_key != default_columns[0]]
    )
    columns_help = (
        "Specify output column as column[=header]. The header is optional. The default"
        f" is: {default_columns[0]}[='{default_columns[1]}']. Valid columns are:"
        f" {available_columns_str}. Use quotes with spaces. Multiple column arguments"
        " are allowed."
    )
    return columns_help


def find_case_insensitive(arg, values, arg_name):
    """Returns the case-insensitive match from a list of values for the supplied arg."""  # noqa: D401
    up_values = {val.upper(): val for val in values}
    try:
        return up_values[arg.upper()]
    except KeyError:
        # No match; invalid argument
        valids = ", ".join(values)
        message = f"Invalid argument for {arg_name}. Choose from: {valids}."
        raise InvalidArgumentError(arg_name, message=message) from None


def public_attributes(obj):
    """Return a list of all attributes for an object that don't begin with '_'."""
    return [att for att in dir(obj) if not att.startswith("_")]


def format_org_team(org=None, team=None, plural_form=False):
    """Given a combination of org and team values, which can be empty, returns the string that would be used in a URL
    for working with the API.
    """  # noqa: D205
    parts = []
    if org and org is not None and org != "no-org":
        parts.append(f"org{'s' if plural_form else ''}")
        parts.append(f"{org}")
        if team and team is not None and team != "no-team":
            parts.append(f"team{'s' if plural_form else ''}")
            parts.append(f"{team}")
    return "/".join(parts)


def convert_string(src, from_val, to_val):  # noqa: D103
    if src is not None:
        return to_val if src == from_val else src
    return None


def parse_key_value_pairs(key_value_list):
    """Takes ['key1:value1'] and returns {"key1":"value1"}."""  # noqa: D401
    return dict(kv.split(":", 1) if len(kv) != kv.index(":") else (kv[:-1], "") for kv in key_value_list)


def contains_glob(_in):  # noqa: D103
    return any([x for x in ("*", "?", "[", "]") if x in str(_in or "")])  # pylint: disable=use-a-generator


def confirm_remove(printer, target, default):  # noqa: D103
    msg = "Are you sure you would like to remove {}?".format(target)
    if not question_yes_no(printer, msg, default_yes=default):
        raise NgcException("Remove confirmation failed, remove cancelled.")


def confirm(printer, message, default):  # noqa: D103
    if not question_yes_no(printer, message, default_yes=default):
        raise NgcException("Confirmation failed, operation cancelled.")


def share_targets(org, team):
    """Helper function to determine the `type` of the share and entity `name` that
    the share or revocation affects.

    Returns a tuple of values
    """  # noqa: D205, D401
    if not org:
        raise ValueError("org cannot be None")

    org_share = team is None
    share_entity_type = "org" if org_share else "team"
    share_entity_name = org if org_share else team

    return share_entity_type, share_entity_name


def has_org_role(user_response, org_name, roles):
    """Check that a user has one of the roles in the org."""
    for role in user_response.user.roles:
        if role.org.name == org_name and any(x in roles for x in role.orgRoles):
            return True
    return False


def has_org_admin_user_role(user_response, org_name, admin_roles, user_roles):  # noqa: D103
    for role in user_response.user.roles:
        if role.org.name == org_name and any(x in admin_roles for x in role.orgRoles):
            return True
        if role.org.name == org_name and any(x in user_roles for x in role.orgRoles):
            return False
    return None


def has_team_role(user_response, team_name, roles):
    """Check that a user has one of the roles in the team."""
    for role in user_response.user.roles:
        if role.team and role.team.name == team_name and any(x in roles for x in role.teamRoles):
            return True
    return False


def extra_args(func):
    """Deprecated: This will be removed before GA."""  # noqa: D401
    signature = inspect.signature(func)
    debug_param = signature.parameters.get("debug")
    has_debug_argument = debug_param is not None and debug_param.kind is not inspect.Parameter.VAR_POSITIONAL

    @wraps(func)
    def wrapper(*args, **kwargs):
        if "debug" in kwargs:
            if not has_debug_argument:
                del kwargs["debug"]
                warnings.warn("The 'debug' argument is deprecated and will be removed soon.", DeprecationWarning)
        retval = func(*args, **kwargs)
        return retval

    return wrapper


def snake_to_camel_case(v: str):
    """Convert snake case str to camel case. Commonly used for converting class properties to API compliant fields."""
    components = v.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def get_outbound_nic(target="8.8.8.8", port=80):
    """Get the active and outbound NIC name."""
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.connect((target, port))

        for iface, addrs in psutil.net_if_addrs().items():
            for addr in addrs:
                if addr.address == s.getsockname()[0]:
                    return iface

        raise NgcException("outbound nic not found")


def get_transfer_info():
    """Get a combination of system information related to transfers."""
    network = {}
    try:
        stats = psutil.net_if_stats().get(get_outbound_nic(), None)
        if stats:
            network = {
                "speed_mbps": stats.speed,
                "mtu": stats.mtu,
                "isup": stats.isup,
                "duplex": stats.duplex,
                "flags": stats.flags,
            }
    except Exception:  # pylint: disable=broad-except
        pass

    os = {
        "type": platform.system(),
        "version": platform.version(),
        "release": platform.release(),
    }

    host = {"name": socket.gethostname()}
    _min_mhz, _max_mhz = 0, 0

    try:
        if platform.system() != "Darwin":
            _min_mhz = psutil.cpu_freq().min
            _max_mhz = psutil.cpu_freq().max
    except Exception:  # pylint: disable=broad-except
        pass

    cpu = {
        "cores": psutil.cpu_count(logical=False) or 0,  # Physical cores
        "threads": psutil.cpu_count(logical=True) or 0,  # Logical threads
        "frequency": {
            # "current_mhz": psutil.cpu_freq().current if psutil.cpu_freq() else None,
            "min_mhz": _min_mhz,
            "max_mhz": _max_mhz,
        },
    }

    _memory_gb = 0
    try:
        _memory_gb = round(psutil.virtual_memory().total / 1024 / 1024 / 1024, 2)
    except Exception:  # pylint: disable=broad-except
        pass

    memory = {"total_gb": _memory_gb}

    return {
        "os": os,
        "host": host,
        "cpu": cpu,
        "memory": memory,
        "network": network,
    }


def flatten_dict(d, parent_key="", sep="."):
    """Recursively flattens a nested dictionary, converting it to dot notation keys.

    Args:
        d (dict): The nested dictionary.
        parent_key (str, optional): The base key for recursion.
        sep (str, optional): The separator (default: ".").

    Returns:
        dict: Flattened dictionary with dot-notation keys.
    """
    items = {}
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.update(flatten_dict(v, new_key, sep=sep))
        else:
            items[new_key] = v
    return items


def is_valid_uuid(val: str, version: int = 4) -> bool:
    """Check if uuid_to_test is a valid UUID.

    Args:
        val: uuid to validate.
        version: uuid version.

    Returns:
        bool: Validity of uuid.
    """
    try:
        uuid_obj = UUID(val, version=version)
    except ValueError:
        return False
    return str(uuid_obj) == val
