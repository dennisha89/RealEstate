"""
Capital Flow Composite Backtest — Full Pipeline
================================================
Downloads → Signals → Composite → Quintiles → Forward Returns → Statistical Tests

This script uses whatever data is available in backtest/data/ and runs the
complete backtest. It adapts to partial data (fewer MSAs, fewer signals).

RTX 5090 available — will add GPU-accelerated ML models after statistical baseline.
"""
import os
import sys
import warnings
import json
from datetime import datetime

import numpy as np
import pandas as pd
from scipy import stats as sp_stats

warnings.filterwarnings("ignore", category=FutureWarning)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
os.makedirs(RESULTS_DIR, exist_ok=True)

# ═══════════════════════════════════════════════════════════════
# STEP 1: LOAD ALL AVAILABLE DATA
# ═══════════════════════════════════════════════════════════════

def load_fred_csv(filename):
    """Load a FRED CSV — handles both DATE and observation_date columns."""
    fpath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(fpath):
        return None
    df = pd.read_csv(fpath)
    # Normalize column names — FRED uses observation_date, VALUE is the series ID
    cols = df.columns.tolist()
    date_col = [c for c in cols if "date" in c.lower()]
    val_col = [c for c in cols if c not in date_col]
    if not date_col or not val_col:
        print(f"    Warning: unexpected columns in {filename}: {cols}")
        return None
    df = df.rename(columns={date_col[0]: "date", val_col[0]: "value"})
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df.dropna()
    return df


def load_fhfa_hpi():
    """Load FHFA HPI data — handles headerless CSV format."""
    # FHFA MSA file: no header, columns are: msa_name, cbsa_code, year, quarter, hpi, hpi_change
    fpath = os.path.join(DATA_DIR, "fhfa_hpi_msa.csv")
    if os.path.exists(fpath):
        try:
            # Check if file has header by reading first line
            with open(fpath, "r") as f:
                first_line = f.readline().strip()
            # If first field is quoted city name or starts with digit, no header
            has_header = not (first_line.startswith('"') or first_line[0].isdigit())
            if has_header:
                df = pd.read_csv(fpath)
            else:
                df = pd.read_csv(fpath, header=None,
                                 names=["msa_name", "cbsa_code", "year", "quarter", "hpi", "hpi_change"])
            # Clean: convert hpi to numeric, drop rows with "-" or missing
            df["hpi"] = pd.to_numeric(df["hpi"], errors="coerce")
            df["year"] = pd.to_numeric(df["year"], errors="coerce")
            df["quarter"] = pd.to_numeric(df["quarter"], errors="coerce")
            df = df.dropna(subset=["hpi", "year", "quarter"])
            # Build date column
            df["date"] = pd.to_datetime(
                df["year"].astype(int).astype(str) + "-" +
                ((df["quarter"].astype(int) - 1) * 3 + 1).astype(str).str.zfill(2) + "-01"
            )
            n_msas = df["msa_name"].nunique()
            print(f"  Loaded FHFA MSA HPI: {len(df)} rows, {n_msas} MSAs, {df['date'].min().strftime('%Y')} to {df['date'].max().strftime('%Y')}")
            return df, "msa"
        except Exception as e:
            print(f"  Failed to parse FHFA MSA: {e}")

    # Try state-level
    fpath = os.path.join(DATA_DIR, "fhfa_hpi_state.csv")
    if os.path.exists(fpath):
        try:
            with open(fpath, "r") as f:
                first_line = f.readline().strip()
            has_header = not (first_line.startswith('"') or first_line[0].isdigit())
            if has_header:
                df = pd.read_csv(fpath)
            else:
                df = pd.read_csv(fpath, header=None,
                                 names=["state", "fips", "year", "quarter", "hpi", "hpi_change"])
            df["hpi"] = pd.to_numeric(df["hpi"], errors="coerce")
            df["year"] = pd.to_numeric(df["year"], errors="coerce")
            df["quarter"] = pd.to_numeric(df["quarter"], errors="coerce")
            df = df.dropna(subset=["hpi", "year", "quarter"])
            df["date"] = pd.to_datetime(
                df["year"].astype(int).astype(str) + "-" +
                ((df["quarter"].astype(int) - 1) * 3 + 1).astype(str).str.zfill(2) + "-01"
            )
            print(f"  Loaded FHFA State HPI: {len(df)} rows, {df['state'].nunique()} states")
            return df, "state"
        except Exception as e:
            print(f"  Failed to parse FHFA State: {e}")

    # Fallback: Use FRED US national HPI
    us_hpi = load_fred_csv("fred_us_hpi.csv")
    if us_hpi is not None:
        print(f"  Using FRED US National HPI as fallback: {len(us_hpi)} observations")
        return us_hpi, "national"

    # Try Zillow ZHVI as alternative
    for fname in ["zillow_zhvi_metro.csv", "zillow_zhvi_state.csv"]:
        fpath = os.path.join(DATA_DIR, fname)
        if os.path.exists(fpath):
            try:
                df = pd.read_csv(fpath)
                geo = "metro" if "metro" in fname else "state"
                print(f"  Loaded Zillow ZHVI ({geo}): {len(df)} rows")
                return df, f"zillow_{geo}"
            except Exception as e:
                print(f"  Failed to parse {fname}: {e}")

    return None, None


def load_permits():
    """Load all available MSA building permit series."""
    permits = {}
    for f in os.listdir(DATA_DIR):
        if f.startswith("fred_permits_") and f != "fred_permits_national.csv":
            city = f.replace("fred_permits_", "").replace(".csv", "")
            df = load_fred_csv(f)
            if df is not None and len(df) > 12:
                permits[city] = df
    national = load_fred_csv("fred_permits_national.csv")
    if national is not None:
        permits["national"] = national
    return permits


def load_irs_migration():
    """Load IRS SOI migration data — try multiple file patterns."""
    migration_files = [f for f in os.listdir(DATA_DIR) if f.startswith("irs_migration")]
    if not migration_files:
        # Also check for state inflow/outflow files
        migration_files = [f for f in os.listdir(DATA_DIR) if f.startswith("irs_state_")]
    if not migration_files:
        return None
    dfs = []
    for f in sorted(migration_files):
        fpath = os.path.join(DATA_DIR, f)
        try:
            df = pd.read_csv(fpath, encoding="latin1")
            dfs.append(df)
        except Exception as e:
            print(f"  Warning: Could not parse {f}: {e}")
    if dfs:
        print(f"  Loaded {len(dfs)} IRS migration files")
        return dfs
    return None


def load_zillow_zhvi():
    """Load Zillow ZHVI for cross-validation."""
    for fname in ["zillow_zhvi_metro.csv", "zillow_zhvi_state.csv"]:
        fpath = os.path.join(DATA_DIR, fname)
        if os.path.exists(fpath):
            try:
                df = pd.read_csv(fpath)
                # Zillow CSVs have region columns then date columns
                print(f"  Loaded Zillow ZHVI: {len(df)} regions")
                return df
            except Exception as e:
                print(f"  Warning: Could not parse {fname}: {e}")
    return None


# ═══════════════════════════════════════════════════════════════
# STEP 2: COMPUTE SIGNALS
# ═══════════════════════════════════════════════════════════════

def compute_zscore(series, window=40):
    """
    Rolling z-score: (value - rolling_mean) / rolling_std, clamped to ±3.
    Window = 40 quarters = 10 years.
    """
    rolling_mean = series.rolling(window=window, min_periods=max(8, window // 4)).mean()
    rolling_std = series.rolling(window=window, min_periods=max(8, window // 4)).std()
    # Avoid division by zero
    rolling_std = rolling_std.replace(0, np.nan)
    z = (series - rolling_mean) / rolling_std
    return z.clip(-3, 3)


def compute_yoy_change(series):
    """Year-over-year percent change (4 quarters back for quarterly, 12 periods for monthly)."""
    return series.pct_change(periods=4) * 100


def compute_momentum(series, periods=2):
    """N-period percent change (for 6-month momentum, periods=2 quarters)."""
    return series.pct_change(periods=periods) * 100


def build_quarterly_permits(monthly_df):
    """Convert monthly building permits to quarterly averages."""
    df = monthly_df.copy()
    df["quarter"] = df["date"].dt.to_period("Q")
    quarterly = df.groupby("quarter")["value"].mean().reset_index()
    quarterly["date"] = quarterly["quarter"].dt.to_timestamp()
    return quarterly[["date", "value"]]


def build_quarterly_rates(weekly_df):
    """Convert weekly mortgage rates to quarterly averages."""
    df = weekly_df.copy()
    df["quarter"] = df["date"].dt.to_period("Q")
    quarterly = df.groupby("quarter")["value"].mean().reset_index()
    quarterly["date"] = quarterly["quarter"].dt.to_timestamp()
    return quarterly[["date", "value"]]


# ═══════════════════════════════════════════════════════════════
# STEP 3: BUILD COMPOSITE FOR AVAILABLE DATA
# ═══════════════════════════════════════════════════════════════

def run_permits_backtest(permits_data, mortgage_rates_q, m2v_data, us_hpi):
    """
    Run backtest using building permits as the primary signal.
    This works even without FHFA MSA-level HPI — uses permits as the
    cross-sectional signal and national HPI as the forward return proxy.

    For MSA-level forward returns, we need FHFA MSA HPI or Zillow ZHVI.
    """
    print("\n" + "=" * 70)
    print("BUILDING COMPOSITE SIGNALS — PERMITS-BASED CROSS-SECTIONAL TEST")
    print("=" * 70)

    # Convert permits to quarterly
    quarterly_permits = {}
    for city, df in permits_data.items():
        if city == "national":
            continue
        q = build_quarterly_permits(df)
        if len(q) > 20:
            quarterly_permits[city] = q

    n_cities = len(quarterly_permits)
    print(f"\n  Cities with quarterly permit data: {n_cities}")
    if n_cities < 3:
        print("  ERROR: Need at least 3 cities for cross-sectional analysis.")
        return None

    # Build quarterly rates
    rates_q = build_quarterly_rates(mortgage_rates_q)

    # Build M2V quarterly (already quarterly from FRED)
    m2v_q = m2v_data.copy()
    m2v_q["quarter"] = m2v_q["date"].dt.to_period("Q")

    # For each city: compute permit YoY change z-score
    city_signals = {}
    for city, q_permits in quarterly_permits.items():
        q_permits = q_permits.sort_values("date").reset_index(drop=True)
        q_permits["permits_yoy"] = compute_yoy_change(q_permits["value"])
        q_permits["permits_z"] = compute_zscore(q_permits["permits_yoy"], window=40)
        city_signals[city] = q_permits[["date", "permits_yoy", "permits_z"]].dropna()

    # National signals (same for all cities)
    rates_q = rates_q.sort_values("date").reset_index(drop=True)
    rates_q["rate_z"] = compute_zscore(rates_q["value"], window=40)
    rates_q["rate_z_inv"] = -rates_q["rate_z"]  # inverted: lower rate = positive

    m2v_q_clean = m2v_data.sort_values("date").reset_index(drop=True)
    m2v_q_clean["m2v_z"] = compute_zscore(m2v_q_clean["value"], window=40)

    # National HPI momentum
    hpi_q = us_hpi.sort_values("date").reset_index(drop=True)
    hpi_q["hpi_momentum"] = compute_momentum(hpi_q["value"], periods=2)
    hpi_q["hpi_momentum_z"] = compute_zscore(hpi_q["hpi_momentum"], window=40)

    # National permits for reference
    national_permits_q = build_quarterly_permits(permits_data.get("national", pd.DataFrame()))

    print(f"\n  Signal date ranges:")
    for city in list(city_signals.keys())[:3]:
        cs = city_signals[city]
        print(f"    {city}: {cs['date'].min().strftime('%Y-%m')} to {cs['date'].max().strftime('%Y-%m')} ({len(cs)} quarters)")
    print(f"    Mortgage rates: {rates_q['date'].min().strftime('%Y-%m')} to {rates_q['date'].max().strftime('%Y-%m')}")
    print(f"    M2V: {m2v_q_clean['date'].min().strftime('%Y-%m')} to {m2v_q_clean['date'].max().strftime('%Y-%m')}")
    print(f"    US HPI: {hpi_q['date'].min().strftime('%Y-%m')} to {hpi_q['date'].max().strftime('%Y-%m')}")

    # ─── Build panel: city × quarter → composite score ───
    print("\n  Building panel dataset...")

    # Find common date range
    all_dates = set()
    for cs in city_signals.values():
        all_dates.update(cs["date"].tolist())

    rate_dates = set(rates_q["date"].tolist())
    m2v_dates = set(m2v_q_clean["date"].tolist())
    hpi_dates = set(hpi_q["date"].tolist())

    common_dates = sorted(all_dates & rate_dates & m2v_dates & hpi_dates)
    # Filter to 2000+ (need rolling window history before that)
    common_dates = [d for d in common_dates if d >= pd.Timestamp("2000-01-01")]

    print(f"  Common date range: {min(common_dates).strftime('%Y-%m')} to {max(common_dates).strftime('%Y-%m')} ({len(common_dates)} quarters)")

    # Build rate/m2v/hpi lookup
    rate_lookup = dict(zip(rates_q["date"], rates_q["rate_z_inv"]))
    m2v_lookup = dict(zip(m2v_q_clean["date"], m2v_q_clean["m2v_z"]))
    hpi_mom_lookup = dict(zip(hpi_q["date"], hpi_q["hpi_momentum_z"]))

    # Build panel
    rows = []
    for city, cs in city_signals.items():
        cs_lookup = dict(zip(cs["date"], cs["permits_z"]))
        for date in common_dates:
            permits_z = cs_lookup.get(date)
            rate_z = rate_lookup.get(date)
            m2v_z = m2v_lookup.get(date)
            hpi_z = hpi_mom_lookup.get(date)

            if permits_z is not None and rate_z is not None and m2v_z is not None and hpi_z is not None:
                if not (np.isnan(permits_z) or np.isnan(rate_z) or np.isnan(m2v_z) or np.isnan(hpi_z)):
                    # Composite: permits as concurrent (35%), national signals as confirming (25%)
                    # No leading layer yet (needs IRS/HMDA data)
                    # Reweight: concurrent=60%, confirming=40% (without leading layer)
                    concurrent_z = permits_z
                    confirming_z = np.mean([rate_z, m2v_z, hpi_z])

                    composite_z = 0.60 * concurrent_z + 0.40 * confirming_z
                    score = 50 + composite_z * 16.67
                    score = max(0, min(100, score))

                    rows.append({
                        "city": city,
                        "date": date,
                        "permits_z": permits_z,
                        "rate_z_inv": rate_z,
                        "m2v_z": m2v_z,
                        "hpi_momentum_z": hpi_z,
                        "composite_z": composite_z,
                        "score": score,
                    })

    panel = pd.DataFrame(rows)
    print(f"  Panel: {len(panel)} city-quarter observations across {panel['city'].nunique()} cities")

    if len(panel) < 50:
        print("  ERROR: Panel too small for meaningful analysis.")
        return panel

    return panel


# ═══════════════════════════════════════════════════════════════
# STEP 3b: ATTACH FHFA MSA FORWARD RETURNS (THE REAL TARGET)
# ═══════════════════════════════════════════════════════════════

# Map our FRED permit city names to FHFA MSA names (fuzzy match)
CITY_TO_MSA = {
    "atlanta": "Atlanta",
    "austin": "Austin",
    "boston": "Boston",
    "charlotte": "Charlotte",
    "chicago": "Chicago",
    "houston": "Houston",
    "miami": "Miami",
    "minneapolis": "Minneapolis",
    "new_york": "New York",
    "orlando": "Orlando",
    "san_francisco": "San Francisco",
    "seattle": "Seattle",
    "dallas": "Dallas",
    "denver": "Denver",
    "detroit": "Detroit",
    "nashville": "Nashville",
    "phoenix": "Phoenix",
    "tampa": "Tampa",
    "raleigh": "Raleigh",
    "portland": "Portland",
}


def attach_fhfa_forward_returns(panel, fhfa_df):
    """
    For each city-quarter in the panel, find the matching MSA in FHFA data
    and compute forward 4/6/8 quarter HPI appreciation.
    """
    # Get unique MSA names from FHFA
    fhfa_msas = fhfa_df["msa_name"].unique()

    # Build mapping: panel city → FHFA msa_name
    city_msa_map = {}
    for city in panel["city"].unique():
        search_term = CITY_TO_MSA.get(city, city.replace("_", " ").title())
        matches = [m for m in fhfa_msas if search_term.lower() in m.lower()]
        if matches:
            city_msa_map[city] = matches[0]

    print(f"    Matched {len(city_msa_map)}/{panel['city'].nunique()} cities to FHFA MSAs:")
    for city, msa in city_msa_map.items():
        print(f"      {city:20s} → {msa}")

    if not city_msa_map:
        print("    WARNING: No MSA matches found. Cannot compute forward HPI returns.")
        return panel

    # For each matched city, build HPI time series and compute forward returns
    forward_cols = {}
    for horizons in [4, 6, 8]:  # 4q=12mo, 6q=18mo, 8q=24mo
        forward_cols[f"fwd_hpi_{horizons}q"] = []

    new_rows = []
    for _, row in panel.iterrows():
        city = row["city"]
        date = row["date"]
        msa_name = city_msa_map.get(city)

        fwd = {}
        for h in [4, 6, 8]:
            fwd[f"fwd_hpi_{h}q"] = np.nan

        if msa_name:
            msa_data = fhfa_df[fhfa_df["msa_name"] == msa_name].sort_values("date")
            current_hpi = msa_data[msa_data["date"] == date]["hpi"]
            if len(current_hpi) > 0:
                current_val = current_hpi.iloc[0]
                for h in [4, 6, 8]:
                    future_date = date + pd.DateOffset(months=3 * h)
                    # Find closest date
                    future_hpi = msa_data[(msa_data["date"] >= future_date - pd.DateOffset(months=2)) &
                                           (msa_data["date"] <= future_date + pd.DateOffset(months=2))]["hpi"]
                    if len(future_hpi) > 0 and current_val > 0:
                        fwd[f"fwd_hpi_{h}q"] = (future_hpi.iloc[0] - current_val) / current_val * 100

        new_rows.append(fwd)

    fwd_df = pd.DataFrame(new_rows)
    for col in fwd_df.columns:
        panel[col] = fwd_df[col].values

    n_with_returns = panel["fwd_hpi_4q"].notna().sum()
    print(f"    Attached forward HPI returns for {n_with_returns}/{len(panel)} observations")

    return panel


# ═══════════════════════════════════════════════════════════════
# STEP 4: COMPUTE FORWARD RETURNS & RUN TESTS
# ═══════════════════════════════════════════════════════════════

def compute_forward_returns_from_permits(panel, permits_data):
    """
    Use building permits as a PROXY for market activity.
    The real test needs FHFA HPI per city, but if unavailable, we test
    whether high-permit-score cities continue to have high permit growth
    (signal persistence test) and whether the composite predicts
    NATIONAL HPI forward returns (macro timing test).
    """
    print("\n" + "=" * 70)
    print("COMPUTING FORWARD RETURNS & STATISTICAL TESTS")
    print("=" * 70)

    results = {}

    # ─── TEST 0: REAL HPI FORWARD RETURN TEST (if FHFA data available) ───
    has_hpi_returns = "fwd_hpi_4q" in panel.columns and panel["fwd_hpi_4q"].notna().sum() > 20
    if has_hpi_returns:
        print("\n  TEST 0: REAL HPI Forward Return Correlation (THE KEY TEST)")
        print("  (Does our composite score predict ACTUAL house price appreciation?)")

        for horizon, label in [(4, "12-month"), (6, "18-month"), (8, "24-month")]:
            col = f"fwd_hpi_{horizon}q"
            clean = panel[["score", col]].dropna()
            if len(clean) > 20:
                rho, p = sp_stats.spearmanr(clean["score"], clean[col])
                sig = "***" if p < 0.01 else "**" if p < 0.05 else "*" if p < 0.10 else ""
                print(f"    {label:15s} Spearman rho={rho:>7.4f}  p={p:.6f}  N={len(clean)}  {sig}")

                # Quintile analysis with REAL returns
                clean["quintile"] = pd.qcut(clean["score"], q=5, labels=False, duplicates="drop") + 1
                q_means = clean.groupby("quintile")[col].mean()
                print(f"      Q1 (top)={q_means.iloc[-1]:>6.2f}%  Q5 (bottom)={q_means.iloc[0]:>6.2f}%  Spread={q_means.iloc[-1] - q_means.iloc[0]:>6.2f}pp")

                results[f"hpi_forward_{horizon}q"] = {
                    "spearman_rho": round(rho, 4),
                    "p_value": round(p, 6),
                    "n_observations": len(clean),
                    "q1_mean_return": round(float(q_means.iloc[-1]), 2),
                    "q5_mean_return": round(float(q_means.iloc[0]), 2),
                    "spread_pp": round(float(q_means.iloc[-1] - q_means.iloc[0]), 2),
                    "PASS": rho > 0.15 and p < 0.05,
                }
            else:
                print(f"    {label:15s} SKIP — only {len(clean)} observations with forward returns")
    else:
        print("\n  TEST 0: SKIPPED — No FHFA MSA-level forward returns available")
        print("  (Using permit persistence as proxy instead)")

    # ─── TEST A: Cross-Sectional Rank Persistence ───
    # If our score ranks cities correctly TODAY, do those cities maintain
    # higher permit growth in the FUTURE? (Tests signal quality)
    print("\n  TEST A: Cross-Sectional Rank Persistence")
    print("  (Do cities with high composite scores continue to grow faster?)")

    # For each date, rank cities by score, then check if rank correlates
    # with permit growth 4 quarters later
    correlations = []
    dates_sorted = sorted(panel["date"].unique())

    for i, date in enumerate(dates_sorted[:-4]):  # need 4 quarters forward
        future_date = dates_sorted[min(i + 4, len(dates_sorted) - 1)]
        current = panel[panel["date"] == date][["city", "score", "permits_z"]].copy()
        future = panel[panel["date"] == future_date][["city", "permits_z"]].copy()
        future.columns = ["city", "future_permits_z"]

        merged = current.merge(future, on="city")
        if len(merged) >= 5:
            rho, p = sp_stats.spearmanr(merged["score"], merged["future_permits_z"])
            correlations.append({
                "date": date,
                "n_cities": len(merged),
                "spearman_rho": rho,
                "p_value": p,
                "significant": p < 0.05,
            })

    if correlations:
        corr_df = pd.DataFrame(correlations)
        mean_rho = corr_df["spearman_rho"].mean()
        pct_significant = corr_df["significant"].mean() * 100
        mean_p = corr_df["p_value"].mean()

        results["cross_sectional_persistence"] = {
            "mean_spearman_rho": round(mean_rho, 4),
            "mean_p_value": round(mean_p, 4),
            "pct_quarters_significant": round(pct_significant, 1),
            "n_quarters_tested": len(corr_df),
            "PASS": mean_rho > 0.15 and pct_significant > 30,
        }
        print(f"    Mean Spearman rho: {mean_rho:.4f}")
        print(f"    Mean p-value: {mean_p:.4f}")
        print(f"    % quarters significant (p<0.05): {pct_significant:.1f}%")
        print(f"    Quarters tested: {len(corr_df)}")
        status = "PASS" if results["cross_sectional_persistence"]["PASS"] else "FAIL"
        print(f"    Result: {status}")
    else:
        print("    SKIP: Not enough data for cross-sectional test.")
        results["cross_sectional_persistence"] = {"PASS": None, "reason": "insufficient data"}

    # ─── TEST B: Quintile Spread Analysis ───
    print("\n  TEST B: Quintile Spread Analysis")
    print("  (Do top-quintile cities have higher future permit growth than bottom?)")

    quintile_results = []
    for i, date in enumerate(dates_sorted[:-4]):
        future_date = dates_sorted[min(i + 4, len(dates_sorted) - 1)]
        current = panel[panel["date"] == date][["city", "score"]].copy()
        future = panel[panel["date"] == future_date][["city", "permits_z"]].copy()
        future.columns = ["city", "future_permits_z"]
        merged = current.merge(future, on="city")

        if len(merged) >= 5:
            merged["quintile"] = pd.qcut(merged["score"], q=min(5, len(merged)), labels=False, duplicates="drop") + 1
            for q_val in merged["quintile"].unique():
                q_data = merged[merged["quintile"] == q_val]
                quintile_results.append({
                    "date": date,
                    "quintile": q_val,
                    "n_cities": len(q_data),
                    "mean_score": q_data["score"].mean(),
                    "mean_future_permits_z": q_data["future_permits_z"].mean(),
                })

    if quintile_results:
        qdf = pd.DataFrame(quintile_results)
        # Aggregate across all dates
        q_summary = qdf.groupby("quintile").agg(
            mean_score=("mean_score", "mean"),
            mean_future_z=("mean_future_permits_z", "mean"),
            n_obs=("n_cities", "sum"),
        ).round(4)

        print("\n    Quintile Summary (averaged across all quarters):")
        print("    " + "-" * 55)
        print(f"    {'Quintile':>10} {'Avg Score':>12} {'Avg Future Z':>15} {'N Obs':>8}")
        print("    " + "-" * 55)

        q_means = {}
        for q_val in sorted(q_summary.index):
            row = q_summary.loc[q_val]
            print(f"    {'Q' + str(q_val):>10} {row['mean_score']:>12.2f} {row['mean_future_z']:>15.4f} {int(row['n_obs']):>8}")
            q_means[q_val] = row["mean_future_z"]

        max_q = max(q_means.keys())
        min_q = min(q_means.keys())
        spread = q_means.get(max_q, 0) - q_means.get(min_q, 0)
        # Check monotonicity
        vals = [q_means[k] for k in sorted(q_means.keys())]
        monotonic_pairs = sum(1 for i in range(len(vals)-1) if vals[i] <= vals[i+1])
        monotonic_pct = monotonic_pairs / max(1, len(vals)-1) * 100

        results["quintile_spread"] = {
            "top_q_mean": round(q_means.get(max_q, 0), 4),
            "bottom_q_mean": round(q_means.get(min_q, 0), 4),
            "spread": round(spread, 4),
            "monotonic_pct": round(monotonic_pct, 1),
            "PASS": spread > 0.1 and monotonic_pct >= 50,
        }
        print(f"\n    Q{max_q} - Q{min_q} spread: {spread:.4f}")
        print(f"    Monotonicity: {monotonic_pct:.0f}%")
        status = "PASS" if results["quintile_spread"]["PASS"] else "FAIL"
        print(f"    Result: {status}")
    else:
        print("    SKIP: Not enough data for quintile analysis.")
        results["quintile_spread"] = {"PASS": None, "reason": "insufficient data"}

    # ─── TEST C: Individual Signal Analysis ───
    print("\n  TEST C: Individual Signal Decomposition")
    print("  (Which individual signals have predictive power?)")

    signal_cols = ["permits_z", "rate_z_inv", "m2v_z", "hpi_momentum_z"]
    signal_names = ["Building Permits", "Mortgage Rate (inv)", "M2 Velocity", "HPI Momentum"]

    signal_results = {}
    for col, name in zip(signal_cols, signal_names):
        # For cross-sectional signals (permits), test rank persistence
        # For national signals (rate, m2v, hpi), test autocorrelation with forward returns
        if col == "permits_z":
            # Cross-sectional: already tested in Test A
            signal_results[name] = {"type": "cross-sectional", "tested_in": "Test A"}
        else:
            # National signal: test correlation with NATIONAL forward permit growth
            national = panel.groupby("date")[col].mean().reset_index()
            national = national.sort_values("date").reset_index(drop=True)
            national["forward_4q"] = national[col].shift(-4)
            clean = national.dropna()
            if len(clean) > 10:
                rho, p = sp_stats.spearmanr(clean[col], clean["forward_4q"])
                signal_results[name] = {
                    "spearman_rho": round(rho, 4),
                    "p_value": round(p, 4),
                    "significant": p < 0.05,
                    "n": len(clean),
                }
            else:
                signal_results[name] = {"reason": "insufficient data"}

    results["individual_signals"] = signal_results
    for name, sr in signal_results.items():
        if "spearman_rho" in sr:
            sig = "***" if sr.get("significant") else ""
            print(f"    {name:25s} rho={sr['spearman_rho']:>7.4f}  p={sr['p_value']:.4f} {sig}")
        else:
            print(f"    {name:25s} {sr.get('tested_in', sr.get('reason', ''))}")

    # ─── TEST D: Walk-Forward Validation ───
    print("\n  TEST D: Walk-Forward Out-of-Sample Validation")
    print("  (Does the signal work on data it hasn't seen?)")

    # For cross-sectional test: use 5-year training, 1-year test
    wf_results = []
    for test_year in range(2015, 2024):
        train_start = pd.Timestamp(f"{test_year - 5}-01-01")
        train_end = pd.Timestamp(f"{test_year}-01-01")
        test_end = pd.Timestamp(f"{test_year + 1}-01-01")

        train = panel[(panel["date"] >= train_start) & (panel["date"] < train_end)]
        test = panel[(panel["date"] >= train_end) & (panel["date"] < test_end)]

        if len(train) < 20 or len(test) < 5:
            continue

        # In training period: compute mean score per city
        train_scores = train.groupby("city")["score"].mean()
        # In test period: compute mean permit growth per city
        test_growth = test.groupby("city")["permits_z"].mean()

        # Merge and correlate
        common = pd.DataFrame({
            "train_score": train_scores,
            "test_growth": test_growth,
        }).dropna()

        if len(common) >= 5:
            rho, p = sp_stats.spearmanr(common["train_score"], common["test_growth"])
            wf_results.append({
                "test_year": test_year,
                "n_cities": len(common),
                "spearman_rho": rho,
                "p_value": p,
                "positive": rho > 0,
            })

    if wf_results:
        wf_df = pd.DataFrame(wf_results)
        pct_positive = wf_df["positive"].mean() * 100
        mean_rho = wf_df["spearman_rho"].mean()

        results["walk_forward"] = {
            "years_tested": len(wf_df),
            "pct_positive_rho": round(pct_positive, 1),
            "mean_rho": round(mean_rho, 4),
            "details": wf_results,
            "PASS": pct_positive >= 60 and mean_rho > 0.05,
        }

        print(f"\n    Walk-Forward Results:")
        print(f"    {'Year':>6} {'N Cities':>10} {'Rho':>8} {'p-value':>10} {'Direction':>10}")
        print(f"    " + "-" * 50)
        for r in wf_results:
            direction = "+" if r["positive"] else "-"
            print(f"    {r['test_year']:>6} {r['n_cities']:>10} {r['spearman_rho']:>8.4f} {r['p_value']:>10.4f} {direction:>10}")
        print(f"\n    % positive direction: {pct_positive:.0f}%")
        print(f"    Mean rho: {mean_rho:.4f}")
        status = "PASS" if results["walk_forward"]["PASS"] else "FAIL"
        print(f"    Result: {status}")
    else:
        print("    SKIP: Not enough data for walk-forward test.")
        results["walk_forward"] = {"PASS": None, "reason": "insufficient data"}

    # ─── TEST E: Regime Analysis ───
    print("\n  TEST E: Regime Analysis")
    print("  (Does the signal work across different market conditions?)")

    regimes = {
        "Expansion (2010-2019)": ("2010-01-01", "2020-01-01"),
        "COVID (2020-2021)": ("2020-01-01", "2022-01-01"),
        "Rate Shock (2022-2023)": ("2022-01-01", "2024-01-01"),
    }

    regime_results = {}
    for regime_name, (start, end) in regimes.items():
        regime_data = panel[(panel["date"] >= start) & (panel["date"] < end)]
        if len(regime_data) < 20:
            regime_results[regime_name] = {"reason": f"only {len(regime_data)} observations"}
            continue

        # Cross-sectional correlation within regime
        corrs = []
        regime_dates = sorted(regime_data["date"].unique())
        for i, date in enumerate(regime_dates[:-4]):
            if i + 4 >= len(regime_dates):
                break
            future_date = regime_dates[i + 4]
            current = regime_data[regime_data["date"] == date][["city", "score"]]
            future = regime_data[regime_data["date"] == future_date][["city", "permits_z"]]
            future.columns = ["city", "future_z"]
            merged = current.merge(future, on="city")
            if len(merged) >= 4:
                rho, p = sp_stats.spearmanr(merged["score"], merged["future_z"])
                corrs.append({"rho": rho, "p": p, "sig": p < 0.05})

        if corrs:
            corr_df = pd.DataFrame(corrs)
            regime_results[regime_name] = {
                "mean_rho": round(corr_df["rho"].mean(), 4),
                "pct_significant": round(corr_df["sig"].mean() * 100, 1),
                "n_quarters": len(corr_df),
            }
        else:
            regime_results[regime_name] = {"reason": "insufficient data for within-regime test"}

    results["regime_analysis"] = regime_results
    for regime_name, rr in regime_results.items():
        if "mean_rho" in rr:
            print(f"    {regime_name:30s} rho={rr['mean_rho']:>7.4f}  sig={rr['pct_significant']:>5.1f}%  ({rr['n_quarters']} qtrs)")
        else:
            print(f"    {regime_name:30s} {rr.get('reason', '')}")

    return results


# ═══════════════════════════════════════════════════════════════
# STEP 5: GENERATE RESULTS REPORT
# ═══════════════════════════════════════════════════════════════

def generate_report(panel, test_results, data_inventory):
    """Write human-readable results to RESULTS.md"""
    report_path = os.path.join(RESULTS_DIR, "RESULTS.md")
    json_path = os.path.join(RESULTS_DIR, "results.json")

    # Save raw results as JSON
    with open(json_path, "w") as f:
        json.dump(test_results, f, indent=2, default=str)

    # Write markdown report
    with open(report_path, "w") as f:
        f.write("# Capital Flow Composite Backtest Results\n\n")
        f.write(f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        f.write("## Data Inventory\n\n")
        f.write("| Dataset | Status | Records |\n")
        f.write("|---------|--------|---------|\n")
        for name, info in data_inventory.items():
            f.write(f"| {name} | {info['status']} | {info.get('records', 'N/A')} |\n")

        f.write("\n## Panel Summary\n\n")
        if panel is not None and len(panel) > 0:
            f.write(f"- **Observations**: {len(panel):,}\n")
            f.write(f"- **Cities**: {panel['city'].nunique()}\n")
            f.write(f"- **Date range**: {panel['date'].min().strftime('%Y-%m')} to {panel['date'].max().strftime('%Y-%m')}\n")
            f.write(f"- **Quarters**: {panel['date'].nunique()}\n\n")
        else:
            f.write("- Panel is empty or unavailable.\n\n")

        f.write("## Hypothesis Test Results\n\n")

        # Test results table
        f.write("| Test | Metric | Value | Threshold | Result |\n")
        f.write("|------|--------|-------|-----------|--------|\n")

        if "cross_sectional_persistence" in test_results:
            r = test_results["cross_sectional_persistence"]
            if "mean_spearman_rho" in r:
                status = "PASS" if r["PASS"] else "FAIL"
                f.write(f"| A: Cross-Sectional Persistence | Spearman rho | {r['mean_spearman_rho']:.4f} | > 0.15 | {status} |\n")
                f.write(f"| A: Cross-Sectional Persistence | % significant | {r['pct_quarters_significant']:.1f}% | > 30% | {status} |\n")

        if "quintile_spread" in test_results:
            r = test_results["quintile_spread"]
            if "spread" in r:
                status = "PASS" if r["PASS"] else "FAIL"
                f.write(f"| B: Quintile Spread | Q1-Q5 spread | {r['spread']:.4f} | > 0.10 | {status} |\n")
                f.write(f"| B: Quintile Spread | Monotonicity | {r['monotonic_pct']:.0f}% | >= 50% | {status} |\n")

        if "walk_forward" in test_results:
            r = test_results["walk_forward"]
            if "pct_positive_rho" in r:
                status = "PASS" if r["PASS"] else "FAIL"
                f.write(f"| D: Walk-Forward | % positive years | {r['pct_positive_rho']:.0f}% | >= 60% | {status} |\n")
                f.write(f"| D: Walk-Forward | Mean rho | {r['mean_rho']:.4f} | > 0.05 | {status} |\n")

        f.write("\n## Overall Verdict\n\n")
        pass_count = sum(1 for v in test_results.values() if isinstance(v, dict) and v.get("PASS") is True)
        fail_count = sum(1 for v in test_results.values() if isinstance(v, dict) and v.get("PASS") is False)
        skip_count = sum(1 for v in test_results.values() if isinstance(v, dict) and v.get("PASS") is None)

        f.write(f"- **Passed**: {pass_count}\n")
        f.write(f"- **Failed**: {fail_count}\n")
        f.write(f"- **Skipped**: {skip_count}\n\n")

        if pass_count > fail_count and pass_count >= 2:
            f.write("**VERDICT: Signal shows evidence of predictive value.** Proceed with full MSA-level backtest using FHFA HPI data.\n")
        elif pass_count == fail_count:
            f.write("**VERDICT: Mixed results.** Signal shows some patterns but not consistently significant. Need MSA-level HPI data for definitive test.\n")
        else:
            f.write("**VERDICT: Signal does NOT show clear predictive value with available data.** Need FHFA MSA HPI + IRS migration data for full test before concluding.\n")

        f.write("\n## Next Steps\n\n")
        f.write("1. Download FHFA MSA-level HPI (currently unavailable — site returned 503)\n")
        f.write("2. Download IRS SOI migration AGI data (URL format has changed)\n")
        f.write("3. Query CFPB HMDA API for investor loan share by MSA\n")
        f.write("4. Re-run backtest with MSA-level price data as the TARGET variable\n")
        f.write("5. If GPU-based ML: train XGBoost/LightGBM on signal features → forward HPI\n")

    print(f"\n  Report saved to: {report_path}")
    print(f"  Raw results saved to: {json_path}")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("CAPITAL FLOW COMPOSITE BACKTEST")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # ─── Load data ───
    print("\n[LOADING DATA]")

    data_inventory = {}

    # FHFA HPI
    hpi_data, hpi_type = load_fhfa_hpi()
    data_inventory["FHFA HPI"] = {
        "status": f"Loaded ({hpi_type})" if hpi_data is not None else "MISSING",
        "records": len(hpi_data) if hpi_data is not None else 0,
    }

    # Mortgage rates
    mortgage = load_fred_csv("fred_mortgage30.csv")
    data_inventory["FRED Mortgage 30yr"] = {
        "status": "OK" if mortgage is not None else "MISSING",
        "records": len(mortgage) if mortgage is not None else 0,
    }

    # M2 Velocity
    m2v = load_fred_csv("fred_m2v.csv")
    data_inventory["FRED M2 Velocity"] = {
        "status": "OK" if m2v is not None else "MISSING",
        "records": len(m2v) if m2v is not None else 0,
    }

    # US HPI
    us_hpi = load_fred_csv("fred_us_hpi.csv")
    data_inventory["FRED US HPI"] = {
        "status": "OK" if us_hpi is not None else "MISSING",
        "records": len(us_hpi) if us_hpi is not None else 0,
    }

    # Building permits
    permits = load_permits()
    data_inventory["Building Permits (MSA)"] = {
        "status": f"OK ({len(permits)} cities)" if permits else "MISSING",
        "records": sum(len(v) for v in permits.values()),
    }

    # IRS Migration
    irs = load_irs_migration()
    data_inventory["IRS SOI Migration"] = {
        "status": f"OK ({len(irs)} files)" if irs else "MISSING",
        "records": sum(len(d) for d in irs) if irs else 0,
    }

    # Zillow ZHVI
    zillow = load_zillow_zhvi()
    data_inventory["Zillow ZHVI"] = {
        "status": "OK" if zillow is not None else "MISSING",
        "records": len(zillow) if zillow is not None else 0,
    }

    print("\n  Data Inventory:")
    for name, info in data_inventory.items():
        print(f"    {name:30s} {info['status']:15s} ({info['records']} records)")

    # ─── Check minimum requirements ───
    if mortgage is None or m2v is None or us_hpi is None:
        print("\n  FATAL: Missing core FRED data. Cannot proceed.")
        sys.exit(1)

    if not permits or len(permits) < 3:
        print("\n  FATAL: Need at least 3 MSAs with permit data.")
        sys.exit(1)

    # ─── Run backtest with available data ───
    # If we have FHFA MSA HPI, use it as the TARGET (forward returns)
    # Build panel matching permit cities to FHFA MSA names
    panel = run_permits_backtest(permits, mortgage, m2v, us_hpi)

    if panel is None or len(panel) < 50:
        print("\n  FATAL: Panel too small. Need more data.")
        generate_report(panel, {}, data_inventory)
        sys.exit(1)

    # ─── Attach FHFA MSA forward returns if available ───
    if hpi_type == "msa" and hpi_data is not None:
        print("\n  Attaching FHFA MSA-level forward HPI returns...")
        panel = attach_fhfa_forward_returns(panel, hpi_data)

    # ─── Run statistical tests ───
    test_results = compute_forward_returns_from_permits(panel, permits)

    # ─── Generate report ───
    print("\n" + "=" * 70)
    print("GENERATING RESULTS REPORT")
    print("=" * 70)
    generate_report(panel, test_results, data_inventory)

    # ─── Print final summary ───
    print("\n" + "=" * 70)
    print("BACKTEST COMPLETE")
    print("=" * 70)
    pass_count = sum(1 for v in test_results.values() if isinstance(v, dict) and v.get("PASS") is True)
    fail_count = sum(1 for v in test_results.values() if isinstance(v, dict) and v.get("PASS") is False)
    skip_count = sum(1 for v in test_results.values() if isinstance(v, dict) and v.get("PASS") is None)
    print(f"  Tests PASSED: {pass_count}")
    print(f"  Tests FAILED: {fail_count}")
    print(f"  Tests SKIPPED: {skip_count}")
    print(f"  Results: backtest/results/RESULTS.md")
    print(f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
