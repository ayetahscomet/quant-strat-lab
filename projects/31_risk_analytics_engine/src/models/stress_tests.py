# src/models/stress_tests.py

import numpy as np
import pandas as pd
from typing import Union

def _ensure_numpy(x: Union[pd.DataFrame, np.ndarray]):
    """Convert input to NumPy array and return (np_array, is_dataframe, index/columns)."""
    if isinstance(x, pd.DataFrame):
        return x.values.astype(float), True, x.index, x.columns
    elif isinstance(x, np.ndarray):
        return x.astype(float), False, None, None
    else:
        raise TypeError(f"Input must be a pandas DataFrame or numpy array, got {type(x)}")


def _return_original_type(array: np.ndarray, is_df: bool,
                          index=None, columns=None):
    """Return output either as numpy ndarray or DataFrame depending on original input."""
    if is_df:
        return pd.DataFrame(array, index=index, columns=columns)
    return array

def stress_return_shock(returns: pd.DataFrame, shock_size: float):
    """
    Apply an additive shock to the *last row* of returns.

    Parameters
    ----------
    returns : DataFrame
        Asset returns (T x N)
    shock_size : float
        Shock size applied to all assets (e.g. -0.05 for a -5% shock)

    Returns
    -------
    DataFrame
        Shocked returns DataFrame
    """
    if not isinstance(returns, pd.DataFrame):
        raise TypeError("stress_return_shock expects a pandas DataFrame")

    shocked = returns.copy()
    shocked.iloc[-1] += shock_size
    return shocked

def stress_vol_shock(returns: pd.DataFrame, multiplier: float):
    """
    Scale returns by a volatility multiplier.

    Note:
        This is a simple multiplicative shock. It does not estimate GARCH vol.
        It is commonly used for fast risk scenario approximations.

    Parameters
    ----------
    returns : DataFrame
    multiplier : float

    Returns
    -------
    DataFrame
    """
    if not isinstance(returns, pd.DataFrame):
        raise TypeError("stress_vol_shock expects a pandas DataFrame")

    shocked = returns * multiplier
    return shocked

def stress_corr_break(corr_matrix: Union[pd.DataFrame, np.ndarray],
                      break_factor: float = 0.5):
    """
    Apply correlation breakdown: off-diagonal correlations are reduced.

    Parameters
    ----------
    corr_matrix : DataFrame or ndarray
        Correlation matrix (N x N)
    break_factor : float
        Factor to scale off-diagonal correlations by (e.g. 0.5 means a 50% reduction)

    Returns
    -------
    Same type as input (DataFrame or ndarray)
    """
    A, is_df, idx, cols = _ensure_numpy(corr_matrix)

    if A.shape[0] != A.shape[1]:
        raise ValueError("Correlation matrix must be square")

    shocked = A.copy()

    off_diag_mask = ~np.eye(A.shape[0], dtype=bool)
    shocked[off_diag_mask] *= break_factor

    return _return_original_type(shocked, is_df, idx, cols)

def shock_pca_factor(returns: pd.DataFrame,
                     eigenvectors: np.ndarray,
                     factor_id: int,
                     shock_scale: float = 3.0):
    """
    Shock returns along a PCA factor direction.

    Parameters
    ----------
    returns : DataFrame
        Returns matrix (T x N)
    eigenvectors : ndarray
        PCA eigenvector matrix (N x N)
    factor_id : int
        Index of PCA factor to shock (0 = first PC)
    shock_scale : float
        Multiplier applied to PCA direction

    Returns
    -------
    DataFrame
        Returns with last row shocked along PCA direction
    """
    if not isinstance(returns, pd.DataFrame):
        raise TypeError("shock_pca_factor expects returns as a DataFrame")

    if not isinstance(eigenvectors, np.ndarray):
        raise TypeError("eigenvectors must be a NumPy array")

    N = returns.shape[1]

    if eigenvectors.shape != (N, N):
        raise ValueError("Eigenvector matrix must be N x N where N = number of assets")

    v = eigenvectors[:, factor_id]
    shock_vec = shock_scale * v

    shocked = returns.copy()
    shocked.iloc[-1] += shock_vec
    return shocked

def attribute_scenario_losses(weights: Union[pd.Series, np.ndarray],
                              stressed_returns: pd.DataFrame):
    """
    Attribute PnL under stress to each asset.

    Parameters
    ----------
    weights : array or Series
        Portfolio weights (length N)
    stressed_returns : DataFrame
        Stressed returns matrix (T x N)

    Returns
    -------
    Series
        PnL contribution by asset
    """
    if isinstance(weights, pd.Series):
        w = weights.values
        idx = weights.index
    else:
        w = np.asarray(weights)
        idx = stressed_returns.columns

    last_ret = stressed_returns.iloc[-1].values
    pnl = w * last_ret

    return pd.Series(pnl, index=idx, name="Scenario PnL Attribution")
