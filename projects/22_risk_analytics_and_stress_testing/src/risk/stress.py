# src/risk/stress.py

import numpy as np
import pandas as pd

def return_shock(mu, shock_vector):
    return mu + shock_vector

def vol_shock(cov, scale):
    return cov * (scale ** 2)

def corr_breakdown(cov, floor_rho = 0.2):
    std = np.sqrt(np.diag(cov))
    corr = cov / np.outer(std, std)
    n = corr.shape[0]
    for i in range(n):
        for j in range(n):
            if i != j:
                corr[i,j] = np.sign(corr[i,j]) * max(abs(corr[i,j]), floor_rho)
        cov2 = np.outer(std, std) * corr
        return cov2