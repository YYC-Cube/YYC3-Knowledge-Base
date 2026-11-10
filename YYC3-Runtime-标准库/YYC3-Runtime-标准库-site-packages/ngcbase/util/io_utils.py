#
# Copyright (c) 2018-2019, NVIDIA CORPORATION.  All rights reserved.
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.
from builtins import input
import ctypes
import getpass
import platform
from subprocess import PIPE, Popen
import sys
import time

from ngcbase.errors import NgcException


def mask_string(value):  # noqa: D103
    if value is None:
        return None

    value = ("*" * (len(value) - 4)) + value[-4:]
    return value


def get_user_tty_input(prompt, secret=False):
    """Get user console input."""
    user_input = ""
    try:
        if secret is True:
            user_input = getpass.getpass(prompt)
        else:
            # Write the prompt to stderr, so it doesn't break machine-readable output like JSON.
            sys.stderr.write(prompt)
            sys.stderr.flush()
            user_input = input()
    except EOFError:
        if "windows" in platform.platform().lower():
            time.sleep(1)  # WAR for Windows8,10 race condition. Python <3.6 bug https://bugs.python.org/issue26531
    return user_input


def question_yes_no(printer, question, default=None, default_yes=False):  # noqa: D103
    if default_yes:
        return True
    valid_input = {"yes": True, "y": True, "ye": True, "no": False, "n": False}
    if default is None:
        prompt = " [y/n]"
    elif default == "yes":
        prompt = " [Y/n]"
    elif default == "no":
        prompt = " [y/N]"
    else:
        raise ValueError("Invalid default: '{0}' value".format(default))

    while True:
        user_input = get_user_tty_input(question + prompt).lower()
        if default and user_input == "":
            return valid_input[default]

        if user_input in valid_input:
            return valid_input[user_input]

        printer.print_error("Enter valid input choice of 'yes' or 'no' (or 'y' or 'n')\n")


def question_yes_no_cancel(printer, question, default_yes=False):  # noqa: D103
    if default_yes:
        return True

    valid_input = {
        "yes": True,
        "y": True,
        "ye": True,
        "no": False,
        "n": False,
        "cancel": None,
    }
    prompt = " [y/n/cancel] "

    while True:
        user_input = get_user_tty_input(question + prompt).lower()
        if user_input in valid_input:
            if valid_input[user_input] is None:
                raise NgcException("User cancelled operation.")
            return valid_input[user_input]

        printer.print_error("Enter valid input choice of 'yes' or 'no' (or 'y' or 'n') or 'cancel'\n")


def is_int(value):  # noqa: D103
    if isinstance(value, int):
        return True
    return False


def is_positive_int(value):  # noqa: D103
    if is_int(value) and value > 0:
        return True
    return False


def enable_control_chars_windows_shell():
    """Enables virtual terminal control characters for Windows shells."""  # noqa: D401
    if sys.platform == "win32":
        kernel32 = ctypes.windll.kernel32
        # The standard output device (the active console screen buffer)
        # see https://docs.microsoft.com/en-us/windows/console/getstdhandle for more information
        STD_INPUT_HANDLE = -11
        # parse characters for VT100 and similar control character sequences that control cursor movement, etc.
        # See https://docs.microsoft.com/en-us/windows/console/setconsolemode#ENABLE_VIRTUAL_TERMINAL_PROCESSING:
        # * ENABLE_PROCESSED_OUTPUT (0x0001)
        # * ENABLE_WRAP_AT_EOL_OUTPUT (0x0002)
        # * ENABLE_VIRTUAL_TERMINAL_PROCESSING (0x0004)
        ENABLE_VTERM = 7
        kernel32.SetConsoleMode(kernel32.GetStdHandle(STD_INPUT_HANDLE), ENABLE_VTERM)


def runproc(cmd, wait=True, decode=True, split_terms=False):
    """Runs the specified `cmd` in a separate process. By default it will wait until the command completes and return a
    2-tuple containing the (stdout, stderr) output of the called process. When `wait` is passed as True, this returns
    immediately and returns the Popen process object.

    By default, when returning the output content, the values are decoded to str. If you want the raw bytes, pass
    `decode=False`. Finally, some commands do not accept a full command string, but require each "word" to be a separate
    argument. If that is the case for your command, pass `split_terms=True`.
    """  # noqa: D205, D401
    split_cmd = cmd.split(" ") if split_terms else []
    kwargs = {"stdin": PIPE, "stdout": PIPE, "stderr": PIPE} if wait else {}
    proc = Popen(split_cmd or cmd, shell=True, close_fds=True, **kwargs)  # pylint: disable=consider-using-with
    if wait:
        stdout_bytes, stderr_bytes = proc.communicate()
        if decode:
            return stdout_bytes.decode("utf-8"), stderr_bytes.decode("utf-8")
        return stdout_bytes, stderr_bytes
    return proc
