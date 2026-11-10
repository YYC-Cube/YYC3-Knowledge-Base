#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from __future__ import print_function

import csv
import itertools
import json
import os
import re
import sys
import types

from rich.console import Console
from rich.markup import escape as rich_escape

from ngcbase.environ import NGC_CLI_RICH_OUTPUT
from ngcbase.printer.prettytableWrap import PrettyTableWrap


class Formatter:  # noqa: D101
    def __init__(self):
        self.LINE = ""
        self.HEADER = ""
        self.ATRIB = ""
        self.ENDC = ""
        self.ERROR = ""
        self.WARN = ""
        self.OK = ""
        self.HEADER_SPACING = self._insert_space(2)
        self.ATTRIB_SPACING = self._insert_space(4)
        self.SUB_ATTRIB_SPACING = self._insert_space(8)

    @staticmethod
    def _insert_space(depth):
        return " " * depth


class JsonFormatter(Formatter):
    """Prints the input list in JSON format."""

    def __call__(self, input_list_obj, is_table=False, no_wrap_columns=None):  # noqa: D102
        if isinstance(input_list_obj, (types.GeneratorType, itertools.chain, list)):
            _elem = None
            print("[", end="")
            try:
                for pos, elem in enumerate(input_list_obj):
                    if pos:
                        # Skip the comma for the first element
                        print(",", end="")
                    _elem = elem
                    json_elem = elem.toJSON(True)
                    print(json_elem, end="")
                print("]")
            except AttributeError:
                if isinstance(input_list_obj, (types.GeneratorType, itertools.chain)) and _elem:
                    input_list_obj = itertools.chain([_elem], input_list_obj)
                # EGX data is json, not schema object
                # opening bracket already printed before attempt to call toJSON()
                print("{}]".format(",".join([json.dumps(elem, indent=4, sort_keys=True) for elem in input_list_obj])))
        else:
            # Assume it is a single object instead of a list of them
            try:
                print(input_list_obj.toJSON(True))
            except AttributeError:
                # EGX data is json, not schema objects
                print(json.dumps(input_list_obj, indent=4, sort_keys=True))


class AsciiFormatter(Formatter):
    """Prints the input list in ASCII format."""

    def __call__(self, input_list, is_table=False, no_wrap_columns=None):
        """Converts an input list to an ascii format and prints it."""  # noqa: D401
        sys.stdout.reconfigure(encoding="utf-8")
        if NGC_CLI_RICH_OUTPUT:
            return self._make_rich(input_list, is_table=is_table)
        return self._make_plain(input_list, is_table=is_table, no_wrap_columns=no_wrap_columns)

    def _make_plain(self, input_list, is_table=False, no_wrap_columns=None):
        # prints ascii table
        no_wrap_columns = no_wrap_columns or []
        if is_table:
            # First row will contain the column names
            header = True
            tbl = None
            for row in input_list:
                if header:
                    header = False
                    # add fields for the table
                    tbl = PrettyTableWrap(row, no_wrap_columns=no_wrap_columns)
                    tbl.align = "l"
                    tbl.vertical_char = self.LINE + "|" + self.ENDC
                    tbl.horizontal_char = self.LINE + "-" + self.ENDC
                    tbl.junction_char = self.LINE + "+" + self.ENDC
                    continue
                # check is there is a list within list
                if any(isinstance(elem, list) for elem in row):
                    row_list = []
                    # iterate through the sublist. Create a table
                    # for sublist and add it to table row.
                    for col in row:
                        if isinstance(col, list):
                            tr = self._build_table_from_list(col)
                            row_list.append(tr)
                        else:
                            row_list.append(col)
                    tbl.add_row(row_list)
                else:
                    tbl.add_row(row)
            print(tbl)
        else:
            for elem in input_list:
                if isinstance(elem, list):
                    print(":".join(elem))
                else:
                    print(elem)

    @staticmethod
    def _make_rich(input_list, is_table=False):
        # Cannot place at top, due to circular import issues.
        # pylint: disable=import-outside-toplevel
        from ngcbase.printer.nvPrettyPrint import NVPrettyPrint

        printer = NVPrettyPrint(format_type="ascii", is_guest_mode=False)
        if is_table:
            # First row will contain the column names
            header = True
            table = None
            for row in input_list:
                if header:
                    table = printer.create_table_columns(row)
                    header = False
                    continue
                str_row = [f"{rich_escape(item) if isinstance(item, (str, bytes)) else item}" for item in row]
                table.add_row(*str_row)
            Console(emoji=False).print(table, overflow="fold")

    @staticmethod
    def _build_table_from_list(input_list):
        """Constructs table out of list."""  # noqa: D401
        if not input_list or not isinstance(input_list, list):
            return None

        tbl = PrettyTableWrap(input_list[0])
        tbl.align = "l"
        tbl.vertical_char = " "
        tbl.horizontal_char = " "
        tbl.junction_char = " "
        for r in input_list[1:]:
            tbl.add_row(r)

        return tbl


class CSVFormatter(Formatter):
    """Prints the input list in CSV format."""

    def __init__(self, output_target=None):
        super().__init__()
        self.output_target = output_target

    def __call__(self, input_generator, is_table=False, no_wrap_columns=None):
        """Converts input generator into CSV format."""  # noqa: D401
        try:
            csv_writer = csv.writer(self.output_target or sys.stdout, lineterminator=os.linesep)
            for r in input_generator:
                # check is there is a list within list
                if any(isinstance(elem, list) for elem in r):
                    row_list = []
                    # iterate through the sublist. Create a table
                    # for sublist and add it to table row.
                    for c in r:
                        if isinstance(c, list):
                            for t in c:
                                row_list.append([str(x).strip() for x in t])
                        else:
                            row_list.append(str(c).strip())
                    csv_writer.writerow(row_list)
                elif isinstance(r, list):
                    csv_writer.writerow([str(x).strip() for x in r])
                elif re.match(r"^[-]+$", str(r)):
                    continue
                else:
                    csv_writer.writerow([r.strip()])
        except IOError as e:
            raise IOError("IOError:{0}: while converting data to csv".format(e)) from None


def get_formatter(format_type, output_target=None):  # noqa: D103
    if format_type.lower() == "json":
        return JsonFormatter()

    if format_type.lower() == "ascii":
        return AsciiFormatter()

    if format_type.lower() == "csv":
        return CSVFormatter(output_target)

    raise ValueError("Type:{0} not supported.".format(format_type))
