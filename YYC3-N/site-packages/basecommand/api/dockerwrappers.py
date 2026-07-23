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
from __future__ import print_function

import json
import logging
import os
import shutil
import sys
import tempfile
import threading
import time

import docker
from docker import tls
from docker.utils import config as docker_config
import requests  # pylint: disable=requests-import
import urllib3

from ngcbase.api.utils import default_headers, raise_job_proxy_service_error
from ngcbase.constants import (
    DOCKER_API_TIMEOUT,
    DOCKER_ATTACH_TIMEOUT,
    DOCKER_DAEMON_PORT,
)
from ngcbase.errors import AuthenticationException, NgcException
from ngcbase.timer import FunctionExpiryTimer
from ngccli import cacerts

urllib3.disable_warnings()
CACERT_PATH = os.path.join(os.path.dirname(os.path.abspath(cacerts.__file__)), "cacerts.pem")

TOKEN_EXPIRY_TIME = 5 * 60
CONTAINER_STATUS_CHECK_DELAY = 1
# Used to determine whether or not we want an interactive exec session. If we start getting bugs around this,
# consider adding an 'interactive' argument to ContainerWrapper.exec_ and detect from module-level.
SHELLS = {
    "bash",
    "sh",
    "zsh",
    "fish",
    "csh",
    "tcsh",
    "python",
    "python2",
    "python3",
    "lua",
    "iex",
    "erl",
    "irb",
    "ghci",
}


logger = logging.getLogger(__name__)


class ContainerWrapper:
    """Wrapper for docker container commands."""

    def __init__(self, api_client, org_name, team_name, job_id, daemon_ip, proxy_ip, cluster_id, task_id=None):

        self._docker_daemon_ip = daemon_ip
        self._proxy_ip = proxy_ip
        self._org_name = org_name
        self._team_name = team_name
        self._job_id = job_id
        self._task_id = task_id
        self._cluster_id = cluster_id
        self._config_file = None
        self._tls_config = None
        self._api_client = api_client
        self._client = None
        self._timer = None
        self._validate_args()
        self._nv_print = self._api_client.printer
        self._base_url = "https://{}:{}/ngc/{}".format(self._proxy_ip, DOCKER_DAEMON_PORT, self._docker_daemon_ip)
        # Remove DOCKER_CONFIG from the priority list in the Docker SDK (note: see load_general_config in the SDK)
        try:
            del os.environ["DOCKER_CONFIG"]
        except KeyError:
            pass

    def _validate_args(self):
        if not self._org_name:
            raise NgcException("Org name cannot be None or empty.")
        if not self._job_id:
            raise NgcException("Job ID cannot be None or empty.")
        if not self._docker_daemon_ip:
            raise NgcException("Docker IP cannot be None or empty.")
        if not self._proxy_ip:
            raise NgcException("Proxy IP cannot be None or empty.")
        if not self._cluster_id:
            logger.debug("No ClusterId received from CAS - is the ACE properly configured?")

    def init(self):  # noqa: D102
        self._config_file = os.path.join(tempfile.mkdtemp(), "config.json")
        self._write_auth_config_file(renew=True)
        self._timer = FunctionExpiryTimer(expiry_time=TOKEN_EXPIRY_TIME, fn=self._regen_auth_and_config)
        self._timer.start()
        docker_config.DOCKER_CONFIG_FILENAME = self._config_file
        self._tls_config = tls.TLSConfig(ca_cert=CACERT_PATH)
        self._client = docker.APIClient(
            base_url=self._base_url, tls=self._tls_config, version="auto", timeout=DOCKER_API_TIMEOUT
        )

    def close(self):  # noqa: D102
        self._timer.cancel()
        shutil.rmtree(os.path.dirname(self._config_file))

    def __enter__(self):  # noqa: D105
        self.init()
        return self

    def __exit__(self, _exc_type, _exc_val, _exc_tb):  # noqa: D105
        self.close()

    def _write_auth_config_file(self, renew=False):
        # first get api token
        logger.debug("Generating new token for exec/attach auth")
        auth_header = self._api_client.authentication.auth_header(
            auth_org=self._org_name, auth_team=self._team_name, renew=renew
        )
        if not auth_header:
            raise AuthenticationException("Cannot generate a valid token in exec operations.")

        extra_headers = {"Organization": self._org_name, "Jobid": str(self._job_id), "ClusterID": str(self._cluster_id)}
        # Pass the task id to proxy so that they can verify with CAS for authorization
        if self._task_id:
            extra_headers["TaskId"] = str(self._task_id)

        extra_headers.update(auth_header)
        headers = default_headers(extra_headers)

        auth_config = {"HttpHeaders": headers}

        logger.debug("Writing token to temp docker config file: %s", self._config_file)
        with open(self._config_file, "w", encoding="utf-8") as f:
            json.dump(auth_config, f)

        return self._config_file

    def _regen_auth_and_config(self):
        """Regenerates authentication token, writes to file, and
        reloads the docker config to pick it up.

        NOTE: this runs in a separate thread to regenerate timings every 5 minutes. Taking
        advantage of shared mutable state in Python threads to allow the child thread to
        update the configs used by the docker API client in the main thread.
        """  # noqa: D205
        self._write_auth_config_file()
        logger.debug("Reloading auth config into docker client")
        # pylint: disable=protected-access
        lock = threading.Lock()
        with lock:
            logger.debug("Thread lock acquired for docker client config settings.")
            self._client._general_configs = docker_config.load_general_config(self._config_file)

    def _wait_for_running_container(self, container_id):
        container_check_start_time = time.time()

        def timeout_elapsed(start_time):
            return (time.time() - start_time) < DOCKER_ATTACH_TIMEOUT

        while (not self._job_running(container_id)) and timeout_elapsed(container_check_start_time):
            try:
                logger.debug("Waiting for running container. . . ")
                time.sleep(CONTAINER_STATUS_CHECK_DELAY)
            except KeyboardInterrupt:
                break

        if not self._job_running(container_id):
            logger.debug("Container ID %s is not running.", container_id)
            raise NgcException("Cannot exec into the container because it is not running.")

    def _job_running(self, container_id):
        return self._client.inspect_container(container_id)["State"]["Status"] == "running"

    def exec_(self, command, container_id, detach):
        """Wrapper for executing commands in docker containers
        If the command is [sh, bash, python] it sets up an interactive docker wrapped by PTY allocated by the docker
        If the command is other than [sh, bash, python], it sets up an exec instance in a running container
        and then starts the set up exec instance. the command current timeout is set by DOCKER_API_TIMEOUT=60.

        Having an interactive docker session on windows is currently not supported.
        """  # noqa: D205, D401
        if not container_id:
            raise NgcException("Container ID cannot be empty")

        if not command:
            raise NgcException("Exec Command cannot be empty")

        shell = os.path.split(command)[1]
        if shell in SHELLS:
            logger.debug("Attempting interactive docker exec - shell is %s.", shell)
            # interactive docker exec
            if os.name == "nt":
                raise NgcException("Interactive shell commands are not supported for Windows.")

            # This will cause problems on Windows if at the top of the file
            from dockerpty import (  # pylint: disable=import-outside-toplevel
                exec_create,
                ExecOperation,
                PseudoTerminal,
            )

            self._wait_for_running_container(container_id)
            logger.debug("Container with ID %s is running.", str(container_id))
            try:
                exec_id = exec_create(self._client, container_id, command, interactive=True)
                operation = ExecOperation(self._client, exec_id, interactive=True)
                # NOTE: This seems to print out multiple zeros and newlines to the screen
                PseudoTerminal(self._client, operation).start()
                exit_code = self._client.exec_inspect(exec_id)["ExitCode"]
                logger.debug("Interactive exec performed.\nID: %s\nExit code: %s", exec_id, exit_code)
                return exit_code
            except requests.exceptions.HTTPError as e:
                logger.debug(e)
                raise_job_proxy_service_error(e)

        # non-interative docker exec, meaning exec the command and get the result -
        # Ex.
        # [rgajare@rgajare-dev]$ ngc batch exec 107559 -c pwd
        # /workspace
        logger.debug("Attempting non-interactive docker exec with command %s.", command)
        try:
            res = self._client.exec_create(container_id, command, tty=True)
            exec_log = self._client.exec_start(res, detach=detach)
        except requests.exceptions.HTTPError as e:
            logger.debug(e)
            raise_job_proxy_service_error(e)

        try:
            decoded_log = exec_log.decode("utf-8")
        # when the --detach option is passed, we get back an empty string instead of bytes from the SDK client
        except AttributeError:
            decoded_log = exec_log
        logger.debug("Exec performed.\nResult: %s\nDetached: %s", decoded_log, detach)

        self._nv_print.print_ok(decoded_log)

        return None

    def attach(self, container_id):
        """Runs docker attach command."""  # noqa: D401
        if container_id is None:
            raise NgcException("Container ID cannot be None")
        try:
            container = docker.DockerClient(
                base_url=self._base_url, tls=self._tls_config, version="auto", timeout=DOCKER_ATTACH_TIMEOUT
            ).containers.get(container_id)

            logger.debug("Attaching to container with ID %s", container_id)
            for it in container.attach(stdout=True, stderr=True, stream=True):
                # use write instead of print to stop dup \n
                sys.stdout.write(it.decode("utf-8"))
        except requests.exceptions.HTTPError as e:
            logger.debug(e)
            raise_job_proxy_service_error(e)
