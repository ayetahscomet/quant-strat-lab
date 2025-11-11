# Quant Data Lab Preparation Project

This project simulates the type of light quant research task typically given in a 60-minute Data Lab assessment used by quantitative finance teams.

## Contents
The task includes:
-   Data loading and validation
-   Return calculation
-   Summary statistics
-   Rolling volatility
-   Correlation anaylsis
-   Drawdown analysis
-   Short witten interpretation

## How to run
1.  Download dataset located in 'data/raw/asset_data.csv'
2.  Run the notebook: notebooks/01_data_lab_practice.ipynb 
        Or run the pipeline modules individually:
            python -m src.data.load_data
            python -m src.analysis.compute_metrics

##  Purpose
This prepares you for:
-   The 60-minute independent Data Lab
-   The 25-minute screen-share explanation
-   30-minute live technical questions
