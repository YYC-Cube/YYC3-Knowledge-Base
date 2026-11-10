#
# Copyright (c) 2022, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import logging
import os
import socket
import subprocess
import tempfile

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from ngcbase.errors import NgcException


class ssh_wrapper:  # noqa: D101
    def __init__(  # noqa: D417
        self,
        hostname,
        port,
        username,
        private_key,
        public_key,
        ssh_cert,
    ) -> None:
        """Creates an SSH connection to the hostname and piping the output to stdout.
        If the interactive flag is set, the connection is made in interactive mode meaning this connection is kept
        alive and takes control of terminal stdin/stdout.

        Args:
        Hostname(str): The hostname to connect to.
        Username(str): The username to connect as.
        private_key(str): A PEM OPENSSH PRIVATE KEY formatted string, takes precedent over private_key_file.
        private_key_file(str): A path to a files containing a PEM OPENSSH PRIVATE KEY string.
        """  # noqa: D205, D401
        self.port = port
        self.username = username
        self.hostname = hostname

        self.private_key_file = tempfile.NamedTemporaryFile(delete=False)  # pylint: disable=consider-using-with
        # ssh demands this file be named like this
        self.ssh_cert_file = open(  # pylint: disable=consider-using-with
            self.private_key_file.name + "-cert.pub", "w", encoding="utf-8"
        )
        # This is a workaround to a bug found in some major versions of OpenSSH
        # https://bugzilla.mindrot.org/show_bug.cgi?id=2617
        self.public_key_file = open(  # pylint: disable=consider-using-with
            self.private_key_file.name + ".pub", "w", encoding="utf-8"
        )

        self.ssh_cert_file.write(ssh_cert)
        self.private_key_file.write(private_key.encode("utf-8"))
        self.public_key_file.write(public_key)

        self.private_key_file.seek(0)
        self.ssh_cert_file.seek(0)
        self.public_key_file.seek(0)

        self.private_key_file.close()
        self.ssh_cert_file.close()
        self.public_key_file.close()

        self.logger = logging.getLogger(__name__)

    def __enter__(self):  # noqa: D105
        # BatchMode allows for disabling the prompt for password.
        # StrictHostKeyChecking automatically adds host key to known_hosts file.
        ssh_command = [
            "ssh",
            f"{self.username}@{self.hostname}",
            "-p",
            f"{self.port}",
            "-o",
            "BatchMode=yes",
            "-o",
            "StrictHostKeyChecking=no",
            "-i",
            self.private_key_file.name,
        ]

        # hack to find whether or not --debug is set
        if len(logging.getLogger().handlers) != 0 and logging.getLogger().handlers[0].level == logging.DEBUG:
            ssh_command.append("-vvv")

        self.logger.debug(" ".join(ssh_command))
        # forks current process and runs the ssh command in the child process.
        # If command is not set, the child process will be in interactive mode taking control of terminal stdin/stdout
        # until child process exits.
        try:
            subprocess.call(ssh_command)
        except OSError:
            # can error out if ssh is not installed or not available through $PATH.
            raise NgcException("SSH is required for this command, please install and try again.") from None

    def __exit__(self, exc_type, exc_value, exc_traceback):  # noqa: D105
        self.logger.debug("Closing SSH Connection")
        os.remove(self.private_key_file.name)
        os.remove(self.public_key_file.name)
        os.remove(self.ssh_cert_file.name)


def generate_key_pair():
    """This method generates a RSA key pair and returns it as a tuple
    of (public, private) keys.
    The public key format is OpenSSH and private key format is PEM.
    """  # noqa: D205, D401, D404
    key_pair = rsa.generate_private_key(backend=default_backend(), public_exponent=65537, key_size=2048)
    private_key = key_pair.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.OpenSSH,
        serialization.NoEncryption(),
    ).decode("utf-8")
    public_key = (
        key_pair.public_key()
        .public_bytes(serialization.Encoding.OpenSSH, serialization.PublicFormat.OpenSSH)
        .decode("utf-8")
    )
    return (public_key, private_key)


def find_open_port(port=0):
    """Finds a bindable port between - will throw exception if something else is awry.

    If param passed in will attempt to use that port, if not 0 tells OS to grab first available.
    """  # noqa: D401
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(("", port))
    except socket.error:
        raise NgcException("Port in Use") from None
    port = sock.getsockname()[1]
    sock.close()
    return port


def is_port_open(host, port, timeout_seconds=1):
    """Returns True if the given host is reachable on the given port."""  # noqa: D401
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout_seconds)
    result = sock.connect_ex((host, port))
    return result == 0
