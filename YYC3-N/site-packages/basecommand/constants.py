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

DATA_MOVER_SERVICE_URL_MAPPING = {
    "prod": "https://api.datamover.ngc.nvidia.com",
    "canary": "https://api.can.datamover.ngc.nvidia.com",
    "stg": "https://api.stg.datamover.ngc.nvidia.com",
    "dev": "https://api.dev.datamover.ngc.nvidia.com",
}


DATASET_SERVICE_URL_MAPPING = {
    "prod": "https://api.datasets.ngc.nvidia.com",
    "canary": "https://api.datasets.ngc.nvidia.com",
    "stg": "https://api.stg.datasets.ngc.nvidia.com",
    "dev": "https://api.dev.datasets.ngc.nvidia.com",
}


# TODO: NGC-15202: A global telementry type list before updating the MeasurementTypeEnum
TELEMETRY_TYPE_ENUM = [
    "APPLICATION_TELEMETRY",
    "CPU_UTILIZATION",
    "GPU_FB_USED",
    "GPU_FI_PROF_DRAM_ACTIVE",
    "GPU_FI_PROF_PCIE_RX_BYTES",
    "GPU_FI_PROF_PCIE_TX_BYTES",
    "GPU_FI_PROF_PIPE_TENSOR_ACTIVE",
    "GPU_NVLINK_BANDWIDTH_TOTAL",
    "GPU_NVLINK_RX_BYTES",
    "GPU_NVLINK_TX_BYTES",
    "GPU_POWER_USAGE",
    "GPU_UTILIZATION",
    "MEM_UTILIZATION",
    "NETWORK_LOCAL_STORAGE_RAID_SIZE_BYTES",
    "NETWORK_LOCAL_STORAGE_RAID_TOTAL_READ_BYTES",
    "NETWORK_LOCAL_STORAGE_RAID_TOTAL_WRITE_BYTES",
    "NETWORK_LOCAL_STORAGE_RAID_USAGE_BYTES",
    "NETWORK_LOCAL_STORAGE_ROOT_SIZE_BYTES",
    "NETWORK_LOCAL_STORAGE_ROOT_TOTAL_READ_BYTES",
    "NETWORK_LOCAL_STORAGE_ROOT_TOTAL_WRITE_BYTES",
    "NETWORK_LOCAL_STORAGE_ROOT_USAGE_BYTES",
    "NETWORK_RDMA_PORT_RX_BYTES",
    "NETWORK_RDMA_PORT_TX_BYTES",
    "NETWORK_RX_BYTES_TOTAL",
    "NETWORK_STORAGE_TOTAL_READ_BYTES",
    "NETWORK_STORAGE_TOTAL_WRITE_BYTES",
    "NETWORK_STORAGE_TRANSPORT_RX_BYTES",
    "NETWORK_STORAGE_TRANSPORT_TX_BYTES",
    "NETWORK_TX_BYTES_TOTAL",
]
TELEMETRY_TYPE_MIG_NA = [
    "GPU_FI_PROF_PCIE_RX_BYTES",
    "GPU_FI_PROF_PCIE_TX_BYTES",
    "GPU_NVLINK_RX_BYTES",
    "GPU_NVLINK_TX_BYTES",
]
TELEMETRY_TYPE_ENUM_STG = TELEMETRY_TYPE_ENUM + [
    "NETWORK_RDMA_PORT_RATE_RX_BYTES",
    "NETWORK_RDMA_PORT_RATE_TX_BYTES",
]

JOB_RESOURCE_VALUES = {"containerPortMin": 1, "containerPortMax": 65535, "containerPortNotAllowed": 1729}

JOB_LIST_REFRESH_VALUES = {"intervalInSecondsMin": 5, "intervalInSecondsMax": 300}

DEFAULT_STATISTIC_TYPE = "MEAN"
DEFAULT_INTERVAL_TIME = 1
DEFAULT_INTERVAL_UNIT = "MINUTE"

TERMINAL_STATES = {
    "FINISHED_SUCCESS",
    "UNKNOWN",
    "KILLED_BY_USER",
    "FAILED_RUN_LIMIT_EXCEEDED",
    "FAILED",
    "CANCELED",
    "TASK_LOST",
    "KILLED_BY_SYSTEM",
    "KILLED_BY_ADMIN",
    "INFINITY_POOL_MISSING",
    "RESOURCE_RELEASED",
    "IM_INTERNAL_ERROR",
    "RESOURCE_GRANT_DENIED",
    "RESOURCE_LIMIT_EXCEEDED",
}

STATES_BEFORE_TERMINAL = {
    "CREATED",
    "QUEUED",
    "STARTING",
    "RUNNING",
    "PENDING_TERMINATION",
    "PREEMPTED",
    "PREEMPTED_BY_ADMIN",
    "PENDING_STORAGE_CREATION",
    "RESOURCE_CONSUMPTION_REQUEST_IN_PROGRESS",
    "RESOURCE_GRANTED",
    "REQUESTING_RESOURCE",
}

RUNNING_STATES = {"RUNNING", "FINISHED_SUCCESS"}

STATES_BEFORE_RUNNING = {"CREATED", "QUEUED", "STARTING", "PENDING_STORAGE_CREATION", "REQUESTING_RESOURCE"}

SHELL_BUFFER_SECONDS = 30

# For 5-min and 30-sec warnings when 'exec'd into a job
SHELL_WARNING_SECONDS = [300, 30]

SHELL_START_DEADLINE_DEFAULT = "6m"

SHELL_TOTAL_RUNTIME_DEFAULT = "8H"

WORKSPACE_SERVER_PORT = 9001

WORKSPACE_LIST_PAGE_SIZE = 50

QUICKSTART_API_VERSION = "2.0"

QUICKSTART_TEMPLATE_TYPE_ENUM = ["dask", "jupyterlab"]

DATASET_SERVICE_API_VERSION = "v1"

DATASET_SERVICE_COMMIT_BATCH_SIZE = 100

STORAGE_TYPE_OBJECT = "object"

STORAGE_TYPE_FS = "file"
