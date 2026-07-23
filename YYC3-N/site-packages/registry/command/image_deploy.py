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
from collections import defaultdict
import webbrowser

from ngcbase.command.clicommand import CLICommand
from ngcbase.util.utils import confirm_remove
from registry.api.utils import ImageRegistryTarget
from registry.command.image import IMAGE_CREATE_METAVAR, ImageCommand
from registry.data.model.DeploymentParametersCreateRequest import (
    DeploymentParametersCreateRequest,
)
from registry.data.model.DeploymentParametersUpdateRequest import (
    DeploymentParametersUpdateRequest,
)
from registry.data.model.DeploymentUrlCreateRequest import DeploymentUrlCreateRequest
from registry.printer.artifact_deploy import ArtifactDeployPrinter


class ImageDeployCommand(ImageCommand):  # noqa: D101

    CMD_NAME = "deploy"
    HELP = "Manage interactive container deployments for images."
    DESC = "Manage interactive container deployments for images."

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.deploy_api = self.client.deploy
        self.printer = ArtifactDeployPrinter(self.client.config)

    start_help = (
        "Create interactive deployment of an image from the NGC catalog to a cloud service provider (CSP). "
        "Default parameters can be overwritten with the provided flag options."
    )
    csp_help = "Cloud service provider to deploy to."
    deploy_target_help = "Image and tag to use for deployment."
    gpu_help = "Number of GPUs to use."
    gpu_type_help = "Type of GPUs to use."
    disk_help = "Amount of disk space to allocate in GBs."
    ram_help = "Amount of RAM to allocate in GBs."
    dry_run_help = "If enabled, don't automatically open the link in a browser."

    IMAGE_AND_TAG_METAVAR = "org/[team/]image_name:tag"
    CSP_METAVAR = "<csp>"
    GPU_METAVAR = "<gpu>"
    GPU_TYPE_METAVAR = "<gpu-type>"
    DISK_METAVAR = "<disk>"
    RAM_METAVAR = "<ram>"

    @CLICommand.command(help=start_help, description=start_help)
    @CLICommand.arguments("target", metavar=IMAGE_AND_TAG_METAVAR, help=deploy_target_help, type=str)
    @CLICommand.arguments("csp", metavar=CSP_METAVAR, help=csp_help, type=str)
    @CLICommand.arguments("--gpu", metavar=GPU_METAVAR, help=gpu_help, type=int, default=None)
    @CLICommand.arguments("--gpu-type", metavar=GPU_TYPE_METAVAR, help=gpu_type_help, type=str, default=None)
    @CLICommand.arguments("--disk", metavar=DISK_METAVAR, help=disk_help, type=int, default=None)
    @CLICommand.arguments("--dry-run", action="store_true", help=dry_run_help, default=False)
    def start(self, args):
        """Boot an interactive deployment of the artifact."""
        self.config.validate_configuration()
        irt = ImageRegistryTarget(args.target, org_required=True, name_required=True, tag_required=True)

        deployment_request = DeploymentUrlCreateRequest(
            {
                "container": None,
                "model": None,
                "resource": None,
                "gpu": {"count": args.gpu, "type": args.gpu_type},
                "storage": {"capacityInGB": args.disk},
            }
        )
        deployment_url = self.deploy_api.start(
            irt.image, args.csp, deployment_request, "repositories", irt.tag, irt.org, team=irt.team
        )
        self.printer.print_deployment_url_response(deployment_url)
        if not args.dry_run:
            webbrowser.open(deployment_url.deploymentUrl)

    CREATE_DEPLOY_HELP = "Create the default deployment parameter set for an image deployment."

    @CLICommand.command(help=CREATE_DEPLOY_HELP, description=CREATE_DEPLOY_HELP)
    @CLICommand.arguments("target", metavar=IMAGE_CREATE_METAVAR, help=deploy_target_help, type=str)
    @CLICommand.arguments("csp", metavar=CSP_METAVAR, help=csp_help, type=str)
    @CLICommand.arguments("--gpu", metavar=GPU_METAVAR, help=gpu_help, type=int, default=None)
    @CLICommand.arguments("--gpu-type", metavar=GPU_TYPE_METAVAR, help=gpu_type_help, type=str, default=None)
    @CLICommand.arguments("--disk", metavar=DISK_METAVAR, help=disk_help, type=int, default=None)
    def create(self, args):
        """Create a default set of parameters for deployment of an artifact."""
        self.config.validate_configuration()
        irt = ImageRegistryTarget(args.target, org_required=True, name_required=True, tag_allowed=False)

        create_request = DeploymentParametersCreateRequest(
            {"gpu": {"count": args.gpu, "type": args.gpu_type}, "storage": {"capacityInGB": args.disk}}
        )
        self.deploy_api.create(irt.org, irt.image, "repositories", args.csp, create_request, team=irt.team)
        self.printer.print_ok(f"Successfully created {args.csp} deployment parameters for {args.target}.")

    REMOVE_DEPLOY_HELP = "Delete deployment parameters for an image and unmark as being deployable."
    remove_target_help = "Image whose deployment parameters should be removed."

    @CLICommand.command(help=REMOVE_DEPLOY_HELP, description=REMOVE_DEPLOY_HELP)
    @CLICommand.arguments("target", metavar=IMAGE_CREATE_METAVAR, help=remove_target_help)
    @CLICommand.arguments("csp", metavar=CSP_METAVAR, help=csp_help, type=str)
    @CLICommand.arguments(
        "-y",
        "--yes",
        help="Automatically say yes to all interactive questions.",
        dest="default_yes",
        action="store_true",
    )
    def remove(self, args):
        """Delete deployment parameters for an artifact and unmark as being deployable."""
        self.config.validate_configuration()
        confirm_remove(printer=self.printer, target=args.target, default=args.default_yes)
        irt = ImageRegistryTarget(args.target, org_required=True, name_required=True, tag_allowed=False)

        self.deploy_api.remove(irt.org, irt.image, "repositories", args.csp, team=irt.team)
        self.printer.print_ok(f"Successfully removed '{args.csp}' deployment for image {args.target}.")

    info_deploy_help = "Get the default deployments parameters for a CSP deployment of an image."
    exclude_csp_defaults_help = "Exclude CSP-level defaults."

    @CLICommand.command(help=info_deploy_help, description=info_deploy_help)
    @CLICommand.arguments("target", metavar=IMAGE_CREATE_METAVAR, help="Image to lookup.", type=str)
    @CLICommand.arguments("csp", metavar=CSP_METAVAR, help="CSP default deployment to get.", type=str)
    @CLICommand.arguments(
        "--exclude-csp-defaults", action="store_false", dest="inherit", default=True, help=exclude_csp_defaults_help
    )
    def info(self, args):
        """GET the default deployment parameters for an artifact-csp combination."""
        self.config.validate_configuration()
        irt = ImageRegistryTarget(args.target, org_required=True, name_required=True, tag_allowed=False)
        deploy_param = self.deploy_api.info(
            irt.org, irt.image, "repositories", args.csp, team=irt.team, inherit=args.inherit
        )
        self.printer.print_deployment_parameters(args.target, deploy_param)

    UPDATE_DEPLOY_HELP = "Update an existing deployment parameter set for an image and CSP."

    @CLICommand.command(help=UPDATE_DEPLOY_HELP, description=UPDATE_DEPLOY_HELP)
    @CLICommand.arguments("target", metavar=IMAGE_CREATE_METAVAR, help=deploy_target_help, type=str)
    @CLICommand.arguments("csp", metavar=CSP_METAVAR, help=csp_help, type=str)
    @CLICommand.arguments("--gpu", metavar=GPU_METAVAR, help=gpu_help, type=int, default=None)
    @CLICommand.arguments("--gpu-type", metavar=GPU_TYPE_METAVAR, help=gpu_type_help, type=str, default=None)
    @CLICommand.arguments("--disk", metavar=DISK_METAVAR, help=disk_help, type=int, default=None)
    def update(self, args):
        """Update an existing set of deployment parameters for an image."""
        self.config.validate_configuration()
        irt = ImageRegistryTarget(args.target, org_required=True, name_required=True, tag_allowed=False)

        upd_dict = defaultdict(dict)
        if args.gpu:
            upd_dict["gpu"]["count"] = args.gpu
        if args.gpu_type:
            upd_dict["gpu"]["type"] = args.gpu_type
        if args.disk:
            upd_dict["storage"]["capacityInGB"] = args.disk
        update_request = DeploymentParametersUpdateRequest(upd_dict)
        self.deploy_api.update(irt.org, irt.image, "repositories", args.csp, update_request, team=irt.team)
        self.printer.print_ok(f"Successfully updated '{args.csp}' deployment for resource {args.target}.")

    LIST_DEPLOY_HELP = "Get list of available CSP deployments for an artifact."
    list_target_help = "Target artifact to get list of CSP deployments for."

    @CLICommand.command(help=LIST_DEPLOY_HELP, description=LIST_DEPLOY_HELP)
    @CLICommand.arguments("target", metavar=IMAGE_CREATE_METAVAR, help=list_target_help, type=str)
    def list(self, args):
        """Return a list of CSP deployments for an artifact."""
        self.config.validate_configuration()
        irt = ImageRegistryTarget(args.target, org_required=True, name_required=True, tag_allowed=False)

        responses = self.deploy_api.list(irt.org, irt.image, "repositories", team=irt.team)
        self.printer.print_deployment_parameters_list(args.target, responses)
