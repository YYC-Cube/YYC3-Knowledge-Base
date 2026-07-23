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
Signal Code Generator Agent.

Takes the JSON output from ``signal_generator`` and an LLM, and produces a
self-contained, executable Python module:

    import pandas as pd
    import numpy as np

    # operator definitions inlined from calculator.json
    def Div(...): ...
    def TS_Return(...): ...
    ...

    # signal functions written by the LLM, one per JSON entry
    def signal_xxx(Close, Volume, ...) -> pd.DataFrame:
        \"\"\"<meaning>\"\"\"
        return <formula>

The LLM only writes the signal function bodies. Operator code and imports
are added deterministically so the output is self-contained and portable.
"""

import ast
import json
import logging
import re
from typing import Iterable

from langchain_core.messages import HumanMessage, SystemMessage
from nat.builder.builder import Builder
from nat.builder.framework_enum import LLMFrameworkEnum
from nat.builder.function_info import FunctionInfo
from nat.cli.register_workflow import register_function
from nat.data_models.function import FunctionBaseConfig
from pydantic import Field

from .llm_utils import (
    NO_THINK_INSTRUCTION,
    extract_json_array,
    extract_python_block,
    extract_response_text,
    normalize_operator_names,
    sanitize_unicode,
)
from .signal_evaluator import get_operator_arities
from .signal_generator import (
    VALID_DATA_FIELDS,
    get_operator_code_map,
    load_calculator_operators,
    load_output_template,
)

logger = logging.getLogger(__name__)

DATA_FIELD_ALIASES = {
    "adj_close": "Close",
    "adjclose": "Close",
    "adjusted_close": "Close",
    "adjustedclose": "Close",
    "close_price": "Close",
    "closing_price": "Close",
    "price": "Close",
    "open_price": "Open",
    "opening_price": "Open",
    "high_price": "High",
    "low_price": "Low",
    "trading_volume": "Volume",
    "volume_traded": "Volume",
}


def _python_function_name(name: str | None, index: int) -> str:
    """Convert a signal's display name into a valid ``signal_*`` Python identifier."""
    base = re.sub(r"[^A-Za-z0-9_]+", "_", (name or f"signal_{index + 1}").lower()).strip("_")
    if not base:
        base = f"signal_{index + 1}"
    if not base.startswith("signal"):
        base = f"signal_{base}"
    if base[0].isdigit():
        base = f"signal_{base}"
    return base


def _infer_fields_from_formula(formula: str) -> list[str]:
    """Detect which OHLCV fields the formula references."""
    return [f for f in ("Open", "Close", "High", "Low", "Volume") if re.search(rf"\b{f}\b", formula)]


def _normalize_data_field_names(text: str) -> str:
    """Replace common LLM-emitted data-field aliases with canonical OHLCV names."""
    canonical_by_lower = {f.lower(): f for f in VALID_DATA_FIELDS}

    def replace(match: re.Match) -> str:
        name = match.group(0)
        lower = name.lower()
        return canonical_by_lower.get(lower) or DATA_FIELD_ALIASES.get(lower) or name

    return re.sub(r"\b[A-Za-z_][A-Za-z0-9_]*\b", replace, text)


def _normalize_declared_fields(fields: Iterable) -> list[str]:
    """Normalize the JSON ``data_fields_used`` list and discard unknown fields."""
    normalized: list[str] = []
    for field in fields:
        if not isinstance(field, str):
            continue
        canonical = _normalize_data_field_names(field).strip()
        if canonical in VALID_DATA_FIELDS and canonical not in normalized:
            normalized.append(canonical)
    return normalized


def _check_formula_arity(formula: str, arities: dict[str, tuple[int, int]]) -> str | None:
    """
    Statically verify each operator call in a formula uses the right arg count.

    Returns ``None`` if the formula is well-formed (or unparseable, in which case
    we let runtime catch it). Returns a human-readable error string otherwise so
    the caller can skip the spec and surface useful feedback.
    """
    try:
        tree = ast.parse(formula, mode="eval")
    except SyntaxError:
        return None  # not Python — let downstream parser deal with it

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Name):
            continue
        name = node.func.id
        if name not in arities:
            continue
        min_args, max_args = arities[name]
        n_args = len(node.args)
        if n_args < min_args or (max_args >= 0 and n_args > max_args):
            expected = (
                f"{min_args}" if min_args == max_args
                else f"{min_args}-{max_args}" if max_args >= 0
                else f"at least {min_args}"
            )
            return f"{name} expects {expected} arg(s), got {n_args}"
    return None


def parse_signal_specs_with_errors(
    signal_json: str, valid_operators: Iterable[str]
) -> tuple[list[dict], list[str]]:
    """
    Parse the signal generator's JSON into normalized specs and a list of
    skip messages explaining why any signals were rejected.

    Each spec contains ``name``, ``formula``, ``fields``, ``doc``. Skip messages
    are short strings like ``"#0 (Momentum: Rank expects 1 arg(s), got 2)"``
    suitable for embedding directly into the next iteration's feedback prompt.
    """
    sanitized = sanitize_unicode(signal_json)
    try:
        data = json.loads(sanitized)
    except json.JSONDecodeError:
        data = extract_json_array(sanitized)
    if not isinstance(data, list):
        data = [data] if isinstance(data, dict) else []

    if not data:
        cleaned = signal_json.strip().replace("\n", " ")
        head = cleaned[:300]
        tail = cleaned[-300:] if len(cleaned) > 600 else ""
        logger.warning(
            f"Could not parse signal generator output as JSON ({len(signal_json)} chars). "
            f"Head: {head!r}" + (f" ... Tail: {tail!r}" if tail else "")
        )
        return [], ["generator output was not valid JSON"]

    template = load_output_template()
    required_fields = template.get("validation_rules", {}).get(
        "required_fields", ["name", "formula", "meaning"]
    )
    arities = get_operator_arities()

    specs: list[dict] = []
    skipped: list[str] = []
    for idx, signal in enumerate(data):
        if not isinstance(signal, dict):
            skipped.append(f"#{idx} (not a dict)")
            continue

        missing = [f for f in required_fields if not signal.get(f)]
        if missing:
            skipped.append(f"#{idx} ({signal.get('name', '?')}: missing {missing})")
            continue

        formula = normalize_operator_names(
            sanitize_unicode(signal["formula"]).strip(), valid_operators
        )
        formula = _normalize_data_field_names(formula)

        arity_error = _check_formula_arity(formula, arities)
        if arity_error:
            skipped.append(f"#{idx} ({signal.get('name', '?')}: {arity_error})")
            continue

        formula_fields = _infer_fields_from_formula(formula)
        declared_fields = _normalize_declared_fields(signal.get("data_fields_used") or [])
        fields = []
        for field in [*formula_fields, *declared_fields]:
            if field not in fields:
                fields.append(field)
        if not fields:
            fields = ["Close"]

        specs.append(
            {
                "name": _python_function_name(signal.get("name"), idx),
                "formula": formula,
                "fields": fields,
                "doc": signal.get("meaning") or signal.get("name", "Signal calculation"),
            }
        )

    if skipped:
        logger.warning(f"Skipped {len(skipped)} malformed signal(s): {skipped}")
    return specs, skipped


def parse_signal_specs(signal_json: str, valid_operators: Iterable[str]) -> list[dict]:
    """
    Parse the signal generator's JSON into a list of normalized specs.

    Backwards-compatible wrapper around :func:`parse_signal_specs_with_errors`
    for callers that only care about the specs.
    """
    specs, _ = parse_signal_specs_with_errors(signal_json, valid_operators)
    return specs


def collect_operator_code(specs: list[dict], code_map: dict[str, str]) -> str:
    """
    Concatenate the Python source for every operator referenced by ``specs``.

    The returned string is meant to be inlined into the generated module so
    that the signal functions can call ``Div(...)``, ``TS_Mean(...)``, etc.
    """
    used: set[str] = set()
    for spec in specs:
        used.update(re.findall(r"\b([A-Za-z_]\w*)\s*\(", spec["formula"]))
    valid = sorted(op for op in used if op in code_map)
    return "\n".join(code_map[op] for op in valid)


def _build_code_prompt(specs: list[dict], operator_signatures: str) -> tuple[str, str]:
    """Return (system, user) prompt strings for the code generator LLM."""
    system = (
        "You translate signal specifications into Python functions. "
        "Output ONLY the function definitions in a single ```python block. "
        "Use the exact operator names from the formula verbatim (case-sensitive). "
        "Do NOT redefine operators. Do NOT add helper functions. Do NOT add imports."
    )
    spec_block = "\n".join(
        f"{i + 1}. name={s['name']}, fields={s['fields']}, formula={s['formula']}"
        for i, s in enumerate(specs)
    )
    user = f"""Operator signatures (already defined, just call):
{operator_signatures}

Generate one function per spec below. The function body must be `return <formula>`.

EXAMPLE INPUT:
1. name=signal_momentum, fields=['Close'], formula=TS_Return(Close, 20)

EXAMPLE OUTPUT:
```python
def signal_momentum(Close: pd.DataFrame) -> pd.DataFrame:
    \"\"\"20-day momentum\"\"\"
    return TS_Return(Close, 20)
```

SPECS:
{spec_block}"""
    return system, user


async def generate_signal_function_code(
    llm,
    specs: list[dict],
    operators: list[dict],
) -> str:
    """
    Use the LLM to write signal function bodies for the given specs.

    The LLM only emits ``def signal_xxx(...): return ...`` blocks; the caller
    is responsible for prepending imports and operator definitions.
    """
    sig_map = {op["name"]: op.get("signature", op["name"]) for op in operators}
    used_op_names = sorted({
        op for spec in specs for op in re.findall(r"\b([A-Za-z_]\w*)\s*\(", spec["formula"])
        if op in sig_map
    })
    operator_signatures = "\n".join(f"- {sig_map[op]}" for op in used_op_names)

    system, user = _build_code_prompt(specs, operator_signatures)

    response = await llm.ainvoke(
        [
            SystemMessage(content=NO_THINK_INSTRUCTION),
            SystemMessage(content=system),
            HumanMessage(content=user),
        ]
    )

    raw = extract_response_text(response)
    code = extract_python_block(raw)
    valid_operator_names = {op["name"] for op in operators}
    return normalize_operator_names(sanitize_unicode(code), valid_operator_names)


def assemble_module(operator_code: str, signal_function_code: str) -> str:
    """Wrap operator + signal function code into a self-contained Python module."""
    return f"import pandas as pd\nimport numpy as np\n\n{operator_code}\n\n{signal_function_code}\n"


async def generate_signal_code(
    llm,
    signal_json: str,
    operators: list[dict],
    errors_out: list[str] | None = None,
) -> str:
    """
    End-to-end: signal JSON -> self-contained executable Python module.

    1. Parse the signal JSON into normalized specs.
    2. Ask the LLM to write a function body for each spec.
    3. Inline the operator definitions and imports.

    If ``errors_out`` is supplied, the parser's skip messages (e.g. arity
    violations) are appended to it so the caller can route them back into the
    next iteration's feedback prompt.
    """
    code_map = get_operator_code_map(operators)
    specs, parse_errors = parse_signal_specs_with_errors(signal_json, code_map.keys())
    if errors_out is not None:
        errors_out.extend(parse_errors)

    if not specs:
        logger.warning("No usable signals found in generator output")
        return assemble_module("", "# No valid signals generated\n")

    function_code = await generate_signal_function_code(llm, specs, operators)
    operator_code = collect_operator_code(specs, code_map)
    return assemble_module(operator_code, function_code)


class SignalCodeGeneratorConfig(FunctionBaseConfig, name="signal_code_generator"):
    """Generate executable Python code from signal JSON descriptions."""

    llm_name: str | None = Field(default=None, description="LLM to use for code generation.")


@register_function(config_type=SignalCodeGeneratorConfig, framework_wrappers=[LLMFrameworkEnum.LANGCHAIN])
async def signal_code_generator_function(config: SignalCodeGeneratorConfig, builder: Builder):
    """NAT function wrapper around ``generate_signal_code``."""
    operators = load_calculator_operators()

    if not config.llm_name:
        raise ValueError("signal_code_generator requires an llm_name to be configured.")
    llm = await builder.get_llm(llm_name=config.llm_name, wrapper_type=LLMFrameworkEnum.LANGCHAIN)

    async def generate(signal_json: str) -> str:
        """Generate executable Python code from signal JSON.

        Args:
            signal_json: The JSON array produced by ``signal_generator``.

        Returns:
            A self-contained Python module (imports + operator defs + signal
            function defs) ready to be ``exec``'d.
        """
        return await generate_signal_code(llm, signal_json, operators)

    yield FunctionInfo.from_fn(
        generate,
        description=(
            "Generate executable Python code from signal_generator JSON output. "
            "Returns a self-contained module with imports, operator defs, and signal functions."
        ),
    )
