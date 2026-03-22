---
name: backtest-signal
description: Run a full backtest on a new signal hypothesis against forward HPI returns. Use when testing whether a new data source predicts housing price changes.
---

# Backtest a New Signal

## Steps

1. Read `backtest/02_build_signals_and_test.py` to understand the existing methodology
2. Download the new data source to `backtest/data/`
3. Create a new script: `backtest/XX_test_[signal_name].py`
4. Build MSA-level panel matching FHFA HPI dates
5. Compute z-scores using 3-year rolling windows
6. Test Spearman rho vs forward 12/18/24 month HPI change
7. Run quintile analysis (sort into 5 buckets, measure forward returns per bucket)
8. Run walk-forward: train on years 1-T, test on T+1, slide forward
9. Generate charts using matplotlib (dark theme: bg=#000000, gold=#C9A227, emerald=#10B981, rose=#EF4444)
10. Write results to `backtest/results/`
11. Update `backtest/results/RESULTS.md` with findings

## Pass/Fail Criteria

- **PASS**: rho > 0.10, p < 0.01, Q1-Q5 spread > 5pp, walk-forward positive > 60% of years
- **CONDITIONAL**: rho > 0.05 with small sample — needs more data before production use
- **FAIL**: rho < 0.05 or p > 0.05 — do NOT include in production scoring

## Independence Test

After signal passes, compute Pearson correlation with ALL existing validated signals:
- Building permits z-score
- HPI momentum
- Mortgage rate environment

If correlation > 0.70 with any existing signal, the new signal is REDUNDANT — keep the one with higher rho and discard the other.

## Output Requirements

1. Spearman rho + p-value for 12/18/24 month horizons
2. Quintile return table (Q1-Q5 with mean, median, std)
3. Walk-forward accuracy table (year-by-year)
4. Independence correlation matrix
5. Chart: quintile spread bar chart
6. Chart: walk-forward performance line chart
7. Summary verdict: PASS / CONDITIONAL / FAIL with reasoning

## Data Already Available

- FHFA HPI: 410 MSAs, 1975-2025 (TARGET)
- FRED permits: 31 MSAs
- Redfin months-of-supply: 932 metros, 2012-2026
- FRED employment: 31 MSAs, 1990-2025
- Zillow ZHVI: 895 metros
- FRED macro: rates, M2V, national HPI
