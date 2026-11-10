# Copyright (c) 2017-2021, NVIDIA CORPORATION.  All rights reserved.

#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from argparse import ArgumentTypeError


def check_machine_capability(value, mc_type_enum):  # noqa: D103

    mcd = {
        "type": mc_type_enum,
        "name": str,
        "frequency": str,
        "cores": int,
        "threads": int,
        "capacity": str,
        "count": int,
        "vendor": str,
    }
    mc = {}
    try:
        if value is not None and not isinstance(value, str):
            value = str(value)
    except ValueError:
        msg = "Invalid machine capability value: '{}'".format(value)
        raise ArgumentTypeError(msg) from None

    try:
        vals = value.split(",")
        for val in vals:
            nm, vl = val.split("=", 1)
            if nm in mcd:
                if nm == "type":
                    if vl not in mcd["type"]:
                        msg = "Invalid value: '{}' for machine capability.".format(value)
                        raise ArgumentTypeError(msg) from None
                    mc[nm] = vl
                else:
                    mc[nm] = mcd[nm](vl)
            else:
                msg = "Invalid value: '{}' for machine capability.".format(value)
                raise ArgumentTypeError(msg) from None
    except Exception:
        msg = "Invalid value: '{}' for machine capability.".format(value)
        raise ArgumentTypeError(msg) from None

    return mc


def check_instance_label(value):  # noqa: D103

    labels = value.split(",")
    for label in labels or []:
        if not label:
            msg = f"Invalid input: '{label}'"
            raise ArgumentTypeError(msg) from None

    return labels
