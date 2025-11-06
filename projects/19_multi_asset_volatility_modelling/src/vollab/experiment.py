
# --- src/vollab/experiment.py ---

import pandas as pd
import matplotlib.pyplot as plt
from .data import DataConfig, DataGenerator
from .cleaning import clean_returns
from .garch import GARCHModel
from .egarch import EGARCHModel
from .gjr import GJRModel
from .forecast import rolling_forecast
from .evaluation import evaluate_forecasts
import os

def run_experiment(outdir="vol_output", window=500):
    os.makedirs(outdir, exist_ok=True)
    cfg = DataConfig()
    gen = DataGenerator(cfg)
    assets = gen.generate()

    results = {}
    for name, df in assets.items():
        dfc = clean_returns(df)
        returns = dfc["return"]

        realised = returns**2

        forecasts = {}
        models_info = {}

        fc_garch = rolling_forecast(returns, model_class=GARCHModel, window=window)
        forecasts["GARCH"] = fc_garch

        gm = GARCHModel()
        gm.fit(returns.iloc[-window:])
        models_info["GARCH"] = {"loglik": gm.loglik, "k": len(gm.params), "n": gm.nobs}

        fc_egarch = rolling_forecast(returns, model_class=EGARCHModel, window=window)
        forecasts["EGARCH"] = fc_egarch
        eg = EGARCHModel()
        eg.fit(returns.iloc[-window:])
        models_info["EGARCH"] = {"loglik": eg.loglik, "k": len(eg.params), "n": eg.nobs}

        fc_gjr = rolling_forecast(returns, model_class=GJRModel, window=window)
        forecasts["GJR"] = fc_gjr
        gj = GJRModel()
        gj.fit(returns.iloc[-window:])
        models_info["GJR"] = {"loglik": gj.loglik, "k": len(gj.params), "n": gj.nobs}

        eval_df = evaluate_forecasts(forecasts, realised, models_info)

        # save plot: forecasts vs realised for last 200 points
        plt.figure(figsize=(10, 6))
        last = returns.index[-200:]
        for k, v in forecasts.items():
            plt.plot(v.index[-200:], v.values[-200:], label=f"{k} forecast")
        plt.plot(realised.index[-200:], realised.values[-200:], label="realised", color="k", linewidth=1)
        plt.legend()
        plt.title(f"{name} -- forecasts vs realised (last 200)")
        plt.tight_layout()
        fpath = os.path.join(outdir, f"{name}_forecasts_vs_realised.png")
        plt.savefig(fpath)
        plt.close()

        results[name] = {
            "eval": eval_df,
            "forecasts": forecasts,
            "models_info": models_info,
            "realised": realised
        }

    summary_rows = []
    for asset, info in results.items():
        dfm = info["eval"]
        for model in dfm.index:
            row = dfm.loc[model].to_dict()
            row["asset"] = asset
            row["model"] = model
            summary_rows.append(row)
    summary = pd.DataFrame(summary_rows)
    summary = summary.set_index(["asset", "model"]).sort_index()

    summary.to_csv(os.path.join(outdir, "summary_metrics.csv"))
    return {"results": results, "summary": summary}
