#
# Copyright (c) 2018-2022, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from ngcbase.printer.nvPrettyPrint import GeneralWrapper, NVPrettyPrint
from ngcbase.util.io_utils import mask_string


class ConfigPrinter(NVPrettyPrint):
    """The printer is responsible for printing config ouput."""

    def print_config(self, cfg_list):  # noqa: D102
        out = []
        if self.format_type == "json":
            for cfg_attr in cfg_list or []:
                row = GeneralWrapper(
                    key=cfg_attr["key"],
                    value=cfg_attr["value"],
                    source=cfg_attr["source"],
                )
                out.append(row)
            self.print_data(out)
            return
        out.append(["key", "value", "source"])
        for cfg_attr in cfg_list or []:
            out.append([cfg_attr["key"], cfg_attr["value"], cfg_attr["source"]])
        self.print_data(out, is_table=True)

    def print_configurations(self, configurations):  # noqa: D102
        out = []
        for key, configuration_details in configurations.items() or {}:
            key_name = configuration_details.get("key_name", "")
            masked_key = key if key == "no-apikey" else mask_string(key)
            out.append([key_name, masked_key])
        self.print_data(out, is_table=False)
