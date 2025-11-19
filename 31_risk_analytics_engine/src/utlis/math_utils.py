# src/utils/math_utils.py

import numpy as np
import pandas as pd

def cov_to_corr(cov: np.ndarray):
    """Convert covariance matrix to correlation matrix."""
    std = np.sqrt(np.diag(cov))
    corr = cov / np.outer(std, std)
    return corr

def corr_to_cov(corr: np.ndarray, vol: np.ndarray):
    """Convert correlation + vol to covariance matrix."""
    return corr * np.outer(vol, vol)

def annualise_vol(daily_vol: float, trading_days: int = 252):
    return daily_vol * np.sqrt(trading_days)

def deannualise_vol(annual_vol: float, trading_days: int = 252):
    return annual_vol / np.sqrt(trading_days)

def realised_volatility(returns: pd.Series, window: int = 20):
    """Rolling realised volatility."""
    return returns.rolling(window).std() * np.sqrt(252)

def portfolio_variance(weights: np.ndarray, cov: np.ndarray):
    """Compute portfolio variance w' Σ w."""
    return float(weights.T @ cov @ weights)

def portfolio_stdev(weights: np.ndarray, cov: np.ndarray):
    return np.sqrt(portfolio_variance(weights, cov))

def scaled_covariance(cov: np.ndarray, scale_factor: float):
    """Scale cov matrix by factor (used in vol shocks)."""
    return cov * scale_factor

def is_positive_semidefinite(matrix: np.ndarray, tol=1e-8):
    """Check PSD for covariance matrix."""
    eigvals = np.linalg.eigvalsh(matrix)
    return np.all(eigvals > -tol)

def nearest_psd(matrix: np.ndarray):
    """
    Ensure matrix is PSD under numerical issues.
    High-quality implementation (minimum re-adjust).
    """
    eigvals, eigvecs = np.linalg.eigh(matrix)
    eigvals_clipped = np.clip(eigvals, 0, None)
    return eigvecs @ np.diag(eigvals_clipped) @ eigvecs.T

