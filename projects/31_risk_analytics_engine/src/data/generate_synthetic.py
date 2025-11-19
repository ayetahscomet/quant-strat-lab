# src/data/generate_synthetic.py

import pandas as pd
import numpy as np
import os
from pathlib import Path

n_steps = 700
trading_days = 252
synthetic_instruments = ["EURUSD", "USDJPY", "UST10Y", "CRUD", "SPX500"]


def simulate_garch_vol(initial_vol = 0.15, alpha = 0.05, beta = 0.94, n_steps = n_steps):
    """Simulate volatility using GARCH(1,1)"""
    vol = np.zeros(n_steps)
    vol[0] = initial_vol
    shocks = np.random.standard_normal(n_steps)

    omega = 0.00001 * (1 - alpha - beta)

    for t in range(1, n_steps):
        vol[t] = np.sqrt(omega + alpha * shocks[t-1]**2 * vol[t-1]**2 + beta * vol[t-1]**2)
    return vol

def simulate_correlation_process(n_assets = len(synthetic_instruments), n_steps = n_steps, mean_corr = 0.35, mean_revert_speed = 0.05):
    """Simulate dynanmic correlation matrix with mean-reverting process"""
    correlations = np.zeros((n_steps, n_assets, n_assets))
    corr_values = np.random.uniform(0.2, 0.5, (n_steps, n_assets * (n_assets - 1) // 2))
    for t in range(n_steps):
        if t > 0:
            corr_values[t] = corr_values[t-1] + mean_revert_speed * (mean_corr - corr_values[t-1])
            corr_values[t] += np.random.normal(0, 0.02, corr_values[t].shape)
        corr_values[t] = np.clip(corr_values[t], 0.1, 0.8)
    
        corr_matrix = np.eye(n_assets)
        idx = 0
        for i in range(n_assets):
            for j in range(i + 1, n_assets):
                corr_matrix[i, j] = corr_values[t, idx]
                corr_matrix[j, i] = corr_values[t, idx]
                idx += 1
    
        correlations[t] = corr_matrix
    return correlations

def simulate_returns(n_steps = n_steps, n_assets = len(synthetic_instruments), tail_events = 6):
    """Generate correlated returns with GARCH volatility and occassional tail shocks"""
    vols = simulate_garch_vol(n_steps = n_steps)
    correlations = simulate_correlation_process(n_assets, n_steps)
    
    returns = np.zeros((n_steps, n_assets))
    drifts = np.array([0.00008, 0.00007, 0.00004, 0.00015, 0.00012])

    tail_indices = np.random.choice(n_steps, size = tail_events, replace = False)

    for t in range(n_steps):
        shocks = np.random.multivariate_normal(np.zeros(n_assets), correlations[t])
        
        scaled_returns = drifts + vols[t] * shocks
        
        if t in tail_indices:
            tail_direction = np.random.choice([-1, 1], n_assets)
            scaled_returns += tail_direction * np.random.uniform(4, 7, n_assets) * vols[t]
        
        returns[t] = scaled_returns
    
    return returns

def returns_to_prices(returns, initial_prices = None):
    """Convert returns to price series"""
    if initial_prices is None:
        initial_prices = np.array([1.15, 110.0, 4.2, 85.08, 4500.0])
    
    prices = np.zeros_like(returns)
    prices[0] = initial_prices

    for t in range(1, len(returns)):
        prices[t] = prices[t-1] * (1 + returns[t])

    return prices

# Generate and export data
if __name__ == "__main__":
    print("Generating synthetic financial data...")
    
    returns = simulate_returns()
    prices = returns_to_prices(returns)
    
    dates = pd.date_range(start="2021-01-01", periods=n_steps, freq="B")
    df_prices = pd.DataFrame(prices, columns=synthetic_instruments, index=dates)
    
    output_path = Path("/Users/deborahakintoye/GitHub/quant-strat-lab/projects/31_risk_analytics_engine/data/raw")
    output_path.mkdir(parents=True, exist_ok=True)
    
    output_file = output_path / "synthetic_data.csv"
    df_prices.to_csv(output_file)
    
    print(f"✓ Synthetic data saved to {output_file}")
    print(f"\nDataset summary:")
    print(f"  Shape: {df_prices.shape}")
    print(f"  Date range: {df_prices.index[0].date()} to {df_prices.index[-1].date()}")
    print(f"\nFirst 5 rows:\n{df_prices.head()}")
    print(f"\nPrice statistics:\n{df_prices.describe()}")