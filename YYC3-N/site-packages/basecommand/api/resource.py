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

from datetime import datetime
from itertools import chain, cycle, islice
import json
from typing import List, Optional

from basecommand.data.api.PoolMeasurementType import PoolMeasurementTypeEnum
from ngcbase.errors import InvalidArgumentError, NgcException, ResourceNotFoundException
from ngcbase.util.utils import has_org_role, has_team_role

PAGE_SIZE = 100


class ResourceAPI:  # noqa: D101
    def __init__(self, api_client):
        self.config = api_client.config
        self.connection = api_client.connection
        self.ace_api = api_client.basecommand.aces
        self.user_api = api_client.users
        self.team_api = api_client.organization.team

    def _get_resource_endpoint(self, org_name, pool_id=None, team_name=None, edit=False, telemetry=False):
        url = f"v2/org/{org_name}"
        if team_name and not team_name == "no-team":
            user_resp = self.user_api.user_who(org_name)
            if edit and not has_org_role(user_resp, org_name, ["ADMIN", "BASE_COMMAND_ADMIN"]):
                url += f"/team/{team_name}"
            elif not edit:
                url += f"/team/{team_name}"
        if telemetry:
            url += "/pools"
        else:
            url += "/infinity-manager/pools"
        if pool_id:
            url += f"/{pool_id}"
        return url

    @staticmethod
    def _get_pool_id(org_name, ace_id, team_name=None, user_id=None):
        pool_id = f"{org_name}.{ace_id}"
        if team_name:
            pool_id += f":{team_name}"
        if user_id:
            pool_id += f":{user_id}"
        return pool_id

    @staticmethod
    def _splitter(target, delimiter, filler=None):
        yield from chain(target.split(delimiter), cycle([filler]))

    def _parse_pool_id(self, pool_id, root_pool=None):
        org = ace = team = user = None
        if pool_id:
            org_ace, team, user = islice(self._splitter(pool_id, ":"), 3)
            team = "no-team" if team is None and not root_pool else team
            if org_ace:
                org, ace = islice(self._splitter(org_ace, "."), 2)
        try:
            ace = int(ace)
        except ValueError:
            raise InvalidArgumentError("argument: pool id requires integer ace id.") from None
        return org, ace, team, user

    def _parse_args(self, org_name=None, team_name=None, ace=None, pool_id=None, user_id=None, root_pool=None):
        if pool_id:
            org_name, ace_id, team_name, user_id = self._parse_pool_id(pool_id, root_pool=root_pool)
            if team_name and root_pool:
                raise NgcException(f"Invalid team '{team_name}', root pool option is only vaid with no-team.")
            team_name = "no-team" if team_name is None and not root_pool else team_name
        else:
            org_name = org_name or self.config.org_name
            team_name = team_name or self.config.team_name
            ace_name = ace or self.config.ace_name

            ace = self.ace_api.get_ace_details(org_name=org_name, ace_name=ace_name, team_name=team_name)
            ace_id = ace.id
            if (user_id or user_id == 0) and user_id != "user-defaults":
                user_details = self.user_api.get_user_details(org_name=org_name, team_name=team_name, user_id=user_id)
                if not user_details.user:
                    raise NgcException(f"User {user_id} not found.")
                user_id = user_details.user.starfleetId
                if not user_id:
                    raise NgcException("User's starfleet id not found, please log into NGC before retrying.")

                if team_name and not has_team_role(
                    user_details,
                    team_name,
                    ["ADMIN", "BASE_COMMAND_ADMIN", "BASE_COMMAND_VIEWER", "USER", "BASE_COMMAND_USER"],
                ):
                    raise NgcException(f"No Base Command role for the user in the team '{team_name}'.")

            if team_name:
                if root_pool:
                    raise NgcException(f"Invalid team '{team_name}', root pool option is only vaid with no-team.")
                teams = self.team_api.get_teams(org_name=org_name)
                team_dict = {team.name: team.infinityManagerSettings.infinityManagerEnabled for team in teams}
                if team_name not in team_dict or not team_dict[team_name]:
                    raise NgcException(f"Team '{team_name}' doesn't exist or IM is disabled for the team.")
            else:
                team_name = "no-team" if not root_pool else team_name

        pool_id = self._get_pool_id(org_name=org_name, ace_id=ace_id, team_name=team_name, user_id=user_id)
        return org_name, team_name, pool_id, user_id

    def list(
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        user_id: Optional[str] = None,
        root_pool: Optional[bool] = False,
    ):
        """List resources."""
        org_name = org or self.config.org_name
        team_name = team or self.config.team_name
        ace_name = ace or self.config.ace_name
        if ace_name:
            ace = self.ace_api.get_ace_details(org_name=org_name, ace_name=ace_name, team_name=team_name)
            ace_id = ace.id
            if team_name and root_pool:
                raise NgcException(f"Invalid team '{team_name}', root pool option is only vaid with no-team.")
            team_name = "no-team" if team_name is None and not root_pool else team_name
            if user_id:
                raise NgcException("Child pools don't exist for a user pool.")
            pool_id = self._get_pool_id(org_name=org_name, ace_id=ace_id, team_name=team_name)
            ep = self._get_resource_endpoint(org_name, pool_id=pool_id, team_name=team_name)
            params = []
            params.append("include-resource-allocations-details=true")
            query = "?".join([f"{ep}/child-pools", "&".join(params)])
            resp = self.connection.make_api_request(
                "GET", query, auth_org=org_name, auth_team=team_name, operation_name="list_im_pool", safe="/:"
            )
        else:
            if (user_id or user_id == 0) and user_id != "user-defaults":
                user_details = self.user_api.get_user_details(org_name=org_name, team_name=team_name, user_id=user_id)
                user_id = user_details.user.starfleetId
                if not user_id:
                    raise NgcException("User's starfleet id not found, please log into NGC before retrying.")

            aces = self.ace_api.get_aces(org_name=org_name, team_name=team_name)

            if team_name:
                if root_pool:
                    raise NgcException(f"Invalid team '{team_name}', root pool option is only vaid with no-team.")
                teams = self.team_api.get_teams(org_name=org_name)
                team_dict = {team.name: team.infinityManagerSettings.infinityManagerEnabled for team in teams}
                if team_name not in team_dict or not team_dict[team_name]:
                    raise NgcException(f"Team '{team_name}' doesn't exist or IM is disabled for the team.")
            else:
                team_name = "no-team" if not root_pool else team_name

            resp = []

            for ac in aces:
                if ac.infinityManagerEnabled:
                    ace_id = ac.id
                    pool_id = self._get_pool_id(org_name=org_name, ace_id=ace_id, team_name=team_name, user_id=user_id)
                    ep = self._get_resource_endpoint(org_name, pool_id=pool_id, team_name=team_name)
                    try:
                        resp.append(
                            self.connection.make_api_request(
                                "GET",
                                ep,
                                auth_org=org_name,
                                auth_team=team_name,
                                operation_name="list_im_resource",
                                safe="/:",
                            )
                        )
                    except ResourceNotFoundException:
                        pass
        return resp

    def info(  # noqa: D102
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        user_id: Optional[str] = None,
        root_pool: Optional[bool] = False,
    ):
        org_name, team_name, pool_id, user_id = self._parse_args(org, team, ace, None, user_id, root_pool)
        ep = self._get_resource_endpoint(org_name, pool_id=pool_id, team_name=team_name)
        if user_id == "user-defaults":
            ep = f"{ep.replace('pools', 'default-pools')}"
        params = []
        params.append("pool-or-default=true")
        if root_pool and team_name is None:
            params.append("rootPoolCapacityDetails=true")
        query = "?".join([ep, "&".join(params)])
        resp = self.connection.make_api_request(
            "GET", query, auth_org=org_name, auth_team=team_name, operation_name="info_im_pool", safe="/:"
        )
        return resp

    def create(  # noqa: D102
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        user_id: Optional[str] = None,
        version: Optional[str] = None,
        description: Optional[str] = None,
        allocation: Optional[List[dict[str, str]]] = None,
        default: Optional[List[dict[str, str]]] = None,
    ):
        if not allocation and not default:
            raise NgcException("Either allocation or default is required to create pool.")
        org_name, team_name, pool_id, user_id = self._parse_args(org, team, ace, None, user_id)
        if user_id and not team_name:
            raise NgcException("Team (pool) is required for creating user pool.")
        ep = self._get_resource_endpoint(org_name, pool_id=pool_id, team_name=team_name, edit=True)
        create_obj = {
            "version": version,
            "description": description,
            "resourceAllocations": allocation,
        }
        if allocation:
            resp = self.connection.make_api_request(
                "POST",
                ep,
                auth_org=org_name,
                auth_team=team_name,
                payload=json.dumps(create_obj),
                operation_name="create_im_pool",
                safe="/:",
            )
        if user_id is None and default:
            url = f"{ep.replace('pools', 'default-pools')}:user-defaults"
            create_obj["resourceAllocations"] = default
            resp = self.connection.make_api_request(
                "POST",
                url,
                auth_org=org_name,
                auth_team=team_name,
                payload=json.dumps(create_obj),
                operation_name="create_im_pool_default",
                safe="/:",
            )
        resp = self.connection.make_api_request(
            "GET", ep, auth_org=org_name, auth_team=team_name, operation_name="info_im_pool", safe="/:"
        )
        return resp

    def update(  # noqa: D102
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        user_id: Optional[str] = None,
        description: Optional[str] = None,
        update_allocation: Optional[List[dict[str, str]]] = None,
        add_allocation: Optional[List[dict[str, str]]] = None,
        remove_allocation: Optional[List[dict[str, str]]] = None,
    ):
        org_name, team_name, pool_id, user_id = self._parse_args(org, team, ace, None, user_id)
        ep = self._get_resource_endpoint(org_name, pool_id=pool_id, team_name=team_name, edit=True)
        update_obj = {"version": "1.0", "patchedProperties": []}
        for al in update_allocation or []:
            update_obj["patchedProperties"].append(
                {
                    "path": f"resourceAllocations/{al['resourceTypeName']}",
                    "operation": "upd",
                    "values": [
                        {"key": "limit", "value": f"{al['limit']}"},
                        {"key": "share", "value": f"{al['share']}"},
                        {"key": "highestPriorityClass", "value": al["highestPriorityClass"]},
                    ],
                }
            )
        for al in add_allocation or []:
            update_obj["patchedProperties"].append(
                {
                    "path": f"resourceAllocations/{al['resourceTypeName']}",
                    "operation": "add",
                    "values": [
                        {"key": "limit", "value": f"{al['limit']}"},
                        {"key": "share", "value": f"{al['share']}"},
                        {"key": "highestPriorityClass", "value": al["highestPriorityClass"]},
                    ],
                }
            )
        for al in remove_allocation or []:
            update_obj["patchedProperties"].append(
                {
                    "path": f"resourceAllocations/{al['resourceTypeName']}",
                    "operation": "del",
                    "values": [
                        {"key": "", "value": al["resourceTypeName"]},
                    ],
                }
            )
        if description:
            update_obj["patchedProperties"].append(
                {"path": "description", "operation": "upd", "values": [{"key": "", "value": description}]}
            )
        if not update_obj["patchedProperties"]:
            raise NgcException("Update requires description, add, update, or remove allocation.")
        resp = self.connection.make_api_request(
            "PATCH",
            ep,
            auth_org=org_name,
            auth_team=team_name,
            payload=json.dumps(update_obj),
            operation_name="update_im_pool",
            safe="/:",
        )
        resp = self.connection.make_api_request(
            "GET", ep, auth_org=org_name, auth_team=team_name, operation_name="info_im_pool", safe="/:"
        )
        return resp

    def remove(  # noqa: D102
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        user_id: Optional[str] = None,
    ):
        org_name, team_name, pool_id, user_id = self._parse_args(org, team, ace, None, user_id)
        ep = self._get_resource_endpoint(org_name, pool_id=pool_id, team_name=team_name, edit=True)
        if user_id == "user-defaults":
            ep = f"{ep.replace('pools', 'default-pools')}"
        resp = self.connection.make_api_request(
            "DELETE",
            ep,
            auth_org=org_name,
            auth_team=team_name,
            operation_name="remove_im_pool",
            safe="/:",
            json_response=False,
        )
        return resp

    def telemetry(  # noqa: C901, D102
        self,
        org: Optional[str] = None,
        team: Optional[str] = None,
        ace: Optional[str] = None,
        user_id: Optional[str] = None,
        telemetry_type: Optional[str] = None,
        end_time: Optional[datetime] = None,
        start_time: Optional[datetime] = None,
        interval_unit: Optional[str] = "MINUTE",
        interval_time: Optional[int] = 1,
        resource_type: Optional[str] = None,
        root_pool: Optional[bool] = False,
    ):
        org_name, team_name, pool_id, user_id = self._parse_args(org, team, ace, None, user_id, root_pool)

        if interval_unit == "HOUR":
            interval_time = interval_time * 60 * 60
        elif interval_unit == "MINUTE":
            interval_time = interval_time * 60

        _secs = interval_time % 60
        _mins = (interval_time // 60) % 60
        _hrs = (interval_time // 60) // 60
        step = (f"{_hrs}h" if _hrs else "") + (f"{_mins}m" if _mins else "") + (f"{_secs}s" if _secs else "")

        pool_telemetry_types = [
            "RESOURCE_USAGE",
            "RESOURCE_UTILIZATION",
            "POOL_CAPACITY",
            "POOL_LIMIT",
            "ACTIVE_FAIR_SHARE",
            "FAIR_SHARE",
            "QUEUED_JOBS",
            "RUNNING_JOBS",
        ]

        if root_pool and team_name is None:
            if telemetry_type and telemetry_type in [
                "FAIR_SHARE",
                "ACTIVE_FAIR_SHARE",
                "im_resource_manager_pool_limit_total",
            ]:
                raise NgcException(f"Telemetry type `{telemetry_type}` is not applicable for root pool.")
            pool_telemetry_types.remove("FAIR_SHARE")
            pool_telemetry_types.remove("ACTIVE_FAIR_SHARE")
            pool_telemetry_types.remove("RESOURCE_UTILIZATION")
            pool_telemetry_types.remove("POOL_LIMIT")
        else:
            if telemetry_type and telemetry_type in ["POOL_LIMIT", "POOL_CAPACITY"]:
                raise NgcException(f"Telemetry type `{telemetry_type}` is not applicable for non root pool.")
            pool_telemetry_types.remove("POOL_LIMIT")
            pool_telemetry_types.remove("POOL_CAPACITY")
            pool_telemetry_types.remove("RESOURCE_UTILIZATION")
            pool_telemetry_types.remove("FAIR_SHARE")

        if telemetry_type in PoolMeasurementTypeEnum:
            ep = self._get_resource_endpoint(org_name, pool_id=pool_id, team_name=team_name, telemetry=True)
            ep = f"{ep}/telemetry"
            params = []
            if resource_type:
                params.append(f"resource-type={resource_type}")
            _q = []
            _t = {"period": interval_time}
            if start_time:
                _t["fromDate"] = f"{start_time.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]}Z"
            if end_time:
                _t["toDate"] = f"{end_time.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]}Z"
            _t["type"] = telemetry_type
            _q.append(_t)
            params.append('q={"measurements":' + json.dumps(_q, separators=(",", ":")) + "}")
            query = "?".join([ep, "&".join(params)])
            resp = self.connection.make_api_request(
                "GET", query, auth_org=org_name, auth_team=team_name, operation_name="im_pool_telemetry", safe="/:"
            )
            return resp

        if telemetry_type is not None:
            ep = self._get_resource_endpoint(org_name, pool_id=pool_id, team_name=team_name)
            if user_id == "user-defaults":
                ep = f"{ep.replace('pools', 'default-pools')}"
            ep = f"{ep}/stats"
            params = []
            params.append(f"step={step}")
            params.append(f"q={telemetry_type}")
            if end_time:
                params.append(f"end={end_time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')}")
            if start_time:
                params.append(f"start={start_time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')}")
            if resource_type:
                params.append(f"rtname={resource_type}")
            query = "?".join([ep, "&".join(params)])
            resp = self.connection.make_api_request(
                "GET", query, auth_org=org_name, auth_team=team_name, operation_name="im_pool_statistics", safe="/:"
            )
            return resp

        ep = self._get_resource_endpoint(org_name, pool_id=pool_id, team_name=team_name, telemetry=True)
        ep = f"{ep}/telemetry"
        params = []
        if resource_type:
            params.append(f"resource-type={resource_type}")
        _q = []
        for _type in pool_telemetry_types:
            _t = {}
            _t["period"] = interval_time
            if start_time:
                _t["fromDate"] = f"{start_time.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]}Z"
            if end_time:
                _t["toDate"] = f"{end_time.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]}Z"
            _t["type"] = _type
            _q.append(_t)
        params.append('q={"measurements":' + json.dumps(_q, separators=(",", ":")) + "}")
        query = "?".join([ep, "&".join(params)])
        resp = self.connection.make_api_request(
            "GET", query, auth_org=org_name, auth_team=team_name, operation_name="im_pool_telemetry", safe="/:"
        )
        measurements = resp.get("measurements", []) if resp else []

        ep = self._get_resource_endpoint(org_name, pool_id=pool_id, team_name=team_name)
        if user_id == "user-defaults":
            ep = f"{ep.replace('pools', 'default-pools')}"
        ep = f"{ep}/stats"
        params = []
        params.append(f"step={step}")
        if end_time:
            params.append(f"end={end_time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')}")
        if start_time:
            params.append(f"start={start_time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')}")
        if resource_type:
            params.append(f"rtname={resource_type}")
        query = "?".join([ep, "&".join(params)])
        resp = self.connection.make_api_request(
            "GET", query, auth_org=org_name, auth_team=team_name, operation_name="im_pool_statistics", safe="/:"
        )
        stats = resp.get("measurements", []) if resp else []
        if root_pool and team_name is None:
            for _st in stats or []:
                _s = _st.get("series", [])
                if _s:
                    _st["series"] = [
                        _f for _f in _s or [] if _f.get("name", "") != "im_resource_manager_pool_limit_total"
                    ]
        return {"measurements": stats + measurements}
