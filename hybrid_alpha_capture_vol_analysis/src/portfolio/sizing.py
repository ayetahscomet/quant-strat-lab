# --- src/portfolio/sizing.py ---

import numpy as np
import pandas as pd

def normalise_scoes_to_weights(score_row: pd.Series, clip: float = None) -> pd.Series:
    """
    Convert raw scores (signed) to weights summing to zero (long/short dollar-neutral).
    - If all scores are zero, returns zero.
    - clip: maximum absolute weight per asset (optional)
    """
    s = score_row.copy().fillna(0.0)
    if np.allclose(s.values, 0.0):
        return pd.Series(0.0, index = s.index)
    denom = np.sum(np.abs(s))
    if denom == 0:
        w = s * 0.0
    else:
        w = s / denom
    if clip is not None:
        w = w.clip(-clip, clip)
        total = np.sum(np.abs(w))
        if total > 0:
            w = w / total
    return w

def vol_target_leverage(current_vol: float, target_vol: float = 0.10, vol_floor = 1e-6):
    """
    Compute leverage factor to achieve target annualised volatility.
    Assumes current_vol is daily realised std (not annualised).
    If target_vol is annualised, convert accordingly.
    For simplicity we assume daily vol: target_vol_daily = target_vol / sqrt(252).
    Returns calar leverage (<= maybe capped by caller).
    """
    if current_vol <= 0:
        return 0.0
    target_daily = target_vol / np.sqrt(252.0)
    lev = target_daily / max(current_vol, vol_floor)
    return float(lev)

def apply_leverage_caps(weights: pd.Series, leverage: float = 1.0, max_exposure: float = 1.0):
    """
    Apply leverage to a normalised weight vector and cap per-asset exposure.
    weights expected to be signed and sum(abs) = 1
    """
    w = weights * leverage
    if max_exposure is not None:
        w = w.clip(-max_exposure, max_exposure)
        gross = w.abs().sum()
        if gross > leverage:
            w = w * (leverage / gross)
    return w
        
