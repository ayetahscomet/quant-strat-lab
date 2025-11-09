# --- src/experiments/run_example.py ---

import os
import pandas as pd
from src.data.generator import save_synthetic
from src.models.alpha_capture import load_ideas
from src.backtest.backtest import run_backtest
from src.utils.plotting import plot_nav_with_regimes, plot_scores

OUTPUT_DIR = "outputs"

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    returns, regimes, ideas = save_synthetic(outdir="data/synthetic", n_days=600)
    ideas_df = load_ideas("data/synthetic/analyst_ideas.csv")
    returns_df = pd.read_csv("data/synthetic/fx_returns.csv", index_col=0, parse_dates=True)

    res = run_backtest(returns_df, ideas_df, target_vol=0.10, vol_window=20, decay_lambda=0.6, tc_rate=0.0002, slippage=0.0, max_exposure=0.6)
    print("Performance metrics:")
    for k, v in res["metrics"].items():
        print(f"{k}: {v}")

    plot_nav_with_regimes(res["nav"], res["regimes"], outpath=os.path.join(OUTPUT_DIR, "nav.png"))
    plot_scores(res["scores"], outpath=os.path.join(OUTPUT_DIR, "scores.png"))
    print(f"Saved outputs to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
