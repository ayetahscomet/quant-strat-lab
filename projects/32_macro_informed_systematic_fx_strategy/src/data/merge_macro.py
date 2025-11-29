import pandas as pd
from pathlib import Path


ROOT = Path("/Users/deborahakintoye/GitHub/quant-strat-lab/projects/32_macro_informed_systematic_fx_strategy")

FX_FILE   = ROOT / "data/processed/processed_fx_data.csv"
MACRO_DIR = ROOT / "data/macro"
OUTPUT    = ROOT / "data/processed/macro_enriched_fx.csv"

def merge_macro_data():
    fx = pd.read_csv(FX_FILE, index_col="Date").ffill().bfill()

    vix       = pd.read_csv(MACRO_DIR/"vix.csv", index_col="Date").rename(columns={"^VIX":"VIX"})
    fedfunds  = pd.read_csv(MACRO_DIR/"rates.csv", index_col="Date")
    us2y      = pd.read_csv(MACRO_DIR/"us_2y.csv", index_col="Date")
    us10y     = pd.read_csv(MACRO_DIR/"us_10y.csv", index_col="Date")
    commods   = pd.read_csv(MACRO_DIR/"commodities.csv", index_col="Date")

    merged = (
        fx.join(fedfunds, how="left")
          .join(us2y, how="left")
          .join(us10y, how="left")
          .join(vix, how="left")
          .join(commods, how="left")
          .ffill().bfill()
    )

    merged.to_csv(OUTPUT)
    print("\nMERGED FILE CREATED:\n", OUTPUT)
    print("\nFINAL COLUMNS AVAILABLE:")
    print(list(merged.columns))


if __name__ == "__main__":
    merge_macro_data()
