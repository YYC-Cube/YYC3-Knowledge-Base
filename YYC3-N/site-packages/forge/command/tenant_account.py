# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from forge.command.forge import ForgeCommand
from forge.printer.tenant_account import TenantAccountPrinter
from ngcbase.command.args_validation import check_add_args_columns, check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.util.utils import get_columns_help


class TenantAccountCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "tenant-account"
    HELP = "Tenant Account Commands"
    DESC = "Tenant Account Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.tenant_account
        self.printer = TenantAccountPrinter(self.client.config)

    LIST_HELP = "List tenant accounts."
    LIST_COND = "Either infrastructure provider id or tenant id must be specified."

    columns_dict = {
        "infrastructureProviderId": "Infrastructure Provider Id",
        "infrastructureProviderName": "Infrastructure Provider Name",
        "infrastructureProviderOrg": "Infrastructure Provider Org",
        "tenantId": "Tenant Id",
        "tenantName": "Tenant Name",
        "tenantOrg": "Tenant Org",
        "tenantContactId": "Tenant Contact Id",
        "tenantContactName": "Tenant Contact Name",
        "tenantContactEmail": "Tenant Contact Email",
        "allocationCount": "Allocation Count",
        "status": "Status",
        "created": "Created",
        "updated": "Updated",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)

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
        """List tenant accounts."""
        resp = self.api.list(args.org, args.team)
        check_add_args_columns(args.column, TenantAccountCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "Tenant account information."

    @CLICommand.arguments("tenant_account", metavar="<tenant_account>", help="Tenant account id.", type=str)
    @CLICommand.arguments("--status-history", help="Show tenant account status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Tenant account info."""
        resp = self.api.info(args.tenant_account, args.org, args.team)
        self.printer.print_info(resp, status_history=args.status_history)

    CREATE_HELP = "Create tenant account."

    @CLICommand.arguments(
        "tenant_org", metavar="<tenant_org>", help="Specify tenant org, required for non tenant admins.", type=str
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create Tenant Account."""
        resp = self.api.create(args.tenant_org, args.org, args.team)
        self.printer.print_info(resp)

    UPDATE_HELP = "Update tenant account."

    @CLICommand.arguments("tenant_account", metavar="<tenant_account>", help="Tenant account id.", type=str)
    @CLICommand.arguments("--tenant-contact", metavar="<tenant_contact>", help="Specify tenant contact id.", type=str)
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update Tenant Account."""
        resp = self.api.update(args.tenant_account, args.org, args.team, args.tenant_contact)
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove tenant account."

    @CLICommand.arguments("tenant_account", metavar="<tenant_account>", help="Tenant account id.", type=str)
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove Tenant Account."""
        resp = self.api.remove(args.tenant_account, args.org, args.team)
        self.printer.print_ok(f"{resp}")
