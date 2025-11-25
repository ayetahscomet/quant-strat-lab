import numpy as np
import pandas as pd
import yfinance as yf
import os

CURR_DIR = os.path.dirname(os.path.abspath(__file__))
SYNTHETIC_DIR = os.path.normpath(os.path.join(CURR_DIR, "..", "..", "data", "synthetic"))
os.makedirs(SYNTHETIC_DIR, exist_ok=True)

def generate_synthetic_fx_data(CURRENCIES = ["GBPUSD=X", "EURUSD=X", "JPYUSD=X", "CHFUSD=X", "AUDUSD=X", "^TNX"], N_STEPS = 2750, START_DATE = "2015-01-01", S0 = np.array([1.55, 1.21, 0.008, 1.005, 0.81, 2.10]), SIGMA = 0.20, N_TRADING_DAYS = 252):

    N_CURRENCIES = len(CURRENCIES)
    N_SIMULATIONS = N_CURRENCIES
    MU = 0.0000
    Z = np.random.standard_normal(N_STEPS)
    dt = 1 / N_TRADING_DAYS

    S = np.zeros((N_STEPS, N_SIMULATIONS))

    if len(S0) != N_CURRENCIES:
        StopIteration(print('--- ERROR: len(CURR_0) != N_CURRENCIES ---'))

    S[0, :] = S0

    for i in range(1, N_STEPS):
        for t in range(0, N_CURRENCIES):
            S[i, t] = S[i-1, t] * np.exp((MU - 0.5 * SIGMA**2) * dt + SIGMA * np.sqrt(dt) * Z[i])

    out_path = os.path.join(SYNTHETIC_DIR, "synthetic_fx_data.csv");
    synthetic_S_df = pd.DataFrame(S, columns = CURRENCIES)
    synthetic_S_df.index = pd.date_range(start = START_DATE, periods = N_STEPS, freq='B')
    synthetic_S_df.to_csv(out_path, index=True);
    return f"--- Synthetic {CURRENCIES} Data Loaded. Stored in {SYNTHETIC_DIR}. ---";
