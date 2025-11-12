# src/analysis/attribution.py

import pandas as pd
import numpy as np

def worst_day_attribution(returns_df, weights_df):
    dates = returns_df.index.intersection(weights_df.index)
    assets = returns_df.columns.intersection(weights_df.columns)
    r = returns_df.reindex(index = dates, columns = assets).fillna(0.0)
    w = weights_df.reindex(index = dates, columns = assets).fillna(0.0)
    port = (w * r).sum(axis = 1)
    worst_date = port.idxmin()
    contributions = (w.loc[worst_date] * r.loc[worst_date])
    contrib_df = contributions.to_frame(name = "contribution").sort_values("contribution")
    return worst_date, contrib_df