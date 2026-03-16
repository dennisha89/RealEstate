# Capital Flow Composite Backtest Results

**Generated**: 2026-03-16 11:46:01

## Data Inventory

| Dataset | Status | Records |
|---------|--------|---------|
| FHFA HPI | Loaded (msa) | 70243 |
| FRED Mortgage 30yr | OK | 2858 |
| FRED M2 Velocity | OK | 224 |
| FRED US HPI | OK | 204 |
| Building Permits (MSA) | OK (32 cities) | 14784 |
| IRS SOI Migration | OK (12 files) | 68227 |
| Zillow ZHVI | OK | 895 |

## Panel Summary

- **Observations**: 3,216
- **Cities**: 31
- **Date range**: 2000-01 to 2025-10
- **Quarters**: 104

## Hypothesis Test Results

| Test | Metric | Value | Threshold | Result |
|------|--------|-------|-----------|--------|
| A: Cross-Sectional Persistence | Spearman rho | -0.2751 | > 0.15 | FAIL |
| A: Cross-Sectional Persistence | % significant | 31.0% | > 30% | FAIL |
| B: Quintile Spread | Q1-Q5 spread | -0.6469 | > 0.10 | FAIL |
| B: Quintile Spread | Monotonicity | 0% | >= 50% | FAIL |
| D: Walk-Forward | % positive years | 44% | >= 60% | FAIL |
| D: Walk-Forward | Mean rho | -0.0340 | > 0.05 | FAIL |

## Overall Verdict

- **Passed**: 0
- **Failed**: 0
- **Skipped**: 2

**VERDICT: Mixed results.** Signal shows some patterns but not consistently significant. Need MSA-level HPI data for definitive test.

## Next Steps

1. Download FHFA MSA-level HPI (currently unavailable — site returned 503)
2. Download IRS SOI migration AGI data (URL format has changed)
3. Query CFPB HMDA API for investor loan share by MSA
4. Re-run backtest with MSA-level price data as the TARGET variable
5. If GPU-based ML: train XGBoost/LightGBM on signal features → forward HPI
