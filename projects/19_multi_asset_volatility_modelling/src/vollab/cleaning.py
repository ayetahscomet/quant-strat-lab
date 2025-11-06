# --- src/vollab/cleaning.py ---

import pandas as pd

def clean_returns(df: pd.DataFrame, fill_method = "ffill") -> pd.DataFrame:
    """
    Ensure monotonic datetime index float dtype, and fill missing returns.
    Returns a copy.
    """
    out = df.copy()
    out = df.sort_index()

    if not isinstance(out.index, pd.DatetimeIndex):
        out.index = pd.to_datetime(out.index)
    
    out["return"] = out["return"].astype(float)

    if fill_method == "ffill":
        out["return"] = out["return"].ffill().bfill()
    elif fill_method == "zero":
        out["returns"] = out["return"].fillna(0.0)
    else:
        out["returns"] = out["return"].fillna(method = fill_method).bfill()
    return out
