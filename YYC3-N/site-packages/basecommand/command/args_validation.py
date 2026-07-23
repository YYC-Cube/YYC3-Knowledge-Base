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


import argparse
import json
import platform
import re

from basecommand.constants import JOB_RESOURCE_VALUES
from basecommand.data.api.JobCreateRequest import JobCreateRequest
from basecommand.data.api.NetworkProtocolEnum import NetworkProtocolEnum
from ngcbase.errors import NgcException
from ngcbase.util.datetime_utils import dhms_to_isoduration
from ngcbase.util.utils import contains_glob


def check_batch_datasetid(value):
    """Validate the datasetid arg for batch commands.  (dataset_id:mount_point)."""
    if not re.match(r"\S+:\S+$", value):
        msg = "Invalid input: '{}'. Valid value is dataset_id:mount_point.".format(value)
        raise argparse.ArgumentTypeError(msg)

    return value


def check_batch_workspaceid(value):
    """Validate the workspaceid arg for batch commands.
    (format: <workspace-id|workspace-name>:<mountpoint>:<mount-mode>)
    mount-mode is an optional argument which has values in RW|RO
    """  # noqa: D205, D415
    split_values = value.split(":")
    if len(split_values) == 3 and split_values[-1].strip() not in ["RW", "RO"] or len(split_values) < 2:
        msg = (
            "Invalid input: '{}'. Valid value can either be "
            "<workspace_id|workspace_name>:<mount_point> or "
            "<workspace_id|workspace_name>:<mount_point>:<RW|RO>".format(value)
        )
        raise argparse.ArgumentTypeError(msg)

    return value


def check_batch_label(value):
    """Base Command labels must validate to ^[a-zA-Z_]+[a-zA-Z0-9_]+' and max length 256."""  # noqa: D401
    labels = value.split(",")
    for label in labels or []:
        if not label or not re.match(r"^[a-zA-Z_]([a-zA-Z0-9_]*)?$", label) or len(label) > 256:
            msg = (
                f"Invalid input: '{label}' - "
                "Base Command labels must start with alphanumeric characters or '_' and valid characters are "
                "alphanumeric, digit and '_'. It must be no more than 256 chars."
            )
            raise argparse.ArgumentTypeError(msg)

    return labels


def check_batch_label_match(value):
    """Base Command matching labels must validate to ^[a-zA-Z0-9_*?]+' and max length 256."""  # noqa: D401
    labels = value.split(",")
    for label in labels or []:
        if not label or not re.match(r"^([a-zA-Z0-9_\*\?]*)?$", label) or len(label) > 256:
            msg = (
                f"Invalid input: '{label}' - "
                "Valid characters are alphanumeric, digit, '_', '*' and '?'. It must be no more than 256 chars."
            )
            raise argparse.ArgumentTypeError(msg)

    return labels


def check_batch_reason(value):
    """Base Command job termination reason max length 80."""  # noqa: D401
    if not (isinstance(value, str) and len(value) <= 80):
        raise argparse.ArgumentTypeError("Job termination reason must be no more than 80 chars.")

    return value


def check_shell_support(args):  # noqa: D103
    if platform.system() == "Windows":
        raise NgcException("The --shell option is not supported for windows.")
    if args.total_runtime.total_seconds() > dhms_to_isoduration("24H").total_seconds():
        raise NgcException("The maximum value for --total-runtime with --shell is 24 hours.")


def check_job_submit_json_file():
    """Validates job submit json file for resource parameters."""  # noqa: D401

    class CheckJobJson(argparse.Action):

        # pylint: disable=arguments-differ
        # method adds args to base method
        def __call__(self, parser, namespace, value, *args, **kwargs):
            try:
                job_create = None
                with open(value, encoding="utf-8") as json_file:
                    try:
                        json_data = json.load(json_file)
                        job_create = JobCreateRequest(
                            json_data if "jobDefinition" not in json_data else json_data["jobDefinition"]
                        )
                    except (ValueError, TypeError) as e:
                        raise ValueError("ERROR: Json file is not valid: {0}".format(str(e))) from None
                # check if file is empty
                if job_create and not job_create.toDict():
                    msg = "json file: %r does not contain a valid JobCreationRequest." % value
                    raise argparse.ArgumentError(self, msg)
            except IOError as e:
                raise argparse.ArgumentError(self, e) from None
            except AttributeError as e:
                raise argparse.ArgumentError(self, e) from None

            setattr(namespace, self.dest, value)

    return CheckJobJson


def check_port_mapping(value):
    """Validate the input port mapping."""
    name = protocol = None
    try:
        if value:
            if ":" in value:
                name, value = value.split(":", 1)
                if name and not (isinstance(name, str) and name.isalnum() and name[0].isalpha() and len(name) <= 10):
                    msg = (
                        "Name must contain only alphanumeric characters, start with an alphabet and be no more than "
                        f"10 chars: {name}"
                    )
                    raise argparse.ArgumentTypeError(msg) from None
            if "/" in value:
                value, protocol = value.split("/", 1)
                if protocol and protocol not in NetworkProtocolEnum:
                    msg = f"Invalid protocol value: {protocol} "
                    raise argparse.ArgumentTypeError(msg) from None

        if name and (not protocol or protocol in ["HTTPS", "GRPC"]):
            msg = "Name requires a protocol other than HTTPS or GRPC."
            raise argparse.ArgumentTypeError(msg) from None

        if value is not None and not isinstance(value, int):
            value = int(value)

        container_port_min = JOB_RESOURCE_VALUES["containerPortMin"]
        container_port_max = JOB_RESOURCE_VALUES["containerPortMax"]
        container_port_not_allowed = JOB_RESOURCE_VALUES["containerPortNotAllowed"]
        if not is_valid_container_port(value):
            msg = (
                f"Invalid value: '{value}' for container port. Allowed range is "
                f"[{container_port_min}-{container_port_not_allowed - 1}]"
                f"[{container_port_not_allowed + 1}-{container_port_max}]"
            )
            raise argparse.ArgumentTypeError(msg)
    except ValueError:
        msg = f"Invalid integer value: {value} "
        raise argparse.ArgumentTypeError(msg) from None
    except TypeError:
        msg = f"Invalid integer: {value} for container port"
        raise argparse.ArgumentTypeError(msg) from None

    return (name, value, protocol or "HTTPS")


def is_valid_container_port(value):  # noqa: D103
    container_port_min = JOB_RESOURCE_VALUES["containerPortMin"]
    container_port_max = JOB_RESOURCE_VALUES["containerPortMax"]
    container_port_not_allowed = [JOB_RESOURCE_VALUES["containerPortNotAllowed"]]
    return is_valid_port_number(
        value, min_port=container_port_min, ports_not_allowed=container_port_not_allowed, max_port=container_port_max
    )


def is_valid_port_number(value, ports_not_allowed=None, min_port=0, max_port=65535):  # noqa: D103
    result = re.match(r"^[0-9]+$", str(value))
    if not result:
        raise TypeError("Invalid type: %r expected int" % value)
    is_valid = False
    if min_port <= int(value) <= max_port:
        is_valid = True
    # besides range there are certain ports which are not allowed check
    # if the input port has any of these values
    if ports_not_allowed:
        if int(value) in ports_not_allowed:
            is_valid = False
    return is_valid


def check_secret_pattern(value):
    """Validates a given value is in form secret_name:key_name:alias
    Or secret_name:key_name
    or secret_name
    """  # noqa: D205, D401, D415
    msg = (
        r"A secret must match one of the following patterns: ^[a-zA-Z\d_\.-]{1,63}$ or"
        r" ^[a-zA-Z\d_\.-]{1,63}$:^[a-zA-Z\d_\.-]{1,63}$ or"
        r" ^[a-zA-Z\d_\.-]{1,63}$:^[a-zA-Z\d_\.-]{1,63}$:^[a-zA-Z\d_\.-]{1,63}$"
    )
    if not isinstance(value, str):
        raise NgcException(msg)
    split_values = value.split(":")
    if len(split_values) > 3:
        raise NgcException(msg)
    for v in split_values or []:
        if not v or not re.match(r"^[a-zA-Z\d_\.-]{1,63}$", v):
            raise NgcException(msg)
    return split_values


def get_start_end_from_range(input_range, range_min, range_max):  # noqa: D103
    result = re.match(r"(\d+)(?:-(\d+))?$", input_range)
    if not result:
        raise TypeError("Input range format is not valid.")

    start_of_range = int(result.group(1))
    end_of_range = result.group(2) or start_of_range
    end_of_range = int(end_of_range)
    is_valid = range_min <= start_of_range <= end_of_range <= range_max
    if not is_valid:
        msg = "Invalid range: %r (choose from %d-%d)" % (input_range, range_min, range_max)
        raise ValueError(msg)
    result_list = [start_of_range, end_of_range]
    return result_list


class JobSelector(argparse.Action):
    """Handle job selection input.

    jobid|jobidrange|jobidlist|jobidpattern

    Examples:  '1-5', '1,10-15', '123*', '123?4'
    """

    # TODO(py3): address in more correct/safe way
    def __init__(self, minimum=None, maximum=None, *args, **kwargs):  # pylint: disable=keyword-arg-before-vararg
        self.min = minimum
        self.max = maximum
        super().__init__(*args, **kwargs)

    # pylint: disable=arguments-differ
    # method adds args to base method
    def __call__(self, parser, namespace, value, *args, **kwargs):  # noqa: D102
        value = re.sub(r"\s+", "", value)

        result_list = []
        try:
            list_of_jobs = value.split(",")

            for element in list_of_jobs:
                if contains_glob(element):
                    result_list.append(element)
                elif "-" in element:
                    result_list.append(get_start_end_from_range(element, self.min, self.max))
                else:
                    try:
                        is_valid = self.min <= int(element) <= self.max
                    except ValueError:
                        # transform to TypeError for generic error handling below.
                        raise TypeError from None
                    if not is_valid:
                        msg = "Invalid range: %r (choose from %d-%d)" % (element, self.min, self.max)
                        raise ValueError(msg)
                    result_list.append(int(element))
        except TypeError:
            msg = (
                f"Invalid job id: '{value}'. Valid format is {self.metavar}. "
                f"An input example: 1-5 or 1,10-15. Valid range for ID is {self.min}-{self.max}."
            )
            raise argparse.ArgumentError(self, msg) from None
        except ValueError as e:
            raise argparse.ArgumentError(self, str(e)) from None
        except argparse.ArgumentError:
            raise
        except Exception as e:
            raise argparse.ArgumentError(self, str(e)) from None

        setattr(namespace, self.dest, _jobid_generator(result_list))


def _jobid_generator(selector):
    """Helper function for JobSelector.

    Given JobSelector input, create a generator that collapses each range and list element
    into single elements.
    """  # noqa: D401
    for job_id in selector:
        if isinstance(job_id, list):
            start_job_id, end_job_id = int(job_id[0]), int(job_id[1])
            for range_job_id in range(start_job_id, end_job_id + 1):
                yield range_job_id
        else:
            yield job_id


def check_resource_allocation(value):  # noqa: D103

    if not isinstance(value, str):
        msg = f"Invalid value: {value} "
        raise argparse.ArgumentTypeError(msg) from None

    val = value.split(":")

    if len(val) != 4:
        msg = f"Invalid value: {value} "
        raise argparse.ArgumentTypeError(msg) from None

    if not isinstance(val[0], str):
        msg = f"Invalid value: {value} {val[0]}"
        raise argparse.ArgumentTypeError(msg) from None

    if val[3] not in ["HIGH", "LOW", "NORMAL"]:
        msg = f"Invalid value: {value} {val[3]}, valid values 'HIGH', 'LOW' or 'NORMAL'"
        raise argparse.ArgumentTypeError(msg) from None

    try:
        val[1] = int(val[1])
        val[2] = int(val[2])
    except ValueError:
        msg = f"Invalid value: {value} {val[1]} {val[2]}"
        raise argparse.ArgumentTypeError(msg) from None

    return {
        "resourceTypeName": val[0],
        "limit": val[1],
        "share": val[2],
        "highestPriorityClass": val[3],
        "reservationType": "STATIC",
    }


def check_remove_resource_allocation(value):  # noqa: D103

    if not isinstance(value, str):
        msg = f"Invalid value: {value} "
        raise argparse.ArgumentTypeError(msg) from None

    return {"resourceTypeName": value}


class DatasetSelector(JobSelector):
    """Handle job selection input.

    jobid|jobidrange|jobidlist|jobidpattern

    Examples:  '1-5', '1,10-15', '123*', '123?4', 'mgAU7GTHSoGguGlRW4TpoQ'
    """

    # TODO(py3): address in more correct/safe way
    def __init__(self, minimum=None, maximum=None, *args, **kwargs):  # pylint: disable=keyword-arg-before-vararg
        self.minimum = minimum
        self.maximum = maximum
        super().__init__(*args, **kwargs)

    @staticmethod
    def is_valid_uuid_base64(list_of_jobs):  # noqa: D102
        if len(list_of_jobs) == 1:
            element = list_of_jobs[0]
            uuid_base64_pattern = re.compile(r"^[A-Za-z0-9_\\-]{22}$")
            result = uuid_base64_pattern.match(element) is not None
            return result
        return False

    # pylint: disable=arguments-differ
    # method adds args to base method
    def __call__(self, parser, namespace, value, *args, **kwargs):  # noqa: D102
        value = re.sub(r"\s+", "", value)

        result_list = []

        try:
            list_of_jobs = value.split(",")
            if DatasetSelector.is_valid_uuid_base64(list_of_jobs):
                result_list.append(list_of_jobs[0])
                setattr(namespace, self.dest, _jobid_generator(result_list))
                return
            for element in list_of_jobs:
                if contains_glob(element):
                    result_list.append(element)
                elif "-" in element:
                    result_list.append(get_start_end_from_range(element, self.minimum, self.maximum))
                else:
                    try:
                        is_valid = self.minimum <= int(element) <= self.maximum
                    except ValueError:
                        # transform to TypeError for generic error handling below.
                        raise TypeError from None
                    if not is_valid:
                        msg = "Invalid range: %r (choose from %d-%d)" % (element, self.minimum, self.maximum)
                        raise ValueError(msg)
                    result_list.append(int(element))
        except TypeError:
            msg = (
                f"Invalid job id: '{value}'. Valid format is {self.metavar}. "
                f"An input example: 1-5 or 1,10-15. Valid range for ID is {self.minimum}-{self.maximum}. "
                "Note: Data Platform API requires a base-64 UUID ID."
            )
            raise argparse.ArgumentError(self, msg) from None
        except ValueError as e:
            raise argparse.ArgumentError(self, str(e)) from None
        except argparse.ArgumentError:
            raise
        except Exception as e:
            raise argparse.ArgumentError(self, str(e)) from None

        setattr(namespace, self.dest, _jobid_generator(result_list))
