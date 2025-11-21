# Macro-Informed Systematic FX Strategy Project

Author: Deborah Akintoye
Inception Date: 21-November-2025

## Project Overview
## Motivation

Foreign exchange (FX) markets are the largest and most liquid globally, with daily turnover exceeding $6 trillion. Despite high liquidity, FX markets are influenced by interest rate differentials, macroeconomic releases, risk sentiment, and commodity prices.

A systematic FX strategy incorporating macroeconomic information allows modelling of:

Predictable market patterns (e.g., carry effects from interest rate differentials)

Conditional responses to macro shocks (e.g., risk-on/risk-off events reflected in volatility indices)

This produces robust, interpretable strategies with quantifiable risk and performance.

---

## Objective

Simulate a realistic quant research pipeline in an FX trading desk:

Data Engineering: Acquire, clean, and merge FX, rates, and macro datasets.

Feature Engineering: Compute returns, carry, momentum, and macro signals; apply scaling and normalisation.

Strategy Design: Weighted signal combination; object-oriented position and portfolio management.

Backtesting: Simulate historical trades, measure performance metrics, analyse attribution.

Risk Analytics: Historical VaR, Expected Shortfall, drawdowns, Monte Carlo simulations, stress tests.

Documentation & Reporting: Reproducible notebooks, visualisations, final report.

---

## Quantitative Finance Concepts

Returns & Volatility: $R_t = \frac{S_t - S_{t-1}}{S_{t-1}}$, $r_t = \ln(S_t/S_{t-1})$

Covariance & Correlation: Historical and exponentially weighted covariance matrices

Carry & Forward Pricing: Covered Interest Parity (CIP) for forward prices

Momentum: Rolling price changes over defined lookback periods

Risk-Adjusted Performance: Sharpe, Sortino ratios

---

## Role of Macroeconomic Signals

Yield curve slope: Market expectations for rates and growth

Equity indices: Proxy for global growth & risk appetite

Commodity prices: FX pairs sensitive to commodities (e.g., AUDUSD & oil)

Risk sentiment: VIX, MOVE for market stress

---

## Python Implementation

Libraries: NumPy, SciPy, Pandas, Matplotlib, Seaborn

Object-oriented programming for Position and Portfolio

Reproducibility and Git integration

---

## Methodology

Data Acquisition & Validation: Clean, aligned FX, rates, and macro datasets

Feature Engineering: Compute returns, volatility, covariance, carry, momentum, macro signals

Signal Normalisation: z-score/ranking; weighted combinations

Strategy Construction: Long/short rules; Position & Portfolio classes

Backtesting: Daily simulation, PnL, NAV, drawdowns, Sharpe/Sortino

Risk Analytics: Historical VaR, ES, Monte Carlo correlated returns, stress scenarios

Performance Attribution: PnL decomposition by signal & currency

Documentation & Reporting: Notebooks, plots, and final report

---

## Workflow Sections
1. Data Engineering

Acquire FX spot rates, interest rates, and macro variables

Clean & align datasets

Validate indices

2. Feature Construction

Returns: $R_t = \frac{S_t - S_{t-1}}{S_{t-1}}$, $r_t = \ln(S_t/S_{t-1})$

Volatility: $\sigma_t = \sqrt{\frac{1}{N}\sum (r_{t-i}-\bar{r}_t)^2}$

Carry: $F_{t,T} = S_t \frac{1+r^{dom}_t}{1+r^{for}_t}$, $\text{carry}t = \frac{F{t,T}-S_t}{S_t}$

Momentum: $\text{momentum}t = S_t - S{t-n}$

Macro Signals: rate differential, equity growth, VIX z-score

3. Strategy & Portfolio

Combine signals: $\text{score}_t = w_1 \cdot \text{carry}_t + w_2 \cdot \text{macro}_t + w_3 \cdot \text{momentum}_t$

Position & Portfolio classes for sizing, NAV, PnL

4. Backtesting

Daily iteration, open/close positions

Compute NAV, PnL, cumulative returns

Metrics: Sharpe, Sortino, max drawdown

5. Risk & Stress Testing

Rolling VaR & ES

Monte Carlo correlated returns

Macro & FX shocks

6. Performance Attribution

Decompose PnL by signal & currency

7. Reporting

Plots saved to /reports/figures/

Rolling volatility, return distributions, stress test losses

VaR / PnL timeline

---

## Conclusion & Next Steps

### Achievements:

  i.      End-to-end FX strategy pipeline

  ii.     Modular, well-documented Python code

  iii.    Multi-source dataset acquisition & cleaning

  iv.     Signals: returns, volatility, carry, momentum, macro

  v.      Backtesting framework with PnL, NAV, performance metrics

  vi.     Risk analysis & stress testing

  vii.    Signal & currency-level attribution

### Insights:

  i.      Macro-FX interactions

  ii.     Object-oriented quant programming

  iii.    Risk management & scenario analysis

  iv.     Data quality challenges

  v.      Quantitative performance metrics interpretation

### Limitations

  i.      Historical data ≠ future regimes

  ii.     Simplified transaction cost & slippage

  iii.    Macro signals are proxies

  iv.     Monte Carlo assumes normal returns

### Next Steps

  i.      ML for signal enhancement

  ii.     Regime-switching dynamic weights

  iii.    Expand currency universe

  iv.     Integrate derivatives for hedging

  v.      Out-of-sample or pseudo-live validation

  
