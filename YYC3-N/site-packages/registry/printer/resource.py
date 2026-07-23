#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from itertools import chain

from ngcbase.constants import STAGING_ENV
from ngcbase.printer.nvPrettyPrint import (
    format_date,
    GeneralWrapper,
    NVPrettyPrint,
    str_,
)
from ngcbase.printer.utils import derive_permission, format_list_view_date
from ngcbase.util.file_utils import human_size
from ngcbase.util.utils import get_environ_tag
from registry.api.utils import format_repo


def _transform_precision(_precision):
    # This is a temp hack for GTC.  The resource content was incorrectly
    # entered with a couple of issues:
    # 1) precision was type unicode string, not the required PrecisionTypeEnum.
    # 2) many/all models were entered as 'FPBOTH'.
    #
    # For now (gtc), transform 'FPBOTH' to 'FP16, FP32' when displaying.
    prec = _precision
    if _precision == "FPBOTH":
        prec = "FP16, FP32"
    elif _precision == "ALL":
        prec = "FP16, FP32, TF32"
    return prec


class TabProcessor:
    """Responsible for managing the view of tab information in response objects."""

    HEADER_ATTR = [
        ("Setup", "setup"),
        ("Quick Start Guide", "quick_start_guide"),
        ("Advanced Guide", "advanced"),
        ("Performance", "performance"),
    ]

    def __init__(self, resource_printer, response):
        self._resource_printer = resource_printer
        self._response = response

    def _default_processor(self, attr):
        """Trim and split lines by terminal length."""
        att = getattr(self._response, attr, "")
        if not att:
            return att or ""
        return str(att)

    @property
    def setup(self):  # noqa: D102
        return self._default_processor("setup")

    @property
    def quick_start_guide(self):  # noqa: D102
        return self._default_processor("quickStartGuide")

    @property
    def advanced(self):  # noqa: D102
        return self._default_processor("advanced")

    @property
    def performance(self):  # noqa: D102
        return self._default_processor("performance")


class ResourcePrinter(NVPrettyPrint):
    """The printer should be responsible for printing objects and lists of objects of the associated type."""

    def print_resource(self, ms):
        """Print resource metadata."""
        ms.precision = _transform_precision(ms.precision)
        if self.format_type == "json":
            self.print_data(ms)
            return
        tbl = self.create_output(header=False)
        tbl.add_separator_line()
        tbl.set_title("Resource Information")
        tbl.add_label_line("Name", ms.name)
        tbl.add_label_line("Application", ms.application)
        tbl.add_label_line("Training Framework", ms.trainingFramework)
        tbl.add_label_line("Model Format", ms.modelFormat)
        tbl.add_label_line("Precision", ms.precision)
        tbl.add_label_line("Short Description", ms.shortDescription)
        tbl.add_label_line("Public Dataset Used", "")

        if ms.publicDatasetUsed:
            tbl.add_label_line("Name", ms.publicDatasetUsed.name)
            tbl.add_label_line("Link", ms.publicDatasetUsed.link)
            tbl.add_label_line("License", ms.publicDatasetUsed.license)

        # administrative info
        tbl.add_label_line("Display Name", ms.displayName)
        tbl.add_label_line("Logo", ms.logo)
        tbl.add_label_line("Org", ms.orgName)
        tbl.add_label_line("Team", ms.teamName)
        tbl.add_label_line("Built By", ms.builtBy)
        tbl.add_label_line("Publisher", ms.publisher)
        tbl.add_label_line("Created Date", format_date(ms.createdDate))
        tbl.add_label_line("Updated Date", format_date(ms.updatedDate))
        tbl.add_label_line("Has Signed Version", ms.hasSignedVersion)
        tbl.add_label_line("Can Guest Download", ms.canGuestDownload)
        tbl.add_label_line("Read Only", ms.isReadOnly)
        tbl.add_label_line("Access Type", ms.accessType)
        tbl.add_label_line("Associated Products", ms.productNames)
        lbl_tbl = self.add_sub_table(outline=True, detail_style=False, level=0)
        lbl_tbl.set_title("Labels", level=2)
        for label in ms.labels or []:
            lbl_tbl.add_line(label, level=3, ignore_rich_indent=True)
        # According to backend devs, we"re not guaranteed to have latestVersionIdStr populated.
        # If it's not populated, use latestVersionId instead.
        # UI handles this the same way.
        tbl.add_label_line("Latest Version ID", ms.latestVersionIdStr or ms.latestVersionId)
        size = str(ms.latestVersionSizeInBytes or "")
        if (ms.latestVersionIdStr or ms.latestVersionId) and not size:
            size = 0
        tbl.add_label_line("Latest Version Size (bytes)", size)
        if get_environ_tag() <= STAGING_ENV and ms.licenseTerms:
            license_terms_tbl = self.add_sub_table(outline=False, detail_style=False, level=0)
            license_terms_tbl.set_title("License Terms", level=1)
            for license_term in ms.licenseTerms or []:
                license_terms_tbl.add_label_line(
                    "",
                    "{}:{} (User acceptance {}required)".format(
                        license_term.licenseId,
                        license_term.licenseVersion,
                        "not " if not license_term.needsAcceptance else "",
                    ),
                    level=1,
                )
        # Note: script level overview attribute is stored in description in the schema.
        # UI diverged and we need to quickly match them now.
        ovr_tbl = self.add_sub_table(outline=True, detail_style=False, level=0)
        ovr_tbl.set_title("Overview", level=2)
        lines = ms.description.splitlines() if ms.description else []
        for line in lines:
            ovr_tbl.add_line(line, level=3, ignore_rich_indent=True)
        tab_processor = TabProcessor(self, ms)
        for header, attr in tab_processor.HEADER_ATTR:
            atts = getattr(tab_processor, attr)
            if not atts:
                continue
            tab_tbl = self.add_sub_table(outline=True, detail_style=False, level=0)
            tab_tbl.set_min_width(20)
            tab_tbl.set_title(header, level=2)
            for att in atts.splitlines() or ["-none-"]:
                tab_tbl.add_line(att.strip(), level=3, ignore_rich_indent=True)
        tbl.add_separator_line()
        tbl.print()

    def print_resource_version(self, version, resource=None, file_list=None):
        """Print resource version metadata."""
        if self.format_type == "json":
            if file_list:
                _file_list = [_file.toDict() for _file in file_list]
                output = GeneralWrapper(version=version.toDict(), file_list=_file_list)
            else:
                output = version
            self.print_data(output)
            return
        tbl = self.create_output(header=False)
        tbl.add_separator_line()
        tbl.set_title("Resource Version Information")
        tbl.add_label_line("Id", version.versionId)
        tbl.add_label_line("Batch Size", version.batchSize)
        tbl.add_label_line("Memory Footprint", version.memoryFootprint)
        tbl.add_label_line("Number Of Epochs", version.numberOfEpochs)
        tbl.add_label_line("Accuracy Reached", version.accuracyReached)
        tbl.add_label_line("GPU Model", version.gpuModel)
        if resource:
            tbl.add_label_line("Access Type", resource.accessType)
            tbl.add_label_line("Associated Products", resource.productNames)

        # admin info
        tbl.add_label_line("Created By", version.createdByUser)
        tbl.add_label_line("Created Date", format_date(version.createdDate))
        tbl.add_label_line("Status", version.status)
        tbl.add_label_line("Signed", str_(version.isSigned))
        tbl.add_label_line("Total File Count", version.totalFileCount)
        tbl.add_label_line("Total Size", human_size(version.totalSizeInBytes))
        tbl.add_label_line("Malware Scan Status", version.malwareScanStatus)
        tbl.add_label_line("Malware Scan Date", version.malwareScanDate)

        # long fields
        tbl.add_label_line("Description", "")
        if version.description:
            desc_lines = version.description.splitlines()
            for desc_line in desc_lines:
                tbl.add_label_line("", desc_line)

        tab_processor = TabProcessor(self, version)
        for header, attr in tab_processor.HEADER_ATTR:
            atts = getattr(tab_processor, attr)
            if not atts:
                continue
            tab_tbl = self.add_sub_table(outline=True, detail_style=False, level=0)
            tab_tbl.set_min_width(20)
            tab_tbl.set_title(header, level=1)
            for att in atts.splitlines():
                tab_tbl.add_line(att.strip(), level=2, ignore_rich_indent=True)

        if file_list:
            self.print_file_list(file_list, tbl)
        tbl.add_separator_line()
        tbl.print()

    def print_file_list(self, file_list, main_table=None):  # noqa: D102
        if main_table:
            file_tbl = self.add_sub_table(outline=True, detail_style=True, level=0)
        else:
            file_tbl = self.create_output(header=False)
        file_tbl.set_title("File List", level=1)
        for _file in file_list or []:
            file_tbl.add_label_line(f"{_file.path}", f"{human_size(_file.sizeInBytes)}", level=1)
        if not main_table:
            file_tbl.print()

    def print_resource_list(self, resource_list, columns=None):
        """Print resource list."""
        output = []
        if self.format_type == "json":
            _updated_list = []
            for _ms in chain(*resource_list):
                _ms.precision = _transform_precision(_ms.precision)
                _updated_list.append(_ms)
            output = _updated_list
        else:
            if not columns:
                columns = [
                    ("name", "Name"),
                    ("repository", "Repository"),
                    ("latest_version", "Latest Version"),
                    ("application", "Application"),
                    ("framework", "Framework"),
                    ("precision", "Precision"),
                    ("updated", "Last Modified"),
                    ("permission", "Permission"),
                    ("accessType", "Access Type"),
                    ("productNames", "Associated Products"),
                    ("hasSignedVersion", "Has Signed Version"),
                ]

            output = self.generate_resource_list(resource_list, self.is_guest_mode, columns)
        self.print_data(output, is_table=True)

    def print_resource_version_list(self, version_list, columns=None):
        """Print resource version list."""
        output = []
        if self.format_type == "json":
            output = version_list or []
        else:
            if not columns:
                columns = [
                    ("version", "Version"),
                    ("accuracy", "Accuracy"),
                    ("epochs", "Epochs"),
                    ("batch", "Batch Size"),
                    ("gpu", "GPU Model"),
                    ("memory", "Memory Footprint"),
                    ("size", "File Size"),
                    ("status", "Status"),
                    ("created", "Created Date"),
                    ("isSigned", "Signed"),
                ]

            output = self.generate_resource_list([version_list], self.is_guest_mode, columns)
        self.print_data(output, is_table=True)

    @staticmethod
    def generate_resource_list(gen, is_guest_mode, columns):  # noqa: D102
        cols, disp = zip(*columns)
        yield list(disp)

        for page in gen or []:
            for resource in page or []:
                out = ResourceOutput(resource, is_guest_mode=is_guest_mode)
                yield [getattr(out, col, None) for col in cols]

    def create_resource_table(self, gen, is_guest_mode, columns):  # noqa: D102
        table = self.create_table_columns(columns)
        for page in gen or []:
            for resource in page or []:
                new_vals = []
                output = ResourceOutput(resource, is_guest_mode=is_guest_mode)
                vals = [getattr(output, col[0]) for col in columns]
                for val in vals:
                    new_vals.append(str(val))
                table.add_row(*new_vals)
        return table


class ResourceOutput:  # noqa: D101
    def __init__(self, resource, *, is_guest_mode=False):
        self.resource = resource
        self._is_guest_mode = is_guest_mode

    @property
    def name(self):  # noqa: D102
        return str_(self.resource.displayName) or str_(self.resource.name)

    @property
    def org(self):  # noqa: D102
        return str_(self.resource.orgName)

    @property
    def team(self):  # noqa: D102
        return str_(self.resource.teamName)

    @property
    def description(self):  # noqa: D102
        return str_(self.resource.description)

    @property
    def updated(self):  # noqa: D102
        return format_list_view_date(self.resource.updatedDate)

    @property
    def created(self):  # noqa: D102
        return format_list_view_date(self.resource.createdDate)

    @property
    def shared(self):  # noqa: D102
        return "Yes" if self.resource.sharedWithOrgs or self.resource.sharedWithTeams else "No"

    @property
    def status(self):  # noqa: D102
        return str_(self.resource.status)

    @property
    def size(self):  # noqa: D102
        return (
            human_size(self.resource.totalSizeInBytes)
            if hasattr(self.resource, "totalSizeInBytes")
            else human_size(self.resource.latestVersionSizeInBytes) or ""
        )

    @property
    def repository(self):  # noqa: D102
        return format_repo(self.resource.orgName, self.resource.teamName, self.resource.name)

    @property
    def version(self):  # noqa: D102
        if hasattr(self.resource, "versionId"):
            return str_(self.resource.versionId)
        return ""

    @property
    def latest_version(self):  # noqa: D102
        # According to backend devs, we're not guaranteed to have latestVersionIdStr populated.
        # If it's not populated, use latestVersionId instead.
        # UI handles this the same way.
        return str_(self.resource.latestVersionIdStr or self.resource.latestVersionId)

    @property
    def application(self):  # noqa: D102
        return str_(self.resource.application)

    @property
    def framework(self):  # noqa: D102
        return str_(self.resource.trainingFramework)

    @property
    def precision(self):  # noqa: D102
        return str_(_transform_precision(self.resource.precision))

    @property
    def permission(self):  # noqa: D102
        return derive_permission(self.resource.guestAccess, self._is_guest_mode)

    @property
    def accuracy(self):  # noqa: D102
        return str_(self.resource.accuracyReached) if hasattr(self.resource, "accuracyReached") else ""

    @property
    def epochs(self):  # noqa: D102
        return str_(self.resource.numberOfEpochs) if hasattr(self.resource, "numberOfEpochs") else ""

    @property
    def batch(self):  # noqa: D102
        return str_(self.resource.batchSize) if hasattr(self.resource, "batchSize") else ""

    @property
    def gpu(self):  # noqa: D102
        return str_(self.resource.gpuModel) if hasattr(self.resource, "gpuModel") else ""

    @property
    def memory(self):  # noqa: D102
        return str_(self.resource.memoryFootprint) if hasattr(self.resource, "memoryFootprint") else ""

    @property
    def labels(self):  # noqa: D102
        lbls = []
        if not self.resource.labels:
            return ""

        for each in self.resource.labels:
            if each["key"] == "general":
                lbls.extend(each["values"])

        return ", ".join(lbls)

    @property
    def productNames(self):  # noqa: D102
        labels = self.resource.labels
        if not labels:
            return ""
        products = []
        for each in labels:
            if each["key"] == "productNames":
                products.extend(each["values"])
        return ", ".join(products)

    @property
    def accessType(self):  # noqa: D102
        return str_(self.resource.accessType) if hasattr(self.resource, "accessType") else ""

    @property
    def licenseTerms(self):  # noqa: D102
        return str_(self.resource.licenseTerms) if hasattr(self.resource, "licenseTerms") else []

    @property
    def isSigned(self):
        """This indicate if version is signed."""  # noqa: D404
        return str(getattr(self.resource, "isSigned", False))

    @property
    def hasSignedVersion(self):
        """This indicate if at least one of containing versions is signed."""  # noqa: D404
        return str(bool(getattr(self.resource, "hasSignedVersion", False)))
