#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
import argparse
from datetime import datetime, timedelta
import os
import re
from uuid import UUID

import validators

from ngcbase.constants import INT_MAX_VALUE_32_BIT
from ngcbase.errors import InvalidArgumentError, NgcException, ValidationException
from ngcbase.util.datetime_utils import (
    validate_dhms_duration,
    validate_ymd_hms_datetime,
)
from ngcbase.util.io_utils import is_positive_int


class SingleUseAction(argparse.Action):
    """A custom action that throws an ArgumentError if multiple arguments are supplied for single-argument commands."""

    # pylint: disable=arguments-differ
    # method adds args to base method
    def __call__(self, parser, namespace, values, *args, **kwargs):  # noqa: D102
        namespace_attr = getattr(namespace, self.dest, self.default)
        if namespace_attr is not None and namespace_attr != self.default:
            raise argparse.ArgumentError(self, "Duplicate options are not allowed")
        setattr(namespace, self.dest, values)


def check_range(r_min, r_max):
    """Validates given value is in min and max range."""  # noqa: D401

    class RequiredRange(argparse.Action):
        # pylint: disable=arguments-differ
        # method adds args to base method
        def __call__(self, parser, namespace, value, *args, **kwargs):
            if not r_min <= value <= r_max:
                msg = "Invalid input: '%r' valid range is %d-%d" % (value, r_min, r_max)
                raise argparse.ArgumentError(self, msg)
            setattr(namespace, self.dest, value)

    return RequiredRange


def valid_value(r_min, r_max, client):
    """Sets given value in min and max range."""  # noqa: D401

    class ValidValue(argparse.Action):
        # pylint: disable=arguments-differ
        # method adds args to base method
        def __call__(self, parser, namespace, value, *args, **kwargs):
            if not r_min <= value <= r_max:
                if value < r_min:
                    value = self.default
                    client.printer.print_ok("Number of '{}' set to default: '{}'".format(self.dest, self.default))
                elif value > r_max:
                    value = r_max
                    client.printer.print_ok("Number of '{}' set to max: '{}'".format(self.dest, r_max))
            setattr(namespace, self.dest, value)

    return ValidValue


class ReadFile(argparse.Action):
    """Validates the supplied argument is a readable file and returns the file contents."""

    # pylint: disable=arguments-differ
    # method adds args to base method
    def __call__(self, parser, namespace, value, *args, **kwargs):  # noqa: D102
        try:
            with open(value, "r", encoding="utf-8") as f:
                file_contents = f.read()
        except FileNotFoundError:
            raise argparse.ArgumentError(self, f"File '{value}' not found") from None
        except (PermissionError, IOError):
            raise argparse.ArgumentError(self, f"Unable to read file '{value}'") from None

        setattr(namespace, self.dest, file_contents)


def check_dhms_valid_past_time_range():
    """Validates input job duration. Input duration should in following."""  # noqa: D401

    class CheckDHMSValidPastTimeRange(argparse.Action):
        # pylint: disable=arguments-differ
        # method adds args to base method
        def __call__(self, parser, namespace, value, *args, **kwargs):
            try:
                duration = validate_dhms_duration(value)
                seconds = duration.total_seconds()
                (datetime.today().utcnow() - timedelta(seconds=seconds)).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            except ValueError:
                raise argparse.ArgumentError(self, "invalid duration: valid input format is [nD][nH][nM][nS]") from None
            except OverflowError:
                raise argparse.ArgumentError(self, "value out of range. Duration of time too long.") from None
            setattr(namespace, self.dest, duration)

    return CheckDHMSValidPastTimeRange


def check_dhms_duration():
    """Validates input job duration. Input duration should in following."""  # noqa: D401

    class CheckDHMSDuration(argparse.Action):
        # pylint: disable=arguments-differ
        # method adds args to base method
        def __call__(self, parser, namespace, value, *args, **kwargs):
            try:
                duration = validate_dhms_duration(value)
            except ValueError as e:
                raise argparse.ArgumentError(self, str(e)) from None
            except OverflowError:
                raise argparse.ArgumentError(self, "value out of range") from None
            setattr(namespace, self.dest, duration)

    return CheckDHMSDuration


def check_ymd_hms_datetime():  # noqa: D103
    class CheckYMDHMSDatetime(argparse.Action):
        # pylint: disable=arguments-differ
        # method adds args to base method
        def __call__(self, parser, namespace, value, *args, **kwargs):
            try:
                date = validate_ymd_hms_datetime(value)
            except ValueError as e:
                raise argparse.ArgumentError(self, str(e)) from None
            setattr(namespace, self.dest, date)

    return CheckYMDHMSDatetime


def check_positive_int_32_bit():
    """Check if input value is positive integer."""

    class PositiveInteger(argparse.Action):
        # pylint: disable=arguments-differ
        # method adds args to base method
        def __call__(self, parser, namespace, value, *args, **kwargs):
            if not (is_positive_int(value) and value <= INT_MAX_VALUE_32_BIT):
                msg = "Invalid input: '%s'. Valid value is %d-%d" % (
                    value,
                    1,
                    INT_MAX_VALUE_32_BIT,
                )
                raise argparse.ArgumentError(self, msg)
            setattr(namespace, self.dest, value)

    return PositiveInteger


def email_used(email):  # noqa: D103
    # Note: this is just used as a rough metric as to whether an email has been passed in.
    # Not intending to be compliant with RFC 5322
    if ("@" not in email) or (email.count(".") < 1):
        raise argparse.ArgumentTypeError("This argument requires an email address.")
    return email


def email_id_used(user_id):  # noqa: D103
    # Note: this is just used as a rough metric as to whether an email has been passed in.
    # Not intending to be compliant with RFC 5322
    if (not user_id.isdigit()) and (("@" not in user_id) or (user_id.count(".") < 1)):
        raise argparse.ArgumentTypeError("This argument requires an email address or id.") from None
    return user_id


def check_egx_label(value):
    """Fleet Command labels must validate to a DNS-1123 subdomain label'.
    In addition, '.' is not allowed.
    In addition, len must be < 54.
    """  # noqa: D205
    if not re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", value) or len(value) > 53:
        msg = (
            "Invalid input: '{}' - Fleet Command labels must consist of lower case"
            " alphanumeric characters or '-'. It must start and end with an"
            " alphanumeric character.  In addition, '.' is not allowed.  It must be no"
            " more than 53 chars.".format(value)
        )
        raise argparse.ArgumentTypeError(msg)

    return value


def validate_credentials_json(json_dict):  # noqa: D103
    try:
        assert json_dict.get("name")
    except (AssertionError, AttributeError):
        raise argparse.ArgumentTypeError("'name' field is required in structured JSON credentials data") from None

    try:
        assert json_dict.get("attributes")
        assert isinstance(json_dict["attributes"], list)
    except (AssertionError, AttributeError):
        raise argparse.ArgumentTypeError("'attributes' field is required in structured JSON credentials data") from None
    try:
        assert all(
            isinstance(item, dict) and ((len(item) == 2 and ("key" in item and "value" in item)))
            for item in json_dict["attributes"]
        )
        attrs_len = len(json_dict["attributes"])
        assert 1 <= attrs_len <= 12
    except AssertionError:
        msg = (
            "'attributes' list in structured JSON credentials data must contain at least "
            "one attribute field and no more than twelve. "
            "Each attribute take the form of {'key': KEY, 'value': VALUE}"
        )
        raise argparse.ArgumentTypeError(msg) from None


def check_url(value):  # noqa: D103
    if not validators.url(str(value)):
        raise argparse.ArgumentTypeError("Must be a valid URL: '{}'.".format(value))
    return value


def check_egx_display_name(value):  # noqa: D103
    if len(value) >= 254:
        raise argparse.ArgumentTypeError("Must be less than 254 characters: '{}'.".format(value))
    return value


def check_egx_helm_chart_name(value):  # noqa: D103
    if len(value) >= 53:
        raise argparse.ArgumentTypeError(f"Must be less than 53 characters: '{value}")

    if not re.match(r"^[a-z]([-a-z0-9]*[a-z0-9])?$", value):
        raise argparse.ArgumentTypeError(
            f"Must start with a lower case letter and contain only lower case letters, dashes and numbers: '{value}'"
        )

    return value


def check_filename_length(file_path):  # noqa: D103
    file_name = os.path.basename(file_path)
    if len(file_name) > 255:
        raise argparse.ArgumentTypeError(f"Error: File name must be less than 256 characters long: {file_name}")
    return file_path


def check_valid_columns(value, columns_dict):
    """Sets valid columns for list output."""  # noqa: D401
    try:
        if value is not None and not isinstance(value, str):
            value = str(value)
    except ValueError:
        msg = "Invalid column value: '{}'".format(value)
        raise argparse.ArgumentTypeError(msg) from None

    try:
        vals = value.split("=", 1)
        name = vals[0] if vals else None
        if name in columns_dict:
            disp = vals[1] if len(vals) > 1 and vals[1] else columns_dict[name]
        else:
            msg = "Invalid value: '{}' for column.".format(value)
            raise argparse.ArgumentTypeError(msg)
    except Exception:
        msg = "Invalid value: '{}' for column.".format(value)
        raise argparse.ArgumentTypeError(msg) from None

    return (name, disp)


def check_add_args_columns(value, default):  # noqa: D103
    if value:
        keys, _ = zip(*value)
        if len(keys) > len(set(keys)):
            raise ValidationException("Duplicate --column arguments are not allowed.")

        if isinstance(default, tuple) and default[0] not in keys:
            value.insert(0, default)
        elif isinstance(default, list):
            value[:0] = [d for d in default if d[0] not in keys]


def check_valid_labels(labels):  # noqa: D103
    label_dict = {}

    for label in labels or []:
        value = label.lower().replace(" ", "_") if label else None
        if value:
            if value in label_dict:
                msg = "Duplicate value: '{}' for label".format(label)
                raise InvalidArgumentError(msg) from None
            label_dict[value] = label
        else:
            msg = "value: '{}' for label".format(label)
            raise InvalidArgumentError(msg) from None

    return [{"value": value, "display": label} for value, label in label_dict.items()]


def check_team_name_pattern(value):  # noqa: D103
    if not isinstance(value, str):
        raise NgcException(r"Team name must match the required pattern: [a-z][a-z\d_-]")
    value = value.lower()
    if not re.match(r"[a-z][a-z\d_-]", value):
        raise NgcException(r"Team name must match the required pattern: [a-z][a-z\d_-]")
    return value


def check_secret_name_pattern(value):
    """Validates that a given secret name is in pattern."""  # noqa: D401
    if not isinstance(value, str):
        raise NgcException(r"Secret name must match required pattern: ^[a-zA-Z\d_\.-]{1,63}$")
    if not re.match(r"^[a-zA-Z\d_\.-]{1,63}$", value):
        raise NgcException(r"Secret name must match required pattern: ^[a-zA-Z\d_\.-]{1,63}$")
    return value


def check_key_value_pattern(value: str, lower_bound_key_length: int = 1) -> str:
    """Validates that a given value is in pattern key:value."""  # noqa: D401
    pattern = rf"^[a-zA-Z\d_\.-]{{{lower_bound_key_length},63}}:.{{0,2048}}$"
    if not isinstance(value, str):
        raise NgcException(f"Key-value must match required pattern: {pattern}")
    if not re.match(pattern, value):
        raise NgcException(f"Key-value must match required pattern: {pattern}")
    return value


def check_if_email_used(user_id):  # noqa: D103
    if not isinstance(user_id, int) and not user_id.isdigit() and ("@" in user_id):
        raise NgcException(
            "ERROR: User Email is no longer supported. Please use the User ID"
            " instead \nIf User ID is unknown, list users with email filter."
        )
    return user_id


def check_uuid_pattern(value: str):
    """Determine whether a value is a uuid."""
    exception_str = "Invalid UUID."
    if not isinstance(value, str):
        raise NgcException(exception_str)
    try:
        uuid_obj = UUID(value, version=4)
    except ValueError as e:
        raise NgcException(exception_str) from e

    if uuid_obj != str(uuid_obj):
        raise NgcException(exception_str)

    return value


def check_non_empty_string(value):
    """Validate the input string is not empty after stripping whitespace."""
    if not isinstance(value, str):
        raise argparse.ArgumentTypeError("Must be a string")

    if not value.strip():
        raise argparse.ArgumentTypeError("Cannot be an empty string")

    return value
