#
# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from argparse import ArgumentTypeError
from itertools import chain

from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_valid_columns,
    ReadFile,
    SingleUseAction,
)
from ngcbase.command.clicommand import CLICommand
from ngcbase.constants import (
    CANARY_ENV,
    CONFIG_TYPE,
    DISABLE_TYPE,
    ENABLE_TYPE,
    PRODUCT_NAMES,
)
from ngcbase.errors import NgcAPIError
from ngcbase.util.utils import confirm_remove, get_columns_help, get_environ_tag
from registry.api.collection_spec import CollectionSpecification
from registry.command.publish import (
    ACCESS_TYPE_HELP,
    ALLOW_GUEST_HELP,
    DISCOVERABLE_HELP,
    METADATA_HELP,
    PRODUCT_HELP,
    PUBLIC_HELP,
    validate_command_args,
    VISIBILITY_HELP,
)
from registry.command.registry import RegistryCommand
from registry.data.model.CollectionCategoryType import CollectionCategoryTypeEnum
from registry.data.registry.AccessTypeEnum import AccessTypeEnum
from registry.printer.collection import CollectionOutput, CollectionPrinter
from registry.printer.publish import PublishPrinter

PUBLISH_TYPE = ENABLE_TYPE if (get_environ_tag() <= CANARY_ENV) else DISABLE_TYPE


class CollectionSubCommand(RegistryCommand):  # noqa: D101
    CMD_NAME = "collection"
    HELP = "Collection Commands"
    DESC = "Collection Commands"
    CLI_HELP = ENABLE_TYPE

    collection_metavar = "org/[team/]collection_name"

    # Info help
    collection_target_arg_help = f"Collection. Format: {collection_metavar}."

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.printer = CollectionPrinter(self.client.config)
        self.publish_printer = PublishPrinter(self.client.config)

        self.config = self.client.config
        self.collection_api = self.client.registry.collection
        self.label_set_api = self.client.registry.label_set
        self.search_api = self.client.registry.search
        self.publish_api = self.client.registry.publish
        self.resource_type = "COLLECTION"

    if CLICommand.CLI_CLIENT and bool(CLICommand.CLI_CLIENT.config.product_names):
        product_names = CLICommand.CLI_CLIENT.config.product_names
    else:
        product_names = PRODUCT_NAMES

    CREATE_HELP = "Create a collection."
    collection_create_arg_help = "Collection to create.  Format: Org/[team/]name."
    create_display_arg_help = "Human-readable name for the collection."
    create_format_arg_help = "Format of the collection."
    ADD_LABEL_HELP = (
        "Label for the collection to add. Can be used multiple times."
        "Imperative label argument, not to be used with declarative label arguments --label or --label-set"
    )
    REMOVE_LABEL_HELP = (
        "Label for the collection to remove. Can be used multiple times."
        "Imperative label argument, not to be used with declarative label arguments --label or --label-set"
    )
    LABEL_HELP = (
        "Label for the collection to declare. Can be used multiple times."
        "Declarative label argument, not to be used with declarative label arguments —add-label or —remove-label"
    )
    LABEL_SET_HELP = (
        "Name of the label set for the collection to declare. Can be used multiple times. Format: org/[team/]name. "
        "Declarative label argument, not to be used with declarative label arguments —add-label or —remove-label"
    )
    create_logo_arg_help = "A link to the logo for the collection."
    create_overview_arg_help = "A markdown file with an overview of the collection."
    create_owner_arg_help = "Name of the owner of this collection."
    create_publisher_arg_help = "The publishing organization."
    create_shortdesc_arg_help = "A brief description of the collection."
    create_image_arg_help = (
        "Name of an image to include in the collection.  Can be used multiple times.  Format: org/[team/]name."
    )
    create_model_arg_help = (
        "Name of a model to include in the collection.  Can be used multiple times.  Format: org/[team/]name."
    )
    create_resource_arg_help = (
        "Name of a resource to include in the collection.  Can be used multiple times.  Format: org/[team/]name."
    )
    create_chart_arg_help = (
        "Name of a chart to include in the collection.  Can be used multiple times.  Format: org/[team/]name."
    )
    category_choices = CollectionCategoryTypeEnum
    create_category_arg_help = f"Field for describing collection's use case. Choices are: {', '.join(category_choices)}"

    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP, feature_tag=CONFIG_TYPE)
    @CLICommand.arguments("target", metavar="<target>", help=collection_create_arg_help, type=str, default=None)
    @CLICommand.arguments(
        "--display-name", metavar="<name>", help=create_display_arg_help, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments("--label-set", metavar="<label-set>", help=LABEL_SET_HELP, type=str, action="append")
    @CLICommand.arguments("--label", metavar="<label>", help=LABEL_HELP, type=str, action="append")
    @CLICommand.arguments(
        "--logo", metavar="<logo>", help=create_logo_arg_help, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--overview-filename", metavar="<path>", help=create_overview_arg_help, type=str, action=ReadFile, default=""
    )
    @CLICommand.arguments(
        "--built-by", metavar="<name>", help=create_owner_arg_help, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--publisher",
        metavar="<publisher>",
        help=create_publisher_arg_help,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--short-desc",
        metavar="<desc>",
        help=create_shortdesc_arg_help,
        type=str,
        required=True,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--add-image", metavar="<image>", help=create_image_arg_help, action="append", dest="images", default=[]
    )
    @CLICommand.arguments(
        "--add-model", metavar="<model>", help=create_model_arg_help, action="append", dest="models", default=[]
    )
    @CLICommand.arguments(
        "--add-resource",
        metavar="<resource>",
        help=create_resource_arg_help,
        action="append",
        dest="resources",
        default=[],
    )
    @CLICommand.arguments(
        "--add-chart", metavar="<chart>", help=create_chart_arg_help, action="append", dest="charts", default=[]
    )
    @CLICommand.arguments(
        "--category",
        metavar="<category>",
        help=create_category_arg_help,
        type=str.upper,
        required=True,
        action=SingleUseAction,
        choices=category_choices,
    )
    def create(self, args):
        """Create a collection."""
        collection_specs = CollectionSpecification(
            args.target,
            args.display_name,
            args.label_set,
            args.label,
            args.logo,
            args.overview_filename,
            args.built_by,
            args.publisher,
            args.short_desc,
            args.category,
        )
        (collection_response, artifacts_response, errors) = self.collection_api.create(
            collection_specs,
            args.images,
            args.charts,
            args.models,
            args.resources,
        )

        self.printer.print_collection_create_results(collection_response.collection, artifacts_response, errors)
        for _, error_list in errors.items():
            if error_list:
                raise NgcAPIError("Create encountered errors.")

    INFO_HELP = "Display information about a collection in the registry."

    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    @CLICommand.arguments("target", metavar="<target>", help=collection_target_arg_help, type=str, default=None)
    def info(self, args):
        """Get information about a collection."""
        try:
            response = self.collection_api.info(args.target)
            self.printer.print_collection_info(response.collection, response.artifacts)
        except (ValueError, ArgumentTypeError) as e:
            self.printer.print_error(e)

    LIST_HELP = "Display a list of available collections in the registry."
    collection_list_arg_help = (
        "Filter the search by allowing wildcards for Collection(s). "
        f"Format: {collection_metavar}. "
        f'To target Collection(s), use "{collection_metavar}". '
        'Org, team, and name support the wildcards "*" and "?". '
        'Examples:  "my_org/my_collection" - target my_collection in my_org namespace. '
        '"my_org/my_team/my_collection" - target my_collection in my_org/my_team namespace. '
        '"my_org/my_team/*" - target all collections in my_org/my_team namespace. '
        '"my_org/my_collection*" - target collections starting with my_collection in my_org namespace. '
    )
    columns_dict = CollectionOutput.PROPERTY_HEADER_MAPPING
    column_default = ("name", "Name")
    columns_help = get_columns_help(columns_dict, column_default)
    ACCESS_TYPE_LIST_HELP = "Filter the list of collections to only collections that have specified access type."
    PRODUCT_NAME_LIST_HELP = (
        "Filter the list of collections to only resources that are under the product name. Multiple product-name"
        f" arguments are allowed. Choose from: {', '.join(product_names)}"
    )

    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    @CLICommand.arguments(
        "target", metavar="<target>", help=collection_list_arg_help, type=str, nargs="?", default=None
    )
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
    def list(self, args):
        """List collections."""
        product_names_args = args.product_name if args.product_name else []

        pages_gen = self.collection_api.list(
            args.target, access_type=args.access_type, product_names=product_names_args
        )
        check_add_args_columns(args.column, CollectionSubCommand.column_default)
        self.printer.print_collection_list(pages_gen, args.column)

    UPDATE_HELP = "Update a collection."

    collection_remove_image_help = "An image to be removed from the collection."
    collection_remove_model_help = "A model to be removed from the collection."
    collection_remove_resource_help = "A resource to be removed from the collection."
    collection_remove_chart_help = "A chart to be removed from the collection."

    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP, feature_tag=CONFIG_TYPE)
    @CLICommand.arguments("target", metavar="<target>", help=collection_create_arg_help, type=str, default=None)
    @CLICommand.arguments(
        "--display-name", metavar="<name>", help=create_display_arg_help, type=str, default=None, action=SingleUseAction
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
    @CLICommand.arguments("--label-set", metavar="<label-set>", help=LABEL_SET_HELP, type=str, action="append")
    @CLICommand.arguments("--label", metavar="<label>", help=LABEL_HELP, type=str, action="append")
    @CLICommand.arguments(
        "--logo", metavar="<logo<", help=create_logo_arg_help, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--overview-filename", metavar="<path>", help=create_overview_arg_help, type=str, action=ReadFile, default=None
    )
    @CLICommand.arguments(
        "--built-by", metavar="<name>", help=create_owner_arg_help, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--publisher",
        metavar="<publisher>",
        help=create_publisher_arg_help,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--short-desc", metavar="<desc>", help=create_shortdesc_arg_help, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--add-image", metavar="<image>", help=create_image_arg_help, action="append", dest="add_images", default=[]
    )
    @CLICommand.arguments(
        "--add-model", metavar="<model>", help=create_model_arg_help, action="append", dest="add_models", default=[]
    )
    @CLICommand.arguments(
        "--add-resource",
        metavar="<resource>",
        help=create_resource_arg_help,
        action="append",
        dest="add_resources",
        default=[],
    )
    @CLICommand.arguments(
        "--add-chart", metavar="<chart>", help=create_chart_arg_help, action="append", dest="add_charts", default=[]
    )
    @CLICommand.arguments(
        "--category",
        metavar="<category>",
        help=create_category_arg_help,
        type=str.upper,
        action=SingleUseAction,
        choices=category_choices,
    )
    @CLICommand.arguments(
        "--remove-image",
        metavar="<image>",
        help=collection_remove_image_help,
        action="append",
        default=[],
        dest="remove_images",
    )
    @CLICommand.arguments(
        "--remove-model",
        metavar="<model>",
        help=collection_remove_model_help,
        action="append",
        default=[],
        dest="remove_models",
    )
    @CLICommand.arguments(
        "--remove-resource",
        metavar="<resource>",
        help=collection_remove_resource_help,
        action="append",
        default=[],
        dest="remove_resources",
    )
    @CLICommand.arguments(
        "--remove-chart",
        metavar="<chart>",
        help=collection_remove_chart_help,
        action="append",
        default=[],
        dest="remove_charts",
    )
    @CLICommand.mutex(["label", "label_set"], ["add_label", "remove_label"])
    def update(self, args):
        """Update a collection."""
        collection_specs = CollectionSpecification(
            args.target,
            args.display_name,
            args.label_set,
            args.label,
            args.logo,
            args.overview_filename,
            args.built_by,
            args.publisher,
            args.short_desc,
            args.category,
        )
        (collection_response, add_errors, remove_errors) = self.collection_api.update(
            collection_specs,
            args.add_label,
            args.remove_label,
            args.add_images,
            args.add_charts,
            args.add_models,
            args.add_resources,
            args.remove_images,
            args.remove_charts,
            args.remove_models,
            args.remove_resources,
        )

        # An info call on all artifacts is necessary because adds/removes may not encompass other artifacts that exist.
        # This duplicates the collection info call but can be optimized later
        self.info(args)
        self.printer.print_artifact_put_errors(add_errors, collection_response.collection.name)
        self.printer.print_artifact_delete_errors(remove_errors, collection_response.collection.name)

        for _, error_list in chain(add_errors.items(), remove_errors.items()):
            if error_list:
                raise NgcAPIError("Update encountered errors.")

    SHARE_HELP = "Share a collection with a team or org. If a team is set, it will be shared with that team by default."

    REMOVE_HELP = "Remove a collection."
    remove_target_arg_help = f"Collection to remove. Format: {collection_metavar}"
    remove_yes_arg_help = "Automatically confirm removal to interactive prompts."

    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP, feature_tag=CONFIG_TYPE)
    @CLICommand.arguments("target", metavar="<target>", help=remove_target_arg_help, type=str)
    @CLICommand.arguments("-y", "--yes", help=remove_yes_arg_help, dest="default_yes", action="store_true")
    def remove(self, args):
        """Remove a collection."""
        confirm_remove(printer=self.printer, target=args.target, default=args.default_yes)
        _ = self.collection_api.remove(args.target)
        self.printer.print_ok(f"Successfully removed collection '{args.target}'.")

    FIND_HELP = "Get a list of collections containing the specified artifact."
    find_artifact_choices = ["MODEL", "CHART", "RESOURCE", "IMAGE"]
    find_artifact_type = f"Type of artifact to look for.  Choices: {', '.join(find_artifact_choices)}"
    find_artifact_target = "Target artifact to look for.  Format: org/[team/]artifact_name."

    @CLICommand.command(help=FIND_HELP, description=FIND_HELP)
    @CLICommand.arguments(
        "artifact_type",
        metavar="<artifact_type>",
        help=find_artifact_type,
        type=str.upper,
        choices=find_artifact_choices,
    )
    @CLICommand.arguments("artifact_target", metavar="<artifact_target>", help=find_artifact_target)
    def find(self, args):
        """Get a list of collections containing the specified artifact."""
        collections = self.collection_api.find(args.artifact_target, args.artifact_type)
        self.printer.print_collection_list([collections])

    publish_help = "Publish a collection from the NGC private registry to catalog."
    source_help = f"The source collection you want to publish. Format: {collection_metavar}"
    allow_guest_help = "Open up permissions of the published object to be accessible by unauthenticated users."
    discoverable_help = "Open up permission of the publish object to be discoverable by searches."

    @CLICommand.command(help=publish_help, description=publish_help, feature_tag=PUBLISH_TYPE)
    @CLICommand.arguments("target", metavar=collection_metavar, help=collection_target_arg_help, type=str)
    @CLICommand.arguments("--source", metavar=collection_metavar, help=source_help, type=str, default=None)
    @CLICommand.arguments("--allow-guest", help=ALLOW_GUEST_HELP, action="store_true", default=False)
    @CLICommand.arguments("--discoverable", help=DISCOVERABLE_HELP, action="store_true", default=False)
    @CLICommand.arguments("--public", help=PUBLIC_HELP, action="store_true", default=False)
    @CLICommand.arguments("--metadata-only", help=METADATA_HELP, action="store_true", default=False)
    @CLICommand.arguments("--visibility-only", help=VISIBILITY_HELP, action="store_true", default=False)
    @CLICommand.arguments(
        "--access-type", metavar="<access_type>", help=ACCESS_TYPE_HELP, type=str, default=None, choices=AccessTypeEnum
    )
    @CLICommand.arguments(
        "--product-name",
        metavar="<product_name>",
        help=PRODUCT_HELP + ", ".join(product_names),
        action="append",
        default=None,
    )
    @CLICommand.mutex(["metadata_only"], ["visibility_only"])
    @CLICommand.mutex(["access_type", "product_name"], ["allow_guest", "discoverable", "public"])
    def publish(self, args):  # noqa: D102
        validate_command_args(args)
        # collection does not have async workflow
        # it is just a metadata linking artifacts
        # so no status checking is needed.
        self.collection_api.publish(
            args.target,
            args.source,
            args.metadata_only,
            args.visibility_only,
            args.allow_guest,
            args.discoverable,
            args.public,
            args.access_type,
            args.product_name,
        )
        self.publish_printer.print_publishing_success(args.target, self.CMD_NAME)
