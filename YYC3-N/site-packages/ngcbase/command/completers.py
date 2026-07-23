#
# Copyright (c) 2018-2020, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from ngcbase.constants import FORMAT_TYPES


class NGCCompleter:
    """To be used with argcomplete."""

    def __init__(self, fn, *args, **kwargs):
        self.fn = fn
        self.args = args
        self.kwargs = kwargs

    def __call__(self, *args, **kwargs):
        result = self.fn(*self.args, **self.kwargs)
        return result


org_completer = None
ace_completer = None
team_completer = None
format_completer = NGCCompleter(lambda: FORMAT_TYPES)
config_profile_completer = None


def get_org_completer(client):
    global org_completer
    if org_completer is None:
        org_completer = NGCCompleter(lambda: [org for org in client.config.get_org_names()])

    return org_completer


def get_ace_completer(client):
    global ace_completer
    if ace_completer is None:
        ace_completer = NGCCompleter(lambda: [elem.name for elem in client.config.get_ace_list(client.config.org_name)])

    return ace_completer


def get_team_completer(client):
    global team_completer
    if team_completer is None:
        team_completer = NGCCompleter(lambda: [team for team in client.config.get_team_list()])

    return team_completer


def get_config_profile_completer(client):
    global config_profile_completer
    if config_profile_completer is None:
        _valid_configuration_options = (
            [config.get("key_name", "") for config in client.config.configurations.values()]
            if client.config.configurations
            else []
        )
        config_profile_completer = NGCCompleter(lambda: _valid_configuration_options)

    return config_profile_completer


__all__ = [
    "org_completer",
    "ace_completer",
    "team_completer",
    "format_completer",
    "config_profile_completer",
]
