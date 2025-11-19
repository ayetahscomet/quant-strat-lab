# src/experiments/run_full_pipeline.py

import numpy as np
import pandas as pd
from pathlib import Path

from src.backtest.portfolio_sim import build_portfolio

from src.models.var import historical_var, parametric_var_norm, parametric_var_t, monte_carlo_var
from src.models.es import historical_es
from src.models.pca import run_pca
from src.models.stress_tests import (
    stress_return_shock,
    stress_vol_shock,
    stress_corr_break,
    attribute_scenario_losses
)

from src.utlis.plotting import (
    plot_prices,
    plot_returns,
    plot_rolling_vol,
    plot_var_series,
    plot_stress_losses,
    plot_pca_loadings,
)

from src.utlis.logging_setup import init_logger
from src.utlis.math_utils import cov_to_corr


def run_pipeline():
    logger = init_logger("full_pipeline")

    logger.info("Building portfolio...")
    prices, returns, weights, pnl, dv01_series, factor_exp = build_portfolio()

    logger.info("Computing VaR and ES...")

    hist_var_99 = historical_var(pnl, 0.99)
    para_var_99 = parametric_var_norm(pnl.mean(), pnl.std(), 0.99)
    mc_var_99, _ = monte_carlo_var(returns.mean(), returns.cov(), 10000, 0.99)

    hist_es_99 = historical_es(pnl, 0.99)

    logger.info(f"Historical VaR 99%: {hist_var_99:.5f}")
    logger.info(f"Parametric VaR 99%: {para_var_99:.5f}")
    logger.info(f"Monte Carlo VaR 99%: {mc_var_99:.5f}")
    logger.info(f"Historical ES 99%: {hist_es_99:.5f}")

    eigvals, eigvecs, explained = run_pca(returns)

    logger.info("Applying stress scenarios...")

    stressed_ret = stress_return_shock(returns, shock_size=-0.05)
    stressed_vol = stress_vol_shock(returns, multiplier=2.0)
    corr_matrix = cov_to_corr(returns.cov())
    stressed_corr = stress_corr_break(corr_matrix, break_factor=0.4)

    ret_shock_loss = attribute_scenario_losses(weights, stressed_ret)

    report_dir = Path(
        "/Users/deborahakintoye/GitHub/quant-strat-lab/projects/31_risk_analytics_engine/reports"
    )
    fig_dir = report_dir / "figures"
    fig_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Saving plots...")

    plot_prices(prices, save=fig_dir / "prices.png")
    plot_returns(returns, save=fig_dir / "returns.png")
    plot_rolling_vol(returns, save=fig_dir / "rolling_vol.png")
    plot_var_series(pnl, pnl.rolling(100).quantile(0.01), save=fig_dir / "var_series.png")
    plot_pca_loadings(eigvecs, save=fig_dir / "pca_loadings.png")
    plot_stress_losses(ret_shock_loss, labels=returns.columns, save=fig_dir / "stress_losses.png")

    logger.info("Pipeline completed successfully.")

    summary = {
        "historical_var_99": hist_var_99,
        "parametric_var_99": para_var_99,
        "mc_var_99": mc_var_99,
        "historical_es_99": hist_es_99,
        "factor_exposures": factor_exp.tolist(),
        "dv01_mean": dv01_series.mean(),
        "pca_explained": explained.tolist()
    }

    return summary

if __name__ == "__main__":
    result = run_pipeline()
    print("\nPipeline Summary:")
    for k, v in result.items():
        print(f"{k}: {v}")
