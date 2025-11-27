import numpy as np
import pandas as pd
import os

CURR_DIR = os.path.dirname(os.path.abspath(__file__))
PROCESSED_DIR = os.path.normpath(os.path.join(CURR_DIR, "..", "..", "data", "processed"))
os.makedirs(PROCESSED_DIR, exist_ok=True)


def compute_simple_returns():
    processed_fx_data = pd.read_csv(f"{PROCESSED_DIR}/processed_fx_data.csv")
    processed_fx_data = pd.DataFrame(processed_fx_data)
    processed_fx_data.set_index("Date", inplace=True, drop=True)
    CURRENCIES = processed_fx_data.columns.to_list()
    processed_fx_data[CURRENCIES] = ((processed_fx_data - processed_fx_data.shift(1)) / processed_fx_data.shift(1)).ffill().bfill()
    simple_returns = processed_fx_data
    return simple_returns


def compute_log_returns():
    processed_fx_data = pd.read_csv(f"{PROCESSED_DIR}/processed_fx_data.csv")
    processed_fx_data = pd.DataFrame(processed_fx_data)
    processed_fx_data.set_index("Date", inplace=True, drop=True)
    CURRENCIES = processed_fx_data.columns.to_list()
    processed_fx_data[CURRENCIES] = (np.log(processed_fx_data / processed_fx_data.shift(1))).ffill().bfill()
    log_returns = processed_fx_data
    return log_returns


def compute_rolling_volatility(returns_type = ('simple' or 'log'), window = int):
    if returns_type == 'simple':
        fx_data = compute_simple_returns()
    else:
        fx_data = compute_log_returns()

    return fx_data.rolling(window = window).std().fillna(0.0)


def compute_returns_covariance(returns_type = ('simple' or 'log')):
    if returns_type == 'simple':
        fx_data = compute_simple_returns()
    else:
        fx_data = compute_log_returns()
        
    return fx_data.cov().fillna(0.0)

