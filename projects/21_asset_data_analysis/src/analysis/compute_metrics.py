# /Users/deborahakintoye/GitHub/quant-strat-lab/projects/21_asset_data_analysis/src/analysis/compute_metrics.py

import numpy as np
import pandas as pd

from src.utils.paths import REPORTS_TABLES

def compute_returns(price_df: pd.DataFrame) -> pd.DataFrame:
    returns = np.log(price_df / price_df.shift(1))
    returns = returns.dropna()
    return returns

def max_drawdown(price_series: pd.Series) -> pd.Series:
    roll_max = price_series.cummax
    dd = (price_series - roll_max) / roll_max
    return dd.min(), dd.idxmin()


def compute_summary_metrics(price_df, return_df):
    mean_return = return_df.mean()
    std_return = return_df.std()
    ann_vol = std_return * np.sqrt(252)
    skew = return_df.skew()
    kurt = return_df.kurtosis()
    ac1 = return_df.apply(lambda s: s.autocorr(1))

    max_dd = {}
    max_dd_date = {}

    for col in price_df.columns:
        dd_val, dd_date = max_drawdown(price_df[col])
        max_dd[col] = dd_val
        max_dd_date[col] = dd_date

    summary = pd.DataFrame({
        "mean_daily_return": mean_return,
        "std_daily": std_return,
        "annualised_vol": ann_vol,
        "skew": skew,
        "kurtosis": kurt,
        "AC(1)": ac1,
        "max_drawdown": pd.Series(max_dd),
        "max_dd_date": pd.Series(max_dd_date),
    })

    summary.index.name = "Asset"

    REPORTS_TABLES.mkdir(parents=True, exist_ok=True)
    summary.to_csv(REPORTS_TABLES / "summary.csv")

    return summary


