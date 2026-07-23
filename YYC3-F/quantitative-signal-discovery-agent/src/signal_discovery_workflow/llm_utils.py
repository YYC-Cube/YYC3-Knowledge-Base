# SPDX-FileCopyrightText: Copyright (c) 2023-2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.  # noqa
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Shared helpers for working with LLM responses and LLM-emitted JSON / code.

These utilities are agent-agnostic: they handle quirks of LLM output such as
smart-quote Unicode characters, markdown fences, reasoning prose around JSON,
and operator-name paraphrasing.
"""

import json
import re
from typing import Iterable

NO_THINK_INSTRUCTION = "detailed thinking off"

# Map "smart" Unicode characters that LLMs sometimes emit to their ASCII
# equivalents so the resulting Python source / JSON is parseable.
_UNICODE_REPLACEMENTS = str.maketrans(
    {
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u2026": "...",
        "\u00a0": " ",
    }
)

# Common natural-language synonyms that LLMs sometimes substitute for the
# canonical operator names.
OPERATOR_SYNONYMS = {
    "divide": "Div", "div": "Div",
    "multiply": "Mul", "mul": "Mul", "times": "Mul",
    "add": "Add", "plus": "Add", "sum": "Add",
    "subtract": "Sub", "sub": "Sub", "minus": "Sub",
    "rank": "Rank", "ranking": "Rank",
    "abs": "Abs", "absolute": "Abs",
    "sign": "Sign",
    "log": "Log", "ln": "Log",
    "sqrt": "Sqrt",
    "power": "Power", "pow": "Power",
    "max": "Max", "maximum": "Max",
    "min": "Min", "minimum": "Min",
    "inv": "Inv", "inverse": "Inv",
}


def sanitize_unicode(text: str) -> str:
    """Normalize Unicode quotes/dashes that would break ``exec`` or ``json.loads``."""
    return text.translate(_UNICODE_REPLACEMENTS)


def extract_response_text(response) -> str:
    """
    Pull the *answer* text out of a LangChain LLM response.

    Strategy:
      1. Prefer ``response.content`` (string or content-block list). This is
         where the post-reasoning answer lives for most models.
      2. If ``.content`` is empty, fall back to
         ``additional_kwargs['reasoning_content']``. NVIDIA reasoning models
         sometimes route the entire output (including the final JSON answer)
         into the reasoning channel. The downstream JSON parser is robust to
         long prose surrounding the JSON, so this fallback is safe.
    """
    content = getattr(response, "content", None)
    if isinstance(content, str) and content.strip():
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict):
                text = block.get("text") or ""
                if text:
                    parts.append(text)
            elif isinstance(block, str):
                parts.append(block)
        joined = "".join(parts)
        if joined.strip():
            return joined

    extras = getattr(response, "additional_kwargs", {}) or {}
    reasoning = extras.get("reasoning_content")
    if isinstance(reasoning, str) and reasoning.strip():
        return reasoning

    return ""


def normalize_operator_names(code: str, valid_operators: Iterable[str]) -> str:
    """
    Replace common synonyms / case variants of operator names with the
    canonical form. E.g. ``divide(...)`` -> ``Div(...)``, ``ts_mean`` -> ``TS_Mean``.
    """
    valid_set = set(valid_operators)
    canonical_by_lower = {op.lower(): op for op in valid_set}

    def replace(match: re.Match) -> str:
        name = match.group(1)
        suffix = match.group(2)
        if name in valid_set:
            return name + suffix
        lower = name.lower()
        if lower in canonical_by_lower:
            return canonical_by_lower[lower] + suffix
        if lower in OPERATOR_SYNONYMS and OPERATOR_SYNONYMS[lower] in valid_set:
            return OPERATOR_SYNONYMS[lower] + suffix
        return name + suffix

    return re.sub(r"\b([A-Za-z_]\w*)(\s*\()", replace, code)


def extract_python_block(text: str) -> str:
    """Return the contents of the first ```python ... ``` block, or the text as-is."""
    blocks = re.findall(r"```python\n(.*?)```", text, re.DOTALL)
    return blocks[0] if blocks else text


def extract_json_array(text: str) -> list:
    """
    Pull a JSON array (or list of objects) out of an LLM response.

    Handles common output styles:
      - ```json ... ``` markdown fences
      - <think>...</think> reasoning prefixes
      - Plain prose surrounding (or before) the JSON
      - A single object instead of an array
      - Multiple standalone {...} signal objects without an outer array

    Returns the parsed list, or [] if nothing parseable was found.
    """
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)

    for fence in re.findall(r"```(?:json|JSON)?\s*([\[\{].*?[\]\}])\s*```", text, re.DOTALL):
        try:
            data = json.loads(fence)
            return data if isinstance(data, list) else [data]
        except json.JSONDecodeError:
            continue

    array_match = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)
    if array_match:
        try:
            return json.loads(array_match.group(0))
        except json.JSONDecodeError:
            pass

    objects: list[dict] = []
    for obj_text in _iter_balanced_braces(text):
        if '"formula"' not in obj_text:
            continue
        try:
            obj = json.loads(obj_text)
            if isinstance(obj, dict):
                objects.append(obj)
        except json.JSONDecodeError:
            continue
    return objects


def _iter_balanced_braces(text: str):
    """Yield substrings of `text` that look like balanced ``{...}`` JSON objects."""
    i = 0
    n = len(text)
    while i < n:
        if text[i] != "{":
            i += 1
            continue

        depth = 0
        in_string = False
        escape = False
        for j in range(i, n):
            ch = text[j]
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    yield text[i : j + 1]
                    i = j + 1
                    break
        else:
            return
