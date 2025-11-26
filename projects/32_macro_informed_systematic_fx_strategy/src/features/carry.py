import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import os
from returns import compute_log_returns, compute_simple_returns

CURR_DIR = os.path.dirname(os.path.abspath(__file__))
PROCESSED_DIR = os.path.normpath(os.path.join(CURR_DIR, "..", "..", "data", "processed"))
os.makedirs(PROCESSED_DIR, exist_ok=True)


def compute_forward_prices(*, domestic_rate = float, foreign_rate = float):
    processed_fx_data = pd.read_csv(f"{PROCESSED_DIR}/processed_fx_data.csv")
    processed_fx_data = pd.DataFrame(processed_fx_data)
    processed_fx_data.set_index("Date", inplace=True, drop=True)
    CURRENCIES = processed_fx_data.columns.to_list()
    processed_fx_data[CURRENCIES] = processed_fx_data * ((1 + domestic_rate) / ( 1 + foreign_rate))
    forward_prices = processed_fx_data
    return forward_prices


def compute_carry(domestic_rate = float, foreign_rate = float):
    spot_rates = pd.read_csv(f"{PROCESSED_DIR}/processed_fx_data.csv")
    spot_rates = pd.DataFrame(spot_rates)
    spot_rates.set_index("Date", inplace=True, drop=True)
    forward_prices = compute_forward_prices(domestic_rate = domestic_rate, foreign_rate = foreign_rate)
    CURRENCIES = forward_prices.columns.to_list()
    carry = (forward_prices[CURRENCIES] - spot_rates[CURRENCIES]) / spot_rates[CURRENCIES]
    return carry

