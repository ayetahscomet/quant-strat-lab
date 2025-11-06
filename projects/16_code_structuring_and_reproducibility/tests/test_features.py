# tests/test_features.py

import numpy as np
import pandas as pd
from quantpkg.features import FeatureEngineer

def test_rolling_feature_correctness():
    # Simple returns array
    data = [1, 2, 3, 4, 5]
    df = pd.DataFrame({"log_return": data})

    fe = FeatureEngineer(window=3)
    df2 = fe.add_rolling_features(df.copy())

    # Expected rolling mean & std for the window 3 at index=4
    expected_mean = np.mean([3,4,5])
    expected_std = np.std([3,4,5], ddof=1)

    assert abs(df2.loc[4, "roll_mean"] - expected_mean) < 1e-12
    assert abs(df2.loc[4, "roll_std"] - expected_std) < 1e-12
