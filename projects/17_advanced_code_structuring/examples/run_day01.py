# examples/run_day01.py
from quantpkg.config import Config
from quantpkg.data import DataGenerator
from quantpkg.features import FeatureEngineer
from quantpkg.strategy import Strategy
from quantpkg.backtest import Backtester
import matplotlib.pyplot as plt
import pandas as pd
from pathlib import Path

def run_example():
    cfg = Config(n_steps=500, seed=123) if hasattr(Config, 'n_steps') else Config()
    # instantiate generator with config values
    gen = DataGenerator(mu=cfg.mu, alpha=cfg.alpha, beta=cfg.beta, xi=cfg.xi,
                        sigma0=cfg.sigma0, dt=cfg.dt, n_steps=getattr(cfg, 'n_steps', 500),
                        seed=cfg.seed)
    df = gen.generate()
    fe = FeatureEngineer(window=getattr(cfg, 'window', 20))
    df = fe.add_rolling_features(df)
    strat = Strategy(theta=getattr(cfg, 'theta', 1.0))
    df = strat.generate_positions(df)
    bt = Backtester(initial_capital=getattr(cfg, 'initial_capital', 1e5), freq_per_year=getattr(cfg, 'freq_per_year', 252))
    res = bt.run(df)

    outdir = Path.cwd() / "output"
    outdir.mkdir(exist_ok=True)
    png = outdir / "day01_plot.png"

    # plot: price, zscore + thresholds, cumulative pnl
    fig, axes = plt.subplots(3, 1, figsize=(10, 8), sharex=True)
    axes[0].plot(df.index, df['price'], label='price'); axes[0].set_title('Price'); axes[0].legend()
    axes[1].plot(df.index, df['zscore'], label='zscore'); axes[1].axhline(cfg.theta, color='r', linestyle='--'); axes[1].axhline(-cfg.theta, color='g', linestyle='--'); axes[1].set_title('Z-score'); axes[1].legend()
    axes[2].plot(res['df'].index, res['df']['wealth'], label='portfolio NAV'); axes[2].set_title('Portfolio NAV'); axes[2].legend()
    plt.tight_layout()
    plt.savefig(png)
    plt.close(fig)

    print("Stats:", res["stats"])
    print("Plot produced at:", png)

if __name__ == "__main__":
    run_example()
