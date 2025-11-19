# main.py

"""
Main controller for the Risk Analytics Engine Project.

This script runs:
    - Data loading
    - Portfolio creation
    - PnL simulation
    - VaR & ES models
    - PCA diagnostics
    - Stress tests
    - Reporting & logging

It serves as the top-level orchestrator for the entire pipeline.
"""

from src.experiments.run_full_pipeline import run_pipeline
from src.utlis.logging_setup import init_logger


def main():
    logger = init_logger("main")
    logger.info("Starting Full Risk Engine Pipeline...")

    results = run_pipeline()

    logger.info("Pipeline Completed. Summary:")
    for k, v in results.items():
        logger.info(f"{k}: {v}")

    print("\n=== FINAL PIPELINE SUMMARY ===")
    for k, v in results.items():
        print(f"{k}: {v}")


if __name__ == "__main__":
    main()
