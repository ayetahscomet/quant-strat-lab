import pandas as pd
import numpy as np
import os


class MacroSignalEngine:

    def __init__(self, verbose=True):
        self.verbose = verbose

        self.fx = pd.read_csv(
            "/Users/deborahakintoye/GitHub/quant-strat-lab/projects/32_macro_informed_systematic_fx_strategy/data/processed/macro_enriched_fx.csv",
            index_col="Date"
        ).ffill().bfill()

        self.us_rates_domestic = self.fx.filter(regex="US_FedFunds")
        self.us_rates_foreign  = self.fx.filter(regex="NONE")   # placeholder → zero fill

        self.yc_10y = self.fx.filter(regex="US_10Y_Yield")
        self.yc_2y  = self.fx.filter(regex="US_2Y_Yield")

        self.vix    = self.fx.filter(regex="VIX|\^VIX")
        self.commods = self.fx.filter(regex="Crude_Oil|Gold")


    def _z(self, s):
        return (s - s.mean()) / (s.std() + 1e-9)


    def rate_differential(self):
        if self.us_rates_domestic.empty:
            return pd.DataFrame(index=self.fx.index, data=0, columns=["RATE_DIFF"])
        return self._z(self.us_rates_domestic.mean(axis=1)).to_frame("RATE_DIFF")


    def yield_curve_slope(self):
        if self.yc_10y.empty or self.yc_2y.empty:
            return pd.DataFrame(index=self.fx.index, data=0, columns=["YC_SLOPE"])
        slope = self.yc_10y.iloc[:,0] - self.yc_2y.iloc[:,0]
        return self._z(slope).to_frame("YC_SLOPE")


    def vix_sentiment(self):
        if self.vix.empty:
            return pd.DataFrame(index=self.fx.index, data=0, columns=["VIX_Z"])
        return self._z(self.vix.iloc[:,0]).to_frame("VIX_Z")


    def commodity_beta(self):
        if self.commods.empty:
            return pd.DataFrame(index=self.fx.index, data=0, columns=["COMM_BETA"])
        return self._z(self.commods.pct_change().mean(axis=1)).to_frame("COMM_BETA")


    def build_macro_signal(self, weights=None):
        if weights is None:
            weights = {"rate_diff":0.35,"yc_slope":0.35,"vix":0.20,"beta":0.10}

        macro = (
              weights["rate_diff"] * self.rate_differential()["RATE_DIFF"]
            + weights["yc_slope"] * self.yield_curve_slope()["YC_SLOPE"]
            + weights["vix"]      * self.vix_sentiment()["VIX_Z"]
            + weights["beta"]     * self.commodity_beta()["COMM_BETA"]
        )

        return macro.to_frame("MACRO_SIGNAL").ffill().bfill()



if __name__ == "__main__":
    m = MacroSignalEngine()
    print(m.build_macro_signal().head())
