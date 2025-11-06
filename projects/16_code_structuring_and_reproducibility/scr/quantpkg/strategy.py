from __future__ import annotations
import pandas as pd
from dataclasses import dataclass

@dataclass
class Strategy:
    """
    Simple threshold-based z-score strategy.

    Trading rule:
        position_t = 1 if z_t < -theta (long)
        position_t = -1 if z_t > theta (short)
        position_t = 0 otherwise

    Parameters
    ----------
    theta : float
        Threshold for entering position.
    """

    theta: float
    
    def generate_positions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add a 'position' column based on the z-score trading rule.
        
        Parameters
        ----------
        df : pd.DataFrame
            Must contain column 'zscore'.
        
        Returns
        -------
        pd.DataFrame
            DataFrame with added 'position' column.
        """
        if 'zscore' not in df.columns:
            raise ValueError("DataFrame must contain'zscore' column.")

        z = df['zscore']

        long_mask = z < -self.theta
        short_mask = z > self.theta

        df["position"] = 0
        df.loc[long_mask, "position"] = 1
        df.loc[short_mask, "position"] = -1

        return df
