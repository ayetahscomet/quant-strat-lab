# --- src/analysis/summary_stats.py ---

import numpy as np
import pandas as pd

from src.utils.paths import REPORTS_TABLES


def max_drawdown(price_series: pd.Series):
    running_max = price_series.cummax()
    drawdown = (price_series - running_max) / running_max
    return drawdown.min()


def compute_summary(price_df: pd.DataFrame, returns_df: pd.DataFrame):
    currencies = price_df.columns

    mean_returns = returns_df.mean()
    std_returns = returns_df.std()
    ann_vol = std_returns * np.sqrt(252)
    skew = returns_df.skew()
    kurt = returns_df.kurtosis()
    ac1 = returns_df.apply(lambda s: s.autocorr(1))

    max_dd = price_df.apply(max_drawdown)

    summary = pd.DataFrame({
        "mean_daily_return": mean_returns,
        "std_return": std_returns,
        "annualised_vol": ann_vol,
        "skewness": skew,
        "kurtosis": kurt,
        "max_drawdown": max_dd,
        "AC(1)": ac1
    })

    summary.index.name = "Currency"
    summary.to_csv(REPORTS_TABLES / "summary_statistics.csv")

    return summary


if __name__ == "__main__":
    # Example script usage
    price_df = pd.read_csv("data/raw/price_series.csv", index_col="Date", parse_dates=True)
    returns_df = pd.read_csv("data/raw/return_series.csv", index_col="Date", parse_dates=True)
    compute_summary(price_df, returns_df)
