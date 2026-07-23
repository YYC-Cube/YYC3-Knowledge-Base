#
# Copyright (c) 2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from itertools import chain

from ngcbase.printer.nvPrettyPrint import NVPrettyPrint, str_


class CollectionPrinter(NVPrettyPrint):
    """Class to encapsulate printing behavior for Collections."""

    @staticmethod
    def _add_collection_base_lines(tbl, collection):
        tbl.add_separator_line()
        tbl.set_title("Collection Information")
        tbl.add_label_line("Name", collection.name)
        tbl.add_label_line("Org", collection.orgName)
        tbl.add_label_line("Team", collection.teamName)
        tbl.add_label_line("Display Name", collection.displayName)
        tbl.add_label_line("Logo", collection.logo)
        tbl.add_label_line("Built By", collection.builtBy)
        tbl.add_label_line("Publisher", collection.publisher)
        tbl.add_label_line("Created Date", collection.createdDate)
        tbl.add_label_line("Updated Date", collection.updatedDate)
        tbl.add_label_line("Short Description", collection.shortDescription)
        tbl.add_label_line("Category", collection.category)
        tbl.add_label_line("Labels")
        for label in collection.labels or []:
            tbl.add_label_line("", label)

    def _add_overview_lines(self, collection):
        overview_tbl = self.add_sub_table(outline=True, detail_style=False)
        overview_tbl.set_title("Overview")
        for line in collection.description.splitlines():
            overview_tbl.add_line(line, level=-1)

    def print_collection_info(self, collection, artifact_dict):
        """Parse out Collection and associated artifacts into a table."""
        if self.format_type == "json":
            # Need to combine API calls into a single dict for JSON processing
            lines = collection.toDict()
            for key, artifacts in artifact_dict.items():
                lines[key.lower()] = []
                for artifact in artifacts:
                    lines[key.lower()].append(artifact.toDict())
            self.print_data(lines)
        else:
            tbl = self.create_output(header=False)
            self._add_collection_base_lines(tbl, collection)
            for header, items in artifact_dict.items():
                tbl.add_label_line(header)
                for artifact in items:
                    artifact_line = [artifact.orgName if artifact.orgName else ""]
                    if artifact.teamName:
                        artifact_line.append(artifact.teamName)
                    artifact_line.append(artifact.name)
                    artifact_line = "/".join(artifact_line)
                    tbl.add_label_line("", artifact_line)

            if collection.description:
                self._add_overview_lines(collection)
            tbl.add_separator_line()
            tbl.print()

    def print_collection_create_results(self, collection, request_status_dict, errored_dict):
        """Parse out collection and successful artifact requests.  Print out bad ones as the end."""
        if self.format_type == "json":
            lines = collection.toDict()
            for header, request_status_list in request_status_dict.items():
                lines[header.lower()] = []
                # RequestStatuses don't have names, so expecting a tuple of (name, RequestStatus)
                for name, request_status in request_status_list:
                    lines[header.lower()].append({"name": name, "requestStatus": request_status.toDict()})

            for header, request_status_list in errored_dict.items():
                if not lines[header.lower()]:
                    lines[header.lower()] = []
                for name, request_status in request_status_list:
                    lines[header.lower()].append({"name": name, "requestStatus": request_status.toDict()})
            self.print_data(lines)
            self.print_artifact_put_errors(errored_dict, collection.name)
            return
        tbl = self.create_output(header=False)
        self._add_collection_base_lines(tbl, collection)

        for header, request_status_list in request_status_dict.items():
            if not request_status_list:
                continue
            stat_tbl = self.add_sub_table(outline=True, detail_style=False)
            stat_tbl.set_title(header)
            for name, _ in request_status_list:
                stat_tbl.add_label_line("", name)

        self._add_overview_lines(collection)
        tbl.add_separator_line()
        tbl.print()

        self.print_artifact_put_errors(errored_dict, collection.name)

    def print_collection_list(self, collection_pages_gen, columns=None):
        """Print details for a list of collections."""
        output = []

        if self.format_type == "json":
            output = chain(*collection_pages_gen) or []
        else:
            if not columns:
                columns = list(CollectionOutput.PROPERTY_HEADER_MAPPING_DEFAULTS.items())
            view = self.generate_collection_list
            output = view(collection_pages_gen, columns)

        self.print_data(output, is_table=True)

    @staticmethod
    def generate_collection_list(collection_pages_gen, columns):
        """Method for aggregating a list of collection data filtered by the provided columns argument from a pages
        generator.
        """  # noqa: D205, D401
        cols, disp = zip(*columns)
        yield list(disp)

        for page in collection_pages_gen or []:
            for collection in page or []:
                out = CollectionOutput(collection)
                yield [getattr(out, col, None) for col in cols]

    def print_artifact_put_errors(self, artifact_error_dict, collection_name):
        """Print out artifacts that were not able to PUT and format their RequestStatuses."""
        for _, request_status_list in artifact_error_dict.items():
            for name, request_status in request_status_list:
                self.print_error(
                    f"Unable to add '{name}' to collection '{collection_name}'.  "
                    f"Description: {request_status.statusDescription}"
                )

    def print_artifact_delete_errors(self, artifact_error_dict, collection_name):
        """Print out artifacts that were not able to be DELETED and format their RequestStatuses."""
        for _, request_status_list in artifact_error_dict.items():
            for name, request_status in request_status_list:
                self.print_error(
                    f"Unable to remove '{name}' from collection '{collection_name}'.  "
                    f"Description: {request_status.statusDescription}"
                )


class CollectionOutput:
    """Collection list printer view."""

    PROPERTY_HEADER_MAPPING = {
        "display_name": "Display Name",
        "name": "Name",
        "created_date": "Created Date",
        "updated_date": "Updated Date",
        "category": "Category",
        "org": "Org",
        "team": "Team",
        "labels": "Labels",
        "accessType": "Access Type",
        "productNames": "Associated Products",
    }

    PROPERTY_HEADER_MAPPING_DEFAULTS = {
        "display_name": "Display Name",
        "name": "Name",
        "created_date": "Created Date",
        "updated_date": "Updated Date",
        "accessType": "Access Type",
        "productNames": "Associated Products",
    }

    def __init__(self, collection):
        self.collection = collection

    @staticmethod
    def _joinedget(obj, attr_list, delimiter):
        """Return a function capable of generically joining multiple getattr calls on an object."""
        result = []
        for attr in attr_list:
            elem = getattr(obj, attr)
            if elem:
                result.append(elem)
        return delimiter.join(result)

    @property
    def display_name(self):  # noqa: D102
        return self.collection.displayName

    @property
    def name(self):  # noqa: D102
        return self._joinedget(self.collection, ("orgName", "teamName", "name"), "/")

    @property
    def category(self):  # noqa: D102
        return self.collection.category

    @property
    def created_by(self):  # noqa: D102
        return self.collection.createdBy

    @property
    def created_date(self):  # noqa: D102
        return self.collection.createdDate

    @property
    def updated_date(self):  # noqa: D102
        return self.collection.updatedDate

    @property
    def built_by(self):  # noqa: D102
        return self.collection.builtBy

    @property
    def org(self):  # noqa: D102
        return self.collection.orgName

    @property
    def team(self):  # noqa: D102
        return self.collection.teamName

    @property
    def labels(self):  # noqa: D102
        lbls = []
        if not self.collection.labels:
            return ""

        for each in self.collection.labels:
            if each["key"] == "general":
                lbls.extend(each["values"])

        return ", ".join(lbls)

    @property
    def productNames(self):  # noqa: D102
        labels = self.collection.labels
        if not labels:
            return ""
        products = []
        for each in labels:
            if each["key"] == "productNames":
                products.extend(each["values"])
        return ", ".join(products)

    @property
    def accessType(self):  # noqa: D102
        return str_(self.collection.accessType) if hasattr(self.collection, "accessType") else ""
