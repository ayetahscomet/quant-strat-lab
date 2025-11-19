# /Users/deborahakintoye/GitHub/quant-strat-lab/projects/21_asset_data_analysis/src/data/load_data.py

import pandas as pd
import numpy as np
from src.utils.paths import DATA_RAW
import os

def load_asset_data():
    path = DATA_RAW / "asset_data.csv"
    df = pd.read_csv(path, parse_dates = ["Date"], index_col = "Date")
    df = df.sort_index()
    return df
