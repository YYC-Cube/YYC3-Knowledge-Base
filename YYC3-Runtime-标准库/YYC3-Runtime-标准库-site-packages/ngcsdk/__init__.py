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

from typing import Optional

from basecommand.api.basecommand import BasecommandAPI
from forge.api.forge import ForgeAPI
from ngcbase.api.baseclient import BaseClient
from ngcbase.errors import NgcException
from ngcbase.constants import SCOPED_KEY_PREFIX
from nvcf.api.nvcf import CloudFunctionAPI
from organization.api.organization import API
from organization.api.storage import StorageAPI
from organization.api.users import UsersAPI
from registry.api.registry import RegistryAPI


class APIClient(BaseClient):  # noqa: D101
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.config._sdk_configuration.db = True
        self.config._load_from_env_vars()

    @property
    def storage(self):
        """Storage."""
        return StorageAPI(api_client=self)

    @property
    def users(self):
        """Users."""
        return UsersAPI(api_client=self)

    @property
    def basecommand(self):
        """BaseCommand."""
        return BasecommandAPI(api_client=self)

    @property
    def organization(self):
        """Organization."""
        return API(api_client=self)

    @property
    def registry(self):
        """Registry."""
        return RegistryAPI(api_client=self)

    @property
    def cloud_function(self):
        """Cloud Function."""
        return CloudFunctionAPI(api_client=self)

    @property
    def forge(self):
        """Forge."""
        return ForgeAPI(api_client=self)


class Client(APIClient):  # noqa: D101
    def __init__(self, api_key=None):
        super().__init__(base_url=None, api_key=api_key)

    def configure(
        self,
        api_key: Optional[str] = None,
        org_name: Optional[str] = None,
        team_name: Optional[str] = None,
        ace_name: Optional[str] = None,
    ):
        """Set the configuration for the current client.

        To clear config, set the config attribute to `"no-***"`.

        Example:
            configure(api_key="no-apikey", org_name="no-org", team_name="no-team", ace_name="no-ace")

        Should not be shared between different Client (i.e. not written to Disk).
        """
        # If user doesn't explicitly remove Config from their config (i.e., api_key="no-apikey", org_name="no-org"), then
        # the previous value for the configuration attribute is used, if there is one.
        # NOTE: Setting app_key=None does not remove the current value from config.
        prev_api_key = self.config.app_key
        prev_org_name = self.config.org_name
        prev_team_name = self.config.team_name
        prev_ace_name = self.config.ace_name
        scoped_key_org_name: Optional[str] = None

        # Base URL and Debug Mode are not reset.
        self.config._reset_db_configs()  # pylint: disable=protected-access
        self.config._sdk_configuration.db = True
        self.config._reset_authentication_tokens_cache()
        self.config.format_type = "json"
        self.config.app_key = api_key or prev_api_key
        if self.config.app_key and self.config.app_key.startswith(SCOPED_KEY_PREFIX):
            scoped_key_org_name = self._get_org()
        self.config.org_name = org_name or scoped_key_org_name or prev_org_name
        if scoped_key_org_name and self.config.org_name != scoped_key_org_name:
            raise NgcException(
                f"Provided organization: '{self.config.org_name}', doesn't match organization for which API Key has permissions:'{scoped_key_org_name}'"
            )
        self.config.team_name = team_name or prev_team_name
        self.config.ace_name = ace_name or prev_ace_name
        self.config._load_from_env_vars()
        self.config.validate_configuration(guest_mode_allowed=True, remote_validation=True, csv_allowed=True)

    def current_config(self):
        """Returns a list of the current configuration. Each item in the returned list is a dictionary with the keys "Key" (name of config attributes),
        "Value" (value of the config attribute), and "Source" (how the config attribute was set: environment variable, globally,).
        """  # noqa: D205, D401
        return self.config.get_current_config_list()

    def clear_config(self):
        """Clear the config."""
        self.config._reset_db_configs()
        self.config.format_type = "json"
        self.config._reset_authentication_tokens_cache()

    def clear_cache(self):
        """Clear the config cache."""
        self.config._reset_authentication_tokens_cache()

    def _get_org(self) -> str:
        """Get the matching org for this scoped api key."""
        sak_key_details = self.authentication.get_sak_key_details(self.config.app_key)
        return sak_key_details.orgName
