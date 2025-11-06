# --- src/factorlab/factors.py ---

import pandas as pd

class Momentum:
    def __init__(self, window=20):
        self.w = window

    def compute(self, series: pd.Series) -> pd.Series:
        return series.rolling(self.w).mean()


class Volatility:
    def __init__(self, window=20):
        self.w = window

    def compute(self, series: pd.Series) -> pd.Series:
        return series.rolling(self.w).std(ddof=1)


class MeanReversion:
    def __init__(self, window=20):
        self.w = window

    def compute(self, series: pd.Series) -> pd.Series:
        roll_mean = series.rolling(self.w).mean()
        roll_std = series.rolling(self.w).std(ddof=1)
        return -(series - roll_mean) / roll_std
