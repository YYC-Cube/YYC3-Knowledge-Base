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
import collections
import itertools

from ngcbase.printer.nvPrettyPrint import (
    format_date,
    GeneralWrapper,
    generate_columns_list,
    NVPrettyPrint,
)
from ngcbase.util.file_utils import convert_mib_to_gib

USAGE_RESOURCE_TYPES = {
    "GPU": "GPU Status",
    "MIG": "GPU Status",
    "CPU": "CPU Status",
}
USAGE_HEADER_NAMES = {
    "productName": "Resource",
    "type": "Type",
    "totalCount": "Total",
    "freeCount": "Free",
    "inUseCount": "In use",
    "unavailableCount": "Unavailable",
}


class AcePrinter(NVPrettyPrint):
    """The printer is responsible for printing ACE ouput."""

    def print_ace_list(self, ace_list, columns=None):  # noqa: D102
        list_of_aces = []
        if self.format_type == "json":
            for ace in ace_list or []:
                list_of_aces.append(ace)
        else:
            if not columns:
                columns = [("name", "ACE"), ("id", "Id"), ("description", "Description"), ("instances", "Instances")]
            list_of_aces = generate_columns_list([ace_list], columns)
        self.print_data(list_of_aces, is_table=True)

    def print_ace(self, ace):  # noqa: D102
        if self.format_type == "json":
            ace_dict = ace.toDict()
            self.print_data(GeneralWrapper.from_dict(ace_dict))
        else:
            tbl = self.create_output()
            tbl.add_separator_line()
            tbl.set_title("ACE Information")
            tbl.add_label_line("Name", ace.name)
            tbl.add_label_line("Id", ace.id)
            tbl.add_label_line("Type", ace.type)
            tbl.add_label_line("Created Date", format_date(ace.createdDate))
            tbl.add_label_line("Created By", format_date(ace.createdBy))
            tbl.add_label_line("Description", ace.description)
            tbl.add_label_line("Auto Configuration Enabled", ace.isAutoConfigurationEnabled)
            tbl.add_label_line("Provider", ace.provider)
            tbl.add_label_line("Storage Service Url", ace.storageServiceUrl)
            tbl.add_label_line("Proxy Service Url", ace.proxyServiceUrl)
            tbl.add_label_line("Allow Exposed Port", ace.allowExposedPort)
            tbl.add_label_line("GRPC Enabled", ace.grpcEnabled)
            tbl.add_label_line("Max Runtime Seconds", ace.maxRuntimeSeconds)
            if ace.topologyTypes:
                tbl.add_label_line("Topology types", ace.topologyTypes)

            if ace.storageServiceConfig:
                sc_tbl = self.add_sub_table(outline=False, level=1)
                sc_tbl.set_title("Storage Configurations")
                for sc in ace.storageServiceConfig or []:
                    sc_tbl.add_separator_line()
                    sc_tbl.add_label_line("Id", sc.storageClusterUuid)
                    sc_tbl.add_label_line("Name", sc.name)
                    sc_tbl.add_label_line("Type", sc.type)
                    sc_tbl.add_label_line("Description", sc.description)
                    sc_tbl.add_label_line("Default", sc.isDefault)
                    sc_tbl.add_label_line("Initial Default Quota", f"{sc.initialDefaultQuotaSizeGb} GiB")
                    sc_tbl.add_label_line("Max Quota", f"{sc.maxQuotaSizeGb} GiB")
                    sc_tbl.add_label_line("Inbound Http Disabled", sc.inboundHttpDisabled)
                    sc_tbl.add_label_line("API Port", sc.apiPort)
                    sc_tbl.add_label_line("GRPC Port", sc.grpcPort)
                    sc_tbl.add_label_line("SFTP Port", sc.sftpPort)

            if ace.instances is not None:
                instance_tbl = self.add_sub_table(outline=False, level=1)
                instance_tbl.set_title("Instances")
                for instance in ace.instances or []:
                    instance_tbl.add_separator_line()
                    memory_gib = convert_mib_to_gib(instance.systemMemory)
                    # gpuMemory attribute is not always populated.
                    gpu_mem_gib = 0
                    if instance.gpuMemory:
                        gpu_mem_gib = convert_mib_to_gib(instance.gpuMemory)
                    instance_tbl.add_label_line("Name", instance.name)
                    if instance.gpus:
                        instance_tbl.add_label_line("GPUs", instance.gpus)
                    instance_tbl.add_label_line("GPU Mem", f"{gpu_mem_gib} GiB")
                    instance_tbl.add_label_line("GPU Power", f"{instance.maxPowerLimit} W")
                    instance_tbl.add_label_line("CPUs", instance.cpuCores)
                    instance_tbl.add_label_line("System Mem", f"{memory_gib} GiB")
                    instance_tbl.add_label_line("Allow Multinode", instance.allowMultinode)
                    instance_tbl.add_label_line("Allow Multinode Preemptable", instance.allowMultinodePreemptable)
                    if instance.multiNodeSupportedArrayTypes:
                        instance_tbl.add_label_line("Multi-node Types", instance.multiNodeSupportedArrayTypes)
                    if instance.multiNodeSupportedDefaultArrayType:
                        instance_tbl.add_label_line(
                            "Multi-node Default Type", instance.multiNodeSupportedDefaultArrayType
                        )
                    if instance.type:
                        instance_tbl.add_label_line("Type", instance.type)
                    if instance.type == "MIG" and instance.migSlice and instance.migTotalSlice:
                        instance_tbl.add_label_line("MIG", f"{instance.migSlice}/{instance.migTotalSlice}")
                    if instance.raidFileSystemGB:
                        instance_tbl.add_label_line("Raid File System", f"{instance.raidFileSystemGB} GiB")
                    if instance.rootFileSystemGB:
                        instance_tbl.add_label_line("Root File System", f"{instance.rootFileSystemGB} GiB")
            tbl.add_separator_line()
            tbl.print()

    def print_ace_usage(self, ace_usage, *, is_showing_all_resources: bool = True):  # noqa: D102
        # EARLY RETURN
        if self.format_type != "ascii":
            self.print_data(ace_usage)
            return
        if not ace_usage:
            self.print_error("No matching resources.")
            return

        categorized_resource_lists = {key: [] for key in USAGE_RESOURCE_TYPES.keys()}
        for item in ace_usage:
            categorized_resource_lists[item["type"]].append(item)

        sectioned_resource_lists = {}
        for resource_type, items in categorized_resource_lists.items():
            section_name = USAGE_RESOURCE_TYPES[resource_type]
            sectioned_resource_lists.setdefault(section_name, []).extend(items)

        countable_fields = ["inUseCount", "freeCount", "unavailableCount", "totalCount"]

        if not is_showing_all_resources:
            # Group them back together based off their type.
            resources = list(itertools.chain(*categorized_resource_lists.values()))
            summary_counts = collections.Counter()
            for item in resources:
                for field in countable_fields:
                    summary_counts[field] += item.get(field, 0)
            self._print_ace_usage_resources(resources, summary_counts)
        else:
            for section_name, resources in sectioned_resource_lists.items():
                # EARLY CONTINUE
                if not resources:
                    continue
                summary_counts = collections.Counter()
                for item in resources:
                    for field in countable_fields:
                        summary_counts[field] += item.get(field, 0)
                self._print_ace_usage_section_summary(section_name, summary_counts)
                self._print_ace_usage_resources(resources, summary_counts)

    def _print_ace_usage_section_summary(self, section_name, summary_counts):
        tbl = self.create_output()
        tbl.add_separator_line()
        tbl.set_title(section_name)
        tbl.add_label_line(USAGE_HEADER_NAMES["inUseCount"], summary_counts["inUseCount"])
        tbl.add_label_line(USAGE_HEADER_NAMES["freeCount"], summary_counts["freeCount"])
        if summary_counts["unavailableCount"]:
            tbl.add_label_line(USAGE_HEADER_NAMES["unavailableCount"], summary_counts["unavailableCount"])
        tbl.add_label_line(USAGE_HEADER_NAMES["totalCount"], summary_counts["totalCount"])
        tbl.print()

    def _print_ace_usage_resources(self, resource_list, summary_counts):
        columns_to_print = list(USAGE_HEADER_NAMES.keys())
        if not summary_counts["unavailableCount"]:
            # Don't put the unavailable column if we don't have anything unavailable
            columns_to_print.remove("unavailableCount")

        table_data = []
        table_data.append([USAGE_HEADER_NAMES[key] for key in columns_to_print])

        def _get_table_value(key, full_item):
            value = full_item.get(key, "")
            if key == "unavailableCount" and value == 0:
                return ""
            return value

        for item in resource_list:
            table_data.append([_get_table_value(key, item) for key in columns_to_print])

        self.print_data(table_data, is_table=True)
