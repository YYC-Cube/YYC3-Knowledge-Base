#
# Copyright (c) 2022, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class ArtifactDeployPrinter(NVPrettyPrint):  # noqa: D101
    def print_deployment_parameters(self, artifact_name, deploy_params):
        """Print the DeploymentParameters."""
        if self.format_type == "json":
            self.print_data(deploy_params)
            return
        tbl = self.create_output()
        tbl.add_separator_line()
        tbl.set_title("Deployment Parameters")
        tbl.add_label_line("Artifact", artifact_name)
        self._print_deployment_parameter_object(deploy_params, tbl)
        tbl.add_separator_line()
        tbl.print()

    def print_deployment_parameters_list(self, artifact_name, deploy_params_list):
        """Print DeploymentParametersListResponse."""
        if self.format_type == "json":
            self.print_data(deploy_params_list, is_table=True)
            return
        tbl = self.create_output(header=False, outline=True)
        tbl.add_separator_line()
        tbl.set_title(f"Deployment Parameters for {artifact_name}")
        # Because we store deployment parameters by csp and the upper bound of
        # supported csps is approximately a dozen it makes sense to cast it here.
        deploy_params_list = list(deploy_params_list)
        for deploy_params_per_csp in deploy_params_list:
            for deploy_params in deploy_params_per_csp.deploymentParameters or []:
                self._print_deployment_parameter_object(deploy_params, tbl)
        tbl.add_separator_line()
        tbl.print()

    def print_deployment_url_response(self, deploy_url):
        """Print the URL from a DeploymentUrlResponse.  Will eventually open a tab in the browser."""
        if self.format_type == "json":
            self.print_data(deploy_url, is_table=False)
            return
        print(deploy_url.deploymentUrl)

    @staticmethod
    def _print_deployment_parameter_object(deploy_params, tbl):
        """Print a DeploymentParameters object.."""
        tbl.add_label_line("CSP", deploy_params.csp)
        if deploy_params.container:
            cont = deploy_params.container
            vers = cont.versionId
            cont_disp = f"{cont.name}{':' if vers else ''}{vers if vers else ''}"
            tbl.add_label_line("Base Image", cont_disp)
        if deploy_params.gpu:
            tbl.add_label_line("GPU(s)", deploy_params.gpu.count or "None")
            tbl.add_label_line("GPU Type", deploy_params.gpu.type or "None")
        if deploy_params.storage:
            tbl.add_label_line("Disk Allocation (GBs)", deploy_params.storage.capacityInGB or "None")
