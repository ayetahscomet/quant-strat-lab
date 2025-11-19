from __future__ import annotations
import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Optional

@dataclass
class DataGenerator:
    """
    Generate synthetic log-returns, volatility process, and prices using a discrete-time GBM-style model with AR(1) volatility.

    Model:
        sigma_t = alpha + beta * sigma_{t-1} + eta_t,   eta_t ~ N(0, xi^2)
        r_t = mu * dt + sigma_t * sqrt(dt) * eps_t, eps_t ~ N(0, 1)
        price_t = price_{t-1} * exp(r_t)

    Parameters
    ----------
    mu : float
        Drift component.
    alpha : float
        AR(1) intercept for volatility.
    beta : float
        AR(1) persistence parameter.
    xi : float
        Standard deviation of volatility shocks.
    sigma0 : float
        Initial volatility value.
    dt : float
        Time step size.
    n_steps : int
        Number of time steps.
    seed : Optional[int]
        RNG seed for reproducibility.
    """

    mu: float
    alpha: float
    beta: float
    xi: float
    sigma0: float
    dt: float
    n_steps: int
    seed: Optional[int] = None

    def generate(self) -> pd.DataFrame:
        """Simulate the AR(1) volatility, log-returns, and price series.
        
        Returns
        -------
        pd.DataFrame
            Columns:    ['log_returns', 'price', 'sigma']
            Index:  DatetimeIndex (daily frequency by default)  
        """
        if self.seed is not None:
            np.random.seed(self.seed)

        # --- Pre-allocate arrays ---

        sig = np.zeros(self.n_steps)
        rets = np.zeros(self.n_steps)
        sig[0] = self.sigma0

        # --- Random Shocks ---

        eps = np.random.randn(self.n_steps)
        eta = np.random.randn(self.n_steps) * self.xi

        # --- Simulate sigma_t ---

        for t in range(1, self.n_steps):
            sig[t] = self.alpha + self.beta * sig[t-1] + eta[t]

        # --- Simulate Returns ---

        sqrt_dt = np.sqrt(self.dt)
        rets = self.mu * self.dt + sig * sqrt_dt * eps

        # --- Construct Price Path ---

        price = np.exp(np.cumsum(rets))

        # --- Build DataFrame ---

        idx = pd.date_range(start = "2000-01-01", periods = self.n_steps, freq = "D")
        df = pd.DataFrame({
            "log_returns": rets,
            "price": price,
            "sigma": sig,
        }, index = idx)

        return df