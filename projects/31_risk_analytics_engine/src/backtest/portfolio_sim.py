# src/backtest/portfolio_sim.py

import numpy as np
import pandas as pd

from src.data.load_data import load_returns, load_prices
from src.models.pca import run_pca
from src.utlis.math_utils import portfolio_variance, portfolio_stdev

def generate_random_weights(n_assets: int, seed: int = 42):
    """
    Create random long/short portfolio weights.
    Sum to 1 for normalisation.
    """
    rng = np.random.default_rng(seed)
    w = rng.normal(0, 1, n_assets)
    weights = w / np.sum(np.abs(w))  # ensure sum of abs(weights) = 1
    return weights

def compute_portfolio_pnl(returns: pd.DataFrame, weights: np.ndarray):
    """
    PnL_t = sum(weights_i * returns_i,t)
    """
    pnl = returns.values @ weights
    return pd.Series(pnl, index=returns.index, name="PnL")

def compute_dv01(price_series: pd.Series, duration: float = 9.0):
    """
    Approximate DV01 using:
        DV01 = duration * price * 1bp
    """
    dv01 = duration * price_series * 0.0001
    return dv01

def compute_factor_exposures(returns: pd.DataFrame, weights: np.ndarray):
    """
    Exposure to each PCA factor = w' * eigenvector
    """
    _, eigvecs, _ = run_pca(returns)
    exposures = eigvecs.T @ weights
    return exposures

def risk_summary(returns: pd.DataFrame, weights: np.ndarray, window=60):
    """
    Rolling portfolio volatility.
    Equivalent to hedge-fund style "risk run".
    """
    cov = returns.rolling(window).cov().dropna()
    summary = {}

    for date in cov.index.levels[0]:
        mat = cov.loc[date].values
        summary[date] = portfolio_stdev(weights, mat)

    return pd.Series(summary, name="Rolling_Portfolio_Vol")

def build_portfolio():
    """
    Main entry point.
    Returns:
        prices
        returns
        weights
        pnl
        dv01_series
        factor_exp
    """
    prices = load_prices()
    returns = load_returns("log")

    n_assets = returns.shape[1]
    weights = generate_random_weights(n_assets)

    pnl = compute_portfolio_pnl(returns, weights)

    dv01_series = compute_dv01(prices["UST10Y"])
    factor_exp = compute_factor_exposures(returns, weights)

    return prices, returns, weights, pnl, dv01_series, factor_exp

