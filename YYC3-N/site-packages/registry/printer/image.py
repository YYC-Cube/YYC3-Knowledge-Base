#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from collections import OrderedDict
from itertools import chain
import json
import logging
import sys

from ngcbase.constants import STAGING_ENV
from ngcbase.errors import NgcException
from ngcbase.printer.nvPrettyPrint import (
    format_date,
    GeneralWrapper,
    NVPrettyPrint,
    str_,
)
from ngcbase.printer.utils import derive_permission, format_list_view_date
from ngcbase.util.file_utils import human_size
from ngcbase.util.io_utils import enable_control_chars_windows_shell
from ngcbase.util.utils import get_environ_tag
from registry.errors import ImageTagNotFound

logger = logging.getLogger(__name__)


SEVERITY_ORDER = ("CRITICAL", "HIGH", "MEDIUM", "LOW", "WARN", "UNKNOWN")
IMAGE_SIZE = "Image Size"


class ImagePrinter(NVPrettyPrint):
    """Handle printing related information from the container registry."""

    def __init__(self, *args, **kwargs):
        self.docker_data = OrderedDict()
        self._redraw = False
        self._lines_drawn = 0
        # Needed for overwriting progress bar lines in windows
        enable_control_chars_windows_shell()
        super().__init__(*args, **kwargs)

    def print_image_details(  # noqa: D102
        self, image_metadata, version_details, scan_details, arch_details, show_layers=False, show_scan=False
    ):
        if self.format_type == "json":
            self.print_data(
                GeneralWrapper.from_dict(
                    {
                        # this func is for image tag, we do not need to provide image list
                        # "repo_details":repo_details.toDict(),
                        **version_details.toDict(),
                        "scanDetails": [
                            # inject architecture into the same diction, avoid another level of dict
                            {"architecture": arch[1], **arch[0].toDict()}
                            for arch in scan_details
                        ],
                        "architectureDetails": [arch.toDict() for arch in arch_details],
                    }
                )
            )
        else:
            # This can be None, so default to displaying False
            tag_signed = image_metadata.isSigned or False
            tbl = self.create_output(header=False)
            tbl.add_separator_line()
            tbl.set_title("Image Information")
            tbl.add_label_line("Name", "{}:{}".format(version_details.name, version_details.tag))
            for arch in arch_details:
                tbl.add_label_line("Architecture", str(arch.architecture))
                tbl.add_label_line(IMAGE_SIZE, str(human_size(arch.compressedSize)), level=1)
                tbl.add_label_line("Digest", str(arch.digest), level=1)
            tbl.add_label_line("Schema Version", str(version_details.schemaVersion))
            tbl.add_label_line("Signed?", str(tag_signed))
            tbl.add_label_line("Last Updated", format_list_view_date(image_metadata.updatedDate))
            tbl.add_label_line("Malware Scan Status", image_metadata.malwareScanStatus)
            tbl.add_label_line("Malware Scan Date", image_metadata.malwareScanDate)

            if show_layers and version_details.fsLayers:
                layer_tbl = self.add_sub_table(outline=False, level=1)
                layer_tbl.set_title("Layers")
                for layer in version_details.fsLayers:
                    layer_tbl.add_line(layer.blobSum, level=4)
            if show_scan:
                scan_tbl = self.add_sub_table(outline=False)
                scan_tbl.set_title("Scan Information")
                for arch in arch_details:
                    arch_name = arch.architecture
                    arch_tbl = self.add_sub_table(parent_table=scan_tbl, outline=True)
                    arch_tbl.add_label_line("Architecture", arch_name)
                    try:
                        scan_result = [scan[0] for scan in scan_details if scan[1].startswith(arch_name)][0]
                    except IndexError:
                        arch_tbl.add_label_line("Scan Status", "-no scans available-", level=0)
                        continue
                    stat = str_(scan_result.scanStatus or "-no scans have been run-")
                    arch_tbl.add_label_line("Scan Status", stat, level=1)
                    if scan_result.scanStatus:
                        arch_tbl.add_label_line(
                            "Scan Outcome", getattr(scan_result, "scanOutcome", "-pending-"), level=1
                        )
                        arch_tbl.add_label_line("Scan Rating", scan_result.rating, level=1)
                        arch_tbl.add_label_line("Scan Policy Bundle", scan_result.policyBundleName, level=1)
                        scan_date = getattr(scan_result, "scanDate", "-unknown-")
                        label = f"Last Scan {'Completed' if scan_result.scanStatus == 'SCAN_COMPLETE' else 'Submitted'}"
                        arch_tbl.add_label_line(label, format_date(scan_date), level=1)
                        counts = scan_result.scanIssueCounts
                        if counts:
                            arch_tbl.add_label_line("Scan Issue Counts", level=1)
                            counts.sort(key=lambda x: SEVERITY_ORDER.index(x.severity))
                            max_label = max(len(itm.severity) for itm in scan_result.scanIssueCounts)
                            for issue_count in scan_result.scanIssueCounts:
                                arch_tbl.add_label_line(
                                    issue_count.severity.rjust(max_label), issue_count.count, level=1
                                )
            tbl.add_separator_line()
            tbl.print()

    def print_repo_info(self, repo, scan, show_details=False):  # noqa: D102
        if self.format_type == "json":
            repo_dict = repo.toDict()
            self.print_data(GeneralWrapper.from_dict(repo_dict))
            return
        tbl = self.create_output(header=False)
        tbl.set_title("Image Repository Information")
        scan_tbl = None

        tbl.add_label_line("Name", repo.name)
        tbl.add_label_line("Display Name", repo.displayName)
        tbl.add_label_line("Short Description", repo.shortDescription)
        tbl.add_label_line("Built By", repo.builtBy)
        tbl.add_label_line("Publisher", repo.publisher)
        tbl.add_label_line("Multinode Support", repo.isMultinodeEnabled)
        tbl.add_label_line("Multi-Arch Support", repo.isMultiArchitecture)
        tbl.add_label_line("Logo", repo.logo)
        tbl.add_label_line("Labels", ", ".join(label for label in repo.labels or []))
        tbl.add_label_line("Public", "{}".format("Yes" if repo.isPublic else "No"))
        tbl.add_label_line("Access Type", repo.accessType)
        tbl.add_label_line("Associated Products", repo.productNames)
        tbl.add_label_line("Last Updated", format_list_view_date(repo.updatedDate))
        tbl.add_label_line("Latest Image Size", str(human_size(repo.latestImageSize)))
        tbl.add_label_line("Signed Tag?", str_(repo.hasSignedTag))
        tbl.add_label_line("Latest Tag", str_(repo.latestTag))
        tbl.add_label_line("Tags")
        for tag in repo.tags:
            tbl.add_label_line("", tag, level=1)
        if get_environ_tag() <= STAGING_ENV and repo.licenseTerms:
            license_terms_tbl = self.add_sub_table(outline=False, detail_style=False, level=0)
            license_terms_tbl.set_title("License Terms", level=1)
            for license_term in repo.licenseTerms or []:
                license_terms_tbl.add_label_line(
                    "",
                    "{}:{} (User acceptance {}required)".format(
                        license_term.licenseId,
                        license_term.licenseVersion,
                        "not " if not license_term.needsAcceptance else "",
                    ),
                    level=1,
                )

        # NOTE: Sabu suggests that we will eventually expand details shown with the --details
        # flag. Possibly security reports or other information about repos/images.
        # Note: image overview attribute is stored in description in the schema.
        # UI diverged and we need to match them here
        if show_details:
            tbl.add_label_line("Overview")
            if repo.description:
                for line in repo.description.splitlines() or []:
                    tbl.add_label_line("", line, level=1)
        if scan:
            scan_tbl = self.add_sub_table(outline=False, level=1)
            if not repo.latestTag:
                scan_tbl.set_title("Cannot show scan information; no tags available")
            else:
                scan_tbl.set_title(f"Showing Scan Information for Latest Tag ({repo.latestTag})")
                stat = str_(scan.scanStatus or "-no scans have been run-")
                scan_tbl.add_label_line("Scan Status", stat, level=1)
                if scan.scanStatus:
                    scan_tbl.add_label_line("Scan Outcome", scan.scanOutcome or "-pending-", level=1)
                    scan_tbl.add_label_line("Scan Rating", scan.rating, level=1)
                    scan_tbl.add_label_line("Scan Policy Bundle", scan.policyBundleName, level=1)
                    scan_date = scan.scanDate if hasattr(scan, "scanDate") else "-unknown-"
                    label = "Last Scan " + "Completed" if scan.scanStatus == "SCAN_COMPLETE" else "Submitted"
                    scan_tbl.add_label_line(label, format_date(scan_date), level=1)
                    counts = scan.scanIssueCounts
                    if counts:
                        scan_tbl.add_label_line("Scan Issue Counts", level=1)
                        outer_count_tbl = self.add_sub_table(outline=False, level=0)
                        count_tbl = self.add_sub_table(parent_table=outer_count_tbl, outline=True, level=3)
                        counts.sort(key=lambda x: SEVERITY_ORDER.index(x.severity))
                        max_label = max(len(itm.severity) for itm in scan.scanIssueCounts)
                        for issue_count in scan.scanIssueCounts:
                            count_tbl.add_label_line(issue_count.severity.rjust(max_label), issue_count.count, level=1)
        tbl.print()

    def print_image_history(self, image):  # noqa: D102
        tbl = self.create_output(header=True, is_table=True)
        tbl.add_separator_line()
        tbl.add_column("Image Layer")
        tbl.add_column("Created")
        tbl.add_column("Command")
        for history in image.history or []:
            v1compat = json.loads(history.v1Compatibility)
            container_config = v1compat.get("container_config", None)
            if container_config:
                cmd = container_config["Cmd"] or []
                tbl.add_line(v1compat["id"][:10], v1compat["created"], " ".join(cmd))
        tbl.print(is_table=True)

    def print_repo_list(self, repo_itr_list, columns=None):  # noqa: D102
        output = []
        if self.format_type == "json":
            output = chain(*repo_itr_list) or []
        else:
            if not columns:
                columns = [
                    ("name", "Name"),
                    ("repository", "Repository"),
                    ("tag", "Latest Tag"),
                    ("size", IMAGE_SIZE),
                    ("updated", "Updated Date"),
                    ("permission", "Permission"),
                    ("hasSignedTag", "Signed Tag?"),
                    ("accessType", "Access Type"),
                    ("productNames", "Associated Products"),
                ]
            output = self.generate_image_list(repo_itr_list, self.is_guest_mode, columns)
        self.print_data(output, True)

    def print_publickey(self, pk):
        """Print the public key for image signing."""
        pk = pk.strip()
        if self.format_type == "json":
            output = {"public-key": pk}
            self.print_data(output)
            return
        tbl = self.create_output(header=False, detail_style=False)
        tbl.set_nobox()
        tbl.add_line(pk, level=-1)
        tbl.print()

    def print_image_push_stream(self, push_stream):
        """Printer for docker push integration."""
        logger.debug("Docker push stream: %s", push_stream)
        error_detail = push_stream.get("errorDetail")
        if error_detail:
            msg = error_detail["message"]
            # Two variations on the same message can appear, possibly with different meanings,
            # though it's unclear. missing_tag1 can appear when the image exists but isn't tagged
            # correctly; missing_tag2 can appear when the image itself does not exist. Docker doesn't
            # seem to distinguish between the two.
            missing_tag1 = "An image does not exist locally with the tag"
            missing_tag2 = "tag does not exist"
            if missing_tag1 in msg or missing_tag2 in msg:
                raise ImageTagNotFound(msg)
            raise NgcException(str(msg))

        if push_stream.get("status") and push_stream.get("id"):
            self.docker_data.update({push_stream["id"]: push_stream["status"]})
            self.draw_docker_data()
        elif push_stream.get("status"):
            self.print_ok(push_stream["status"])
        else:
            # For 'progressDetail' + 'aux' messages - not used by Docker CLI as far as I can tell
            pass

    def print_image_pull_stream(self, pull_stream):
        """Printer for docker pull integration."""
        logger.debug("Docker pull stream: %s", pull_stream)
        id_ = pull_stream.get("id")
        error = pull_stream.get("error")
        if id_:
            status = pull_stream.get("status")
            if "Pulling from" in status:
                # Informational - don't want to include in all the data to be overwritten each time.
                self.print_ok("{}: {}".format(id_, status))
                return

            progress = pull_stream.get("progress")
            if progress:
                detailed_status = status + " " + progress
                self.docker_data.update({id_: detailed_status})
            else:
                self.docker_data.update({id_: status})

            self.draw_docker_data()

        elif error:
            raise NgcException(error)
        else:
            self.print_ok(pull_stream["status"])

    def draw_docker_data(self):
        """Update record of docker data and (re)draw screen."""
        output = ""
        # We need to track the previous number of lines we printed to know how many lines to overwrite;
        # this may not necessarily be the number of lines we're currently printing.
        line_counter = 0
        for id_, status in self.docker_data.items():
            output += id_ + ": " + status + "\n"
            line_counter += 1

        # Only redraw lines (download bars) on subsequent passes
        if self._redraw is False:
            self._redraw = True
        else:
            ImagePrinter.erase_lines(self._lines_drawn)

        self._lines_drawn = line_counter
        sys.stdout.write(output)
        sys.stdout.flush()

    @staticmethod
    def erase_lines(lines_to_erase):
        """Erase lines of text on the terminal
        \\033[K - erase characters from cursor to end of line
        \\033[F - move cursor up one line
        """  # noqa: D205, D301, D415
        sys.stdout.write("\033[F\033[K" * lines_to_erase)
        sys.stdout.flush()

    def print_image_list(self, image_list, columns=None):
        """Print details for a list of Images, The general idea is that we should match the UI."""
        output = []
        if self.format_type == "json":
            output = image_list or []
        else:
            if not columns:
                columns = [("tag", "Tag"), ("updated", "Updated Date"), ("size", IMAGE_SIZE), ("signed", "Signed?")]
            output = self.generate_image_list([image_list], self.is_guest_mode, columns)
        self.print_data(output, is_table=True)

    @staticmethod
    def generate_image_list(gen, is_guest_mode, columns):  # noqa: D102
        cols, disp = zip(*columns)
        yield list(disp)

        for page in gen or []:
            for image in page or []:
                out = ImageOutput(image, is_guest_mode=is_guest_mode)
                yield [getattr(out, col, None) for col in cols]


class ImageOutput:  # noqa: D101
    def __init__(self, image, *, is_guest_mode):
        self.image = image
        self._is_guest_mode = is_guest_mode

    # Please keep these properties in alphabetical order
    @property
    def created(self):  # noqa: D102
        return format_list_view_date(self.image.dateCreated)

    @property
    def description(self):  # noqa: D102
        return str_(self.image.description)

    @property
    def multiarch(self):  # noqa: D102
        return bool(self.image.isMultiArchitecture)

    @property
    def multinode(self):  # noqa: D102
        return bool(self.image.isMultinodeEnabled)

    @property
    def name(self):  # noqa: D102
        return str_(self.image.displayName) or str_(self.image.name)

    @property
    def org(self):  # noqa: D102
        return str_(self.image.orgName)

    @property
    def permission(self):  # noqa: D102
        return derive_permission(self.image.guestAccess, self._is_guest_mode)

    @property
    def repository(self):  # noqa: D102
        return self.image.resourceId

    @property
    def shared(self):  # noqa: D102
        return "Yes" if self.image.sharedWithOrgs or self.image.sharedWithTeams else "No"

    @property
    def size(self):  # noqa: D102
        return (
            str_(human_size(self.image.latestImageSize))
            if hasattr(self.image, "latestImageSize")
            else str_(human_size(self.image.size))
        )

    @property
    def tag(self):  # noqa: D102
        return str_(self.image.latestTag) if hasattr(self.image, "latestTag") else str_(self.image.tag)

    @property
    def team(self):  # noqa: D102
        return str_(self.image.teamName)

    @property
    def updated(self):  # noqa: D102
        return format_list_view_date(self.image.updatedDate)

    @property
    def labels(self):  # noqa: D102
        lbls = []
        if not self.image.labels:
            return ""

        for each in self.image.labels:
            if each["key"] == "general":
                lbls.extend(each["values"])

        return ", ".join(lbls)

    @property
    def hasSignedTag(self):
        """This can be null if the repository hasn't been updated for its tag signing status."""  # noqa: D404
        attval = getattr(self.image, "hasSignedTag", False) or False
        return str(attval)

    @property
    def signed(self):
        """This is only returned when a tag has been signed, so its being null means it isn't signed."""  # noqa: D404
        # Need to fall back on checking the `hasSignedTag` key for search results.
        attval = getattr(self.image, "isSigned", getattr(self.image, "hasSignedTag", False)) or False
        return str(attval)

    @property
    def productNames(self):  # noqa: D102
        labels = self.image.labels
        if not labels:
            return ""
        products = []
        for each in labels:
            if each["key"] == "productNames":
                products.extend(each["values"])
        return ", ".join(products)

    @property
    def accessType(self):  # noqa: D102
        return str_(self.image.accessType) if hasattr(self.image, "accessType") else ""

    @property
    def licenseTerms(self):  # noqa: D102
        return str_(self.image.licenseTerms) if hasattr(self.image, "licenseTerms") else []
