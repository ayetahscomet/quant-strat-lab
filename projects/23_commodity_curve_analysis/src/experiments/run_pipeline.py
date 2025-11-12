import os

os.getcwd()
LOCATION = "workspaces"
os.chdir(f"/{LOCATION}/quant-strat-lab/projects/22_risk_analytics_and_stress_testing/src")

from src.data.generator import generate_synthetic_data