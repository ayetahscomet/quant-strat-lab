# src/quantpkg/config.py

from dataclasses import dataclass

@dataclass
class Config:
    mu: float = 0.0
    alpha: float = 0.01
    beta: float = 0.95
    xi: float = 0.002
    sigma0: float = 0.01
    dt: float = 1 / 252
    n_steps: int = 500
    seed: int = 42
    window: int = 20
    theta: float = 1.0
    freq_per_year: int = 252
    initial_capital: float = 1e5