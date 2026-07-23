#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from configparser import (
    ConfigParser,
    DuplicateSectionError,
    MissingSectionHeaderError,
    ParsingError,
)
import datetime
from itertools import chain
import json
import logging
import os
import sys

from packaging import version

from ngcbase import environ
import ngcbase.api.authentication
from ngcbase.api.pagination import pagination_helper
from ngcbase.api.utils import add_scheme, NameSpaceObj
from ngcbase.constants import (
    API_VERSION,
    CATALOG_RESOURCE_NAMES,
    FORMAT_TYPES,
    PAGE_SIZE,
    SCOPED_KEY_PREFIX,
    SERVICE_MAP,
    VERSION_NUM,
    VERSION_UPGRADE_CONSTANTS,
)
from ngcbase.errors import (
    AccessDeniedException,
    AuthenticationException,
    ConfigFileException,
    MissingConfigFileException,
    NgcException,
    ResourceNotFoundException,
    ValidationException,
)
from ngcbase.expiring_cache import ExpiringCache
from ngcbase.logger import set_log_level
from ngcbase.util.db_util import NGC_DB
from ngcbase.util.file_utils import get_cli_config_dir, get_cli_token_file
from ngcbase.util.io_utils import mask_string
from ngcbase.util.utils import get_environ_tag

logger = logging.getLogger(__name__)


class Configuration:
    """This class holds the configurations used inside CLI
    and is responsible for loading and saving the configs.
    """  # noqa: D205, D404

    def __init__(self, api_client):
        self.client = api_client
        self._db = ConfigDB(self._get_config_file())
        self._reset_configs()
        self._load_configs()

    def _load_configs(self):
        """Loads configuration."""  # noqa: D401
        self._load_from_env_vars()
        self._load_from_db()

    def _load_from_env_vars(self):
        """Load any env source attributes from the env."""
        self._base_url.env_var = add_scheme(environ.NGC_CLI_API_URL)
        self._app_key.env_var = environ.NGC_CLI_API_KEY
        self._starfleet_kas_email.env_var = environ.NGC_CLI_EMAIL
        self._format_type.env_var = environ.NGC_CLI_FORMAT_TYPE

        if environ.NGC_CLI_ORG == "no-org":
            self._org_name.env_var = None
            self._org_name.env_var_remove = True
        else:
            self._org_name.env_var = environ.NGC_CLI_ORG

        if environ.NGC_CLI_TEAM == "no-team":
            self._team_name.env_var = None
            self._team_name.env_var_remove = True
        else:
            self._team_name.env_var = environ.NGC_CLI_TEAM

        if environ.NGC_CLI_ACE == "no-ace":
            self._ace_name.env_var = None
            self._ace_name.env_var_remove = True
        else:
            self._ace_name.env_var = environ.NGC_CLI_ACE

    def _load_from_db(self):
        """Load any db source attributes from the db.
        'db' meaning the config file.
        """  # noqa: D205
        # pylint: disable=protected-access
        self._db.load()
        self._app_key.db = self._db.app_key
        self._key_id.db = self._db.key_id
        self._key_name.db = self._db.key_name
        self._format_type.db = self._db.format_type
        self._org_name.db = self._db.org
        self._org_display_name.db = self._db.org_display_name
        self._team_name.db = self._db.team
        self._ace_name.db = self._db.ace
        self._command_map.db = self._db.command_map
        self._user_role_choices.db = self._db.user_role_choices
        self._product_names.db = self._db.product_names
        self._last_upgrade_msg_date.db = self._db.last_upgrade_msg_date
        self._starfleet_kas_session_key.db = self._db.starfleet_kas_session_key
        self._starfleet_kas_email.db = self._db.starfleet_kas_email
        self._starfleet_session_key_expiration.db = self._db.starfleet_session_key_expiration
        self._configurations.db = self._db.configurations
        self._last_key_expiration_msg_date.db = self._db.last_key_expiration_msg_date

    @property
    def base_url(self):  # noqa: D102
        return self._base_url.value

    @property
    def debug_mode(self):  # noqa: D102
        return self._debug_mode.value

    @property
    def app_key(self):  # noqa: D102
        return self._app_key.value

    # should only get called from 'ngc config set'
    @app_key.setter
    def app_key(self, value):
        if value == "no-apikey":
            self._app_key.global_arg_remove = True
            self._app_key.global_arg = None
        else:
            self._app_key.global_arg = value

    @property
    def global_app_key(self):  # noqa: D102
        return self._app_key.global_arg

    @property
    def key_id(self):  # noqa: D102
        return self._key_id.value

    @key_id.setter
    def key_id(self, value):
        if value:
            self._key_id.global_arg = value
        else:
            self._key_id.global_arg_remove = True
            self._key_id.global_arg = None

    @property
    def global_key_id(self):  # noqa: D102
        return self._key_id.global_arg

    @property
    def key_name(self):  # noqa: D102
        return self._key_name.value

    @key_name.setter
    def key_name(self, value):
        if value:
            self._key_name.global_arg = value
        else:
            self._key_name.global_arg_remove = True
            self._key_name.global_arg = None

    @property
    def global_key_name(self):  # noqa: D102
        return self._key_name.global_arg

    @property
    def starfleet_kas_session_key(self):  # noqa: D102
        return self._starfleet_kas_session_key.value

    @starfleet_kas_session_key.setter
    def starfleet_kas_session_key(self, value):
        if value:
            self._starfleet_kas_session_key.global_arg = value
        else:
            self._starfleet_kas_session_key.global_arg_remove = True
            self._starfleet_kas_session_key.global_arg = None

    @property
    def global_starfleet_kas_session_key(self):  # noqa: D102
        return self._starfleet_kas_session_key.global_arg

    @property
    def starfleet_kas_email(self):  # noqa: D102
        return self._starfleet_kas_email.value

    @starfleet_kas_email.setter
    def starfleet_kas_email(self, value):
        if value == "no-email":
            self._starfleet_kas_email.global_arg_remove = True
            self._starfleet_kas_email.global_arg = None
        else:
            self._starfleet_kas_email.global_arg = value

    @property
    def global_starfleet_kas_email(self):  # noqa: D102
        return self._starfleet_kas_email.global_arg

    @property
    def starfleet_session_key_expiration(self):
        """`starfleet_session_key_expiration` keeps track of when the Starfleet Session Key received from KAS will
        expire. Instead of saving the session key to the cache tokens.json file, we can simply just read it from
        the config.
        """  # noqa: D205
        return self._starfleet_session_key_expiration.value

    @starfleet_session_key_expiration.setter
    def starfleet_session_key_expiration(self, value):
        if value:
            self._starfleet_session_key_expiration.global_arg = value
        else:
            self._starfleet_session_key_expiration.global_arg = None

    @property
    def format_type(self):  # noqa: D102
        return self._format_type.value

    # should only get called from 'ngc config set'
    @format_type.setter
    def format_type(self, value):
        self._format_type.global_arg = value

    @property
    def global_format_type(self):  # noqa: D102
        return self._format_type.global_arg

    @property
    def org_name(self):  # noqa: D102
        return self._org_name.value

    # should only get called from 'ngc config set'
    @org_name.setter
    def org_name(self, value):
        if value == "no-org":
            self._org_name.global_arg_remove = True
            self._org_name.global_arg = None
        else:
            self._org_name.global_arg = value

    @property
    def global_org_name(self):  # noqa: D102
        return self._org_name.global_arg

    @property
    def org_display_name(self):  # noqa: D102
        return self._org_display_name.value

    @org_display_name.setter
    def org_display_name(self, value):
        if value:
            self._org_display_name.global_arg = value
        else:
            self._org_display_name.global_arg_remove = True
            self._org_display_name.global_arg = None

    @property
    def team_name(self):  # noqa: D102
        return self._team_name.value

    # should only get called from 'ngc config set'
    @team_name.setter
    def team_name(self, value):
        if value == "no-team":
            self._team_name.global_arg_remove = True
            self._team_name.global_arg = None
        else:
            self._team_name.global_arg = value

    @property
    def global_team_name(self):  # noqa: D102
        return self._team_name.global_arg

    @property
    def ace_name(self):  # noqa: D102
        return self._ace_name.value

    # should only get called from 'ngc config set'
    @ace_name.setter
    def ace_name(self, value):
        if value == "no-ace":
            self._ace_name.global_arg_remove = True
            self._ace_name.global_arg = None
        else:
            self._ace_name.global_arg = value

    @property
    def global_ace_name(self):  # noqa: D102
        return self._ace_name.global_arg

    @property
    def is_guest_mode(self):  # noqa: D102
        return not bool(self.app_key) and not bool(self.starfleet_kas_session_key and self.starfleet_kas_email)

    @property
    def command_map(self):  # noqa: D102
        return self._command_map.value

    @command_map.setter
    def command_map(self, value):
        if not value:
            self._command_map.global_arg_remove = True
            self._command_map.global_arg = None
        else:
            self._command_map.global_arg = value

    @property
    def user_role_choices(self):  # noqa: D102
        return self._user_role_choices.value

    @user_role_choices.setter
    def user_role_choices(self, value):
        if value:
            self._user_role_choices.global_arg = value
        else:
            self._user_role_choices.global_arg_remove = True
            self._user_role_choices.global_arg = None

    @property
    def product_names(self):  # noqa: D102
        return self._product_names.value

    @product_names.setter
    def product_names(self, value):
        if value:
            self._product_names.global_arg = value
        else:
            self._product_names.global_arg_remove = True
            self._product_names.global_arg = None

    @property
    def last_upgrade_msg_date(self):
        """`last_upgrade_msg_date` keeps track of when the version upgrade warning message was displayed to the user,
        or, if format_type is NOT ascii, keeps track of when the last check was for whether to display upgrade
        message or not.
        """  # noqa: D205
        return self._last_upgrade_msg_date.value

    @last_upgrade_msg_date.setter
    def last_upgrade_msg_date(self, value):
        if value:
            self._last_upgrade_msg_date.global_arg = value
        else:
            self._last_upgrade_msg_date.global_arg = None

    @property
    def last_key_expiration_msg_date(self):
        """`last_key_expiration_msg_date` keeps track of when the Key Expiration warning message was
        displayed to the user.
        """  # noqa: D205
        return self._last_key_expiration_msg_date.value

    @last_key_expiration_msg_date.setter
    def last_key_expiration_msg_date(self, value):
        if value:
            self._last_key_expiration_msg_date.global_arg = value
        else:
            self._last_key_expiration_msg_date.global_arg = None

    @property
    def configurations(self):
        """Configurations is a dictionary containing the API Keys set in the config file.
        This is how CLI reads the config file with multiple API Keys. The key:value is:
        <api-key-value>:
        {
            <name of config attr (org, team, ace, format_type, key_id, key_name, etc.)>:
            <value of config attr>
        }
        """  # noqa: D205, D415
        return self._configurations.value

    @configurations.setter
    def configurations(self, value):
        if value:
            self._configurations.global_arg = value
        else:
            self._configurations.global_arg = None

    @property
    def global_configurations(self):  # noqa: D102
        return self._configurations.global_arg

    @property
    def sdk_configuration(self):
        """`sdk_configuration` keeps track of whether the Configuration is being used in an SDK Client. Mainly for
        knowing if we can write files onto the machine.
        """  # noqa: D205
        return self._sdk_configuration.value

    @sdk_configuration.setter
    def sdk_configuration(self, value):
        if value:
            self._sdk_configuration.global_arg = True
        else:
            self._sdk_configuration.global_arg = False

    def get_current_config_list(self):  # noqa: D102
        cfg_list = []
        if self.app_key:
            cfg_list.append({"key": "apikey", "value": mask_string(self.app_key), "source": self._app_key.get_src()})
        if self.key_name:
            cfg_list.append({"key": "key_name", "value": self.key_name, "source": self._key_name.get_src()})
        if self.key_id:
            cfg_list.append({"key": "key_id", "value": self.key_id, "source": self._key_id.get_src()})

        if self.key_name:
            cfg_list.append({"key": "key_name", "value": self.key_name, "source": self._key_name.get_src()})
        if self.starfleet_kas_session_key:
            cfg_list.append(
                {
                    "key": "starfleet_authentication",
                    "value": True,
                    "source": self._starfleet_kas_session_key.get_src(),
                }
            )
        if self.starfleet_kas_email:
            cfg_list.append(
                {
                    "key": "starfleet_email",
                    "value": self.starfleet_kas_email,
                    "source": self._starfleet_kas_email.get_src(),
                }
            )
        if self.format_type:
            cfg_list.append(
                {
                    "key": "format_type",
                    "value": self.format_type,
                    "source": self._format_type.get_src(),
                }
            )
        if self.org_name:
            org_name = self.org_name
            if org_name == self._db.org and self.org_display_name:
                org_name = f"{self.org_display_name} ({org_name})"
            cfg_list.append({"key": "org", "value": org_name, "source": self._org_name.get_src()})
        if self.team_name:
            cfg_list.append(
                {
                    "key": "team",
                    "value": self.team_name,
                    "source": self._team_name.get_src(),
                }
            )
        if self.ace_name:
            cfg_list.append(
                {
                    "key": "ace",
                    "value": self.ace_name,
                    "source": self._ace_name.get_src(),
                }
            )
        return cfg_list

    def check_key_choice(self, key_choice):
        """Iterate through the Configurations saved and return the "apikey" value for the Configuration with
        Key Id or Key Name that matches the Key Choice input.
        """  # noqa: D205
        if isinstance(key_choice, int):
            key_choice = str(key_choice)
        return next(
            (
                configuration.get("apikey")
                for configuration in self.configurations.values()
                if configuration.get("key_id", "") == key_choice or configuration.get("key_name", "") == key_choice
            ),
            "",
        )

    def get_key_ids(self):
        """Iterate through the Configurations saved and return a list of all the `key_id`'s from the saved
        configurations.
        """  # noqa: D205
        key_ids_in_config = list(
            filter(None, [configuration.get("key_id", "") for configuration in self.configurations.values()])
        )
        key_ids_in_config = [int(key_id) for key_id in key_ids_in_config]
        return key_ids_in_config

    def get_key_names(self):
        """Iterate through the Configurations saved and return a list of all the `key_name`'s from the saved
        configurations.
        """  # noqa: D205
        key_names_in_config = list(
            filter(None, [configuration.get("key_name", "") for configuration in self.configurations.values()])
        )
        return key_names_in_config

    def global_args_present(self):  # noqa: D102
        return bool(
            self._app_key.global_arg
            or self._starfleet_kas_email.global_arg
            or self._starfleet_kas_session_key.global_arg
            or self._format_type.global_arg
            or self._org_name.global_arg
            or self._org_name.global_arg_remove
            or self._team_name.global_arg
            or self._team_name.global_arg_remove
            or self._ace_name.global_arg
            or self._ace_name.global_arg_remove
        )

    def set_config(self):
        """Writes the configurations inside config file.

        This should only get called during a 'ngc config set' command.
        """  # noqa: D401
        logger.info("Saving configuration...")
        self._db.app_key = self._app_key.global_arg
        self._db.rm_app_key = self._app_key.global_arg_remove
        self._db.key_id = self._key_id.global_arg
        self._db.rm_key_id = self._key_id.global_arg_remove
        self._db.key_name = self._key_name.global_arg
        self._db.rm_key_name = self._key_name.global_arg_remove
        self._db.format_type = self._format_type.global_arg
        self._db.org = self._org_name.global_arg
        self._db.rm_org = self._org_name.global_arg_remove
        self._db.org_display_name = self._org_display_name.global_arg
        self._db.rm_org_display_name = self._org_display_name.global_arg_remove
        self._db.team = self._team_name.global_arg
        self._db.rm_team = self._team_name.global_arg_remove
        self._db.ace = self._ace_name.global_arg
        self._db.rm_ace = self._ace_name.global_arg_remove
        self._set_command_map()
        self._db.command_map = self._command_map.global_arg
        self._db.rm_command_map = self._command_map.global_arg_remove
        self._db.user_role_choices = self._user_role_choices.global_arg
        self._db.rm_user_role_choices = self._user_role_choices.global_arg_remove
        self._db.product_names = self._product_names.global_arg
        self._db.rm_product_names = self._product_names.global_arg_remove
        self._db.starfleet_kas_session_key = self._starfleet_kas_session_key.global_arg
        self._db.rm_starfleet_kas_session_key = self._starfleet_kas_session_key.global_arg_remove
        self._db.starfleet_kas_email = self._starfleet_kas_email.global_arg
        self._db.rm_starfleet_kas_email = self._starfleet_kas_email.global_arg_remove
        self._db.starfleet_session_key_expiration = self._starfleet_session_key_expiration.global_arg
        self._configurations.global_arg = self.configurations
        self._db.configurations = self._configurations.global_arg
        self._db.store(set_config=True, new_command_map=True)
        logger.info("Successfully saved NGC configuration to %s", self._get_config_file())

    def clear_configs(self):
        """Clears the configuration if it exists.

        This should only get called during a 'config clear' command.
        """  # noqa: D401
        cfg_file = self._get_config_file()
        meta_data_file = self._get_meta_data_file()
        logger.info("Clearing NGC configuration %s and meta data %s", cfg_file, meta_data_file)
        self._reset_configs()
        # config file does not exists
        config_file_path = os.path.expanduser(cfg_file)
        try:
            if not os.path.exists(config_file_path) or not os.path.isfile(config_file_path):
                raise MissingConfigFileException(message=f"Config file at {config_file_path} not found.") from None
            os.remove(config_file_path)
            logger.info("Successfully cleared NGC configuration %s", cfg_file)
        finally:
            meta_data_path = os.path.expanduser(meta_data_file)
            if not os.path.exists(meta_data_path) or not os.path.isfile(meta_data_path):
                raise MissingConfigFileException(message=f"Meta data file at {meta_data_path} not found.") from None
            os.remove(meta_data_path)
            logger.info("Successfully cleared NGC meta data %s", meta_data_file)
        self.clear_tokens()

    @staticmethod
    def clear_tokens():
        """Clears the token cache."""  # noqa: D401
        token_file_path = os.path.expanduser(get_cli_token_file())
        if os.path.exists(token_file_path) and os.path.isfile(token_file_path):
            os.remove(token_file_path)
        logger.info("Successfully cleared cache values.")

    def _reset_configs(self):
        """Resets config object's values."""  # noqa: D401
        # stored in db
        self._reset_db_configs()
        # not stored in db
        self._reset_non_db_configs()

    def _reset_db_configs(self):
        """Reset Configuration Attributes that are stored in "db" (the Config file)."""
        # pylint: disable=attribute-defined-outside-init
        self._app_key = _ConfigAttribute()
        self._key_id = _ConfigAttribute()
        self._key_name = _ConfigAttribute()
        self._format_type = _ConfigAttribute(default="ascii")
        self._org_name = _ConfigAttribute()
        self._org_display_name = _ConfigAttribute()
        self._team_name = _ConfigAttribute()
        self._ace_name = _ConfigAttribute()
        self._command_map = _ConfigAttribute()
        self._user_role_choices = _ConfigAttribute()
        self._product_names = _ConfigAttribute()
        self._last_upgrade_msg_date = _ConfigAttribute()
        self._configurations = _ConfigAttribute()
        self._starfleet_kas_session_key = _ConfigAttribute()
        self._starfleet_kas_email = _ConfigAttribute()
        self._starfleet_session_key_expiration = _ConfigAttribute()
        self._sdk_configuration = _ConfigAttribute(default=False)
        self._last_key_expiration_msg_date = _ConfigAttribute()

    def _reset_non_db_configs(self):
        # pylint: disable=attribute-defined-outside-init
        """Reset Configuration Attributes that are not stored in "db" (the Config file)."""
        self._base_url = _ConfigAttribute(default=add_scheme("api.ngc.nvidia.com"))
        self._debug_mode = _ConfigAttribute(default=False)

    @staticmethod
    def _reset_authentication_tokens_cache():
        ngcbase.api.authentication.Authentication._token_cache = ExpiringCache(
            max_timeout=ngcbase.api.authentication.TOKEN_EXPIRATION_TIME
        )

    @staticmethod
    def validate_format_type(value):  # noqa: D102
        return value in FORMAT_TYPES

    @staticmethod
    def _get_config_file():
        """Returns config file path."""  # noqa: D401
        return os.path.join(get_cli_config_dir(), "config")

    @staticmethod
    def _get_meta_data_file():
        """Returns meta_data file path."""  # noqa: D401
        return os.path.join(get_cli_config_dir(), "meta_data")

    def set_debug_mode_global(self, _parser, new_debug):  # noqa: D102
        self._debug_mode.global_arg = new_debug
        set_log_level(logging.DEBUG if new_debug else logging.INFO)
        return True

    def set_format_type_global(self, _parser, new_ftype):  # noqa: D102
        # TODO move this validation to the global config validation
        if not self.validate_format_type(new_ftype):
            raise ValueError('Property "format_type" has invalid value. Choose from {0}'.format(FORMAT_TYPES))
        self._format_type.global_arg = new_ftype
        return True

    def set_org_global(self, _parser, new_org):  # noqa: D102
        if not new_org:
            return False
        if new_org == "no-org":
            # Global arg case need to handle both set and single command use.
            # For single command use, we must set global_arg to None.  This
            # will cause the config set path to get skipped, so also flag removal from db here.
            self._org_name.global_arg = None
            self._org_name.global_arg_remove = True
        else:
            self._org_name.global_arg = new_org
            self._org_name.global_arg_remove = False
        return True

    def set_team_global(self, _parser, new_team):  # noqa: D102
        if not new_team:
            return False
        if new_team == "no-team":
            self._team_name.global_arg = None
            self._team_name.global_arg_remove = True
        else:
            self._team_name.global_arg = new_team
            self._team_name.global_arg_remove = False
        return True

    def set_ace_global(self, _parser, new_ace):  # noqa: D102
        if not new_ace:
            return False
        if new_ace == "no-ace":
            self._ace_name.global_arg = None
            self._ace_name.global_arg_remove = True
        else:
            self._ace_name.global_arg = new_ace
            self._ace_name.global_arg_remove = False
        return True

    def set_config_global(self, _parser, new_config):  # noqa: D102
        for config in self.configurations.values():
            if config.get("key_name", "") == new_config:
                self._format_type.global_arg = config.get("format_type", "")
                self._org_name.global_arg = config.get("org", "")
                self._team_name.global_arg = config.get("team", "")
                self._ace_name.global_arg = config.get("ace", "")
                self._app_key.global_arg = config.get("apikey")
                return True
        return False

    def validate_configuration(  # noqa: D102
        self,
        guest_mode_allowed=False,
        remote_validation=False,
        csv_allowed=False,
        json_allowed=True,
    ):
        if remote_validation:
            logger.info("Validating configuration...")
        self._check_base_url()
        if not guest_mode_allowed and (not self.app_key and not self.starfleet_kas_session_key):
            raise ValueError(
                "Missing API key and missing Email Authentication \nThis command"
                " requires an apikey or authentication via browser login."
            )
        # _check_api_key basically loads the token from tokens file, OR gets a new token if no tokens file exists
        # Which makes sense to do when user has input api_key... Need to validate if they input valid api key
        # else _get_token will raise error and return False
        if self.app_key:  # is this "if" necessary? Can just run both; will it error out if either not present
            self._check_apikey(self.app_key, remote_validation=remote_validation)
        elif self.starfleet_kas_session_key and self.starfleet_kas_email:
            # This would just load the token (if present). Currently, cannot refresh Starfleet Session Key.
            # If Starfleet Session Key expired, raise error to user asking to Reauthenticate.
            self._check_starfleet_kas_session_key()
        self._check_format_type(self.format_type)
        self._check_csv_allowed(csv_allowed)
        self._check_json_allowed(json_allowed)

        _org = self.org_name
        _team = self.team_name
        if (self.app_key or (self.starfleet_kas_session_key and self.starfleet_kas_email)) and not _org:
            raise ValueError("Missing org - If Authenticated, org is also required.")
        if (not self.app_key and (not self.starfleet_kas_session_key and not self.starfleet_kas_email)) and _org:
            raise ValueError("Invalid org - If not Authenticated, org cannot be set.")
        self._check_org(_org, remote_validation=remote_validation)
        self._check_team(_org, _team, remote_validation=remote_validation)
        self._check_ace(self.org_name, self.ace_name, remote_validation=remote_validation)
        if remote_validation:
            logger.info("Successfully validated configuration.")

    def _check_base_url(self):
        if not self.base_url:
            raise ValueError("Invalid base_url.")

    def _check_csv_allowed(self, csv_allowed):
        if self.format_type == "csv" and not csv_allowed:
            raise ValidationException(
                "The CLI format_type is currently set to csv.  "
                "This command does not support CSV formatted output.  "
                "For details on changing the format_type, see "
                'the --format_type argument from "ngc config set --help".'
            )

    def _check_json_allowed(self, json_allowed):
        if self.format_type == "json" and not json_allowed:
            raise ValidationException(
                "The CLI format_type is currently set to json.  "
                "This command does not support JSON formatted output.  "
                "For details on changing the format_type, see "
                'the --format_type argument from "ngc config set --help".'
            )

    def _check_apikey(self, _apikey, remote_validation=False):
        if remote_validation and not self.client.authentication.validate_api_key(app_key=_apikey):
            raise ValueError(f"Invalid apikey for NGC service location [{self.base_url}].")

    def _check_starfleet_kas_session_key(self):
        if not self.client.authentication.validate_sf_kas_session_key():
            raise ValueError(
                "Invalid, expired, or non-existent Session key. Please reauthenticate by logging in again."
            )

    def _check_format_type(self, _format_type):
        if not self.validate_format_type(_format_type):
            raise ValueError(f"Invalid format_type. Choose from {FORMAT_TYPES}")

    def _check_org(self, _org, remote_validation=False):
        """Checks if `_org`, which is the org's name saved in configuration, is a valid org name from the current user's
        org's. This valid list of current user's org's is a list of the unique org names; not the display names of the
        orgs.
        """  # noqa: D205, D401
        # Skip org validation if using a service key
        if self.app_key and self.app_key.startswith(SCOPED_KEY_PREFIX):
            sak_key_details = self._get_sak_key_details(self.app_key)
            if sak_key_details is None or sak_key_details.type == "SERVICE_KEY":
                logger.debug("Service key detected. Skipping org validation.")
                return

        if remote_validation:
            _valid_orgs = self.get_org_names()
            unique_org_names = [names.get("org_name") for names in _valid_orgs.values()]
            if _org and _org not in unique_org_names:
                raise ValueError("Invalid org. Choose from {0}".format(unique_org_names))

    def _check_team(self, _org, _team, remote_validation=False):
        if _team is not None:
            if _org is None:
                raise ValueError("Invalid team. Team is invalid with no org.")
            if remote_validation:
                _valid_teams = self.get_team_list()
                if _team not in _valid_teams:
                    raise ValueError("Invalid team. Choose from {0}".format(_valid_teams))

    def _check_ace(self, _org, _ace, remote_validation=False):
        if _ace is not None:
            if _org is None:
                raise ValueError("Invalid ace. Ace is invalid with no org.")
            if remote_validation:
                _valid_aces = self.get_ace_list()
                if _ace not in _valid_aces:
                    raise ValueError("Invalid ace. Choose from {0}".format(_valid_aces))

    def validate_ace(self, new_ace):  # noqa: D102
        self._check_ace(self.org_name, new_ace)

    def get_org_names(self):  # noqa: D102
        # if apikey not set, org must be no-org, if apikey set, org cannot be no-org
        _org_dict = {}
        if self.app_key or (self.starfleet_kas_session_key and self.starfleet_kas_email):
            if self.app_key and self.app_key.startswith(SCOPED_KEY_PREFIX):
                # Scoped API Keys only have one org.
                sak_key_details = self._get_sak_key_details(self.app_key)

                # Check if sak_key_details is None (in case of a service key)
                if sak_key_details is None:
                    logger.debug("Service key detected. Org details are not available.")
                    return _org_dict  # Return an empty dictionary or handle accordingly

                org_choices = [sak_key_details.orgName]
                org_display_name = ""
                _org_dict[sak_key_details.orgName] = {
                    "org_name": sak_key_details.orgName,
                    "org_display_name": org_display_name,
                }
            else:
                org_api = ConfigAPI(self.client)
                try:
                    org_choices = org_api.get_orgs()
                except (AuthenticationException, AccessDeniedException):
                    org_choices = []
                for org in org_choices:
                    org_name = org.name
                    org_display_name = org.displayName
                    full_org_name = org_name
                    if org_display_name:
                        full_org_name = f"{org_display_name} ({org_name})"
                    _org_dict[full_org_name] = {
                        "org_name": org_name,
                        "org_display_name": org_display_name,
                    }
        return _org_dict

    def get_team_list(self):  # noqa: D102
        _team_list = []
        if self.app_key or (self.starfleet_kas_session_key and self.starfleet_kas_email):
            if self.app_key and self.app_key.startswith(SCOPED_KEY_PREFIX):
                sak_key_details = self._get_sak_key_details(self.app_key)  # noqa: E1121
                # Check if sak_key_details is not None before accessing user and roles
                if (
                    sak_key_details
                    and getattr(sak_key_details, "user", None)
                    and hasattr(sak_key_details.user, "roles")
                ):
                    _team_list = [role.team.name for role in sak_key_details.user.roles if role.team]
                else:
                    _team_list = []
            else:
                team_api = ConfigAPI(self.client)
                try:
                    team_choices = team_api.get_teams(self.org_name)
                except (AuthenticationException, AccessDeniedException):
                    team_choices = []
                _team_list = [str(t.name) for t in team_choices]
        _team_list.append("no-team")
        return _team_list

    def get_ace_list(self):  # noqa: D102
        _ace_list = []
        if self.app_key or (self.starfleet_kas_session_key and self.starfleet_kas_email):
            ace_api = ConfigAPI(self.client)
            try:
                ace_choices = ace_api.get_aces(self.org_name, self.team_name)
            except (AuthenticationException, AccessDeniedException):
                ace_choices = []
            # NOTE: aces ARE case sensitive unlike org/team
            _ace_list = [str(a.name) for a in ace_choices]
        _ace_list.append("no-ace")
        return _ace_list

    def _set_command_map(self):
        """Construct the command by calling users/me to get list of roles.
        Roles authorize users to call a certain service. CLI maps roles to CLI-commands
        the user can call.
        """  # noqa: D205
        _command_map = None
        user_role_choices = []
        if self.app_key or (self.starfleet_kas_session_key and self.starfleet_kas_email):
            _commands = ["user", "diag"]
            try:
                if self.app_key:
                    self._check_apikey(self.app_key, True)
                elif self.starfleet_kas_session_key and self.starfleet_kas_email:
                    self._check_starfleet_kas_session_key()
                else:
                    raise NgcException("An unknown error has occurred. Please ensure configuration is set.") from None

                # Avoid user-specific API calls if service key is used
                if self.app_key and self.app_key.startswith(SCOPED_KEY_PREFIX):
                    sak_key_details = self._get_sak_key_details(self.app_key)
                    if sak_key_details is None or sak_key_details.type == "SERVICE_KEY":
                        logger.debug("Service key detected. Skipping user role fetching.")
                        return  # Skip role fetching

                user_response = ConfigAPI(self.client).user_who()
                user_roles = []
                for user_role in user_response.user.roles or []:
                    user_roles.extend(user_role.orgRoles or [])
                    user_roles.extend(user_role.teamRoles or [])
                user_roles = set(user_roles)
                # Get all roles, including hidden roles, from API to create command map
                hidden_roles_response = self.client.connection.make_api_request(
                    "GET", "roles?show-hidden=true", operation_name="get role def"
                )
                hidden_roles_defs = NameSpaceObj(hidden_roles_response)
                _actions = []
                for role in hidden_roles_defs.roles or []:
                    _actions.extend([action.service for action in role.allowedActions or [] if role.name in user_roles])
                _actions = set(_actions)
                _commands.extend(
                    [command for action in _actions or [] if action in SERVICE_MAP for command in SERVICE_MAP[action]]
                )
                # Get non-hidden/public roles from API to create command map
                public_roles_response = self.client.connection.make_api_request(
                    "GET", "roles?show-hidden=false", operation_name="get role def"
                )
                public_roles_defs = NameSpaceObj(public_roles_response)
                user_role_choices = []
                for role in public_roles_defs.roles or []:
                    user_role_choices.append(role.name)
            except Exception as errStr:  # pylint: disable=broad-except
                logger.debug(str(errStr))
                if self.app_key:
                    logger.debug(
                        "Error setting command map with API Key %s for location %s, default set",
                        mask_string(self.app_key),
                        self.base_url,
                    )
                if self.starfleet_kas_session_key and self.starfleet_kas_email:
                    logger.debug(
                        "Error setting command map with Starfleet Session Key %s for location %s, default set",
                        mask_string(self.starfleet_kas_session_key),
                        self.base_url,
                    )
            if self.app_key:
                _command_map = {
                    "apikey": self.app_key,
                    "commands": list(set(_commands)),
                }
            else:
                _command_map = {
                    "starfleet_session_key": self.starfleet_kas_session_key,
                    "commands": list(set(_commands)),
                }
        self.command_map = _command_map
        self.user_role_choices = user_role_choices

    def set_command_map(self):
        """Gets the command map from `_set_command_map`, stores into db and saves onto config file.
        Will only be saved onto the config file if 1.) no command map currently exists, 2.) the previous command
        map doesn't equal the newly constructed command map (when API Key doesn't change), or 3.) when the API
        Key for the cmd map map doesn't equal the current API Key.
        """  # noqa: D205, D401
        # Check if we have a service key and skip command map setup if true
        if self.app_key and self.app_key.startswith(SCOPED_KEY_PREFIX):
            sak_key_details = self._get_sak_key_details(self.app_key)
            if sak_key_details is None or sak_key_details.type == "SERVICE_KEY":
                logger.debug("Service key detected. Skipping command map setup.")
                return  # Skip setting command map

        meta_parser = self._db._parse_meta_data()  # pylint: disable=protected-access
        prev_command_map = {}
        prev_rm_command_map = True
        if meta_parser.has_option("COMMAND_MAP", "command_map"):
            try:
                command_map = json.loads(meta_parser.get("COMMAND_MAP", "command_map"))
            except (ValueError, TypeError, json.decoder.JSONDecodeError, OSError) as e:
                logger.debug("Error loading command_map from config: %s", e)
                command_map = {}
            if self.app_key and self.app_key == command_map.get("apikey", ""):
                prev_command_map = command_map
                prev_rm_command_map = False
            if self.starfleet_kas_session_key and self.starfleet_kas_session_key == command_map.get(
                "starfleet_session_key", ""
            ):
                prev_command_map = command_map
                prev_rm_command_map = False

        self._set_command_map()

        # pylint: disable=protected-access
        deprecated_attr_detected = self._db._clean_deprecated(self._db._parse_cfg_file())
        if (
            (not prev_command_map and self._command_map.global_arg)
            or (
                self._command_map.global_arg
                and (
                    set(prev_command_map.get("commands")) != set(self._command_map.global_arg.get("commands"))
                    or prev_rm_command_map != self._command_map.global_arg_remove
                )
            )
            or deprecated_attr_detected  # pylint: disable=protected-access
        ):
            # pylint: disable=protected-access
            self._db.command_map = self._command_map.global_arg
            self._db.rm_command_map = not self._command_map.global_arg
            self._db.user_role_choices = self._user_role_choices.global_arg
            self._db.rm_user_role_choices = not self._user_role_choices.global_arg
            try:
                self._db.store(new_command_map=True)
            except Exception as errStr:  # pylint: disable=broad-except
                logger.debug(str(errStr))
                logger.debug("Error writing command map to the meta data file.")

    def set_last_upgrade_msg_date(self):  # noqa: E1120
        """This method will print an upgrade message to the user. Displaying the message every time a command is ran is
        not desired, so there are checks before printing the upgrade message. These checks are specified in the
        `main` method of `ngccli/ngcp.py` file. Any `ngc` command should trigger this check.
        Current checks require a `config` file with a None/invalid `last_upgrade_msg_date` value (to begin tracking),
        or that a valid value of `last_upgrade_msg_date` is >= `DAYS_BEFORE_DISPLAYING_UPGRADE_MSG` older than the time
        the command was ran. This last check is the main check to ensure every to any command is not delayed.
        """  # noqa: D205, D401, D404
        self._set_last_upgrade_msg_date()
        self._db.last_upgrade_msg_date = self._last_upgrade_msg_date.global_arg
        try:
            self._db.store(write_msg_dates=True)
        except Exception as errStr:  # pylint: disable=broad-except
            logger.debug(str(errStr))
            logger.debug("Error writing last upgrade message date to the meta data file.")

    def _set_last_upgrade_msg_date(self):
        """This method sets a value to `last_upgrade_msg_date`. This value is None if there is no api key saved to the
        `config` file (no configuration set). If an api key is saved to the `config` file, then the value of
        `last_upgrade_msg_date` is `datetime.datetime.now()`. The message is only displayed if `format_type` is "ascii"
        and when the current CLI version is outdated.
        """  # noqa: D205, D401, D404
        _last_upgrade_msg_date = datetime.datetime.now().replace(microsecond=0).strftime("%Y-%m-%d::%H:%M:%S")
        self.last_upgrade_msg_date = _last_upgrade_msg_date

        # EARLY RETURN
        if self.format_type != "ascii":
            # Skip this check for machine-readable formats.
            # (We won't show an upgrade message, even if the CLI is out of date.)
            return

        try:
            parsed_current_version = version.parse(VERSION_NUM)
        except version.InvalidVersion:
            # EARLY RETURN
            logger.debug("Skipping version check because %r is not a valid version.", VERSION_NUM)
            return

        # TODO: Avoid circular import error (VersionAPI), remove `_get_latest_version` from configuration.py
        latest_version = None
        try:
            latest_version = self._get_latest_version()
        except Exception as errStr:  # pylint: disable=broad-except
            logger.debug(str(errStr), exc_info=True)
            if self.app_key:
                logger.debug(
                    "Error getting latest version with API Key %s for location %s",
                    mask_string(self.app_key),
                    self.base_url,
                )
            elif self.starfleet_kas_session_key and self.starfleet_kas_email:
                logger.debug(
                    "Error getting latest version with Starfleet Session Key %s and Email %s for location %s",
                    mask_string(self.starfleet_kas_session_key),
                    self.starfleet_kas_email,
                    self.base_url,
                )
            else:
                logger.debug(
                    "Error getting latest version for location %s",
                    self.base_url,
                )
        if latest_version and parsed_current_version < version.parse(latest_version):
            nv_pp = self.client.printer
            nv_pp.print_upgrade_message(latest_version=latest_version, version_num=VERSION_NUM)

    def _get_unified_catalog_product_names(self):
        # Get non-hidden/public roles from API to create command map
        product_names_response = self.client.connection.make_api_request(
            "GET", "/v2/products", operation_name="get product names"
        )
        product_names_list = product_names_response.get("products")
        product_names = []
        for product_name in product_names_list:
            product_names.append(product_name.get("name"))
        self.product_names = product_names

    def get_unified_catalog_product_names(self):  # noqa: D102
        self._get_unified_catalog_product_names()
        self._db.product_names = self._product_names.global_arg
        try:
            self._db.store(write_msg_dates=True)
        except Exception as errStr:  # pylint: disable=broad-except
            logger.debug(str(errStr))
            logger.debug("Error writing product names list to the meta data file.")

    def _get_sak_key_details(self, sak_key):
        """Returns info about the Scoped API Key (SAK) including the orgName which this Key has permissions to,
        the keyType (Personal or Service), products that this Key has permissions to, userId (if personal key), and
        user object (only for personal key). Personal == USER. Service == CLOUD_ACCOUNT.
        If this method change, must change the method under organization.api.users.user_who_personal_key()
        and vice versa.
        """  # noqa: D205, D401
        # This is an open Endpoint. No Auth:Bearer token needed.
        sak_key_details = self.client.authentication.get_sak_key_details(sak_key)  # noqa: E1120

        # Check the keyType and display a warning if it's a service key
        if sak_key_details.type == "SERVICE_KEY":
            logger.debug("Service key detected. Skipping user-specific API calls like /users/me.")

        return sak_key_details

    def _get_latest_version(self):
        # TODO: Avoid circular import error (VersionAPI), remove this method
        resource_org = VERSION_UPGRADE_CONSTANTS.get("RESOURCE_ORG_NAME")
        resource_team = VERSION_UPGRADE_CONSTANTS.get("RESOURCE_TEAM_NAME")
        catalog_resource_name = CATALOG_RESOURCE_NAMES.get(
            get_environ_tag(), VERSION_UPGRADE_CONSTANTS.get("PROD_RESOURCE_NAME")
        )
        get_url = f"/v2/resources/{resource_org}/{resource_team}/{catalog_resource_name}"
        try:
            resp = self.client.connection.make_api_request("GET", get_url, operation_name="get latest version")
        except ResourceNotFoundException:
            return None
        return resp["recipe"]["latestVersionIdStr"]


class ConfigDB(NGC_DB):  # noqa: D101
    def __init__(self, filename=None):  # pylint: disable=super-init-not-called
        self._filename = os.path.expanduser(filename)
        self._newConfigFilename = os.path.join(os.path.dirname(self._filename), "newConfig")
        self._configBakFilename = os.path.join(os.path.dirname(self._filename), "config.BAK")
        self._meta_filename = os.path.join(os.path.dirname(self._filename), "meta_data")
        self._new_meta_filename = os.path.join(os.path.dirname(self._filename), "new_meta_data")
        self._bak_meta_filename = os.path.join(os.path.dirname(self._filename), "meta_data.BAK")
        self.app_key = None
        self.rm_app_key = None
        self.key_id = None
        self.rm_key_id = None
        self.key_name = None
        self.rm_key_name = None
        self.format_type = None
        self.org = None
        self.rm_org = False
        self.org_display_name = None
        self.rm_org_display_name = None
        self.team = None
        self.rm_team = False
        self.ace = None
        self.rm_ace = False
        self.command_map = None
        self.rm_command_map = None
        self.user_role_choices = None
        self.rm_user_role_choices = None
        self.product_names = None
        self.rm_product_names = None
        self.last_upgrade_msg_date = None
        self.starfleet_kas_session_key = None
        self.rm_starfleet_kas_session_key = None
        self.starfleet_kas_email = None
        self.rm_starfleet_kas_email = None
        self.starfleet_session_key_expiration = None
        self.sdk_configuration = False
        self.configurations = None
        self.last_key_expiration_msg_date = None

    def _parse_cfg_file(self):
        # By default. ConfigParser has [('DEFAULT', <Section: DEFAULT>)]
        parser = ConfigParser()
        if os.path.isfile(self._filename):
            try:
                parser.read(self._filename)
            except (MissingSectionHeaderError, ParsingError):
                sys.exit(
                    ConfigFileException("ERROR: Config file is corrupt. Please re-set configuration with `config set`")
                )
        return parser

    def _parse_meta_data(self):
        """Parsing the meta_data file. A corrupt meta_data file is fine; just need to catch the exception.
        CLI will automatically refresh the meta_data file with command_map and/or last_upgrade_msg_date.
        """  # noqa: D205, D401
        parser = ConfigParser()
        if os.path.isfile(self._meta_filename):
            try:
                parser.read(self._meta_filename)
            except MissingSectionHeaderError as e:
                logger.debug("Meta data file is corrupt. Error: %s", e)
            except ParsingError as e:
                logger.debug("Malformed meta data file. Error: %s", e)
        return parser

    def _write_cfg_file(self, parser):
        if not os.path.exists(os.path.dirname(self._filename)):
            os.makedirs(os.path.dirname(self._filename))
        try:
            with open(self._newConfigFilename, "w+", encoding="utf-8") as f:
                msg = (
                    ";WARNING - This is a machine generated file.  Do not edit"
                    ' manually.\n;WARNING - To update local config settings, see "ngc'
                    ' config set -h" \n\n'
                )
                f.write(msg)
                parser.write(f)
        except OSError as e:
            raise ConfigFileException(f"NGC configuration was NOT set; reason: {e}") from None

        if os.path.exists(self._filename):
            os.replace(self._filename, self._configBakFilename)
        os.replace(self._newConfigFilename, self._filename)

    def _write_meta_file(self, parser):
        if not os.path.exists(os.path.dirname(self._meta_filename)):
            os.makedirs(os.path.dirname(self._meta_filename))
        try:
            with open(self._new_meta_filename, "w+", encoding="utf-8") as f:
                msg = ";WARNING - This is a machine generated file.  Do not edit manually.\n\n"
                f.write(msg)
                parser.write(f)
        except OSError as e:
            raise ConfigFileException(f"NGC meta data was NOT set; reason: {e}") from None

        if os.path.exists(self._meta_filename):
            os.replace(self._meta_filename, self._bak_meta_filename)
        os.replace(self._new_meta_filename, self._meta_filename)

    @staticmethod
    def _clean_deprecated(parser):
        """Purge deprecated items from the config file."""
        deprecated_attrs_removed = []
        if parser.has_section("MODE"):
            parser.remove_section("MODE")
            deprecated_attrs_removed.append("MODE")
        if parser.has_section("VERSION"):
            parser.remove_section("VERSION")
            deprecated_attrs_removed.append("VERSION")
        if parser.has_option("DEFAULT", "baseurl"):
            parser.remove_option("DEFAULT", "baseurl")
            deprecated_attrs_removed.append(("DEFAULT", "baseurl"))
        if parser.has_option("DEFAULT", "appkey"):
            parser.remove_option("DEFAULT", "appkey")
            deprecated_attrs_removed.append(("DEFAULT", "appkey"))
        if parser.has_option("DEFAULT", "apikey"):
            parser.remove_option("DEFAULT", "apikey")
            deprecated_attrs_removed.append(("DEFAULT", "apikey"))
        if parser.has_option("DEFAULT", "type"):
            parser.remove_option("DEFAULT", "type")
            deprecated_attrs_removed.append(("DEFAULT", "type"))
        # last config format
        if parser.has_section("DEFAULT"):
            parser.remove_section("DEFAULT")
            deprecated_attrs_removed.append("DEFAULT")
        if parser.has_section("OUTPUT_FORMAT"):
            parser.remove_section("OUTPUT_FORMAT")
            deprecated_attrs_removed.append("OUTPUT_FORMAT")
        if parser.has_option("CURRENT", "commands"):
            parser.remove_option("CURRENT", "commands")
            deprecated_attrs_removed.append(("CURRENT", "commands"))
        # moving command_map and last_upgrade_msg_date to meta_data file
        if parser.has_option("CURRENT", "command_map"):
            parser.remove_option("CURRENT", "command_map")
            deprecated_attrs_removed.append(("CURRENT", "command_map"))
        if parser.has_option("CURRENT", "last_upgrade_msg_date"):
            parser.remove_option("CURRENT", "last_upgrade_msg_date")
            deprecated_attrs_removed.append(("CURRENT", "last_upgrade_msg_date"))
        return bool(deprecated_attrs_removed)

    def _load_deprecated(self, parser):
        """Load the old sections."""
        if parser.has_option("DEFAULT", "apikey"):
            self.app_key = parser.get("DEFAULT", "apikey")
        # TODO - how long do we need to keep handling deprecated 'appkey'?
        elif parser.has_option("DEFAULT", "appkey"):
            self.app_key = parser.get("DEFAULT", "appkey")
        if parser.has_option("OUTPUT_FORMAT", "type"):
            self.format_type = parser.get("OUTPUT_FORMAT", "type")

    def load(self):  # noqa: D102
        logger.debug("Loading config file: %s", self._filename)
        cfg_parser = self._parse_cfg_file()
        logger.debug("Loading meta_data file: %s", self._meta_filename)
        meta_parser = self._parse_meta_data()
        self._load_deprecated(cfg_parser)
        # For `config` file:
        # [CURRENT]
        # apikey
        # key_name
        # key_id
        #   starfleet_kas_session_key
        #   starfleet_kas_email
        # format_type
        # org
        # org_display_name
        # team
        # ace

        # [API-KEY]
        # apikey
        # key_id
        # key_name
        #   starfleet_kas_session_key
        #   starfleet_kas_email
        # format_type
        # org
        # org_display_name
        # team
        # ace

        # For `meta_data` file:
        # [COMMAND_MAP]
        # command_map
        # [UPGRADE]
        # last_upgrade_msg_date
        # [USER_ROLES]
        # user_role_choices
        # [PRODUCT_NAMES]
        # product_names
        self._load_config_file(cfg_parser=cfg_parser)
        self._load_meta_data(meta_parser=meta_parser)

    def _load_config_file(self, cfg_parser):
        if cfg_parser.has_section("CURRENT"):
            if cfg_parser.has_option("CURRENT", "apikey"):
                self.app_key = cfg_parser.get("CURRENT", "apikey")
            if cfg_parser.has_option("CURRENT", "key_id"):
                self.key_id = cfg_parser.get("CURRENT", "key_id")
            if cfg_parser.has_option("CURRENT", "key_name"):
                self.key_name = cfg_parser.get("CURRENT", "key_name")
            if cfg_parser.has_option("CURRENT", "starfleet_kas_session_key"):
                self.starfleet_kas_session_key = cfg_parser.get("CURRENT", "starfleet_kas_session_key")
            if cfg_parser.has_option("CURRENT", "starfleet_kas_email"):
                self.starfleet_kas_email = cfg_parser.get("CURRENT", "starfleet_kas_email")
            if cfg_parser.has_option("CURRENT", "starfleet_session_key_expiration"):
                expiration_time = cfg_parser.get("CURRENT", "starfleet_session_key_expiration")
                expiration_time = datetime.datetime.strptime(expiration_time, "%Y-%m-%d::%H:%M:%S")
                self.starfleet_session_key_expiration = datetime.datetime.timestamp(expiration_time)
            if cfg_parser.has_option("CURRENT", "format_type"):
                self.format_type = cfg_parser.get("CURRENT", "format_type")
            if cfg_parser.has_option("CURRENT", "org"):
                self.org = cfg_parser.get("CURRENT", "org")
            if cfg_parser.has_option("CURRENT", "org_display_name"):
                self.org_display_name = cfg_parser.get("CURRENT", "org_display_name")
            if cfg_parser.has_option("CURRENT", "team"):
                self.team = cfg_parser.get("CURRENT", "team")
            if cfg_parser.has_option("CURRENT", "ace"):
                self.ace = cfg_parser.get("CURRENT", "ace")
        cfg_parser_sections = cfg_parser.sections()
        if len(cfg_parser_sections) > 1:
            configurations = {s: dict(cfg_parser.items(s)) for s in cfg_parser_sections}
            try:
                configurations.pop("CURRENT")
            except KeyError:
                pass
            self.configurations = configurations

    def _load_meta_data(self, meta_parser):
        if meta_parser.has_section("COMMAND_MAP"):
            if meta_parser.has_option("COMMAND_MAP", "command_map"):
                try:
                    command_map = json.loads(meta_parser.get("COMMAND_MAP", "command_map"))
                except json.decoder.JSONDecodeError as e:
                    logger.debug("Error loading command_map: %s", e)
                    command_map = {}
                if self.app_key == command_map.get("apikey", ""):
                    self.command_map = command_map
                elif self.starfleet_kas_session_key == command_map.get("starfleet_session_key", ""):
                    self.command_map = command_map
        if meta_parser.has_section("UPGRADE"):
            if meta_parser.has_option("UPGRADE", "last_upgrade_msg_date"):
                self.last_upgrade_msg_date = meta_parser.get("UPGRADE", "last_upgrade_msg_date")
            if meta_parser.has_option("UPGRADE", "last_key_expiration_msg_date"):
                self.last_key_expiration_msg_date = meta_parser.get("UPGRADE", "last_key_expiration_msg_date")
                self.last_key_expiration_msg_date = datetime.datetime.strptime(
                    self.last_key_expiration_msg_date, "%Y-%m-%d::%H:%M:%S"
                )
        if meta_parser.has_section("USER_ROLES"):
            if meta_parser.has_option("USER_ROLES", "user_role_choices"):
                try:
                    self.user_role_choices = json.loads(meta_parser.get("USER_ROLES", "user_role_choices"))
                except json.decoder.JSONDecodeError as e:
                    logger.debug("Error loading user_role_choices: %s", e)
                    self.user_role_choices = []
        if meta_parser.has_section("PRODUCT_NAMES"):
            if meta_parser.has_option("PRODUCT_NAMES", "product_names"):
                try:
                    self.product_names = json.loads(meta_parser.get("PRODUCT_NAMES", "product_names"))
                except json.decoder.JSONDecodeError as e:
                    logger.debug("Error loading product_names: %s", e)
                    self.product_names = []

    def _handle_removals(self, cfg_parser, meta_parser):
        if self.rm_app_key:
            cfg_parser.remove_option("CURRENT", "apikey")
        if self.rm_starfleet_kas_session_key:
            cfg_parser.remove_option("CURRENT", "starfleet_kas_session_key")
        if self.rm_starfleet_kas_email:
            cfg_parser.remove_option("CURRENT", "starfleet_kas_email")
        if self.rm_org:
            cfg_parser.remove_option("CURRENT", "org")
        if self.rm_org_display_name:
            cfg_parser.remove_option("CURRENT", "org_display_name")
        if self.rm_team:
            cfg_parser.remove_option("CURRENT", "team")
        if self.rm_ace:
            cfg_parser.remove_option("CURRENT", "ace")
        if self.rm_command_map:
            meta_parser.remove_option("COMMAND_MAP", "command_map")
        if bool(self.rm_user_role_choices):
            meta_parser.remove_option("USER_ROLES", "user_role_choices")
        if bool(self.rm_product_names):
            meta_parser.remove_option("PRODUCT_NAMES", "product_names")

    def _store_meta_data(self, prev_meta_parser):
        if not prev_meta_parser.has_section("COMMAND_MAP"):
            prev_meta_parser.add_section("COMMAND_MAP")
        if not prev_meta_parser.has_section("UPGRADE"):
            prev_meta_parser.add_section("UPGRADE")
        if not prev_meta_parser.has_section("USER_ROLES"):
            prev_meta_parser.add_section("USER_ROLES")
        if not prev_meta_parser.has_section("PRODUCT_NAMES"):
            prev_meta_parser.add_section("PRODUCT_NAMES")

        if bool(self.command_map):
            prev_meta_parser.set("COMMAND_MAP", "command_map", json.dumps(self.command_map))
        if self.last_upgrade_msg_date is not None:
            prev_meta_parser.set("UPGRADE", "last_upgrade_msg_date", self.last_upgrade_msg_date)
        if bool(self.user_role_choices):
            prev_meta_parser.set("USER_ROLES", "user_role_choices", json.dumps(self.user_role_choices))
        if bool(self.product_names):
            prev_meta_parser.set("PRODUCT_NAMES", "product_names", json.dumps(self.product_names))
        if bool(self.last_key_expiration_msg_date):
            prev_meta_parser.set(
                "UPGRADE",
                "last_key_expiration_msg_date",
                self.last_key_expiration_msg_date.strftime("%Y-%m-%d::%H:%M:%S"),
            )

    def _store_config_file(self, prev_cfg_parser):
        if not prev_cfg_parser.has_section("CURRENT"):
            prev_cfg_parser.add_section("CURRENT")
        if self.app_key is not None:
            prev_cfg_parser.set("CURRENT", "apikey", self.app_key)
            if self.key_id:
                prev_cfg_parser.set("CURRENT", "key_id", self.key_id)
            else:
                prev_cfg_parser.remove_option("CURRENT", "key_id")
            if self.key_name:
                prev_cfg_parser.set("CURRENT", "key_name", self.key_name)
            else:
                prev_cfg_parser.remove_option("CURRENT", "key_name")
            if prev_cfg_parser.has_option("CURRENT", "starfleet_session_key_expiration"):
                prev_cfg_parser.remove_option("CURRENT", "starfleet_session_key_expiration")
        if not self.app_key:
            if self.starfleet_kas_session_key is not None:
                prev_cfg_parser.set(
                    "CURRENT",
                    "starfleet_kas_session_key",
                    self.starfleet_kas_session_key,
                )
            if self.starfleet_kas_email is not None:
                prev_cfg_parser.set("CURRENT", "starfleet_kas_email", self.starfleet_kas_email)
            if self.starfleet_session_key_expiration is not None:
                expiration_time = datetime.datetime.fromtimestamp(self.starfleet_session_key_expiration).strftime(
                    "%Y-%m-%d::%H:%M:%S"
                )
                prev_cfg_parser.set("CURRENT", "starfleet_session_key_expiration", expiration_time)
                if prev_cfg_parser.has_option("CURRENT", "apikey"):
                    prev_cfg_parser.remove_option("CURRENT", "apikey")
        if self.format_type is not None:
            prev_cfg_parser.set("CURRENT", "format_type", self.format_type)
        if self.org is not None:
            prev_cfg_parser.set("CURRENT", "org", self.org)
        if self.org_display_name is not None:
            prev_cfg_parser.set("CURRENT", "org_display_name", self.org_display_name)
        if self.team is not None:
            prev_cfg_parser.set("CURRENT", "team", self.team)
        if self.ace is not None:
            prev_cfg_parser.set("CURRENT", "ace", self.ace)
        if self.configurations is not None:
            self._store_configurations_in_config(prev_cfg_parser)

    def _store_configurations_in_config(self, prev_cfg_parser):
        """Remove the section of the self.app_key (or "no-apikey"), then save the configurations."""
        app_key = self.app_key if self.app_key else "no-apikey"
        prev_cfg_parser.remove_section(app_key)
        for section, configuration_details in self.configurations.items():
            try:
                prev_cfg_parser.add_section(section)
            except DuplicateSectionError:
                pass
            for attr, value in configuration_details.items():
                prev_cfg_parser.set(section, attr, value)

    # pylint: disable=arguments-differ
    def store(self, set_config=False, write_msg_dates=False, new_command_map=False):  # noqa: D102
        prev_cfg_parser = self._parse_cfg_file()
        self._store_config_file(prev_cfg_parser=prev_cfg_parser)
        prev_meta_parser = self._parse_meta_data()
        self._store_meta_data(prev_meta_parser=prev_meta_parser)
        self._handle_removals(prev_cfg_parser, prev_meta_parser)
        deprecated_attrs_removed = self._clean_deprecated(prev_cfg_parser)
        if set_config or deprecated_attrs_removed:
            self._write_cfg_file(prev_cfg_parser)
        if write_msg_dates or new_command_map:
            self._write_meta_file(prev_meta_parser)


class _ConfigAttribute:
    """configuration attribute container.

    A cfg attribute can come from many source.  The following
    sources are supported in the following priority.

    1) global argument
    2) env variable
    3) database (aka user settings file)
    4) default

    Each of these can be an actual value, or a negative override flag.
    The negative override flag behaves slightly different at different
    priorities:

    1) global argument negative override flag
        * clear the attribute for the current command
        * clear the attribute in the db for "config set" commands.
    2) env variable negative override flag
        * clear the attribute for the current command
        * Do NOT clear the attribute in the db for "config set" commands.
    3) database
        * it's not possible for an override flag to be set in the db
    4) default
        * it's not possible for a default to be an override flag.

    global_arg_remove is a flag to signal the user requested to remove
    the attribute from the db using:  (no-apikey, no-org, no-team, no-ace).

    env_var_remove is a flag that signals an env var with the override flag set.
    In this case, the attribute is cleared (within the normal config hierarchy),
    but it is not flagged for remove from the db.
    """

    def __init__(
        self,
        global_arg=None,
        global_arg_remove=False,
        env_var=None,
        env_var_remove=False,
        db=None,
        default=None,
    ):
        self.global_arg = global_arg
        self.global_arg_remove = global_arg_remove
        self.env_var = env_var
        self.env_var_remove = env_var_remove
        self.db = db
        self.default = default

    @property
    def value(self):
        # override setting and return None if specifying no-[team | org | ace] on the CLI.
        if self.global_arg_remove:
            return None
        if self.global_arg:
            return self.global_arg
        if self.env_var_remove:
            return None
        return self.env_var or self.db or self.default

    # TODO unit test
    def get_src(self):
        if self.global_arg or self.global_arg_remove:
            return "global argument"

        if self.env_var or self.env_var_remove:
            return "environment variable"

        if self.db:
            return "user settings"

        if self.default:
            return "default value"

        return ""

    def __str__(self):
        hdr = "--{}--\n".format(self.__class__.__name__)
        glb = "    global_arg:{}\n".format(self.global_arg)
        env = "    env_var:{}\n".format(self.env_var)
        db = "    db:{}\n".format(self.db)
        df = "    default:{}\n".format(self.default)
        val = "    value:{}\n".format(self.value)
        return "".join([hdr, val, glb, env, db, df])


class ConfigAPI:  # noqa: D101
    def __init__(self, api_client):
        self.client = api_client

    def get_orgs(self):
        """List all the organizations user can access."""
        query = f"{API_VERSION}/orgs?page-size={PAGE_SIZE}"
        orgs_list_pages = pagination_helper(self.client.connection, query, operation_name="get orgs")
        list_of_orgs = []

        for page in orgs_list_pages:
            list_of_orgs.extend(NameSpaceObj(page).organizations)

        return list_of_orgs

    def get_teams(self, org_name):
        """Get list of teams from an org."""
        query = f"{API_VERSION}/org/{org_name}/teams?page-size={PAGE_SIZE}"
        teams_list_pages = pagination_helper(
            self.client.connection, query, org_name=org_name, operation_name="get teams"
        )
        list_of_teams = []

        for page in teams_list_pages:
            list_of_teams.extend(NameSpaceObj(page).teams)

        return list_of_teams

    def get_aces(self, org_name, team_name=None):
        """Get list of ACEs. Filters by team name if provided."""
        base_url = f"{API_VERSION}/org/{org_name}"
        team_segment = f"/team/{team_name}" if team_name else ""
        query = f"{base_url}{team_segment}/aces?page_size={PAGE_SIZE}"

        return chain(
            *[
                NameSpaceObj(res).aces
                for res in pagination_helper(
                    self.client.connection, query, org_name=org_name, team_name=team_name, operation_name="get aces"
                )
                if NameSpaceObj(res).aces
            ]
        )

    def user_who(self):
        """Returns user information."""  # noqa: D401
        request_endpoint = f"{API_VERSION}/users/me"
        response = self.client.connection.make_api_request("GET", request_endpoint, operation_name="get user info")
        return NameSpaceObj(response)
