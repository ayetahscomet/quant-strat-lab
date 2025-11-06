# --- examples/run_experiment.py ---

from factorlab.data import DataConfig
from factorlab.experiment import Experiment
from pathlib import Path

def main():
    cfg = DataConfig(n_assets = 5, n_steps = 500, seed = 123)
    exp = Experiment(cfg)
    outpath = Path("output_nav.png")
    res = exp.run(outpath = outpath)

    print("Performance stats:")
    for k, v in res["stats"].items():
        print(f"{k}: {v}")

if __name__ == "__main__":
    main()
