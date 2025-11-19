# --- src/factorlab/standardise.py ---

import pandas as pd

def zscore_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cross-sectional z-score (per row across assets).
    """
    return (df - df.mean(axis=1).values.reshape(-1,1)) / df.std(axis=1, ddof=1).values.reshape(-1,1)
