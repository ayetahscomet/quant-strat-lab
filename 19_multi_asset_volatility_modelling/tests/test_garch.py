# --- tests/test_garch.py ---

import numpy as np
import pandas as pd
from src.vollab.garch import GARCHModel

def test_garch_fit_and_positive_sigma():
    rng = np.random.default_rng(1)
    r = rng.normal(scale=0.01, size=600)
    idx = pd.date_range("2000-01-01", periods=600, freq="B")
    s = pd.Series(r, index=idx)
    m = GARCHModel()
    res = m.fit(s)
    assert hasattr(m, "params")
    assert (m.fitted_sigma2 > 0).all()
