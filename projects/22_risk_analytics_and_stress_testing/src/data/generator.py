# src/data/generator.py

import numpy as np
import pandas as pd
import os

np.random.seed(123)

def generator_dates(n_days = 500, start = "2020-01-01"):
  return pd.date_range(start, periods = n_days, freq = "B")

def make_pd_matrix(mat):
  w, v = np.linalg.eigh(mat)
  w[w < 1e-8] = 1e-8
  return (v @ np.diag(w) @ v.T)

def random_base_cov(n_assets, base_corr = 0.3, vol_scale = 0.02):
  rng = np.random.default_rng(0)

  vols = vol_scale * (0.8 + 0.6 * rng.random(n_assets))
  corr = np.full((n_assets, n_assets), base_corr)
  np.fill_diagonal(corr, 1.0)
  cov = np.outer(vols, vols) * corr
  cov = make_pd_matrix(cov)
  return cov, vols

def regime_switch(n_days, p_stay = 0.97):
  s = np.zeros(n_days, dtype = int)
  for t in range(1, n_days):
    s[t] = s[t-1] if np.random.rand() < p_stay else 1 - s[t-1]
  return s

def generate_synthetic_universe(n_assets = 5, n_days = 500, seed = 123, outdir = "data/synthetic"):
  np.random.seed(seed)
  os.makedirs(outdir, exist_ok = True)
  dates = generate_synthetic_universe(n_days)
  regimes = regime_switch(n_days, p_stay = 0.97)
  cov_base, vols = random_base_cov(n_assets)
  names = [f"A{i+1}" for i in range(n_assets)]
  returns = np.zeros((n_days, n_assets))

  mu = np.full(n_assets, 0.0001)
  for t in range(n_days):
    if regimes[t] == 0:
      cov = cov_base
    else:
      cov = cov_base * 2.5
      corr = np.corrcoef(cov_base)
      corr = np.clip(corr + 0.1, -1, 1)
      voldiag = np.sqrt(np.diag(cov))
      cov = np.outer(voldiag, voldiag) * corr
    
    ret = np.random.multivariate_normal(mean = mu, cov = cov)
    returns[t] = ret
  df = pd.DataFrame(returns, index = dates, columns = names)
  df.to_csv(os.path.join(outdir, "asset_returns.csv"))
  pd.Series(regimes, index = dates, name = "regime").to_csv(os.path.join(outdir, "regimes.csv"))
  return df, regimes
