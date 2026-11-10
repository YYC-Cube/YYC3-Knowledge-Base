# Copyright (c) 2025, NVIDIA CORPORATION.  All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from dataclasses import dataclass
import enum


@dataclass
class StorageLocation:  # noqa: D101
    id: str = None
    storage_type: str = None
    external_endpoint_uri: str = None


@dataclass
class CommitEntry:  # noqa: D101
    size_bytes: int = None
    last_modified_at_ms: int = None  # epoch milliseconds
    key: str = None
    hash_value: str = None
    hash_type: str = None
    path: str = None


@dataclass
class DatasetCommitRequest:  # noqa: D101
    commit_entries: list[CommitEntry]
    dataset_id: str = None
    commit_storage: StorageLocation = None
    commit_continuation: str = None
    defer_commit: bool = False


@dataclass
class DatasetCommitResponse:  # noqa: D101
    commit_continuation: str = None


class AccessType(int, enum.Enum):  # noqa: D101
    READ_ONLY = 0
    READ_WRITE = 1


@dataclass
class GetStorageAccessRequest:  # noqa: D101
    dataset_id: str = None
    storage_location_id: str = None
    access_type: AccessType = None


@dataclass
class S3Credentials:  # noqa: D101
    access_key: str = None
    secret_key: str = None
    token: str = None
    expiration: str = None


@dataclass
class AccessCredentials:  # noqa: D101
    s3_credentials: S3Credentials = None


@dataclass
class GetStorageAccessResponse:  # noqa: D101
    endpoint_url: str = None
    region: str = None
    base_path: str = None
    credentials: AccessCredentials = None
