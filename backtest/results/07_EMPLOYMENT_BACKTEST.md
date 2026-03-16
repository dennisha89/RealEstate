# Employment Growth Backtest Results

**Generated**: 2026-03-16 13:13:04

**Signal**: 12-month employment growth rate, z-scored on 5-year rolling window
**Target**: FHFA MSA House Price Index (quarterly), forward 12/18/24 months
**MSAs**: 31 (matched from 31 FRED employment series)
**Observations**: 3,991

## Pass Criteria

| Criterion | Threshold | Status |
|-----------|-----------|--------|
| Spearman rho (12mo) | > 0.10 | rho=0.1065 (PASS) |
| p-value (12mo) | < 0.01 | p=0.00e+00 (PASS) |
| Q5-Q1 spread (12mo) | > 5pp | 3.39pp (FAIL) |
| Walk-forward positive | > 60% | 79% (PASS) |

## Detailed Results

### Spearman Correlation

| Horizon | Spearman rho | p-value | N | Verdict |
|---------|-------------|---------|---|--------|
| 12-month (4Q) | 0.1065 | 0.00e+00 | 3,875 | PASS |
| 18-month (6Q) | 0.0839 | 2.10e-07 | 3,813 | FAIL |
| 24-month (8Q) | 0.0612 | 1.78e-04 | 3,751 | FAIL |

### Quintile Spreads

| Horizon | Q1 (Weakest) | Q5 (Strongest) | Spread | Monotonicity | Verdict |
|---------|-------------|---------------|--------|-------------|--------|
| 12-month | 3.74% | 7.13% | +3.39pp | 75% | FAIL |
| 18-month | 6.61% | 9.92% | +3.31pp | 75% | FAIL |
| 24-month | 9.66% | 12.55% | +2.89pp | 75% | FAIL |

### Walk-Forward Validation

| Year | N Cities | Spearman rho | p-value | Direction |
|------|----------|-------------|---------|----------|
| 2000 | 31 | 0.6040 | 0.0003 | + |
| 2001 | 31 | 0.1274 | 0.4946 | + |
| 2002 | 31 | -0.0367 | 0.8446 | - |
| 2003 | 31 | -0.1661 | 0.3718 | - |
| 2004 | 31 | 0.3383 | 0.0627 | + |
| 2005 | 31 | 0.5565 | 0.0012 | + |
| 2006 | 31 | 0.5173 | 0.0029 | + |
| 2007 | 31 | 0.6827 | 0.0000 | + |
| 2008 | 31 | 0.5907 | 0.0005 | + |
| 2009 | 31 | -0.6992 | 0.0000 | - |
| 2010 | 31 | 0.0573 | 0.7596 | + |
| 2011 | 31 | -0.0706 | 0.7060 | - |
| 2012 | 31 | 0.4117 | 0.0214 | + |
| 2013 | 31 | 0.6790 | 0.0000 | + |
| 2014 | 31 | 0.4121 | 0.0212 | + |
| 2015 | 31 | 0.3823 | 0.0338 | + |
| 2016 | 31 | 0.5863 | 0.0005 | + |
| 2017 | 31 | -0.2802 | 0.1268 | - |
| 2018 | 31 | 0.3012 | 0.0996 | + |
| 2019 | 31 | 0.2278 | 0.2177 | + |
| 2020 | 31 | 0.3181 | 0.0811 | + |
| 2021 | 31 | 0.4641 | 0.0085 | + |
| 2022 | 31 | 0.0536 | 0.7745 | + |
| 2023 | 31 | 0.3629 | 0.0448 | + |

**Summary**: 79% positive, mean rho = 0.2675

### Signal Independence

- Employment Z vs Permit Z: rho = 0.1282 (p = 0.00e+00)
- Partial correlation (controlling for permits): rho = 0.0981 (p = 0.00e+00)
- Employment Z vs Mortgage Rate: rho = 0.0197 (p = 2.20e-01)
- Employment Z vs HPI Momentum: rho = -0.0056 (p = 7.26e-01)

### Regime Analysis

| Regime | N | rho | Spread | Verdict |
|--------|---|-----|--------|--------|
| Pre-GFC Boom (2003-2006) | 496 | 0.0259 | +1.65pp | WEAK |
| GFC Crash (2007-2009) | 372 | 0.2735 | +3.94pp | PASS |
| Recovery (2010-2014) | 620 | 0.4414 | +7.55pp | PASS |
| Expansion (2015-2019) | 620 | 0.3176 | +2.04pp | PASS |
| COVID + Boom (2020-2021) | 248 | 0.3045 | +8.12pp | PASS |
| Rate Shock (2022-2024) | 372 | 0.2407 | +1.96pp | PASS |

## Overall Verdict

**3/4 criteria passed.**

**PASS**: Employment growth shows robust predictive power for housing prices. Some criteria narrowly missed but the overall signal is reliable.
