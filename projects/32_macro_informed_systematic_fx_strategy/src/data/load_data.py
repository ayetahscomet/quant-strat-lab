import numpy as np
import pandas as pd
import yfinance as yf
import os

CURR_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.normpath(os.path.join(CURR_DIR, "..", "..", "data", "raw"))
os.makedirs(RAW_DIR, exist_ok=True)


def load_raw_fx_data(CURRENCIES = ["GBPUSD=X", "EURUSD=X", "JPYUSD=X", "CHFUSD=X", "AUDUSD=X", "^TNX"], START_DATE = "2015-01-01", OHLC = 'Close'):
    N_CURRENCIES = len(CURRENCIES);
    fx_data = yf.download(CURRENCIES, start=START_DATE)[OHLC];
    out_path = os.path.join(RAW_DIR, "raw_fx_data.csv");
    fx_data.to_csv(out_path, index=True);
    return f"--- {CURRENCIES} Data Loaded. Stored in {RAW_DIR}. ---";
