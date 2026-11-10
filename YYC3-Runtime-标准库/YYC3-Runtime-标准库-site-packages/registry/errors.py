#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

from ngcbase.errors import NgcAPIError, NgcException, ResourceNotFoundException


class ModelNotFoundException(ResourceNotFoundException):  # noqa: D101
    def __init__(self, model_name=None):
        message = f"Model '{model_name}' does not exist" if model_name else "Model does not exist"
        super().__init__(message)


class CSPNotFoundException(ResourceNotFoundException):  # noqa: D101
    def __init__(self, csp_name=None):
        message = f"CSP '{csp_name}' does not exist" if csp_name else "CSP does not exist"
        super().__init__(message)


class ChartNotFoundException(NgcAPIError):  # noqa: D101
    pass


class ChartAlreadyExistsException(NgcAPIError):  # noqa: D101
    pass


class ImageTagNotFound(NgcException):  # noqa: D101
    pass
