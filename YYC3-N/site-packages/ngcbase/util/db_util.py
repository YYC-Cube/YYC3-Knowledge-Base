#
# Copyright (c) 2020, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.


class NGC_DB:  # noqa: D101
    def __init__(self):
        pass

    def load(self):  # noqa: D102
        raise NotImplementedError("load() must be implemented.")

    def store(self):  # noqa: D102
        raise NotImplementedError("load() must be implemented.")
