#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from argparse import ArgumentTypeError
from collections.abc import Iterable
from fnmatch import fnmatch
import json
import logging
import os
import posixpath
import tarfile
from typing import ByteString, List, Optional, Union

from ngcbase.api.connection import Connection
from ngcbase.api.pagination import pagination_helper_page_reference_iter_total_pages
from ngcbase.errors import (
    AccessDeniedException,
    AuthenticationException,
    NgcException,
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
)
from ngcbase.util.file_utils import (
    get_file_contents,
    get_incremented_filename,
    helm_format,
    human_size,
)
from ngcbase.util.utils import extra_args
from registry.api.utils import (
    apply_labels_update,
    ChartRegistryTarget,
    get_auth_org_and_team,
    get_label_set_labels,
)
from registry.data.model.Artifact import Artifact
from registry.data.model.ArtifactCreateRequest import ArtifactCreateRequest
from registry.data.model.ArtifactResponse import ArtifactResponse
from registry.data.model.ArtifactUpdateRequest import ArtifactUpdateRequest
from registry.data.model.ArtifactVersion import ArtifactVersion
from registry.data.model.ArtifactVersionFileListResponse import (
    ArtifactVersionFileListResponse,
)
from registry.data.model.ArtifactVersionListResponse import ArtifactVersionListResponse
from registry.data.model.ArtifactVersionResponse import ArtifactVersionResponse
from registry.data.model.File import File
from registry.data.publishing.LicenseMetadata import LicenseMetadata
from registry.errors import ChartAlreadyExistsException, ChartNotFoundException
from registry.printer.chart import ChartPrinter
from registry.transformer.chart import ChartSearchTransformer

PAGE_SIZE = 1000
logger = logging.getLogger(__name__)


class ChartAPI:
    r"""public methods returns unwrapped objects \n
    private methods returns wrapped api reponses \n
    private methods set endpoints.
    """  # noqa: D205

    def __init__(
        self,
        api_client,
        repo_connection: Optional[Connection] = None,
    ):
        self.connection = api_client.connection
        self.client = api_client
        self.repo_connection = repo_connection
        self.config = api_client.config
        self.resource_type = "HELM_CHART"
        self.printer = ChartPrinter(api_client.config)

    # PUBLIC FUNCTIONS

    @extra_args
    def list(
        self, target: Optional[str] = None, access_type: Optional[str] = None, product_names: Optional[str] = None
    ) -> Union[List[ChartSearchTransformer], List[ArtifactVersion]]:
        """Lists charts or versions in the chart repository based on the provided target, \
            access type and product names.
        This function distinguishes between listing all charts matching certain criteria or specific \
            versions of a chart,
        depending on whether a version identifier is included in the target.

        Args:
            target: Optional; a string identifier or glob pattern that may specify a chart name or a version.
            access_type: Optional; filter the charts based on the access type (e.g., public, private).
            product_names: Optional; filter charts based on product names.

        Returns:
            Union[List[ChartSearchTransformer], List[ArtifactVersion]]: \
                Returns a list of charts or chart versions, depending on whether a version is specified in the target.

        Raises:
            ResourceNotFoundException: If no matching charts or versions could be found.
        """  # noqa: D205, D401
        crt = ChartRegistryTarget(target, glob_allowed=True)
        if crt.version:
            return list(self.list_versions(target))

        return [i for c in self.list_charts(target, access_type=access_type, product_names=product_names) for i in c]

    def list_charts(
        self,
        target: Optional[str] = None,
        access_type: Optional[str] = None,
        product_names: Optional[str] = None,
    ) -> Iterable[List[ChartSearchTransformer]]:
        """Lists all charts that match a specified name pattern, access type, and product names. This function is
        intended to be used to fetch charts without specific versioning information.

        Args:
            target: Optional; a string identifier or glob pattern for filtering charts.
            access_type: Optional; filter the charts based on the access type.
            product_names: Optional; filter charts based on product names.

        Returns:
            Iterable[List[ChartSearchTransformer]]: \
                An iterable that yields lists of charts that match the search criteria.

        Raises:
            ResourceNotFoundException: If no charts matching the criteria could be found.
        """  # noqa: D205, D401
        self.config.validate_configuration(guest_mode_allowed=True, csv_allowed=True)
        crt = ChartRegistryTarget(target, glob_allowed=True)
        org = crt.org or self.config.org_name
        team = crt.team or self.config.team_name
        # we would like to remove version info from the search query
        resource_matcher = target if not crt.version else "/".join([i for i in (org, team, crt.name) if i])
        # get all matching charts

        try:
            return self.client.registry.search.search_charts(
                org=org,
                team=team,
                resource_matcher=resource_matcher,
                access_type=access_type,
                product_names=product_names,
            )
        except ResourceNotFoundException as e:
            raise ResourceNotFoundException(f"Target '{target}' could not be found.") from e

    def list_versions(
        self,
        target: str,
    ) -> Iterable[ArtifactVersion]:
        """Lists versions of a specific chart. This function filters for chart versions that match a provided version
        pattern from the target. It can list all versions or specific ones based on a version regex.

        Args:
            target: A string identifier that specifies the chart and potentially includes a version or version pattern.

        Returns:
            Iterable[ArtifactVersion]: An iterable of chart versions that match the specified version pattern.

        Raises:
            ResourceNotFoundException: If no versions matching the specified pattern could be found.
        """  # noqa: D205, D401
        self.config.validate_configuration(guest_mode_allowed=True, csv_allowed=True)
        crt = ChartRegistryTarget(target, glob_allowed=True, version_required=False)
        org = crt.org or self.config.org_name
        team = crt.team or self.config.team_name

        try:
            # get all matching versions
            for resp in self._list_versions_resps(org, team, crt.name):
                for ver in resp.artifactVersions:
                    if fnmatch(str(ver.id), crt.version or "*"):
                        yield ver
        except (ResourceNotFoundException, ChartNotFoundException) as e:
            raise ResourceNotFoundException(f"Target '{target}' versions could not be found.") from e

    def list_files(self, target: str) -> Iterable[File]:
        """Lists all files associated with a specific version of a chart in the chart repository. This function requires
        a precise version identifier and lists every file associated with that version.

        Args:
            target: The fully qualified chart name including the version information.

        Returns:
            Iterable[File]: An iterable of files associated with the specified chart version.

        Raises:
            ResourceNotFoundException: If the specified chart or version cannot be found.
        """  # noqa: D205, D401
        self.config.validate_configuration(guest_mode_allowed=True)
        crt = ChartRegistryTarget(target, glob_allowed=False, name_required=True, version_required=True)
        try:
            for resp in self._list_files_resps(crt.org, crt.team, crt.name, crt.version):
                for file in resp.artifactFiles:
                    yield file
        except (ResourceNotFoundException, ChartNotFoundException, AttributeError) as e:
            raise ResourceNotFoundException(f"Target '{target}' versions could not be found.") from e

    @extra_args
    def info(self, target: str) -> Union[Artifact, ArtifactVersion]:
        """Retrieves detailed information about a chart or a specific version of a chart from the chart repository.
        The function will return either general chart information or specific version details based on the target.

        Args:
            target: A string identifier that specifies the chart. \
                Must include the version if specific version info is requested.

        Returns:
            Union[Artifact, ArtifactVersion]: Depending on whether the target includes a version, \
                returns either chart details or chart version details.

        Raises:
            ChartNotFoundException: If the specified chart or chart version cannot be found.
        """  # noqa: D205, D401
        crt = ChartRegistryTarget(target, glob_allowed=False, name_required=True, org_required=True)
        if crt.version is None:
            return self.info_chart(target)
        return self.info_chart_version(target)

    def info_chart(self, target: str) -> Artifact:
        """Retrieves information for a specific chart, including details about the latest version available. This function
        requires an exact chart name without regex patterns allowed.

        Args:
            target: A string identifier for the chart.

        Returns:
            Artifact: An object containing details about the chart including the latest version.

        Raises:
            ChartNotFoundException: If the chart cannot be found.
        """  # noqa: D205, D401
        crt = ChartRegistryTarget(target, glob_allowed=False, name_required=True, org_required=True)
        try:
            return self._info_chart_resp(crt.org, crt.team, crt.name).artifact
        except (ResourceNotFoundException, ChartNotFoundException, AttributeError) as e:
            raise ChartNotFoundException("Target '{}' could not be found.".format(target)) from e

    def info_chart_version(self, target: str) -> ArtifactVersion:
        """Retrieves detailed information about a specific version of a chart. This function requires an exact identifier
        for the chart and its version, with no regex patterns allowed.

        Args:
            target: A string identifier that includes the chart name and version.

        Returns:
            ArtifactVersion: An object containing details about the specified version of the chart.

        Raises:
            ChartNotFoundException: If the chart version cannot be found.
        """  # noqa: D205, D401
        crt = ChartRegistryTarget(
            target, glob_allowed=False, name_required=True, org_required=True, version_required=True
        )
        try:
            return self._info_chart_version_resp(crt.org, crt.team, crt.name, str(crt.version)).artifactVersion
        except (ResourceNotFoundException, ChartNotFoundException, AttributeError) as e:
            raise ChartNotFoundException("Target '{}' could not be found.".format(target)) from e

    def get_latest_chart_version(self, target: str) -> str:
        """Retrieves the latest version identifier for a specified chart. This function is designed to fetch the most
        recent version of a chart based on the chart's name.

        Args:
            target: A string identifier for the chart.

        Returns:
            str: The identifier of the latest version of the specified chart.

        Raises:
            NgcException: If the specified chart has no versions available.
        """  # noqa: D205, D401
        chart = self.info_chart(target)
        if not chart.latestVersionId:
            raise NgcException("Target '{}' has no version available.".format(target))
        return chart.latestVersionId

    @extra_args
    def remove(self, target: str) -> Union[ArtifactVersion, Artifact]:
        """Removes a specified chart or a specific version of a chart from the repository. Depending on the target
        provided, this function either removes a single version or all versions of a chart.

        Args:
            target: A string identifier that specifies the chart and may optionally include a version.

        Returns:
            Union[ArtifactVersion, Artifact]: \
                Returns either the details of the removed chart version or the chart itself.

        Raises:
            ChartNotFoundException: If the specified chart or chart version cannot be found.
        """  # noqa: D205, D401
        crt = ChartRegistryTarget(target, glob_allowed=False, name_required=True, org_required=True)
        if crt.version is None:
            return self.remove_chart(target)
        return self.remove_chart_version(target)

    def remove_chart(self, target: str) -> Artifact:
        """Removes a chart and all its associated versions from the repository. This function ensures that all versions
        are removed before the chart itself is deleted.

        Args:
            target: A string identifier for the chart.

        Returns:
            Artifact: An object containing the details of the removed chart.

        Raises:
            ChartNotFoundException: If the chart cannot be found.
        """  # noqa: D205, D401
        self.config.validate_configuration()

        crt = ChartRegistryTarget(target, glob_allowed=False, name_required=True, org_required=True)

        try:
            version_obj_list = self.list_versions(target)
            for version_obj in version_obj_list:
                self._remove_chart_version_resp(crt.org, crt.team, crt.name, version_obj.id)
            return self._remove_chart_resp(crt.org, crt.team, crt.name).artifact
        except (ResourceNotFoundException, ChartNotFoundException, AttributeError) as e:
            raise ChartNotFoundException("Target '{}' could not be found.".format(target)) from e

    def remove_chart_version(self, target: str) -> ArtifactVersion:
        """Removes a specific version of a chart from the repository. This function requires a precise identifier
        for the chart and its version.

        Args:
            target: A string identifier that includes the chart name and version.

        Returns:
            ArtifactVersion: An object containing details about the removed chart version.

        Raises:
            ChartNotFoundException: If the chart version cannot be found.
        """  # noqa: D205, D401
        self.config.validate_configuration()
        crt = ChartRegistryTarget(
            target, glob_allowed=False, name_required=True, org_required=True, version_required=True
        )
        try:
            return self._remove_chart_version_resp(crt.org, crt.team, crt.name, crt.version).artifactVersion
        except (ResourceNotFoundException, ChartNotFoundException, AttributeError) as e:
            raise ChartNotFoundException("Target '{}' could not be found.".format(target)) from e

    @extra_args
    def pull(self, target: str, download_dir: Optional[str] = None) -> str:
        """Pulls a specified version of a Helm chart to a local directory. If the version is not specified,
        it will retrieve the latest version. The download directory must exist and have write permissions.

        Args:
            target: The identifier for the Helm chart, which may optionally include a version.
            download_dir: Optional; the directory where the Helm chart will be downloaded. \
                Defaults to the current directory.

        Returns:
            str: The path to the downloaded Helm chart file.

        Raises:
            NgcException: If the download directory does not exist, lacks write permissions, \
                or if the specified chart version is not in the 'UPLOAD_COMPLETE' state.
        """  # noqa: D205, D401
        self.config.validate_configuration(guest_mode_allowed=True)
        crt = ChartRegistryTarget(target, org_required=True, name_required=True)

        if not crt.version:
            crt.version = self.get_latest_chart_version(target)
            target += f":{crt.version}"

        download_dir = os.path.abspath(download_dir or ".")
        if not os.path.isdir(download_dir):
            raise NgcException(f"The path: '{download_dir}' does not exist.")
        if not os.access(download_dir, os.W_OK):
            raise NgcException(f"You do not have permission to write files to '{download_dir}'.")

        if self.info_chart_version(target).status != "UPLOAD_COMPLETE":
            raise NgcException(f"'{target}' is not in state UPLOAD_COMPLETE.")

        chart_package = helm_format(crt.name, crt.version)
        output_path = get_incremented_filename(posixpath.join(download_dir, chart_package))
        resp = self._pull_chart_resp(crt.org, crt.team, chart_package)
        try:
            with open(output_path, "wb") as ff:
                ff.write(resp)
        except (
            PermissionError
        ):  # Still need to check permission, as python's `os.access()` doesn't work correctly under Windows.
            raise NgcException(f"You do not have permission to write files to '{download_dir}'.") from None
        return output_path

    @extra_args
    def push(
        self,
        target: str,
        source_dir: Optional[str] = ".",
        is_dry_run: Optional[bool] = False,
        cli_messages: Optional[List[str]] = None,
    ) -> Union[ArtifactVersion, None]:
        """Pushes a packaged Helm chart to the repository. This function can perform a dry run to simulate
        the upload without actually transmitting any data.
        Source directory must contain a valid packaged Helm chart.

        Args:
            target: The identifier for the Helm chart, including the version.
            source_dir: Optional; the local directory containing the Helm chart package. \
                Defaults to the current directory.
            is_dry_run: Optional; if True, performs a dry run of the push operation. Defaults to False.
            cli_messages: Optional; a list to append output messages during the operation.

        Returns:
            Union[ArtifactVersion, None]: \
                Returns an object containing the version details if the operation succeeds, or None if it is a dry run.

        Raises:
            NgcException: If the chart metadata does not exist or \
                if the upload fails due to an existing chart or other errors.
        """  # noqa: D205
        self.config.validate_configuration(guest_mode_allowed=False)
        crt = ChartRegistryTarget(target, org_required=True, name_required=True, version_required=True)

        transfer_path = self._validate_local_chart(source_dir, crt.name, crt.version)

        try:
            self.info_chart(target)
        except (ResourceNotFoundException, ChartNotFoundException) as e:
            raise NgcException(
                "Chart meta data is not found. Please first create the"
                "chart record before pushing any versions of the chart."
            ) from e

        if is_dry_run:
            with tarfile.open(transfer_path, mode="r:gz") as ff:
                mm = ff.getmembers()
                size = sum(m.size for m in mm)
                count = len(mm)
                if cli_messages is not None:
                    cli_messages.append(f"File to be uploaded: {transfer_path}")
                    cli_messages.append(f"Total Size: {human_size(size)}")
                    cli_messages.append(f"Number of Files: {count}")
            return None

        try:
            with open(transfer_path, "rb") as f:
                self._push_chart_resp(crt.org, crt.team, f.read())
                if cli_messages is not None:
                    cli_messages.append(f"Successfully pushed chart version '{crt.name}:{crt.version}'.")
                return None
        except ResourceAlreadyExistsException as e:
            msg = f"Chart '{helm_format(crt.name,crt.version)}' already exists in the repository."
            raise ResourceAlreadyExistsException(msg) from e
        except (AuthenticationException, AccessDeniedException):
            raise AuthenticationException("Chart '{}' access is denied.".format(target)) from None
        except (NgcException, IOError) as e:
            msg = ""
            if hasattr(e, "explanation"):
                try:
                    msg = json.loads(e.explanation).get("error")  # pylint: disable=no-member
                    raise NgcException(msg) from e
                except TypeError:
                    pass
            raise NgcException(f"Chart upload failed: {msg}. Are you sure this is a valid packaged Helm chart?") from e

    @extra_args
    def create(
        self,
        target: str,
        short_description: str,
        overview_filepath: Optional[str] = None,
        display_name: Optional[str] = None,
        labels: Optional[List[str]] = None,
        label_sets: Optional[List[str]] = None,
        logo: Optional[str] = None,
        publisher: Optional[str] = None,
        built_by: Optional[str] = None,
    ) -> Artifact:
        """Creates metadata for a new Helm chart in the repository. \
            This includes various descriptive elements such as a short description,
        display name, labels, and potentially an overview file among other details.

        Args:
            target: The unique identifier for the chart.
            short_description: A brief description of the chart.
            overview_filepath: Optional; the path to a file containing a detailed description of the chart.
            display_name: Optional; a user-friendly name for the chart.
            labels: Optional; a list of labels associated with the chart.
            label_sets: Optional; a list of label sets associated with the chart.
            logo: Optional; a URL or a path to an image file to be used as the chart's logo.
            publisher: Optional; the name of the entity that published the chart.
            built_by: Optional; the name of the developer or organization that built the chart.

        Returns:
            Artifact: An object representing the created chart metadata.

        Raises:
            NgcException: If the overview file path does not exist or if the chart already exists in the repository.
            ChartAlreadyExistsException: Specifically raised if the target chart already exists to distinguish from \
                other potential conflicts.
        """  # noqa: D205, D401
        self.config.validate_configuration()
        crt = ChartRegistryTarget(
            target, glob_allowed=False, name_required=True, org_required=True, version_allowed=False
        )

        if overview_filepath:
            abs_path = os.path.abspath(overview_filepath)
            if not os.path.exists(abs_path):
                raise NgcException(f"The path: '{abs_path}' does not exist.")

        chart_create_request = ArtifactCreateRequest(
            {
                # should we limit overview_file size or reach up to size?
                "description": get_file_contents(overview_filepath, "overview_file"),
                "displayName": display_name,
                "labelsV2": get_label_set_labels(self.client.registry.label_set, "HELM_CHART", label_sets, labels),
                "logo": logo,
                "name": crt.name,
                "publisher": publisher,
                "builtBy": built_by,
                "shortDescription": short_description,
            }
        )
        chart_create_request.isValid()

        try:
            return self._create_chart_resp(crt.org, crt.team, chart_create_request).artifact
        except ResourceAlreadyExistsException as e:
            raise ChartAlreadyExistsException(f"Chart '{target}' already exists.") from e

    @extra_args
    def update(
        self,
        target: str,
        overview_filepath: Optional[str] = None,
        display_name: Optional[str] = None,
        labels: Optional[List[str]] = None,
        add_label: Optional[List[str]] = None,
        remove_label: Optional[List[str]] = None,
        label_sets: Optional[List[str]] = None,
        logo: Optional[str] = None,
        publisher: Optional[str] = None,
        built_by: Optional[str] = None,
        short_description: Optional[str] = None,
    ) -> Artifact:
        """Updates the metadata for an existing Helm chart in the repository. This function allows modifications to
        various metadata attributes such as the display name, labels, logo, and the chart's descriptive content.

        Args:
            target: The unique identifier for the chart.
            overview_filepath: Optional; the path to a file containing a detailed description of the chart.
            display_name: Optional; a user-friendly name for the chart.
            labels: Optional; a list of labels to declare for the chart.
            add_label: Optional: a list of labels to add to the chart.
            remove_label: Optional: a list of labels to remove from the chart.
            label_sets: Optional; a list of label sets associated with the chart.
            logo: Optional; a URL or a path to an image file to be used as the chart's logo.
            publisher: Optional; the name of the entity that published the chart.
            built_by: Optional; the name of the developer or organization that built the chart.
            short_description: Optional; a brief description of the chart.

        Returns:
            Artifact: An object representing the updated chart metadata.

        Raises:
            ResourceNotFoundException: If the specified chart cannot be found in the repository.
            ArgumentTypeError: If labels or label_sets used along with add_label or remove_label.
        """  # noqa: D205, D401
        self.config.validate_configuration()
        crt = ChartRegistryTarget(target, org_required=True, name_required=True)
        if (labels or label_sets) and (add_label or remove_label):
            raise ArgumentTypeError(
                "Declaritive arguments `labels` or `label_sets`"
                "cannot be used with imperative arguments `add_label` or `remove_label`"
            )

        if crt.version:
            raise NgcException("You cannot update a chart version.")

        labels_v2 = []
        if labels or label_sets:
            labels_v2 = get_label_set_labels(self.client.registry.label_set, "HELM_CHART", label_sets, labels)
        else:
            labels_v2 = self._info_chart_resp(crt.org, crt.team, crt.name).artifact.labels or []

        if not labels:
            artifact = self._info_chart_resp(crt.org, crt.team, crt.name).artifact
            labels = artifact.labels or []

        chart_update_request = ArtifactUpdateRequest(
            {
                # should we limit overview_file size or reach up to size?
                "description": get_file_contents(overview_filepath, "overview_file"),
                "displayName": display_name,
                "labelsV2": apply_labels_update(labels_v2, add_label or [], remove_label or []),
                "logo": logo,
                "name": crt.name,
                "publisher": publisher,
                "builtBy": built_by,
                "shortDescription": short_description,
            }
        )
        chart_update_request.isValid()

        try:
            return self._update_chart_resp(crt.org, crt.team, crt.name, chart_update_request).artifact
        except (ResourceNotFoundException, AuthenticationException, AttributeError) as e:
            raise ResourceNotFoundException(f"Chart '{target}' was not found.") from e

    # END PUBLIC Functions

    @classmethod
    def _get_chart_endpoint(cls, org: str, team: str, name: Optional[str] = None):
        """Create the chart URL: `v2/org/{org-name}/team/{team-name}/helm-charts/{chart-name}`"""  # noqa: D415
        return f"v2/org/{org}{('/team/'+team) if team else ''}/helm-charts{'/'+name if name else ''}"

    @classmethod
    def _get_versions_endpoint(cls, org: str, team: str, name: str, version: Optional[str] = None):
        """Create the chart version URL:
        `v2/org/{org-name}/team/{team-name}/helm-charts/{chart_name}/versions[/{version-name}]`
        """  # noqa: D205, D415
        return (
            "v2"
            f"/org/{org}"
            f"{('/team/'+team) if team else ''}"
            f"/helm-charts/{name}"
            f"/versions{('/'+version) if version else ''}"
        )

    @classmethod
    def _get_helm_pull_endpoint(cls, org: str, team: str, name: str):
        """Create the base URL for pull: `{org-name}[/{team-name}]/charts/{chart-name}`"""  # noqa: D415
        return f"{org}{('/'+team) if team else ''}/charts/{name}"

    @classmethod
    def _get_helm_push_endpoint(cls, org: str, team: str):
        """Create the base URL for push: `api/{org-name}[/{team-name}]/charts`"""  # noqa: D415
        return f"api/{org}{('/'+team) if team else ''}/charts"

    @classmethod
    def _get_files_endpoint(cls, org: str, team: str, name: str, version: str):
        """Create a files endpoint.
        `v2/org/{org-name}/team/{team-name}/helm-charts/{chart_name}/versions/{version-name}/files`
        """  # noqa: D205, D415
        return f"v2/org/{org}{('/team/'+team) if team else ''}/helm-charts/{name}/versions/{version}/files"

    @classmethod
    def _validate_local_chart(cls, source: str, name: str, version: str) -> str:
        supposed_tgz_filename = helm_format(name, version)
        path = os.path.abspath(source)
        # if source path does not exist, exit right away
        if not os.path.exists(path):
            raise NgcException(f"Path: '{path}' does not exist.")
        # if source path is a directory, append file name and verify
        if os.path.isdir(path):
            full_path = os.path.join(path, supposed_tgz_filename)
            if not os.path.isfile(full_path):
                raise NgcException(f"File: '{full_path}' does not exist.")
        # if source path is a file, verify filename
        else:
            if os.path.basename(path) != supposed_tgz_filename:
                raise NgcException(f"File: '{path}' does not match registry name and version {name}:{version}.")
            full_path = path

        if not tarfile.is_tarfile(full_path):
            raise NgcException(f"The file '{full_path}' is not a valid gzipped tar file.")

        with tarfile.open(full_path, mode="r:gz") as ff:
            try:
                chart_member = [mb for mb in ff.getmembers() if mb.name.split("/")[-1] == "Chart.yaml"]
                if not chart_member:
                    raise NgcException(f"Not a valid Helm chart file: '{path}' - no 'Chart.yaml' found.")

                chart_file = ff.extractfile(chart_member[0])
                lines = chart_file.read().decode("utf-8").splitlines()
                name_lines = [line.strip() for line in lines if line.startswith("name: ")]
                actual_chart_name = name_lines[0].split(":", 1)[1].strip() if name_lines else ""
                version_lines = [line.strip() for line in lines if line.startswith("version: ")]
                _version = version_lines[0].split(":", 1)[1].strip() if version_lines else ""
                # Versions can contain quotes, so strip those
                actual_chart_version = _version.replace("'", "").replace('"', "")

                if (actual_chart_name != name) or (actual_chart_version != version):
                    raise NgcException(
                        f"The supplied filename and version '{name}:{version}' do not match the contents of the file"
                        f" '{full_path}', which should be '{actual_chart_name}:{actual_chart_version}'. Please correct"
                        " this before attempting to push a new version."
                    )
            except KeyError as e:
                raise NgcException(
                    f"The Chart.yaml of file '{full_path}' does not contain valid name and version"
                ) from e
            except tarfile.ReadError as e:
                raise NgcException(f"The file '{full_path}' is not a gzipped tar file.") from e
            except ValueError as e:
                raise NgcException(f"The file '{full_path}' does not appear to be a valid Helm chart.") from e
        return full_path

    def _list_files_resps(
        self, org, team, resource_name, version, page_size=PAGE_SIZE
    ) -> Iterable[ArtifactVersionFileListResponse]:
        """Returns a generator of response objects, each response object contains a chart file list."""  # noqa: D401
        base_url = self._get_files_endpoint(org=org, team=team, name=resource_name, version=version)
        query = "{url}?page-size={page_size}".format(url=base_url, page_size=page_size)
        _org, _team = get_auth_org_and_team(org, team, self.config.org_name, self.config.team_name)

        for res in pagination_helper_page_reference_iter_total_pages(
            self.connection,
            query,
            org_name=_org,
            team_name=_team,
            operation_name="list chart files",
        ):
            if ArtifactVersionFileListResponse(res):
                yield ArtifactVersionFileListResponse(res)

    def _list_versions_resps(self, org, team, chart_name, page_size=PAGE_SIZE) -> Iterable[ArtifactVersionListResponse]:
        """Returns a generator of response objects, each response object contains a chart version list."""  # noqa: D401
        base_url = self._get_versions_endpoint(org=org, team=team, name=chart_name)
        query = "{url}?page-size={page_size}".format(url=base_url, page_size=page_size)
        _org, _team = get_auth_org_and_team(org, team, self.config.org_name, self.config.team_name)

        for res in pagination_helper_page_reference_iter_total_pages(
            self.connection,
            query,
            org_name=_org,
            team_name=_team,
            operation_name="list chart versions",
        ):
            if ArtifactVersionListResponse(res):
                yield ArtifactVersionListResponse(res)

    def _info_chart_version_resp(self, org, team, chart_name, version):
        """Returns a response object of one specific chart version."""  # noqa: D401
        ep = self._get_versions_endpoint(org=org, team=team, name=chart_name, version=version)
        _org, _team = get_auth_org_and_team(org, team, self.config.org_name, self.config.team_name)

        params = {"resolve-labels": "false"}
        resp = self.connection.make_api_request(
            "GET",
            ep,
            auth_org=_org,
            auth_team=_team,
            operation_name="get chart version",
            params=params,
        )
        return ArtifactVersionResponse(resp)

    def _info_chart_resp(self, org, team, name):
        """Returns a response object of one specific chart."""  # noqa: D401
        ep = self._get_chart_endpoint(org=org, team=team, name=name)
        _org, _team = get_auth_org_and_team(org, team, self.config.org_name, self.config.team_name)

        resp = self.connection.make_api_request(
            "GET",
            ep,
            auth_org=_org,
            auth_team=_team,
            operation_name="get chart",
        )
        return ArtifactResponse(resp)

    def _pull_chart_resp(self, org, team, name) -> ByteString:
        """Download a chart, name has to be full chart name."""
        ep = self._get_helm_pull_endpoint(org=org, team=team, name=name)
        _org, _team = get_auth_org_and_team(org, team, self.config.org_name, self.config.team_name)

        return self.repo_connection.make_api_request(
            "GET",
            ep,
            auth_org=_org,
            auth_team=_team,
            operation_name="pull chart",
            json_response=False,
            return_content=True,
        )

    # http code 201 on success
    def _push_chart_resp(self, org, team, payload: bytes) -> None:
        """Upload a chart to the helm repository."""
        ep = self._get_helm_push_endpoint(org, team)
        _org, _team = get_auth_org_and_team(org, team, self.config.org_name, self.config.team_name)
        self.repo_connection.make_api_request(
            "POST",
            ep,
            payload=payload,
            auth_org=_org,
            auth_team=_team,
            content_type="application/gzip",
            operation_name="push chart",
        )

    def _create_chart_resp(self, org: str, team: str, request_payload: ArtifactCreateRequest) -> ArtifactResponse:
        ep = self._get_chart_endpoint(org=org, team=team)
        _org, _team = get_auth_org_and_team(org, team, self.config.org_name, self.config.team_name)

        resp = self.connection.make_api_request(
            "POST",
            ep,
            payload=request_payload.toJSON(),
            auth_org=_org,
            auth_team=_team,
            operation_name="create chart",
        )
        return ArtifactResponse(resp)

    def _update_chart_resp(
        self, org: str, team: str, name: str, request_payload: ArtifactUpdateRequest
    ) -> ArtifactResponse:
        ep = self._get_chart_endpoint(org=org, team=team, name=name)
        _org, _team = get_auth_org_and_team(org, team, self.config.org_name, self.config.team_name)
        resp = self.connection.make_api_request(
            "PATCH",
            ep,
            payload=request_payload.toJSON(),
            auth_org=_org,
            auth_team=_team,
            operation_name="update chart",
        )
        return ArtifactResponse(resp)

    def _remove_chart_resp(self, org: str, team: str, name: str) -> ArtifactResponse:

        ep = self._get_chart_endpoint(org=org, team=team, name=name)
        _org, _team = get_auth_org_and_team(org, team, self.config.org_name, self.config.team_name)
        resp = self.connection.make_api_request(
            "DELETE", ep, auth_org=_org, auth_team=_team, operation_name="delete chart"
        )
        return ArtifactResponse(resp)

    def _remove_chart_version_resp(self, org: str, team: str, name: str, version: str) -> ArtifactVersionResponse:
        ep = self._get_versions_endpoint(org=org, team=team, name=name, version=version)
        _org, _team = get_auth_org_and_team(org, team, self.config.org_name, self.config.team_name)
        resp = self.connection.make_api_request(
            "DELETE",
            ep,
            auth_org=_org,
            auth_team=_team,
            operation_name="delete chart version",
        )
        return ArtifactVersionResponse(resp)

    @extra_args
    def publish(
        self,
        target,
        source: Optional[str] = None,
        metadata_only=False,
        version_only=False,
        visibility_only=False,
        allow_guest=False,
        discoverable=False,
        public=False,
        access_type: Optional[str] = None,
        product_names: Optional[List[str]] = None,
        license_terms_specs: Optional[List[LicenseMetadata]] = None,
        nspect_id: Optional[str] = None,
    ):
        """Publish a chart with various options for metadata, versioning, and visibility.

        This method manages the publication of charts to a repository, handling
        different aspects of the publication such as metadata only, version only, and
        visibility adjustments. It validates the combination of arguments provided
        and processes the publication accordingly.
        There are two seperate publishing flows in the follow precedence:
            unified catalog publishing: sets the product names and access type of the chart.
            legacy publishing: sets the discoverable, public, allow_guest of the chart.
        """
        self.config.validate_configuration(guest_mode_allowed=False)
        if not metadata_only and source:
            _source = ChartRegistryTarget(source, org_required=True, name_required=True)
            if _source.version is None:
                _version = self.get_latest_chart_version(source)
                source += f":{_version}" if _version else ""
                logger.info("No version specified for %s, using version: %s", source, _version)

        return self.client.registry.publish.publish(
            self.resource_type,
            self.config.org_name,
            self.config.team_name,
            target,
            source,
            metadata_only,
            version_only,
            visibility_only,
            allow_guest,
            discoverable,
            public,
            False,
            access_type,
            product_names,
            False,  # upload pending is model/ resource related
            license_terms_specs,
            nspect_id,
        )

    def update_license_terms(self, target, license_terms_specs: Optional[List[LicenseMetadata]] = None):
        """Update a chart's license terms of services.

        Args:
            target: Full chart name. Format: org/[team/]name.
            license_terms_specs: License terms to.
        """
        self.config.validate_configuration(guest_mode_allowed=False)
        return self.client.registry.publish.update_license_terms(
            self.resource_type,
            target,
            self.config.org_name,
            self.config.team_name,
            license_terms_specs,
        )


class GuestChartAPI(ChartAPI):
    """define guest endpoints here to override parent class methods"""  # noqa: D200, D415

    @classmethod
    def _get_chart_endpoint(cls, org: Optional[str] = None, team: Optional[str] = None, name: Optional[str] = None):
        """Override parent endpoints
        Create the chart URL: `v2/helm-charts[/{org}[/{team}[/{name}]]]`
        """  # noqa: D205, D415
        return f"v2/helm-charts{'/'+org if org else ''}{('/'+team) if team else ''}{('/'+name) if name else ''}"

    @classmethod
    def _get_versions_endpoint(
        cls,
        org: Optional[str] = None,
        team: Optional[str] = None,
        name: Optional[str] = None,
        version: Optional[str] = None,
    ):
        """Create the chart version URL:
        `v2/helm-charts[/{org}[/{team}[/{name}]]]/versions[/{version-name}]/versions[/{version}]`
        """  # noqa: D205, D415
        return (
            "v2/helm-charts"
            f"{('/'+org) if org else ''}"
            f"{('/'+team) if team else ''}"
            f"{('/'+name) if name else ''}"
            f"/versions{('/'+version) if version else ''}"
        )

    @classmethod
    def _get_files_endpoint(
        cls,
        org,
        team,
        name,
        version,
    ):
        """Create the chart files URL:
        `v2/helm-charts[/{org}[/{team}[/{name}]]]/versions[/{version-name}]/versions[/{version}]/files`
        """  # noqa: D205, D415
        return f"v2/helm-charts/{org}{('/'+team) if team else ''}/{name}/versions/{version}/files"

    def _get_license_terms(self, target):
        """Get license terms for a chart."""
        crt = ChartRegistryTarget(target, org_required=True, name_required=True, version_required=False)
        resp = self.info_chart(f"{crt.org}/{crt.team}/{crt.name}" if crt.team else f"{crt.org}/{crt.name}")
        return resp.licenseTerms if hasattr(resp, "licenseTerms") else None

    @extra_args
    def pull(self, target: str, download_dir: Optional[str] = None, agree_license: bool = False) -> str:
        """Pulls a specified version of a Helm chart to a local directory. If the version is not specified,
        it will retrieve the latest version. The download directory must exist and have write permissions.

        Args:
            target: The identifier for the Helm chart, which may optionally include a version.
            download_dir: Optional; the directory where the Helm chart will be downloaded. \
                Defaults to the current directory.
            agree_license: Optional; if True, skip license checking. Defaults to False.

        Returns:
            str: The path to the downloaded Helm chart file.

        Raises:
            NgcException: If the download directory does not exist, lacks write permissions, \
                or if the specified chart version is not in the 'UPLOAD_COMPLETE' state.
        """  # noqa: D205, D401
        # Perform license check for guest downloads
        self.client.registry.publish.check_license_for_guest_download(self, target, agree_license)

        # Call parent pull method
        return super().pull(target, download_dir)
