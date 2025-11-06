# examples/run_day01.py

import matplotlib.pyplot as plt
from quantpkg.data import DataGenerator
from quantpkg.features import FeatureEngineer
from quantpkg.strategy import Strategy
from quantpkg.backtest import Backtester

def main():
    # --- 1. Generate synthetic series ---
    gen = DataGenerator(
        mu=0.02,
        alpha=0.1,
        beta=0.85,
        xi=0.1,
        sigma0=0.2,
        dt=1/252,
        n_steps=800,
        seed=42,
    )
    df = gen.generate()

    # --- 2. Features ---
    fe = FeatureEngineer(window=30)
    df = fe.add_rolling_features(df)

    # --- 3. Strategy ---
    strat = Strategy(theta=1.0)
    df = strat.generate_positions(df)

    # --- 4. Backtest ---
    bt = Backtester(initial_capital=100_000)
    results = bt.run(df)

    nav = results["nav_series"]

    print("Mean return:", results["mean_return"])
    print("Vol:", results["vol"])
    print("Sharpe:", results["sharpe"])

    # --- 5. Plot ---
    fig, axs = plt.subplots(4, 1, figsize=(10, 12), sharex=True)

    axs[0].plot(df["price"])
    axs[0].set_title("Price")

    axs[1].plot(df["zscore"], label="z-score")
    axs[1].axhline(1.0, color="red", linestyle="--")
    axs[1].axhline(-1.0, color="green", linestyle="--")
    axs[1].set_title("Z-score & Thresholds")

    axs[2].plot(df["position"])
    axs[2].set_title("Positions")

    axs[3].plot(nav)
    axs[3].set_title("NAV")

    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    main()
