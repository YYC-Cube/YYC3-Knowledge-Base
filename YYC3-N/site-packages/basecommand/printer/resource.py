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

import time

from basecommand.printer.batch import (
    _convert_query_result_to_new_telemetry_format,
    _get_unique_elements_from_list_of_measurements,
)
from ngcbase.printer.nvPrettyPrint import NVPrettyPrint


class ResourcePrinter(NVPrettyPrint):
    """Forge Allocation Printer."""

    def print_list(self, pool_list, columns=None, child_pools=None):  # noqa: D102

        if self.format_type == "json":
            output = pool_list
        else:
            output = []
            if not columns:
                columns = [
                    ("id", "Id"),
                    ("poolType", "Type"),
                    ("description", "Description"),
                    ("resourceTypeName", "Resource Type"),
                ]
            cols, disp = zip(*columns)
            output = [list(disp)]
            if child_pools:
                pool_list = pool_list.get("pools", [])
                for pool in pool_list:
                    out = PoolOutput(pool)
                    output.append([getattr(out, col, "") or "" for col in cols])
            else:
                for pool in pool_list:
                    out = PoolOutput(pool.get("pool", {}))
                    output.append([getattr(out, col, "") or "" for col in cols])
        self.print_data(output, True)

    def print_info(self, resp):  # noqa: D102

        if self.format_type == "json":
            self.print_data(resp)
        else:
            output = PoolOutput(resp.get("pool", {}))
            outline_tbl = self.create_output(header=False, outline=True)
            tbl = self.add_sub_table(parent_table=outline_tbl, header=False, outline=False)
            tbl.add_separator_line()
            tbl.set_title("Pool Information")
            tbl.add_label_line("Id", output.id)
            tbl.add_label_line("Type", output.poolType)
            tbl.add_label_line("Description", output.description)
            tbl.add_label_line("Policy Configuration Ids", output.policyConfigurationIds)
            tbl.add_separator_line()
            for ra in output.resourceAllocations or []:
                ra_out = ResourceOutput(ra)
                ra_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                ra_tbl.set_title("Resource Information")
                ra_tbl.add_label_line("Priority Classes", ra_out.priorityClasses)
                ra_tbl.add_label_line("Share", ra_out.share)
                ra_tbl.add_label_line("Reservation Type", ra_out.reservationType)
                ra_tbl.add_label_line("Limit", ra_out.limit)
                ra_tbl.add_label_line("Reservation", ra_out.reservation)
                ra_tbl.add_label_line("Resource Type", ra_out.resourceTypeName)
                ra_tbl.add_separator_line()
            for rc in output.rootPoolCapacityDetails or []:
                rc_out = ResourceCapacity(rc)
                rc_tbl = self.add_sub_table(parent_table=tbl, outline=True, level=1)
                rc_tbl.set_title("Resource Capacity")
                rc_tbl.add_label_line("Resource Type", rc_out.resourceTypeName)
                rc_tbl.add_label_line("Total Capacity", rc_out.totalCapacity)
                rc_tbl.add_separator_line()
            tbl.print()

    def print_telemetry(self, measurements):  # noqa: D102
        if self.format_type == "json":
            list_of_measurements = measurements or []
        else:
            list_of_measurements = []
            column_added = False
            for measurement in measurements or []:
                if measurement and measurement.series:
                    for series in [_f for _f in measurement.series or [] if _f]:
                        tags = series.tags
                        if tags:
                            tag_key = tags[2].tagKey
                            tag_value = tags[2].tagValue
                        if not column_added:
                            # the column name comes from influx db and there has been a change in the way
                            # data is stored to fix the bug where it accidentally used to get overwritten.
                            # now the column name is actually the app telemetry name

                            # http://nvbugs/200520285
                            # we need to hardcode the column name as there is not much that we can do about it
                            _columns = ["Name", "Time", "Measurement"]
                            _columns = [self.ATRIB + x + self.ENDC for x in _columns]
                            list_of_measurements.append(_columns)
                            column_added = True

                        for value in series.values or []:
                            _value = value.value
                            if tags:
                                _value.insert(0, series.name + "_" + tag_key + "_" + tag_value)
                            else:
                                _value.insert(0, series.name)
                            list_of_measurements.append(_value)

        if list_of_measurements:
            # convert to new csv format
            if self.format_type == "csv":
                measurements_list = list_of_measurements

                # each mesurement result is formated as ['Name', 'Time', 'Measurement'] tuple
                #   index=0: get 'Name' field item
                #   index=1: get 'Time' field item
                name_list = _get_unique_elements_from_list_of_measurements(measurements_list, 0)
                time_list = _get_unique_elements_from_list_of_measurements(measurements_list, 1)

                # base on lambda function's time format to sort 'time_list'
                time_list.sort(key=lambda x: time.mktime(time.strptime(x, "%Y-%m-%dT%H:%M:%SZ")))

                # convert query result to chronological order csv format
                list_of_measurements = _convert_query_result_to_new_telemetry_format(
                    measurements_list, name_list, time_list
                )
        else:
            if self.format_type == "ascii":
                _columns = ["Name", "Time", "Measurement"]
            if self.format_type == "csv":
                _columns = [
                    "im_resource_manager_pool_limit_total",
                    "im_resource_manager_pool_share_total",
                    "im_resource_manager_pool_reservation_total",
                    "im_resource_manager_num_resources_needed_total",
                    "im_resource_manager_num_resources_consumed_total",
                    "im_resource_manager_active_rcrs_per_pool_total",
                    "im_resource_manager_pending_rcrs_per_pool_total",
                ]
                _columns.insert(0, "Time")

            list_of_measurements.append(_columns)

        self.print_data(list_of_measurements, is_table=True)


class PoolOutput:  # noqa: D101
    def __init__(self, pool):
        self.pool = pool

    @property
    def id(self):  # noqa: D102
        return self.pool.get("id", "")

    @property
    def poolType(self):  # noqa: D102
        return self.pool.get("poolType", "")

    @property
    def description(self):  # noqa: D102
        return self.pool.get("description", "")

    @property
    def resourceAllocations(self):  # noqa: D102
        return self.pool.get("resourceAllocations", [])

    @property
    def rootPoolCapacityDetails(self):  # noqa: D102
        return self.pool.get("rootPoolCapacityDetails", [])

    @property
    def policyConfigurationIds(self):  # noqa: D102
        return ", ".join(self.pool.get("policyConfigurationIds", []))

    @property
    def resourceTypeName(self):  # noqa: D102
        return ", ".join([r.get("resourceTypeName", "") if r else "" for r in self.pool.get("resourceAllocations", [])])


class ResourceCapacity:  # noqa: D101
    def __init__(self, resource):
        self.resource = resource

    @property
    def resourceTypeName(self):  # noqa: D102
        return self.resource.get("resourceTypeName", "")

    @property
    def totalCapacity(self):  # noqa: D102
        return self.resource.get("totalCapacity", "")


class ResourceOutput:  # noqa: D101
    def __init__(self, resource):
        self.resource = resource

    @property
    def priorityClasses(self):  # noqa: D102
        return ", ".join(self.resource.get("priorityClasses", []))

    @property
    def share(self):  # noqa: D102
        return self.resource.get("share", "")

    @property
    def reservationType(self):  # noqa: D102
        return self.resource.get("reservationType", "")

    @property
    def limit(self):  # noqa: D102
        return self.resource.get("limit", "")

    @property
    def reservation(self):  # noqa: D102
        return self.resource.get("reservation", "")

    @property
    def resourceTypeName(self):  # noqa: D102
        return self.resource.get("resourceTypeName", "")
