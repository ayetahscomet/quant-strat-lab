# --- src/vollab/garch.py ---

import numpy as np
import pandas as pd
from .garch_base import GARCHBase

class GARCHModel(GARCHBase):
    """
    GARCH(1,1):
    sigma2_t = omega + alpha * r_{t-1}^2 + beta * sigma2_{t-1}
    """

    def _initial_params(self):
        
        return np.array([1e-6, 0.05, 0.9])

    def _bounds(self):
        return [(1e-12, 1.0), (0.0, 2.0), (0.0, 0.9999)]

    def _compute_sigmas(self, params, returns):
        omega, alpha, beta = params
        n = len(returns)
        sigma2 = np.empty(n)
        
        sigma2[0] = np.var(returns)
        for t in range(1, n):
            sigma2[t] = omega + alpha * returns[t-1]**2 + beta * sigma2[t-1]
        
        self._last_return = returns[-1]
        return sigma2

    def forecast(self, horizon=1):
        omega, alpha, beta = self.params
        last_sigma2 = float(self.fitted_sigma2.iloc[-1])
        last_ret = float(self._last_return)
        
        return omega + alpha * last_ret**2 + beta * last_sigma2
