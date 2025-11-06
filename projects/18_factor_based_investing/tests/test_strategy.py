# --- tests/test_strategy.py ---

import pandas as pd
from factorlab.strategy import TopKStrategy

def test_weights_normalised():
    df = pd.DataFrame({
        "A": [1, 2, 3],
        "B": [3, 1, 1],
        "C": [2, 2, 2],
        "D": [0, 0, 0]
    })

    strat = TopKStrategy(k_long = 1, k_short = 1)
    w = strat.allocate(df)
    assert all(abs(w.abs().sum(axis = 1) - 1) < 1e-12)

