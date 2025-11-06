# tests/test_features.py
import numpy as np
import pandas as pd
from quantpkg.features import FeatureEngineer

def test_rolling_mean_matches():
    rng = np.random.default_rng(0)
    r = rng.normal(size=30)
    dates = pd.date_range('2020-01-01', periods=30, freq='B')
    df = pd.DataFrame({'log_return': r}, index=dates)
    fe = FeatureEngineer(window=5)
    out = fe.add_rolling_features(df)
    expected = pd.Series(r).rolling(5).mean().values
    # compare one valid entry
    assert abs(out['roll_mean'].dropna().iloc[0] - expected[4]) < 1e-12
