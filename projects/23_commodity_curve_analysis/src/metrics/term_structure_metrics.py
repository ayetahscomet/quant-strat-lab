# src/metrics.py

import numpy as np
import pandas as pd
import os
from pathlib import Path

LOCATION = Path("workspaces")  # no leading slash
path = LOCATION / "quant-strat-lab" / "projects" / "23_commodities_curve_analysis" / "src"
os.chdir(path)
