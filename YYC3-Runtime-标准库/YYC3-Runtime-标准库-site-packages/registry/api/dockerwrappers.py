#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from __future__ import print_function

import logging
import platform

import docker
from docker.errors import DockerException, ImageNotFound
import urllib3

from ngcbase.api.utils import remove_scheme
from ngcbase.constants import DOCKER_API_TIMEOUT
from ngcbase.errors import NgcException
from registry.errors import ImageTagNotFound

urllib3.disable_warnings()

logger = logging.getLogger(__name__)


class RegistryWrapper:
    """Wrapper class for interacting with NVIDIA's NGC container registry."""

    def __init__(self, registry_url, api_client):

        self.registry_url = remove_scheme(registry_url)
        self.api_client = api_client
        try:
            self.client = docker.from_env(version="auto", timeout=DOCKER_API_TIMEOUT).api
            self.client.ping()
        except (ConnectionError, DockerException) as exc:
            lowered_message = str(exc).lower()
            if "permission denied" in lowered_message:
                perm_denied_msg = (
                    "Error: Unable to connect to the docker server: permission denied.\n"
                    "The user running this command must have permission to use docker."
                )
                if platform.system() == "Linux":
                    perm_denied_msg += (
                        "\nFor more information, see: https://docs.docker.com/install/linux/linux-postinstall"
                    )
                raise ConnectionError(perm_denied_msg) from None

            if "connection refused" in lowered_message or "connection aborted" in lowered_message:
                raise ConnectionError(
                    "Error: Unable to connect to the docker server.\n"
                    "Docker is required for this command - is it installed?"
                ) from None
            if "the system cannot find the file" in lowered_message:
                raise NgcException(
                    "Error: Unable to find Docker-specific files.\n"
                    "Docker is required for this command - is it installed?"
                ) from None

            raise exc

        # Broad exception handler to catch pywintypes errors about missing docker files.
        # Avoids conditional imports and separating error handling by OS.
        except Exception as err:  # pylint: disable=broad-except
            if "the system cannot find the file" in str(err).lower():
                raise NgcException(
                    "Error: Unable to find Docker-specific files.\n"
                    "Docker is required for this command - is it installed?"
                ) from None

            raise err

    def login(self, username, password):
        """Login to NVIDIA's container registry."""
        return self.client.login(username, password, registry=self.registry_url, reauth=True)

    def pull(self, image_path, tag):
        """Pull an image from NVIDIA's container registry."""
        full_image_path = generate_image_path(self.registry_url, image_path)
        # config file might contain invalid auths, we never want to use them from CLI.
        # If we have an API key, the client will be logged in, so don't override.
        # If we don't have an API key, force username/password to None for public access.
        cfg_override = None
        if not self.api_client.config.app_key:
            cfg_override = {"username": None, "password": None}
        return self.client.pull(full_image_path, tag=tag, stream=True, decode=True, auth_config=cfg_override)

    def push(self, image_path, tag):
        """Verify image exists and push an image to NVIDIA's container registry."""
        image_and_tag = image_path + (":" + tag if tag else "")

        try:
            image_info = self.inspect(image_and_tag)
        except ImageNotFound:
            raise ImageNotFound("Error: Image not found: {}".format(image_and_tag)) from None

        # Push if it exists and starts with the registry url
        if image_and_tag.startswith(self.registry_url):
            return self.client.push(image_path, tag=tag, stream=True, decode=True)

        # We assume the user wanted to push an image with the registry URL in front of the one
        # they named if it doesn't include it already. This is because the image tag *must* include
        # the registry url when interacting with a private registry.
        registry_path = generate_image_path(self.registry_url, image_path)
        registry_path_and_tag = generate_image_path(self.registry_url, image_and_tag)
        try:
            registry_image_info = self.inspect(registry_path_and_tag)
        except ImageNotFound:
            raise ImageTagNotFound("Image tag not found: {}".format(registry_path_and_tag)) from None

        # Verify they're the same images - mismatches can occur
        if image_info["Id"] == registry_image_info["Id"]:
            return self.client.push(registry_path, tag=tag, stream=True, decode=True)

        raise NgcException(
            "Unable to determine correct image to push.\n'{}' and '{}' "
            "have similar names but refer to different images.".format(image_and_tag, registry_path_and_tag)
        )

    def tag(self, original_name, new_name, tag):
        """Tags an image - similar to `docker tag`
        original_name: the full original name, including tag (e.g., 'my-cool-img:latest')
        new_name: the alias for the image you want to use
        tag: the new alias's tag.
        """  # noqa: D205
        return self.client.tag(original_name, new_name, tag)

    def inspect(self, image):
        """Similar to `docker inspect`.

        returns a dictionary of information about an image or raises ImageNotFound
        """
        return self.client.inspect_image(image)

    def version(self):
        """Retrieve version information from the server."""
        try:
            return self.client.version()
        except docker.errors.APIError:
            return {
                "ERROR": (
                    "Could not retrieving version information from the server. Please make sure the latest Docker is"
                    " running."
                )
            }


def generate_image_path(registry_url, image):
    """Adds the registry URL to the front of the image name if it does not
    already include the URL.

    Examples:
      >>> generate_image_path('my.registry.url', 'my-image:latest')
      'my.registry.url/my-image:latest'

      >>> generate_image_path('https://my.registry.url', 'my-image:latest')
      'my.registry.url/my-image:latest'
    """  # noqa: D205, D401
    no_proto_url = remove_scheme(registry_url)
    if image.startswith(no_proto_url + "/"):
        return image

    return no_proto_url + "/" + image
