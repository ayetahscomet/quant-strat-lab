# --- tests/test_cleaning.py ---

import pandas as pd
from src.vollab.cleaning import clean_returns
import numpy as np

def test_clean_fills_na():
    idx = pd.date_range("2000-01-01", periods=10, freq="B")
    r = [0.01, None, 0.02, None, None, 0.0, 0.01, None, 0.02, 0.03]
    df = pd.DataFrame({"return": r}, index=idx)
    out = clean_returns(df)
    assert not out["return"].isna().any()
    assert out["return"].dtype == float
