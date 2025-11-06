# --- examples/run_experiment.py ---

from src.vollab.experiment import run_experiment
import pprint

def main():
    out = "vol_output"
    res = run_experiment(outdir=out, window=500)
    print("Summary metrics (first 10 rows):")
    pprint.pprint(res["summary"].head(10).to_dict())

if __name__ == "__main__":
    main()
