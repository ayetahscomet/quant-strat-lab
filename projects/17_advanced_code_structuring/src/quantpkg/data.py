# src/quantpkg/data.py
from dataclasses import dataclass
import numpy as np
import pandas as pd
from typing import Tuple

class DataGenerator:
    """
    Generates log returns, evolving sigma_t (AR(1) stye), and price series.
    """

    def __init__(self, mu: float, alpha: float, beta: float, xi: float, sigma0: float,
                 dt: float, n_steps:int, seed: int = None):
        self.mu = mu
        self.alpha = alpha
        self.beta = beta
        self.xi = xi
        self.sigma0 = sigma0
        self.dt = dt
        self.n_steps = int(n_steps)
        self.rng = np.random.default_rng(seed)

    def generate(self, start_date = "2020-01-01", freq = "B") -> pd.DataFrame:
        eps = self.rng.standard_normal(self.n_steps)
        eta = self.rng.normal(scale = self.xi, size = self.n_steps)

        sigma = np.empty(self.n_steps)
        sigma[0] = self.sigma0
        for t in range(1, self.n_steps):
            sigma[t] = self.alpha + self.beta * sigma[t-1] +eta[t]
        
        sigma = np.abs(sigma)

        log_returns = self.mu * self.dt + sigma * np.sqrt(self.dt) * eps
        prices = 100.0 * np.exp(np.cumsum(log_returns))

        dates = pd.date_range(start = start_date, periods = self.n_steps, freq = freq)
        df = pd.DataFrame({'log_return': log_returns, 'price': prices, 'sigma': sigma}, index = dates)
