# --- src/utils/plotting.py ---
import matplotlib.pyplot as plt
import pandas as pd
import os

def plot_nav_with_regimes(nav: pd.Series, regimes_df: pd.DataFrame = None, outpath: str = "outputs/nav.png"):
    os.makedirs(os.path.dirname(outpath) or ".", exist_ok=True)
    plt.figure(figsize=(10,4))
    plt.plot(nav.index, nav.values, label="NAV", linewidth=2)
    if regimes_df is not None:

        avg_regime = regimes_df.mean(axis=1)
        crisis = avg_regime >= 1.5
        plt.fill_between(nav.index, nav.min(), nav.max(), where=crisis, color='red', alpha=0.1, transform=plt.gca().get_xaxis_transform(), label="Crisis")
    plt.legend()
    plt.title("Portfolio NAV")
    plt.tight_layout()
    plt.savefig(outpath, dpi=150)
    plt.close()

def plot_scores(scores_df: pd.DataFrame, outpath: str = "outputs/scores.png", top_n: int = None):
    os.makedirs(os.path.dirname(outpath) or ".", exist_ok=True)
    plt.figure(figsize=(10,4))
    if top_n:
        subset = scores_df.iloc[:, :top_n]
    else:
        subset = scores_df
    subset = subset.fillna(0.0)
    subset.sum(axis=1).rolling(5).mean().plot()
    plt.title("Aggregate Score (rolling mean)")
    plt.tight_layout()
    plt.savefig(outpath, dpi=150)
    plt.close()
