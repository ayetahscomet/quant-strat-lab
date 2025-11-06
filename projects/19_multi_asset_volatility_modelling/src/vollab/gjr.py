# --- src/vollab/gjr.py ---

import numpy as np
import pandas as pd
from .garch_base import GARCHBase

class GJRModel(GARCHBase):
    """
    GJR-GARCH(1,1):
    sigma2_t = omega + alpha * r_{t-1}^2 + gamma * r_{t-1}^2 * I_{r_{t-1} < 0} + beta * sigma2_{t-1}
    """

    def _initial_params(self):
        return np.array([1e-6, 0.05, 0.05, 0.9])

    def _bounds(self):
        return [(1e-12, 1.0), (0.0, 2.0), (0.0, 2.0), (0.0, 0.9999)]

    def _compute_sigmas(self, params, returns):
        omega, alpha, gamma, beta = params
        n = len(returns)
        sigma2 = np.empty(n)
        sigma2[0] = np.var(returns)
        for t in range(1, n):
            ind = 1.0 if returns[t-1] < 0 else 0.0
            sigma2[t] = omega + alpha * returns[t-1]**2 + gamma * returns[t-1]**2 * ind + beta * sigma2[t-1]
        self._last_return = returns[-1]
        return sigma2

    def forecast(self, horizon=1):
        omega, alpha, gamma, beta = self.params
        last_sigma2 = float(self.fitted_sigma2.iloc[-1])
        last_ret = float(self._last_return)
        ind = 1.0 if last_ret < 0 else 0.0
        return omega + alpha * last_ret**2 + gamma * last_ret**2 * ind + beta * last_sigma2
