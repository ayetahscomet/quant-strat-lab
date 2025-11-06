# --- src/vollab/evaluation.py ---

import numpy as np
import pandas as pd
from typing import Dict

def rmse(forecast: pd.Series, realised: pd.Series) -> float:
    idx = forecast.dropna().index.intersection(realised.index)
    err = forecast.loc[idx] - realised.loc[idx]
    return float(np.sqrt(np.mean(err**2)))

def mae(forecast: pd.Series, realised: pd.Series) -> float:
    idx = forecast.dropna().index.intersection(realised.index)
    err = np.abs(forecast.loc[idx] - realised.loc[idx])
    return float(np.mean(err))

def aic(loglik: float, k: int, n: int) -> float:
    return 2 * k - 2 * loglik

def bic(loglik: float, k: int, n: int) -> float:
    return np.log(n) * k - 2 * loglik

def evaluate_forecasts(forecasts: Dict[str, pd.Series], realised: pd.Series, models_info: Dict[str, dict]):
    """
    forecasts: dict model_name -> forecast series
    realised: series of realised variance (r_t^2)
    models_info: dict model_name -> {"loglik":..., "k":..., "n":...}
    """
    rows = []
    for name, f in forecasts.items():
        r = rmse(f, realised)
        m = mae(f, realised)
        info = models_info.get(name, {})
        loglik = info.get("loglik", 0.0)
        k = info.get("k", 1)
        n = info.get("n", len(realised.dropna()))
        rows.append({
            "model": name,
            "rmse": r,
            "mae": m,
            "aic": aic(loglik, k, n),
            "bic": bic(loglik, k, n)
        })
    return pd.DataFrame(rows).set_index("model")
