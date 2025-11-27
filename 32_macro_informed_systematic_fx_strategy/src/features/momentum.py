import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import os


CURR_DIR = os.path.dirname(os.path.abspath(__file__))
PROCESSED_DIR = os.path.normpath(os.path.join(CURR_DIR, "..", "..", "data", "processed"))
os.makedirs(PROCESSED_DIR, exist_ok=True)


def compute_rolling_momentum(window = ("3M" or "6M")):
    fx_data = pd.read_csv(f"{PROCESSED_DIR}/processed_fx_data.csv")
    fx_data = pd.DataFrame(fx_data)
    fx_data.set_index("Date", inplace=True, drop=True)
    CURRENCIES = fx_data.columns.to_list()
    
    if window == "3M":
        fx_data[CURRENCIES] = (fx_data[CURRENCIES] - fx_data[CURRENCIES].shift(60)).ffill().fillna(0.0)
        fx_data.columns = [f'{c[:-2]}3M' for c in fx_data.columns]
    
    if window == "6M":
        fx_data[CURRENCIES] = (fx_data[CURRENCIES] - fx_data[CURRENCIES].shift(120)).ffill().fillna(0.0)
        fx_data.columns = [f'{c[:-2]}6M' for c in fx_data.columns]            
    
    momentum = fx_data
    return momentum

