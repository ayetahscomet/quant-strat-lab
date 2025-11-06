import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Dict

@dataclass
class DataConfig:
    n_assets: int = 5
    n_steps: int = 500
    dt: float = 1/252
    mu: float = 0.0002
    alpha: float = 0.01
    beta: float = 0.95
    xi: float = 0.005
    sigma0: float = 0.02
    missing_prob: float = 0.03
    seed: int = 42

class DataGenerator:
    """
    Generates synthetic factor-style multi-asset data with
    stochastic volatility and occasional missing points.
    """

    def __init__(self, cfg: DataConfig):
        self.cfg = cfg
        self.rng = np.random.default_rng(cfg.seed)

    def generate(self) -> Dict[str, pd.DataFrame]:
        cfg = self.cfg
        dates = pd.date_range("2020-01-01", periods=cfg.n_steps, freq="B")

        assets = {}
        for i in range(cfg.n_assets):
            eps = self.rng.standard_normal(cfg.n_steps)
            eta = self.rng.normal(scale=cfg.xi, size=cfg.n_steps)

            sigma = np.empty(cfg.n_steps)
            sigma[0] = cfg.sigma0
            for t in range(1, cfg.n_steps):
                sigma[t] = cfg.alpha + cfg.beta * sigma[t - 1] + eta[t]
            sigma = np.abs(sigma)

            log_returns = cfg.mu * cfg.dt + sigma * np.sqrt(cfg.dt) * eps
            prices = 100 * np.exp(np.cumsum(log_returns))

            df = pd.DataFrame(
                {"log_return": log_returns, "price": prices, "sigma": sigma},
                index=dates
            )

            # Introduce missing data
            mask = self.rng.uniform(size=cfg.n_steps) < cfg.missing_prob
            df.loc[mask, "log_return"] = np.nan

            assets[f"asset_{i+1}"] = df

        return assets
