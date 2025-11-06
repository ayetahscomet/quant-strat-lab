# tests/test_data.py
from quantpkg.data import DataGenerator
import pandas as pd

def test_generate_no_nans_and_length():
    gen = DataGenerator(mu=0.0, alpha=0.01, beta=0.9, xi=0.001, sigma0=0.01, dt=1/252, n_steps=100, seed=1)
    df = gen.generate()
    assert len(df) == 100
    assert not df.isna().any().any()
