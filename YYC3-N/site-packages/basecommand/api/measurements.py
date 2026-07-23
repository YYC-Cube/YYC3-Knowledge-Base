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

from urllib.parse import quote

from basecommand.constants import TELEMETRY_TYPE_ENUM, TELEMETRY_TYPE_ENUM_STG
from basecommand.data.api.MeasurementResultListResponse import (
    MeasurementResultListResponse,
)
from ngcbase.constants import API_VERSION, BUILD_ENV, CANARY_ENV, PRODUCTION_ENV


class MeasurementsAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection

    @staticmethod
    def _construct_url(org_name, job_id, replica_id=None):
        replica_part = ""
        if replica_id is not None:
            replica_part = "replicas/{rep}/".format(rep=replica_id)
        url_method = "{api}/org/{org}/jobs/{job}/{rep}telemetry".format(
            api=API_VERSION, org=org_name, job=job_id, rep=replica_part
        )
        return url_method

    @staticmethod
    def _calc_period(interval_type, interval_time):
        """Convert legacy interval type and unit to period (seconds)."""
        if interval_type == "HOUR":
            period = interval_time * 60 * 60
        elif interval_type == "MINUTE":
            period = interval_time * 60
        elif interval_type == "SECOND":
            period = interval_time
        else:
            raise ValueError("ERROR: invalid interval type: '{}'".format(interval_type))

        return period

    @staticmethod
    def _construct_q_string(aggregation, to_date, from_date, period, qtype=None, stype=None):
        if qtype is None:
            q_type = TELEMETRY_TYPE_ENUM if BUILD_ENV in (PRODUCTION_ENV, CANARY_ENV) else TELEMETRY_TYPE_ENUM_STG
        else:
            q_type = qtype

        if stype == "DDN":
            if "NETWORK_STORAGE_TOTAL_READ_BYTES" in q_type:
                q_type.remove("NETWORK_STORAGE_TOTAL_READ_BYTES")
            if "NETWORK_STORAGE_TOTAL_WRITE_BYTES" in q_type:
                q_type.remove("NETWORK_STORAGE_TOTAL_WRITE_BYTES")
            if "NETWORK_STORAGE_TRANSPORT_RX_BYTES" in q_type:
                q_type.remove("NETWORK_STORAGE_TRANSPORT_RX_BYTES")
            if "NETWORK_STORAGE_TRANSPORT_TX_BYTES" in q_type:
                q_type.remove("NETWORK_STORAGE_TRANSPORT_TX_BYTES")

        q_list = []
        for item in q_type:
            q_sublist = (
                '{"type":"'
                + item
                + '","aggregation":"'
                + aggregation
                + '","toDate":"'
                + to_date
                + '","fromDate":"'
                + from_date
                + '","period":'
                + period
                + "}"
            )
            q_list.append(q_sublist)

            if item in (
                "GPU_UTILIZATION",
                "GPU_FI_PROF_PIPE_TENSOR_ACTIVE",
                "GPU_FI_PROF_DRAM_ACTIVE",
                "GPU_POWER_USAGE",
                "GPU_FB_USED",
                "GPU_FI_PROF_PCIE_RX_BYTES",
                "GPU_FI_PROF_PCIE_TX_BYTES",
                "GPU_NVLINK_BANDWIDTH_TOTAL",
                "GPU_NVLINK_TX_BYTES",
                "GPU_NVLINK_RX_BYTES",
            ):
                q_sublist = (
                    '{"type":"'
                    + item
                    + '","aggregation":"'
                    + aggregation
                    + '","toDate":"'
                    + to_date
                    + '","fromDate":"'
                    + from_date
                    + '","period":'
                    + period
                    + ',"groupBy":["gpu"]}'
                )
                q_list.append(q_sublist)
            elif item in (
                "NETWORK_LOCAL_STORAGE_RAID_TOTAL_READ_BYTES",
                "NETWORK_LOCAL_STORAGE_RAID_TOTAL_WRITE_BYTES",
                "NETWORK_LOCAL_STORAGE_ROOT_TOTAL_READ_BYTES",
                "NETWORK_LOCAL_STORAGE_ROOT_TOTAL_WRITE_BYTES",
                "NETWORK_LOCAL_STORAGE_RAID_SIZE_BYTES",
                "NETWORK_LOCAL_STORAGE_RAID_USAGE_BYTES",
                "NETWORK_LOCAL_STORAGE_ROOT_SIZE_BYTES",
                "NETWORK_LOCAL_STORAGE_ROOT_USAGE_BYTES",
                "NETWORK_STORAGE_TOTAL_READ_BYTES",
                "NETWORK_STORAGE_TOTAL_WRITE_BYTES",
                "NETWORK_STORAGE_TRANSPORT_RX_BYTES",
                "NETWORK_STORAGE_TRANSPORT_TX_BYTES",
            ):
                q_sublist = (
                    '{"type":"'
                    + item
                    + '","aggregation":"'
                    + aggregation
                    + '","toDate":"'
                    + to_date
                    + '","fromDate":"'
                    + from_date
                    + '","period":'
                    + period
                    + ',"groupBy":["mount","data_resource_type"]}'
                )
                q_list.append(q_sublist)
            elif item in (
                "NETWORK_RX_BYTES_TOTAL",
                "NETWORK_TX_BYTES_TOTAL",
                "NETWORK_RDMA_PORT_RX_BYTES",
                "NETWORK_RDMA_PORT_TX_BYTES",
                "NETWORK_RDMA_PORT_RATE_RX_BYTES",
                "NETWORK_RDMA_PORT_RATE_TX_BYTES",
            ):
                q_sublist = (
                    '{"type":"'
                    + item
                    + '","aggregation":"'
                    + aggregation
                    + '","toDate":"'
                    + to_date
                    + '","fromDate":"'
                    + from_date
                    + '","period":'
                    + period
                    + ',"groupBy":["interface"]}'
                )
                q_list.append(q_sublist)

        q_string = ",".join(q_list)
        return '{"measurements":[' + q_string + "]}"

    def get_all_job_measurements(  # noqa: D102
        self, org_name, job_id, replica_id, from_date, to_date, interval_type, interval_time, aggregation, types, stype
    ):

        period = self._calc_period(interval_type, interval_time)

        query = self._construct_q_string(
            aggregation=aggregation, to_date=to_date, from_date=from_date, period=str(period), qtype=types, stype=stype
        )

        base_url = self._construct_url(org_name, job_id, replica_id=replica_id)
        base_url = "{}?q={}&telemetry-v3-ui=true".format(base_url, quote(query))

        json = self.connection.make_api_request(
            "GET", base_url, auth_org=org_name, operation_name="get_all_job_telemetry"
        )
        return MeasurementResultListResponse(json).measurements
