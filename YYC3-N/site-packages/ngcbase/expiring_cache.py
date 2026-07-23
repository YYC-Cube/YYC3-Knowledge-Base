#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from collections import OrderedDict
from threading import RLock
import time


class ExpiringCache(OrderedDict):  # noqa: D101
    class _CacheValue:
        def __init__(self, callback):
            self._callback = callback
            self.value = callback()
            self.put_time = time.time()

        def renew(self):
            self.value = self._callback()
            self.put_time = time.time()

    def __init__(self, max_timeout):
        super().__init__()
        self._lock = RLock()
        self._max_timeout = max_timeout

    def __setitem__(self, key, value):
        """Set d[key] to value."""
        with self._lock:
            OrderedDict.__setitem__(self, key, self._CacheValue(value))

    def __getitem__(self, key):  # noqa: D105
        with self._lock:
            item = OrderedDict.__getitem__(self, key)
            item_age = time.time() - item.put_time
            if item_age > self._max_timeout:
                item.renew()
            return item.value

    def get(self, key):  # noqa: D102
        return self[key]

    def items(self):  # noqa: D102
        return OrderedDict.items(self)

    def iteritems(self):  # noqa: D102
        raise NotImplementedError()

    def itervalues(self):  # noqa: D102
        raise NotImplementedError()

    def viewitems(self):  # noqa: D102
        raise NotImplementedError()

    def viewkeys(self):  # noqa: D102
        raise NotImplementedError()

    def viewvalues(self):  # noqa: D102
        raise NotImplementedError()
