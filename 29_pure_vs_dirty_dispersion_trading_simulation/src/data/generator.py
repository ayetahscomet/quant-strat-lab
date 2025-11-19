import numpy as np
import pandas as pd
from scipy.stats import norm

# input parameters

def generate_returns(n_assets = 50, n_steps = 1000, seed = 42, mu = 0.002, rho = 0.20, min_sigma = 0.25, max_sigma = 0.35, trading_days = 252
):
    annual_sigma = np.random.uniform(low = min_sigma, high = max_sigma, size = n_assets)
    daily_sigma = annual_sigma / np.sqrt(trading_days)
    cov_matrix = np.zeros((n_assets, n_assets))

    for i in range(n_assets):
        for j in range(n_assets):
            if i == j:
                cov_matrix[i, j] = daily_sigma[i] ** 2
            else:
                cov_matrix[i, j] = rho * daily_sigma[i] * daily_sigma[j]

    print(f"Covariance Matrix Shape:    {cov_matrix.shape}")
    print(f"Diagonal Elements (Variances) Range from:   {np.min(np.diag(cov_matrix)):.6f} to {np.max(np.diag(cov_matrix)):.6f}")

    daily_log_returns = np.random.multivariate_normal(mean = np.zeros(n_assets), cov = cov_matrix, size = n_steps)

    returns_df = pd.DataFrame(daily_log_returns, columns = [f"Stock_{i+1}" for i in range(n_assets)])

    print(f"\nSimulated Returns Shape (Days x Stocks):  {returns_df.shape}")
    print("\nFirst 5 rows of simulated returns:")
    print(returns_df.head())