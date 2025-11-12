# src/data/generator.py

import numpy as np
import pandas as pd
import os


def generate_synthetic_data(S0 = 100,
                            commodities = ['crude', 'natural', 'corn', 'copper'],
                            mu = 0.0002, 
                            sigma = 0.20, 
                            T = [1, 3, 6], 
                            r = 0.03, 
                            c = 0.01, 
                            y = 0.005, 
                            seed = 42, 
                            n_steps = 800):
    
    n_commodities = len(commodities)
    np.random.seed(seed)  # inc in def
    T = np.array(T) # inc in def
    S = np.zeros(n_steps)
    dt = 1 / n_steps

    for t in range(n_steps):
        dZ = np.random.standard_normal(n_steps)
        S[0] = S0
        S[t] = S[t-1] * np.exp((mu - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * dZ[t])
        df = pd.DataFrame({'S_t': S})

        commodities_maturities = [f"{c}_{m}M" for c in commodities for m in T]
        for col in commodities_maturities:
            m = int(col.split('_')[1].replace('M',''))
            T_val = m / 12
            df[col] = df['S_t'] * np.exp((r + c - y) * T_val)
    return df

