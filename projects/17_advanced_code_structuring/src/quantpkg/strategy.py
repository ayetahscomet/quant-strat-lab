# src/quantpkg/strategy.py
import pandas as pd
from typing import Union

class Strategy:
    """
    Simple z-score thresholding strategy.
    Long when z < -theta, short when z > theta, else flat.
    """
    def __init__(self, theta: float = 1.0):
        self.theta = float(theta)

    def generate_positions(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        conditions = [
            df["zscore"] < -self.theta,
            df["zscore"] > self.theta
        ]
        choices = [1, -1]
        df["position"] = pd.Series(0, index=df.index)
        df.loc[conditions[0], "position"] = 1
        df.loc[conditions[1], "position"] = -1
        # ensure correct dtype
        df["position"] = df["position"].astype(int)
        return df
