#
# Copyright (c) 2018-2021, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from shutil import get_terminal_size
import textwrap

from prettytable import PrettyTable

# hrule styles
FRAME = 0
ALL = 1

# wrapping amounts
FIXED_WRAP = 24
LONG_PERCENTS = [8, 8, 8, 8, 12, 8, 8, 8, 8, 8, 8, 8]

# constants for number of columns in table
SHORT = [5, 6]
LONG = 12


class PrettyTableWrap(PrettyTable):  # noqa: D101
    def __init__(self, field_names=None, no_wrap_columns=None, **kwargs):
        super().__init__(field_names=field_names, **kwargs)
        self._columns = len(field_names)
        self._hrule = None
        if self._left_padding_width is None:
            self._left_padding_width = 1
        if self._right_padding_width is None:
            self._right_padding_width = 1
        self._column_padding = self._left_padding_width + self._right_padding_width + (1 if self._vrules == ALL else 0)
        self._terminal_width = get_terminal_size()[0]
        if self._terminal_width <= 0:  # not running in a terminal, use fixed wrap width
            self._wrap_widths = [FIXED_WRAP] * self._columns
        else:  # running in a terminal
            if self._columns in SHORT and field_names[-1] == "Status Details":  # short version of job status table
                self._wrap_widths = [0] * (self._columns - 1)  # don't wrap columns that aren't status details
                self._wrap_widths.append(FIXED_WRAP)
            elif self._columns == LONG:
                self._wrap_widths = [
                    max(
                        int(self._terminal_width * percent // 100) - self._column_padding,
                        1,
                    )
                    for percent in LONG_PERCENTS
                ]
            else:
                self._wrap_widths = [
                    max(
                        int(self._terminal_width // self._columns) - self._column_padding,
                        1,
                    )
                ] * self._columns
            # Ensure that if any columns are marked as "no wrap", they aren't wrapped.
            for col in no_wrap_columns or []:
                try:
                    col_pos = field_names.index(col)
                except ValueError:
                    # Column is not present
                    continue
                self._wrap_widths[col_pos] = 0
        if field_names:
            self._header = False
            self.add_row(field_names)

    def add_row(self, row):  # noqa: D417
        """Add a row to the table.

        Arguments:
        row - row of data, should be a list with as many elements as the table has fields
        border - toggles whether there should be a horizontal border/divider below the new row
        """
        wrapped_r = []
        for i, c in enumerate(row):
            if self._wrap_widths[i] <= 0:
                wrapped_r.append(c)
            else:
                wrapped_r.append(textwrap.fill(str(c), self._wrap_widths[i]))
        super().add_row(wrapped_r)

    def get_string(self, **kwargs):  # noqa: D102
        options = self._get_options(kwargs)

        lines = []

        # Don't think too hard about an empty table
        # Is this the desired behaviour?  Maybe we should still print the header?
        if self.rowcount == 0 and (not options["print_empty"] or not options["border"]):
            return ""

        # Get the rows we need to print, taking into account slicing, sorting, etc.
        rows = self._get_rows(options)

        # Turn all data in all rows into Unicode, formatted as desired
        formatted_rows = self._format_rows(rows, options)

        # Compute column widths
        self._compute_widths(formatted_rows, options)

        # Add "header"
        self._hrule = self._stringify_hrule(options)
        if options["border"] and options["hrules"] == FRAME:
            lines.append(self._hrule)
        lines.append(self._stringify_row(formatted_rows[0], options))
        lines.append(self._hrule)

        # Add rows
        for row in formatted_rows[1:]:
            lines.append(self._stringify_row(row, options))

        # Add bottom of border
        if options["border"] and options["hrules"] == FRAME:
            lines.append(self._hrule)

        return "\n".join(lines)
