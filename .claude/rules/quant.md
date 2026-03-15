---
globs: "**/engines/dcf-*,**/engines/monte-carlo-*,**/engines/waterfall-*,**/engines/stress-test-*,**/engines/market-forecast-*,**/engines/bubble-detection-*,**/engines/leading-indicator-*,**/engines/capital-flow-composite-*,**/engines/stacked-signal-*,**/engines/timing-*"
---

# Quantitative Modeling Rules

## Numerical Precision
- All monetary values as integer cents. Convert to dollars only for display.
- Use `Math.round()` for intermediate calculations, never `Math.floor()` or truncation.
- IRR calculations use Newton-Raphson with convergence tolerance of 1e-8 and max 100 iterations.
- Percentages stored as decimals (0.065 not 6.5). Convert only for display.

## Monte Carlo Standards
- Minimum 10,000 iterations for convergence. Verify convergence by comparing P50 at N=5000 vs N=10000.
- Use seeded PRNG (Mulberry32) for reproducibility — same inputs must produce same distribution.
- Correlated variables use Cholesky decomposition — never simulate rent growth and vacancy independently.
- Report percentiles: P10, P25, P50, P75, P90. Never just mean/median.
- Default correlations sourced from NCREIF/Cornell research. Cite source in code comments.

## DCF Standards
- Explicit hold period (default 5-10 years).
- Terminal value via exit cap rate method OR Gordon Growth — state which and why.
- Discount rate = WACC or investor required return. Research current risk-free rate before defaulting.
- Sensitivity table: vary discount rate (rows) vs exit cap rate (columns) in 25bps increments.
- NPV must handle mid-year vs end-of-year convention — state which is used.

## Statistical Validation
- Z-scores require minimum 10-year rolling window (120 monthly observations).
- Bubble detection thresholds: 2σ = elevated, 3σ = critical (Dallas Fed methodology).
- Leading indicators must cite lead time and historical correlation coefficient.
- Always report R² and sample size when claiming predictive power.

## Backtesting
- No look-ahead bias — process data strictly in chronological order.
- Walk-forward validation: train on N years, test on next year, slide window.
- Report both in-sample and out-of-sample performance.
- Survivorship bias: include delisted/foreclosed properties in historical datasets.

## Stress Testing
- Always run minimum 3 scenarios: base, downside, severe downside.
- Downside must include: rate shock (+200bps), vacancy spike (2x), rent decline (-10%).
- Report break-even points: break-even vacancy rate, break-even interest rate, months of reserves.
- Stress test results must show whether DSCR stays above 1.0 in each scenario.

## Output Standards
- Every quantitative output includes: point estimate, confidence interval, and methodology label.
- Cite academic/industry source for any methodology (Dallas Fed, Cornell, BIS, NCREIF).
- Flag when input data is insufficient for the model (e.g., <5 years of history for trend analysis).
- Unit tests required for every formula. Test against hand-calculated known values.
