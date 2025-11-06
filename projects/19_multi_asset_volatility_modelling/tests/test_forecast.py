# --- tests/test_forecast.py ---

import numpy as np
import pandas as pd
from src.vollab.forecast import rolling_forecast
from src.vollab.garch import GARCHModel

def test_rolling_forecast_length():
    rng = np.random.default_rng(2)
    r = rng.normal(scale=0.01, size=600)
    idx = pd.date_range("2000-01-01", periods=600, freq="B")
    s = pd.Series(r, index=idx)
    forecasts = rolling_forecast(s, model_class=GARCHModel, window=400)
    assert len(forecasts) == 600

    assert forecasts.iloc[:399].isna().all()
