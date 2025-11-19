# --- src/factorlab/strategy.py ---

import numpy as np
import pandas as pd

class TopKStrategy:
    def __init__(self, k_long = 2, k_short = 2):
        self.k_long = k_long
        self.k_short = k_short
    
    def allocate(self, score_df: pd.DataFrame) -> pd.DataFrame:
        """
        Returns a DataFrame of weights.
        """
        n = score_df.shape[1]
        weights = pd.DataFrame(0.0, index = score_df.index, columns = score_df.columns)

        ranks = score_df.rank(axis = 1, method = "first", ascending = False)

        for t in score_df.index:
            long_assets = ranks.loc[t].nsmallest(self.k_long).index
            short_assets = ranks.loc[t].nlargest(self.k_short).index

            weights.loc[t, long_assets] = 1.0 / self.k_long
            weights.loc[t, short_assets] = 1.0 / self.k_short
        
        # --- Total abs exposure normalisation to 1 ---
        abs_sum = weights.abs().sum(axis = 1).replace(0, 1)
        weights= weights.div(abs_sum, axis = 0)
        
        return weights
    