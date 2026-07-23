#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.


class Singleton(type):  # noqa: D101
    _instances = {}

    def __call__(cls, *args, **kwargs):  # noqa: D102
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class ParentClassSingleton(type):  # noqa: D101
    _instances = {}

    def __call__(cls, *args, **kwargs):  # noqa: D102
        _bases = list(cls.mro())
        _bases.pop()
        _base = _bases.pop()
        if _base not in cls._instances:
            cls._instances[_base] = super().__call__(*args, **kwargs)

        return cls._instances[_base]
