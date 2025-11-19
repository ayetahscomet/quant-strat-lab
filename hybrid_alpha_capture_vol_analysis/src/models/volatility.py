# --- src/models/volatility.py ---

import numpy as np
import pandas as pd

try:
    from arch import arch_model
    _HAS_ARCH = True
except Exception as e:
    print("ARCH import error:", e)
    _HAS_ARCH = False

def realised_vol(returns: pd.Series, window: int = 20) -> pd.Series:
    """
    Rolling realised volatility (sample std) annualised approx via sqrt(n).
    returns: daily log returns (pd.Series)
    window: rolling window in days
    """
    rv = returns.rolling(window).std(ddof = 0)
    rv_annualised = rv * np.sqrt(252)
    return rv

def compute_vol_matrix(returns_df: pd.DataFrame, window: int = 20) -> pd.DataFrame:
    """
    For each column in returns_df compute rolling realised vol.
    returns_df: DataFrame indexed by data, columns = pairs
    returns vol_df (same shape)
    """
    vol = returns_df.rolling(window).std(ddof = 0)
    return vol

def garch_vol_series (returns: pd.Series, p = 1, q = 1):
    """Try to fit a simple GARCH(1,1) using arch library.
    Returns fitted conditional volatility series.
    If arch not installed or fails, returns None.
    """
    if not _HAS_ARCH:
        return None
    try:
        am = arch_model(returns.dropna() * 100, vol = "GARCH", p = p, q = q, mean = 'Zero', dist = 'normal')
        res = am.fit(disp = 'off')
        cond_vol = res.conditional_volatility / 100.0 # bringing back to daily scale
        cond_vol.index = returns.dropna().index
        return cond_vol.reindex(returns.index).ffill().bfill()
    except Exception as e:
        print("GARCH error:", e)
        return None

def regime_flags(vol_df: pd.DataFrame, calm_q = 0.50, stress_q = 0.75, crisis_q = 0.90):
    """
    Create regiime flag DataFrame:
        0 = calm (vol <= calm threshold)
        1 = stressed (calm_q < vol <= stress_q)
        2 = crisis (vol > crisis_q)
    vol_df: DataFrame of rolling vol
    Returns integer DataFrame of same shape
    """
    flags = pd.DataFrame(index=vol_df.index, columns=vol_df.columns, dtype=int)
    # Compute thresholds per instrument
    for col in vol_df.columns:
        series = vol_df[col].dropna()
        if series.empty:
            flags[col] = 0
            continue
        calm_thr = series.quantile(calm_q)
        stress_thr = series.quantile(stress_q)
        crisis_thr = series.quantile(crisis_q)
        def classify(x):
            if np.isnan(x):
                return 0
            if x <= calm_thr:
                return 0
            if x <= stress_thr:
                return 1
            if x > crisis_thr:
                return 2
            return 1
        flags[col] = vol_df[col].apply(classify)
    return flags
