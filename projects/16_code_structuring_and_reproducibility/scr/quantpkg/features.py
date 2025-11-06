from __future__ import annotations
import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Optional

@dataclass
class FeatureEngineer:
    """Compute rolling statistical features for a retursn time series.
    
    Features:
        roll_mean : rolling arithmetic mean of log-returns
        roll_std : rolling standard deviation of log-returns
        zscore : (r_t - roll_mean) / roll_std

    Parameters
    ----------
    window : int
        The rolling window length (number of observations).
     """
    
    window: int

    def add_rolling_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add rolling mean, rolling std, and z-score features.

        Parameters
        ----------
        df : pd.DateFrame
            Must contain a 'log_return' column.
        
        Returns
        -------
        pd.DataFrame
            Same dataframe with new columns: 'roll_mean', 'roll_std', 'zscore'.
        """
        if "log_return" not in df.columns:
            raise ValueError("DataFrame must contain 'log_return' column.")
        
        # --- Rolling Mean and Std ---

        df['roll_mean'] = df["log_return"].rolling(self.window, min_periods = self.window).mean()
        df['roll_std'] = df["log_return"].rolling(self.window, min_periods = self.window).std()

        # --- Z-Score ---

        df['zscore'] = (df['log_return'] - df['roll_mean']) / df['roll_std']

        return df
