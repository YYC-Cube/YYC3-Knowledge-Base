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

import datetime
import os
from typing import Optional

import requests  # pylint: disable=requests-import
from rich.progress import (
    DownloadColumn,
    Progress,
    TimeElapsedColumn,
    TransferSpeedColumn,
)
from rich.style import Style
from rich.table import Column

from ngcbase.constants import API_VERSION, REQUEST_TIMEOUT_SECONDS
from ngcbase.errors import NgcException
from ngcbase.util.datetime_utils import calculate_date_range
from organization.data.api.AuditLogsPresignedUrlResponse import (
    AuditLogsPresignedUrlResponse,
)
from organization.data.api.AuditLogsRequest import AuditLogsRequest
from organization.data.api.AuditLogsResponse import AuditLogsResponse


class AuditAPI:
    """Audit Logs API."""

    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _get_audit_endpoint(org_name):
        """Constructs the AuditLogs base endpoint.

        {ver}/org/{org}/auditLogs
        """  # noqa: D401
        return "{ver}/org/{org}/auditLogs".format(ver=API_VERSION, org=org_name)

    def list_audit_logs(self, org_name: str):
        """Retrieve all audit logs."""
        response = self.connection.make_api_request(
            "GET", self._get_audit_endpoint(org_name), auth_org=org_name, operation_name="list audit logs"
        )
        return AuditLogsResponse(response)

    def list_logs(self, org: Optional[str] = None):  # noqa: D102
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.list_audit_logs(org_name=org_name)

    def get_audit_info(self, audit_id: str, org_name: str):  # noqa: D102
        url = f"{self._get_audit_endpoint(org_name)}/{audit_id}"
        response = self.connection.make_api_request("GET", url, auth_org=org_name, operation_name="get audit info")
        return AuditLogsPresignedUrlResponse(response)

    def info(self, audit_id: str, org: Optional[str] = None):  # noqa: D102
        self.client.config.validate_configuration(json_allowed=False)
        org_name = org or self.client.config.org_name
        return self.get_audit_info(audit_id=audit_id, org_name=org_name)

    def create_audit(self, from_date: datetime.datetime, to_date: datetime.datetime, org_name: str):  # noqa: D102
        try:
            (from_date, to_date) = calculate_date_range(from_date, to_date, None)
        except ValueError as ve:
            if "begin-time must be before end-time" in str(ve):
                raise NgcException("Error: --from-date must be earlier than --to-date") from ve
            raise NgcException(ve) from ve
        audit_create_request = AuditLogsRequest({"auditLogsFrom": from_date, "auditLogsTo": to_date})
        response = self.connection.make_api_request(
            "POST",
            self._get_audit_endpoint(org_name),
            auth_org=org_name,
            payload=audit_create_request.toJSON(False),
            operation_name="create audit",
        )
        return AuditLogsResponse(response)

    def create(self, from_date: datetime.datetime, to_date: datetime.datetime, org: Optional[str] = None):  # noqa: D102
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.create_audit(from_date=from_date, to_date=to_date, org_name=org_name)

    def remove_audit(self, audit_id: list[str], org_name: str):  # noqa: D102
        log_ids_query = "&".join([f"logIds={audit_id}" for audit_id in audit_id])
        url = f"{self._get_audit_endpoint(org_name)}?{log_ids_query}"
        response = self.connection.make_api_request("DELETE", url, auth_org=org_name, operation_name="delete audit")
        return AuditLogsResponse(response)

    def remove(self, audit_id: str, org: Optional[str] = None):  # noqa: D102
        self.client.config.validate_configuration()
        org_name = org or self.client.config.org_name
        return self.remove_audit(audit_id=audit_id, org_name=org_name)

    @staticmethod
    def download(presigned_url: str, destination: str):  # noqa: D102
        try:
            base_url, _ = presigned_url.split("?")
            file_name = os.path.basename(base_url)
        except ValueError as ve:
            raise NgcException(
                "Can't extract file path from the presigned URL. A custom file name can be used instead."
            ) from ve

        response = requests.get(presigned_url, stream=True, timeout=REQUEST_TIMEOUT_SECONDS)
        render_style = Style(color=None)
        columns = [
            "Downloaded:",
            DownloadColumn(table_column=Column(style=Style(color="blue"))),
            "in",
            TimeElapsedColumn(table_column=Column(style=render_style)),
            "Download speed:",
            TransferSpeedColumn(table_column=Column(style=render_style)),
        ]
        download_path = os.path.join(destination, file_name)
        if os.path.exists(download_path) and not os.access(download_path, os.W_OK):
            raise NgcException(f"Error: You do not have permission to overwrite file '{download_path}'.") from None
        with Progress(*columns) as progress:
            download_progress = progress.add_task(download_path, total=int(response.headers.get("content-length", 0)))
            with open(download_path, "wb") as file:
                for data in response.iter_content():
                    progress.update(download_progress, advance=len(data))
                    file.write(data)
        print(f"Location: {download_path}")
