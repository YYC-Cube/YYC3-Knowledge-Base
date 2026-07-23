# SPDX-FileCopyrightText: Copyright (c) 2023-2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for signal_evaluator pure utility functions."""

import numpy as np
import pandas as pd
import pytest

from signal_discovery_workflow.signal_evaluator import (
    compute_forward_returns,
    compute_rank_ic,
    execute_signal_code,
    extract_code_from_response,
)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def stock_dates():
    return pd.date_range("2020-01-01", periods=100, freq="B")


@pytest.fixture
def stock_tickers():
    return [f"S{i:02d}" for i in range(20)]


@pytest.fixture
def close_df(stock_dates, stock_tickers):
    """Realistic-looking close prices (random walk, always positive)."""
    rng = np.random.default_rng(0)
    returns = rng.normal(0.0005, 0.01, size=(len(stock_dates), len(stock_tickers)))
    prices = 100 * np.exp(np.cumsum(returns, axis=0))
    return pd.DataFrame(prices, index=stock_dates, columns=stock_tickers)


@pytest.fixture
def stock_data(close_df, stock_dates, stock_tickers):
    rng = np.random.default_rng(1)
    volume = pd.DataFrame(
        rng.integers(100_000, 1_000_000, size=close_df.shape).astype(float),
        index=stock_dates,
        columns=stock_tickers,
    )
    return {
        "Open": close_df * 0.999,
        "Close": close_df,
        "High": close_df * 1.005,
        "Low": close_df * 0.995,
        "Volume": volume,
    }


# ---------------------------------------------------------------------------
# compute_forward_returns
# ---------------------------------------------------------------------------

class TestComputeForwardReturns:
    def test_shape_preserved(self, close_df):
        result = compute_forward_returns(close_df, periods=5)
        assert result.shape == close_df.shape

    def test_last_periods_are_nan(self, close_df):
        periods = 5
        result = compute_forward_returns(close_df, periods=periods)
        assert result.iloc[-periods:].isna().all().all()

    def test_early_values_not_nan(self, close_df):
        result = compute_forward_returns(close_df, periods=5)
        assert result.iloc[:-5].notna().all().all()

    def test_return_calculation(self, stock_dates, stock_tickers):
        """5-day forward return = price[t+5]/price[t] - 1."""
        prices = pd.DataFrame(
            [[100.0, 200.0], [110.0, 180.0], [120.0, 190.0],
             [105.0, 210.0], [115.0, 195.0], [130.0, 220.0]],
            index=pd.date_range("2020-01-01", periods=6, freq="B"),
            columns=["A", "B"],
        )
        result = compute_forward_returns(prices, periods=1)
        expected_row0 = prices.iloc[1] / prices.iloc[0] - 1
        pd.testing.assert_series_equal(result.iloc[0], expected_row0, check_names=False)

    def test_periods_one(self, close_df):
        result = compute_forward_returns(close_df, periods=1)
        assert result.iloc[-1].isna().all()
        assert result.iloc[0].notna().all()


# ---------------------------------------------------------------------------
# compute_rank_ic
# ---------------------------------------------------------------------------

class TestComputeRankIC:
    def _make_aligned(self, n_dates=60, n_stocks=20, seed=0):
        rng = np.random.default_rng(seed)
        dates = pd.date_range("2020-01-01", periods=n_dates, freq="B")
        tickers = [f"S{i:02d}" for i in range(n_stocks)]
        returns = pd.DataFrame(rng.standard_normal((n_dates, n_stocks)), index=dates, columns=tickers)
        return dates, tickers, returns

    def test_returns_all_expected_keys(self, close_df):
        fwd = compute_forward_returns(close_df, periods=5)
        result = compute_rank_ic(close_df, fwd)
        for key in ("mean_ic", "ic_std", "ic_ir", "t_stat", "p_value", "num_periods"):
            assert key in result

    def test_perfect_positive_ic(self):
        """Signal = forward returns → IC close to 1."""
        _, _, returns = self._make_aligned()
        result = compute_rank_ic(returns, returns)
        assert result["mean_ic"] is not None
        assert result["mean_ic"] > 0.9

    def test_perfect_negative_ic(self):
        """Signal = −forward returns → IC close to −1."""
        _, _, returns = self._make_aligned()
        result = compute_rank_ic(-returns, returns)
        assert result["mean_ic"] is not None
        assert result["mean_ic"] < -0.9

    def test_random_signal_ic_near_zero(self):
        """Uncorrelated signal and returns: mean IC should be near 0."""
        dates, tickers, returns = self._make_aligned(n_dates=120, seed=99)
        rng = np.random.default_rng(7)
        signal = pd.DataFrame(rng.standard_normal(returns.shape), index=dates, columns=tickers)
        result = compute_rank_ic(signal, returns)
        assert result["mean_ic"] is not None
        assert abs(result["mean_ic"]) < 0.15

    def test_zero_t_stat_has_p_value(self):
        """A zero t-statistic is valid and should produce p-value 1.0."""
        dates = pd.date_range("2020-01-01", periods=2, freq="B")
        tickers = [f"S{i:02d}" for i in range(20)]
        row = np.arange(20, dtype=float)
        returns = pd.DataFrame([row, row], index=dates, columns=tickers)
        signal = pd.DataFrame([row, -row], index=dates, columns=tickers)

        result = compute_rank_ic(signal, returns)

        assert result["mean_ic"] == pytest.approx(0.0)
        assert result["t_stat"] == pytest.approx(0.0)
        assert result["p_value"] == pytest.approx(1.0)

    def test_no_common_dates(self):
        """Disjoint date ranges → None metrics, 0 periods."""
        dates_a = pd.date_range("2020-01-01", periods=30, freq="B")
        dates_b = pd.date_range("2022-01-01", periods=30, freq="B")
        tickers = [f"S{i}" for i in range(20)]
        rng = np.random.default_rng(0)
        signal = pd.DataFrame(rng.standard_normal((30, 20)), index=dates_a, columns=tickers)
        returns = pd.DataFrame(rng.standard_normal((30, 20)), index=dates_b, columns=tickers)
        result = compute_rank_ic(signal, returns)
        assert result["num_periods"] == 0
        assert result["mean_ic"] is None

    def test_too_few_stocks_skipped(self):
        """Fewer than 10 stocks per date → no valid IC periods."""
        dates = pd.date_range("2020-01-01", periods=30, freq="B")
        tickers = [f"S{i}" for i in range(5)]  # Only 5 stocks
        rng = np.random.default_rng(0)
        signal = pd.DataFrame(rng.standard_normal((30, 5)), index=dates, columns=tickers)
        returns = pd.DataFrame(rng.standard_normal((30, 5)), index=dates, columns=tickers)
        result = compute_rank_ic(signal, returns)
        assert result["num_periods"] == 0

    def test_constant_signal_skipped(self):
        """Constant signal values have zero variance → skipped each date."""
        dates = pd.date_range("2020-01-01", periods=30, freq="B")
        tickers = [f"S{i}" for i in range(20)]
        rng = np.random.default_rng(0)
        signal = pd.DataFrame(1.0, index=dates, columns=tickers)  # All constant
        returns = pd.DataFrame(rng.standard_normal((30, 20)), index=dates, columns=tickers)
        result = compute_rank_ic(signal, returns)
        assert result["num_periods"] == 0

    def test_positive_ic_ratio(self):
        """IC for a positively predictive signal should mostly be positive."""
        _, _, returns = self._make_aligned()
        result = compute_rank_ic(returns, returns)
        assert result.get("positive_ic_ratio", 0) > 0.9

    def test_ic_percentiles_present(self):
        _, _, returns = self._make_aligned()
        result = compute_rank_ic(returns, returns)
        percentiles = result.get("ic_percentiles", {})
        assert set(percentiles.keys()) == {"5th", "25th", "50th", "75th", "95th"}

    def test_partial_stock_overlap(self):
        """Only a subset of stocks shared between signal and returns."""
        dates = pd.date_range("2020-01-01", periods=40, freq="B")
        rng = np.random.default_rng(0)
        signal = pd.DataFrame(
            rng.standard_normal((40, 25)),
            index=dates,
            columns=[f"S{i}" for i in range(25)],
        )
        returns = pd.DataFrame(
            rng.standard_normal((40, 25)),
            index=dates,
            columns=[f"S{i}" for i in range(5, 30)],  # Overlap on S05–S24 (20 stocks)
        )
        result = compute_rank_ic(signal, returns)
        assert result["num_periods"] > 0


# ---------------------------------------------------------------------------
# extract_code_from_response
# ---------------------------------------------------------------------------

class TestExtractCodeFromResponse:
    def test_python_fenced_block(self):
        response = "Some text\n```python\nx = 1\n```\nmore text"
        assert extract_code_from_response(response) == "x = 1\n"

    def test_generic_fenced_block(self):
        response = "```\ny = 2\n```"
        assert extract_code_from_response(response) == "y = 2\n"

    def test_python_block_takes_precedence(self):
        response = "```\nraw\n```\n```python\npython_code\n```"
        assert extract_code_from_response(response) == "python_code\n"

    def test_multiple_python_blocks_joined(self):
        response = "```python\npart1\n```\n```python\npart2\n```"
        result = extract_code_from_response(response)
        assert "part1" in result
        assert "part2" in result

    def test_raw_code_returned_as_is(self):
        raw = "def f():\n    return 1"
        assert extract_code_from_response(raw) == raw

    def test_empty_string(self):
        assert extract_code_from_response("") == ""


# ---------------------------------------------------------------------------
# execute_signal_code
# ---------------------------------------------------------------------------

class TestExecuteSignalCode:
    def test_basic_momentum_signal(self, stock_data):
        code = (
            "import pandas as pd\n"
            "import numpy as np\n\n"
            "def signal_momentum(Close: pd.DataFrame) -> pd.DataFrame:\n"
            "    return Close.pct_change(5)\n"
        )
        result = execute_signal_code(code, stock_data)
        assert result is not None
        df, name = result
        assert isinstance(df, pd.DataFrame)
        assert name == "signal_momentum"

    def test_returns_dataframe_not_series(self, stock_data):
        code = (
            "import pandas as pd\n\n"
            "def signal_mean(Close: pd.DataFrame) -> pd.DataFrame:\n"
            "    return Close.pct_change(3)\n"
        )
        result = execute_signal_code(code, stock_data)
        assert result is not None
        df, _ = result
        assert isinstance(df, pd.DataFrame)

    def test_no_signal_functions_returns_none(self, stock_data):
        """Code with only imports and no callable signals → None."""
        code = "import pandas as pd\nimport numpy as np\n"
        result = execute_signal_code(code, stock_data)
        assert result is None

    def test_syntax_error_returns_none(self, stock_data):
        code = "def signal_broken(Close):\n    return Close.pct_change(5\n"
        result = execute_signal_code(code, stock_data)
        assert result is None

    def test_runtime_error_returns_none(self, stock_data):
        """Signal function that raises at call time → None."""
        code = (
            "def signal_crash(Close):\n"
            "    raise ValueError('intentional')\n"
        )
        result = execute_signal_code(code, stock_data)
        assert result is None

    def test_multiple_signals_returns_best(self, stock_data):
        """When two signals are provided, the one with higher |IC| is selected."""
        code = (
            "import pandas as pd\n\n"
            "def signal_alpha(Close):\n"
            "    return Close.pct_change(5)\n\n"
            "def signal_beta(Close):\n"
            "    return Close.pct_change(10)\n"
        )
        result = execute_signal_code(code, stock_data)
        assert result is not None
        _, name = result
        assert name in ("signal_alpha", "signal_beta")

    def test_selection_periods_controls_best_signal(self, stock_data):
        code = (
            "import pandas as pd\n\n"
            "def signal_one_day(Close):\n"
            "    return Close.shift(-1) / Close - 1\n\n"
            "def signal_five_day(Close):\n"
            "    return Close.shift(-5) / Close - 1\n"
        )

        one_day = execute_signal_code(code, stock_data, selection_periods=1)
        five_day = execute_signal_code(code, stock_data, selection_periods=5)

        assert one_day is not None
        assert five_day is not None
        assert one_day[1] == "signal_one_day"
        assert five_day[1] == "signal_five_day"

    def test_operator_names_not_treated_as_signals(self, stock_data):
        """Known operator names like TS_Return should not be returned as the signal."""
        code = (
            "import pandas as pd\n\n"
            "def TS_Return(x, d):\n"
            "    return x.pct_change(d)\n\n"
            "def signal_real(Close):\n"
            "    return TS_Return(Close, 5)\n"
        )
        result = execute_signal_code(code, stock_data)
        assert result is not None
        _, name = result
        assert name == "signal_real"

    def test_uses_volume_data(self, stock_data):
        """Signal using Volume parameter should be called with volume data."""
        code = (
            "import pandas as pd\n\n"
            "def signal_volume_change(Volume):\n"
            "    return Volume.pct_change(5)\n"
        )
        result = execute_signal_code(code, stock_data)
        assert result is not None
        df, name = result
        assert name == "signal_volume_change"
        assert df.shape == stock_data["Volume"].shape
