#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from isodate import Duration, duration_isoformat, ISO8601Error, parse_duration

from ngcbase.constants import SECONDS_IN_DAY, SECONDS_IN_HOUR, SECONDS_IN_MINUTE
from ngcbase.errors import NgcException


def dhms_to_isoduration(dhms):  # noqa: D103
    if dhms.isdigit():
        raise ISO8601Error
    dhms = dhms.upper()
    split = dhms.split("D")
    if len(split) == 2:
        day_count, time_part = split[0], split[1]
        return parse_duration("P" + day_count + "DT" + time_part)

    if split[0].isdigit():
        day_count = split[0]
        return parse_duration("P" + day_count + "D")

    time_part = split[0]
    return parse_duration("PT" + time_part)


def isoduration_to_dhms(duration):  # noqa: D103
    total_seconds = duration.total_seconds()

    if total_seconds // SECONDS_IN_DAY >= 1:
        form = "%dD%HH%MM%SS"
    elif total_seconds // SECONDS_IN_HOUR >= 1:
        form = "%HH%MM%SS"
    elif total_seconds // SECONDS_IN_MINUTE >= 1:
        form = "%MM%SS"
    else:
        form = "%SS"
    return duration_isoformat(duration, form)


def validate_dhms_duration(input_value):  # noqa: D103
    dhms = input_value.upper()
    try:
        return dhms_to_isoduration(dhms)
    except ISO8601Error:
        msg = "invalid duration: valid input format is [nD][nH][nM][nS]"
        raise ValueError(msg) from None


def validate_ymd_hms_datetime(input_value):  # noqa: D103
    try:
        return datetime.strptime(input_value, "%Y-%m-%d::%H:%M:%S")
    except ValueError:
        msg = "invalid datetime: valid input format is [yyyy-MM-dd::HH:mm:ss]"
        raise ValueError(msg) from None


def human_time(seconds):  # noqa: D103
    seconds = int(seconds)
    hours = seconds // 60 // 60
    minutes = seconds // 60 % 60
    seconds = seconds % 60
    res = ""
    if hours > 0:
        res += "{}h".format(hours)
    if minutes > 0:
        if res:
            res += " "
        res += "{}m".format(minutes)
    if seconds > 0:
        if res:
            res += " "
        res += "{}s".format(seconds)
    if not res:
        res = "0s"
    return res


def from_iso_format(datestr: str) -> datetime:
    """Convert an ISO 8601-formatted string into a datetime object.

    Once we're on python 3.11, we can replace this with `datetime.fromisoformat`. In versions before 3.11,
    `datetime.fromisoformat` doesn't recognize the 'Z' suffix as UTC.

    For context, a common ISO 8601 format is "1970-01-01T00:00:00.000Z"

    Args:
        datestr: An ISO 8601-formatted string.

    Returns:
        A datetime object.
    """
    datestr = datestr.replace("Z", "+00:00")
    return datetime.fromisoformat(datestr)


def diff_in_minutes(date1, date2):  # noqa: D103
    try:
        d1 = from_iso_format(date1).replace(microsecond=0)
    except TypeError:
        d1 = date1.replace(microsecond=0)

    try:
        d2 = from_iso_format(date2).replace(microsecond=0)
    except TypeError:
        d2 = date2.replace(microsecond=0)
    # If either of these is a naive datetime, then assume it's UTC.
    if not d1.tzinfo:
        d1 = d1.replace(tzinfo=timezone.utc)
    if not d2.tzinfo:
        d2 = d2.replace(tzinfo=timezone.utc)
    return d2 - d1


# pylint: disable=unsubscriptable-object
def calculate_date_range(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    duration: Optional[Duration] = None,
    default_duration: Duration = dhms_to_isoduration("7D"),
    datetime_format: Optional[str] = "%Y-%m-%dT%H:%M:%S.%fZ",
) -> Tuple[str, str]:
    """Calculate a start and end date from any combination of start date, end date, and duration.
    Duration is mutex with both start and end date together, but can be called with either separately.
    Default duration is 7 days.  Default end date is now.  Checks that start date is before end date.
    """  # noqa: D205
    seconds = default_duration.total_seconds() if duration is None else duration.total_seconds()
    end = datetime.today().utcnow() if end_date is None else end_date
    to_date = end.strftime(datetime_format)

    if not start_date:
        last_hour_datetime = end - timedelta(seconds=seconds)
        from_date = last_hour_datetime.strftime(datetime_format)

    else:
        if start_date and end_date and duration:
            raise NgcException(
                "Duration, begin-time, and end-time may not all be set; choose at most "
                "two of these options to specify a time window."
            )
        from_date = start_date.strftime(datetime_format)
        if end_date and end_date < start_date:
            raise ValueError("Error: begin-time must be before end-time.")
        if duration:
            range_datetime = start_date + timedelta(seconds=seconds)
            to_date = range_datetime.strftime(datetime_format)
    return from_date, to_date


def calculate_date_difference(start_date, end_date=None):
    """Calculate the difference between `start_date` and `end_date`. Must be datetime objects. Default for
    `end_date` is `datetime.now()`.
    """  # noqa: D205
    if not end_date:
        end_date = datetime.now()
    if isinstance(start_date, datetime) and isinstance(end_date, datetime):
        return end_date - start_date
    raise NgcException("Invalid datetime. Please provide a valid datetime object.") from None
