# src/pnl/aggregator.py

import numpy as np
import pandas as pd

def compute_nav(returns_df: pd.DataFrame, weights_df: pd.DataFrame, tc_rate = 0.0005, initial_nav = 1.0) -> dict:
    dates = returns_df.index.intersection(weights_df.index)
    assets = returns_df.columns.intersection(weights_df.columns)
    r = returns_df.reindex(index = dates, columns = assets).fillna(0.0)
    w = weights_df.reindex(index = dates, columns = assets).fillna(0.0)
    nav = [initial_nav]
    nav_dates = []
    prev_w = pd.Series(0.0, index = assets)
    for date in dates:
        wt = w.loc[date]
        port_ret = float((wt * r.loc[date]).sum())
        turnover = np.abs(wt - prev_w).sum()
        tc = tc_rate * turnover
        new_nav = nav[-1] * (1 + port_ret) - nav[-1] * tc
        nav.append(new_nav)
        nav_dates.append(date)
        prev_w = wt
    nav_series = pd.Series(nav[1:], index = nav_dates)
    pnl = nav_series.diff().fillna(nav_series.iloc[0] - initial_nav)
    return {"nav": nav_series, "pnl": pnl}