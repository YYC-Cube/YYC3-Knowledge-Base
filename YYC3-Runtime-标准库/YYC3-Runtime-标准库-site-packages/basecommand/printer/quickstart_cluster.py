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

from ngcbase.constants import MiB
from ngcbase.printer.nvPrettyPrint import NVPrettyPrint
from ngcbase.util.file_utils import human_size


class QuickStartClusterPrinter(NVPrettyPrint):
    """The printer is responsible for printing objects and lists of objects of the associated type."""

    def print_cluster_list(self, cluster_list, columns=None):
        """Handles the output for `ngc base-command quickstart cluster list`."""  # noqa: D401
        if self.format_type == "json":
            output = cluster_list
        else:
            output = []
            if not columns:
                columns = [
                    ("additionalInfo", "Additional Info"),
                    ("id", "ID"),
                    ("name", "Name"),
                    ("org", "Org"),
                    ("team", "Team"),
                    ("status", "Status"),
                    ("type", "Type"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            for cluster in cluster_list:
                out = ClusterOutput(cluster)
                output.append([getattr(out, col, None) for col in cols])
        self.print_data(output, True)

    def print_instance_types(self, component_list):  # noqa: D102
        if self.format_type == "json":
            self.print_data(component_list)
        else:
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Instance Types Information")
            tbl.add_separator_line()
            for comp in component_list.clusterComponents:
                comp_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                comp_tbl.set_title(f"Component Name: {comp.componentName}", style="underline")
                for itype in comp.instanceTypes:
                    comp_tbl.add_label_line("Machine Type", itype.machineType, level=1)
                    comp_tbl.add_label_line("Description", itype.description, level=1)
                    comp_tbl.add_label_line("CPU Cores", itype.cpuCores, level=1)
                    comp_tbl.add_label_line("System Memory", human_size(itype.systemMemory * MiB), level=1)
                    comp_tbl.add_label_line("GPUs", itype.gpus, level=1)
                    comp_tbl.add_label_line("GPU Memory", human_size(itype.gpuMemory * MiB), level=1)
                tbl.add_separator_line()
            tbl.print()

    def print_info(self, info):
        """Both the cluster info and project info need to display the same cluster info, so it has been refactored into
        a separate method.
        """  # noqa: D205
        tbl = self.create_output(header=False, outline=True) if self.format_type == "ascii" else None
        self.create_cluster_info_output(info=info, tbl=tbl)
        if tbl:
            tbl.print()

    def create_cluster_info_output(self, info, tbl, initial_sep=True):
        """Refactored the output creation to a separate method so it can be reused by the quickstart_project printer."""
        info = info.clusterInfo if hasattr(info, "clusterInfo") else info
        status = info.clusterStatus
        if self.format_type == "json":
            self.print_data(info)
            return tbl
        params = info.params
        if initial_sep:
            tbl.add_separator_line()
        tbl.set_title("Cluster Information")
        # summary info
        tbl.add_label_line("Name", params.name)
        tbl.add_label_line("ACE", params.ace)
        tbl.add_label_line("Org", status.org)
        tbl.add_label_line("Team", status.team)
        tbl.add_label_line("Container Image", params.containerImage)
        tbl.add_label_line("Data Output Mount Point", params.dataOutputMountPoint)
        tbl.add_label_line("Cluster Lifetime", params.clusterLifetime)
        tbl.add_label_line("# of Workers", params.nworkers)
        # Requested open ports
        aop = params.additionalOpenPorts or []
        tbl.add_label_line("Additional Open Ports", ", ".join([f"{p}" for p in aop]))
        pkg_tbl = self.add_sub_table(header=False, outline=True)
        pkg_tbl.set_title("Packages")
        pkg_tbl.add_label_line("Conda Packages")
        for pkg in params.condaPackages or []:
            if pkg:
                pkg_tbl.add_label_line("", pkg)
        pkg_tbl.add_label_line("Pip Packages")
        for pkg in params.pipPackages or []:
            if pkg:
                pkg_tbl.add_label_line("", pkg)
        pkg_tbl.add_label_line("System Packages")
        for pkg in params.systemPackages or []:
            if pkg:
                pkg_tbl.add_label_line("", pkg)
        # Cluster Status
        stat_tbl = self.add_sub_table(header=False, outline=True)
        stat_tbl.set_title("Cluster Status")
        stat_tbl.add_label_line("ID", status.id)
        stat_tbl.add_label_line("Type", status.type)
        stat_tbl.add_label_line("Status", status.status)
        stat_tbl.add_label_line("Name", status.name)
        stat_tbl.add_label_line("Additional Info", status.additionalInfo)
        # Telemetry
        telemetry = info.telemetry
        util = "n/a" if telemetry is None else telemetry.gpuUtilization
        active = "n/a" if telemetry is None else telemetry.gpuActiveTime
        telem_tbl = self.add_sub_table(header=False, outline=True)
        telem_tbl.set_title("Telemetry")
        telem_tbl.add_label_line("GPU Utilization", util)
        telem_tbl.add_label_line("GPU Active Time", active)
        # Cluster URLs
        url = info.URLs
        url_tbl = self.add_sub_table(header=False, outline=True)
        url_tbl.set_title("URLs")
        if url:
            url_tbl.add_label_line("Dashboard", url.dashboard)
            url_tbl.add_label_line("Scheduler", url.scheduler)
            url_tbl.add_label_line("Telemetry", url.telemetry)
            url_tbl.add_label_line("Additional Open Ports")
            for aop in url.additionalOpenPorts or []:
                url_tbl.add_label_line("URL", aop.url, level=1)
                url_tbl.add_label_line("Port", aop.port, level=1)
        # Worker
        if params.worker:
            work_tbl = self.add_sub_table(header=False, outline=True)
            work_tbl.set_title("Worker Info")
            work_tbl.add_label_line("Dashboard Address", params.worker.dashboardAddress)
            work_tbl.add_label_line("Startup Script", params.worker.startupScript)
            work_tbl.add_label_line("Instance Type", params.worker.instanceType)
            if params.worker.envVariables:
                work_vars = ",".join([f"{ev.name}: {ev.value}" for ev in params.worker.envVariables])
            else:
                work_vars = ""
            work_tbl.add_label_line("Environment Variables", work_vars, level=1)
        # Scheduler
        if params.scheduler:
            sched_tbl = self.add_sub_table(header=False, outline=True)
            sched_tbl.set_title("Scheduler Info")
            sched_tbl.add_label_line("Dashboard Address", params.scheduler.dashboardAddress)
            sched_tbl.add_label_line("Startup Script", params.scheduler.startupScript)
            sched_tbl.add_label_line("Instance Type", params.scheduler.instanceType)
            sched_tbl.add_label_line("Scheduler Port", params.schedulerPort)
            if params.scheduler.envVariables:
                sched_vars = ",".join([f"{ev.name}: {ev.value}" for ev in params.scheduler.envVariables])
            else:
                sched_vars = ""
            sched_tbl.add_label_line("Environment Variables", sched_vars, level=1)
        # Data Input
        out_tbl = self.add_sub_table(header=False, outline=True, detail_style=False)
        out_tbl.set_title("Data Input")
        dsm_tbl = self.add_sub_table(parent_table=out_tbl, header=False, outline=True)
        dsm_tbl.set_title("Dataset Mounts", style="bold blue")
        dsms = getattr(params.dataInput, "datasetMounts", []) or []
        for dm in dsms:
            dsm_tbl.add_label_line("ID", dm.id)
            dsm_tbl.add_label_line("Mount Point", dm.mountPoint)

        wsm_tbl = self.add_sub_table(parent_table=out_tbl, header=False, outline=True)
        wsm_tbl.set_title("Workspace Mounts", style="bold blue")
        wsms = getattr(params.dataInput, "workspaceMounts", []) or []
        for wm in wsms:
            wsm_tbl.add_label_line("ID", wm.id)
            wsm_tbl.add_label_line("Mount Point", wm.mountPoint)
            wsm_tbl.add_label_line("Read-write", wm.rw)
        tbl.add_separator_line()
        return tbl

    def _print_basic_response(self, title, data):
        if self.format_type == "json":
            self.print_data(data)
            return
        tbl = self.create_output(header=False, outline=True)
        tbl.add_separator_line()
        tbl.set_title(title)
        tbl.add_label_line("ID", data.id)
        tbl.add_label_line("Name", data.name)
        tbl.add_label_line("Status", data.status)
        tbl.add_label_line("Additional Info", data.additionalInfo)
        tbl.add_separator_line()
        tbl.print()

    def print_status(self, status):  # noqa: D102
        self._print_basic_response("Cluster Status", status)

    def print_remove(self, remove_info):  # noqa: D102
        self._print_basic_response("Cluster Deleted", remove_info)

    def print_stop(self, stop_info):  # noqa: D102
        self._print_basic_response("Cluster Stop", stop_info)

    def print_start(self, start_info):  # noqa: D102
        self._print_basic_response("Cluster Start", start_info)

    def print_create(self, cluster_resp):  # noqa: D102
        self._print_basic_response("Cluster Creation", cluster_resp)

    def print_update(self, cluster_resp):  # noqa: D102
        self._print_basic_response("Cluster Update", cluster_resp)


class ClusterOutput:  # noqa: D101
    def __init__(self, cluster):
        self.cluster = cluster

    @property
    def additionalInfo(self):  # noqa: D102
        return self.cluster.additionalInfo

    @property
    def id(self):  # noqa: D102
        return self.cluster.id

    @property
    def name(self):  # noqa: D102
        return self.cluster.name

    @property
    def org(self):  # noqa: D102
        return self.cluster.org

    @property
    def status(self):  # noqa: D102
        return self.cluster.status

    @property
    def team(self):  # noqa: D102
        return self.cluster.team

    @property
    def type(self):  # noqa: D102
        return self.cluster.type
