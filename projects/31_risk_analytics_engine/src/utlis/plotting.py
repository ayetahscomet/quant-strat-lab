# src/utils/plotting.py

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from pathlib import Path

def save_fig(fig, filename: str, output_dir: Path):
    """Helper to save figures cleanly."""
    output_dir.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_dir / filename, bbox_inches='tight')
    plt.close(fig)

def plot_prices(prices: pd.DataFrame, title="Asset Prices", save=None):
    fig, ax = plt.subplots(figsize=(12, 6))
    prices.plot(ax=ax)
    ax.set_title(title)
    ax.set_ylabel("Price")
    ax.grid(True)

    if save:
        save_fig(fig, save, save.parent)

    return fig

def plot_returns(returns: pd.DataFrame, title="Daily Returns", save=None):
    fig, ax = plt.subplots(figsize=(12, 6))
    returns.plot(ax=ax)
    ax.set_title(title)
    ax.grid(True)

    if save:
        save_fig(fig, save, save.parent)

    return fig

def plot_rolling_vol(returns: pd.DataFrame, window=20, save=None):
    fig, ax = plt.subplots(figsize=(12, 6))
    vol = returns.rolling(window).std() * np.sqrt(252)
    vol.plot(ax=ax)
    ax.set_title(f"{window}-day Rolling Annualised Volatility")
    ax.grid(True)

    if save:
        save_fig(fig, save, save.parent)

    return fig

def plot_rolling_corr(returns: pd.DataFrame, asset1, asset2, window=60, save=None):
    fig, ax = plt.subplots(figsize=(10, 5))
    corr = returns[asset1].rolling(window).corr(returns[asset2])
    corr.plot(ax=ax)
    ax.set_title(f"{window}-day Rolling Correlation: {asset1} vs {asset2}")
    ax.grid(True)

    if save:
        save_fig(fig, save, save.parent)

    return fig

def plot_var_series(pnl: pd.Series, var_series: pd.Series, save=None):
    fig, ax = plt.subplots(figsize=(12, 6))
    pnl.plot(ax=ax, label="PnL")
    var_series.plot(ax=ax, label="VaR (99%)", linestyle="--")
    ax.legend()
    ax.set_title("PnL and Daily VaR")
    ax.grid(True)

    if save:
        save_fig(fig, save, save.parent)

    return fig

def plot_pca_loadings(eigvecs: np.ndarray, save=None):
    fig, ax = plt.subplots(figsize=(10, 6))
    for i in range(eigvecs.shape[1]):
        ax.plot(eigvecs[:, i], label=f"PC{i+1}")

    ax.set_title("PCA Loadings")
    ax.legend()
    ax.grid(True)

    if save:
        save_fig(fig, save, save.parent)

    return fig

def plot_stress_losses(contrib: np.ndarray, labels=None, save=None):
    fig, ax = plt.subplots(figsize=(8, 5))
    idx = np.arange(len(contrib))
    ax.bar(idx, contrib)

    if labels is not None:
        ax.set_xticks(idx)
        ax.set_xticklabels(labels, rotation=45)

    ax.set_title("Scenario Loss Attribution")
    ax.grid(True)

    if save:
        save_fig(fig, save, save.parent)

    return fig
