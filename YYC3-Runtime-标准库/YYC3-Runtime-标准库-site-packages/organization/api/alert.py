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
import posixpath

from organization.data.api.BannerEventListResponse import BannerEventListResponse
from organization.data.api.BannerEventResponse import BannerEventResponse


class AlertAPI:  # noqa: D101
    def __init__(self, api_client, alert_connection=None):
        self.connection = api_client.connection
        self.client = api_client
        self.alert_connection = alert_connection

    @staticmethod
    def _get_base_url(org, team):
        """Create the base URL: `/v2/org/{org-name}[/team/{team-name}]/banners/events`"""  # noqa: D415
        parts = ["v2"]
        if org:
            parts.extend(["org", org])
        if team:
            parts.extend(["team", team])
        parts.append("banners/events")
        return posixpath.join(*parts)

    def _get_alert_endpoint(self, org, team, uuid=None):
        """Create the alert URL: `/v2/org/{org-name}[/team/{team-name}]/banners/events/{uuid}`"""  # noqa: D415
        base_url = self._get_base_url(org, team)
        if uuid:
            return posixpath.join(base_url, uuid)
        return base_url

    def _get_alert_query(self, org, team, **kwargs):
        list_url = self._get_alert_endpoint(org=org, team=team)
        query = ""
        for key, value in kwargs.items():
            query += (("&" if query else "?") + "{}={}".format(key, value)) if value is not None else ""
        return list_url + query

    def list_alerts(  # noqa: D102
        self, org_name, team_name=None, active=None, from_date=None, to_date=None, severity=None
    ):
        list_url = self._get_alert_query(
            org_name, team_name, isActive=active, fromDate=from_date, toDate=to_date, severity=severity
        )
        resp = self.connection.make_api_request(
            "GET",
            list_url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="list alerts",
        )
        return BannerEventListResponse(resp)

    def get(self, org_name, team_name, uuid):
        """Get information about a alert."""
        get_url = self._get_alert_endpoint(org=org_name, team=team_name, uuid=uuid)
        resp = self.connection.make_api_request(
            "GET",
            get_url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="get alert",
        )
        return BannerEventResponse(resp)
