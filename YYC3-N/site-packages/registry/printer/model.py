#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from itertools import chain

from ngcbase.constants import STAGING_ENV
from ngcbase.printer.nvPrettyPrint import GeneralWrapper, NVPrettyPrint, str_
from ngcbase.printer.utils import derive_permission, format_list_view_date
from ngcbase.util.file_utils import human_size
from ngcbase.util.utils import get_environ_tag
from registry.api.utils import format_repo


class ModelPrinter(NVPrettyPrint):
    """The printer should be responsible for printing objects and lists of objects of the associated type."""

    def print_metrics_deprecation_warning(self, arg):  # noqa: D102
        replaced = arg.replace("metric", "credential")
        self.print_ok(f"Warning! '{arg}' is deprecated. Please use the '{replaced}' argument instead.")

    def print_model(self, model):
        """Print details for a Model (general idea is that we should match the UI)."""
        if self.format_type == "json":
            self.print_data(model)
            return
        tbl = self.create_output(header=False)
        tbl.add_separator_line()
        tbl.set_title("Model Information")
        tbl.add_label_line("Name", model.name)
        tbl.add_label_line("Application", model.application)
        tbl.add_label_line("Framework", model.framework)
        tbl.add_label_line("Model Format", model.modelFormat)
        tbl.add_label_line("Precision", model.precision)
        tbl.add_label_line("Short Description", model.shortDescription)
        tbl.add_label_line("Display Name", model.displayName)
        tbl.add_label_line("Logo", model.logo)
        tbl.add_label_line("Org", model.orgName)
        tbl.add_label_line("Team", model.teamName)
        tbl.add_label_line("Built By", model.builtBy)
        tbl.add_label_line("Publisher", model.publisher)
        tbl.add_label_line("Created Date", model.createdDate)
        tbl.add_label_line("Updated Date", model.updatedDate)
        tbl.add_label_line("Has Signed Version", model.hasSignedVersion)
        tbl.add_label_line("Access Type", model.accessType)
        tbl.add_label_line("Associated Products", model.productNames)

        lbl_tbl = self.add_sub_table(outline=False, detail_style=False, level=0)
        lbl_tbl.set_title("Labels", level=1)
        for label in model.labels or []:
            lbl_tbl.add_label_line("", label, level=1)
        tbl.add_label_line("Latest Version ID", model.latestVersionIdStr)
        vers_bytes = model.latestVersionSizeInBytes
        size = str_(vers_bytes) if model.latestVersionIdStr and vers_bytes else 0
        tbl.add_label_line("Latest Version Size (bytes)", size)
        pub_tbl = self.add_sub_table(outline=True, detail_style=True, level=0)
        pub_tbl.set_min_width(20)
        pub_tbl.set_title("Public Dataset Used", level=1)
        if model.publicDatasetUsed:
            pub_tbl.add_label_line("Name", model.publicDatasetUsed.name or "", level=2)
            pub_tbl.add_label_line("Link", model.publicDatasetUsed.link or "", level=2)
            pub_tbl.add_label_line("License", model.publicDatasetUsed.license or "", level=2)
        if get_environ_tag() <= STAGING_ENV and model.licenseTerms:
            license_terms_tbl = self.add_sub_table(outline=False, detail_style=False, level=0)
            license_terms_tbl.set_title("License Terms", level=1)
            for license_term in model.licenseTerms or []:
                license_terms_tbl.add_label_line(
                    "",
                    "{}:{} (User acceptance {}required)".format(
                        license_term.licenseId,
                        license_term.licenseVersion,
                        "not " if not license_term.needsAcceptance else "",
                    ),
                    level=1,
                )
        # Note: model level overview attribute is stored in description in the schema.
        # UI diverged and we need to quickly match them now.
        if model.description:
            out_tbl = self.add_sub_table(outline=True, detail_style=False, level=0)
            out_tbl.set_title("Overview", level=1)
            desc = model.description or ""
            for line in desc.splitlines() or []:
                out_tbl.add_line(line, level=2, ignore_rich_indent=True)
        if model.bias:
            bias_tbl = self.add_sub_table(outline=True, detail_style=False, level=0)
            bias_tbl.set_title("Bias", level=1)
            bias = model.bias or ""
            for line in bias.splitlines() or []:
                bias_tbl.add_line(line, level=2, ignore_rich_indent=True)
        if model.explainability:
            explainability_tbl = self.add_sub_table(outline=True, detail_style=False, level=0)
            explainability_tbl.set_title("Explainability", level=1)
            explainability = model.explainability or ""
            for line in explainability.splitlines() or []:
                explainability_tbl.add_line(line, level=2, ignore_rich_indent=True)
        if model.privacy:
            privacy_tbl = self.add_sub_table(outline=True, detail_style=False, level=0)
            privacy_tbl.set_title("Privacy", level=1)
            privacy = model.privacy or ""
            for line in privacy.splitlines() or []:
                privacy_tbl.add_line(line, level=2, ignore_rich_indent=True)
        if model.safetyAndSecurity:
            safety_tbl = self.add_sub_table(outline=True, detail_style=False, level=0)
            safety_tbl.set_title("Safety And Security", level=1)
            safety = model.safetyAndSecurity or ""
            for line in safety.splitlines() or []:
                safety_tbl.add_line(line, level=2, ignore_rich_indent=True)
        if model.encryptionKeyId:
            encryption_key_tbl = self.add_sub_table(outline=True, detail_style=False, level=0)
            encryption_key_tbl.set_title("Encryption Key", level=1)
            encryption_key_tbl.add_label_line("ID", model.encryptionKeyId, level=2)

        tbl.add_separator_line()
        tbl.print()

    def print_model_list(self, model_list, columns=None):
        """Print details for a list of Models (general idea is that we should match the UI)."""
        output = []
        if self.format_type == "json":
            output = chain(*model_list)
        else:
            if not columns:
                columns = [
                    ("name", "Name"),
                    ("repository", "Repository"),
                    ("version", "Latest Version"),
                    ("application", "Application"),
                    ("framework", "Framework"),
                    ("precision", "Precision"),
                    ("updated", "Last Modified"),
                    ("permission", "Permission"),
                    ("accessType", "Access Type"),
                    ("productNames", "Associated Products"),
                    ("hasSignedVersion", "Has Signed Version"),
                ]

            output = self.generate_model_list(model_list, self.is_guest_mode, columns)
        self.print_data(output, is_table=True)

    def print_model_version(self, version, model=None, file_list=None, credentials=False):
        """Print details for a ModelVersion."""
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
        tbl.set_title("Model Version Information")
        tbl.add_label_line("Id", version.versionId)
        tbl.add_label_line("Batch Size", version.batchSize)
        tbl.add_label_line("Memory Footprint", version.memoryFootprint)
        tbl.add_label_line("Number Of Epochs", version.numberOfEpochs)
        tbl.add_label_line("Accuracy Reached", version.accuracyReached)
        tbl.add_label_line("GPU Model", version.gpuModel)
        if model:
            tbl.add_label_line("Access Type", model.accessType)
            tbl.add_label_line("Associated Products", model.productNames)
        tbl.add_label_line("Created Date", version.createdDate)
        tbl.add_label_line("Description")
        desc = version.description or ""
        for line in desc.splitlines() or []:
            tbl.add_line(line, level=3)
        tbl.add_label_line("Status", str_(version.status))
        tbl.add_label_line("Signed", str_(version.isSigned))
        tbl.add_label_line("Total File Count", str_(version.totalFileCount))
        tbl.add_label_line("Total Size", human_size(version.totalSizeInBytes))
        if file_list:
            self.print_file_list(file_list, tbl)

        if version.otherContents:
            tbl.add_label_line("Additional Resources")
            for item in version.otherContents or []:
                tbl.add_label_line(item.key, item.value, level=1)

        if credentials:
            tbl.add_label_line("Model Credentials")
            for metric in version.customMetrics or []:
                tbl.add_label_line(metric.name, level=1)
                for line in metric.attributes:
                    tbl.add_label_line(line.key, line.value, level=2)

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

    def print_model_version_list(self, model_version_list, columns=None):
        """Print details for a list of ModelVersions."""
        output = []

        if self.format_type == "json":
            output = model_version_list or []
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

            output = self.generate_model_list([model_version_list], self.is_guest_mode, columns)
        self.print_data(output, is_table=True)

    @staticmethod
    def generate_model_list(gen, is_guest_mode, columns):  # noqa: D102
        cols, disp = zip(*columns)
        yield list(disp)

        for page in gen or []:
            for model in page or []:
                out = ModelOutput(model, is_guest_mode)
                yield [getattr(out, col, None) for col in cols]


class ModelOutput:  # noqa: D101
    def __init__(self, model, is_guest_mode=None):
        self.model = model
        self._is_guest_mode = is_guest_mode

    @property
    def name(self):  # noqa: D102
        return str_(self.model.displayName) or str_(self.model.name)

    @property
    def org(self):  # noqa: D102
        return str_(self.model.orgName)

    @property
    def team(self):  # noqa: D102
        return str_(self.model.teamName)

    @property
    def description(self):  # noqa: D102
        return str_(self.model.description)

    @property
    def updated(self):  # noqa: D102
        return format_list_view_date(self.model.updatedDate)

    @property
    def created(self):  # noqa: D102
        return format_list_view_date(self.model.createdDate)

    @property
    def shared(self):  # noqa: D102
        return "Yes" if self.model.sharedWithOrgs or self.model.sharedWithTeams else "No"

    @property
    def status(self):  # noqa: D102
        return str_(self.model.status)

    @property
    def size(self):  # noqa: D102
        return (
            human_size(self.model.totalSizeInBytes)
            if hasattr(self.model, "totalSizeInBytes")
            else human_size(self.model.latestVersionSizeInBytes) or ""
        )

    @property
    def repository(self):  # noqa: D102
        return format_repo(self.model.orgName, self.model.teamName, self.model.name)

    @property
    def version(self):  # noqa: D102
        return (
            str_(self.model.latestVersionIdStr)
            if hasattr(self.model, "latestVersionIdStr")
            else str_(self.model.versionId)
        )

    @property
    def application(self):  # noqa: D102
        return str_(self.model.application)

    @property
    def framework(self):  # noqa: D102
        return str_(self.model.framework)

    @property
    def precision(self):  # noqa: D102
        return str_(self.model.precision)

    @property
    def permission(self):  # noqa: D102
        return derive_permission(self.model.guestAccess, self._is_guest_mode)

    @property
    def accuracy(self):  # noqa: D102
        return str_(self.model.accuracyReached) if hasattr(self.model, "accuracyReached") else ""

    @property
    def epochs(self):  # noqa: D102
        return str_(self.model.numberOfEpochs) if hasattr(self.model, "numberOfEpochs") else ""

    @property
    def batch(self):  # noqa: D102
        return str_(self.model.batchSize) if hasattr(self.model, "batchSize") else ""

    @property
    def gpu(self):  # noqa: D102
        return str_(self.model.gpuModel) if hasattr(self.model, "gpuModel") else ""

    @property
    def memory(self):  # noqa: D102
        return str_(self.model.memoryFootprint) if hasattr(self.model, "memoryFootprint") else ""

    @property
    def labels(self):  # noqa: D102
        lbls = []
        if not self.model.labels:
            return ""

        for each in self.model.labels:
            if each["key"] == "general":
                lbls.extend(each["values"])

        return ", ".join(lbls)

    @property
    def bias(self):  # noqa: D102
        return getattr(self.model, "bias", "")

    @property
    def explainability(self):  # noqa: D102
        return getattr(self.model, "explainability", "")

    @property
    def privacy(self):  # noqa: D102
        return getattr(self.model, "privacy", "")

    @property
    def safetyAndSecurity(self):  # noqa: D102
        return getattr(self.model, "safetyAndSecurity", "")

    @property
    def productNames(self):  # noqa: D102
        labels = self.model.labels
        if not labels:
            return ""
        products = []
        for each in labels:
            if each["key"] == "productNames":
                products.extend(each["values"])
        return ", ".join(products)

    @property
    def accessType(self):  # noqa: D102
        return str_(self.model.accessType) if hasattr(self.model, "accessType") else ""

    @property
    def licenseTerms(self):  # noqa: D102
        return str_(self.model.licenseTerms) if hasattr(self.model, "licenseTerms") else []

    @property
    def isSigned(self):
        """This indicate if version is signed."""  # noqa: D404
        return str(getattr(self.model, "isSigned", False))

    @property
    def hasSignedVersion(self):
        """This indicate if at least one of containing versions is signed."""  # noqa: D404
        return str(bool(getattr(self.model, "hasSignedVersion", False)))
