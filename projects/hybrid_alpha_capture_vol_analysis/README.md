# --- Hybrid Alpha Capture and Volatility Conditioning Analysis ---

(A) DATA & IDEA GENERATION (FOUNDATION)

        A1  Synthetic FX Price Generator (multivariate with regime-switching / GARCH-like vol)
        A2  Synthetic analysis/idea generator (timestamped ideas with sentiment, confidence, horizon)

(B) SIGNAL ENGINEERING (ALPHA CAPTURE, INSPIRED BY MARSHALL WACE'S PTRADE OPTIMISATION PORTFOLIO SYSTEM)

        B1  Alpha aggregation (decay, confidence-weighting)
        B2  Signal normalisation & simple filters (age decay, min confidence)

(C) VOLATILITY REGIME ENGINE (INSPIRED BY MSC DISSERTATION WORK)

        C1  GARCH volatility estimator / rolling vol / regime flags
        C2  Regime classification thresholds & diagnostics

(D) PORTFOLIO CONSTRUCTION & RISK CONTROLS

        D1  Weighting scheme (score normalisation, leverage, volatility targeting)
        D2  Position sizing (DV01 / notional cpas / max exposure)
        D3  Transaction cost model & slippage

(E) BACKTEST & EVALUATION

        E1  Backtest engine (PnL, NAV, turnover, transaction costs)
        E2  Risk metrics (SHarpe, Sortino, MaxDD, VaR)
        E3  Scenario & stress testing (shock tests + crisis replay)

(F) ROBUSTNESS, SENSITIVITY, & REPORTING
        
        F1  Parameter sensitivity (decay, confidence weight, regime thresholds)
        F2  Ablation tests (alpha only vs alpha + regime)
        F3  Final notebook / report / one-page summary