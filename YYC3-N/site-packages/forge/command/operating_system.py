# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

import argparse

from forge.command._shared import wrap_bad_request_exception
from forge.command.forge import ForgeCommand
from forge.printer.operating_system import OperatingSystemPrinter
from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_valid_columns,
    ReadFile,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import STAGING_ENV
from ngcbase.errors import InvalidArgumentError
from ngcbase.util.utils import get_columns_help, has_org_role


class OperatingSystemCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "operating-system"
    HELP = "Operating System Commands"
    DESC = "Operating System Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.operating_system
        self.printer = OperatingSystemPrinter(self.client.config)

    LIST_HELP = "List operating systems."
    columns_dict = {
        "name": "Name",
        "description": "Description",
        "infrastructureProviderId": "Infrastructure Provider Id",
        "infrastructureProviderName": "Infrastructure Provider Name",
        "tenantId": "Tenant Id",
        "tenantName": "Tenant Name",
        "ipxeScript": "IPXE Script",
        "userData": "User Data",
        "isCloudInit": "Cloud Init",
        "allowOverride": "Allow Override",
        "status": "Status",
        "created": "Created",
        "updated": "Updated",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)
    status_enum = ["Pending", "Provisioning", "Ready", "Deleting", "Error"]

    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help=(
            "Filter by matches across all opertaing systems. Input will be matched against name, description and status"
            " fields."
        ),
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
        """List Operating Systems."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.list(org_name, team_name, args.target, args.status)
        check_add_args_columns(args.column, OperatingSystemCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "Operating system information."

    @CLICommand.arguments("operating_system", metavar="<operating_system>", help="Operating system id.", type=str)
    @CLICommand.arguments("--status-history", help="Show status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Operating System info."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.info(org_name, team_name, args.operating_system)
        self.printer.print_info(resp, args.status_history)

    CREATE_HELP = "Create operating system."

    @CLICommand.arguments("name", metavar="<name>", help="Operating system name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify description.", type=str)
    @CLICommand.arguments(
        "--image-url",
        metavar="<image_url>",
        help="Specify image URL, required for image based OS. Cannot be specified with ipxe_script.",
        type=str,
    )
    @CLICommand.arguments(
        "--image-sha",
        metavar="<image_sha>",
        help="Specify SHA hash of the image file, required for image based OS.",
        type=str,
    )
    @CLICommand.arguments(
        "--image-auth",
        metavar="<image_auth>",
        help="Specify authentication type for image URL.",
        type=str,
    )
    @CLICommand.arguments(
        "--image-auth-token",
        metavar="<image_auth_token>",
        help="Specify authentication token for image URL, required if image_auth is specified.",
        type=str,
    )
    @CLICommand.arguments(
        "--image-disk",
        metavar="<image_disk>",
        help="Specify disk path where the image should be mounted.",
        type=str,
    )
    @CLICommand.arguments(
        "--root-fs-id",
        metavar="<root_fs_id>",
        help="Specify root filesystem UUID.",
        type=str,
    )
    @CLICommand.arguments("--root-fs-label", metavar="<root_fs_label>", help="Specify root filesystem label.")
    @CLICommand.arguments(
        "--ipxe-script",
        metavar="<path>",
        help="Specify ipxe script file path.",
        type=str,
        action=ReadFile,
    )
    @CLICommand.arguments("--user-data", metavar="<user_data>", help="Specify user data.", type=str)
    @CLICommand.arguments("--cloud-init", help="Cloud init.", action="store_true")
    @CLICommand.arguments("--allow-override", help="Specify if override.", action="store_true")
    @CLICommand.arguments(
        "--enable-phone-home", help="Enable cloud-init phone home.", action=argparse.BooleanOptionalAction
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    @CLICommand.any_of(["ipxe_script", "image_url"])
    @CLICommand.mutex(["ipxe_script", "image_url"])
    @CLICommand.mutex(["root_fs_id", "root_fs_label"])
    def create(self, args):
        """Create Operating System."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        provider = None
        tenant = None
        user_resp = self.client.users.user_who(org_name)
        if has_org_role(user_resp, org_name, ["FORGE_TENANT_ADMIN"]):
            tenant_info, _ = self.client.forge.tenant.info(org_name, team_name)
            tenant = tenant_info.get("id", "")
        elif has_org_role(user_resp, org_name, ["FORGE_PROVIDER_ADMIN"]):
            provider_info, _ = self.client.forge.provider.info(org_name, team_name)
            provider = provider_info.get("id", "")
        if args.image_url and not (args.image_sha and (args.root_fs_id or args.root_fs_label)):
            raise InvalidArgumentError(None, "Image url argument requires image SHA and root FS arguments.")
        if args.image_auth and not args.image_auth_token:
            raise InvalidArgumentError(None, "Image auth argument requires image auth token argument.")

        with wrap_bad_request_exception():
            resp = self.api.create(
                org_name,
                team_name,
                args.name,
                args.description,
                provider,
                tenant,
                args.ipxe_script,
                args.user_data,
                args.cloud_init,
                args.allow_override,
                args.image_url,
                args.image_sha,
                args.image_auth,
                args.image_auth_token,
                args.image_disk,
                args.root_fs_id,
                args.enable_phone_home,
                args.root_fs_label,
            )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update operating system."

    @CLICommand.arguments("operating_system", metavar="<operating_system>", help="Operating system id.", type=str)
    @CLICommand.arguments("--name", metavar="<name>", help="Specify operating system name.", type=str)
    @CLICommand.arguments("--description", metavar="<desc>", help="Specify description.", type=str)
    @CLICommand.arguments(
        "--image-url",
        metavar="<image_url>",
        help="Specify image URL, required for image based OS. Cannot be specified with ipxe_script.",
        type=str,
    )
    @CLICommand.arguments(
        "--image-sha",
        metavar="<image_sha>",
        help="Specify SHA hash of the image file, required for image based OS.",
        type=str,
    )
    @CLICommand.arguments(
        "--image-auth",
        metavar="<image_auth>",
        help="Specify authentication type for image URL.",
        type=str,
    )
    @CLICommand.arguments(
        "--image-auth-token",
        metavar="<image_auth_token>",
        help="Specify authentication token for image URL, required if image_auth is specified.",
        type=str,
    )
    @CLICommand.arguments(
        "--image-disk",
        metavar="<image_disk>",
        help="Specify disk path where the image should be mounted.",
        type=str,
    )
    @CLICommand.arguments(
        "--root-fs-id",
        metavar="<root_fs_id>",
        help="Specify root filesystem UUID.",
        type=str,
    )
    @CLICommand.arguments("--root-fs-label", metavar="<root_fs_label>", help="Specify root filesystem label.")
    @CLICommand.arguments(
        "--ipxe-script",
        metavar="<path>",
        help="Specify ipxe script file path.",
        type=str,
        action=ReadFile,
    )
    @CLICommand.arguments("--user-data", metavar="<user_data>", help="Specify user data.", type=str)
    @CLICommand.arguments("--cloud-init", help="Cloud init.", action=argparse.BooleanOptionalAction)
    @CLICommand.arguments("--allow-override", help="Allow override.", action=argparse.BooleanOptionalAction)
    @CLICommand.arguments(
        "--enable-phone-home", help="Enable cloud-init phone home.", action=argparse.BooleanOptionalAction
    )
    @CLICommand.arguments(
        "--deactivate",
        dest="is_active",
        default=None,
        help="Deactivate the operating system.",
        action="store_false",
        environ_tag=STAGING_ENV,
    )
    @CLICommand.arguments(
        "--activate",
        dest="is_active",
        default=None,
        help="Activate an inactive operating system.",
        action="store_true",
        environ_tag=STAGING_ENV,
    )
    @CLICommand.arguments(
        "--deactivation-note",
        metavar="<note>",
        help="Optional note for inactive operating systems.",
        environ_tag=STAGING_ENV,
    )
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    @CLICommand.mutex(["ipxe_script", "image_url"])
    @CLICommand.mutex(["root_fs_id", "root_fs_label"])
    def update(self, args):
        """Update Operating System."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        if args.image_url and not (args.image_sha and (args.root_fs_id or args.root_fs_label)):
            raise InvalidArgumentError(None, "Image url argument requires image SHA and root FS arguments.")
        if args.image_auth and not args.image_auth_token:
            raise InvalidArgumentError(None, "Image auth argument requires image auth token argument.")

        with wrap_bad_request_exception():
            resp = self.api.update(
                org_name,
                team_name,
                args.operating_system,
                args.name,
                args.description,
                args.ipxe_script,
                args.user_data,
                args.cloud_init,
                args.allow_override,
                args.image_url,
                args.image_sha,
                args.image_auth,
                args.image_auth_token,
                args.image_disk,
                args.root_fs_id,
                args.enable_phone_home,
                args.root_fs_label,
                is_active=args.is_active,
                deactivation_note=args.deactivation_note,
            )
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove operating system."

    @CLICommand.arguments("operating_system", metavar="<operating_system>", help="Operating system id.", type=str)
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove Operating System."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.remove(org_name, team_name, args.operating_system)
        self.printer.print_ok(f"{resp}")
