#
# Copyright (c) 2020-2021, NVIDIA CORPORATION. All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto. Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import argparse
import logging
import time

from ngcbase.command.args_validation import (
    check_add_args_columns,
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
from ngcbase.errors import NgcException, ResourceNotFoundException
from ngcbase.util.utils import confirm_remove, get_columns_help, get_environ_tag
from registry.api.utils import ChartRegistryTarget
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
    UPDATE_TOS_HELP,
    validate_command_args,
    validate_parse_license_terms,
    VERSION_ONLY_HELP,
    VISIBILITY_HELP,
)
from registry.command.registry import RegistryCommand
from registry.data.registry.AccessTypeEnum import AccessTypeEnum
from registry.errors import ChartNotFoundException
from registry.printer.chart import ChartPrinter
from registry.printer.publish import PublishPrinter

logger = logging.getLogger(__name__)

PUBLISH_TYPE = ENABLE_TYPE if (get_environ_tag() <= CANARY_ENV) else DISABLE_TYPE
LICENSE_TERMS_FLAG = ENABLE_TYPE if (get_environ_tag() <= STAGING_ENV) else DISABLE_TYPE


class ChartSubCommand(RegistryCommand):  # noqa: D101
    CMD_NAME = "chart"
    HELP = "Helm Chart Commands"
    DESC = "Helm Chart Commands"
    CLI_HELP = ENABLE_TYPE

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.api = self.client.registry.chart
        self.resource_type = "HELM_CHART"
        self.publish_api = self.client.registry.publish
        self.printer = ChartPrinter(self.client.config)
        self.publish_printer = PublishPrinter(self.client.config)

    if CLICommand.CLI_CLIENT and bool(CLICommand.CLI_CLIENT.config.product_names):
        product_names = CLICommand.CLI_CLIENT.config.product_names
    else:
        product_names = PRODUCT_NAMES

    TARGET_HELP = "Chart or chart version. Format: org/[team/]chart_name[:version]."
    TARGET_VERSION_HELP = "Chart with version. Format: org/[team/]chart_name:version."

    LIST_HELP = "List charts."
    CREATE_TARGET_HELP = "Name of the chart to create. Format: org/[team/]chart_name."
    UPLOAD_TARGET_VERSION_HELP = (
        "Chart version. Format: org/[team/]chart_name:version. "
        "Alternative format using file name: org/[team/]chart_name-1.2.3.tgz"
    )
    # common chart and chart version attributes
    OVERVIEW_HELP = "Overview. Provide the path to a file that contains the overview for the chart."
    REMOVE_HELP = "Remove a chart from the repository."
    CREATE_VER_HELP = "Create a chart's metadata."
    ADD_LABEL_HELP = (
        "Label for the chart to add. Can be used multiple times."
        "Imperative label argument, not to be used with declarative label arguments --label or --label-set"
    )
    REMOVE_LABEL_HELP = (
        "Label for the chart to remove. Can be used multiple times."
        "Imperative label argument, not to be used with declarative label arguments --label or --label-set"
    )
    LABEL_HELP = (
        "Label for the chart to declare. Can be used multiple times."
        "Declarative label argument, not to be used with declarative label arguments —add-label or —remove-label"
    )
    LABEL_SET_HELP = (
        "Name of the label set for the chart to declare. Can be used multiple times. Format: org/[team/]name. "
        "Declarative label argument, not to be used with declarative label arguments —add-label or —remove-label"
    )
    LIST_TARGET_HELP = (
        "Filter the search by allowing wildcards for charts. "
        "Format: org/[team/]chart_name[:version]. "
        "To target charts use 'org/[team/]chart_name'. "
        "Both name and version support the wildcards '*' and '?'.  "
        "Version also supports character expressions ([a-z], [!ab], etc.). "
        "Examples:  'my_org/my_chart' - target my_chart in my_org repository. "
        "'my_org/my_team/my_chart' - target my_chart in my_org/my_team repository. "
        "'my_org/my_team/*' - target all charts in my_org/my_team repository. "
        "'my_org/my_chart*' "
        "- target all chart versions for my_chart in my_org namespace. "
        "'my_org/my_chart:[1-5]' "
        "- target versions 1-5 for my_chart in my_org namespace."
    )
    columns_dict = {
        "created": "Created",
        "createdBy": "Created By",
        "description": "Description",
        "displayName": "Display Name",
        "guestAccess": "Guest Access",
        "labels": "Labels",
        "name": "Name",
        "org": "Org",
        "public": "Public",
        "size": "Size",
        "team": "Team",
        "updated": "Last Modified",
        "version": "Version",
    }
    columns_default_chart = ("repository", "Repository")
    columns_default_version = ("artifactVersion", "Version")
    columns_help = get_columns_help(columns_dict, [columns_default_chart, columns_default_version])
    ACCESS_TYPE_LIST_HELP = "Filter the list of resources to only resources that have specified access type."
    PRODUCT_NAME_LIST_HELP = (
        "Filter the list of resources to only resources that are under the product name. Multiple product-name"
        f" arguments are allowed. Choose from: {', '.join(product_names)}"
    )

    # These are used for validating update arguments.
    chart_update_args = (
        "short_desc",
        "overview_filename",
        "built_by",
        "display_name",
        "label",
        "logo",
        "publisher",
        "label_set",
    )

    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help=LIST_TARGET_HELP,
        type=str,
        nargs="?",
        default=None,
    )
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
    @CLICommand.command(name="list", help=LIST_HELP, description=LIST_HELP)
    def list(self, args) -> None:
        """List charts/versions. Depending if version is provided."""
        crt = ChartRegistryTarget(args.target, glob_allowed=True)
        arg_cols = args.column if hasattr(args, "column") else None
        columns = self._col_translate(arg_cols) if arg_cols else None
        product_names_args = args.product_name if args.product_name else []

        if crt.version is None:
            check_add_args_columns(columns, ChartSubCommand.columns_default_chart)
            chart_list = self.api.list_charts(
                args.target, access_type=args.access_type, product_names=product_names_args
            )
            self.printer.print_chart_list(chart_list, columns=columns)

        else:
            # drew from legacy logic d31d2242e3256579dcdd706bc4cd1c41ec3a2f2d
            # has version_list | has main_chart | print output
            #     F            |        T/F     | empty
            #     T            |        F       | version_list
            #     T            |        T       | version_list + main_chart

            check_add_args_columns(columns, ChartSubCommand.columns_default_version)
            try:
                # unpack to esculate exceptions
                version_list = list(self.api.list_versions(args.target))
            except (ResourceNotFoundException, ChartNotFoundException):
                logger.debug("version list is empty")
                self.printer.print_chart_version_list([], columns=columns, main_chart=None)
                return None
            # should not merge these two because we still print version if main_chart is None
            try:
                main_chart_resp = self.api.list_charts(args.target)
                main_chart = list(main_chart_resp)[0][0]  # possible IndexError
            except IndexError:
                main_chart = None
                logger.debug("main chart index error, resp: %s", main_chart_resp)
            self.printer.print_chart_version_list(version_list, columns=columns, main_chart=main_chart)
        return None

    @staticmethod
    def _col_translate(columns):
        translate_table = {
            "org": "orgName",
            "team": "teamName",
            "created": "dateCreated",
            "updated": "dateModified",
            "public": "isPublic",
        }
        return [(translate_table.get(col, col), disp) for col, disp in columns]

    INFO_HELP = "Retrieve metadata for a chart or chart version."

    @CLICommand.command(name="info", help=INFO_HELP, description=INFO_HELP)
    @CLICommand.arguments("target", metavar="<target>", help=TARGET_HELP, type=str, default=None)
    @CLICommand.arguments(
        "--files",
        help="List files in addition to details for a version.",
        dest="list_files",
        action="store_true",
        default=False,
    )
    def info(self, args) -> None:
        """Retrieve metadata for a chart."""
        self.config.validate_configuration(guest_mode_allowed=True)
        crt = ChartRegistryTarget(args.target, org_required=True, name_required=True)

        # args.list_files:          True    |   False
        # name+ver:         chart+ver+files |   chart+ver
        # name:           ArgumentTypeError |   chart

        if crt.version is None and args.list_files:
            raise argparse.ArgumentTypeError(
                "--files argument is not valid for a chart target, please specify a version."
            )

        chart = self.api.info_chart(args.target)
        if crt.version is None:
            self.printer.print_chart(chart)
        else:
            version = self.api.info_chart_version(args.target)
            files = self.api.list_files(args.target) if args.list_files else None
            self.printer.print_chart_version(version=version, chart=chart, file_list=files)

    UPDATE_HELP = "Update a chart or chart version."

    @CLICommand.command(
        name="update",
        help=UPDATE_HELP,
        description=UPDATE_HELP,
        feature_tag=CONFIG_TYPE,
    )
    @CLICommand.arguments("target", metavar="<target>", help=CREATE_TARGET_HELP, type=str, default=None)
    @CLICommand.arguments(
        "--overview-filename",
        metavar="<path>",
        help=OVERVIEW_HELP,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--display-name",
        metavar="<dispName>",
        help="The name to display for the chart",
        type=str,
        default=None,
        action=SingleUseAction,
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
    @CLICommand.arguments(
        "--label",
        metavar="<label>",
        help=LABEL_HELP,
        type=str,
        default=None,
        action="append",
    )
    @CLICommand.arguments(
        "--label-set", metavar="<label-set>", help=LABEL_SET_HELP, action="append", type=str, default=None
    )
    @CLICommand.arguments(
        "--short-desc",
        metavar="<shortDesc>",
        help="A brief description of the chart",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--built-by",
        metavar="<builtBy>",
        help="The entity responsible for building the chart",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--publisher",
        metavar="<publisher>",
        help="The entity responsible for creating the chart",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--logo",
        metavar="<logo>",
        help="The URL of the image to set as the logo for the chart",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.mutex(["label", "label_set"], ["add_label", "remove_label"])
    def update(self, args):
        """Update a resource."""
        updated_chart = self.api.update(
            target=args.target,
            overview_filepath=args.overview_filename,
            display_name=args.display_name,
            labels=args.label,
            add_label=args.add_label,
            remove_label=args.remove_label,
            label_sets=args.label_set,
            logo=args.logo,
            publisher=args.publisher,
            built_by=args.built_by,
            short_description=args.short_desc,
        )
        self.printer.print_head(f"Successfully updated chart '{args.target}'")
        self.printer.print_chart(updated_chart)

    @CLICommand.command(
        name="remove",
        help=REMOVE_HELP,
        description=REMOVE_HELP,
        feature_tag=CONFIG_TYPE,
    )
    @CLICommand.arguments("target", metavar="<target>", help=TARGET_HELP, type=str, default=None)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    def remove(self, args):
        """Delete a chart from the repository."""
        self.config.validate_configuration()
        crt = ChartRegistryTarget(args.target, org_required=True, name_required=True)

        confirm_remove(printer=self.printer, target=args.target, default=args.default_yes)

        if crt.version is None:
            for version in self.api.list_versions(args.target):
                # we have to print on command layer and print for each version deleted
                # so exposing the version deletion logic here,
                # sdk user can call api.remove() directly
                # and in api layer, it follows the same removal logic
                versioned_target = args.target + ":" + version.id
                self.api.remove_chart_version(versioned_target)
                self.printer.print_ok("Successfully removed chart version '{}'.".format(versioned_target))

            self.api.remove_chart(args.target)
            self.printer.print_ok("Successfully removed chart '{}'.".format(args.target))
        else:
            self.api.remove_chart_version(args.target)
            self.printer.print_ok("Successfully removed chart version '{}'.".format(args.target))

    PULL_HELP = "Download a chart version."
    DL_TARGET_HELP = (
        "Chart version. Format: org/[team/]chart[:version]. "
        "If no version specified, the latest version will be targeted."
    )

    @CLICommand.command(name="pull", help=PULL_HELP, description=PULL_HELP)
    @CLICommand.arguments("target", metavar="<target>", help=DL_TARGET_HELP, type=str, default=None)
    @CLICommand.arguments(
        "--dest",
        metavar="<path>",
        help="Provide a destination to download the chart. Default: . (current directory)",
        type=str,
        default="",
        action=SingleUseAction,
    )
    def pull(self, args):
        """Download the specified chart."""
        crt = ChartRegistryTarget(args.target, org_required=True, name_required=True, version_required=False)
        if not crt.version:
            crt.version = self.api.get_latest_chart_version(args.target)
            args.target += f":{crt.version}"
            self.printer.print_ok(f"No version specified; downloading latest version: {crt.version}.")

        output_path = self.api.pull(args.target, args.dest)
        self.printer.print_ok(f"Successfully pulled chart version '{output_path}'.")

    def _get_latest_version(self, obj) -> str:
        target = "/".join(i for i in [obj.org, obj.team, obj.name] if i)
        try:
            chart = self.api.info_chart(target)
        except ResourceNotFoundException:
            raise ResourceNotFoundException("Target '{}' could not be found.".format(target)) from None
        if not chart.latestVersionId:
            raise NgcException("Target '{}' has no version available.".format(target))
        return chart.latestVersionId

    @CLICommand.command(
        name="create",
        help=CREATE_VER_HELP,
        description=CREATE_VER_HELP,
        feature_tag=CONFIG_TYPE,
    )
    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help=CREATE_TARGET_HELP,
        type=str,
        default=None,
    )
    @CLICommand.arguments(
        "--overview-filename",
        metavar="<path>",
        help=OVERVIEW_HELP,
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--display-name",
        metavar="<dispName>",
        help="The name to display for the chart",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments("--label", metavar="<label>", help=LABEL_HELP, type=str, default=None, action="append")
    @CLICommand.arguments(
        "--label-set", metavar="<label-set>", help=LABEL_SET_HELP, action="append", type=str, default=None
    )
    @CLICommand.arguments(
        "--short-desc",
        metavar="<shortDesc>",
        help="A brief description of the chart",
        type=str,
        default=None,
        required=True,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--built-by",
        metavar="<builtBy>",
        help="The entity responsible for building the chart",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--publisher",
        metavar="<publisher>",
        help="The entity responsible for creating the chart",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--logo",
        metavar="<logo>",
        help="The URL of the image to set as the logo for the chart",
        type=str,
        default=None,
        action=SingleUseAction,
    )
    def create(self, args):
        """Create a chart's metadata."""
        created_chart = self.api.create(
            target=args.target,
            short_description=args.short_desc,
            overview_filepath=args.overview_filename,
            display_name=args.display_name,
            labels=args.label,
            label_sets=args.label_set,
            logo=args.logo,
            publisher=args.publisher,
            built_by=args.built_by,
        )
        self.printer.print_head("Successfully created chart '{}'.".format(args.target))
        self.printer.print_chart(created_chart)

    UL_VER_HELP = "Push (upload) a chart."
    SOURCE_HELP = (
        "The path to the directory containing the packaged chart. "
        "If not specified, the chart will be uploaded from the current directory."
    )

    @CLICommand.command(
        name="push",
        help=UL_VER_HELP,
        description=UL_VER_HELP,
        feature_tag=CONFIG_TYPE,
    )
    @CLICommand.arguments(
        "target",
        metavar="<target>",
        help=UPLOAD_TARGET_VERSION_HELP,
        type=str,
        default=None,
    )
    @CLICommand.arguments(
        "--source",
        metavar="<path>",
        help=SOURCE_HELP,
        type=str,
        default=".",
        action=SingleUseAction,
    )
    @CLICommand.arguments(
        "--dry-run",
        help="List file paths, total upload size and file count without performing the upload.",
        action="store_true",
        default=False,
        dest="dry_run",
    )
    def push(self, args):
        """Upload a chart."""
        msgs = []
        self.api.push(args.target, args.source, is_dry_run=args.dry_run, cli_messages=msgs)
        for msg in msgs:
            self.printer.print_ok(msg)

        if not args.dry_run:
            retry = 1
            while retry <= 3:
                # push returns http code 201 without the artifact version, we need to poll with some delays/retries
                # to get the updated version
                try:
                    chart_version = self.api.info_chart_version(args.target)
                    self.printer.print_chart_version(chart_version)
                    return
                except ChartNotFoundException:
                    if retry == 3:
                        raise
                    time.sleep(1)
                    retry += 1

    chart_metavar = "org/[team/]chart[:version]"
    publish_help = (
        "Publish a chart from the NGC chart registry to catalog.  If no version is provided, the latest is assumed."
    )
    publish_target_help = (
        "The the target chart and version you want to publish to.  "
        "Optional when getting publishing status using the `--status` flag.  "
        f"Format: {chart_metavar}"
    )

    @CLICommand.command(
        name="update-license-terms", help=UPDATE_TOS_HELP, description=UPDATE_TOS_HELP, feature_tag=LICENSE_TERMS_FLAG
    )
    @CLICommand.arguments("target", metavar=chart_metavar, help=publish_target_help, type=str)
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
        self.api.update_license_terms(args.target, validate_parse_license_terms(args))
        if bool(args.clear):
            self.printer.print_ok("Successfully cleared license terms for chart '{}'.".format(args.target))
        else:
            self.printer.print_ok("Successfully updated license terms for chart '{}'.".format(args.target))

    source_arg_help = f"The source chart and version you want to publish.  Format: {chart_metavar}"
    metadata_help = "Only perform a shallow copy of the metadata instead of a deep copy of the objects referenced."
    allow_guest_help = "Open up permissions of the published object to be accessible by unauthenticated users."
    discoverable_help = "Open up permission of the publish object to be discoverable by searches."
    product_help = PRODUCT_HELP + ", ".join(product_names)

    @CLICommand.command(help=publish_help, description=publish_help, feature_tag=PUBLISH_TYPE)
    @CLICommand.arguments("target", metavar=chart_metavar, help=publish_target_help, type=str, nargs="?")
    @CLICommand.arguments("--source", metavar=chart_metavar, help=source_arg_help, type=str, default=None)
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
    @CLICommand.any_of(publish_action_args + publish_status_args)
    @CLICommand.mutex(["metadata_only"], ["version_only"], ["visibility_only"])
    @CLICommand.mutex(["access_type", "product_name"], ["allow_guest", "discoverable", "public"])
    @CLICommand.arguments(
        "--license-terms-file",
        metavar="<filename>",
        help=LICENSE_TERM_FILE_HELP,
        type=str,
        default=None,
        feature_tag=LICENSE_TERMS_FLAG,
    )
    @CLICommand.mutex(publish_action_args, publish_status_args)
    @CLICommand.arguments("--nspect-id", help=NSPECT_ID_HELP, type=str)
    def publish(self, args):  # noqa: D102
        validate_command_args(args)
        if args.status:
            status = self.publish_api.status(args.status)
            self.publish_printer.print_publishing_status(status)
            return
        license_terms_specs = validate_parse_license_terms(args)
        workflow_id = self.api.publish(
            getattr(args, "target", None),
            getattr(args, "source", None),
            getattr(args, "metadata_only", False),
            getattr(args, "version_only", False),
            getattr(args, "visibility_only", False),
            getattr(args, "allow_guest", False),
            getattr(args, "discoverable", False),
            getattr(args, "public", False),
            getattr(args, "access_type", None),
            getattr(args, "product_name", None),
            license_terms_specs,
            getattr(args, "nspect_id", None),
        )
        self.publish_printer.print_publishing_success(args.target, self.CMD_NAME, workflow_id)
