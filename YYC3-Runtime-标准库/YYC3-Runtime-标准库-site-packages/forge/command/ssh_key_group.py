# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.forge import ForgeCommand
from forge.printer.ssh_key_group import SSHKeyGroupPrinter
from ngcbase.command.args_validation import check_add_args_columns, check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.util.io_utils import question_yes_no
from ngcbase.util.utils import get_columns_help


class SSHKeyGroupCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "ssh-key-group"
    HELP = "Ssh Public Key Group Commands"
    DESC = "Ssh Public key Group Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.ssh_key_group
        self.printer = SSHKeyGroupPrinter(self.client.config)

    LIST_HELP = "List ssh public key groups."

    columns_dict = {
        "id": "Id",
        "name": "Name",
        "org": "Org",
        "tenantId": "Tenant Id",
        "tenantName": "Tenant Name",
        "version": "Version",
        "status": "Status",
        "created": "Created",
        "updated": "Updated",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)

    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help="Filter by matches across all ssh key groups. Input will be matched against name field.",
        type=str,
        nargs="?",
        default=None,
    )
    @CLICommand.arguments("--site", metavar="<site>", help="Filter by site id.", type=str)
    @CLICommand.arguments("--instance", metavar="<instance>", help="Filter by instance id.", type=str)
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
        """List ssh public keys."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.list(org_name, team_name, args.target, args.site, args.instance)
        check_add_args_columns(args.column, SSHKeyGroupCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "Ssh public key group information."

    @CLICommand.arguments("id", metavar="<id>", help="Ssh public key group id.", type=str)
    @CLICommand.arguments("--status-history", help="Show status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Ssh public key group info."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.info(org_name, team_name, args.id)
        self.printer.print_info(resp, args.status_history)

    CREATE_HELP = "Create ssh public key group."

    @CLICommand.arguments("name", metavar="<name>", help="Ssh public key group name.", type=str)
    @CLICommand.arguments(
        "--description", metavar="<desc>", help="Ssh public key group description.", type=str, default=""
    )
    @CLICommand.arguments(
        "--site-id",
        metavar="<site_id>",
        help="Specify site id to associate with ssh public key group. Multiple site id arguments are allowed.",
        type=str,
        default=None,
        action="append",
    )
    @CLICommand.arguments(
        "--ssh-key-id",
        metavar="<ssh_key_id>",
        help="Specify ssh key id to add to ssh public key group. Multiple ssh key id arguments are allowed.",
        type=str,
        default=None,
        action="append",
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create ssh public key."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.create(
            org_name,
            team_name,
            args.name,
            args.description,
            args.site_id,
            args.ssh_key_id,
        )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update ssh public key."

    @CLICommand.arguments("id", metavar="<id>", help="Ssh public key group id.", type=str)
    @CLICommand.arguments("--name", metavar="<name>", help="Specify ssh public key group name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Ssh public key group description.", type=str)
    @CLICommand.arguments(
        "--site-id",
        metavar="<site_id>",
        help="Specify site id to associate with ssh public key group. Multiple site id arguments are allowed.",
        type=str,
        default=None,
        action="append",
    )
    @CLICommand.arguments(
        "--ssh-key-id",
        metavar="<ssh_key_id>",
        help="Specify ssh key id to add to ssh public key group. Multiple ssh key id arguments are allowed.",
        type=str,
        default=None,
        action="append",
    )
    @CLICommand.arguments("--version", metavar="<version>", help="Ssh public key group version.", type=str)
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update ssh public key."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.update(
            org_name, team_name, args.id, args.name, args.description, args.site_id, args.ssh_key_id, args.version
        )
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove ssh public key."

    @CLICommand.arguments("id", metavar="<id>", help="Ssh public key group id.", type=str)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove ssh public key."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        remove_str = f"Are you sure you would like to remove the ssh-key group {args.id}?"
        answer = question_yes_no(self.printer, remove_str, default_yes=args.default_yes)
        if answer:
            resp = self.api.remove(org_name, team_name, args.id)
            self.printer.print_ok(f"{resp}")
        else:
            return
