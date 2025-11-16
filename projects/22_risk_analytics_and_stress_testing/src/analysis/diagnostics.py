# src/analysis/diagnostics.py

import matplotlib.pyplot as plt
import os

def plot_nav(nav, outpath = "outputs/nav.png"):
    os.makedirs(os.path.dirname(outpath) or ".", exist_ok = True)
    plt.figure(figsize = (10, 4))
    plt.plot(nav.index, nav.values, lw = 2)
    plt.title("Portfolio NAV")
    plt.tight_layout()
    plt.savefig(outpath, dpi = 150)
    plt.close()

def plot_return_distribution(portfolio_returns, var_lines = None, outpath = "outputs/dist.png"):
    os.makedirs(os.path.dirname(outpath) or ".", exist_ok = True)
    plt.figure(figsize = (8, 4))
    plt.hist(portfolio_returns, bins = 80, density = True, alpha = 0.7)
    if var_lines:
        for label,x in var_lines.items():
            plt.axvline(x, color = 'red' if 'VaR' in label else 'blue', linestyle = '--', label = label)
    plt.legend()
    plt.title("Portfolio return distribution")
    plt.tight_layout()
    plt.savefig(outpath, dpi = 150)
    plt.close()