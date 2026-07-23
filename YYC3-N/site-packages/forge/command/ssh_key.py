# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.forge import ForgeCommand
from forge.printer.ssh_key import SSHKeyPrinter
from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_valid_columns,
    check_ymd_hms_datetime,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.util.utils import get_columns_help


class SSHKeyCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "ssh-key"
    HELP = "Ssh Public Key Commands"
    DESC = "Ssh Public key Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.ssh_key
        self.printer = SSHKeyPrinter(self.client.config)

    LIST_HELP = "List ssh public keys."

    columns_dict = {
        "id": "Id",
        "name": "Name",
        "org": "Org",
        "tenantId": "Tenant Id",
        "tenantName": "Tenant Name",
        "fingerprint": "Fingerprint",
        "isGlobal": "Global",
        "expires": "Expires",
        "created": "Created",
        "updated": "Updated",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)

    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help=(
            "Filter by matches across all ssh keys. Input will be matched against name, description and status fields."
        ),
        type=str,
        nargs="?",
        default=None,
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
        """List ssh public keys."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.list(org_name, team_name, args.target)
        check_add_args_columns(args.column, SSHKeyCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "Ssh public key information."

    @CLICommand.arguments("id", metavar="<id>", help="Ssh public key id.", type=str)
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Ssh public key info."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.info(org_name, team_name, args.id)
        self.printer.print_info(resp)

    CREATE_HELP = "Create ssh public key."

    @CLICommand.arguments("name", metavar="<name>", help="Ssh public key name.", type=str)
    @CLICommand.arguments(
        "--public-key",
        metavar="<key>",
        help="Specify ssh public key, supported types are rsa, ecdsa and ed25519. (Format: ssh-type key)",
        type=str,
        required=True,
    )
    @CLICommand.arguments(
        "--expiration",
        metavar="<date>",
        help="Specify expiration date for ssh public key. (Format: yyyy-MM-dd::HH:mm:ss)",
        type=str,
        action=check_ymd_hms_datetime(),
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create ssh public key."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        tenant = None
        tenant_info, _ = self.client.forge.tenant.info(org_name, team_name)
        tenant = tenant_info.get("id", "")
        resp = self.api.create(
            org_name,
            team_name,
            tenant,
            args.name,
            args.public_key,
            args.expiration,
        )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update ssh public key."

    @CLICommand.arguments("id", metavar="<id>", help="Ssh public key id.", type=str)
    @CLICommand.arguments("--name", metavar="<name>", help="Specify ssh public key name.", type=str)
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update ssh public key."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.update(org_name, team_name, args.id, args.name)
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove ssh public key."

    @CLICommand.arguments("id", metavar="<id>", help="Ssh public key id.", type=str)
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove ssh public key."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.remove(org_name, team_name, args.id)
        self.printer.print_ok(f"{resp}")
