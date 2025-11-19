# Risk Analytics Engine — Hedge Fund-Style Risk Modelling Project

This project implements a **full end-to-end institutional risk engine** similar to what front-office
risk teams use in macro / multi-asset hedge funds such as BlueCrest.

It integrates:
- Synthetic market data generation
- Portfolio PnL simulation
- Value at Risk (Historical, Parametric, Monte Carlo)
- Expected Shortfall (Normal & t)
- PCA factor analysis and curve-style factor shocks
- Stress testing (volatility shock, correlation breakdown, return shock)
- DV01-style interest rate sensitivity
- Scenario loss attribution
- Rolling risk metrics
- Full plotting, logging and reporting pipeline

This project was built to strengthen knowledge in:
- Risk modelling
- Market microstructure
- Systematic analytics
- Infrastructure thinking
- Python engineering for front-office environments

---

## Project Structure

risk_engine_project/
│
├── data/
│   ├── raw/
│   ├── interim/
│   └── processed/
│
├── notebooks/
│   └── 01_risk_engine_walkthrough.ipynb
│
├── reports/
│   ├── figures/
│   ├── tables/
│   ├── logs/
│   └── final_report.md
│
├── src/
│   ├── data/
│   │   ├── generate_synthetic.py
│   │   └── load_data.py
│   │
│   ├── models/
│   │   ├── var.py
│   │   ├── es.py
│   │   ├── pca.py
│   │   └── stress_tests.py
│   │
│   ├── backtest/
│   │   └── portfolio_sim.py
│   │
│   ├── utils/
│   │   ├── math_utils.py
│   │   ├── plotting.py
│   │   └── logging_setup.py
│   │
│   ├── experiments/
│   │   └── run_full_pipeline.py
│   │
│   └── __init__.py
│
├── main.py
├── notation.txt
├── requirements.txt
└── README.md


---

## Key Features

### **1. Market Data Generator**
Creates a 5-asset synthetic universe:
- EURUSD  
- USDJPY  
- UST 10Y yield  
- Crude oil  
- SPX500  

With:
- stochastic (GARCH-style) volatility  
- time-varying correlation matrix  
- heavy-tailed shock events  
- realistic drift/vol parameters  

### **2. Portfolio Engine**
- random long/short weights  
- factor exposures via PCA  
- DV01-style interest rate sensitivity  
- daily PnL computation  

### **3. Risk Models**
- Historical VaR  
- Parametric VaR (normal, t-distribution)  
- Monte Carlo VaR  
- Historical ES  
- Rolling vol & rolling covariance  
- VaR backtesting  

### **4. Stress Testing**
- return shock  
- volatility doubling  
- correlation breakdown  
- PCA factor shock (steepener/flattener)  
- scenario loss attribution  

### **5. Reporting**
- plots saved to `/reports/figures/`
- PCA loadings  
- rolling volatility  
- return distributions  
- stress test losses  
- VaR/PnL timeline  

---

## Usage

To run the full project: python main.py
To explore interactively: jupyter notebook notebooks/01_risk_engine_walkthrough.ipynb

---

## Purpose

This project was designed to:

- simulate the work of a *front-office risk analyst*
- develop deep understanding of risk modelling
- strengthen Python coding and modular project design

