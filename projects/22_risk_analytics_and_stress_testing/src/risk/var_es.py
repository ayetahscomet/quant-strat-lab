# src/pnl/var_es.py

import numpy as np
import pandas as pd
import scipy.stats as st

def parameteric_var_es(weights, mu, cov, alpha = 0.99):
    w = np.asarray(weights)
    mu_p = w.dot(mu)
    sigma_p = np.sqrt(w.dot(cov).dot(w))
    z = st.normal.ppf(1 - alpha)
    var = - (mu_p + z * sigma_p)
    pdf = st.norm.pdf(z)
    es = -mu_p + sigma_p * (pdf / alpha)
    return var, es

def historical_var_e(portfolio_returns, alpha = 0.99):
    sorted_r = np.sort(portfolio_returns)
    cutoff = int(np.ceil((1-alpha) * len(sorted_r)))
    var = -sorted_r[:cutoff].max() if cutoff > 0 else - sorted_r.min()
    es = -sorted_r[:cutoff].mean() if cutoff > 0 else -sorted_r.mean()
    return var, es

def montecarlo_var_es(weights, mu, cov, M = 20000, alpha = 0.99):
    samples = np.random.multivariate_normal(mean = mu, cov = cov, size = M)
    port = samples.dot(weights)
    port_sorted = np.sort(port)
    cutoff = int(np.ceil((1-alpha) * M))
    var = -port_sorted[:cutoff].max() if cutoff > 0 else - port_sorted.min()
    es = -port_sorted[:cutoff].mean() if cutoff > 0 else - port_sorted.mean()
    return var, es, port