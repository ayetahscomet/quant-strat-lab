# --- src/vollab/data.py

import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Dict

@dataclass
class DataConfig:
    n_assets: int = 3
    n_steps: int = 800
    seed: int = 42
    mu: float = 0.0
    sigma0: float = 0.02
    omega: float = 1e-6
    alpha: float = 0.05
    beta: float = 0.94
    spike_prob: float = 0.01
    missing_prob: float = 0.02

class DataGenerator:
    """Generate synthetic returns with a garch (1,1)-like true volatility process, 
    occassional spikes and random missing data.
    """
    def __init__(self, cfg: DataConfig):
        self.cfg = cfg
        self.rng = np.random.seed(cfg.seed)

    def generate_asset(self):
        cfg = self.cfg
        n = cfg.n_steps
        eps = self.rng.standard_normal(n)
        sigma2 = np.empty(n)
        sigma2[0] = cfg.sigma0 ** 2
        for t in range(1, n):
            sigma2[t] = cfg.omega + cfg.alpha * (sigma2[t-1] * eps[t-1] ** 2) + cfg.beta* sigma2[t-1]
            if self.rng.uniform() < cfg.spike_prob:
                sigma2[t] *= 5.0
        returns = np.sqrt(sigma2) * eps + cfg.mu
        dates = pd.date_range("2020-01-01", freq = "B", periods = n)
        df = pd.DataFrame({"return": returns, "sigma2_true": sigma2}, index = dates)

        mask = self.rng.uniform(size = n) < cfg.missing_prob
        df.loc[mask, "return"] = np.nan
        return df
    
    def generate(self) -> Dict[str, pd.DataFrame]:
        out = {}
        for i in range(self.cfg.n_assets):
            out[f"asset_{i+1}"] = self.generate_asset()
        return out

