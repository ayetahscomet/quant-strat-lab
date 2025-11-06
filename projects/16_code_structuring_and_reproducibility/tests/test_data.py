# tests/test_data.py

import pandas as pd
from quantpkg.data import DataGenerator

def test_data_generator_basic():
    gen = DataGenerator(
        mu=0.02, alpha=0.1, beta=0.85, xi=0.1,
        sigma0=0.2, dt=1/252, n_steps=100, seed=1
    )
    df = gen.generate()

    assert isinstance(df, pd.DataFrame)
    assert len(df) == 100
    assert not df.isna().any().any()
    assert "log_return" in df.columns
    assert "price" in df.columns
    assert "sigma" in df.columns
