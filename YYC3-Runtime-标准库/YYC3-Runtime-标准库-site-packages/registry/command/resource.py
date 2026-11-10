#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import logging

from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_url,
    check_valid_columns,
    SingleUseAction,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import (
    CANARY_ENV,
    CONFIG_TYPE,
    DISABLE_TYPE,
    ENABLE_TYPE,
    PRODUCT_NAMES,
    STAGING_ENV,
)
from ngcbase.errors import (
    NgcException,
    ResourceFilesNotFoundException,
    ResourceNotFoundException,
)
from ngcbase.printer.transfer import TransferPrinter
from ngcbase.transfer.utils import handle_transfer_exit_code
from ngcbase.util.utils import confirm_remove, get_columns_help, get_environ_tag
from registry.api.resources import ResourceAPI
from registry.api.utils import ModelRegistryTarget
from registry.command.publish import (
    ACCESS_TYPE_HELP,
    ALLOW_GUEST_HELP,
    CLEAR_TOS_HELP,
    DISCOVERABLE_HELP,
    GET_STATUS_HELP,
    LICENSE_TERM_FILE_HELP,
    METADATA_HELP,
    NSPECT_ID_HELP,
    PRODUCT_HELP,
    PUBLIC_HELP,
    publish_action_args,
    publish_status_args,
    SIGN_ARG_HELP,
    UPDATE_TOS_HELP,
    validate_command_args,
    validate_parse_license_terms,
    VERSION_ONLY_HELP,
    VISIBILITY_HELP,
)
from registry.command.registry import RegistryCommand
from registry.data.model.ApplicationType import ApplicationTypeEnum
from registry.data.model.FrameworkType import FrameworkTypeEnum
from registry.data.model.PrecisionType import PrecisionTypeEnum
from registry.data.model.RecipeResponse import RecipeResponse
from registry.data.model.RecipeVersionResponse import RecipeVersionResponse
from registry.data.registry.AccessTypeEnum import AccessTypeEnum
from registry.printer.publish import PublishPrinter
from registry.printer.resource import ResourcePrinter

logger = logging.getLogger(__name__)

NOTES_ARG = "--release-notes-filename"
PERFORMANCE_ARG = "--performance-filename"
ADVANCED_ARG = "--advanced-filename"
QUICK_START_ARG = "--quick-start-guide-filename"
SETUP_ARG = "--setup-filename"
OVERVIEW_ARG = "--overview-filename"
PUBLISH_TYPE = ENABLE_TYPE if (get_environ_tag() <= CANARY_ENV) else DISABLE_TYPE
LICENSE_TERMS_FLAG = ENABLE_TYPE if (get_environ_tag() <= STAGING_ENV) else DISABLE_TYPE


class ResourceSubCommand(RegistryCommand):  # noqa: D101
    CMD_NAME = "resource"
    HELP = "Resource Commands"
    DESC = "Resource Commands"
    CLI_HELP = ENABLE_TYPE

    # pylint: disable=no-self-use

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api: ResourceAPI = self.client.registry.resource
        self.search_api = self.client.registry.search
        self.label_set_api = self.client.registry.label_set
        self.publish_api = self.client.registry.publish
        self.printer = ResourcePrinter(self.client.config)
        self.transfer_printer = TransferPrinter(self.client.config)
        self.publish_printer = PublishPrinter(self.client.config)
        self.resource_type = "RECIPE"

    if CLICommand.CLI_CLIENT and bool(CLICommand.CLI_CLIENT.config.product_names):
        product_names = CLICommand.CLI_CLIENT.config.product_names
    else:
        product_names = PRODUCT_NAMES

    resource_and_version_args = [
        ("performance_filename", "--performance-filename"),
        ("quick_start_guide_filename", "--quick-start-guide-filename"),
        ("setup_filename", "--setup-filename"),
    ]

    LIST_HELP = "List resources or resource version(s)."

    TARGET_HELP = (
        "Resource or resource version.  Format: org/[team/]resource_name[:version]. "
        'To target a resource version, use "org/[team/]name:version". '
        'To target a resource, use "org/[team/]name".'
    )

    UPLOAD_TARGET_VERSION_HELP = "Resource version. Format: org/[team/]resource_name:version."

    LIST_TARGET_HELP = (
        "Filter the search by allowing wildcards for resources "
        "or resource version(s). "
        "Format: [org/[team/]]name[:version]. "
        'To target resource version(s), use "[org/[team/]]name:version". '
        'To target resources use "[org/[team/]]name". '
        'Both name and version support the wildcards "*" and "?". '
        "Version also supports character expressions ([a-z], [!ab], etc.). "
        'Examples:  "my_org/my_resource" - target my_resource in my_org namespace. '
        '"my_org/my_team/my_resource" - target my_resource in my_org/my_team namespace. '
        '"my_org/my_team/*" - target all resources in my_org/my_team namespace. '
        '"my_org/my_resource*" '
        "- target all resource versions for my_resource in my_org namespace. "
        '"my_org/my_resource:[1-5]" '
        "- target versions 1-5 for my_resource in my_org namespace."
    )

    columns_dict = {
        "name": "Name",
        "org": "Org",
        "team": "Team",
        "description": "Description",
        "updated": "Last Modified",
        "created": "Created Date",
        "shared": "Shared",
        "size": "File Size",
        "latest_version": "Latest Version",
        "version": "Version",
        "application": "Application",
        "framework": "Framework",
        "precision": "Precision",
        "permission": "Permission",
        "accuracy": "Accuracy",
        "epochs": "Epochs",
        "batch": "Batch Size",
        "gpu": "GPU Model",
        "memory": "Memory Footprint",
        "status": "Status",
        "labels": "Labels",
    }
    columns_default_resource = ("repository", "Repository")
    columns_default_version = ("latest_version", "Latest Version")
    columns_help = get_columns_help(columns_dict, [columns_default_resource, columns_default_version])
    ACCESS_TYPE_LIST_HELP = "Filter the list of resources to only resources that have specified access type."
    PRODUCT_NAME_LIST_HELP = (
        "Filter the list of resources to only resources that are under the product name. Multiple product-name"
        f" arguments are allowed. Choose from: {', '.join(product_names)}"
    )

    @CLICommand.arguments("target", metavar="<target>", help=LIST_TARGET_HELP, type=str, nargs="?", default=None)
    # pylint:disable=undefined-variable
    @CLICommand.arguments(
        "--column",
        metavar="<column>",
        help=columns_help,
        default=None,
        action="append",
        type=lambda value, columns_dict=columns_dict: check_valid_columns(value, columns_dict),
    )
    @CLICommand.arguments(
        "--access-type",
        metavar="<access_type>",
        help=ACCESS_TYPE_LIST_HELP,
        choices=AccessTypeEnum,
        default=None,
    )
    @CLICommand.arguments(
        "--product-name",
        metavar="<product_name>",
        help=PRODUCT_NAME_LIST_HELP,
        default=None,
        action="append",
    )
    @CLICommand.arguments("--signed", action="store_true", help="Show only models that are signed", default=False)
    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    def list(self, args):  # noqa: D102
        mrt = ModelRegistryTarget(args.target, glob_allowed=True)
        product_names_args = args.product_name if args.product_name else []
        resource_list = self.api.list(
            target=args.target, access_type=args.access_type, product_names=product_names_args, signed=args.signed
        )

        if mrt.version is None:
            self.printer.print_resource_list(resource_list, columns=args.column)
        else:
            check_add_args_columns(args.column, ResourceSubCommand.columns_default_version)
            self.printer.print_resource_version_list(resource_list, columns=args.column)

    INFO_HELP = "Retrieve metadata for a resource or resource version."

    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    @CLICommand.arguments("target", metavar="<target>", help=TARGET_HELP, type=str, default=None)
    @CLICommand.arguments(
        "--files", help="List files in addition to details for a version.", dest="list_files", action="store_true"
    )
    def info(self, args):  # noqa: D102
        mrt = ModelRegistryTarget(args.target, org_required=True, name_required=True)

        if mrt.version is None:
            resp: RecipeResponse = self.api.info(target=args.target, list_files=args.list_files)
            self.printer.print_resource(resp.recipe)
        else:
            resp: RecipeVersionResponse = self.api.info(target=args.target, list_files=args.list_files)
            # TODO: Collapse List Files into Info API function
            file_list = self.get_version_files(mrt.org, mrt.team, mrt.name, mrt.version) if args.list_files else None
            self.printer.print_resource_version(version=resp.recipeVersion, resource=resp.recipe, file_list=file_list)

    def get_version_files(self, org_name, team_name, name, version):  # noqa: D102
        try:
            file_list = self.api.list_files(org_name, team_name, name, version)
        except ResourceNotFoundException:
            raise ResourceFilesNotFoundException(f"Files could not be found for target '{name}:{version}'.") from None
        return file_list

    # resource attributes
    TARGET_ARG_HELP = "Resource.  Format: org/[team/]resource_name."
    RESOURCE_METAVAR_REQ_VERSION = "org/[team/]resource_name:version"
    APPLICATION_HELP = "Application of the resource. Allowed values: {}.".format(", ".join(ApplicationTypeEnum))
    FRAMEWORK_HELP = "Framework used in the resource. Allowed values: {}.".format(", ".join(FrameworkTypeEnum))
    FORMAT_HELP = "Format of the model (checkpoint) generated by the resource."
    PRECISION_HELP = "Precision supported by the resource. Allowed values: {}.".format(", ".join(PrecisionTypeEnum))
    SHORT_DESC_HELP = "Short description."
    DISPLAY_NAME_HELP = "Display name."
    ADD_LABEL_HELP = (
        "Label for the resource to add. Can be used multiple times."
        "Imperative label argument, not to be used with declarative label arguments --label or --label-set"
    )
    REMOVE_LABEL_HELP = (
        "Label for the resource to remove. Can be used multiple times."
        "Imperative label argument, not to be used with declarative label arguments --label or --label-set"
    )
    LABEL_HELP = (
        "Label for the resource to declare. Can be used multiple times."
        "Declarative label argument, not to be used with declarative label arguments —add-label or —remove-label"
    )
    LABEL_SET_HELP = (
        "Name of the label set for the resource to declare. Can be used multiple times. Format: org/[team/]name. "
        "Declarative label argument, not to be used with declarative label arguments —add-label or —remove-label"
    )
    LOGO_HELP = "URL for the resource logo image."
    PUBLIC_DATASET_NAME_HELP = "Name of public dataset used."
    PUBLIC_DATASET_LINK_HELP = "Link to public dataset used."
    PUBLIC_DATASET_LICENSE_HELP = "License for public dataset used."
    BUILT_BY_HELP = "Builder of the resource."
    PUBLISHER_HELP = "Publisher of the resource."
    # Note: resource-level overview attribute is stored in description in the schema.
    # UI diverged and we need to quickly match them now.
    OVERVIEW_HELP = "Overview. Provide the path to a file that contains the overview for the resource."

    # common resource and resource version attributes
    ADVANCED_HELP = 'Advanced guide. Provide the path to a file that contains the "Advanced Guide" for the resource.'
    PERFORMANCE_HELP = (
        "Performance data. Provide the path to a file that contains the performance data for the resource."
    )
    QUICK_START_HELP = (
        'Quick start information. Provide the path to a file that contains the "Quick Start Guide" '
        "information for the resource."
    )
    SETUP_HELP = "Setup instructions. Provide the path to a file that contains the setup instructions for the resource."

    # version attributes
    # Note: both script and version schema have a description.  The version level description is not
    # used anywhere and can be removed.  The script level description is displayed as Overview in UI
    DESC_HELP = "Full description of resource version."
    ACCURACY_REACHED_HELP = "Accuracy reached with resource version."
    BATCH_SIZE_HELP = "The batch size of the resource version."
    GPU_HELP = "The GPU used to train the resource version."
    MEMORY_HELP = "The memory footprint of the resource version."
    NUM_EPOCHS_HELP = "The number of epochs for the resource version."
    NOTES_HELP = "Release notes. Provide the path to a file that contains the release notes for the resource."

    # NOT RELATED TO SCRIPTS
    SOURCE_HELP = (
        "Provide source directory of the resource or path of single file to be uploaded; if omitted, current "
        "directory will be used."
    )

    CREATE_HELP = "Create a resource."

    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP, feature_tag=CONFIG_TYPE)
    @CLICommand.arguments("target", metavar="<target>", help=TARGET_ARG_HELP, type=str, default=None)
    @CLICommand.arguments(
        "--application",
        metavar="<app>",
        required=True,
        help=APPLICATION_HELP,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--framework",
        metavar="<fwk>",
        required=True,
        help=FRAMEWORK_HELP,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--format",
        metavar="<fmt>",
        required=True,
        help=FORMAT_HELP,
        dest="model_format",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--precision",
        metavar="<prec>",
        required=True,
        help=PRECISION_HELP,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--short-desc",
        metavar="<desc>",
        required=True,
        help=SHORT_DESC_HELP,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        OVERVIEW_ARG, metavar="<path>", help=OVERVIEW_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--display-name", metavar="<name>", help=DISPLAY_NAME_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments("--label", metavar="<label>", help=LABEL_HELP, action="append", type=str, default=None)
    @CLICommand.arguments(
        "--label-set", metavar="<label-set>", help=LABEL_SET_HELP, action="append", type=str, default=None
    )
    @CLICommand.arguments(
        "--logo", metavar="<url>", help=LOGO_HELP, type=check_url, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--public-dataset-name",
        metavar="<name>",
        help=PUBLIC_DATASET_NAME_HELP,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--public-dataset-link",
        metavar="<url>",
        help=PUBLIC_DATASET_LINK_HELP,
        type=check_url,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--public-dataset-license",
        metavar="<lcs>",
        help=PUBLIC_DATASET_LICENSE_HELP,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--built-by", metavar="<name>", help=BUILT_BY_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--publisher", metavar="<name>", help=PUBLISHER_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        ADVANCED_ARG, metavar="<path>", help=ADVANCED_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        PERFORMANCE_ARG, metavar="<path>", help=PERFORMANCE_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        QUICK_START_ARG, metavar="<path>", help=QUICK_START_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(SETUP_ARG, metavar="<path>", help=SETUP_HELP, type=str, default=None, action=SingleUseAction)
    def create(self, args):
        """Create a new resource."""
        resource = self.api.create(
            target=args.target,
            application=args.application,
            framework=args.framework,
            model_format=args.model_format,
            precision=args.precision,
            short_description=args.short_desc,
            overview_filename=args.overview_filename,
            advanced_filename=args.advanced_filename,
            performance_filename=args.performance_filename,
            quick_start_guide_filename=args.quick_start_guide_filename,
            setup_filename=args.setup_filename,
            display_name=args.display_name,
            label=args.label,
            label_set=args.label_set,
            logo=args.logo,
            public_dataset_name=args.public_dataset_name,
            public_dataset_license=args.public_dataset_license,
            public_dataset_link=args.public_dataset_link,
            built_by=args.built_by,
            publisher=args.publisher,
        )
        self.printer.print_head("Successfully created resource '{}'.".format(args.target))
        self.printer.print_resource(resource)

    UPDATE_HELP = "Update a resource or resource version."

    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP, feature_tag=CONFIG_TYPE)
    @CLICommand.arguments("target", metavar="<target>", help=TARGET_HELP, type=str, default=None)
    # resource specific
    @CLICommand.arguments(
        "--application", metavar="<app>", help=APPLICATION_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--framework", metavar="<fwk>", help=FRAMEWORK_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--format",
        metavar="<fmt>",
        help=FORMAT_HELP,
        dest="model_format",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--precision", metavar="<prec>", help=PRECISION_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--short-desc", metavar="<desc>", help=SHORT_DESC_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        OVERVIEW_ARG, metavar="<path>", help=OVERVIEW_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--display-name", metavar="<name>", help=DISPLAY_NAME_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--add-label",
        metavar="<add-label>",
        help=ADD_LABEL_HELP,
        type=str,
        default=None,
        action="append",
    )
    @CLICommand.arguments(
        "--remove-label",
        metavar="<remove-label>",
        help=REMOVE_LABEL_HELP,
        type=str,
        default=None,
        action="append",
    )
    @CLICommand.arguments("--label", metavar="<label>", help=LABEL_HELP, action="append", type=str, default=None)
    @CLICommand.arguments(
        "--label-set", metavar="<label-set>", help=LABEL_SET_HELP, action="append", type=str, default=None
    )
    @CLICommand.arguments(
        "--logo", metavar="<url>", help=LOGO_HELP, type=check_url, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--public-dataset-name",
        metavar="<name>",
        help=PUBLIC_DATASET_NAME_HELP,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--public-dataset-link",
        metavar="<url>",
        help=PUBLIC_DATASET_LINK_HELP,
        type=check_url,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--public-dataset-license",
        metavar="<lcs>",
        help=PUBLIC_DATASET_LICENSE_HELP,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--built-by", metavar="<name>", help=BUILT_BY_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--publisher", metavar="<name>", help=PUBLISHER_HELP, type=str, default=None, action=SingleUseAction
    )
    # resource version specific
    @CLICommand.arguments("--desc", metavar="<desc>", help=DESC_HELP, type=str, default=None, action=SingleUseAction)
    @CLICommand.arguments(
        "--accuracy-reached",
        metavar="<accuracy>",
        help=ACCURACY_REACHED_HELP,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--batch-size", metavar="<size>", help=BATCH_SIZE_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--gpu-model", metavar="<model>", help=GPU_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--memory-footprint", metavar="<footprint>", help=MEMORY_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--num-epochs", metavar="<num>", help=NUM_EPOCHS_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(NOTES_ARG, metavar="<path>", help=NOTES_HELP, type=str, default=None, action=SingleUseAction)
    # common
    @CLICommand.arguments(
        ADVANCED_ARG, metavar="<path>", help=ADVANCED_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        PERFORMANCE_ARG, metavar="<path>", help=PERFORMANCE_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        QUICK_START_ARG, metavar="<path>", help=QUICK_START_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(SETUP_ARG, metavar="<path>", help=SETUP_HELP, type=str, default=None, action=SingleUseAction)
    @CLICommand.mutex(["label", "label_set"], ["add_label", "remove_label"])
    def update(self, args):
        """Update an existing resource."""
        _mrt = ModelRegistryTarget(args.target, org_required=True, name_required=True)
        resource = self.api.update(
            target=args.target,
            application=args.application,
            framework=args.framework,
            model_format=args.model_format,
            precision=args.precision,
            short_description=args.short_desc,
            overview_filename=args.overview_filename,
            advanced_filename=args.advanced_filename,
            performance_filename=args.performance_filename,
            quick_start_guide_filename=args.quick_start_guide_filename,
            setup_filename=args.setup_filename,
            release_notes_filename=args.release_notes_filename,
            display_name=args.display_name,
            labels=args.label,
            add_label=args.add_label,
            remove_label=args.remove_label,
            label_set=args.label_set,
            logo=args.logo,
            public_dataset_name=args.public_dataset_name,
            desc=args.desc,
            public_dataset_license=args.public_dataset_license,
            public_dataset_link=args.public_dataset_link,
            built_by=args.built_by,
            publisher=args.publisher,
            num_epochs=args.num_epochs,
            batch_size=args.batch_size,
            accuracy_reached=args.accuracy_reached,
            gpu_model=args.gpu_model,
            memory_footprint=args.memory_footprint,
        )

        if _mrt.version is None:
            self.printer.print_head("Successfully updated resource'{}'.".format(args.target))
            self.printer.print_resource(resource)
        else:
            self.printer.print_head(f"Successfully updated resource version '{args.target}'.")
            self.printer.print_resource_version(version=resource.recipeVersion, resource=resource.recipe)

    REMOVE_HELP = "Remove a resource or resource version."

    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP, feature_tag=CONFIG_TYPE)
    @CLICommand.arguments("target", metavar="<target>", help=TARGET_HELP, type=str, default=None)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    def remove(self, args):
        """Delete an existing resource or resource version."""
        mrt = ModelRegistryTarget(args.target, org_required=True, name_required=True)
        confirm_remove(printer=self.printer, target=args.target, default=args.default_yes)
        self.api.remove(target=args.target)

        if mrt.version is None:
            self.printer.print_ok("Successfully removed resource '{}'.".format(args.target))
        else:
            self.printer.print_ok("Successfully removed resource version '{}'.".format(args.target))

    DL_VER_HELP = "Download a resource version."
    TARGET_VERSION_REQUIRED_HELP = (
        "Resource version. Format: org/[team/]resource_name[:version].  "
        "If no version specified, the latest version will be targeted."
    )

    @CLICommand.command(name="download-version", help=DL_VER_HELP, description=DL_VER_HELP)
    @CLICommand.arguments("target", metavar="<target>", help=TARGET_VERSION_REQUIRED_HELP, type=str, default=None)
    @CLICommand.arguments(
        "--dest",
        metavar="<path>",
        help="Provide a destination to download the resource.  Default:  .",
        type=str,
        default="",
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--file",
        metavar="<wildcard>",
        action="append",
        help=(
            "Specify individual files to download from the resource.\n"
            "Supports standard Unix shell-style wildcards like (?, [abc], [!a-z], etc..) "
            "May be used multiple times in the same command."
        ),
    )
    @CLICommand.arguments(
        "--exclude",
        metavar="<wildcard>",
        action="append",
        help=(
            "Exclude files or directories from the downloaded resource.\n"
            "Supports standard Unix shell-style wildcards like (?, [abc], [!a-z], etc..). "
            "May be used multiple times in the same command."
        ),
    )
    def download_version(self, args):
        """Download a specific resource version."""
        with TransferPrinter(self.client.config).progress_task("Downloading...") as progress_callback:
            download_res = self.api.download_version(
                target=args.target,
                destination=args.dest,
                file_patterns=args.file,
                exclude_patterns=args.exclude,
                progress_callback_func=progress_callback,
            )
        self.transfer_printer.print_async_download_transfer_summary("resource", *download_res.values())

        # Handle exit codes for download operations
        handle_transfer_exit_code(download_res)

    def _get_latest_version(self, target):
        try:
            resp = self.api.get(target.org, target.team, target.name)
        except ResourceNotFoundException:
            raise ResourceNotFoundException("Target '{}' could not be found.".format(target)) from None
        if not resp.recipe.latestVersionIdStr:
            raise NgcException("Target '{}' has no version available for download.".format(target))
        return resp.recipe.latestVersionIdStr

    UL_VER_HELP = "Upload a resource version."

    @CLICommand.command(name="upload-version", help=UL_VER_HELP, description=UL_VER_HELP, feature_tag=CONFIG_TYPE)
    @CLICommand.arguments("target", metavar="<target>", help=UPLOAD_TARGET_VERSION_HELP, type=str, default=None)
    @CLICommand.arguments(
        "--accuracy-reached",
        metavar="<accuracy>",
        help=ACCURACY_REACHED_HELP,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--batch-size", metavar="<size>", help=BATCH_SIZE_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--gpu-model", metavar="<model>", help=GPU_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--memory-footprint", metavar="<footprint>", help=MEMORY_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--num-epochs", metavar="<num>", help=NUM_EPOCHS_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments("--desc", metavar="<desc>", help=DESC_HELP, type=str, default=None, action=SingleUseAction)
    @CLICommand.arguments(
        PERFORMANCE_ARG, metavar="<path>", help=PERFORMANCE_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        QUICK_START_ARG, metavar="<path>", help=QUICK_START_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(SETUP_ARG, metavar="<path>", help=SETUP_HELP, type=str, default=None, action=SingleUseAction)
    @CLICommand.arguments(NOTES_ARG, metavar="<path>", help=NOTES_HELP, type=str, default=None, action=SingleUseAction)
    @CLICommand.arguments("--source", metavar="<path>", help=SOURCE_HELP, type=str, default=".", action=SingleUseAction)
    @CLICommand.arguments(
        "--dry-run",
        help="List file paths, total upload size and file count without performing the upload.",
        action="store_true",
        default=False,
        dest="dry_run",
    )
    @CLICommand.arguments(
        "--base-version",
        help=(
            "Use an existing model version as the base: include all its files, "
            "and have any overlapping files overwritten by those in the source."
        ),
        default="",
        metavar="<version>",
        dest="base_version",
        action=SingleUseAction,
    )
    def upload_version(self, args):
        """Upload a resource version."""
        # cannot create transferPrinter in __init__(), format_type is only recieved during arg parsing
        with TransferPrinter(self.client.config).progress_task("Uploading...") as progress_callback:
            upload_res = self.api.upload_version(
                target=args.target,
                source=args.source,
                gpu_model=args.gpu_model,
                memory_footprint=args.memory_footprint,
                num_epochs=args.num_epochs,
                batch_size=args.batch_size,
                accuracy_reached=args.accuracy_reached,
                description=args.desc,
                dry_run=args.dry_run,
                release_notes_filename=args.release_notes_filename,
                performance_filename=args.performance_filename,
                quick_start_guide_filename=args.quick_start_guide_filename,
                setup_filename=args.setup_filename,
                base_version=args.base_version,
                progress_callback_func=progress_callback,
            )
        ver_resp = self.api.info(args.target)
        self.transfer_printer.print_async_upload_transfer_summary(
            "resource", *upload_res.values(), version_status=ver_resp.recipeVersion.status
        )

        # Handle exit codes for upload operations
        handle_transfer_exit_code(upload_res)

    resource_metavar = "org/[team/]resource_name[:version]"
    publish_help = (
        "Publish a resource from the NGC resource registry to catalog.  "
        "If no version is provided, the latest is assumed."
    )
    publish_target_help = (
        "The the target resource and version you want to publish to.  "
        "Optional when getting publishing status using the `--status` flag.  "
        f"Format: {resource_metavar}"
    )
    publish_source_help = f"The source resource and version you want to publish.  Format: {resource_metavar}"
    product_help = PRODUCT_HELP + ", ".join(product_names)

    @CLICommand.command(help=publish_help, description=publish_help, feature_tag=PUBLISH_TYPE)
    @CLICommand.arguments("target", metavar=resource_metavar, help=publish_target_help, nargs="?", type=str)
    @CLICommand.arguments("--source", metavar=resource_metavar, help=publish_source_help, type=str, default=None)
    @CLICommand.arguments("--metadata-only", help=METADATA_HELP, action="store_true")
    @CLICommand.arguments("--version-only", help=VERSION_ONLY_HELP, action="store_true")
    @CLICommand.arguments("--visibility-only", help=VISIBILITY_HELP, action="store_true")
    @CLICommand.arguments("--allow-guest", help=ALLOW_GUEST_HELP, action="store_true")
    @CLICommand.arguments("--discoverable", help=DISCOVERABLE_HELP, action="store_true")
    @CLICommand.arguments("--public", help=PUBLIC_HELP, action="store_true")
    @CLICommand.arguments(
        "--product-name",
        metavar="<product_name>",
        help=product_help,
        action="append",
        default=None,
    )
    @CLICommand.arguments("--status", metavar="<workflow_id>", help=GET_STATUS_HELP, type=str, default=None)
    @CLICommand.arguments(
        "--access-type", metavar="<access_type>", help=ACCESS_TYPE_HELP, type=str, default=None, choices=AccessTypeEnum
    )
    @CLICommand.mutex(["metadata_only"], ["version_only"], ["visibility_only"])
    @CLICommand.any_of(publish_action_args + publish_status_args)
    @CLICommand.mutex(["access_type", "product_name"], ["allow_guest", "discoverable", "public"])
    @CLICommand.mutex(publish_action_args, publish_status_args)
    @CLICommand.arguments(
        "--license-terms-file",
        metavar="<filename>",
        help=LICENSE_TERM_FILE_HELP,
        type=str,
        default=None,
        feature_tag=LICENSE_TERMS_FLAG,
    )
    @CLICommand.arguments("--sign", help=SIGN_ARG_HELP, action="store_true")
    @CLICommand.arguments("--nspect-id", help=NSPECT_ID_HELP, type=str)
    def publish(self, args):  # noqa: D102
        validate_command_args(args)
        if args.status:
            status = self.publish_api.status(args.status)
            self.publish_printer.print_publishing_status(status)
            return
        license_terms_specs = validate_parse_license_terms(args)
        workflow_id = self.api.publish(
            args.target,
            args.source,
            args.metadata_only,
            args.version_only,
            args.visibility_only,
            args.allow_guest,
            args.discoverable,
            args.public,
            args.access_type,
            args.product_name,
            license_terms_specs,
            args.sign,
            args.nspect_id,
        )
        self.publish_printer.print_publishing_success(args.target, self.CMD_NAME, workflow_id)

    deploy_help = (
        "Create interactive deployment of a resource from the NGC catalog to a cloud service provider (CSP). "
        "Default parameters can be overwritten with the provided flag options."
    )
    csp_help = "Cloud service provider (CSP) to deploy to."
    deploy_target_help = "Model and version to use for deployment."
    cpu_help = "Number of CPUs to use."
    gpu_help = "Number of GPUs to use."
    gpu_type_help = "Type of GPUs to use."
    disk_help = "Amount of disk space to allocate in GBs."
    ram_help = "Amount of RAM to allocate in GBs."
    image_help = "Image and tag to use as base for deployment if different from default."

    @CLICommand.command(
        name="update-license-terms", help=UPDATE_TOS_HELP, description=UPDATE_TOS_HELP, feature_tag=LICENSE_TERMS_FLAG
    )
    @CLICommand.arguments("target", metavar=resource_metavar, help=publish_target_help, type=str)
    @CLICommand.arguments(
        "--license-terms-file",
        metavar="<filename>",
        help=LICENSE_TERM_FILE_HELP,
        type=str,
        default=None,
    )
    @CLICommand.arguments("--clear", help=CLEAR_TOS_HELP, action="store_true")
    @CLICommand.mutex(["license_terms_file"], ["clear"])
    def update_license_terms(self, args):  # noqa: D102
        license_terms_specs = validate_parse_license_terms(args)
        self.api.update_license_terms(args.target, license_terms_specs)
        if bool(args.clear):
            self.printer.print_ok("Successfully cleared license terms for resource '{}'.".format(args.target))
        else:
            self.printer.print_ok("Successfully updated license terms for resource '{}'.".format(args.target))

    SIGN_HELP = "Request a resource version to get signed."

    @CLICommand.command(name="sign", help=SIGN_HELP, description=SIGN_HELP)
    @CLICommand.arguments("target", metavar="<target>", help=TARGET_VERSION_REQUIRED_HELP, type=str)
    def sign(self, args):  # noqa: D102
        try:
            self.api.sign(args.target)
            self.printer.print_ok(f"Successfully signed resource '{args.target}'.")
        except ResourceFilesNotFoundException:
            raise ResourceNotFoundException(f"Resource '{args.target}' could not be found.") from None

    DOWNLOAD_SIG_HELP = "Download the signature file of a resource."

    @CLICommand.command(
        name="download-version-signature",
        help=DOWNLOAD_SIG_HELP,
        description=DOWNLOAD_SIG_HELP,
    )
    @CLICommand.arguments("target", metavar="<target>", help=TARGET_VERSION_REQUIRED_HELP, type=str)
    @CLICommand.arguments(
        "--dest",
        metavar="<path>",
        help="Destination to download the current resource version signature. Default: .",
        type=str,
        default="",
        action=SingleUseAction,
    )
    def download_version_signature(self, args):  # noqa: D102
        try:
            self.api.download_version_signature(args.target, args.dest)
            self.printer.print_ok(f"Successfully downloaded signature for '{args.target}'.")
        except ResourceNotFoundException:
            raise ResourceNotFoundException(f"Resource '{args.target}' could not be found.") from None

    @CLICommand.command(
        name="public-key",
        help="Download the public key used to sign resources.",
        feature_tag=PUBLISH_TYPE,
    )
    @CLICommand.arguments(
        "--dest",
        metavar="<path>",
        help="Destination to download public key. Default: .",
        type=str,
        default="",
        action=SingleUseAction,
    )
    def public_key(self, args):  # noqa: D102
        self.api.get_public_key(args.dest)
        self.printer.print_ok(f"Successfully downloaded public key: {args.dest}/publicKey.pem.")
