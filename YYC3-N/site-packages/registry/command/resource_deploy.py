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
from registry.api.utils import (
    get_container_json,
    ImageRegistryTarget,
    ModelRegistryTarget,
)
from registry.command.image import IMAGE_METAVAR_REQ_TAG
from registry.command.resource import ResourceSubCommand
from registry.data.model.DeploymentParametersCreateRequest import (
    DeploymentParametersCreateRequest,
)
from registry.data.model.DeploymentParametersUpdateRequest import (
    DeploymentParametersUpdateRequest,
)
from registry.data.model.DeploymentUrlCreateRequest import DeploymentUrlCreateRequest
from registry.printer.artifact_deploy import ArtifactDeployPrinter
from registry.printer.resource import ResourcePrinter


class ResourceDeployCommand(ResourceSubCommand):
    """Command tree for all notebook deployments of resources."""

    CMD_NAME = "deploy"
    HELP = "Manage interactive container deployments for resources."
    DESC = "Manage interactive container deployments for resources."

    def __init__(self, parser):
        super().__init__(parser)
        self.parser = parser
        self.config = self.client.config
        self.deploy_api = self.client.registry.deploy
        self.printer = ArtifactDeployPrinter(self.client.config)
        self.resource_printer = ResourcePrinter(self.client.config)

    start_help = (
        "Start interactive deployment of a resource from the NGC catalog to a cloud service provider (CSP). "
        "Default parameters can be overwritten with the provided flag options."
    )
    csp_help = "Cloud service provider to deploy to."
    start_target_help = "Resource and version to use for deployment."
    gpu_help = "Number of GPUs to use."
    gpu_type_help = "Type of GPU to use."
    disk_help = "Amount of disk space to allocate in GBs."
    ram_help = "Amount of RAM to allocate in GBs."
    image_help = "Image and tag to use as base for deployment if different from default."
    dry_run_help = "Just show the deployment URL and the list of files that would be deployed."

    RESOURCE_AND_VERSION_METAVAR = "<org>/[<team>/]<resource_name>:<version>"
    RESOURCE_NO_VERSION_METAVAR = "<org>/[<team>/]<resource_name>"
    CSP_METAVAR = "<csp>"
    GPU_METAVAR = "<gpu>"
    GPU_TYPE_METAVAR = "<gpu-type>"
    DISK_METAVAR = "<disk>"
    RAM_METAVAR = "<ram>"

    @CLICommand.command(help=start_help, description=start_help)
    @CLICommand.arguments("target", metavar=RESOURCE_AND_VERSION_METAVAR, help=start_target_help, type=str)
    @CLICommand.arguments("csp", metavar=CSP_METAVAR, help=csp_help, type=str)
    @CLICommand.arguments("--image", metavar=IMAGE_METAVAR_REQ_TAG, help=image_help, type=str, default=None)
    @CLICommand.arguments("--gpu", metavar=GPU_METAVAR, help=gpu_help, type=int, default=None)
    @CLICommand.arguments("--gpu-type", metavar=GPU_TYPE_METAVAR, help=gpu_type_help, type=str, default=None)
    @CLICommand.arguments("--disk", metavar=DISK_METAVAR, help=disk_help, type=int, default=None)
    @CLICommand.arguments("--dry-run", action="store_true", help=dry_run_help, default=False)
    def start(self, args):
        """Boot an interactive deployment of the artifact."""
        self.config.validate_configuration()
        mrt = ModelRegistryTarget(args.target, org_required=True, name_required=True, version_required=True)

        # Handle image override if specified
        container_json = None
        if args.image:
            irt = ImageRegistryTarget(args.image, org_required=True, name_required=True, tag_required=True)
            container_json = get_container_json(irt)

        deployment_request = DeploymentUrlCreateRequest(
            {
                "container": container_json,
                "model": None,
                "resource": None,
                "gpu": {"count": args.gpu, "type": args.gpu_type},
                "storage": {"capacityInGB": args.disk},
            }
        )
        deploy_response = self.deploy_api.start(
            mrt.name, args.csp, deployment_request, "recipes", mrt.version, mrt.org, team=mrt.team
        )
        self.printer.print_deployment_url_response(deploy_response)
        if args.dry_run:
            file_list = self.get_version_files(mrt.org, mrt.team, mrt.name, mrt.version)
            self.resource_printer.print_file_list(file_list)
        else:
            webbrowser.open(deploy_response.deploymentUrl)

    create_deploy_help = (
        "Create the default deployment parameter set for a resource deployment.  For each flag parameter not provided, "
        "the CSP default will be used."
    )
    create_target_help = "Resource to use for deployment."
    image_create_help = "Base image to use for deployments."

    @CLICommand.command(help=create_deploy_help, description=create_deploy_help)
    @CLICommand.arguments("target", metavar=RESOURCE_NO_VERSION_METAVAR, help=create_target_help, type=str)
    @CLICommand.arguments("image", metavar=IMAGE_METAVAR_REQ_TAG, help=image_create_help, type=str)
    @CLICommand.arguments("csp", metavar=CSP_METAVAR, help=csp_help, type=str)
    @CLICommand.arguments("--gpu", metavar=GPU_METAVAR, help=gpu_help, type=int, default=None)
    @CLICommand.arguments("--gpu-type", metavar=GPU_TYPE_METAVAR, help=gpu_type_help, type=str, default=None)
    @CLICommand.arguments("--disk", metavar=DISK_METAVAR, help=disk_help, type=int, default=None)
    def create(self, args):
        """Create a default set of parameters for deployment of an artifact."""
        self.config.validate_configuration()
        mrt = ModelRegistryTarget(args.target, org_required=True, name_required=True, version_allowed=False)
        irt = ImageRegistryTarget(args.image, org_required=True, name_required=True, tag_required=True)

        create_request = DeploymentParametersCreateRequest(
            {
                "container": get_container_json(irt),
                "gpu": {"count": args.gpu, "type": args.gpu_type},
                "storage": {"capacityInGB": args.disk},
            }
        )
        self.deploy_api.create(mrt.org, mrt.name, "recipes", args.csp, create_request, team=mrt.team)
        self.printer.print_ok(f"Successfully created {args.csp} deployment parameters for {args.target}.")

    REMOVE_DEPLOY_HELP = "Delete deployment parameters for a resource and unmark as being deployable."
    remove_target_help = "Resource whose deployment parameters should be removed."

    @CLICommand.command(help=REMOVE_DEPLOY_HELP, description=REMOVE_DEPLOY_HELP)
    @CLICommand.arguments("target", metavar=RESOURCE_NO_VERSION_METAVAR, help=remove_target_help)
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
        mrt = ModelRegistryTarget(args.target, org_required=True, name_required=True, version_allowed=False)

        self.deploy_api.remove(mrt.org, mrt.name, "recipes", args.csp, team=mrt.team)
        self.printer.print_ok(f"Successfully removed '{args.csp}' deployment for resource {args.target}.")

    info_deploy_help = "Get the default deployments parameters for a CSP deployment of a resource."
    exclude_csp_defaults_help = "Exclude CSP-level defaults."

    @CLICommand.command(help=info_deploy_help, description=info_deploy_help)
    @CLICommand.arguments("target", metavar=RESOURCE_NO_VERSION_METAVAR, help="Resource to lookup.", type=str)
    @CLICommand.arguments("csp", metavar=CSP_METAVAR, help="CSP deployment parameters to get.", type=str)
    @CLICommand.arguments(
        "--exclude-csp-defaults", action="store_false", dest="inherit", default=True, help=exclude_csp_defaults_help
    )
    def info(self, args):
        """GET the default deployment parameters for a CSP-artifact combination."""
        self.config.validate_configuration()
        mrt = ModelRegistryTarget(args.target, org_required=True, name_required=True, version_allowed=False)

        deploy_params = self.deploy_api.info(
            mrt.org, mrt.name, "recipes", args.csp, team=mrt.team, inherit=args.inherit
        )
        self.printer.print_deployment_parameters(args.target, deploy_params)

    update_deploy_help = "Update the default deployment parameter set for a resource and CSP."

    @CLICommand.command(help=update_deploy_help, description=update_deploy_help)
    @CLICommand.arguments("target", metavar=RESOURCE_NO_VERSION_METAVAR, help=create_target_help, type=str)
    @CLICommand.arguments("csp", metavar=CSP_METAVAR, help=csp_help, type=str)
    @CLICommand.arguments("--image", metavar=IMAGE_METAVAR_REQ_TAG, help=image_create_help, type=str, default=None)
    @CLICommand.arguments("--gpu", metavar=GPU_METAVAR, help=gpu_help, type=int, default=None)
    @CLICommand.arguments("--gpu-type", metavar=GPU_TYPE_METAVAR, help=gpu_type_help, type=str, default=None)
    @CLICommand.arguments("--disk", metavar=DISK_METAVAR, help=disk_help, type=int, default=None)
    def update(self, args):
        """Update an existing deployment parameter set for an artifact."""
        self.config.validate_configuration()
        mrt = ModelRegistryTarget(args.target, org_required=True, name_required=True, version_allowed=False)

        container_json = None
        if args.image:
            irt = ImageRegistryTarget(args.image, org_required=True, name_required=True, tag_required=True)
            container_json = get_container_json(irt)

        upd_dict = defaultdict(dict)
        upd_dict["container"] = container_json
        if args.gpu:
            upd_dict["gpu"]["count"] = args.gpu
        if args.gpu_type:
            upd_dict["gpu"]["type"] = args.gpu_type
        if args.disk:
            upd_dict["storage"]["capacityInGB"] = args.disk
        update_request = DeploymentParametersUpdateRequest(upd_dict)
        self.deploy_api.update(mrt.org, mrt.name, "recipes", args.csp, update_request, team=mrt.team)
        self.printer.print_ok(f"Successfully updated '{args.csp}' deployment for resource {args.target}.")

    list_deploy_help = "Get list of available CSP deployments for an artifact."

    @CLICommand.command(help=list_deploy_help, description=list_deploy_help)
    @CLICommand.arguments("target", metavar=RESOURCE_NO_VERSION_METAVAR, help=create_target_help, type=str)
    def list(self, args):
        """Return a list of CSP deployments for an artifact."""
        self.config.validate_configuration()
        mrt = ModelRegistryTarget(args.target, org_required=True, name_required=True, version_allowed=False)

        responses = self.deploy_api.list(mrt.org, mrt.name, "recipes", team=mrt.team)
        self.printer.print_deployment_parameters_list(args.target, responses)
