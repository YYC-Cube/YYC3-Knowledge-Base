#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from __future__ import division, print_function

from builtins import round
from contextlib import contextmanager
import datetime
import json
import sys
import time

from dateutil import parser as date_parser
from isodate import Duration
from rich import box
from rich import print as print_rich
from rich.console import Console
from rich.live import Live
from rich.markup import escape as rich_escape
from rich.progress import (
    BarColumn,
    DownloadColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
    TransferSpeedColumn,
)
from rich.table import Table

from ngcbase.constants import API_KEY_DEPRECATION_DATE, CLEAR_LINE_CHAR
from ngcbase.environ import (
    NGC_CLI_ENSURE_ASCII,
    NGC_CLI_PROGRESS_BAR_STYLE,
    NGC_CLI_RICH_OUTPUT,
)
from ngcbase.printer.formatter import get_formatter
from ngcbase.util.datetime_utils import human_time, isoduration_to_dhms
from ngcbase.util.file_utils import human_size
from ngcbase.util.utils import convert_EGX_roles

DEFAULT_HEADER_STYLE = "bold green"
DEFAULT_LIVE_COLUMN_TITLES = ("Layer", "Status")
DEFAULT_COLUMN_STYLE = ""
DEFAULT_SPINNER_STYLE = "point"
DEFAULT_SPINNER_COLOR = "green"
DEFAULT_DIAG_COLOR = "bold green"
DEFAULT_PROGRESS_BAR_WIDTH = 44
DEFAULT_PROGRESS_BAR_TEXT_COLOR = "bright_cyan"
# These are needed for running in environments that don't support unicode
BOX_STYLE_MAPPING = {"DEFAULT": box.HEAVY, "ASCII": box.ASCII, "NONE": box.SIMPLE}
DEFAULT_BOX_STYLE = BOX_STYLE_MAPPING.get(NGC_CLI_PROGRESS_BAR_STYLE, box.HEAVY)
SPINNER_MAPPING = {"DEFAULT": "dots", "ASCII": "bouncingBar", "NONE": None}

INDENT = "  "
SEPARATOR_PLACEHOLDER = "-SEP" * 13


class GeneralWrapper:
    """This class can be used to wrap arbitrary information, acts a lot like a dictionary.
    It can be use to simply print something custom.
    """  # noqa: D205, D404

    def __init__(self, **kwargs):
        self._dict = kwargs

    @classmethod
    def from_dict(cls, in_dict):  # noqa: D102
        return cls(**in_dict)

    # This needs to follow the convention set by json-parser, ignore error
    # noinspection PyPep8Naming
    def toJSON(self, pretty=False):  # noqa: D102
        return json.dumps(self._dict, sort_keys=True, indent=4 if pretty else None, ensure_ascii=NGC_CLI_ENSURE_ASCII)


class NVPrettyPrint:  # noqa: D101
    def __init__(self, config=None, *, format_type=None, is_guest_mode=None):
        if config is None and format_type is None:
            raise TypeError("Must specify either `config` or `format_type`")
        self.LINE = ""
        self.HEADER = ""
        self.ATRIB = ""
        self.ENDC = ""
        self.ERROR = ""
        self.WARN = ""
        self.OK = ""
        self.HEADER_SPACING = self._insert_space(2)
        self.HEADER_WITH_SPACE = self.HEADER + self.HEADER_SPACING
        self.ATTRIB_SPACING = self._insert_space(4)
        self.ATTR_WITH_SPACE = self.ATRIB + self.ATTRIB_SPACING
        self.SUB_ATTRIB_SPACING = self._insert_space(8)
        self.SUB_ATTR_WITH_SPACE = self.ATRIB + self.SUB_ATTRIB_SPACING
        self.SUB_SUB_ATTRIB_SPACING = self._insert_space(12)
        self.SUB_SUB_ATTR_WITH_SPACE = self.ATRIB + self.SUB_SUB_ATTRIB_SPACING
        self._config = config
        self._format_type = format_type
        self._is_guest_mode = is_guest_mode
        self.live_table_data = None
        self.live_table = None
        self.live_console = None
        self.progress_table = None
        self.output = []
        self.outer_container = None
        self.main_table = None
        self.inner_tables = []

    @property
    def format_type(self) -> str:
        """The format type to output."""
        if self._config:
            return self._config.format_type
        return self._format_type

    @property
    def is_guest_mode(self) -> bool:
        """Whether or not the CLI is in guest mode."""
        if self._config:
            return self._config.is_guest_mode
        return self._is_guest_mode

    def print_ok(self, txt, title=False, **kwargs):  # noqa: D102
        if self.format_type != "json":
            if NGC_CLI_RICH_OUTPUT:
                txt = rich_escape(txt) if isinstance(txt, (str, bytes)) else txt
                if title:
                    txt = f"[{DEFAULT_DIAG_COLOR}]{txt}"
                print_rich(self.OK + txt + self.ENDC, **kwargs)
            else:
                print(self.OK + txt + self.ENDC, **kwargs)
            sys.stdout.flush()

    def print_head(self, string):  # noqa: D102
        if self.format_type != "json":
            print(self.HEADER + string + self.ENDC)

    @staticmethod
    def print_json(dictionary, ensure_ascii=True):  # noqa: D102
        print(json.dumps(dictionary, sort_keys=True, indent=4, ensure_ascii=NGC_CLI_ENSURE_ASCII or ensure_ascii))

    def print_error(self, string):  # noqa: D102
        if self.format_type != "json":
            print(self.ERROR + str(string) + self.ENDC, file=sys.stderr)
            sys.stderr.flush()
        else:
            wrapped = GeneralWrapper(error=self.ERROR + str(string) + self.ENDC)
            print(wrapped.toJSON(pretty=True), file=sys.stderr)
            sys.stderr.flush()

    def print_warning(self, string):  # noqa: D102
        # no json or csv, it will break scripts if warning randomly show up
        if self.format_type not in ["json", "csv"]:
            print(self.WARN + str(string) + self.ENDC)

    def print_upgrade_message(self, latest_version, version_num):  # noqa: D102
        if self.format_type not in ["json", "csv"]:
            print(
                f"CLI_VERSION: Latest - {latest_version} available (current:"
                f" {version_num}). Please update by using the command 'ngc version"
                " upgrade' \n"
            )

    def print_api_key_deprecation_warning(self):  # noqa: D102
        if self.format_type not in ["json", "csv"]:
            print(
                "WARNING:\n"
                f"THIS API KEY WILL BE DEPRECATED ON '{API_KEY_DEPRECATION_DATE}'.\n"
                "Please visit the NGC Website to create new Keys.\n"
            )

    def print_key_expiration_warning_message(self, key_expiration_time, masked_sak_key):  # noqa: D102
        if self.format_type not in ["json", "csv"]:
            print(f"ATTENTION:\nAPI Key {masked_sak_key} is expiring on {key_expiration_time}.")

    @staticmethod
    def print_upgrade_info_message(latest_version, version_num):  # noqa: D102
        print(f"CLI_VERSION: Latest - {latest_version} available (current: {version_num}). \n")

    @staticmethod
    def _insert_space(depth):
        space = ""
        for _ in range(0, depth):
            space += " "
        return space

    def print_dotted_line(self):  # noqa: D102
        if self.format_type != "json":
            self.print_data([self.make_dotted_line(52)])

    def print_data(self, input_str, is_table=False, output_target=None, no_wrap_columns=None):  # noqa: D102
        formatter = get_formatter(self.format_type, output_target=output_target)
        formatter(input_str, is_table=is_table, no_wrap_columns=no_wrap_columns)

    def print_shell_warning(self, time_):  # noqa: D102
        if time_ <= 0:
            return
        msg = (
            "WARNING: This shell job will terminate in"
            f" {isoduration_to_dhms(Duration(seconds=time_))}. Please take any"
            " necessary steps to preserve your work."
        )
        self.print_head(msg)

    # TODO - these helpers won't handle None
    def make_dotted_line(self, length=50):  # noqa: D102
        return self.LINE + ("-" * length) + self.ENDC

    def make_sub_dotted_line(self, length=50):  # noqa: D102
        return self.LINE + self.ATTRIB_SPACING + ("-" * length) + self.ENDC

    def make_header_line(self, header=""):  # noqa: D102
        return self.HEADER_WITH_SPACE + (header or "") + self.ENDC

    def make_attr_line(self, attr_name="", attr_val=""):  # noqa: D102
        return self.ATTR_WITH_SPACE + str_(attr_name) + ": " + str_(attr_val) + self.ENDC

    def make_sub_attr_line(self, sub_attr_val=""):  # noqa: D102
        return self.SUB_ATTR_WITH_SPACE + str_(sub_attr_val) + self.ENDC

    def make_sub_sub_attr_line(self, sub_sub_attr_val=""):  # noqa: D102
        return self.SUB_SUB_ATTR_WITH_SPACE + str_(sub_sub_attr_val) + self.ENDC

    def make_table_cell(self, attr_val=""):  # noqa: D102
        return self.ATRIB + str_(attr_val) + self.ENDC

    def make_attr_name_line(self, attr_name=""):  # noqa: D102
        return self.ATTR_WITH_SPACE + str_(attr_name) + ":" + self.ENDC

    @staticmethod
    def create_table(
        title="",
        title_justify=None,
        show_header=False,
        box_style=None,
        header_style=DEFAULT_HEADER_STYLE,
        width=None,
    ):
        """Generic method for creating a table.

        :param title: the text to appear above the table. Default=None
        :param title_justify: controls placement of title text. Should be one of "left", "center", or "right".
            Default="left"
        :param show_header: controls if the column headers are shown. Default=False
        :param box_style: controls the appearance of the outlines of the table. A list of box style names and their
            appearance can be found here: https://github.com/willmcgugan/rich/blob/master/docs/source/appendix/box.rst.
        :param header_style: controls the appearance of the header text for all columns. Individual columns can override
            this style with their own style. Styles can include a color and an effect such as "bold" or "dim". An
            explanation of acceptable values for this parameter can be found here:
            https://github.com/willmcgugan/rich/blob/master/docs/source/style.rst

        :returns a Table object that you can add values to for output.
        """  # noqa: D401
        if not box_style:
            box_style = DEFAULT_BOX_STYLE if box_style is None else None
        elif isinstance(box_style, str):
            box_style = getattr(box, box_style.upper(), DEFAULT_BOX_STYLE)
        return Table(
            title=title,
            title_justify=title_justify,
            show_header=show_header,
            box=box_style,
            header_style=header_style,
            width=width,
        )

    def create_table_columns(self, columns):  # noqa: D102
        table = self.create_table(
            show_header=True,
            box_style=DEFAULT_BOX_STYLE,
            header_style=DEFAULT_HEADER_STYLE,
        )
        for column in columns:
            table.add_column(column, style=DEFAULT_COLUMN_STYLE, overflow="fold")
        return table

    def print_output(self, markup=False):  # noqa: D102
        for table in self.inner_tables:
            to_add = table.table if isinstance(table, WrapperTable) else table
            self.outer_container.add_row(to_add)
        self.print_table(self.outer_container, markup=markup)

    @staticmethod
    def print_table(table, render_emoji=False, add_blank=True, markup=False):
        """Output the table to stdout.

        :param render_emoji: The rich library interprets words surrounded by colons, such as ":smiley:", as placeholders
            for emojis. By default this is disabled; if you wish to include emojis in your output, pass this as True.
        :param add_blank: The output generally looks better if it is separarted by a blank line from the command that
            generated it. If you wish to suppress this blank line, pass this as False.
        """
        if add_blank:
            print()
        # We always want the tables cells to print full info, so pass overflow as "fold"
        Console(emoji=render_emoji).print(table, overflow="fold", markup=markup)

    def create_live_table(self, column_titles=None):
        """Creates a contextmanager object for rendering an updatable table.

        Usage: invoke as a context manager, with all your update calls made in that context. Example:

            printer = NVPrettyPrint()
            with printer.create_live_table(titles=list_of_column_titles):
                printer.update_live_table(id_, value, column)
                ...
                printer.update_live_table(id_, new_value, column)
        """  # noqa: D401
        column_titles = column_titles or DEFAULT_LIVE_COLUMN_TITLES

        self.live_table_data = {}
        self.live_table = self.create_table(show_header=True, header_style="bold magenta")
        for title in column_titles:
            self.live_table.add_column(title)
        self.live_console = Console()
        return Live(self.live_table, console=self.live_console)

    def update_live_table(self, row_id, value, column=None, first_col_row_id=True):
        """Update the information in the row identified by `row_id`.

        If there is no row with that row_id in the table yet, the row is added.

        The default column is for a simple table that displays the row_id and a single associated value. By default the
        row_id is shown as the first column; if you do not wish to have the row_id displayed, pass `False` to the
        `first_col_row_id` parameter. If you have a more complex table with multiple columns, specify which column to
        update with the `column` parameter.
        """

        @contextmanager
        def _draw_loop():
            """This is necessary for the live_console to get updated."""  # noqa: D401, D404
            with self.live_console:
                yield
            time.sleep(0.01)

        column = -1 if column is None else column
        row_id = str_(row_id)
        if row_id not in self.live_table_data:
            # Need to add blank columns if this isn't a simple two-column table.
            blank_cols = ["" for _ in range(column - 1)] if column != -1 else []
            if first_col_row_id:
                self.live_table.add_row(row_id, *blank_cols, str_(value))
            else:
                self.live_table.add_row(*blank_cols, str_(value))
            self.live_table_data[row_id] = len(self.live_table_data)
        row_num = self.live_table_data[row_id]
        with _draw_loop():
            self.live_table.columns[column]._cells[row_num] = str_(value)  # pylint: disable=protected-access

    def update_live_table_row(self, row_id, *values, first_col_row_id=True):
        """Update a live table with a row of values.

        Each value corresponds to a column. If there is no value to update for that column, pass None for that position.
        For example, in a 5-column table, if you just want to update the third and fourth columns, you would call:

            update_live_table_row("my_id", None, "col3_new_val", "col4_new_val", None)
        """
        start_col = 1 if first_col_row_id else 0
        for col, val in enumerate(values, start_col):
            if val is not None:
                self.update_live_table(row_id, val, col, first_col_row_id=first_col_row_id)

    @staticmethod
    def create_progress_text_column(field, text_color=None):  # noqa: D102
        fmt = f"{{task.fields[{field}]}}"
        if text_color:
            fmt = f"[{text_color}]{fmt}"
        return TextColumn(text_format=fmt)

    @staticmethod
    def create_progress_bar_column(width=None, style=None):  # noqa: D102
        width = width or 30
        style = style or ""
        return BarColumn(bar_width=width, style=style)

    @staticmethod
    def create_progress_percent_column():  # noqa: D102
        return TextColumn("[progress.percentage]{task.percentage:>3.0f}%")

    def create_progress_table(self, columns):
        """Creates a contextmanager object for rendering an updatable table with progress bar."""  # noqa: D401
        console = Console(record=True, force_terminal=True)
        self.progress_table = Progress(console=console, *columns)
        return self.progress_table

    def create_transfer_progress_bar(
        self,
        bar_width=None,
        text=None,
        text_color=None,
        show_spinner=True,
        show_byte_progress=True,
        show_remaining=True,
        show_speed=True,
        show_elapsed=True,
        show_file_counts=True,
    ):
        """Creates a contextmanager object for rendering an updatable progress bar.

        By default all columns are included. You can suppress any column (except the bar itself) by setting the
        corresponding 'show_*' parameter to False.
        """  # noqa: D401
        columns = []
        file_column = None
        separator = "•" if NGC_CLI_PROGRESS_BAR_STYLE == "DEFAULT" else "-"
        if show_spinner:
            spinner = SPINNER_MAPPING.get(NGC_CLI_PROGRESS_BAR_STYLE, "dots")
            if spinner:
                columns.append(SpinnerColumn(spinner_name=spinner))
        if text:
            text_color = text_color or DEFAULT_PROGRESS_BAR_TEXT_COLOR
            text = f"[{text_color}]{text}"
            columns.append(TextColumn(text_format=text))
        bar_width = bar_width or DEFAULT_PROGRESS_BAR_WIDTH
        if NGC_CLI_PROGRESS_BAR_STYLE == "DEFAULT":
            columns.append(
                BarColumn(
                    bar_width=bar_width,
                    style="cyan3",
                    pulse_style="blue",
                    complete_style="yellow",
                )
            )
        if show_byte_progress:
            columns.append(separator)
            columns.append(DownloadColumn(binary_units=True))
        if show_remaining:
            columns.append(separator)
            columns.append("[cyan]Remaining:")
            columns.append(TimeRemainingColumn())
        if show_speed:
            columns.append(separator)
            columns.append(TransferSpeedColumn())
        if show_elapsed:
            columns.append(separator)
            columns.append("[yellow]Elapsed:")
            columns.append(TimeElapsedColumn())
        if show_file_counts:
            columns.append(separator)
            file_column = TextColumn(text_format="")
            columns.append(file_column)
        quiet = self.format_type == "json" or NGC_CLI_PROGRESS_BAR_STYLE == "NONE"
        console = Console(record=True, force_terminal=True, quiet=quiet)
        self.progress_table = Progress(console=console, *columns)
        self.progress_table.file_column = file_column
        return self.progress_table

    # pylint: disable=inconsistent-return-statements
    def add_task(self, description, start=True, total=100, completed=0, visible=True, **fields):  # noqa: D102
        return self.progress_table.add_task(
            description=description,
            start=start,
            total=total,
            completed=completed,
            visible=visible,
            **fields,
        )

    # pylint: disable=inconsistent-return-statements
    def update_task(self, task_id, **fields):  # noqa: D102
        return self.progress_table.update(task_id, **fields)

    # pylint: disable=inconsistent-return-statements
    def get_task_by_id(self, task_id):  # noqa: D102
        task_list = [task for task in self.progress_table.tasks if task.id == task_id]
        if not task_list:
            return None
        return task_list[0]

    def create_wrapper_table(  # noqa: D102
        self,
        header=None,
        outline=True,
        detail_style=True,
        is_table=False,
        append_to_output=True,
    ):
        cls = DetailsTable if detail_style else WrapperTable
        wrapper_table = cls(self, header=header, outline=outline, is_table=is_table)
        if append_to_output:
            # When creating an embedded wrapper table, we don't want it appended to the overall output.
            self.output.append(wrapper_table)
        return wrapper_table

    def create_output(self, header=False, outline=True, detail_style=True, is_table=False):
        """This is the outer container for all output. Sub-tables can be added for a nested effect."""  # noqa: D401, D404, E501
        self.outer_container = None
        self.inner_tables = None
        self.output = []
        table = self.main_table = self.create_wrapper_table(
            outline=outline,
            detail_style=detail_style,
            is_table=is_table,
        )
        if NGC_CLI_RICH_OUTPUT:
            self.outer_container = self.create_table(title=None, header_style=None)
            self.outer_container.box = None
            self.inner_tables = [table]
            header_method = table.show_header if header else table.hide_header
            header_method()
            table.set_header_style(DEFAULT_HEADER_STYLE)
            if outline:
                table.set_box(DEFAULT_BOX_STYLE)
        return table

    def add_table(self, header=False, box_style=None):  # noqa: D102
        table = self.create_wrapper_table()
        if NGC_CLI_RICH_OUTPUT:
            header_method = table.show_header if header else table.hide_header
            header_method()
            table.set_header_style(DEFAULT_HEADER_STYLE)
            table.set_box(box_style or DEFAULT_BOX_STYLE)
        return table

    def add_sub_table(  # noqa: D102
        self,
        parent_table=None,
        header=False,
        outline=False,
        detail_style=True,
        nested=False,
        level=0,
    ):
        if NGC_CLI_RICH_OUTPUT:
            table = self.create_wrapper_table(detail_style=detail_style)
            header_method = table.show_header if header else table.hide_header
            header_method()
            table.set_header_style(DEFAULT_HEADER_STYLE)
            box_style = DEFAULT_BOX_STYLE if outline else None
            table.set_box(box_style)
            outer = parent_table.table if isinstance(parent_table, WrapperTable) else parent_table
            to_add = table.table if isinstance(table, WrapperTable) else table
            to_add.level = level
            col_pad = [" " for _ in range(level)]
            if outer:
                if col_pad:
                    outer.add_row(*col_pad, to_add)
                else:
                    outer.add_row(to_add)
            else:
                if col_pad:
                    level_table = self.create_table()
                    # Make sure this intermediate table has the same style as the subtable.
                    level_table.box = box_style
                    level_table.add_row(*col_pad, to_add)
                    to_add = level_table
                if not nested:
                    self.inner_tables.append(to_add)
            return table
        return self.main_table

    def add_table_line(self, table, style=None):  # noqa: D102
        if table.level:
            # Need to add padding on the left
            spc = " " * table.level
            spacing_table = self.create_wrapper_table()
            spacing_table.add_line(spc, table, style=style)
            self.inner_tables.append(spacing_table)
        else:
            self.inner_tables.append(table)

    def print_resume_download_information(self, number_files, files_path):  # noqa: D102
        if self.format_type == "json":
            return
        if number_files and files_path:
            print(
                f"\nSaving '{number_files}' file(s) to download to '{files_path}'."
                " Please run the download command with resume argument `--resume"
                f" {files_path}`.\n"
            )

    def print_download_progress(self, download_size_bytes, time_started):  # noqa: D102
        if download_size_bytes:
            time_elapsed = round((datetime.datetime.now() - time_started).total_seconds(), 2)
            self.print_download_message(
                f"Downloaded {human_size(download_size_bytes)} in"
                f" {human_time(time_elapsed)}, Download speed:"
                f" {human_size(download_size_bytes/time_elapsed)}/s"
            )

    def print_download_message(self, message):  # noqa: D102
        if self.format_type == "json":
            return
        message = message or ""
        print(f"{CLEAR_LINE_CHAR}{message}", end="")


class WrapperTable:  # noqa: D101
    def __init__(self, printer, header=None, outline=True, is_table=False):
        self.table = []
        self.printer = printer
        self.is_table = is_table
        self.column_headers = []
        if NGC_CLI_RICH_OUTPUT:
            box_style = None if outline else ""
            self.table = printer.create_table(title=header, box_style=box_style)
            # This will be increased for sub-tables.
            self.table.level = 0
        else:
            if header:
                self.set_title(header)

    def set_box(self, box_val):  # noqa: D102
        if NGC_CLI_RICH_OUTPUT:
            self.table.box = box_val

    def set_nobox(self):  # noqa: D102
        if NGC_CLI_RICH_OUTPUT:
            self.table.box = box.SIMPLE

    def set_min_width(self, width):  # noqa: D102
        if NGC_CLI_RICH_OUTPUT:
            self.table.min_width = width

    def show_header(self):  # noqa: D102
        if NGC_CLI_RICH_OUTPUT:
            self.table.show_header = True

    def hide_header(self):  # noqa: D102
        if NGC_CLI_RICH_OUTPUT:
            self.table.show_header = False

    def set_header_style(self, style=None):  # noqa: D102
        self.table.header_style = style

    def add_column(self, txt=None, style=None, overflow="fold", justify=None):  # noqa: D102
        if NGC_CLI_RICH_OUTPUT:
            if txt:
                self.table.add_column(txt, style=style, overflow=overflow, justify=justify)
            else:
                self.table.add_column(style=style, overflow=overflow, justify=justify)
        else:
            self.column_headers.append(txt)

    def render(self):
        """Return the text output of the table."""
        if NGC_CLI_RICH_OUTPUT:
            console = Console(emoji=False)
            console.begin_capture()
            console.print(self.table, overflow="fold")
            return console.end_capture()
        return "\n".join(self.table)

    def set_title(self, header, style="bold green", level=0):  # noqa: D102
        if NGC_CLI_RICH_OUTPUT:
            self.table.title = header
            self.table.title_style = style
        else:
            self.add_line(f"{INDENT * level}{header}")

    def add_line(self, *vals, style=None, level=0, ignore_rich_indent=False):  # noqa: D102
        val0 = vals[0]
        level_pad = INDENT * level
        if NGC_CLI_RICH_OUTPUT:
            if isinstance(val0, WrapperTable):
                val0.table.level = level
                self.printer.add_table_line(val0.table, style=style)
            else:
                vals = vals if level == -1 or ignore_rich_indent else (level_pad, *vals)
                self.table.add_row(*vals, style=style)
        else:
            # We don't want to add sub-tables, which are just this table
            if val0 is not self:
                if isinstance(val0, WrapperTable):
                    val0.table.level = level
                    self.table.extend(val0.table)
                else:
                    if self.is_table:
                        self.table.append(vals)
                    else:
                        vals = (level_pad, *vals)
                        self.table.append(" ".join(vals))

    def add_label_line(self, label="", value="", level=0):  # noqa: D102
        if NGC_CLI_RICH_OUTPUT:
            label = label.table if isinstance(label, WrapperTable) else str_(label)
            value = value.table if isinstance(value, WrapperTable) else str_(value)
            self.table.add_row(label, value)
        else:
            label = "" if isinstance(label, WrapperTable) else str_(label)
            value = "" if isinstance(value, WrapperTable) else str_(value)
            if not label:
                level += 1
                sep = ""
            else:
                sep = ": " if value else ":"
            leading = INDENT * (1 + level)
            self.add_line(f"{leading}{label}{sep}{value}")

    def add_label_line_no_blanks(self, label="", value="", level=0):
        """Only add the line if the value is non-empty."""
        if value:
            self.add_label_line(label=label, value=value, level=level)

    def add_separator_line(self):  # noqa: D102
        if NGC_CLI_RICH_OUTPUT:
            rows = self.table.rows
            if rows:
                self.table.rows[-1].end_section = True
        else:
            if not self.is_table:
                self.table.append(SEPARATOR_PLACEHOLDER)

    def print(self, markup=False, is_table=False):  # noqa: D102
        if NGC_CLI_RICH_OUTPUT:
            self.printer.print_output(markup=markup)
        else:
            # First fill in any separator lines
            # Note: we're using the `rich.console` method of determining window width, as it already handles the
            # different platforms well.
            console = Console()
            row_width = max(len(row) for row in self.table) if self.table else 50
            width = min(console.width, row_width)
            for pos, line in enumerate(self.table):
                if line == SEPARATOR_PLACEHOLDER:
                    self.table[pos] = self.printer.make_dotted_line(width)
            # Now add any column headers
            if is_table and self.column_headers:
                self.table.insert(0, self.column_headers)
            self.printer.print_data(self.table, is_table=is_table)

    @property
    def columns(self):  # noqa: D102
        if NGC_CLI_RICH_OUTPUT:
            return self.table.columns
        return None


class DetailsTable(WrapperTable):
    """A subclass for creating a labeled value table, with the label right-aligned. Output looks like this:

    Label: some value
    Something: 99
    description: an example
    """  # noqa: D415

    def __init__(self, printer, header=None, outline=True, is_table=False):
        super().__init__(printer, header=header, outline=outline, is_table=is_table)
        if NGC_CLI_RICH_OUTPUT:
            self.add_column(justify="right", style="bold")
            self.add_column(justify="left")


def format_date(date):  # noqa: D103
    try:
        if date is not None:
            if not isinstance(date, (datetime.datetime, datetime.date)):
                date = date_parser.parse(date)
            utc = bool(isinstance(date, datetime.datetime) and date.tzinfo)
            return date.strftime("%Y-%m-%d %H:%M:%S UTC") if utc else date.strftime("%Y-%m-%d %H:%M:%S")
        return ""
    except ValueError:
        return date


def str_(target):
    """Custom string cast.

    just like normal str, but convert None to ""
    """  # noqa: D401
    return str(target) if target is not None else ""


def format_items(target):
    """Custom dict items format to ["key [value]",]."""  # noqa: D401
    return ["{} [{}]".format(k, v) for (k, v) in target]


def join_(target):
    """Custom join with newline, but return "" if not target."""  # noqa: D401
    return "\n".join(target) if target else ""


def generate_columns_list(gen, columns, **kwargs):  # noqa: D103
    cols, disp = zip(*columns)
    yield list(disp)

    for page in gen or []:
        for row in page or []:
            out = ColumnOutput(row, **kwargs)
            yield [getattr(out, col, None) for col in cols]


class ColumnOutput:  # noqa: D101
    def __init__(self, row, **kwargs):
        self.row = row
        self.kwargs = kwargs

    @property
    def auditLogsFrom(self):  # noqa: D102
        return self.row.auditLogsFrom or ""

    @property
    def auditLogsTo(self):  # noqa: D102
        return self.row.auditLogsTo or ""

    @property
    def auditRequesterEmail(self):  # noqa: D102
        return self.row.requsterEmail or ""

    @property
    def auditRequesterName(self):  # noqa: D102
        return self.row.requsterName or ""

    @property
    def auditLogsId(self):  # noqa: D102
        return self.row.auditLogsId or ""

    @property
    def requestedDate(self):  # noqa: D102
        return self.row.requestedDate or ""

    @property
    def auditLogsStatus(self):  # noqa: D102
        return self.row.auditLogsStatus or ""

    @property
    def id(self):  # noqa: D102
        return self.row.id if self.row.id is not None else ""

    @property
    def uid(self):  # noqa: D102
        return self.row.datasetUuid

    @property
    def name(self):  # noqa: D102
        return str_(self.row.name)

    @property
    def displayName(self):  # noqa: D102
        displayName = str_(self.row.displayName)
        if displayName and self.kwargs.get("org_display_name", False):
            # For the displayname of an organization.
            # If it doesn't exist, use `name`. If it exists, append `name` in parenthesis.
            return displayName + " (" + str_(self.row.name) + ")"
        if displayName:
            return displayName
        return str_(self.row.name)

    @property
    def org(self):  # noqa: D102
        return str_(self.row.orgName)

    @property
    def team(self):  # noqa: D102
        try:
            return str_(self.row.teamName)
        except AttributeError:
            try:
                return str_(self.row.team)
            except AttributeError:
                return ""

    @property
    def ace(self):  # noqa: D102
        return str_(self.row.aceName)

    @property
    def modified(self):  # noqa: D102
        return format_date(self.row.modifiedDate)

    @property
    def created(self):  # noqa: D102
        return format_date(self.row.createdDate)

    @property
    def updated(self):  # noqa: D102
        return format_date(self.row.updatedDate)

    @property
    def creator(self):  # noqa: D102
        return self.row.creatorUserName

    @property
    def description(self):  # noqa: D102
        return str_(self.row.description)

    @property
    def shared(self):  # noqa: D102
        return "Yes" if self.row.sharedWithOrgs or self.row.sharedWithTeams else "No"

    @property
    def owned(self):  # noqa: D102
        return "Yes" if self.row.createdBy == self.kwargs.get("user_client_id", "") else "No"

    @property
    def status(self):  # noqa: D102
        return self.row.status

    @property
    def size(self):  # noqa: D102
        return human_size(self.row.size) if hasattr(self.row, "size") else human_size(self.row.sizeInBytes) or "0 B"

    @property
    def prepop(self):  # noqa: D102
        return "Yes" if self.row.prepopulated else "No"

    @property
    def type_(self):  # noqa: D102
        return self.row.type

    @property
    def email(self):  # noqa: D102
        return self.row.email

    @property
    def instances(self):  # noqa: D102
        ace_instances = ""
        instances = self.row.instances
        if instances:
            if len(instances) % 2 != 0:
                instances += [None]
            # Slice instances into pairs starting at indices 0 and 1 with step of 2, unbounded end
            ace_instances = ",\n".join(
                "{}, {}".format(p[0].name, p[1].name) if p[1] else "{}".format(p[0].name)
                for p in zip(instances[0::2], instances[1::2])
            )
        return ace_instances

    @property
    def roles(self):  # noqa: D102
        roles = []
        try:
            for role in self.row.roles or []:
                if self.kwargs.get("include_org_roles", None) and role.orgRoles:
                    role.orgRoles = {*convert_EGX_roles(role.orgRoles)}
                    roles = ",".join(role.orgRoles)
                if self.kwargs.get("include_team_roles", None) and role.teamRoles:
                    role.teamRoles = {*convert_EGX_roles(role.teamRoles)}
                    roles = ",".join(role.teamRoles)
        except AttributeError:
            # UserInvitations does not have `orgRoles` or `teamRoles` attributes within `roles`.
            # Its `roles` attribute is a list, since each UserInvitation is for either an org or a team.
            invitation_roles = self.row.roles or []
            converted_roles = {*convert_EGX_roles(invitation_roles)}
            roles = ",".join(converted_roles)

        return roles

    @property
    def type(self):  # noqa: D102
        try:
            return self.row.type
        except AttributeError:
            return ""

    @property
    def subscriptionId(self):  # noqa: D102
        return str_(self.row.subscriptionId)

    @property
    def autoRenew(self):  # noqa: D102
        return str_(self.row.autoRenew)

    @property
    def expirationDate(self):  # noqa: D102
        return str_(self.row.expirationDate)

    @property
    def firstLoginDate(self):  # noqa: D102
        try:
            return str_(self.row.firstLoginDate)
        except AttributeError:
            return ""

    @property
    def lastLoginDate(self):  # noqa: D102
        try:
            return str_(self.row.lastLoginDate)
        except AttributeError:
            return ""

    @property
    def idpType(self):  # noqa: D102
        idp_to_signin_used = {
            "ENTERPRISE": "SSO",
            "NVIDIA": "Individual",
        }
        try:
            idptype = str(self.row.idpType)
        except AttributeError:
            return "-"
        return idp_to_signin_used.get(idptype, "-")


class TextOutput:  # noqa: D101
    class _TextValue:
        def __init__(self, name, value, required):
            self._name = name
            self._value = value
            self._required = required

        def __str__(self):
            if self._value is not None:
                return "{}: {}".format(self._name, str_(self._value))
            return self._name

        def can_print(self):
            return self._value not in [None, ""] or self._required

    def __init__(self, nv_print):
        self.text = []
        self._nv_print = nv_print

    def add_header(self, header):  # noqa: D102
        self.text.append(self._TextValue(self._nv_print.make_header_line(header), None, True))

    def add_attr(self, name, val, required=False):  # noqa: D102
        name = self._nv_print.ATTR_WITH_SPACE + (name or "")
        self.text.append(self._TextValue(name, val, required))

    def add_sub_attr(self, name, val, required=False):  # noqa: D102
        name = self._nv_print.SUB_ATTR_WITH_SPACE + (name or "")
        self.text.append(self._TextValue(name, val, required))

    def extend(self, text_output):  # noqa: D102
        self.text.extend(text_output.text)

    def render(self):  # noqa: D102
        text = [str(k) for k in self.text if k.can_print()]
        text.insert(0, self._nv_print.make_dotted_line())
        text.append(self._nv_print.make_dotted_line())
        self._nv_print.print_data(text)
