# --- src/vollab/forecast.py ---

import pandas as pd
from typing import Dict
from tqdm import tqdm

def rolling_forecast(asset_returns: pd.Series, model_class, window: int = 400):
    """
    Fit model on rolling in-sample window and produce 1-step-ahead variance forecasts.
    Returns a pd.Series of forecasts aligned to the forecasted date (i.e., forecast for t+1 stored at index t+1).
    """
    n = len(asset_returns)
    forecasts = pd.Series(index=asset_returns.index, dtype=float)
    
    for end in range(window, n):
        insample = asset_returns.iloc[end-window:end]
        m = model_class()
        res = m.fit(insample)
        f = m.forecast(horizon=1)
        
        forecasts.iloc[end] = f
    return forecasts
