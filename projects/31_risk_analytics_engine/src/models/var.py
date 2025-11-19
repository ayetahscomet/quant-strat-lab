# src/models/var.py

import pandas as pd
import numpy as np
from scipy.stats import norm, t

def historical_var(returns: pd.Series, confidence: float = 0.99):
    """
    Compute Historical VaR.
    VaR = quantile of PnL distribution
    """
    return np.percentile(returns, (1 - confidence) * 100)

def parametric_var_norm(mean: float, sigma: float, confidence: float = 0.99):
    """
    Normal distribution parameteric VaR.
    """
    z = norm.ppf(1 - confidence)
    return mean + z * sigma

def parametric_var_t(mean: float, sigma: float, df: int = 5, confidence: float = 0.99):
    """
    t-distribution parameteric VaR.
    Heavy tails for market stress.
    """
    t_crit = t.ppf(1 - confidence, df)
    scale = sigma * np.sqrt(df / (df - 2))
    return mean + t_crit * scale

def monte_carlo_var(mean: float,
                    cov: np.ndarray,
                    n_sims: int = 10_000,
                    confidence: float = 0.99):
    """
    Simulate multivariate returns using covariance matrix.
    """
    n_assets = cov.shape[0]
    shocks = np.random.multivariate_normal(mean, cov, size=n_sims)

    pnl_dist = shocks.sum(axis=1)
    return np.percentile(pnl_dist, (1 - confidence) * 100), pnl_dist

def var_exceptions(pnl: pd.Series, var_series: pd.Series):
    """
    Count where actual PnL < VaR.
    """
    mask = pnl < var_series
    return mask.sum(), mask


def expected_exceptions(n: int, alpha: float):
    """Expected exceptions under normal model."""
    return n * (1 - alpha)


def var_backtest_summary(pnl: pd.Series, var_series: pd.Series, alpha=0.99):
    """
    Return a dictionary summary for reporting.
    """
    n_ex, mask = var_exceptions(pnl, var_series)
    expected = expected_exceptions(len(pnl), alpha)

    return {
        "observations": len(pnl),
        "exceptions": n_ex,
        "expected_exceptions": expected,
        "exception_ratio": n_ex / len(pnl),
        "clean_exceptions": mask
    }