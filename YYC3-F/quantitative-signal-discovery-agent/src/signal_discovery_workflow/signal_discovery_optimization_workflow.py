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
Signal Discovery Optimization Workflow.

Orchestrates the loop:
    signal_generator -> signal_code_generator -> signal_evaluator
                ^                                           |
                |__________ optimization advisor ___________|

The agents themselves live in their own modules; this file only handles
iteration, scoring, feedback, and persisting accepted/best results.
"""

import json
import logging
import warnings
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
from langchain_core.messages import HumanMessage, SystemMessage
from nat.builder.builder import Builder
from nat.builder.framework_enum import LLMFrameworkEnum
from nat.builder.function_info import FunctionInfo
from nat.cli.register_workflow import register_function
from nat.data_models.function import FunctionBaseConfig
from pydantic import Field

from .llm_utils import NO_THINK_INSTRUCTION, extract_json_array, extract_response_text
from .signal_code_generator import generate_signal_code
from .signal_evaluator import (
    compute_forward_returns,
    compute_rank_ic,
    execute_signal_code,
    extract_code_from_response,
    load_stock_data,
)
from .signal_generator import generate_signal_json, load_calculator_operators

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).parent / "output"


_STATUS_HEADLINE = {
    "accepted": "Signal accepted",
    "best_effort": "Best-effort result (IC threshold not met)",
    "failed": "No valid signals generated",
}


def _compose_feedback(
    advice: str,
    best_result: dict | None,
    best_ic: float | None,
) -> str:
    """
    Bundle the advisor's advice with the best-known result so the next
    iteration anchors on what already worked instead of wandering.

    Without this, every iteration only sees the *latest* advice and tends to
    drift — sometimes regressing past a good signal it found earlier.
    """
    if not best_result or best_ic is None:
        return advice

    try:
        best_signals = extract_json_array(best_result["signal_json"])
        items = best_signals if best_signals else [json.loads(best_result["signal_json"])]
        best_summary = "\n".join(
            f"- {f.get('name', '?')}: {f.get('formula', '?')}"
            for f in items if isinstance(f, dict)
        )
    except (json.JSONDecodeError, KeyError, TypeError):
        best_summary = "(unable to summarize)"

    return (
        f"BEST SIGNAL(S) SO FAR (iteration {best_result.get('iteration', '?')}, "
        f"|IC| = {abs(best_ic):.4f}):\n{best_summary}\n\n"
        f"ADVICE FROM LAST ITERATION:\n{advice}\n\n"
        "Try to BEAT the best |IC| above. Build on what worked rather than "
        "starting from scratch."
    )


def _parse_request(raw: str) -> tuple[str, str | None]:
    """
    Decode the workflow input.

    Accepts either:
      - A plain signal request string: ``"momentum signals"``
      - A JSON object with a ``request`` field and optional ``seed_feedback``:
        ``{"request": "momentum signals", "seed_feedback": "- try ..."}``

    Returns ``(request_text, seed_feedback_or_None)``. The JSON form is
    opt-in so the standard ``nat run --input "..."`` interface is unchanged.
    """
    text = (raw or "").strip()
    if text.startswith("{"):
        try:
            obj = json.loads(text)
            if isinstance(obj, dict) and "request" in obj:
                return str(obj["request"]), obj.get("seed_feedback")
        except json.JSONDecodeError:
            pass
    return raw, None


def _format_workflow_result(
    status: str,
    request: str,
    iteration: int,
    total_iterations: int,
    signal_json: str,
    ic_results: dict,
    saved_path: str | None,
    config,
    last_feedback: str | None = None,
) -> str:
    """Format the workflow's final result as a structured, human-readable JSON string.

    ``last_feedback`` is the optimization advice from the most recent failed
    iteration. Including it in the result lets a caller resume the loop later
    by passing it back in as the seed feedback for a new run.
    """
    signals_summary = []
    try:
        data = extract_json_array(signal_json) if signal_json else []
        if not data and signal_json:
            parsed = json.loads(signal_json)
            data = parsed if isinstance(parsed, list) else [parsed]
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            signals_summary.append(
                {
                    "name": item.get("name"),
                    "formula": item.get("formula"),
                    "category": item.get("category"),
                    "data_fields_used": item.get("data_fields_used"),
                    "lookback_periods": item.get("lookback_periods"),
                }
            )
    except json.JSONDecodeError:
        pass

    metrics = {
        k: ic_results.get(k)
        for k in ("mean_ic", "ic_std", "ic_ir", "t_stat", "p_value", "num_periods", "positive_ic_ratio")
        if ic_results.get(k) is not None
    }

    payload = {
        "status": status,
        "headline": _STATUS_HEADLINE.get(status, status),
        "request": request,
        "iteration": iteration,
        "total_iterations": total_iterations,
        "selected_signal": ic_results.get("selected_signal"),
        "thresholds": {
            "ic_threshold": config.ic_threshold,
            "p_value_threshold": config.p_value_threshold,
        },
        "metrics": metrics,
        "signals": signals_summary,
        "saved_path": saved_path,
    }

    if ic_results.get("error"):
        payload["error"] = ic_results["error"]

    if last_feedback:
        payload["last_feedback"] = last_feedback

    return json.dumps(payload, indent=2, default=str)


def save_signal_results(
    signal_json: str,
    signal_code: str,
    ic_results: dict,
    iteration: int,
) -> str:
    """Save signal results to ``output/signal_<timestamp>_iter<n>.json``."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = OUTPUT_DIR / f"signal_{timestamp}_iter{iteration}.json"

    metrics = {k: v for k, v in ic_results.items() if k != "selected_signal"}
    payload = {
        "timestamp": timestamp,
        "iteration": iteration,
        "selected_signal": ic_results.get("selected_signal"),
        "signal_description": signal_json,
        "signal_code": signal_code,
        "evaluation_metrics": metrics,
    }
    with open(filepath, "w") as f:
        json.dump(payload, f, indent=2)
    logger.info(f"Saved signal results to {filepath}")
    return str(filepath)


class SignalOptimizerConfig(FunctionBaseConfig, name="signal_optimizer"):
    """Iteratively generate, evaluate, and refine quantitative signals."""

    signal_generator_llm: str | None = Field(default=None, description="LLM for signal generation")
    code_generator_llm: str | None = Field(default=None, description="LLM for code generation")
    optimization_advisor_llm: str | None = Field(default=None, description="LLM for optimization feedback")
    llm_name: str | None = Field(default=None, description="Fallback LLM if specific ones not set")
    ic_threshold: float = Field(default=0.03, description="Minimum |IC| to accept")
    p_value_threshold: float = Field(default=0.05, description="Maximum p-value")
    max_iterations: int = Field(default=3, description="Max optimization attempts")
    num_signals: int = Field(default=5, description="Signals per iteration")
    forward_periods: int = Field(default=5, description="Forward return periods")
    save_results: bool = Field(default=True, description="Save results to disk")


@register_function(config_type=SignalOptimizerConfig, framework_wrappers=[LLMFrameworkEnum.LANGCHAIN])
async def signal_optimizer_function(config: SignalOptimizerConfig, builder: Builder):
    """Compose the signal / code / evaluator agents into an optimization loop."""

    signal_llm_name = config.signal_generator_llm or config.llm_name
    code_llm_name = config.code_generator_llm or config.llm_name
    advisor_llm_name = config.optimization_advisor_llm or config.llm_name
    if not signal_llm_name:
        raise ValueError("Must specify llm_name or signal_generator_llm")

    signal_llm = await builder.get_llm(signal_llm_name, wrapper_type=LLMFrameworkEnum.LANGCHAIN)
    code_llm = await builder.get_llm(code_llm_name or signal_llm_name, wrapper_type=LLMFrameworkEnum.LANGCHAIN)
    advisor_llm = await builder.get_llm(advisor_llm_name or signal_llm_name, wrapper_type=LLMFrameworkEnum.LANGCHAIN)
    logger.info(f"LLMs: signal={signal_llm_name}, code={code_llm_name}, advisor={advisor_llm_name}")

    operators = load_calculator_operators()
    stock_data = load_stock_data()

    # ---- per-step helpers (close over the LLMs and shared state) ----

    def evaluate_ic(signal_code: str) -> dict[str, Any]:
        """Run the signal code and compute its rank IC against forward returns."""
        if not stock_data:
            return {"error": "No stock data", "mean_ic": None}

        clean_code = extract_code_from_response(signal_code)
        exec_result = execute_signal_code(
            clean_code,
            stock_data,
            selection_periods=config.forward_periods,
        )
        if exec_result is None:
            return {"error": "Code execution failed", "mean_ic": None}
        signal_values, selected_signal = exec_result

        close = stock_data.get("Close")
        if close is None:
            return {"error": "No Close data", "mean_ic": None}

        # Suppress numpy/pandas RuntimeWarnings from rolling-window operators
        # over windows that contain NaN — the result is correctly NaN.
        with np.errstate(invalid="ignore", divide="ignore"), warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=RuntimeWarning)
            forward_returns = compute_forward_returns(close, periods=config.forward_periods)
            ic_results = compute_rank_ic(signal_values, forward_returns)
        ic_results["selected_signal"] = selected_signal
        return ic_results

    def is_acceptable(ic_results: dict) -> bool:
        mean_ic = ic_results.get("mean_ic")
        p_value = ic_results.get("p_value")
        if mean_ic is None or abs(mean_ic) < config.ic_threshold:
            return False
        if p_value is not None and p_value > config.p_value_threshold:
            return False
        return True

    async def generate_feedback(signal_json: str, ic_results: dict, iteration: int) -> str:
        """
        Ask the advisor LLM for compact, actionable feedback.

        The full signal JSON is sent so the advisor sees every field
        (name, formula, meaning, category, lookbacks). Output is constrained
        to a few short bullets so it fits comfortably in the next iteration's
        signal-generator prompt.
        """
        mean_ic = ic_results.get("mean_ic")
        p_value = ic_results.get("p_value")
        mean_ic_str = f"{mean_ic:.4f}" if mean_ic is not None else "N/A"
        p_value_str = f"{p_value:.4f}" if p_value is not None else "N/A"
        error = ic_results.get("error", "")
        error_line = f"- Error: {error}\n" if error else ""

        prompt = f"""Iteration {iteration} results:
- Mean IC: {mean_ic_str} (target >= {config.ic_threshold})
- P-value: {p_value_str} (target <= {config.p_value_threshold})
{error_line}
SIGNALS TRIED:
{signal_json}

Output exactly 3 bullet points, max 15 words each, suggesting concrete
changes (different operator, different lookback, different data field).
No prose, no preamble. Format:
- <change 1>
- <change 2>
- <change 3>"""

        response = await advisor_llm.ainvoke(
            [
                SystemMessage(content=NO_THINK_INSTRUCTION),
                SystemMessage(content="You are a senior quant providing concise signal optimization advice."),
                HumanMessage(content=prompt),
            ]
        )
        feedback = extract_response_text(response).strip()
        # Hard cap so a chatty model can't blow up the next iteration's prompt.
        if len(feedback) > 500:
            feedback = feedback[:500].rsplit("\n", 1)[0]
        return feedback

    # ---- main optimization loop ----

    async def run_optimization(request: str) -> str:
        """
        Run the closed-loop signal discovery optimization.

        Args:
            request: Either a plain signal request string (e.g.,
                ``"momentum signals"``) or a JSON object with the shape
                ``{"request": "momentum signals", "seed_feedback": "..."}``
                to resume from a prior run's ``last_feedback``.

                The JSON form is opt-in so the CLI-friendly single-string
                interface still works (NAT's input schema is single-arg).
        """
        request_text, seed_feedback = _parse_request(request)

        best_result: dict | None = None
        best_ic: float | None = None
        feedback: str | None = seed_feedback
        last_error: str | None = None

        if seed_feedback:
            logger.info(f"Resuming with seed feedback ({len(seed_feedback)} chars)")

        for iteration in range(1, config.max_iterations + 1):
            logger.info(f"=== Iteration {iteration}/{config.max_iterations} ===")

            logger.info("Generating signals...")
            signal_json = await generate_signal_json(
                signal_llm, request_text, config.num_signals, operators, feedback
            )

            logger.info("Generating code...")
            codegen_errors: list[str] = []
            signal_code = await generate_signal_code(
                code_llm, signal_json, operators, errors_out=codegen_errors
            )

            logger.info("Evaluating IC...")
            ic_results = evaluate_ic(signal_code)
            mean_ic = ic_results.get("mean_ic")
            if ic_results.get("error"):
                last_error = str(ic_results["error"])

            if mean_ic is not None:
                logger.info(f"Mean IC: {mean_ic:.4f}, p-value: {ic_results.get('p_value', 'N/A')}")
                if best_ic is None or abs(mean_ic) > abs(best_ic):
                    best_ic = mean_ic
                    best_result = {
                        "signal_json": signal_json,
                        "signal_code": signal_code,
                        "ic_results": ic_results,
                        "iteration": iteration,
                    }

            if is_acceptable(ic_results):
                logger.info("Signal accepted!")
                saved_path = (
                    save_signal_results(signal_json, signal_code, ic_results, iteration)
                    if config.save_results
                    else None
                )
                return _format_workflow_result(
                    status="accepted",
                    request=request_text,
                    iteration=iteration,
                    total_iterations=config.max_iterations,
                    signal_json=signal_json,
                    ic_results=ic_results,
                    saved_path=saved_path,
                    config=config,
                    last_feedback=feedback,
                )

            # When every signal was rejected at parse/arity time the advisor
            # has nothing to say (no IC numbers exist). Skip the LLM round-trip
            # and feed the structural errors directly to the next iteration so
            # the generator can self-correct.
            if codegen_errors and mean_ic is None:
                last_error = "; ".join(codegen_errors)
                advice = (
                    "Your previous signals were ALL REJECTED before evaluation. "
                    "Re-read each operator signature carefully and match the argument "
                    "count exactly. Specific failures:\n"
                    + "\n".join(f"- {e}" for e in codegen_errors)
                )
                logger.info(f"Skipping advisor: {len(codegen_errors)} structural errors will drive next iteration")
            else:
                logger.info("Generating optimization feedback...")
                advice = await generate_feedback(signal_json, ic_results, iteration)

            # Compose the feedback shown to the next iteration: anchor it on
            # the best-known result so the model has a concrete target to
            # beat, then append the advisor's bullets (or arity errors).
            feedback = _compose_feedback(advice, best_result, best_ic)

        if best_result:
            saved_path = (
                save_signal_results(
                    best_result["signal_json"],
                    best_result["signal_code"],
                    best_result["ic_results"],
                    best_result["iteration"],
                )
                if config.save_results
                else None
            )
            return _format_workflow_result(
                status="best_effort",
                request=request_text,
                iteration=best_result["iteration"],
                total_iterations=config.max_iterations,
                signal_json=best_result["signal_json"],
                ic_results=best_result["ic_results"],
                saved_path=saved_path,
                config=config,
                last_feedback=feedback,
            )

        return _format_workflow_result(
            status="failed",
            request=request_text,
            iteration=0,
            total_iterations=config.max_iterations,
            signal_json="",
            ic_results={"error": last_error} if last_error else {},
            saved_path=None,
            config=config,
            last_feedback=feedback,
        )

    yield FunctionInfo.from_fn(
        run_optimization,
        description="Run signal discovery optimization loop: generate -> code -> evaluate -> feedback.",
    )
