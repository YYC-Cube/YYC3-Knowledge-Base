# SPDX-FileCopyrightText: Copyright (c) 2023-2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for signal_generator pure utility functions."""

import pytest

from signal_discovery_workflow.signal_generator import (
    build_signal_example,
    build_signal_prompt,
    build_signal_template,
    format_operators_for_prompt,
    get_operator_code_map,
    load_calculator_operators,
    load_output_template,
)

# ---------------------------------------------------------------------------
# load_calculator_operators
# ---------------------------------------------------------------------------


class TestLoadCalculatorOperators:
    def test_returns_non_empty_list(self):
        ops = load_calculator_operators()
        assert isinstance(ops, list)
        assert len(ops) > 0

    def test_each_entry_has_required_fields(self):
        for op in load_calculator_operators():
            assert "name" in op, f"Missing 'name' in {op}"
            assert "meanings" in op, f"Missing 'meanings' in {op}"
            assert "code" in op, f"Missing 'code' in {op}"

    def test_known_operators_present(self):
        names = {op["name"] for op in load_calculator_operators()}
        for expected in ("TS_Return", "TS_Std", "Rank", "Div", "CS_Rank", "Decay_Linear"):
            assert expected in names, f"Expected operator '{expected}' not found"

    def test_operator_codes_are_non_empty_strings(self):
        for op in load_calculator_operators():
            assert isinstance(op["code"], str)
            assert len(op["code"].strip()) > 0, f"Empty code for operator {op['name']}"


# ---------------------------------------------------------------------------
# load_output_template
# ---------------------------------------------------------------------------


class TestLoadOutputTemplate:
    def test_returns_dict(self):
        assert isinstance(load_output_template(), dict)

    def test_has_signal_template(self):
        assert "signal_template" in load_output_template()

    def test_signal_template_required_fields(self):
        ft = load_output_template()["signal_template"]
        for field in ("name", "formula", "meaning", "category"):
            assert field in ft

    def test_has_output_format_example(self):
        examples = load_output_template().get("output_format", {}).get("example", [])
        assert isinstance(examples, list)
        assert len(examples) >= 1


# ---------------------------------------------------------------------------
# format_operators_for_prompt
# ---------------------------------------------------------------------------


class TestFormatOperatorsForPrompt:
    @pytest.fixture
    def operators(self):
        return load_calculator_operators()

    def test_returns_string(self, operators):
        assert isinstance(format_operators_for_prompt(operators), str)

    def test_respects_max_operators(self, operators):
        result = format_operators_for_prompt(operators, max_operators=5)
        signature_lines = [line for line in result.splitlines() if line.startswith("- ")]
        assert len(signature_lines) <= 5

    def test_priority_operators_included(self, operators):
        result = format_operators_for_prompt(operators, max_operators=10)
        assert "TS_" in result

    def test_includes_description(self, operators):
        assert "Description:" in format_operators_for_prompt(operators)

    def test_empty_operators_list(self):
        assert format_operators_for_prompt([]) == ""

    def test_signature_cleaned_of_def_prefix(self):
        ops = [
            {
                "name": "MyOp",
                "signature": "def MyOp(x, d) -> pd.DataFrame",
                "meanings": "does stuff",
                "code": "pass",
            }
        ]
        result = format_operators_for_prompt(ops)
        assert "def MyOp" not in result
        assert "MyOp(x, d)" in result

    def test_uses_name_when_no_signature(self):
        ops = [{"name": "SimpleOp", "meanings": "simple", "code": "pass"}]
        assert "SimpleOp" in format_operators_for_prompt(ops)


# ---------------------------------------------------------------------------
# build_signal_template
# ---------------------------------------------------------------------------


class TestBuildSignalTemplate:
    def test_returns_string(self):
        assert isinstance(build_signal_template(2), str)

    def test_wrapped_in_json_fence(self):
        result = build_signal_template(2)
        assert result.startswith("```json")
        assert result.rstrip().endswith("```")

    def test_contains_required_fields(self):
        result = build_signal_template(1)
        for field in ("name", "formula", "meaning", "category"):
            assert f'"{field}"' in result

    def test_repeats_for_num_signals(self):
        # Each signal block should appear num_signals times.
        n = 3
        result = build_signal_template(n)
        assert result.count('"name"') == n


# ---------------------------------------------------------------------------
# build_signal_example
# ---------------------------------------------------------------------------


class TestBuildSignalExample:
    def test_returns_string(self):
        assert isinstance(build_signal_example(), str)

    def test_wrapped_in_json_fence(self):
        result = build_signal_example()
        assert result.startswith("```json") and result.rstrip().endswith("```")

    def test_contains_concrete_formula(self):
        # The example should reference at least one real operator.
        assert "TS_" in build_signal_example()

    def test_empty_when_no_examples(self):
        # Pass a synthetic template lacking examples; should return "".
        assert build_signal_example({"output_format": {"example": []}}) == ""


# ---------------------------------------------------------------------------
# build_signal_prompt
# ---------------------------------------------------------------------------


class TestBuildSignalPrompt:
    @pytest.fixture
    def operators(self):
        return load_calculator_operators()

    def test_includes_request(self, operators):
        prompt = build_signal_prompt(
            request="momentum signals",
            num_signals=2,
            operators_list=format_operators_for_prompt(operators),
            template_block=build_signal_template(2),
        )
        assert "momentum signals" in prompt

    def test_includes_num_signals(self, operators):
        prompt = build_signal_prompt(
            request="x",
            num_signals=7,
            operators_list="",
            template_block=build_signal_template(7),
        )
        assert "Generate 7 signals" in prompt

    def test_includes_feedback_section_when_provided(self, operators):
        prompt = build_signal_prompt(
            request="x",
            num_signals=1,
            operators_list="",
            template_block=build_signal_template(1),
            feedback="- try a longer lookback",
        )
        assert "PREVIOUS FEEDBACK" in prompt
        assert "longer lookback" in prompt

    def test_no_feedback_section_when_absent(self, operators):
        prompt = build_signal_prompt(
            request="x",
            num_signals=1,
            operators_list="",
            template_block=build_signal_template(1),
        )
        assert "PREVIOUS FEEDBACK" not in prompt

    def test_includes_example_when_provided(self, operators):
        prompt = build_signal_prompt(
            request="x",
            num_signals=1,
            operators_list="",
            template_block=build_signal_template(1),
            example_block=build_signal_example(),
        )
        assert "example of one valid signal" in prompt


# ---------------------------------------------------------------------------
# get_operator_code_map
# ---------------------------------------------------------------------------


class TestGetOperatorCodeMap:
    @pytest.fixture
    def operators(self):
        return load_calculator_operators()

    def test_returns_dict(self, operators):
        assert isinstance(get_operator_code_map(operators), dict)

    def test_keys_match_operator_names(self, operators):
        code_map = get_operator_code_map(operators)
        for op in operators:
            assert op["name"] in code_map

    def test_values_are_code_strings(self, operators):
        for name, code in get_operator_code_map(operators).items():
            assert isinstance(code, str), f"Code for '{name}' is not a string"

    def test_length_matches_operator_count(self, operators):
        assert len(get_operator_code_map(operators)) == len(operators)

    def test_empty_input(self):
        assert get_operator_code_map([]) == {}
