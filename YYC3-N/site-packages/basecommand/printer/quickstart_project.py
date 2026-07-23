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
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from basecommand.printer.quickstart_cluster import QuickStartClusterPrinter
from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class QuickStartProjectPrinter(NVPrettyPrint):
    """The printer is responsible for printing objects and lists of objects of the associated type."""

    def print_project_list(self, project_list, columns=None):
        """Handles the output for `ngc base-command quickstart project list`."""  # noqa: D401
        if self.format_type == "json":
            self.print_data(project_list)
            return
        if not columns:
            columns = [
                ("id", "ID"),
                ("name", "Name"),
                ("description", "Description"),
                ("ace", "ACE"),
                ("owner", "Owner"),
                ("org", "Org"),
                ("team", "Team"),
            ]
        cols, disp = zip(*columns)
        output = [list(disp)]
        for project in project_list:
            out = ProjectOutput(project)
            output.append([getattr(out, col, None) for col in cols])
        self.print_data(output, True)

    def _print_basic_response(self, title, data):
        if self.format_type == "json":
            self.print_data(data)
            return
        tbl = self.create_output(header=False, outline=True)
        tbl.add_separator_line()
        tbl.set_title(title)
        tbl.add_label_line("Name", data.name)
        tbl.add_label_line("ID", data.id)
        if hasattr(data, "additionalInfo"):
            tbl.add_label_line("Additional Info", data.additionalInfo)
        tbl.add_separator_line()
        tbl.print()

    def print_create(self, project_resp):  # noqa: D102
        self._print_basic_response("Project Creation", project_resp)

    def print_update(self, project_resp):  # noqa: D102
        self._print_basic_response("Project Update", project_resp)

    def print_info(self, info_resp):  # noqa: D102
        if self.format_type == "json":
            self.print_data(info_resp)
            return
        project = ProjectOutput(info_resp.projectInfo)
        cluster_info = info_resp.clusterInfo
        tbl = self.create_output(header=False, outline=True)
        tbl.add_separator_line()
        tbl.set_title("Project Information")
        tbl.add_label_line("Name", project.name)
        tbl.add_label_line("ID", project.id)
        tbl.add_label_line("Description", project.description)
        tbl.add_label_line("ACE", project.ace)
        tbl.add_label_line("Owner", project.owner)
        tbl.add_label_line("Org", project.org)
        tbl.add_label_line("Team", project.team)
        tbl.add_separator_line()

        cluster_tbl = self.add_sub_table(header=False, outline=True, detail_style=False)
        if cluster_info:
            dcp = QuickStartClusterPrinter(format_type=self.format_type, is_guest_mode=self.is_guest_mode)
            dcp.main_table = self.main_table
            dcp.inner_tables = self.inner_tables
            dcp.create_cluster_info_output(cluster_info, cluster_tbl, initial_sep=False)
        else:
            cluster_tbl.set_title("Cluster Information")
            cluster_tbl.add_line("-none-", level=4, ignore_rich_indent=True)
            cluster_tbl.set_min_width(20)
            tbl.add_separator_line()
        tbl.print()

    def print_remove(self, remove_info):  # noqa: D102
        self._print_basic_response("Project Deleted", remove_info)

    def _print_cluster_response(self, title, data):
        if self.format_type == "json":
            self.print_data(data)
            return
        tbl = self.create_output(header=False, outline=True)
        tbl.add_separator_line()
        tbl.set_title(title)
        tbl.add_label_line("Name", data.name)
        tbl.add_label_line("ID", data.id)
        tbl.add_label_line("Type", data.type)
        tbl.add_label_line("Status", data.status)
        tbl.add_label_line("Additional Info", data.additionalInfo)
        tbl.add_separator_line()
        tbl.print()

    def print_add_cluster(self, cluster_resp):  # noqa: D102
        self._print_cluster_response("Cluster Created for Project", cluster_resp)

    def print_remove_cluster(self, cluster_resp):  # noqa: D102
        self._print_cluster_response("Cluster Removed from Project", cluster_resp)

    def print_create_template(self, template_resp):  # noqa: D102
        self._print_basic_response("Template Created", template_resp)

    def print_update_template(self, template_resp):  # noqa: D102
        self._print_basic_response("Template Updated", template_resp)

    def print_remove_template(self, template_id, template_name):  # noqa: D102
        if self.format_type == "json":
            self.print_data({"id": template_id, "name": template_name})
            return
        tbl = self.create_output(header=False, outline=True)
        tbl.add_separator_line()
        tbl.set_title("Template Deleted")
        tbl.add_label_line("Name", template_name)
        tbl.add_label_line("ID", template_id)
        tbl.add_separator_line()
        tbl.print()

    def print_info_template(self, info_resp):  # noqa: D102
        if self.format_type == "json":
            self.print_data(info_resp)
            return
        template = TemplateInfoOutput(info_resp)
        tbl = self.create_output(header=False, outline=True)
        tbl.add_separator_line()
        tbl.set_title("Template Information")
        tbl.add_label_line("Name", template.name)
        tbl.add_label_line("ID", template.id)
        tbl.add_label_line("Description", template.description)
        tbl.add_label_line("Display Image URL", template.displayImageURL)
        tbl.add_separator_line()
        tbl.print()

    def print_template_list(self, template_list, columns=None):
        """Handles the output for `ngc base-command quickstart project template-list`."""  # noqa: D401
        if self.format_type == "json":
            output = template_list.toDict()
        else:
            if not columns:
                columns = [
                    ("id", "ID"),
                    ("name", "Name"),
                    ("description", "Description"),
                    ("display_image_url", "Display Image"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for template in template_list.templates:
                out = TemplateOutput(template)
                output.append([getattr(out, col, None) for col in cols])
        self.print_data(output, True)


class ProjectOutput:  # noqa: D101
    def __init__(self, project):
        self.project = project
        self.params = project.params

    @property
    def ace(self):  # noqa: D102
        return self.project.ace

    @property
    def description(self):  # noqa: D102
        return self.params.description

    @property
    def id(self):  # noqa: D102
        return self.project.id

    @property
    def name(self):  # noqa: D102
        return self.params.name

    @property
    def org(self):  # noqa: D102
        return self.project.org

    @property
    def owner(self):  # noqa: D102
        return self.project.owner

    @property
    def team(self):  # noqa: D102
        return self.project.team


class TemplateOutput:  # noqa: D101
    def __init__(self, template):
        self.template = template

    @property
    def id(self):  # noqa: D102
        return self.template.id

    @property
    def description(self):  # noqa: D102
        return self.template.description

    @property
    def name(self):  # noqa: D102
        return self.template.name

    @property
    def display_image_url(self):  # noqa: D102
        return self.template.displayImageURL


class TemplateInfoOutput:  # noqa: D101
    def __init__(self, template):
        self.template = template
        self.params = template.params

    @property
    def id(self):  # noqa: D102
        return self.template.id

    @property
    def description(self):  # noqa: D102
        return self.params.description

    @property
    def displayImageURL(self):  # noqa: D102
        return self.params.displayImageURL

    @property
    def name(self):  # noqa: D102
        return self.params.name
