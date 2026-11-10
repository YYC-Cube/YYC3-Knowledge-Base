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

#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from typing import List, Optional

from ngcbase.command.args_validation import (
    check_key_value_pattern,
    check_secret_name_pattern,
)
from ngcbase.constants import SECRET_API_VERSION
from ngcbase.util.utils import extra_args, parse_key_value_pairs
from organization.data.sms.SecretCreateRequest import KV, SecretCreateRequest
from organization.data.sms.SecretGetResponse import SecretGetResponse
from organization.data.sms.SecretModifyRequest import SecretModifyRequest
from organization.data.sms.SecretSuccessResponse import SecretSuccessResponse


class SecretsAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _get_secrets_endpoint(org_name):
        return f"v2/sms/orgs/{org_name}/secrets"

    def get_secret_info(self, org_name: str, secret_name: str, key_names: Optional[List[str]] = None):
        """Get info on a secret. All keys are filtered, except for keys included in `key_names` arg."""
        ep = f"{self._get_secrets_endpoint(org_name)}"
        # User can query by keys in form ?key=secret_name/key&key=secret_name/key
        if key_names:
            ep = f"{ep}?key={secret_name}/{f'&key={secret_name}/'.join(key_names)}"
        else:
            ep = f"{ep}?name={secret_name}"
        response = self.connection.make_api_request("GET", ep, auth_org=org_name, operation_name="get secret info")
        return SecretGetResponse(response)

    @extra_args
    def info(self, secret_name: str, key_names: Optional[List[str]] = None, org: Optional[str] = None):
        """Get info on a secret. All keys are filtered, except for keys included in `key_names` arg."""
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        secrets = self.get_secret_info(org_name=org_name, secret_name=secret_name, key_names=key_names)
        secret_names_dict = {secret.name: secret for secret in secrets.secrets}
        return secret_names_dict.get(secret_name, None)

    def get_secret_list(self, org_name: str):
        """Get the list of available secrets for user."""
        ep = f"{self._get_secrets_endpoint(org_name)}"
        response = self.connection.make_api_request("GET", ep, auth_org=org_name, operation_name="get secrets list")
        return SecretGetResponse(response)

    @extra_args
    def list(self, org: Optional[str] = None):
        """Get the list of available secrets for user."""
        self.client.config.validate_configuration(csv_allowed=True)
        org_name = org or self.client.config.org_name
        return self.get_secret_list(org_name=org_name)

    def create_secret(self, secret_name: str, description: str, key_value_list: List[str], org_name: str):
        r"""Create a secret.

        The secret name must match the required pattern: ^[a-zA-Z\\d_\\.-]{2,63}$

        The `key_value_list` argument is a list of strings formatted as <key:value>.
        The key and value pair must match the required pattern: ^[a-zA-Z\\d_\\.-]{2,63}:.*

        Examples:
            ["a_key:a_value", "another_key:another_value"]

            ["key_1:value_2", "12345:12345"]
        """
        for key_value in key_value_list or []:
            check_key_value_pattern(key_value, lower_bound_key_length=2)
        check_secret_name_pattern(secret_name)
        secret_create_request = SecretCreateRequest()
        # Mandatory property to send but not user facing
        secret_create_request.version = SECRET_API_VERSION
        secret_create_request.description = description
        secret_create_request.kv = self._to_key_value_list(parse_key_value_pairs(key_value_list))
        secret_create_request.isValid()
        ep = f"{self._get_secrets_endpoint(org_name)}/{secret_name}"
        response = self.connection.make_api_request(
            "POST", ep, payload=secret_create_request.toJSON(), auth_org=org_name, operation_name="create secret"
        )
        return SecretSuccessResponse(response)

    @extra_args
    def create(self, secret_name: str, description: str, key_value_list: List[str], org: Optional[str] = None):
        r"""Create a secret.

        The secret name must match the required pattern: ^[a-zA-Z\\d_\\.-]{1,63}$

        The `key_value_list` argument is a list of strings formatted as <key:value>.
        The key and value pair must match the required pattern: ^[a-zA-Z\\d_\\.-]{1,63}:.*

        Examples:
            ["a_key:a_value", "another_key:another_value"]

            ["key_1:value_2", "12345:12345"]
        """
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.create_secret(
            secret_name=secret_name, description=description, key_value_list=key_value_list, org_name=org_name
        )

    def delete_secret(self, secret_name: str, key_names: List[str], org_name: str):  # noqa: D102
        ep = f"{self._get_secrets_endpoint(org_name)}"
        if secret_name:
            ep = f"{self._get_secrets_endpoint(org_name)}/{secret_name}"
        if key_names:
            ep = f"{ep}?key={'&key='.join(key_names)}"
        self.connection.make_api_request("DELETE", ep, auth_org=org_name, operation_name="delete secret")

    @extra_args
    def delete(self, secret_name: str, key_names: List[str], org: Optional[str] = None):
        """Delete a secret."""
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.delete_secret(secret_name=secret_name, key_names=key_names, org_name=org_name)

    def update_secret(
        self,
        secret_name: str,
        org_name: str,
        description: Optional[str] = None,
        disable: Optional[bool] = False,
        enable: Optional[bool] = False,
        key_value_list: Optional[List[str]] = None,
    ):
        r"""Update a secret description and/or key-value pairs.

        The `key_value_list` argument is a list of strings formatted as <key:value>.
        The key and value pair must match the required pattern: ^[a-zA-Z\\d_\\.-]{2,63}:.*

        Examples:
            ["a_key:a_value", "another_key:another_value"]

            ["key_1:value_2", "12345:12345"]
        """
        for key_value in key_value_list or []:
            check_key_value_pattern(key_value, lower_bound_key_length=2)
        secret_modify_request = SecretModifyRequest()
        secret_modify_request.version = SECRET_API_VERSION
        secret_modify_request.description = description
        if key_value_list:
            secret_modify_request.kv = self._to_key_value_list(parse_key_value_pairs(key_value_list))
        if disable:
            secret_modify_request.disabled = True
        if enable:
            secret_modify_request.disabled = False
        ep = f"{self._get_secrets_endpoint(org_name)}/{secret_name}"
        self.connection.make_api_request(
            "PATCH", ep, payload=secret_modify_request.toJSON(), auth_org=org_name, operation_name="update secret"
        )

    @extra_args
    def update(
        self,
        secret_name: str,
        description: str,
        disable: Optional[bool] = False,
        enable: Optional[bool] = False,
        key_value_list: Optional[List[str]] = None,
        org: Optional[str] = None,
    ):
        r"""Update a secret description and/or key-value pairs.

        The `key_value_list` argument is a list of strings formatted as <key:value>.
        The key and value pair must match the required pattern: ^[a-zA-Z\\d_\\.-]{1,63}:.*

        Examples:
            ["a_key:a_value", "another_key:another_value"]

            ["key_1:value_2", "12345:12345"]
        """
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.update_secret(
            secret_name=secret_name,
            description=description,
            key_value_list=key_value_list,
            disable=disable,
            enable=enable,
            org_name=org_name,
        )

    @staticmethod
    def _to_key_value_list(key_value_dict):
        """SERVICE DEMANDS KEY_VALUE PAIRS BE IN FORM `[KV({"key":key,"value":value}),KV({"key2","value2"})]`."""
        return [KV({"key": k, "value": v}) for k, v in key_value_dict.items()]
