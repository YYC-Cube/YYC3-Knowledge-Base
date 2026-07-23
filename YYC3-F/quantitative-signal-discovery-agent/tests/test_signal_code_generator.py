# SPDX-FileCopyrightText: Copyright (c) 2023-2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for signal_code_generator pure utility functions."""

import json

import pytest

from signal_discovery_workflow.signal_code_generator import (
    _infer_fields_from_formula,
    _python_function_name,
    assemble_module,
    collect_operator_code,
    parse_signal_specs,
    parse_signal_specs_with_errors,
)
from signal_discovery_workflow.signal_generator import (
    get_operator_code_map,
    load_calculator_operators,
)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def operators():
    return load_calculator_operators()


@pytest.fixture(scope="module")
def code_map(operators):
    return get_operator_code_map(operators)


@pytest.fixture(scope="module")
def valid_op_names(code_map):
    return set(code_map.keys())


def _signal(name, formula, fields=None, operators_used=None, meaning="test"):
    return {
        "name": name,
        "formula": formula,
        "meaning": meaning,
        "category": "momentum",
        "data_fields_used": fields or ["Close"],
        "operators_used": operators_used or [],
        "lookback_periods": [20],
    }


# ---------------------------------------------------------------------------
# parse_signal_specs
# ---------------------------------------------------------------------------


class TestParseSignalSpecs:
    def test_parses_single_signal(self, valid_op_names):
        signal_json = json.dumps([_signal("Momentum 20", "TS_Return(Close, 20)")])
        specs = parse_signal_specs(signal_json, valid_op_names)
        assert len(specs) == 1
        assert specs[0]["name"].startswith("signal_")
        assert specs[0]["formula"] == "TS_Return(Close, 20)"
        assert specs[0]["fields"] == ["Close"]

    def test_parses_multiple_signals(self, valid_op_names):
        signal_json = json.dumps(
            [
                _signal("F1", "TS_Return(Close, 5)"),
                _signal("F2", "TS_Std(Close, 10)"),
            ]
        )
        specs = parse_signal_specs(signal_json, valid_op_names)
        assert len(specs) == 2

    def test_skips_signal_with_missing_required_field(self, valid_op_names):
        # 'meaning' is required by template's validation_rules.required_fields
        bad = {"name": "X", "formula": "TS_Return(Close, 5)"}
        good = _signal("Y", "TS_Return(Close, 10)")
        signal_json = json.dumps([bad, good])
        specs = parse_signal_specs(signal_json, valid_op_names)
        assert len(specs) == 1
        assert "y" in specs[0]["name"].lower()

    def test_handles_single_object_not_array(self, valid_op_names):
        signal_json = json.dumps(_signal("F1", "TS_Return(Close, 5)"))
        specs = parse_signal_specs(signal_json, valid_op_names)
        assert len(specs) == 1

    def test_recovers_from_prose_around_json(self, valid_op_names):
        signal_obj = _signal("F1", "TS_Return(Close, 5)")
        wrapped = f"Sure! Here are the signals:\n```json\n[{json.dumps(signal_obj)}]\n```\nDone."
        specs = parse_signal_specs(wrapped, valid_op_names)
        assert len(specs) == 1

    def test_returns_empty_for_unparseable(self, valid_op_names):
        specs = parse_signal_specs("totally not json", valid_op_names)
        assert specs == []

    def test_normalizes_operator_names_in_formula(self, valid_op_names):
        # 'divide' gets normalized to canonical 'Div'
        signal_json = json.dumps(_signal("F1", "divide(Close, Volume)"))
        specs = parse_signal_specs(signal_json, valid_op_names)
        assert len(specs) == 1
        assert "Div(" in specs[0]["formula"]
        assert "divide(" not in specs[0]["formula"]

    def test_falls_back_to_close_when_no_fields(self, valid_op_names):
        signal = _signal("F1", "TS_Return(Close, 5)", fields=[])
        specs = parse_signal_specs(json.dumps([signal]), valid_op_names)
        assert specs[0]["fields"] == ["Close"]

    def test_filters_invalid_field_names(self, valid_op_names):
        signal = _signal("F1", "TS_Return(Close, 5)", fields=["Close", "Bogus"])
        specs = parse_signal_specs(json.dumps([signal]), valid_op_names)
        assert specs[0]["fields"] == ["Close"]

    def test_normalizes_common_close_aliases(self, valid_op_names):
        signal = _signal("F1", "TS_Return(Adj_Close, 20)", fields=["Adj_Close"])
        specs = parse_signal_specs(json.dumps([signal]), valid_op_names)
        assert specs[0]["formula"] == "TS_Return(Close, 20)"
        assert specs[0]["fields"] == ["Close"]

    def test_formula_fields_are_kept_when_declared_fields_are_wrong(self, valid_op_names):
        signal = _signal(
            "F1",
            "Mul(TS_Return(Close, 20), Rank(Decay_Linear(Volume, 20)))",
            fields=["Volume"],
        )
        specs = parse_signal_specs(json.dumps([signal]), valid_op_names)
        assert specs[0]["fields"] == ["Close", "Volume"]


# ---------------------------------------------------------------------------
# parse_signal_specs_with_errors — error surfacing for the orchestrator
# ---------------------------------------------------------------------------


class TestParseSignalSpecsWithErrors:
    def test_returns_arity_violations(self, valid_op_names):
        # Rank takes 1 arg; calling it with 2 should be skipped AND reported.
        bad = _signal("RankBad", "Rank(Close, Volume)")
        good = _signal("Mom", "TS_Return(Close, 20)")
        specs, errors = parse_signal_specs_with_errors(
            json.dumps([bad, good]), valid_op_names
        )
        assert len(specs) == 1
        assert any("Rank expects 1" in e for e in errors)

    def test_empty_errors_when_all_valid(self, valid_op_names):
        good = _signal("Mom", "TS_Return(Close, 20)")
        specs, errors = parse_signal_specs_with_errors(json.dumps([good]), valid_op_names)
        assert len(specs) == 1
        assert errors == []

    def test_reports_unparseable_json(self, valid_op_names):
        specs, errors = parse_signal_specs_with_errors("not json at all", valid_op_names)
        assert specs == []
        assert errors and "JSON" in errors[0]


# ---------------------------------------------------------------------------
# collect_operator_code
# ---------------------------------------------------------------------------


class TestCollectOperatorCode:
    def test_includes_referenced_operators(self, code_map):
        specs = [
            {"name": "f", "formula": "Div(TS_Return(Close, 20), TS_Std(Close, 20))",
             "fields": ["Close"], "doc": ""},
        ]
        op_code = collect_operator_code(specs, code_map)
        for op in ("Div", "TS_Return", "TS_Std"):
            assert f"def {op}(" in op_code

    def test_no_operators_when_formula_empty(self, code_map):
        specs = [{"name": "f", "formula": "", "fields": ["Close"], "doc": ""}]
        assert collect_operator_code(specs, code_map) == ""

    def test_unknown_operators_skipped(self, code_map):
        specs = [{"name": "f", "formula": "Bogus(Close, 5)", "fields": ["Close"], "doc": ""}]
        assert collect_operator_code(specs, code_map) == ""

    def test_dedupes_across_multiple_signals(self, code_map):
        specs = [
            {"name": "f1", "formula": "TS_Return(Close, 5)", "fields": ["Close"], "doc": ""},
            {"name": "f2", "formula": "TS_Return(Close, 10)", "fields": ["Close"], "doc": ""},
        ]
        op_code = collect_operator_code(specs, code_map)
        # TS_Return appears in the operator code only once (deduplicated by sorted set).
        assert op_code.count("def TS_Return(") == 1


# ---------------------------------------------------------------------------
# assemble_module
# ---------------------------------------------------------------------------


class TestAssembleModule:
    def test_includes_imports(self):
        module = assemble_module("", "")
        assert "import pandas as pd" in module
        assert "import numpy as np" in module

    def test_includes_operator_and_function_blocks(self):
        module = assemble_module("def Div(x, y): return x / y\n", "def signal_x(Close): return Close\n")
        assert "def Div" in module
        assert "def signal_x" in module

    def test_module_is_valid_python(self):
        module = assemble_module(
            "def TS_Return(x, d): return x.pct_change(d)\n",
            "def signal_x(Close): return TS_Return(Close, 5)\n",
        )
        # If this doesn't raise, the module is syntactically valid.
        compile(module, "<test>", "exec")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


class TestPythonFunctionName:
    def test_already_valid_identifier(self):
        assert _python_function_name("signal_momentum", 0) == "signal_momentum"

    def test_strips_special_characters(self):
        assert _python_function_name("Volume-Decayed Momentum!", 0) == "signal_volume_decayed_momentum"

    def test_prepends_signal_prefix(self):
        assert _python_function_name("Momentum", 0).startswith("signal_")

    def test_handles_empty_name(self):
        # Falls back to signal_<index+1>.
        assert _python_function_name("", 0) == "signal_1"
        assert _python_function_name(None, 4) == "signal_5"

    def test_avoids_leading_digit(self):
        result = _python_function_name("20-Day Momentum", 0)
        assert not result[0].isdigit()


class TestInferFieldsFromFormula:
    def test_detects_close(self):
        assert _infer_fields_from_formula("TS_Return(Close, 20)") == ["Close"]

    def test_detects_multiple(self):
        fields = _infer_fields_from_formula("Div(High, Volume)")
        assert "High" in fields
        assert "Volume" in fields

    def test_returns_empty_when_no_field_referenced(self):
        assert _infer_fields_from_formula("Some_Func(123, 456)") == []
