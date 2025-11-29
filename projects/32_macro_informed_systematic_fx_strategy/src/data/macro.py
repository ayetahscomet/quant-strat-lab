import pandas as pd
import yfinance as yf
from fredapi import Fred
import os

CURR_DIR = os.path.dirname(os.path.abspath(__file__))
MACRO_DIR = os.path.normpath(os.path.join(CURR_DIR, "..", "..", "data", "macro"))
os.makedirs(MACRO_DIR, exist_ok=True)

FRED_API_KEY = 'b4870cbc4f9fbecd592409b7ffdff146'
START_DATE = "2015-01-01"

def load_macro_data():
    print(f"Starting download of macro data to {MACRO_DIR}...")
    
    fred = Fred(api_key = FRED_API_KEY)

    try:
        rates_data = fred.get_series('FEDFUNDS', observation_start = START_DATE)
        if rates_data is not None and not rates_data.empty:
            rates_data = rates_data.rename('US_FedFunds').rename_axis("Date")
            rates_data.to_csv(os.path.join(MACRO_DIR, 'rates.csv'))
            print("Saved rates.csv with US Fed Funds rate only.")
        else:
            print("Rates data from FRED was empty.")
    except Exception as e:
        print(f"Error fetching FRED Fed Funds rate data: {e}")

    try:
        us_2y = fred.get_series('DGS2', observation_start = START_DATE).rename('US_2Y_Yield').rename_axis("Date")
        us_2y.to_csv(os.path.join(MACRO_DIR, 'us_2y.csv'))
        print("Saved us_2y.csv")
    except Exception as e:
        print(f"Error fetching FRED 2Y data: {e}")

    try:
        us_10y = fred.get_series('DGS10', observation_start = START_DATE).rename('US_10Y_Yield').rename_axis("Date")
        us_10y.to_csv(os.path.join(MACRO_DIR, 'us_10y.csv'))
        print("Saved us_10y.csv")
    except Exception as e:
        print(f"Error fetching FRED 10Y data: {e}")
    
    try:
        vix_df = yf.download('^VIX', start=START_DATE, progress=False)
        if not vix_df.empty and 'Close' in vix_df.columns:

            vix_data = vix_df['Close']
            vix_data.to_csv(os.path.join(MACRO_DIR, 'vix.csv'))
            print("Saved vix.csv")
        else:
            print("VIX data from yfinance was empty or missing 'Close' column.")
    except Exception as e:
        print(f"Error fetching yfinance VIX data: {e}")

    try:
        commodities_df = yf.download(["CL=F", "GC=F"], start=START_DATE, progress=False)
        if not commodities_df.empty and 'Close' in commodities_df.columns:
            commodities_data = commodities_df['Close']
            commodities_data = commodities_data.rename(columns={'CL=F': 'Crude_Oil', 'GC=F': 'Gold'})
            commodities_data.to_csv(os.path.join(MACRO_DIR, 'commodities.csv'))
            print("Saved commodities.csv")
        else:
            print("Commodities data from yfinance was empty or missing 'Close' column.")
    except Exception as e:
        print(f"Error fetching yfinance commodities data: {e}")

    print("\nAll macro data downloads complete.")


if __name__ == "__main__":
    load_macro_data()

