#
# Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
#
# NVIDIA CORPORATION and its licensors retain all intellectual property
# and proprietary rights in and to this software, related documentation
# and any modifications thereto.  Any use, reproduction, disclosure or
# distribution of this software and related documentation without an express
# license agreement from NVIDIA CORPORATION is strictly prohibited.

import functools
import json
import logging
import shlex
import sys
from typing import Union
import urllib.parse

from rich.console import Console
from rich.text import Text

from ngcbase import environ

logger = logging.getLogger(__name__)


ALWAYS_IGNORED_HEADERS = frozenset(
    {
        "User-Agent",  # Let `curl` set the appropriate user agent.
        "Accept-Encoding",  # Don't encode the response in a weird format (even if it is more efficient.)
        "Cookie",  # Typically just used by `requests` to track cookies within a single Session. Not important.
        "Content-Length",  # `requests` and `curl` will both calculate/set this.
        "traceparent",  # CLI-specific and not necessary
        "operation_name",  # CLI-specific and not necessary
    }
)

CONTENT_TYPE_JSON = "application/json"
CONTENT_TYPE_FORM_URLENCODED = "application/x-www-form-urlencoded"

_BEARER_TOKEN_VARIABLE_NAME = "BEARER"
_DEVICE_ID_VARIABLE_NAME = "DEVICE_ID"


_curl_console = None


def _get_curl_console():
    """Lazily init the rich console and return it.

    This helps ensure that all the appropriate environment variables have been set before initializing the console.
    """
    global _curl_console
    if _curl_console is None:
        _curl_console = Console(
            stderr=True,
            soft_wrap=True,
            highlight=False,
        )
    return _curl_console


class _NoShlexQuote(str):
    """Use this value "as is" (without using `shlex.quote` on it) when joining command arguments."""


def on_response_print_curl_request(response, *_args, **_kwargs):
    """Print each `TracedSession` request as a curl command.

    This is set as a `requests` "response" hook on each `TracedSession` object.
    """
    if not environ.NGC_CLI_CURL_DEBUG:
        return
    try:
        request = response.request
        curl_command = _format_request_as_curl_command(
            method=request.method,
            url=request.url,
            headers=request.headers,
            body=request.body,
        )
        _log_command(curl_command, response.status_code)
    except Exception:  # pylint: disable=broad-except
        # Hooks must handle their own errors. Consume all errors and log them as warnings.
        logger.warning("CURL_DEBUG: Failed to convert the request to a 'curl' command.", exc_info=True)


def _format_request_as_curl_command(*, method: str, url: str, headers: dict[str, str], body: Union[str, bytes]) -> str:
    """Format an HTTP request as a curl command."""
    headers = dict(headers)
    # Build up this command with `curl` args.
    command: list[str] = ["curl"]
    # If we can express a header more succinctly, we should do that.
    headers_to_ignore = set(ALWAYS_IGNORED_HEADERS)

    # Never print the 'Authorization' header, unless we're in 'unsafe' mode.
    if environ.NGC_CLI_CURL_DEBUG != "unsafe":
        headers_to_ignore.add("Authorization")

    # Replace `-H 'Authorization: Bearer <token>'` with the shorter `--oauth2-bearer <token>`
    # (We're adding the `--oauth2-bearer $BEARER` argument first, since it's always the same length and makes the curl
    # log easier to skim.)
    if headers.get("Authorization", "").startswith("Bearer "):
        headers_to_ignore.add("Authorization")
        command.extend(["--oauth2-bearer", _NoShlexQuote(f'"${_BEARER_TOKEN_VARIABLE_NAME}"')])
        # This will only print the first time or when the value changes.
        _show_unsafe_bearer_token(headers["Authorization"].removeprefix("Bearer "))

    # Omit explicit `-X GET` when we can.
    if body or method != "GET":
        command.extend(["-X", method])

    # URL can't be skipped/shortened, of course.
    command.append(url)

    # Ignore headers whose values match `curl`'s defaults.
    if headers.get("Accept") == "*/*":
        headers_to_ignore.add("Accept")
    if headers.get("Connection") == "keep-alive":
        headers_to_ignore.add("Connection")

    # We can drop 'Content-Type' if the request doesn't have any content.
    if not body:
        headers_to_ignore.add("Content-Type")

    # '--data' defaults to 'application/x-www-form-urlencoded'
    if headers.get("Content-Type") == CONTENT_TYPE_FORM_URLENCODED:
        headers_to_ignore.add("Content-Type")

    # Use '--json' instead of '--data' if we can. It's just like '--data', but it also sets 'Content-Type' and 'Accept'.
    is_json = body and headers.get("Content-Type") == CONTENT_TYPE_JSON
    if is_json:
        headers_to_ignore.add("Content-Type")
        # Only keep 'Accept' if it's different from what '--json' would set.
        if headers.get("Accept") == CONTENT_TYPE_JSON:
            headers_to_ignore.add("Accept")

    # The device id isn't a secret, per se. But it's best to hide it behind an environment variable.
    # Showing it as an environment variable will make commands easier to copy/paste between systems.
    if "X-Device-Id" in headers:
        # Don't show this with the rest of the headers. We need to use double quotes to use the env var.
        headers_to_ignore.add("X-Device-Id")
        command.extend(["-H", _NoShlexQuote(f'"X-Device-Id: ${_DEVICE_ID_VARIABLE_NAME}"')])
        # This will only print the first time or when the value changes.
        _show_unsafe_device_id(headers["X-Device-Id"])

    # We've trimmed all we can. Use '-H' to specify any remaining headers.
    for key, value in headers.items():
        if key in headers_to_ignore:
            continue
        command.extend(["-H", f"{key}: {value}"])

    # Try to decode the bytes to something printable.
    if isinstance(body, bytes):
        if headers.get("Content-Type", "").startswith(CONTENT_TYPE_JSON):
            # Assume JSON-based types are UTF-8.
            # (RFC 7159 technically allows for UTF-16 and UTF-32, but UTF-8 is the most common.)
            body = body.decode("utf-8")
        else:
            # If we don't have a reasonable guess, then show a placeholder.
            body = "<???>"

    url_path = urllib.parse.urlparse(url).path
    # Special case: This request includes the SAK key in its payload.
    if url_path == "/v3/keys/get-caller-info":
        # (Note that this is 'application/x-www-form-urlencoded')
        parsed_form = urllib.parse.parse_qs(body)
        # The credentials here will be used as the bearer token in later requests.
        credentials = parsed_form["credentials"][0]
        _show_unsafe_bearer_token(credentials)
        # Replace the credentials with the variable.
        parsed_form["credentials"][0] = "__REPLACE__"
        body = urllib.parse.urlencode(parsed_form, doseq=True).replace("__REPLACE__", f"${_BEARER_TOKEN_VARIABLE_NAME}")
        body = _NoShlexQuote(f'"{body}"')

    # Special case: This request includes a device id in the payload.
    if url_path == "/device/login":
        # Assume that content is JSON
        body_contents = json.loads(body)
        device_id = body_contents["deviceId"]
        _show_unsafe_device_id(device_id)
        body_contents["deviceId"] = f"${_DEVICE_ID_VARIABLE_NAME}"
        json_string = json.dumps(body_contents)
        # Use json.dumps to wrap the string in double quotes, while escaping the double quotes in the string.
        # (It needs double quotes, since there's an env var in it.)
        body = _NoShlexQuote(json.dumps(json_string))

    # '--data' and '--json' both specify a payload, but '--json' also sets 'Content-Type' and 'Accept'.
    if is_json:
        command.extend(["--json", body])
    elif body:
        command.extend(["--data", body])

    return " ".join(shlex.quote(arg) if not isinstance(arg, _NoShlexQuote) else arg for arg in command)


# (Ab)use the lru_cache to ensure these are only printed once (or when the value changes.)
@functools.lru_cache(maxsize=1)
def _show_unsafe_bearer_token(bearer_token: str):
    if environ.NGC_CLI_CURL_DEBUG != "unsafe":
        return
    _log_command(f"export {_BEARER_TOKEN_VARIABLE_NAME}={bearer_token!r}", "key")


@functools.lru_cache(maxsize=1)
def _show_unsafe_device_id(device_id: str):
    if environ.NGC_CLI_CURL_DEBUG != "unsafe":
        return
    _log_command(f"export {_DEVICE_ID_VARIABLE_NAME}={device_id!r}", "key")


def _log_command(command: str, hint: Union[int, str]) -> None:
    # EARLY RETURN
    if not environ.NGC_CLI_RICH_OUTPUT:
        print(f"CURL_DEBUG: [{hint}] {command}", file=sys.stderr)
        return
    if hint == "key":
        emoji = ":key:"
        style = "bright_blue"
    elif str(hint).startswith("2"):
        emoji = ":white_check_mark:"
        style = "cyan bold"
    else:
        emoji = ":poop:"
        style = "bright_red bold"
    hint = Text(f"[{hint}]")
    hint.stylize(style.replace("bold", ""))
    command = Text(command)
    command.stylize(style)
    _get_curl_console().print("[bold]CURL_DEBUG[/bold]:", emoji, hint, command)
