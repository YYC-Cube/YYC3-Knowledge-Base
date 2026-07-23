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
Signal Evaluator: Rank IC computation, signal-code execution, and helpers.

The rank IC measures the Spearman correlation between signal values and forward
stock returns — a standard quant-research signal-quality metric.
"""

import inspect
import json
import logging
import re
import traceback
import warnings
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from scipy import stats

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data" / "sp500"
CALCULATOR_PATH = Path(__file__).parent / "template" / "calculator.json"


def _load_all_operators() -> dict[str, callable]:
    """Load and compile all operator functions from calculator.json into a callable dict."""
    if not CALCULATOR_PATH.exists():
        return {}
    with open(CALCULATOR_PATH, "r") as f:
        operators = json.load(f)
    op_namespace = {"pd": pd, "np": np}
    for op in operators:
        try:
            exec(op["code"], op_namespace)
        except Exception as e:
            logger.warning(f"Failed to compile operator {op.get('name')}: {e}")
    return {
        name: obj
        for name, obj in op_namespace.items()
        if callable(obj) and name not in ("pd", "np")
    }


_OPERATOR_FUNCTIONS = _load_all_operators()


def get_operator_arities() -> dict[str, tuple[int, int]]:
    """Return ``{operator_name: (min_required_args, max_args)}`` for every loaded operator.

    ``max_args`` is ``-1`` if the operator accepts ``*args``.
    Used by the code generator to validate formulas before execution.
    """
    arities: dict[str, tuple[int, int]] = {}
    for name, fn in _OPERATOR_FUNCTIONS.items():
        try:
            sig = inspect.signature(fn)
        except (TypeError, ValueError):
            continue
        required = sum(
            1 for p in sig.parameters.values()
            if p.default is inspect.Parameter.empty
            and p.kind in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)
        )
        has_varargs = any(
            p.kind is inspect.Parameter.VAR_POSITIONAL for p in sig.parameters.values()
        )
        max_args = -1 if has_varargs else len([
            p for p in sig.parameters.values()
            if p.kind in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)
        ])
        arities[name] = (required, max_args)
    return arities


def load_stock_data() -> dict[str, pd.DataFrame]:
    """Load all available stock price-volume data from CSV files."""
    data = {}
    data_files = ["Open", "Close", "High", "Low", "Volume"]

    for field in data_files:
        file_path = DATA_DIR / f"{field}.csv"
        if file_path.exists():
            try:
                df = pd.read_csv(file_path, index_col=0, parse_dates=True)
                data[field] = df
                logger.info(f"Loaded {field}.csv with shape {df.shape}")
            except Exception as e:
                logger.warning(f"Failed to load {field}.csv: {e}")
        else:
            logger.warning(f"Data file not found: {file_path}")

    return data


def compute_forward_returns(close: pd.DataFrame, periods: int = 5) -> pd.DataFrame:
    """
    Compute forward returns for the next N periods.

    Args:
        close: DataFrame of closing prices (rows=dates, cols=stocks).
        periods: Number of forward periods for return calculation.

    Returns:
        DataFrame of forward returns with the same shape as input.
    """
    forward_returns = close.shift(-periods) / close - 1
    return forward_returns


def compute_rank_ic(
    signal_values: pd.DataFrame,
    forward_returns: pd.DataFrame,
) -> dict[str, Any]:
    """
    Compute rank IC (Information Coefficient) between signal values and forward returns.

    The rank IC is the Spearman correlation between signal ranks and return ranks
    computed cross-sectionally for each date, then aggregated.

    Args:
        signal_values: DataFrame of signal values (rows=dates, cols=stocks).
        forward_returns: DataFrame of forward returns (rows=dates, cols=stocks).

    Returns:
        Dictionary containing IC statistics.
    """
    common_dates = signal_values.index.intersection(forward_returns.index)
    common_stocks = signal_values.columns.intersection(forward_returns.columns)

    if len(common_dates) == 0 or len(common_stocks) == 0:
        return {
            "mean_ic": None,
            "ic_std": None,
            "ic_ir": None,
            "t_stat": None,
            "p_value": None,
            "num_periods": 0,
            "error": "No common dates or stocks between signal and returns",
        }

    signal_aligned = signal_values.loc[common_dates, common_stocks]
    returns_aligned = forward_returns.loc[common_dates, common_stocks]

    # Suppress numpy "invalid value encountered" RuntimeWarnings from std/mean
    # calculations on edge-case rows. The dropna/length checks already handle
    # the actual data validity logic correctly.
    with np.errstate(invalid="ignore", divide="ignore"), warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=RuntimeWarning)

        ic_series = []
        for date in common_dates:
            signal_row = signal_aligned.loc[date].dropna()
            returns_row = returns_aligned.loc[date].dropna()

            common = signal_row.index.intersection(returns_row.index)
            if len(common) < 10:
                continue

            signal_vals = signal_row[common].values
            return_vals = returns_row[common].values

            # Spearman correlation requires non-constant inputs.
            if np.std(signal_vals) < 1e-10 or np.std(return_vals) < 1e-10:
                continue

            try:
                correlation, _ = stats.spearmanr(signal_vals, return_vals)
                if not np.isnan(correlation):
                    ic_series.append(correlation)
            except Exception:
                continue

        if len(ic_series) == 0:
            return {
                "mean_ic": None,
                "ic_std": None,
                "ic_ir": None,
                "t_stat": None,
                "p_value": None,
                "num_periods": 0,
                "error": "Could not compute IC for any period",
            }

        ic_array = np.array(ic_series)
        mean_ic = float(np.mean(ic_array))
        ic_std = float(np.std(ic_array))
        num_periods = len(ic_series)

        ic_ir = mean_ic / ic_std if ic_std > 0 else None
        t_stat = mean_ic / (ic_std / np.sqrt(num_periods)) if ic_std > 0 else None
        p_value = (
            float(2 * (1 - stats.t.cdf(abs(t_stat), df=num_periods - 1)))
            if t_stat is not None
            else None
        )

        return {
            "mean_ic": mean_ic,
            "ic_std": ic_std,
            "ic_ir": ic_ir,
            "t_stat": t_stat,
            "p_value": p_value,
            "num_periods": num_periods,
            "positive_ic_ratio": float(np.mean(ic_array > 0)),
            "ic_percentiles": {
                "5th": float(np.percentile(ic_array, 5)),
                "25th": float(np.percentile(ic_array, 25)),
                "50th": float(np.percentile(ic_array, 50)),
                "75th": float(np.percentile(ic_array, 75)),
                "95th": float(np.percentile(ic_array, 95)),
            },
        }


def extract_code_from_response(code_response: str) -> str:
    """Extract Python code from markdown code blocks, falling back to raw text."""
    code_blocks = re.findall(r"```python\n(.*?)```", code_response, re.DOTALL)
    if code_blocks:
        return "\n".join(code_blocks)

    code_blocks = re.findall(r"```\n(.*?)```", code_response, re.DOTALL)
    if code_blocks:
        return "\n".join(code_blocks)

    return code_response


# Operator function names — derived from the actual operators loaded from
# calculator.json so this set always stays in sync with available operators.
OPERATOR_NAMES = set(_OPERATOR_FUNCTIONS.keys())

# Standard data field names. Order matters: when a signal function uses a
# generic parameter name (e.g. `x`, `data`, `prices`), parameters are filled
# positionally from this list.
STANDARD_FIELDS = ["Close", "Volume", "High", "Low", "Open"]


def _is_dataframe_param(p: inspect.Parameter) -> bool:
    """Whether this parameter expects a DataFrame to be passed in."""
    ann = p.annotation
    if ann is pd.DataFrame:
        return True
    if isinstance(ann, str) and "DataFrame" in ann:
        return True
    if ann is inspect.Parameter.empty:
        # No type hint — treat as DataFrame only if there's no scalar default.
        if p.default is inspect.Parameter.empty:
            return True
        if p.default is None or isinstance(p.default, pd.DataFrame):
            return True
        return False
    return False


def _resolve_signal_args(
    sig: inspect.Signature,
    stock_data: dict[str, pd.DataFrame],
) -> dict[str, pd.DataFrame]:
    """
    Map signal function parameters to stock data DataFrames.

    Only DataFrame parameters are filled. Numeric/string parameters
    (lookback windows, thresholds, etc.) are left to use their defaults so
    they don't get a DataFrame mistakenly passed in.

    DataFrame parameter resolution:
      1. Exact name match (e.g. `Close` -> Close).
      2. Case-insensitive substring match in either direction
         (e.g. `closing_price` -> Close, `vol` -> Volume).
      3. Positional fallback for unmatched params, drawing from
         STANDARD_FIELDS in order, skipping fields already assigned.
    """
    available_fields = [f for f in STANDARD_FIELDS if f in stock_data]
    df_params = [name for name, p in sig.parameters.items() if _is_dataframe_param(p)]

    kwargs: dict[str, pd.DataFrame] = {}
    used_fields: set[str] = set()
    unmatched: list[str] = []

    for param in df_params:
        match: str | None = None
        p_lower = param.lower()
        for field in available_fields:
            f_lower = field.lower()
            if p_lower == f_lower or f_lower in p_lower or p_lower in f_lower:
                match = field
                break

        if match and match not in used_fields:
            kwargs[param] = stock_data[match]
            used_fields.add(match)
        else:
            unmatched.append(param)

    fallback_pool = [f for f in available_fields if f not in used_fields]
    for param in unmatched:
        if not fallback_pool:
            break
        kwargs[param] = stock_data[fallback_pool.pop(0)]

    return kwargs


_SMART_UNICODE = str.maketrans(
    {
        "\u2018": "'", "\u2019": "'",
        "\u201c": '"', "\u201d": '"',
        "\u2013": "-", "\u2014": "-",
        "\u00a0": " ",
    }
)


def _detect_helpers(candidates: list[tuple[str, Any]]) -> set[str]:
    """
    Among a set of candidate signal functions, return the names of those that
    are *called by* another candidate (i.e. helpers, not signals themselves).
    """
    helpers: set[str] = set()
    names = {name for name, _ in candidates}
    for _, fn in candidates:
        try:
            src = inspect.getsource(fn)
        except (OSError, TypeError):
            continue
        for name in names:
            if name != fn.__name__ and re.search(rf"\b{re.escape(name)}\s*\(", src):
                helpers.add(name)
    return helpers


def execute_signal_code(
    code: str,
    stock_data: dict[str, pd.DataFrame],
    selection_periods: int = 5,
) -> tuple[pd.DataFrame, str] | None:
    """
    Execute self-contained signal code and call its signal function(s).

    The ``code`` string is expected to be a complete, runnable Python module
    that defines its own imports, operator functions, and signal functions.
    No pre-seeded globals are injected: signal functions receive their input
    DataFrames as arguments, and operators come from definitions in the
    module itself. This makes the saved ``signal_code`` portable: it can be
    copy-pasted into any Python session and run as-is.

    ``selection_periods`` controls the forward-return horizon used to choose
    the best signal when multiple signal functions are present.

    Returns the (signal_values, selected_signal_name) tuple of the highest-IC
    signal among those defined in ``code``, or None on failure.
    """
    namespace: dict[str, Any] = {}

    try:
        # Smart-quote/dash normalization — some LLMs emit U+2018/U+2019 etc.
        # that would otherwise raise SyntaxError.
        exec(code.translate(_SMART_UNICODE), namespace)

        # Candidate signals: user-defined functions that aren't operators.
        # `__code__` filters out modules/builtins; OPERATOR_NAMES excludes
        # operator implementations inlined at the top of the module.
        candidates = [
            (name, obj)
            for name, obj in namespace.items()
            if not name.startswith("_")
            and callable(obj)
            and hasattr(obj, "__code__")
            and name not in OPERATOR_NAMES
        ]

        if not candidates:
            logger.warning("No signal functions found in the code")
            return None

        helpers = _detect_helpers(candidates)
        signal_functions = [(n, f) for n, f in candidates if n not in helpers] or candidates

        logger.info(
            f"Found {len(signal_functions)} signal function(s): "
            f"{[f[0] for f in signal_functions]}"
            + (f" (skipping helpers: {sorted(helpers)})" if helpers else "")
        )

        best_result = None
        best_ic = None
        best_name = None

        # Numpy / pandas emit RuntimeWarnings when rolling-window operators
        # (TS_Std, TS_Var, TS_Skew, etc.) hit windows that contain NaN values.
        # The result is correctly NaN; the warnings are noise.
        with np.errstate(invalid="ignore", divide="ignore"), warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=RuntimeWarning)

            for func_name, signal_func in signal_functions:
                try:
                    sig = inspect.signature(signal_func)
                    kwargs = _resolve_signal_args(sig, stock_data)
                    df_param_count = sum(
                        1 for p in sig.parameters.values() if _is_dataframe_param(p)
                    )

                    if len(kwargs) == df_param_count:
                        result = signal_func(**kwargs)
                    elif len(sig.parameters) == 0:
                        result = signal_func()
                    else:
                        logger.warning(
                            f"Cannot determine args for {func_name} "
                            f"(params={list(sig.parameters)}), skipping"
                        )
                        continue

                    if isinstance(result, pd.Series):
                        result = result.to_frame()

                    if isinstance(result, pd.DataFrame):
                        forward_ret = (
                            stock_data["Close"].shift(-selection_periods) / stock_data["Close"] - 1
                        )
                        valid_dates = result.dropna(how="all").index
                        sample_ics = []

                        for date in valid_dates:
                            if date not in forward_ret.index:
                                continue
                            fr = result.loc[date].dropna()
                            rr = forward_ret.loc[date].dropna()
                            common = fr.index.intersection(rr.index)
                            if len(common) < 10:
                                continue
                            f_vals = fr[common].values
                            r_vals = rr[common].values
                            if np.std(f_vals) < 1e-10 or np.std(r_vals) < 1e-10:
                                continue
                            try:
                                corr, _ = stats.spearmanr(f_vals, r_vals)
                                if not np.isnan(corr):
                                    sample_ics.append(corr)
                            except Exception:
                                pass

                        if sample_ics:
                            mean_ic = abs(np.mean(sample_ics))
                            logger.info(f"  {func_name}: |IC| = {mean_ic:.4f}")
                            if best_ic is None or mean_ic > best_ic:
                                best_ic = mean_ic
                                best_result = result
                                best_name = func_name
                        elif best_result is None:
                            best_result = result
                            best_name = func_name

                except Exception as e:
                    logger.warning(f"Error executing {func_name}: {e}")
                    continue

        if best_result is not None:
            ic_str = f"{best_ic:.4f}" if best_ic is not None else "N/A"
            logger.info(f"Selected best signal: {best_name} with |IC| = {ic_str}")
            return best_result, best_name

        return None

    except SyntaxError as e:
        # Show the offending source line(s) so we can diagnose what the LLM
        # produced (truncated string, smart quote we missed, etc.).
        lineno = getattr(e, "lineno", None) or 0
        lines = code.splitlines()
        start, end = max(0, lineno - 3), min(len(lines), lineno + 2)
        snippet = "\n".join(
            f"  {i + 1:4d} {'>>' if i + 1 == lineno else '  '} {line}"
            for i, line in enumerate(lines[start:end], start=start)
        )
        logger.error(f"SyntaxError in generated signal code: {e}\n{snippet}")
        return None
    except Exception as e:
        logger.error(f"Error executing signal code: {e}")
        logger.debug(traceback.format_exc())
        return None
