#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import json
import posixpath

from registry.data.search.LabelSetResponse import LabelSetResponse
from registry.data.search.ListLabelSetsResponse import ListLabelSetsResponse


class LabelSetAPI:  # noqa: D101
    def __init__(self, api_client):
        self.connection = api_client.connection
        self.client = api_client

    @staticmethod
    def _get_base_url(org, team):
        """Create the base URL: `/v2/search/org/{org-name}[/team/{team-name}]/labelsets`"""  # noqa: D415
        parts = ["v2/search"]
        if org:
            parts.extend(["org", org])
        if team:
            parts.extend(["team", team])
        parts.append("labelsets")
        return posixpath.join(*parts)

    def _get_label_set_endpoint(self, org, team, name=None):
        """Create the label set URL: `/v2/search/org/{org-name}[/team/{team-name}]/labelsets/{name}`"""  # noqa: D415
        base_url = self._get_base_url(org, team)
        if name:
            return posixpath.join(base_url, name)
        return base_url

    def list_label_sets(self, org_name, team_name, resource_type=None):  # noqa: D102
        list_url = self._get_label_set_endpoint(org=org_name, team=team_name)
        if resource_type:
            list_url = "{}?resource-type={}".format(list_url, resource_type)
        resp = self.connection.make_api_request(
            "GET",
            list_url,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="list_label_sets",
        )
        return ListLabelSetsResponse(resp)

    def get(self, org_name, team_name, name, resource_type=None):
        """Get information about a label set."""
        ep = self._get_label_set_endpoint(org=org_name, team=team_name, name=name)
        resp = self.connection.make_api_request(
            "GET",
            ep,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="get label set",
            params={"resource-type": resource_type} if resource_type else {},
        )
        return LabelSetResponse(resp)

    def create(self, org_name, team_name, label_set_create_request):
        """Create a label set."""
        ep = self._get_label_set_endpoint(org=org_name, team=team_name)
        payload = label_set_create_request.toJSON()
        resp = self.connection.make_api_request(
            "POST", ep, payload=payload, auth_org=org_name, auth_team=team_name, operation_name="create label set"
        )
        return LabelSetResponse(resp)

    def update(self, org_name, team_name, label_set_name, label_set_update_request, force_labels=False):
        """Update a label set's metadata."""
        ep = self._get_label_set_endpoint(org=org_name, team=team_name, name=label_set_name)
        if force_labels:
            # The default behavior for the data objects' toJSON() is to not include empty values. In the case of
            # updating the labels, removing the last label in a labelset will require that we include the labels param
            # even if empty
            payload_dict = label_set_update_request.toDict()
            if "labels" not in payload_dict:
                payload_dict["labels"] = []
            payload = json.dumps(payload_dict)
        else:
            payload = label_set_update_request.toJSON()
        resp = self.connection.make_api_request(
            "PATCH", ep, payload=payload, auth_org=org_name, auth_team=team_name, operation_name="update label set"
        )
        return LabelSetResponse(resp)

    def remove(self, org_name, team_name, label_set_name):
        """Remove a label set."""
        ep = self._get_label_set_endpoint(org=org_name, team=team_name, name=label_set_name)
        resp = self.connection.make_api_request(
            "DELETE", ep, auth_org=org_name, auth_team=team_name, operation_name="delete label set"
        )
        return LabelSetResponse(resp)


class GuestLabelSetAPI(LabelSetAPI):  # noqa: D101
    def _get_label_set_endpoint(self, org=None, team=None, name=None):
        """Create the label set URL: `/v2/search/labelsets/{name}`"""  # noqa: D415
        base_url = "/v2/search/labelsets"
        if name:
            return posixpath.join(base_url, name)
        return base_url
