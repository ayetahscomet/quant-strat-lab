# src/quantpkg/features.py
import pandas as pd
from typing import Any

class FeatureEngineer:
    """
    Adds rolling mean, rolling std, and z-score.
    """
    def __init__(self, window: int):
        self.window = int(window)

    def add_rolling_features(self, df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()
        out["roll_mean"] = out["log_return"].rolling(self.window).mean()
        out["roll_std"] = out["log_return"].rolling(self.window).std(ddof=1)
        out["zscore"] = (out["log_return"] - out["roll_mean"]) / out["roll_std"]
        # keep consistent names
        return out
