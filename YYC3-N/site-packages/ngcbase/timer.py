#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from threading import Event, Thread


class FunctionExpiryTimer(Thread):  # noqa: D101
    def __init__(self, expiry_time, fn):
        super().__init__()
        self._expiry_time = expiry_time
        self._fn = fn
        self._stop = Event()
        self.daemon = True

    def run(self):  # noqa: D102
        while not self._stop.wait(timeout=self._expiry_time):
            self._fn()

    def cancel(self):  # noqa: D102
        self._stop.set()
