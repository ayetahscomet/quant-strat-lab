# /Users/deborahakintoye/GitHub/quant-strat-lab/projects/21_asset_data_analysis/src/visual/plots.py

import matplotlib.pyplot as plt
import src.utils.paths as REPORTS_FIGURES
import pandas as pd

def plot_prices(prices_df: pd.DataFrame):
    fig, ax = plt.subplots(figsize = (12, 5))
    prices_df.plot(ax = ax)
    ax.set_title("Asset Prices")
    REPORTS_FIGURES.mkdir(parents = True, exist_ok = True)
    fig.savefig(REPORTS_FIGURES / "prices.png")
    plt.close(fig)

def plot_returns(return_df: pd.DataFrame):
    fig, ax = plt.subplots(figsize = (12, 5))
    return_df.plot(ax = ax)
    ax.set_title("Log Returns")
    fig.savefig(REPORTS_FIGURES / "returns.png")
    plt.close(fig)

def plot_rolling_vol(return_df: pd.DataFrame, window = 30):
    rolled = return_df.rolling(window).std()
    fig, ax = plt.subplots(figsize = (12, 5))
    rolled.plot(ax = ax)
    ax.set_title(f"{window}-Day Rolling Volatility")
    fig.savefig(REPORTS_FIGURES / f"rolling_vol{window}.png")
    plt.close(fig)
