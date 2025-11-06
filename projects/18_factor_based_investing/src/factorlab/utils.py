# --- src/factorlab/utils.py ---

import matplotlib.pyplot as plt

def plot_nav(nav, outpath):
    plt.figure(figsize=(10, 5))
    plt.plot(nav.index, nav.values)
    plt.title("Cumulative NAV")
    plt.tight_layout()
    plt.savefig(outpath)
    plt.close()
