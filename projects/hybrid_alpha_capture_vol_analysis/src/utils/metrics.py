# --- src/utils/metrics.py ---

import numpy as np
import pandas as pd

def sharpe_ratio(returns: pd.Series, annualize: bool = True, rf: float = 0.0):
    mean = returns.mean() - rf/252.0
    std = returns.std(ddof=0)
    if std == 0:
        return np.nan
    sr = mean / std
    return sr * np.sqrt(252) if annualize else sr

def sortino_ratio(returns: pd.Series, required_return: float = 0.0):
    downside = returns[returns < required_return]
    if len(downside) == 0:
        return np.nan
    dr = np.sqrt((downside**2).mean())
    mean = returns.mean() - required_return
    return mean / dr * np.sqrt(252)

def max_drawdown(nav: pd.Series):
    roll_max = nav.cummax()
    dd = (nav - roll_max) / roll_max
    return dd.min()

def historical_var(returns: pd.Series, level: float = 0.99):
    if returns.empty:
        return np.nan
    return -returns.quantile(1-level)

def expected_shortfall(returns: pd.Series, level: float = 0.99):
    if returns.empty:
        return np.nan
    var = returns.quantile(1-level)
    tail = returns[returns <= var]
    return -tail.mean() if len(tail)>0 else -var

def compute_performance_metrics(returns: pd.Series):
    metrics = {}
    metrics["sharpe"] = sharpe_ratio(returns)
    metrics["sortino"] = sortino_ratio(returns)
    metrics["max_drawdown"] = max_drawdown((1+returns).cumprod())
    metrics["var_99"] = historical_var(returns, 0.99)
    metrics["es_99"] = expected_shortfall(returns, 0.99)
    metrics["annual_return"] = (1+returns).prod() ** (252.0/len(returns)) - 1 if len(returns)>0 else np.nan
    return metrics