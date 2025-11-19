# src/models/es.py

import numpy as np
import pandas as pd
from scipy.stats import norm, t

def historical_es(returns: pd.Series, confidence: float = 0.99):
    """
    Expected Shortfall = average of worst (1 - conf)% losses.
    """
    threshold = np.percentile(returns, (1 - confidence) * 100)
    tail_losses = returns[returns < threshold]
    return tail_losses.mean()



def parametric_es_normal(mean: float, sigma: float, confidence: float = 0.99):
    """
    Closed-form ES for normal distribution.
    """
    z = norm.ppf(1 - confidence)
    pdf = norm.pdf(z)
    tail_prob = (1 - confidence)

    return mean - sigma * pdf / tail_prob

def parametric_es_t(mean: float,
                    sigma: float,
                    df: int = 5,
                    confidence: float = 0.99):
    """
    Closed-form ES for t distribution.
    """
    t_crit = t.ppf(1 - confidence, df)
    scale = sigma * np.sqrt(df / (df - 2))

    pdf = t.pdf(t_crit, df)
    tail_prob = (1 - confidence)

    return mean - scale * (pdf / tail_prob)
