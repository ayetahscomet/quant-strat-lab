# src/experiments/run_pipeline.py

import os

LOCATION = "workspaces"
os.chdir(f"/{LOCATION}/quant-strat-lab/projects/22_risk_analytics_and_stress_testing/")
print(os.getcwd())


from src.data.generator import generate_synthetic_universe
from src.pnl.aggregator import compute_nav
from src.risk.var_es import parametric_var_es, historical_var_es, montecarlo_var_es
from src.analysis.attribution import worst_day_attribution
from src.analysis.diagnostics import plot_nav, plot_return_distribution
import pandas as pd
import numpy as np

OUT = "outputs"
os.makedirs(OUT, exist_ok=True)

def simple_equal_weights(returns_df):
    n = returns_df.shape[1]
    w = pd.DataFrame(index=returns_df.index, columns=returns_df.columns, data=1.0/n)
    return w

def run():
    # 1. generate data
    returns_df, regimes = generate_synthetic_universe(n_assets=5, n_days=500, outdir="data/synthetic")
    # 2. pick weights
    weights_df = simple_equal_weights(returns_df)
    # 3. aggregate PnL
    nav_res = compute_nav(returns_df, weights_df, tc_rate=0.0002, initial_nav=1.0)
    nav = nav_res["nav"]
    # 4. compute portfolio daily returns series
    port_rets = nav.pct_change().fillna(0.0)
    # 5. parametric VaR
    mu = returns_df.mean().values
    cov = returns_df.cov().values
    # use last-day weights as representative
    w = weights_df.iloc[-1].values
    pvar, pes = parametric_var_es(w, mu, cov, alpha=0.99)
    hov, hes = historical_var_es((returns_df * w).sum(axis=1).values, alpha=0.99)
    mvar, mes, dist = montecarlo_var_es(w, mu, cov, M=20000, alpha=0.99)
    print("Param VaR99, ES99:", pvar, pes)
    print("Hist VaR99, ES99:", hov, hes)
    print("MC VaR99, ES99:", mvar, mes)
    # 6. worst-day attribution
    worst_date, contrib_df = worst_day_attribution(returns_df, weights_df)
    print("Worst date:", worst_date)
    print(contrib_df)
    # 7. plots
    plot_nav(nav, outpath=os.path.join(OUT, "nav.png"))
    plot_return_distribution((returns_df * w).sum(axis=1).values,
                             var_lines={"ParamVaR99": -pvar, "MCVaR99": -mvar},
                             outpath=os.path.join(OUT, "dist.png"))
    # 8. save summary CSVs
    nav.to_csv(os.path.join(OUT, "nav.csv"))
    contrib_df.to_csv(os.path.join(OUT, "worst_day_contrib.csv"))

if __name__ == "__main__":
    run()
