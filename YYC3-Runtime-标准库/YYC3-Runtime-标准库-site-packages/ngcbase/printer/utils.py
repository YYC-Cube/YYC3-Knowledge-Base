#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from datetime import datetime


def derive_permission(guest_access_allowed, is_guest_mode):
    """Derive the permission column for registry list views."""
    # Webservices doesn't always return guestAccess, if it's missing, guestAccess is False.
    # Nothing is locked unless in guest mode (apikey is set.)
    if is_guest_mode and not guest_access_allowed:
        return "locked"
    return "unlocked"


def format_list_view_date(date):
    """Format date: Mon dd, yyyy."""
    try:
        if date is not None:
            return datetime.strptime(date, "%Y-%m-%dT%H:%M:%S.%fZ").strftime("%b %d, %Y")

        return ""
    except ValueError:
        return date


def format_label(label):
    """Format labels v2 label."""
    if label and ":" in label:
        return label.split(":")[-1].capitalize()

    return label
