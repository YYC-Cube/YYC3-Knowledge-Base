# SPDX-FileCopyrightText: Copyright (c) 2023-2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for signal discovery workflow result formatting helpers."""

import json
from types import SimpleNamespace

from signal_discovery_workflow.signal_discovery_optimization_workflow import (
    _compose_feedback,
    _format_workflow_result,
)


def _fenced_signal_json() -> str:
    return """```json
[
  {
    "name": "Ten Day Rank Momentum",
    "formula": "Rank(TS_Return(Close, 10))",
    "meaning": "Ranks 10-day close-price momentum",
    "category": "momentum",
    "data_fields_used": ["Close"],
    "lookback_periods": [10]
  }
]
```"""


def test_format_workflow_result_summarizes_fenced_signal_json():
    result = _format_workflow_result(
        status="best_effort",
        request="momentum signals",
        iteration=1,
        total_iterations=3,
        signal_json=_fenced_signal_json(),
        ic_results={"selected_signal": "signal_ten_day_rank_momentum", "mean_ic": 0.0123},
        saved_path="/tmp/signal.json",
        config=SimpleNamespace(ic_threshold=0.02, p_value_threshold=0.05),
    )

    payload = json.loads(result)
    assert payload["signals"] == [
        {
            "name": "Ten Day Rank Momentum",
            "formula": "Rank(TS_Return(Close, 10))",
            "category": "momentum",
            "data_fields_used": ["Close"],
            "lookback_periods": [10],
        }
    ]


def test_compose_feedback_summarizes_fenced_best_signal_json():
    feedback = _compose_feedback(
        advice="- Try a shorter lookback",
        best_result={"signal_json": _fenced_signal_json(), "iteration": 1},
        best_ic=0.0123,
    )

    assert "Ten Day Rank Momentum: Rank(TS_Return(Close, 10))" in feedback
    assert "unable to summarize" not in feedback
