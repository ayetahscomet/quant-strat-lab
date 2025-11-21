# --- src/backtest/backtest.py ---
import pandas as pd
import numpy as np
from src.models.alpha_capture import load_ideas, aggregate_daily_scores
from src.models.volatility import compute_vol_matrix, regime_flags
from src.portfolio.sizing import normalize_scores_to_weights, vol_target_leverage, apply_leverage_and_caps
from src.portfolio.engine import compute_portfolio_pnl
from src.utils.metrics import compute_performance_metrics

def run_backtest(returns_df: pd.DataFrame, ideas_df: pd.DataFrame,
                 target_vol: float = 0.10,
                 vol_window: int = 20,
                 decay_lambda: float = 0.5,
                 tc_rate: float = 0.0002,
                 slippage: float = 0.0,
                 max_exposure: float = 0.5,
                 debug: bool = False):
    """
    High-level backtest runner.
    - returns_df: DataFrame of daily returns (index dates)
    - ideas_df: DataFrame of analyst ideas (index idea_id) with 'date','pair','sentiment','confidence','horizon'
    """
    start = returns_df.index.min()
    end = returns_df.index.max()
    scores = aggregate_daily_scores(ideas_df, start, end, decay_lambda=decay_lambda)
    scores = scores.reindex(returns_df.index).fillna(0.0)

    vol = compute_vol_matrix(returns_df, window=vol_window)
    flags = regime_flags(vol)

    weight_rows = []
    for date in returns_df.index:
        raw_scores = scores.loc[date]

        avg_regime = flags.loc[date].mean() if date in flags.index else 0
        if avg_regime >= 2:
            regime_multiplier = 0.3
        elif avg_regime >= 1:
            regime_multiplier = 0.6
        else:
            regime_multiplier = 1.0
        adjusted = raw_scores * regime_multiplier

        w = normalize_scores_to_weights(adjusted, clip=None)

        current_vol = vol.loc[date].mean() if date in vol.index else vol.values.flatten().mean()
        lev = vol_target_leverage(current_vol, target_vol=target_vol)
        w_levered = apply_leverage_and_caps(w, leverage=lev, max_exposure=max_exposure)
        weight_rows.append(w_levered)
    weights_df = pd.DataFrame(weight_rows, index=returns_df.index).fillna(0.0)

    results = compute_portfolio_pnl(returns_df, weights_df, tc_per_unit=tc_rate, slippage=slippage, initial_cash=1.0)
    metrics = compute_performance_metrics(results["nav"].pct_change().fillna(0.0))
    return {
        "scores": scores,
        "vol": vol,
        "regimes": flags,
        "weights": weights_df,
        "nav": results["nav"],
        "pnl": results["pnl"],
        "metrics": metrics
    }
