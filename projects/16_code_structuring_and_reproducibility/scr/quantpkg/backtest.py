# src/quantpkg/backtest.py

from __future__ import annotations
import numpy as np
import pandas as pd
from dataclasses import dataclass


@dataclass
class Backtester:
    """
    Simple backtester for single-asset strategies driven by positions.

    Assumptions:
        - No transaction costs
        - Strategy return_t = position_{t-1} * log_return_t
        - NAV updated multiplicatively: NAV_t = NAV_{t-1} * exp(strategy_return_t)
        - Sharpe uses mean/vol of per-period strategy returns

    Parameters
    ----------
    initial_capital : float
        Starting NAV.
    freq_per_year : int
        Number of periods per year (e.g., 252 for daily).
    """

    initial_capital: float = 1e5
    freq_per_year: int = 252

    def run(self, df: pd.DataFrame) -> dict:
        """
        Run backtest on DataFrame with 'log_return' and 'position'.

        Returns
        -------
        dict
            {
                "nav_series": pd.Series,
                "sharpe": float,
                "mean_return": float,
                "vol": float
            }
        """
        if "log_return" not in df.columns or "position" not in df.columns:
            raise ValueError("DataFrame must contain 'log_return' and 'position'.")

        # Avoid look-ahead: use previous period's position
        pos = df["position"].shift(1).fillna(0)

        # Strategy log-return
        strat_ret = pos * df["log_return"]

        # Compute NAV series
        nav = self.initial_capital * np.exp(strat_ret.cumsum())

        # Stats
        mean_ret = strat_ret.mean()
        vol = strat_ret.std()

        sharpe = np.nan
        if vol > 0:
            sharpe = (mean_ret / vol) * np.sqrt(self.freq_per_year)

        return {
            "nav_series": nav,
            "sharpe": sharpe,
            "mean_return": mean_ret,
            "vol": vol,
        }
