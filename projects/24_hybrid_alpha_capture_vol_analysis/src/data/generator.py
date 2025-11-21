# --- src/data/generator.py ---

# Module creates multivariate synthetic fx log-returns with simple regime switching (two states).
# Additionally, it synthetically generates analyst ideas (ie sentiment, confidence, timestamp, target pairs).

# Key Module Libraries

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os
from src.data.country_profiles import get_profiles

np.random.seed(123)

# Defining generate_dates, 
#           regime_switch_series, 
#           simulate_country_returns, 
#           generate_analyst_ideas,
#           save_synthetic

def generate_dates(n_days = 500, start_date = "2020-01-01"):
    start = pd.to_datetime(start_date)
    return pd.date_range(start, periods = n_days, freq = "B")

def regime_switch_series(n_days, p_stay = 0.95):
    # simple two-state mc: 0 = calm, 1 = stressed
    s = np.zeros(n_days, dtype = int)
    for t in range(1, n_days):
        if s[t-1] == 0:
            s[t] = np.random.choice([0,1], p = [p_stay, 1-p_stay])
        else:
            s[t] = np.random.choice([0,1], p = [1-p_stay, p_stay])
    return s

def simulate_country_returns(profiles, n_days = 500, start_date = "2020-01-01"):
    """
    Simulate country-level daily returns for each currency.
    profiles: dict currency -> {mean_drift, bas_vol, stress_mult}
    Returns: (country_returns_df, regime_series)
    """

    dates = generate_dates(n_days, start_date)
    regimes = regime_switch_series(n_days, p_stay = 0.97)
    n = n_days
    currencies = list(profiles.keys())
    returns = np.zeros((n, len(currencies)))
    for t in range(n):
        for i, cur in enumerate(currencies):
            prof = profiles[cur]
            vol = prof["base_vol"] * (prof["stress_mult"] if regimes[t] == 1 else 1.0)
            mu = prof.get("mean_drift", 0.0)
            phi = 0.02 * (returns[t-1, i] if t > 0 else 0.0)
            eps = np.random.normal(loc = mu, scale = vol)
            returns[t, i] = phi + eps + mu
    df = pd.DataFrame(returns, index = dates, columns = currencies)
    regimes_s = pd.Series(regimes, index = dates, name = "regime")
    return df, regimes_s

def build_fx_pairs_from_countries(country_returns_df, pairs = None):
    """
    Given country-level returns Datagrame (index dates, columns currencies),
    build FX pair returns using ret(pair = DOM/FORE) = ret_domestic - ret_foreign
    pairs: list of strings like "USD/BRL" or tuples ("USD", "BRL"). 
        If None -> create crosses of all non-USD pairs with USD as base if possible.
    Returns: (fx_returns_df, pair_meta)
    """
    if pairs is None:
        # default: all crosses using first currency as base (e.g. USD vs others)
        cols = list(country_returns_df.columns)
        base = cols[0]
        pairs = [(base, c) for c in cols if c != base]
    
    processed = {}
    meta = []
    for p in pairs:
        if isinstance(p, str):
            if "/" in p:
                dom, forcur = p.split("/")
            elif "-" in p:
                dom, forcur = p.split("-")
            else:
                raise ValueError(f"Pair string {p} not parsable. Use 'USD/BRL' or tuple.")
        else:
            dom, forcur = p
        if dom not in country_returns_df.columns or forcur not in country_returns_df.columns:
                # skipping pairs with missing currencies
            continue
        fx_ret = country_returns_df[dom] - country_returns_df[forcur]
        pair_name = f"{dom}{forcur}"
        processed[pair_name] = fx_ret
        meta.append({"pair": pair_name, "dom": dom, "for": forcur})

    fx_df = pd.DataFrame(processed, index = country_returns_df.index)
    return fx_df, pd.DataFrame(meta)

def generate_universe(currencies=None, pairs=None, n_days=500, start_date="2020-01-01", profile_overrides=None, outdir="data/synthetic"):
    
    """
    Top-level convenience function:
      - constructs profiles
      - simulates country returns + regimes
      - constructs fx pair returns
      - saves CSVs
    Returns: country_returns_df, fx_returns_df, regimes_series, pair_meta_df
    """

    profiles = get_profiles(currencies, override=profile_overrides)
    country_rets, regimes = simulate_country_returns(profiles, n_days=n_days, start_date=start_date)
    fx_returns, meta = build_fx_pairs_from_countries(country_rets, pairs=pairs)

    outdir = os.path.abspath(outdir)
    os.makedirs(outdir, exist_ok=True)
    country_rets.to_csv(os.path.join(outdir, "country_returns.csv"))
    fx_returns.to_csv(os.path.join(outdir, "fx_returns.csv"))
    regimes.to_csv(os.path.join(outdir, "regimes.csv"))
    meta.to_csv(os.path.join(outdir, "pair_meta.csv"), index=False)

    print(f"Wrote synthetic: country_returns {country_rets.shape}, fx_returns {fx_returns.shape}, pairs {len(meta)}")
    return country_rets, fx_returns, regimes, meta


if __name__ == "__main__":
    countries = ["USD", "EUR", "GBP", "JPY", "BRL", "ZAR", "TRY"]
    cr, fx, r, meta = generate_universe(currencies = countries, n_days = 600)
