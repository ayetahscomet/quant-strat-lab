# --- tests/test_factors.py ---

import pandas as pd
import numpy as np
from factorlab.factors import Momentum

def test_momentum_correct():
    rng = np.random.default_rng(0)
    r = rng.normal(size = 50)
    df = pd.Series(r)
    mom = Momentum(window = 5).compute(df)
    expected = df.rolling(5).mean()
    assert abs(mom.iloc[20] - expected.iloc[20]) < 1e-12

