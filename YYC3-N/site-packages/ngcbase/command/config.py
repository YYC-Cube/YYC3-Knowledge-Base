#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from argparse import ArgumentTypeError, SUPPRESS
import logging

from ngcbase.command.args_validation import email_used
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import CANARY_ENV, ENABLE_TYPE, FORMAT_TYPES
from ngcbase.environ import (
    NGC_CLI_API_KEY,
    NGC_CLI_EMAIL,
    NGC_CLI_ENABLE_MULTIPLE_CONFIGS,
)
from ngcbase.errors import AccessDeniedException, InvalidArgumentError, NgcException
from ngcbase.printer.config import ConfigPrinter
from ngcbase.util.io_utils import get_user_tty_input, mask_string
from ngcbase.util.utils import get_environ_tag

logger = logging.getLogger(__name__)

MULTIPLE_CONFIGURATIONS = get_environ_tag() <= CANARY_ENV and NGC_CLI_ENABLE_MULTIPLE_CONFIGS


# TODO - update global_arg, not public setter, (get rid of public setters)
class ConfigCommand(CLICommand):  # noqa: D101
    CMD_NAME = "config"
    HELP = "Configuration Commands"
    DESC = "Configuration Commands"
    CLI_HELP = ENABLE_TYPE

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.make_bottom_commands(parser)
        self.prev_current_api_key = None
        self.prev_current_config_list = {}
        self.config = self.client.config
        self.printer = ConfigPrinter(self.client.config)

    config_clear_str = "Clear the configuration stored in the user settings file."

    @CLICommand.command(help=config_clear_str, description=config_clear_str)
    def clear(self, _args):  # pylint: disable=no-self-use
        """Clears config."""  # noqa: D401
        # TODO: Clear the command map in the `meta_data` file.
        self.config.clear_configs()
        # TODO - handle label clear

    token_clear_str = "Clear cached values."

    @CLICommand.command(name="clear-cache", help=token_clear_str, description=token_clear_str)
    def clear_cache(self, _args):  # pylint: disable=no-self-use
        """Clears token cache."""  # noqa: D401
        self.config.clear_tokens()

    config_set_str = (
        "Set the configuration in the user settings file.  Use optional arguments to choose what will be set."
    )

    @CLICommand.command(help=config_set_str, description=config_set_str)
    @CLICommand.arguments(
        "--auth-option",
        type=str,
        help="Specify authentication option ('api key' or 'email') for setting config.",
        dest="auth_option",
        required=False,
        choices=["api-key", "email"],
    )
    @CLICommand.arguments(
        "--name",
        type=str,
        help=(
            "Specify a name for the configuration about to be set. This is Client-Side only."
            if MULTIPLE_CONFIGURATIONS
            else SUPPRESS
        ),
        dest="name",
        required=False,
    )
    def set(self, args):
        """Sets the config file."""  # noqa: D401
        # pylint: disable=protected-access
        interactive_set = not self.config.global_args_present()
        base_url = self.config.base_url
        # pylint: disable=protected-access
        org_global = self.config._org_name.global_arg
        org_global_rm = self.config._org_name.global_arg_remove
        format_global = self.config._format_type.global_arg
        format_global_rm = self.config._format_type.global_arg_remove
        team_global = self.config._team_name.global_arg
        team_global_rm = self.config._team_name.global_arg_remove
        ace_global = self.config._ace_name.global_arg
        ace_global_rm = self.config._ace_name.global_arg_remove

        if org_global and (org_global != self.config._db.org):  # pylint: disable=protected-access
            # `--org` flag will reset the team and/or ace, if the
            # `--team` and/or `--ace` flag are not specified or removed (`no-team`, `no-ace`)
            self.config.org_display_name = ""
            if not team_global or not team_global_rm:
                self.config.team_name = "no-team"
            if not ace_global or not ace_global_rm:
                self.config.ace_name = "no-ace"

        if self.config._app_key.env_var or self.config.app_key:
            self.config._command_map.global_arg_remove = False

        if self.config._app_key.env_var and self.config.app_key and not interactive_set:
            # There is an issue when there is API Key in config file and API Key via environment (that are different),
            # and global flags present.
            # The API Key used for setting config is NGC_CLI_API_KEY, but the orgs/teams/aces are from config API Key.
            # Thus validating configuration produces error.

            self.printer.print_warning(
                "An API Key set in the config file and with NGC_CLI_API_KEY environment"
                " variable have been detected.\nThe API Key set in the config file will"
                " be used for setting the configuration."
            )
            self._set_config_file_as_current_config(
                org_global,
                org_global_rm,
                format_global,
                format_global_rm,
                team_global,
                team_global_rm,
                ace_global,
                ace_global_rm,
            )

        authentication_chosen = (
            "email" if args.auth_option == "email" else "api-key" if args.auth_option == "api-key" else None
        )
        if not authentication_chosen:
            if NGC_CLI_EMAIL and not NGC_CLI_API_KEY:
                authentication_chosen = "email"
            else:
                authentication_chosen = "api-key"

        if authentication_chosen == "api-key":
            if interactive_set:
                self._set_api_key(interactive_set, base_url, key_name=args.name)
        elif authentication_chosen == "email":
            # Login via browser with email/password is interactive.
            self._set_starfleet_kas_session_key()

        if interactive_set or self.config.global_format_type:
            self._set_format_type(interactive_set)

        if not self.config.app_key and not self.config.starfleet_kas_email:
            # No config key (no-apikey or no-email, AKA Guest Mode), must reset org/team/ace
            self.config.org_display_name = ""
            self.config.org_name = "no-org"
            self.config.team_name = "no-team"
            self.config.ace_name = "no-ace"
        # Key ID does not matter for the current Key because it won't show up in the config list.
        self.config.key_id = ""

        if (self.config.app_key or self.config.starfleet_kas_session_key) and (
            interactive_set or self.config.global_org_name
        ):
            self._set_org(interactive_set)

        if (self.config.app_key or self.config.starfleet_kas_session_key) and (
            interactive_set or self.config.global_team_name
        ):
            self._set_team(interactive_set)

        if (self.config.app_key or self.config.starfleet_kas_session_key) and (
            interactive_set or self.config.global_ace_name
        ):
            self._set_ace(interactive_set)

        # TODO validation on allowed combination of global args (see old modules/context.py)

        # team/ace were not validated above, so run full validation here.
        self.config.validate_configuration(guest_mode_allowed=True, remote_validation=True, csv_allowed=True)
        self.config.set_config()

    def _set_config_file_as_current_config(
        self,
        org_global,
        org_global_rm,
        format_global,
        format_global_rm,
        team_global,
        team_global_rm,
        ace_global,
        ace_global_rm,
    ):
        # pylint: disable=protected-access
        self.config.app_key = self.config._db.app_key
        self.config.starfleet_kas_session_key = self.config._db.starfleet_kas_session_key
        self.config.starfleet_kas_email = self.config._db.starfleet_kas_email
        self.config.starfleet_session_key_expiration = self.config._db.starfleet_session_key_expiration
        if format_global:
            self.config.format_type = format_global
        elif format_global_rm:
            self.config.format_type = self.config._format_type.default
        else:
            self.config.format_type = self.config._db.format_type
        if org_global:
            self.config.org_name = org_global
        elif org_global_rm:
            self.config.org_name = "no-org"
        else:
            self.config.org_name = self.config._db.org
        if team_global:
            self.config.team_name = team_global
        elif team_global_rm:
            self.config.team_name = "no-team"
        else:
            self.config.team_name = (
                self.config.team_name if self.config.team_name == "no-team" else self.config._db.team
            )
        if ace_global:
            self.config.ace_name = ace_global
        elif ace_global_rm:
            self.config.ace_name = "no-ace"
        else:
            self.config.ace_name = self.config.ace_name = (
                "no-ace" if self.config.ace_name == "no-ace" else self.config._db.ace
            )

    current_str = "List the current configuration."

    @CLICommand.command(help=current_str, description=current_str)
    @CLICommand.arguments(
        "--show-auth-token",
        action="store_true",
        help="Show the Docker login password (Starfleet ID Token) if this flag is set.",
        dest="show_auth_token",
    )
    @CLICommand.arguments(
        "--yes",
        action="store_true",
        help="Automatically confirm the retrieval of the auth token without prompting.",
        dest="auto_confirm",
    )
    def current(self, args):  # pylint: disable=no-self-use,unused-argument
        """Print the current configuration and optionally display the Docker login password (Starfleet ID Token)."""
        self.config.set_command_map()
        data = self.config.get_current_config_list()

        confirmation = None

        if args.show_auth_token:
            if args.auto_confirm:
                confirmation = "yes"
            else:
                self.printer.print_warning(
                    "The token is personal and should be kept secure. Are you sure you want to retrieve it? (yes/no):"
                )
                confirmation = get_user_tty_input("Please confirm by typing 'yes' or 'no': ").strip().lower()

            if confirmation == "yes":
                if self.config.starfleet_kas_session_key:
                    try:
                        token = self.client.authentication._get_starfleet_token()
                        if token:
                            data.append({"key": "starfleet_token", "value": token, "source": "retrieved"})
                        else:
                            raise InvalidArgumentError("Failed to retrieve Docker login password.")
                    except Exception as e:
                        raise InvalidArgumentError(str(e)) from e
                else:
                    raise InvalidArgumentError(
                        "Email authentication required. Please login using the email auth-option."
                    )
            else:
                self.printer.print_ok("Operation canceled.")
                return

        # Print the current configuration including the token if --show-auth-token was used
        self.printer.print_config(data)

    def _set_api_key(self, interactive, base_url, key_name=None):
        current_key = self.config.app_key
        if current_key:
            disp_app_key = f"{mask_string(current_key)[-8:]}"
        else:
            current_key = disp_app_key = "no-apikey"
        if MULTIPLE_CONFIGURATIONS:
            app_key_prompt = "Enter Key, or 'no-apikey'.\nPress enter to continue with "
            if current_key == "no-apikey":
                app_key_prompt += "guest mode configuration (No Key Set):\n"
            else:
                app_key_prompt += f"current configuration with Key {disp_app_key}:\n"
            if interactive:
                if self.config.configurations:
                    self.printer.print_ok(app_key_prompt)
                    self.printer.print_configurations(self.config.configurations)
                    app_key_prompt = "\nor choose from the list above:\n"
                key_input = get_user_tty_input(app_key_prompt).strip() or current_key
            else:
                key_input = current_key
        else:
            app_key_choices = "[<VALID_APIKEY>, 'no-apikey']"
            app_key_prompt = f"Enter API key [{disp_app_key}]. Choices: {app_key_choices}: "
            if interactive:
                key_input = get_user_tty_input(app_key_prompt).strip() or current_key
            else:
                key_input = current_key

        # isdigit() for "-1" or "+1" (for example) will return False;
        # Thus forcing an extra api request via validate_api_key().
        if MULTIPLE_CONFIGURATIONS:
            key_input = self._set_api_key_multiple_configuration(
                key_input=key_input,
                key_name=key_name,
                current_key=current_key,
                disp_app_key=disp_app_key,
                base_url=base_url,
            )
        else:
            while key_input != "no-apikey":
                if key_input.startswith("nvapi-"):
                    if self.client.authentication.validate_sak_key(sak_key=key_input):
                        break  # Exit the loop if a valid SAK key is detected
                    self.printer.print_error(
                        f"Invalid SAK key for NGC service location [{base_url}]. Please try again.\n"
                    )
                else:
                    if self.client.authentication.validate_api_key(app_key=key_input):
                        break  # Exit the loop if a valid API key is detected
                    self.printer.print_error(
                        f"Invalid API key for NGC service location [{base_url}]. Please try again.\n"
                    )

                # Re-prompt the user for the key
                key_input = get_user_tty_input(app_key_prompt).strip() or current_key

        self.config.app_key = key_input
        self.config.starfleet_kas_email = None
        self.config.starfleet_kas_session_key = None
        # pylint: disable=protected-access
        self.config._starfleet_kas_email.global_arg_remove = True
        self.config._starfleet_kas_session_key.global_arg_remove = True

    def _set_api_key_multiple_configuration(self, key_input, key_name, current_key, disp_app_key, base_url):
        while key_input.isdigit() or (
            key_input != "no-apikey" and not self.client.authentication.validate_api_key(app_key=key_input)
        ):
            try:
                key_choice = int(key_input)
            except ValueError:
                key_choice = key_input
            if key_choice or isinstance(key_choice, int):
                key_names_in_config = []
                if self.config.configurations:
                    key_names_in_config = self.config.get_key_names()
                    key_ids_in_config = self.config.get_key_ids()
                    key_names_in_config.extend(key_ids_in_config)
                if key_choice in key_names_in_config:
                    key_input = self.config.check_key_choice(key_choice)
                    if not key_input:
                        key_input = "no-apikey"
                    continue
                self.printer.print_error("Invalid choice. Please try again.\n")
            else:
                self.printer.print_error(f"Invalid API key for NGC service location [{base_url}]. Please try again.\n")
            app_key_prompt = "Enter Key, or 'no-apikey'.\nPress enter to continue with "
            if current_key == "no-apikey":
                app_key_prompt += "guest mode configuration (No Key Set):\n"
            else:
                app_key_prompt += f"current configuration with Key {disp_app_key}:\n"
            if self.config.configurations:
                self.printer.print_ok(app_key_prompt)
                self.printer.print_configurations(self.config.configurations)
                app_key_prompt = "\nor choose from the list above:\n"
            key_input = get_user_tty_input(app_key_prompt).strip() or current_key

        if key_input != current_key:
            # Moves the "current" API Key to `configurations` list.
            self._move_current_to_configurations(current_key=current_key)
            # Need to get the Key's ID
            cached_key_configuration = self.config.configurations.get(key_input)
            if cached_key_configuration:
                # If exists in configurations already, get it and then remove the SAK
                # because this SAK will become "CURRENT"
                key_id_for_input = cached_key_configuration.get("key_id")
                key_name = cached_key_configuration.get("key_name", "") if not key_name else key_name
                self.config.configurations.pop(key_input)
            else:
                # If does not exist in configurations, it's a new key. Thus give new key_id.
                key_id_for_input = str(len(self.config.configurations.keys()) + 1)
            # Need to assign new Key ID's because either 1.) there's a new Key or
            # 2.) a Key from configurations has been chosen.
            # Both will move the current Key (if any) onto Configurations
            # For non-SAK keys, these Key ID's don't mean anything; only used for printing
            # options.
            for count, configuration in enumerate(self.config.configurations.keys(), start=1):
                self.config.configurations.get(configuration)["key_id"] = str(count)
        else:
            key_id_for_input = self.config.key_id
            if not key_name:
                key_name = self.config.key_name
        self.config.key_name = key_name
        self.config.key_id = key_id_for_input
        return key_input

    def _move_current_to_configurations(self, current_key):
        self.prev_current_api_key = current_key
        self.prev_current_config_list = self.config.get_current_config_list()
        dct = {}
        for cfg_attr in self.prev_current_config_list:
            if cfg_attr.get("key") == "org":
                # The org name returned is a combination of unique and display org names.
                org_name = self.config.org_name
                org_display_name = self.config.org_display_name or ""
                dct["org"] = org_name
                dct["org_display_name"] = org_display_name
            elif cfg_attr.get("key") == "apikey":
                # The API Key is masked when returned by get_current_config_list.
                dct["apikey"] = self.config.app_key
            else:
                dct[cfg_attr.get("key")] = cfg_attr.get("value")
        if bool(dct):
            dct = {self.config.app_key or "no-apikey": dct}
        self.prev_current_config_list = dct
        if self.config.configurations:
            self.config.configurations.update(dct)
        else:
            self.config.configurations = dct

    def _set_starfleet_kas_session_key(self):
        # Docker pull/push won't work; NEED api key
        cur_starfleet_kas_email = self.config.starfleet_kas_email
        if cur_starfleet_kas_email is None:
            disp_starfleet_kas_email = cur_starfleet_kas_email = "no-email"
        else:
            disp_starfleet_kas_email = cur_starfleet_kas_email
        # TODO: Allow no email? Like login as guest?
        starfleet_email_choices = "[<VALID_EMAIL>, 'no-email']"
        starfleet_email_prompt = (
            "Please input email to use for browser login"
            f" ['{disp_starfleet_kas_email}']. Choices: {starfleet_email_choices}: "
        )
        # If want to hide email on CLI --> from getpass import getpass
        # starfleet_kas_email = getpass(starfleet_email_prompt).strip().lower() or cur_starfleet_kas_email
        starfleet_kas_email = get_user_tty_input(starfleet_email_prompt).strip().lower() or cur_starfleet_kas_email
        while starfleet_kas_email:
            if starfleet_kas_email != "no-email":
                try:
                    email_used(starfleet_kas_email)
                    break
                except ArgumentTypeError:
                    invalid_email_msg = "Invalid Email. Please re-enter.\n"
                    self.printer.print_error(invalid_email_msg)
                    starfleet_kas_email = get_user_tty_input(starfleet_email_prompt).strip().lower()
            else:
                break
        # NOTE: When Starfleet receives an email that is not associated with an account,
        # then user is sent to the Sign-Up page
        if starfleet_kas_email != "no-email":
            session_key, expiration_time = self.client.authentication.get_starfleet_kas_session_key(starfleet_kas_email)
        else:
            session_key, expiration_time = None, None
        self.config.starfleet_kas_session_key = session_key
        self.config.starfleet_kas_email = starfleet_kas_email
        self.config.starfleet_session_key_expiration = expiration_time
        self.config.app_key = None
        self.config._app_key.global_arg_remove = True  # pylint: disable=protected-access

    def _set_format_type(self, interactive):
        cur_format_type = self.config.format_type or "ascii"
        format_type_prompt = f"Enter CLI output format type [{cur_format_type}]. Choices: {FORMAT_TYPES}: "

        if interactive:
            format_type_in = get_user_tty_input(format_type_prompt).strip() or cur_format_type
        else:
            format_type_in = cur_format_type

        while not self.config.validate_format_type(format_type_in):
            self.printer.print_error(f"Invalid format type. Please choose from [{', '.join(FORMAT_TYPES)}]\n")
            format_type_in = get_user_tty_input(format_type_prompt).strip() or cur_format_type

        self.config.format_type = format_type_in

    def _set_org(self, interactive):
        cur_org = self.config.org_name
        if cur_org is None:
            cur_org = "no-org"
        # The keys for 'org_choices' are the full names for the orgs
        org_choices = self.config.get_org_names()
        if not org_choices:
            # User does not belong to any orgs, must be exited with ctrl+C
            org_in = None
            logger.error("User is not assigned to any orgs.")

        full_org_name_choices = list(org_choices.keys())
        unique_org_names = [names.get("org_name") for names in org_choices.values()]
        org_prompt = f"Enter org [{cur_org}]. Choices: {full_org_name_choices}: "
        if interactive:
            org_in = get_user_tty_input(org_prompt).strip() or cur_org
        else:
            org_in = cur_org

        err_msg = "Invalid org. Please re-enter."
        while org_in not in set(full_org_name_choices) | set(unique_org_names):
            if interactive:
                self.printer.print_error(err_msg)
                org_in = get_user_tty_input(org_prompt).strip() or cur_org
            else:
                org_in = cur_org
            while org_in not in set(full_org_name_choices) | set(unique_org_names):
                if interactive:
                    self.printer.print_error(err_msg)
                    org_in = get_user_tty_input(org_prompt).strip() or cur_org
                else:
                    raise ValueError("ERROR: Invalid org.\nChoose from {0}.".format(full_org_name_choices))

        if names := org_choices.get(org_in):
            org_name = names.get("org_name", org_in)
            org_display_name = names.get("org_display_name", "")
        else:
            for _, names in org_choices.items():
                if org_in == names.get("org_name"):
                    org_name = names.get("org_name")
                    org_display_name = names.get("org_display_name", "")
                    break

        self.config.org_display_name = org_display_name
        self.config.org_name = org_name

    def _set_team(self, interactive):
        cur_team = self.config.team_name
        if cur_team is None:
            cur_team = "no-team"
        team_choices = self.config.get_team_list()
        team_prompt = f"Enter team [{cur_team}]. Choices: {team_choices}: "

        if interactive:
            team_in = get_user_tty_input(team_prompt).strip() or cur_team
        else:
            team_in = cur_team

        try:
            team_choices[0]
        except IndexError:
            # User doesn't belong to any teams, must be exited with ctrl-c
            team_in = None
            logger.error("User is not assigned to any teams.")

        err_msg = "Invalid team. Please re-enter.\n"

        while team_in not in team_choices:
            if interactive:
                self.printer.print_error(err_msg)
                team_in = get_user_tty_input(team_prompt).strip() or cur_team
            else:
                raise ValueError("ERROR: Invalid team.\nChoose from {0}".format(team_choices))

        self.config.team_name = team_in

    def _set_ace(self, interactive):
        cur_ace = self.config.ace_name
        if cur_ace is None:
            cur_ace = "no-ace"

        try:
            ace_choices = self.config.get_ace_list()
        except (AccessDeniedException, NgcException):
            logger.debug("Access denied retrieving ace list.")
            ace_choices = ["no-ace"]
            cur_ace = "no-ace"

        ace_prompt = f"Enter ace [{cur_ace}]. Choices: {ace_choices}: "

        if interactive:
            ace_in = get_user_tty_input(ace_prompt).strip() or cur_ace
        else:
            ace_in = cur_ace

        err_msg = "Invalid ace. Please re-enter.\n"

        while ace_in not in ace_choices:
            if interactive:
                self.printer.print_error(err_msg)
                ace_in = get_user_tty_input(ace_prompt).strip() or cur_ace
            else:
                raise ValueError("ERROR: Invalid ace.\nChoose from {0}".format(ace_choices))
        self.config.ace_name = ace_in
