# ...existing code...
import numpy as np
import pandas as pd
import os

CURR_DIR = os.path.dirname(os.path.abspath(__file__))

def preprocess_fx_data(fx_data_type="raw"):

    SYNTHETIC_DIR = os.path.normpath(os.path.join(CURR_DIR, "..", "..", "data", "synthetic"))
    RAW_DIR = os.path.normpath(os.path.join(CURR_DIR, "..", "..", "data", "raw"))
    PROCESSED_DIR = os.path.normpath(os.path.join(CURR_DIR, "..", "..", "data", "processed"))

    os.makedirs(PROCESSED_DIR, exist_ok=True)

    out_path = os.path.join(PROCESSED_DIR, "processed_fx_data.csv")

    if fx_data_type == "synthetic":
        os.makedirs(SYNTHETIC_DIR, exist_ok=True)
        src = os.path.join(SYNTHETIC_DIR, "synthetic_fx_data.csv")

    else:
        os.makedirs(RAW_DIR, exist_ok=True)
        src = os.path.join(RAW_DIR, "raw_fx_data.csv")

    processed_data = pd.read_csv(src, index_col="Date")
    processed_data = processed_data.drop_duplicates().ffill().bfill()
    processed_data.to_csv(out_path, index=True)

    return f"--- Data Loaded and Preprocessed. Stored in {PROCESSED_DIR}. ---"

preprocess_fx_data()