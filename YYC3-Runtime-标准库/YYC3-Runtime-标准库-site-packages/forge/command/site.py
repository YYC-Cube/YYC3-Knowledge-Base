# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.forge import ForgeCommand
from forge.printer.site import SitePrinter
from ngcbase.command.args_validation import check_add_args_columns, check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.util.io_utils import question_yes_no
from ngcbase.util.utils import get_columns_help


class SiteCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "site"
    HELP = "Site Commands"
    DESC = "Site Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.site
        self.printer = SitePrinter(self.client.config)

    LIST_HELP = "List sites."
    LIST_COND = "Either infrastructure provider id or tenant id must be specified."

    columns_dict = {
        "name": "Name",
        "description": "Description",
        "org": "Org",
        "infrastructureProviderId": "Infrastructure Provider Id",
        "infrastructureProviderName": "Infrastructure Provider Name",
        "isSerialConsoleEnabled": "Serial Console Enabled",
        "serialConsoleHostname": "Serial Console Hostname",
        "serialConsoleIdleTimeout": "Serial Console Idle Timeout",
        "serialConsoleMaxSessionLength": "Serial Console Max Session Length",
        "isSerialConsoleSSHKeysEnabled": "Serial Console SSH Keys Enabled",
        "siteControllerVersion": "Site Controller Version",
        "siteAgentVersion": "Site Agent Version",
        "registrationToken": "Registration Token",
        "registrationTokenExpiration": "Registration Token Expiration",
        "status": "status",
        "created": "Created",
        "updated": "Updated",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)
    status_enum = ["Pending", "Registered", "Error"]

    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help="Filter by matches across all Sites. Input will be matched against name, description and status fields.",
        type=str,
        nargs="?",
        default=None,
    )
    @CLICommand.arguments(
        "--status",
        metavar="<status>",
        help=f"Filter by status. Choices are: {', '.join(status_enum)}",
        type=str,
        default=None,
        choices=status_enum,
    )
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List sites."""
        resp = self.api.list(args.org, args.team, args.target, args.status)
        check_add_args_columns(args.column, SiteCommand.columns_default)
        self.printer.print_list(resp, columns=args.column)

    INFO_HELP = "Site information."

    @CLICommand.arguments("site", metavar="<site>", help="Site id.", type=str)
    @CLICommand.arguments("--status-history", help="Show site status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Site info."""
        resp = self.api.info(args.site, args.org, args.team)
        self.printer.print_info(resp, args.status_history)

    CREATE_HELP = "Create site."

    @CLICommand.arguments("name", help="Name of the site.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify site description.", type=str)
    @CLICommand.arguments(
        "--serial-console-hostname",
        help="Specify Hostname to reach Serial Console for the Site.",
        type=str,
    )
    @CLICommand.arguments(
        "--serial-console-enabled",
        help="Specify if Serial Console is enabled for the Site.",
        action="store_true",
    )
    @CLICommand.arguments(
        "--serial-console-timeout",
        help="Specify the maximum idle time in seconds before Serial Console is disconnected.",
        type=int,
    )
    @CLICommand.arguments(
        "--serial-console-max-session",
        help="Specify the max length of Serial Console session in seconds.",
        type=int,
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create site."""
        resp = self.api.create(
            args.name,
            args.org,
            args.team,
            args.description,
            args.serial_console_hostname,
            args.serial_console_enabled,
            args.serial_console_timeout,
            args.serial_console_max_session,
        )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update site."

    @CLICommand.arguments("site", metavar="<site>", help="Site id.", type=str)
    @CLICommand.arguments("--name", metavar="<name>", help="Specify name of the site.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify site description.", type=str)
    @CLICommand.arguments(
        "--serial-console-enable",
        help="Enable/disable SSH. Can only be updated by Provider.",
        action="store_true",
        default=None,
    )
    @CLICommand.arguments(
        "--serial-console-hostname",
        help="Specify SSH hostname name for the site.",
        type=str,
    )
    @CLICommand.arguments(
        "--serial-console-timeout",
        help="Maximum idle time in seconds before Serial Console is disconnected. Can only be updated by Provider.",
        type=int,
    )
    @CLICommand.arguments(
        "--serial-console-max-session",
        help="Maximum length of Serial Console session in seconds.. Can only be updated by Provider.",
        type=int,
    )
    @CLICommand.arguments(
        "--serial-console-keys-enabled",
        help="Enable/disable SSH access using SSH Keys. Can only be updated by Tenant.",
        action="store_true",
        default=None,
    )
    @CLICommand.arguments("--renew-token", help="Renew registration token.", action="store_true", default=None)
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update Site."""
        resp = self.api.update(
            args.site,
            args.org,
            args.team,
            args.name,
            args.description,
            args.serial_console_enable,
            args.serial_console_hostname,
            args.serial_console_timeout,
            args.serial_console_max_session,
            args.serial_console_keys_enabled,
            args.renew_token,
        )
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove site."

    @CLICommand.arguments("site", metavar="<site>", help="Site id.", type=str)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove Site."""
        remove_str = f"Are you sure you would like to remove the site {args.site}?"
        answer = question_yes_no(self.printer, remove_str, default_yes=args.default_yes)
        if answer:
            resp = self.api.remove(args.site, args.org, args.team)
            self.printer.print_ok(f"{resp}")
        else:
            return
