# Copyright (c) 2019-2022, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

import argparse

from forge.command._shared import (
    decorate_create_command_with_label_arguments,
    decorate_update_command_with_label_arguments,
    wrap_bad_request_exception,
)
from forge.command.forge import ForgeCommand
from forge.printer.instance import InstancePrinter
from ngcbase.command.args_validation import check_add_args_columns, check_valid_columns
from ngcbase.command.clicommand import CLICommand
from ngcbase.errors import InvalidArgumentError, NgcException
from ngcbase.util.utils import get_columns_help, has_org_role


class InstanceCommand(ForgeCommand):  # noqa: D101

    CMD_NAME = "instance"
    HELP = "Instance Commands"
    DESC = "Instance Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.forge.instance
        self.printer = InstancePrinter(self.client.config)

    LIST_HELP = "List instances."
    columns_dict = {
        "name": "Name",
        "allocationId": "Allocation Id",
        "allocationName": "Allocation Name",
        "tenantId": "Tenant Id",
        "tenantName": "Tenant Name",
        "infrastructureProviderId": "Infrastructure Provider Id",
        "infrastructureProviderName": "Infrastructure Provider Name",
        "siteId": "Site Id",
        "siteName": "Site Name",
        "instanceTypeId": "Instance Type Id",
        "instanceTypeName": "Instance Type Name",
        "vpcId": "VPC Id",
        "vpcName": "VPC Name",
        "machineId": "Machine Id",
        "machineName": "Machine Name",
        "operatingSystemId": "Operating System Id",
        "operatingSystemName": "Operating System Name",
        "ipxeScript": "IPXE Script",
        "userdata": "User Data",
        "networkSecurityGroupId": "Security Group Id",
        "status": "Status",
        "created": "Created",
        "updated": "Updated",
    }
    columns_default = ("id", "Id")
    columns_help = get_columns_help(columns_dict, columns_default)
    status_enum = ["Pending", "Provisioning", "Configuring", "Ready", "Rebooting", "Terminating", "Error"]

    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help=(
            "Filter by matches across all instances."
            " Input will be matched against name, description, status, label keys, and label values."
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
    @CLICommand.arguments("--site", metavar="<site>", help="Filter by site id.", type=str, required=True)
    @CLICommand.arguments("--vpc", metavar="<vpc>", help="Filter by vpc id.", type=str)
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):
        """List Instances."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        provider = None
        tenant = None
        user_resp = self.client.users.user_who(org_name)
        if has_org_role(user_resp, org_name, ["FORGE_PROVIDER_ADMIN"]):
            provider_info, _ = self.client.forge.provider.info(org_name, team_name)
            provider = provider_info.get("id", "")
        elif has_org_role(user_resp, org_name, ["FORGE_TENANT_ADMIN"]):
            tenant_info, _ = self.client.forge.tenant.info(org_name, team_name)
            tenant = tenant_info.get("id", "")
        resp = self.api.list(org_name, team_name, args.site, args.vpc, provider, tenant, args.target, args.status)
        check_add_args_columns(args.column, InstanceCommand.columns_default)
        self.printer.print_list(resp, args.column)

    INFO_HELP = "Instance information."

    @CLICommand.arguments("instance", metavar="<instance>", help="Instance id.", type=str)
    @CLICommand.arguments("--status-history", help="Show status history.", action="store_true")
    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    def info(self, args):
        """Instance info."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.info(org_name, team_name, args.instance)
        self.printer.print_info(resp, args.status_history)

    CREATE_HELP = "Create instance."

    @decorate_create_command_with_label_arguments()
    @CLICommand.arguments("name", metavar="<name>", help="Instance name.", type=str)
    @CLICommand.arguments(
        "--instance-type", metavar="<instance_type>", help="Specify instance type id.", type=str, required=True
    )
    @CLICommand.arguments("--vpc", metavar="<vpc>", help="Specify VPC id.", type=str, required=True)
    @CLICommand.arguments(
        "--operating-system", metavar="<operating_system>", help="Specify operating system id.", type=str
    )
    @CLICommand.arguments("--user-data", metavar="<user_data>", help="Specify user data.", type=str)
    @CLICommand.arguments(
        "--ipxe-script",
        metavar="<ipxe_script>",
        help="Override iPXE script specified in OS, must be specified if OS is not specified",
        type=str,
    )
    @CLICommand.arguments(
        "--always-boot-custom-ipxe",
        help="Always reboots the instance using iPXE script specified by OS or instance. OS must be of type iPXE.",
        action="store_true",
    )
    @CLICommand.arguments(
        "--interface",
        metavar="<subnet:physical>",
        help=(
            "Specify subnet id and is physical <true|false>. Only one is attached over physical interface."
            "First one is attached over physical interface if not specified. Multiple interface arguments are allowed."
        ),
        type=str,
        action="append",
        required=True,
    )
    @CLICommand.arguments(
        "--infiniband-interface",
        metavar="<partition:device:vendor:device_instance:physical:virtual>",
        help=(
            "Specify partition id, device name, vendor name (optional), device instance, is physical <true|false> "
            "and virtual function id (must be specified if physical is false). "
            "Multiple infiniband interface arguments are allowed."
        ),
        type=str,
        action="append",
    )
    @CLICommand.arguments(
        "--ssh-key-group",
        metavar="ssh_key_group",
        help="Specify SSH Key Group IDs that will provide Serial over LAN access.",
        type=str,
        action="append",
    )
    @CLICommand.arguments("--description", metavar="<description>", help="Description of the instance.", type=str)
    @CLICommand.arguments(
        "--enable-phone-home", help="Enable cloud-init phone home.", action=argparse.BooleanOptionalAction
    )
    @CLICommand.arguments(
        "--security-group", metavar="<security-group>", help="Specify network security group id.", type=str
    )
    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    def create(self, args):
        """Create Instance."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        tenant = None
        tenant_info, _ = self.client.forge.tenant.info(org_name, team_name)
        tenant = tenant_info.get("id", "")
        interfaces = []
        for it in args.interface or []:
            try:
                il = it.split(":")
                il += [None] * (2 - len(il))
                if il[1] is not None:
                    if il[1] in ("true", "t", "yes", "y", "1"):
                        il[1] = True
                    elif il[1] in ("false", "f", "no", "n", "0"):
                        il[1] = False
                    else:
                        raise InvalidArgumentError(f"interface: {it}") from None
                    interfaces.append({"subnetId": il[0], "isPhysical": il[1]})
                else:
                    interfaces.append({"subnetId": il[0]})
            except (ValueError, TypeError, AttributeError, IndexError):
                raise InvalidArgumentError(f"interface: {it}") from None
        infiniband_interfaces = []
        for inb in args.infiniband_interface or []:
            try:
                inl = inb.split(":")
                inl += [None] * (6 - len(inl))
                if inl[4] is not None:
                    if inl[4] in ("true", "t", "yes", "y", "1"):
                        inl[4] = True
                    elif inl[4] in ("false", "f", "no", "n", "0"):
                        inl[4] = False
                    else:
                        raise InvalidArgumentError(f"infiniband interface: {inb}") from None
                inl[3] = int(inl[3]) if inl[3] is not None else inl[3]
                inl[5] = int(inl[5]) if inl[5] is not None else inl[5]
                infiniband_interfaces.append(
                    {
                        "partitionId": inl[0],
                        "device": inl[1],
                        "vendor": inl[2],
                        "deviceInstance": inl[3],
                        "isPhysical": inl[4],
                        "virtualFunctionId": inl[5],
                    }
                )
            except (ValueError, TypeError, AttributeError, IndexError):
                raise InvalidArgumentError(f"infiniband interface: {inb}") from None
        with wrap_bad_request_exception():
            resp = self.api.create(
                org_name,
                team_name,
                args.name,
                tenant,
                args.instance_type,
                args.vpc,
                args.operating_system,
                args.user_data,
                args.ipxe_script,
                args.always_boot_custom_ipxe,
                interfaces,
                infiniband_interfaces,
                args.ssh_key_group,
                args.label,
                args.enable_phone_home,
                description=args.description,
                security_group=args.security_group,
            )
        self.printer.print_info(resp)

    UPDATE_HELP = "Update instance."

    @decorate_update_command_with_label_arguments(
        label_getter=lambda self, args: self.api.info(args.org or self.config.org_name, None, args.instance).get(
            "labels"
        ),
        what="instance",
    )
    @CLICommand.arguments("instance", metavar="<instance>", help="Instance id.", type=str)
    @CLICommand.arguments("--name", metavar="<name>", help="Specify instance name.", type=str)
    @CLICommand.arguments("--reboot", help="Trigger instance reboot.", action="store_const", const=True)
    @CLICommand.arguments(
        "--reboot-custom-ipxe",
        help="Reboot using the custom iPXE specified by OS, is ignored if instance has alwaysBootWithCustomIpxe.",
        # Use store_const instead of store_true because we only care about this value if it's `True`.
        action="store_const",
        const=True,
    )
    @CLICommand.arguments(
        "--enable-phone-home", help="Enable cloud-init phone home.", action=argparse.BooleanOptionalAction
    )
    @CLICommand.arguments(
        "--operating-system", metavar="<operating_system>", help="The UUID of the desired operating system.", type=str
    )
    @CLICommand.arguments("--description", metavar="<description>", help="Description of the instance.", type=str)
    @CLICommand.arguments(
        "--security-group", metavar="<security-group>", help="Specify network security group id.", type=str
    )
    @CLICommand.arguments(
        "--detach-security-group",
        help="Detach the security group from the instance.",
        action="store_true",
    )
    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    def update(self, args):
        """Update Instance."""
        self.config.validate_configuration()
        if args.security_group and args.detach_security_group:
            raise NgcException("Cannot use '--security-group' with '--detach-security-group'.")
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        with wrap_bad_request_exception():
            resp = self.api.update(
                org_name,
                team_name,
                args.instance,
                args.name,
                args.reboot,
                args.reboot_custom_ipxe,
                args.enable_phone_home,
                labels=args.label,
                operating_system=args.operating_system,
                description=args.description,
                security_group=args.security_group,
                detach_security_group=args.detach_security_group,
            )
        self.printer.print_info(resp)

    REMOVE_HELP = "Remove instance."

    @CLICommand.arguments("instance", metavar="<instance>", help="Instance id.", type=str)
    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    def remove(self, args):
        """Remove Instance."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.remove(org_name, team_name, args.instance)
        self.printer.print_ok(f"{resp}")

    LIST_INTERFACE_HELP = "List all interfaces for the instance."

    @CLICommand.arguments("instance", metavar="<instance>", help="Instance id.", type=str)
    @CLICommand.command(name="list-interface", help=LIST_INTERFACE_HELP, description=LIST_INTERFACE_HELP)
    def list_interface(self, args):
        """List Instance Interfaces."""
        self.config.validate_configuration()
        org_name = args.org or self.config.org_name
        team_name = args.team or self.config.team_name
        resp = self.api.list_interface(org_name, team_name, args.instance)
        self.printer.print_list_interface(resp)
