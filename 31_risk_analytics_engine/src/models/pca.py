# src/models/pca.py

import numpy as np
import pandas as pd


def run_pca(returns: pd.DataFrame):
    """
    Compute PCA on asset returns.

    Returns:
        eigenvalues
        eigenvectors
        explained_variance_ratio
    """
    cov = returns.cov()
    eigvals, eigvecs = np.linalg.eigh(cov)

    idx = eigvals.argsort()[::-1]
    eigvals = eigvals[idx]
    eigvecs = eigvecs[:, idx]

    explained = eigvals / eigvals.sum()

    return eigvals, eigvecs, explained


def apply_pca_shock(cov_matrix: np.ndarray,
                    eigenvectors: np.ndarray,
                    factor_id: int,
                    shock_scale: float):
    """
    Apply PCA factor shock (e.g. curve steepener or flattening).
    """
    v = eigenvectors[:, factor_id]
    shock_matrix = shock_scale * np.outer(v, v)
    return cov_matrix + shock_matrix
