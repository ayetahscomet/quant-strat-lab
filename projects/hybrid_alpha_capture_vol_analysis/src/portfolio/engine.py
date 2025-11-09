# --- src/portfolio/engine.py ---

import pandas as pd
import numpy as np

def compute_portfolio_pnl(returns_df: pd.DataFrame, weights_df: pd.DataFrame,
                          tc_per_unit: float = 0.0002, slippage: float = 0.0,
                          initial_cash: float = 1.0):
    """
    Simulate portfolio PnL given returns_df (daily returns per asset) and weights_df (daily weights).
    - returns_df: index dates, columns assets (log returns or simple returns)
    - weights_df: same index and columns, weights represent fraction of portfolio (signed), gross exposure should be stable
    - tc_per_unit: proportional transaction cost rate applied to turnover (fraction of notional)
    - slippage: additional friction applied to traded notional
    Returns dict with nav (pd.Series), pnl_series (pd.Series), daily_stats.
    """
    dates = returns_df.index.intersection(weights_df.index)
    assets = returns_df.columns.intersection(weights_df.columns)

    r = returns_df.reindex(index = dates, columns = assets).fillna(0.0)
    w = weights_df.reindex(index = dates, columns = assets).fillna(0.0)
    nav = []
    pnl_list = []
    cash = initial_cash
    prev_w = pd.Series(0.0, index = assets)
    current_nav = initial_cash
    for date in dates:
        wt = w.loc[date]
        turnover = np.abs(wt - prev_w).sum()
        tc = tc_per_unit * turnover
        port_ret = float((wt * r.loc[date]).sum())
        slip = slippage * turnover
        current_nav = current_nav * (1.0 + port_ret) - current_nav * (tc + slip)
        nav.append(current_nav)
        pnl_list.append(current_nav - (nav[-2] if len(nav) > 1 else initial_cash * (1 + port_ret) - initial_cash))
        prev_w = wt
    nav_series = pd.Series(nav, index = dates)
    pnl_series = nav_series.diff().fillna(nav_series.values[0] - initial_cash)
    return {
        "nav": nav_series,
        "pnl": pnl_series,
        "turnover": None
    }