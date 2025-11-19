# --- src/factorlab/experiment.py ---

import pandas as pd

from factorlab.data import DataConfig, DataGenerator
from factorlab.factors import Momentum, Volatility, MeanReversion
from factorlab.standardise import zscore_df
from factorlab.backtest import Backtester
from factorlab.strategy import TopKStrategy
from factorlab.utils import plot_nav

class Experiment:
    def __init__(self, cfg: DataConfig):
        self.cfg = cfg
    
    def run(self, outpath = None):
        gen = DataGenerator(self.cfg)
        assets = gen.generate()

        ret_df = pd.DataFrame({k: v["log_return"] for k, v in assets.items()})
        ret_df = ret_df.ffill().bfill()

        mom = Momentum(window = 20)
        vol = Volatility(window = 20)
        mr = MeanReversion(window = 20)

        mom_df = ret_df.apply(mom.compute)
        vol_df = ret_df.apply(vol.compute)
        mr_df = ret_df.apply(mr.compute)

        mom_z = zscore_df(mom_df)
        vol_z = zscore_df(vol_df)
        mr_z = zscore_df(mr_df)

        score_df = mom_z - 0.5 * vol_z + mr_z

        strat = TopKStrategy(k_long = 2, k_short = 2)
        weights_df = strat.allocate(score_df)

        bt = Backtester()
        results = bt.run(ret_df, weights_df)

        if outpath is not None:
            plot_nav(results["nav"], outpath)
        
        return {
            "scores": score_df,
            "weights": weights_df,
            "nav": results["nav"],
            "stats": results["stats"]
        }
    