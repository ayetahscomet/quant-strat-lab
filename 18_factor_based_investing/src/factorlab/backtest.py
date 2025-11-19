# --- src/factorlab/backtest.py ---

import pandas as pd
import numpy as np

class Backtester:
    def __init__(self, freq_per_year = 252, initial_capital = 1e5):
        self.freq = freq_per_year
        self.capital = initial_capital
    
    def run(self, returns_df, weights_df):
        w_lag = weights_df.shift(1).fillna(0)
        port_ret = (w_lag * returns_df).sum(axis = 1)

        nav = (1 + port_ret).cumprod() * self.capital
        mean = port_ret.mean()
        vol = port_ret.std(ddof = 1)
        sharpe = (mean / vol) * np.sqrt(self.freq) if vol > 0 else np.nan

        return {"returns": port_ret, "nav": nav, "stats": {
            "mean_return": float(mean),
            "volatility": float(vol),
            "sharpe": float(sharpe)
        }
    }

