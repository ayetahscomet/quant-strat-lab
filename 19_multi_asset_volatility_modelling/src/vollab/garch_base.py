# --- src/vollab/garch_base.py ---

import numpy as np
import pandas as pd
from typing import Dict
from scipy.optimize import minimize

class GARCHBase:
    """
    Abstract GARCH base. Subclasses must implement:
    - _compute_sigmas(params, returns) -> array of sigma2
    - _initial_params() -> starting parameter array
    - _bounds() -> bounds for optimiser
    """

    def fit(self, returns: pd.Series, method="L-BFGS-B", options=None):
        r = returns.values
        x0 = self._initial_params()
        bounds = self._bounds()
        if options is None:
            options = {"maxiter": 200}
        

        def nll(params):
            sigma2 = self._compute_sigmas(params, r)
            
            sigma2 = np.maximum(sigma2, 1e-12)
            ll = -0.5 * (np.log(2 * np.pi) + np.log(sigma2) + (r ** 2) / sigma2)
            return -np.sum(ll)

        res = minimize(nll, x0, method=method, bounds=bounds, options=options)
        if not res.success:
            
            pass
        self.params = res.x
        self.nll = res.fun
        
        self.fitted_sigma2 = pd.Series(self._compute_sigmas(self.params, r), index=returns.index)
        
        self.nobs = len(r)
        self.loglik = -res.fun
        return res

    def forecast(self, horizon: int = 1) -> float:
        """
        Produce 1-step ahead forecast of sigma^2 using last observed returns.
        For horizon>1 subclasses may override.
        """
        # default: use fitted params and last known sigma2
        last_sigma2 = float(self.fitted_sigma2.iloc[-1])
        last_ret = float(self._last_return) if hasattr(self, "_last_return") else 0.0
        # need subclass to implement explicit forecast; fallback: return last_sigma2
        return last_sigma2

    # placeholder methods: override in subclasses
    def _compute_sigmas(self, params, returns):
        raise NotImplementedError

    def _initial_params(self):
        raise NotImplementedError

    def _bounds(self):
        raise NotImplementedError
