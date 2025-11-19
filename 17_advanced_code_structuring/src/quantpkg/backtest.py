# src/quantpkg/backtest.py
import pandas as pd
import numpy as np
from typing import Dict, Any

class Backtester:
    def __init__(self, initial_capital: float = 1e5, freq_per_year: int = 252):
        self.initial_capital = initial_capital
        self.freq_per_year = int(freq_per_year)

    def run(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        df must contain: 'log_return' and 'position' columns.
        Uses position.shift(1) for execution (no look-ahead).
        """
        out = df.copy()
        out["strategy_ret"] = out["position"].shift(1).fillna(0) * out["log_return"]
        out["wealth"] = (1 + out["strategy_ret"]).cumprod() * self.initial_capital
        mean = out["strategy_ret"].mean()
        vol = out["strategy_ret"].std(ddof=1)
        sharpe = (mean / vol) * np.sqrt(self.freq_per_year) if vol > 0 else np.nan
        stats = {"mean_return": float(mean), "volatility": float(vol), "sharpe": float(sharpe)}
        return {"df": out, "stats": stats}
