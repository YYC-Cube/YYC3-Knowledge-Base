#!/usr/bin/env python
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from datetime import datetime
import logging
import os
import sys

import argcomplete

from ngcbase import constants, environ
from ngcbase.api.baseclient import BaseClient
from ngcbase.command import clicommand
from ngcbase.command.global_args import get_parent_parser
from ngcbase.command.parser import NgcParser, SortingHelpFormatter
from ngcbase.logger import setup_logger
from ngcbase.util.datetime_utils import (
    calculate_date_difference,
    validate_ymd_hms_datetime,
)
from ngcbase.util.io_utils import mask_string
from ngcbase.util.utils import (
    get_environ_tag,
    get_human_readable_command,
    get_system_info,
)

logger = logging.getLogger(__name__)


def _check_warning_messages(config):
    last_upgrade_msg_date = config.last_upgrade_msg_date
    if last_upgrade_msg_date:
        try:
            valid_datetime = validate_ymd_hms_datetime(last_upgrade_msg_date)
        except (ValueError, TypeError):
            logger.debug("last_upgrade_msg_date value in meta_data corrupt. Ignoring.")
            valid_datetime = False
    if (
        not last_upgrade_msg_date
        or not valid_datetime
        or calculate_date_difference(validate_ymd_hms_datetime(last_upgrade_msg_date), datetime.now()).days
        >= constants.DAYS_BEFORE_DISPLAYING_UPGRADE_MSG
    ):
        config.set_last_upgrade_msg_date()
        # Want to check for updates daily. This isn't dependent on user's configuration, and checking on
        # every command run is inefficient.
        config.get_unified_catalog_product_names()

    last_key_expiration_msg_date = config.last_key_expiration_msg_date
    if last_key_expiration_msg_date:
        try:
            valid_datetime = validate_ymd_hms_datetime(last_key_expiration_msg_date)
        except (ValueError, TypeError):
            logger.debug("last_key_expiration_msg_date value in config corrupt. Ignoring.")
            valid_datetime = False


class BaseCLIRunner:
    """The runner for the CLI."""

    def __init__(self, client: BaseClient) -> None:
        self._client = client

    def get_parser(self) -> NgcParser:
        """Get the CLI parser."""
        client = self._client

        parent_parsers = get_parent_parser(client)
        parser = NgcParser(
            prog="ngc",
            description="NVIDIA NGC CLI",
            formatter_class=SortingHelpFormatter,
            parents=parent_parsers,
        )
        parser.client = client
        clicommand.CLICommand.CLI_CLIENT = client
        if "-h" in sys.argv[1:] or "--help" in sys.argv[1:]:
            if client.config.app_key:
                if not client.config.command_map or client.config.command_map.get("apikey") != client.config.app_key:
                    client.config.set_command_map()
            elif client.config.starfleet_kas_email and client.config.starfleet_kas_session_key:
                if (
                    not client.config.command_map
                    or client.config.command_map.get("starfleet_session_key") != client.config.starfleet_kas_session_key
                ):
                    client.config.set_command_map()
        self.import_modules()
        clicommand.CLICommand(parser)
        return parser

    @staticmethod
    def import_modules() -> None:
        """Import the modules containing CLICommand subclasses."""
        # pylint: disable=import-outside-toplevel,unused-import
        import ngcbase.command.config  # noqa: F401

    def run(self) -> int:
        """Run the CLI."""
        setup_logger()
        parser = self.get_parser()
        client = parser.client
        argcomplete.autocomplete(parser)
        try:
            os.umask(0o077)
        # OSError: file-system related errors
        except OSError:
            pass
        nv_pretty_print = client.printer
        _command = get_human_readable_command()
        environ_tag = get_environ_tag()
        if environ_tag <= constants.STAGING_ENV:
            _key = next((key for key in constants.DEPRECATION_MAP if key in _command), None)
            if _key is not None:
                nv_pretty_print.print_warning(
                    f"Warning: '{_key}' is deprecated, use {constants.DEPRECATION_MAP[_key]} instead."
                )

        try:
            args = parser.parse_args()
            # If -h, --help flag is used, command exits.
            logger.debug("%s", _command)
            # Warn about deprecated environment variables
            # Must be after parsed args to get output type
            for warning in environ.generate_warnings():
                nv_pretty_print.print_warning(warning)

            # The older version of argparse used to detect if too few args were provided. This was removed.
            # If args has no func(), it was because there were too few args provided.
            if not hasattr(args, "func"):
                nv_pretty_print.print_error("\nERROR: Incomplete command received\n")
                # This will print the help for the command they entered
                sys.argv.append("--help")
                parser.parse_args()
                sys.exit(1)

            # Log if we've overridden the environment.
            # Must be after parsed args, to ensure that `--debug` logging has been set.
            if environ_tag != constants.BUILD_ENV:
                logger.debug("%s environment set due to url environment variable override", environ_tag)

            if client.config.app_key:
                logger.debug("API Key in use:")
                logger.debug(mask_string(client.config.app_key))
            elif client.config.starfleet_kas_session_key:
                logger.debug("Starfleet Kas Session Key in use:")
                logger.debug(mask_string(client.config.starfleet_kas_session_key))
            else:
                logger.debug("Guest mode in use. No API Key or Starfleet Auth detected.")

            _check_warning_messages(config=client.config)

            args.func(args)
            return constants.EXIT_CODES["SUCCESS"]
        # raise SystemExit and it's handled here to retain
        # exit code values. There are also still some sys.exit calls in the code base,
        # and those will be caught here too.
        except SystemExit as exit_:  # NOSONAR
            return exit_.code
        except KeyboardInterrupt:
            return constants.EXIT_CODES["TERMINATION_CTRL_C"]
        except Exception as errorStr:  # pylint: disable=broad-except
            nv_pretty_print.print_error(str(errorStr))
            logger.debug(str(errorStr), exc_info=1)
            return constants.EXIT_CODES["GENERAL_ERROR"]
        finally:
            if client.config.debug_mode:
                logger.debug("Command: %s", _command)
                self._dump_system_info()

    @staticmethod
    def _dump_system_info():
        system_info = get_system_info()
        logger.debug("os: %s", system_info["os"])


if __name__ == "__main__":
    # Pragmas needed on every line to keep sonarqube from dinging our coverage here.
    client = BaseClient()  # pragma: no cover
    runner = BaseCLIRunner(client)  # pragma: no cover
    sys.exit(runner.run())  # pragma: no cover
