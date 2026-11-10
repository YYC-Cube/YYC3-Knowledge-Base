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

#
from ngcbase.command.clicommand import CLICommand
from ngcbase.errors import InvalidArgumentError, ResourceNotFoundException
from ngcbase.util.utils import confirm_remove
from registry.command.registry import RegistryCommand
from registry.data.model.CloudServiceProviderCreateRequest import (
    CloudServiceProviderCreateRequest,
)
from registry.data.model.CloudServiceProviderUpdateRequest import (
    CloudServiceProviderUpdateRequest,
)
from registry.data.model.DeploymentParametersCreateRequest import (
    DeploymentParametersCreateRequest,
)
from registry.data.model.DeploymentParametersMetaCreateRequest import (
    DeploymentParametersMetaCreateRequest,
)
from registry.errors import CSPNotFoundException
from registry.printer.csp import CspPrinter


def _validate_default_item(collection, item):
    if item is not None:
        if not collection:
            raise InvalidArgumentError("Cannot have a default when the available items is empty.")
        if item not in collection:
            raise InvalidArgumentError(f"The default item '{item}' must be one of the available items.")


def _validate_request_amounts(min_amt, max_amt, default_amt, arg_type):
    if min_amt is not None and max_amt is not None:
        if min_amt > max_amt:
            raise InvalidArgumentError(f"The minimum value for '{arg_type}' cannot be more than the maximum")
    if default_amt is not None:
        if min_amt is not None and min_amt > default_amt:
            raise InvalidArgumentError(f"The default value for '{arg_type}' cannot be less than the minimum")
        if max_amt is not None and max_amt < default_amt:
            raise InvalidArgumentError(f"The default value for '{arg_type}' cannot be more than the maximum")


class CSPSubCommand(RegistryCommand):  # noqa: D101
    CMD_NAME = "csp"
    HELP = "Cloud Service Provider (CSP) Commands"
    DESC = "Cloud Service Provider (CSP) Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.printer = CspPrinter(self.client.config)
        self.config = self.client.config
        self.csp_api = self.client.registry.csp
        self.label_set_api = self.client.registry.label_set

    INFO_HELP = "Get CSP info."
    INFO_NAME_ARG_HELP = "CSP name to fetch."

    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    @CLICommand.arguments("name", metavar="<name>", help=INFO_NAME_ARG_HELP, type=str)
    def info(self, args):
        """Get info for a CSP key."""
        self.config.validate_configuration()
        response = self.csp_api.info(args.name, org=self.config.org_name, team=self.config.team_name)
        self.printer.print_csp(response)

    LIST_HELP = "List CSPs."

    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    @CLICommand.arguments("--enabled-only", help="Show only enabled CSPs", action="store_true")
    def list(self, args):  # noqa: D102
        self.config.validate_configuration(csv_allowed=True)
        csp_list_gen = self.csp_api.list(
            org=self.config.org_name, team=self.config.team_name, enabled_only=args.enabled_only
        )
        self.printer.print_csp_list(csp_list_gen)

    CREATE_HELP = "Create a new CSP entry."
    CREATE_NAME_ARG_HELP = "New entry key to add to list of available CSPs."
    DISPLAY_ARG_HELP = "Display name for the CSP."
    LOGO_ARG_HELP = "Link to the CSP logo."
    ENABLE_ARG_HELP = "Make the CSP entry available for deployment."
    DESCRIPTION_ARG_HELP = "Description for the CSP."
    LABEL_HELP = "Label for the CSP. To specify more than one label, use multiple --label arguments."

    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP)
    @CLICommand.arguments("name", metavar="<name>", help=CREATE_NAME_ARG_HELP, type=str)
    @CLICommand.arguments("--description", metavar="<description>", help=DESCRIPTION_ARG_HELP, type=str, default=None)
    @CLICommand.arguments("--display-name", metavar="<display_name>", help=DISPLAY_ARG_HELP, type=str, default=None)
    @CLICommand.arguments("--logo", metavar="<logo>", help=LOGO_ARG_HELP, type=str, default=None)
    @CLICommand.arguments("--enable", help=ENABLE_ARG_HELP, action="store_true")
    @CLICommand.arguments("--label", metavar="<label>", help=LABEL_HELP, type=str, default=None, action="append")
    def create(self, args):
        """Create a new CSP entry."""
        self.config.validate_configuration()
        create_request = CloudServiceProviderCreateRequest(
            {
                "name": args.name,
                "description": args.description,
                "displayName": args.display_name,
                "logo": args.logo,
                "isEnabled": args.enable,
                "labels": args.label,
            }
        )
        create_request.isValid()

        response = self.csp_api.create(create_request, org=self.config.org_name, team=self.config.team_name)
        self.printer.print_csp(response)

    UPDATE_HELP = "Update an existing CSP entry"
    UPDATE_NAME_ARG_HELP = "CSP entry to update."
    UPDATE_DISABLE_ARG_HELP = "Make the CSP entry unavailable for deployment."

    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP)
    @CLICommand.arguments("name", metavar="<name>", help=UPDATE_NAME_ARG_HELP, type=str)
    @CLICommand.arguments("--description", metavar="<description>", help=DESCRIPTION_ARG_HELP, type=str, default=None)
    @CLICommand.arguments("--display-name", metavar="<display_name>", help=DISPLAY_ARG_HELP, type=str, default=None)
    @CLICommand.arguments("--logo", metavar="<logo>", help=LOGO_ARG_HELP, type=str, default=None)
    @CLICommand.arguments("--label", metavar="<label>", help=LABEL_HELP, type=str, default=None, action="append")
    @CLICommand.arguments("--enable", dest="enable", help=ENABLE_ARG_HELP, action="store_true", default=None)
    @CLICommand.arguments("--disable", dest="enable", help=UPDATE_DISABLE_ARG_HELP, action="store_false", default=None)
    def update(self, args):
        """Update an existing CSP."""
        self.config.validate_configuration()
        update_request = CloudServiceProviderUpdateRequest(
            {
                "description": args.description,
                "displayName": args.display_name,
                "logo": args.logo,
                "isEnabled": args.enable,
                "labels": args.label,
            }
        )
        update_request.isValid()

        response = self.csp_api.update(args.name, update_request, org=self.config.org_name, team=self.config.team_name)
        self.printer.print_csp(response)

    REMOVE_HELP = "Remove an existing CSP."
    REMOVE_NAME_ARG_HELP = "Name of CSP to remove."
    REMOVE_YES_ARG_HELP = "Automatically confirm removal to interactive prompts."

    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP)
    @CLICommand.arguments("name", metavar="<name>", help=REMOVE_NAME_ARG_HELP, type=str)
    @CLICommand.arguments("-y", "--yes", help=REMOVE_YES_ARG_HELP, dest="default_yes", action="store_true")
    def remove(self, args):  # noqa: D102
        self.config.validate_configuration()
        confirm_remove(printer=self.printer, target=args.name, default=args.default_yes)
        _ = self.csp_api.remove(args.name, org=self.config.org_name, team=self.config.team_name)
        self.printer.print_ok(f"Successfully removed CSP '{args.name}'")

    CREATE_SETTINGS_HELP = "Create CSP deployment constraints"
    UPDATE_SETTINGS_HELP = "Update CSP deployment constraints"
    REMOVE_SETTINGS_HELP = "Remove the deployment constraints for a CSP"
    GPU_MIN_HELP = "Minimum allowed number of GPUs"
    GPU_MAX_HELP = "Maximum allowed number of GPUs"
    GPU_DEFAULT_HELP = "Default number of GPUs to use when not otherwise specified"
    GPU_TYPE_HELP = "GPU card type allowed. To specify more than one type, use multiple --gpu-type arguments."
    GPU_DEFAULT_TYPE_HELP = "Default GPU type to use when not otherwise specified"
    DISK_MIN_HELP = "Minimum allowed disk allocation in GBs"
    DISK_MAX_HELP = "Maximum allowed disk allocation in GBs"
    DISK_DEFAULT_HELP = "Default disk size in GBs to use when not otherwise specified"
    SETTINGS_INFO_HELP = "Get CSP deployment constraints info"

    NAME_METAVAR = "<name>"
    GPU_MIN_METAVAR = "<gpu_min>"
    GPU_MAX_METAVAR = "<gpu_max>"
    GPU_DEFAULT_METAVAR = "<gpu_default>"
    GPU_TYPE_METAVAR = "<gpu_type>"
    GPU_DEFAULT_TYPE_METAVAR = "<gpu_default_type>"
    DISK_MIN_METAVAR = "<disk_min>"
    DISK_MAX_METAVAR = "<disk_max>"
    DISK_DEFAULT_METAVAR = "<disk_default>"
    ALL_SETTINGS_METAVAR = "<all_settings>"

    @CLICommand.command(name="info-settings", help=SETTINGS_INFO_HELP, description=SETTINGS_INFO_HELP)
    @CLICommand.arguments(
        "name", metavar=NAME_METAVAR, help="Name of the CSP to fetch deployment constraint settings for", type=str
    )
    def info_settings(self, args):
        """Query for CSP settings info."""
        self.config.validate_configuration()
        try:
            deploy_settings, deploy_defaults = self.csp_api.info_settings(
                args.name, org=self.config.org_name, team=self.config.team_name
            )
        except CSPNotFoundException as e:
            print(f"\n{e}\n")
            return

        except ResourceNotFoundException:
            print(f"\nNo settings information exists for CSP '{args.name}'.\n")
            return
        self.printer.print_deployment_settings(deploy_settings, deploy_defaults)

    @CLICommand.command(name="create-settings", help=CREATE_SETTINGS_HELP, description=CREATE_SETTINGS_HELP)
    @CLICommand.arguments("name", metavar=NAME_METAVAR, help="CSP to create deployment constraints for", type=str)
    @CLICommand.arguments("--gpu-min", metavar=GPU_MIN_METAVAR, help=GPU_MIN_HELP, type=int, required=True)
    @CLICommand.arguments("--gpu-max", metavar=GPU_MAX_METAVAR, help=GPU_MAX_HELP, type=int, required=True)
    @CLICommand.arguments("--gpu-default", metavar=GPU_DEFAULT_METAVAR, help=GPU_DEFAULT_HELP, type=int)
    @CLICommand.arguments(
        "--gpu-type", metavar=GPU_TYPE_METAVAR, help=GPU_TYPE_HELP, type=str, action="append", required=True
    )
    @CLICommand.arguments(
        "--gpu-default-type",
        metavar=GPU_DEFAULT_TYPE_METAVAR,
        help=GPU_DEFAULT_TYPE_HELP,
        type=str,
    )
    @CLICommand.arguments("--disk-min", metavar=DISK_MIN_METAVAR, help=DISK_MIN_HELP, type=int, required=True)
    @CLICommand.arguments("--disk-max", metavar=DISK_MAX_METAVAR, help=DISK_MAX_HELP, type=int, required=True)
    @CLICommand.arguments(
        "--disk-default",
        metavar=DISK_DEFAULT_METAVAR,
        help=DISK_DEFAULT_HELP,
        type=int,
    )
    def create_settings(self, args):
        """Create the allowed ranges and types for a CSP."""
        self.config.validate_configuration()
        _validate_request_amounts(args.gpu_min, args.gpu_max, args.gpu_default, "GPU")
        _validate_request_amounts(args.disk_min, args.disk_max, args.disk_default, "Disk")
        _validate_default_item(args.gpu_type, args.gpu_default_type)

        settings_create_request = DeploymentParametersMetaCreateRequest(
            {
                "gpu": {
                    "count": {"minValue": args.gpu_min, "maxValue": args.gpu_max},
                    "type": {
                        "items": [{"name": each} for each in args.gpu_type],
                    },
                },
                "storage": {
                    "capacityInGB": {
                        "minValue": args.disk_min,
                        "maxValue": args.disk_max,
                    }
                },
            }
        )
        defaults_create_request = DeploymentParametersCreateRequest(
            {
                "gpu": {
                    "count": args.gpu_default,
                    "type": args.gpu_default_type,
                },
                "storage": {
                    "capacityInGB": args.disk_default,
                },
            },
        )
        deploy_settings, deploy_defaults = self.csp_api.create_settings(
            args.name,
            settings_create_request,
            defaults_create_request,
            org=self.config.org_name,
            team=self.config.team_name,
        )
        self.printer.print_deployment_settings(deploy_settings, deploy_defaults)

    @CLICommand.command(name="update-settings", help=UPDATE_SETTINGS_HELP, description=UPDATE_SETTINGS_HELP)
    @CLICommand.arguments("name", metavar=NAME_METAVAR, help="CSP to update deployment constraints for", type=str)
    @CLICommand.arguments("--gpu-min", metavar=GPU_MIN_METAVAR, help=GPU_MIN_HELP, type=int)
    @CLICommand.arguments("--gpu-max", metavar=GPU_MAX_METAVAR, help=GPU_MAX_HELP, type=int)
    @CLICommand.arguments("--gpu-default", metavar=GPU_DEFAULT_METAVAR, help=GPU_DEFAULT_HELP, type=int)
    @CLICommand.arguments("--gpu-type", metavar=GPU_TYPE_METAVAR, help=GPU_TYPE_HELP, type=str, action="append")
    @CLICommand.arguments(
        "--gpu-default-type",
        metavar=GPU_DEFAULT_TYPE_METAVAR,
        help=GPU_DEFAULT_TYPE_HELP,
        type=str,
    )
    @CLICommand.arguments("--disk-min", metavar=DISK_MIN_METAVAR, help=DISK_MIN_HELP, type=int)
    @CLICommand.arguments("--disk-max", metavar=DISK_MAX_METAVAR, help=DISK_MAX_HELP, type=int)
    @CLICommand.arguments(
        "--disk-default",
        metavar=DISK_DEFAULT_METAVAR,
        help=DISK_DEFAULT_HELP,
        type=int,
    )
    def update_settings(self, args):
        """Update the allowed ranges and types for a CSP."""
        self.config.validate_configuration()
        all_update_args = {
            nm: getattr(args, nm)
            for nm in (
                "gpu_min",
                "gpu_max",
                "gpu_default",
                "gpu_type",
                "gpu_default_type",
                "disk_min",
                "disk_max",
                "disk_default",
            )
        }
        update_args = {k: v for k, v in all_update_args.items() if v}
        if not update_args:
            # The user didn't include anything to update
            self.printer.print_error("You must pass at least one value to update")
            return
        current_settings, current_defaults = self.csp_api.info_settings(
            args.name, org=self.config.org_name, team=self.config.team_name
        )
        settings_payload = current_settings.toDict()
        defaults_payload = current_defaults.toDict()
        # Update any values in the parameters
        for key, val in update_args.items():
            if key == "gpu_min":
                settings_payload["gpu"]["count"]["minValue"] = val
            elif key == "gpu_max":
                settings_payload["gpu"]["count"]["maxValue"] = val
            elif key == "gpu_default":
                defaults_payload["gpu"]["count"] = val
            elif key == "disk_min":
                settings_payload["storage"]["capacityInGB"]["minValue"] = val
            elif key == "disk_max":
                settings_payload["storage"]["capacityInGB"]["maxValue"] = val
            elif key == "disk_default":
                defaults_payload["storage"]["capacityInGB"] = val
            elif key == "gpu_type":
                all_types = [itm["name"] for itm in settings_payload["gpu"]["type"]["items"]]
                all_types.extend(val)
                new_types = [{"name": typ} for typ in set(all_types)]
                settings_payload["gpu"]["type"]["items"] = new_types
            elif key == "gpu_default_type":
                defaults_payload["gpu"]["type"] = val
        # Validate the new configuration
        gcount = settings_payload["gpu"]["count"]
        gtype = settings_payload["gpu"]["type"]
        dcap = settings_payload["storage"]["capacityInGB"]
        _validate_request_amounts(gcount["minValue"], gcount["maxValue"], defaults_payload["gpu"]["count"], "GPU")
        _validate_request_amounts(
            dcap["minValue"], dcap["maxValue"], defaults_payload["storage"]["capacityInGB"], "Disk"
        )
        all_items = [itm["name"] for itm in gtype["items"] or []]
        _validate_default_item(all_items, defaults_payload["gpu"]["type"])

        deploy_settings, deploy_defaults = self.csp_api.update_settings(
            args.name, settings_payload, defaults_payload, org=self.config.org_name, team=self.config.team_name
        )
        self.printer.print_deployment_settings(deploy_settings, deploy_defaults)

    @CLICommand.command(name="remove-settings", help=REMOVE_SETTINGS_HELP, description=REMOVE_SETTINGS_HELP)
    @CLICommand.arguments("name", metavar=NAME_METAVAR, help="CSP to remove deployment constraints for", type=str)
    @CLICommand.arguments("-y", "--yes", help=REMOVE_YES_ARG_HELP, dest="default_yes", action="store_true")
    def remove_settings(self, args):
        """Remove the deployment constraints for a CSP."""
        self.config.validate_configuration()
        confirm_remove(printer=self.printer, target=f"settings for '{args.name}'", default=args.default_yes)
        try:
            settings_result, defaults_result = self.csp_api.remove_settings(
                args.name, org=self.config.org_name, team=self.config.team_name
            )
        except ResourceNotFoundException:
            self.printer.print_error(f"Either the CSP '{args.name}' does not exist, or it has no settings.")
            return
        settings_status = settings_result.toDict().get("requestStatus", {}).get("statusCode", "")
        defaults_status = defaults_result.toDict().get("requestStatus", {}).get("statusCode", "")
        if settings_status == defaults_status == "SUCCESS":
            self.printer.print_ok(f"All deployment constraints for CSP '{args.name}' have been removed.")
        else:
            self.printer.print_error(f"Failed to remove deployment constraints for CSP '{args.name}'.")
