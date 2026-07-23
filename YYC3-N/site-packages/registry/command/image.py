#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import logging

from docker.errors import ImageNotFound

from ngcbase.command.args_validation import (
    check_add_args_columns,
    check_url,
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
    STAGING_ENV,
)
from ngcbase.errors import NgcException
from ngcbase.util.utils import contains_glob, get_columns_help, get_environ_tag
from registry.api.utils import ImageRegistryTarget
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
from registry.data.registry.RepositoryImageDetailsList import RepositoryImageDetailsList
from registry.printer.image import ImagePrinter
from registry.printer.publish import PublishPrinter

logger = logging.getLogger(__name__)

IMAGE_METAVAR_TAGS = "<org>/[<team>/]<image>[:<tags>]"
IMAGE_METAVAR = "<org>/[<team>/]<image>[:<tag>]"
IMAGE_METAVAR_REQ_TAG = "<org>/[<team>/]<image>:<tag>"
IMAGE_CREATE_METAVAR = "<org>/[<team>/]<image>"

PUBLISH_TYPE = ENABLE_TYPE if (get_environ_tag() <= CANARY_ENV) else DISABLE_TYPE
PUBLICKEY_TYPE = ENABLE_TYPE if (get_environ_tag() < CANARY_ENV) else DISABLE_TYPE
LICENSE_TERMS_FLAG = ENABLE_TYPE if (get_environ_tag() <= STAGING_ENV) else DISABLE_TYPE


def get_architectures(image_obj, tag):
    """Return a list of an image's `architectureVariants` that can be used to get details about an image."""
    if isinstance(image_obj, RepositoryImageDetailsList):
        image_obj = image_obj.toDict()
    images = image_obj.get("images", [])
    if not images:
        # No architecture information
        return []
    image = [img for img in images if img["tag"] == tag]
    if image:
        return image[0].get("architectureVariants", [])
    return []


class ImageCommand(RegistryCommand):  # noqa: D101
    CMD_NAME = "image"
    HELP = "Container Image Registry Commands"
    DESC = "Container Image Registry Commands"

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.client = self.client.registry
        self.label_set_api = self.client.label_set
        self.publish_api = self.client.publish
        self.resource_type = "CONTAINER"
        self.image_printer = ImagePrinter(self.client.config)
        self.publish_printer = PublishPrinter(self.client.config)

    if CLICommand.CLI_CLIENT and bool(CLICommand.CLI_CLIENT.config.product_names):
        product_names = CLICommand.CLI_CLIENT.config.product_names
    else:
        product_names = PRODUCT_NAMES

    LIST_HELP = "List container images accessible by the user."

    PATTERN_ARG_HELP = "Filter the search by allowing the wildcards '*' and '?'. "

    LIST_PATTERN_ARG_HELP = (
        PATTERN_ARG_HELP + "In order to list all the tags for <image>, pattern should be `<org>/[<team>/]<image>:*`.\n"
        'Examples:  "my_org/my_image" - target my_image in my_org namespace.  '
        '"my_org/my_team/my_image" - target my_image in my_org/my_team namespace.  '
        '"my_org/my_team/*" - target all images in my_org/my_team namespace.  '
        '"my_org/my_image*" - target images starting with my_image in my_org namespace.  '
        '"my_org/my_image:[1-5]" - target versions 1-5 for my_image in my_org namespace.'
    )
    ACCESS_TYPE_LIST_HELP = "Filter the list of resources to only resources that have specified access type."
    PRODUCT_NAME_LIST_HELP = (
        "Filter the list of resources to only resources that are under the product name. Multiple flags supported."
        f" Choose from: {', '.join(product_names)}"
    )

    columns_dict = {
        "created": "Created Date",
        "description": "Description",
        "name": "Name",
        "org": "Org",
        "permission": "Permission",
        "shared": "Shared",
        "size": "Image Size",
        "tag": "Latest Tag",
        "team": "Team",
        "updated": "Updated Date",
        "labels": "Labels",
        "signed": "Signed Tag?",
    }
    columns_default_image = ("repository", "Repository")
    columns_default_version = ("tag", "Tag")
    columns_help = get_columns_help(columns_dict, [columns_default_image, columns_default_version])

    @CLICommand.command(help=LIST_HELP, description=LIST_HELP)
    @CLICommand.arguments("pattern", nargs="?", metavar=IMAGE_METAVAR_TAGS, help=LIST_PATTERN_ARG_HELP, type=str)
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
        "--signed", action="store_true", help="Show only container images that are signed", default=False
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
    def list(self, args):  # noqa: D102
        irt = ImageRegistryTarget(args.pattern)
        repo_matcher = "/".join([f for f in [irt.org, irt.team, irt.image] if f]) or "*"
        product_names_args = args.product_name if args.product_name else []
        resp = self.client.image.list(
            pattern=args.pattern, signed=args.signed, access_type=args.access_type, product_names=product_names_args
        )

        if contains_glob(repo_matcher) and not irt.tag:
            # Only print the the repo search and the tag is not included
            check_add_args_columns(args.column, ImageCommand.columns_default_image)
            self.image_printer.print_repo_list(resp, columns=args.column)
        else:
            check_add_args_columns(args.column, ImageCommand.columns_default_image)
            self.image_printer.print_image_list(resp, columns=args.column)

    REMOVE_HELP = "Remove an image repository or specific image with an image tag."

    @CLICommand.command(help=REMOVE_HELP, description=REMOVE_HELP, feature_tag=CONFIG_TYPE)
    @CLICommand.arguments("pattern", metavar=IMAGE_METAVAR_TAGS, help=PATTERN_ARG_HELP, type=str)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    def remove(self, args):  # noqa: D102
        self.client.image.remove(pattern=args.pattern, default_yes=args.default_yes)

    INFO_HELP = "Display information about an image repository or tagged image."
    IMAGE_ARG_HELP = "Name of the image repository or tagged image."
    LAYERS_ARG_HELP = "Show the layers of a tagged image."
    HISTORY_ARG_HELP = "Show the history of a tagged image."
    DETAILS_ARG_HELP = "Show the details of an image repository."
    SCAN_ARG_HELP = "Show the scan details of a tagged image. If no tag is provided, the most recent tag is used."

    @CLICommand.command(help=INFO_HELP, description=INFO_HELP)
    @CLICommand.arguments("image", metavar=IMAGE_METAVAR, help=IMAGE_ARG_HELP, type=str)
    @CLICommand.arguments("--layers", help=LAYERS_ARG_HELP, action="store_true")
    @CLICommand.arguments("--history", help=HISTORY_ARG_HELP, action="store_true")
    @CLICommand.arguments("--details", help=DETAILS_ARG_HELP, action="store_true")
    @CLICommand.arguments("--scan", help=SCAN_ARG_HELP, action="store_true")
    @CLICommand.mutex(["layers", "details"], ["history"])
    def info(self, args):  # noqa: D102
        info = self.client.image.info(
            image=args.image,
            layers=args.layers,
            history=args.history,
            details=args.details,
            scan=args.scan,
        )
        if not ImageRegistryTarget(args.image).tag:
            assert len(info) == 2
            repo_info, scan_info = info
            scan_info = None
            self.image_printer.print_repo_info(repo_info, scan_info, show_details=args.details)
        else:
            assert len(info) == 4
            image_metadata, image_manifest, scan_details, arch_details = info
            if args.history:
                self.image_printer.print_image_history(image_manifest)
            self.image_printer.print_image_details(
                image_metadata, image_manifest, scan_details, arch_details, show_layers=args.layers, show_scan=args.scan
            )

    PULL_HELP = "Pull a container image from the NGC image registry. If no tag is provided, 'latest' is assumed."
    SCAN_ARG_HELP = (
        "Download the image scan report as a CSV file instead of pulling the image. If no tag is "
        "provided, 'latest' is assumed."
    )
    SCAN_FILE_METAVAR = "<file>"
    # pylint:disable=inconsistent-return-statements

    @CLICommand.command(help=PULL_HELP, description=PULL_HELP)
    @CLICommand.arguments("image", metavar=IMAGE_METAVAR, help=IMAGE_ARG_HELP, type=str)
    @CLICommand.arguments("--scan", metavar=SCAN_FILE_METAVAR, help=SCAN_ARG_HELP, type=str, default="")
    def pull(self, args):  # noqa: D102
        self.config.validate_configuration(guest_mode_allowed=True)
        irt = ImageRegistryTarget(args.image)
        # Mimic docker CLI's default tag of 'latest' if not specified
        if irt.tag is None:
            _image, _ = self.client.image.info(args.image)
            irt.tag = _image.latestTag
            if not irt.tag:
                raise AttributeError(f"Image {args.image} does not have a latest tag.")
            self.image_printer.print_ok(f"No tag specified for image '{args.image}', using tag: '{irt.tag}'")

        self.client.image.pull(image=str(irt), scan=args.scan)

    ADD_LABEL_HELP = (
        "Label for the repository to add. Can be used multiple times."
        "Imperative label argument, not to be used with declarative label arguments --label or --label-set"
    )
    REMOVE_LABEL_HELP = (
        "Label for the repository to remove. Can be used multiple times."
        "Imperative label argument, not to be used with declarative label arguments --label or --label-set"
    )
    LABEL_HELP = (
        "Label for the repository to declare. Can be used multiple times."
        "Declarative label argument, not to be used with declarative label arguments —add-label or —remove-label"
    )
    LABEL_SET_HELP = (
        "Name of the label set for the repository to declare. Can be used multiple times. Format: org/[team/]name. "
        "Declarative label argument, not to be used with declarative label arguments —add-label or —remove-label"
    )
    DESC_HELP = "Description for the target image."
    OVERVIEW_HELP = "Documentation (text or markdown file) for the image."
    LOGO_HELP = "A URL pointing to the logo for the repository."
    PUBLISHER_HELP = "The person or entity publishing the image."
    BUILT_BY_HELP = "The person who built the container image."
    DISPLAY_NAME_HELP = "Different name to display for the image."
    DISPLAY_NAME_METAVAR = "<name>"

    UPDATE_HELP = "Update image repository metadata"

    @CLICommand.command(help=UPDATE_HELP, description=UPDATE_HELP, feature_tag=CONFIG_TYPE)
    @CLICommand.arguments("--desc", metavar="<desc>", help=DESC_HELP, type=str, default=None, action=SingleUseAction)
    @CLICommand.arguments(
        "--overview", metavar="<file.md>", help=OVERVIEW_HELP, type=str, default=None, action=ReadFile
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
    @CLICommand.arguments("--label", metavar="<label>", help=LABEL_HELP, type=str, default=None, action="append")
    @CLICommand.arguments(
        "--label-set", metavar="<label-set>", help=LABEL_SET_HELP, action="append", type=str, default=None
    )
    @CLICommand.arguments(
        "--logo", metavar="<url>", help=LOGO_HELP, type=check_url, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--publisher", metavar="<publisher>", help=PUBLISHER_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--built-by", metavar="<name>", help=BUILT_BY_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--display-name", metavar=DISPLAY_NAME_METAVAR, help=DISPLAY_NAME_HELP, default=None, action=SingleUseAction
    )
    @CLICommand.arguments("--multinode", help="Marks an image as supporting multinode.", action="store_true")
    @CLICommand.arguments("--no-multinode", help="Marks an image as not supporting multinode.", action="store_true")
    @CLICommand.arguments("image", metavar=IMAGE_METAVAR, help=IMAGE_ARG_HELP, type=str)
    @CLICommand.mutex(["multinode"], ["no_multinode"])
    @CLICommand.mutex(["label", "label_set"], ["add_label", "remove_label"])
    def update(self, args):  # noqa: D102
        self.image_printer.print_ok("Updating repository metadata")
        self.client.image.update(
            image=args.image,
            desc=args.desc,
            overview=args.overview,
            labels=args.label,
            add_label=args.add_label,
            remove_label=args.remove_label,
            label_set=args.label_set,
            logo=args.logo,
            publisher=args.publisher,
            built_by=args.built_by,
            multinode=True if args.multinode else None,
            no_multinode=True if args.no_multinode else None,
            display_name=args.display_name,
        )
        self.image_printer.print_ok("Repository metadata updated.")

    SET_LATEST_HELP = "Set the specified tag as the latest tag of the repository."

    @CLICommand.command(name="set-latest", help=SET_LATEST_HELP, description=SET_LATEST_HELP)
    @CLICommand.arguments("image", metavar=IMAGE_METAVAR_REQ_TAG, help="Target image tag to set as latest.", type=str)
    def set_latest(self, args):  # noqa: D102
        self.client.image.set_latest_tag(image=args.image)
        self.image_printer.print_ok(f"Successfully set tag '{args.image}' as latest.")

    PUSH_HELP = "Push a container image to the NGC image registry. If no tag is provided, 'latest' is assumed."

    @CLICommand.command(help=PUSH_HELP, description=PUSH_HELP, feature_tag=CONFIG_TYPE)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to tagging the image if not already tagged in correct format.",
        dest="default_yes",
        action="store_true",
    )
    @CLICommand.arguments("--desc", metavar="<desc>", help=DESC_HELP, type=str, default=None, action=SingleUseAction)
    @CLICommand.arguments(
        "--overview", metavar="<file.md>", help=OVERVIEW_HELP, type=str, default=None, action=ReadFile
    )
    @CLICommand.arguments("--label", metavar="<label>", help=LABEL_HELP, type=str, default=None, action="append")
    @CLICommand.arguments(
        "--label-set", metavar="<label-set>", help=LABEL_SET_HELP, action="append", type=str, default=None
    )
    @CLICommand.arguments(
        "--logo", metavar="<url>", help=LOGO_HELP, type=check_url, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--publisher", metavar="<publisher>", help=PUBLISHER_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--built-by", metavar="<name>", help=BUILT_BY_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments("--multinode", help="Marks an image as supporting multinode.", action="store_true")
    @CLICommand.arguments(
        "--display-name", metavar=DISPLAY_NAME_METAVAR, help=DISPLAY_NAME_HELP, default=None, action=SingleUseAction
    )
    @CLICommand.arguments("image", metavar=IMAGE_METAVAR, help=IMAGE_ARG_HELP, type=str)
    def push(self, args):  # noqa: D102
        self.client.image.push(
            image=args.image,
            desc=args.desc,
            overview=args.overview,
            label=args.label,
            label_set=args.label_set,
            logo=args.logo,
            publisher=args.publisher,
            built_by=args.built_by,
            multinode=True if args.multinode else None,
            display_name=args.display_name,
            default_yes=args.default_yes,
            output=True,
        )

    CREATE_HELP = "Create a top level metadata repository in the NGC image registry."
    IMAGE_CREATE_ARG_HELP = "Name of the image repository."

    @CLICommand.command(help=CREATE_HELP, description=CREATE_HELP, feature_tag=CONFIG_TYPE)
    @CLICommand.arguments("--desc", metavar="<desc>", help=DESC_HELP, type=str, default=None, action=SingleUseAction)
    @CLICommand.arguments(
        "--overview", metavar="<file.md>", help=OVERVIEW_HELP, type=str, default=None, action=ReadFile
    )
    @CLICommand.arguments("--label", metavar="<label>", help=LABEL_HELP, type=str, default=None, action="append")
    @CLICommand.arguments(
        "--label-set", metavar="<label-set>", help=LABEL_SET_HELP, action="append", type=str, default=None
    )
    @CLICommand.arguments(
        "--logo", metavar="<url>", help=LOGO_HELP, type=check_url, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--publisher", metavar="<publisher>", help=PUBLISHER_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments(
        "--built-by", metavar="<name>", help=BUILT_BY_HELP, type=str, default=None, action=SingleUseAction
    )
    @CLICommand.arguments("--multinode", help="Marks an image as supporting multinode.", action="store_true")
    @CLICommand.arguments(
        "--display-name", metavar=DISPLAY_NAME_METAVAR, help=DISPLAY_NAME_HELP, default=None, action=SingleUseAction
    )
    @CLICommand.arguments("image", metavar=IMAGE_CREATE_METAVAR, help=IMAGE_CREATE_ARG_HELP, type=str)
    def create(self, args):
        """Create an empty repository."""
        resp = self.client.image.create(
            image=args.image,
            desc=args.desc,
            overview=args.overview,
            label=args.label,
            label_set=args.label_set,
            logo=args.logo,
            publisher=args.publisher,
            built_by=args.built_by,
            multinode=True if args.multinode else None,
            display_name=args.display_name,
        )
        self.image_printer.print_repo_info(resp, None)

    SCAN_HELP = "Scan a container image from the NGC image registry."

    @CLICommand.command(help=SCAN_HELP, description=SCAN_HELP)
    @CLICommand.arguments("pattern", nargs="?", metavar=IMAGE_METAVAR_REQ_TAG, help=LIST_PATTERN_ARG_HELP, type=str)
    def scan(self, args):  # noqa: D102
        self.config.validate_configuration(guest_mode_allowed=True)
        irt = ImageRegistryTarget(args.pattern)
        # Mimic docker CLI's default tag of 'latest' if not specified
        if irt.tag is None:
            _image, _ = self.client.image.info(args.pattern)
            irt.tag = _image.latestTag
            if not irt.tag:
                raise AttributeError(f"Image {args.pattern} does not have a latest tag.")
            self.image_printer.print_ok(f"No tag specified for image '{args.pattern}', using tag: '{irt.tag}'")

        tag_digests = self.client.image.get_digest_for_tag(irt.org, irt.team, irt.image, irt.tag)
        logger.debug("Tag %s has %s architecture(s)", irt.tag, len(tag_digests))

        for arch_type, digest in tag_digests.items():
            try:
                self.client.image.start_digest_scan(irt.org, irt.team, irt.image, irt.tag, digest)
                self.image_printer.print_ok(f"Scan for image '{irt.image}:{irt.tag} - {arch_type}' has been started.")
            except (ImageNotFound, NgcException) as e:
                self.image_printer.print_error(f"Could not scan image for architecture '{arch_type}': {e}")
                continue

    PUBLICKEY_HELP = "Return the public key used to sign images for local validation."

    @CLICommand.command(help=PUBLICKEY_HELP, description=PUBLICKEY_HELP, feature_tag=PUBLICKEY_TYPE)
    def publickey(self, args):  # pylint: disable=unused-argument  # noqa: D102
        self.config.validate_configuration(guest_mode_allowed=True)
        key = self.client.image.get_publickey()
        self.image_printer.print_publickey(key)

    image_metavar = "org/[team/]image_name[:version]"
    publish_help = (
        "Publish an image from the NGC image registry to catalog.  If no version is provided, 'latest' is assumed."
    )
    publish_target_help = (
        "The target image and version you want to publish to.  "
        "Optional when getting publishing status using the `--status` flag.  "
        f"Format: {image_metavar}"
    )
    source_help = f"The source image and version you want to publish.  Format: {image_metavar}"
    metadata_help = "Only perform a shallow copy of the metadata instead of a deep copy of the objects referenced."
    allow_guest_help = "Open up permissions of the published object to be accessible by unauthenticated users."
    discoverable_help = "Open up permission of the publish object to be discoverable by searches."
    sign_help = "Have the published image cryptographically signed by NVIDIA."
    product_help = PRODUCT_HELP + ", ".join(product_names)

    @CLICommand.command(help=publish_help, description=publish_help, feature_tag=PUBLISH_TYPE)
    @CLICommand.arguments("target", nargs="?", metavar=image_metavar, help=publish_target_help, type=str)
    @CLICommand.arguments("--source", metavar=image_metavar, help=source_help, type=str, default=None)
    @CLICommand.arguments("--metadata-only", help=METADATA_HELP, action="store_true")
    @CLICommand.arguments("--version-only", help=VERSION_ONLY_HELP, action="store_true")
    @CLICommand.arguments("--visibility-only", help=VISIBILITY_HELP, action="store_true")
    @CLICommand.arguments("--allow-guest", help=ALLOW_GUEST_HELP, action="store_true")
    @CLICommand.arguments("--discoverable", help=DISCOVERABLE_HELP, action="store_true")
    @CLICommand.arguments("--public", help=PUBLIC_HELP, action="store_true")
    @CLICommand.arguments("--sign", help=sign_help, action="store_true")
    @CLICommand.arguments(
        "--product-name",
        metavar="<product_name>",
        help=product_help,
        action="append",
        default=None,
    )
    @CLICommand.mutex(publish_action_args, publish_status_args)
    @CLICommand.any_of(publish_action_args + publish_status_args)
    @CLICommand.arguments(
        "--access-type", metavar="<access_type>", help=ACCESS_TYPE_HELP, type=str, default=None, choices=AccessTypeEnum
    )
    @CLICommand.arguments("--status", metavar="<workflow_id>", help=GET_STATUS_HELP, type=str, default=None)
    @CLICommand.mutex(["access_type", "product_name"], ["allow_guest", "discoverable", "public"])
    @CLICommand.mutex(["metadata_only"], ["version_only"], ["visibility_only"])
    @CLICommand.arguments(
        "--license-terms-file",
        metavar="<filename>",
        help=LICENSE_TERM_FILE_HELP,
        type=str,
        default=None,
        feature_tag=LICENSE_TERMS_FLAG,
    )
    @CLICommand.arguments("--nspect-id", help=NSPECT_ID_HELP, type=str)
    def publish(self, args):  # noqa: D102
        validate_command_args(args)
        if args.status:
            status = self.publish_api.status(args.status)
            self.publish_printer.print_publishing_status(status)
            return
        license_terms_specs = validate_parse_license_terms(args)
        workflow_id = self.client.image.publish(
            args.target,
            args.source,
            args.metadata_only,
            args.version_only,
            args.visibility_only,
            args.allow_guest,
            args.discoverable,
            args.public,
            args.sign,
            args.access_type,
            args.product_name,
            license_terms_specs,
            args.nspect_id,
        )
        self.publish_printer.print_publishing_success(args.target, self.CMD_NAME, workflow_id)

    image_metavar = "org/[team/]image_name[:version]"
    SIGN_HELP = "Have the image cryptographically signed by NVIDIA."

    @CLICommand.command(help=SIGN_HELP, description=SIGN_HELP, feature_tag=CONFIG_TYPE)
    @CLICommand.arguments("image", metavar=IMAGE_METAVAR_TAGS, help=IMAGE_ARG_HELP, type=str)
    def sign(self, args):
        """Have the image cryptographically signed by NVIDIA."""
        self.client.image.sign(image=args.image)
        self.image_printer.print_ok("Successfully signed image '{}'.".format(args.image))

    @CLICommand.command(
        name="update-license-terms", help=UPDATE_TOS_HELP, description=UPDATE_TOS_HELP, feature_tag=LICENSE_TERMS_FLAG
    )
    @CLICommand.arguments("target", metavar=image_metavar, help=publish_target_help, type=str)
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
        self.client.image.update_license_terms(args.target, license_terms_specs)
        if bool(args.clear):
            self.image_printer.print_ok("Successfully cleared license terms for image '{}'.".format(args.target))
        else:
            self.image_printer.print_ok("Successfully updated license terms for image '{}'.".format(args.target))
