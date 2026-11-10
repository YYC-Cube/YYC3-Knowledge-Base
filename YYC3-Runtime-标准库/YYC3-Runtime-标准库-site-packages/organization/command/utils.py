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

from ngcbase.constants import STAGING_ENV, USER_ROLES, USER_ROLES_FORGE
from ngcbase.util.utils import get_environ_tag


def get_user_role_choices(client):
    """User role choices."""
    if client and client.config and bool(client.config.user_role_choices):
        user_roles = client.config.user_role_choices
    else:
        user_roles = USER_ROLES

    user_roles_set = set(user_roles)
    user_roles_forge_set = set(USER_ROLES_FORGE)
    if get_environ_tag() <= STAGING_ENV:
        # Make sure Forge Roles are included.
        return sorted(list(user_roles_set | user_roles_forge_set))

    # Make sure Forge Roles are not included.
    user_roles = user_roles_set - user_roles_forge_set
    return sorted(list(user_roles))
