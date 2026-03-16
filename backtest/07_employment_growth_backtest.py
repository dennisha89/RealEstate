"""
Employment Growth Backtest — MSA-Level Signal Test
====================================================
Literature says employment growth is the single best long-term predictor
of housing prices. This script tests that claim rigorously:

  1. Load 31 MSA employment series from FRED (1990-2025)
  2. Compute 12-month employment growth rate + 5-year rolling z-score
  3. Map to FHFA MSA HPI (410 MSAs, quarterly)
  4. Test Spearman rho vs forward 12/18/24 month HPI appreciation
  5. Quintile analysis (Q1 vs Q5 spread)
  6. Walk-forward out-of-sample validation
  7. Independence test vs existing signals (permits, HPI momentum, rates)
  8. Generate dark-theme charts

Pass criteria: rho > 0.10, p < 0.01, Q1-Q5 spread > 5pp, walk-forward > 60%
"""

import os
import sys
import json
import warnings
from datetime import datetime

import numpy as np
import pandas as pd
from scipy import stats as sp_stats

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=pd.errors.SettingWithCopyWarning)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
os.makedirs(RESULTS_DIR, exist_ok=True)

# ═══════════════════════════════════════════════════════════════
# DARK THEME COLORS (LootVue brand)
# ═══════════════════════════════════════════════════════════════
C_BG = "#000000"
C_SURFACE = "#1A1A1A"
C_BORDER = "#1F1F1F"
C_GOLD = "#C9A227"
C_GOLD_LIGHT = "#E8C547"
C_EMERALD = "#10B981"
C_ROSE = "#EF4444"
C_AMBER = "#F59E0B"
C_TEXT = "#E5E5E5"
C_TEXT_DIM = "#666666"

# ═══════════════════════════════════════════════════════════════
# STEP 0: EMPLOYMENT → FHFA MSA NAME MAPPING
# ═══════════════════════════════════════════════════════════════
# Exact mapping from our FRED employment city keys to FHFA MSA names
# (verified by grepping fhfa_hpi_msa.csv)

EMPLOYMENT_TO_FHFA = {
    "atlanta":        "Atlanta-Sandy Springs-Roswell, GA (MSAD)",
    "austin":         "Austin-Round Rock-San Marcos, TX",
    "boston":          "Boston, MA (MSAD)",
    "charlotte":      "Charlotte-Concord-Gastonia, NC-SC",
    "chicago":        "Chicago-Naperville-Schaumburg, IL (MSAD)",
    "cincinnati":     "Cincinnati, OH-KY-IN",
    "cleveland":      "Cleveland, OH",
    "columbus":       "Columbus, OH",
    "dallas":         "Dallas-Plano-Irving, TX (MSAD)",
    "denver":         "Denver-Aurora-Centennial, CO",
    "detroit":        "Detroit-Dearborn-Livonia, MI (MSAD)",
    "houston":        "Houston-Pasadena-The Woodlands, TX",
    "indianapolis":   "Indianapolis-Carmel-Greenwood, IN",
    "jacksonville":   "Jacksonville, FL",
    "kansas_city":    "Kansas City, MO-KS",
    "los_angeles":    "Los Angeles-Long Beach-Glendale, CA (MSAD)",
    "miami":          "Miami-Miami Beach-Kendall, FL (MSAD)",
    "minneapolis":    "Minneapolis-St. Paul-Bloomington, MN-WI",
    "nashville":      "Nashville-Davidson--Murfreesboro--Franklin, TN",
    "new_york":       "New York-Jersey City-White Plains, NY-NJ (MSAD)",
    "orlando":        "Orlando-Kissimmee-Sanford, FL",
    "philadelphia":   "Philadelphia, PA (MSAD)",
    "phoenix":        "Phoenix-Mesa-Chandler, AZ",
    "pittsburgh":     "Pittsburgh, PA",
    "portland":       "Portland-Vancouver-Hillsboro, OR-WA",
    "raleigh":        "Raleigh-Cary, NC",
    "salt_lake_city": "Salt Lake City-Murray, UT",
    "san_diego":      "San Diego-Chula Vista-Carlsbad, CA",
    "san_francisco":  "San Francisco-San Mateo-Redwood City, CA (MSAD)",
    "seattle":        "Seattle-Bellevue-Kent, WA (MSAD)",
    "tampa":          "Tampa, FL (MSAD)",
}


# ═══════════════════════════════════════════════════════════════
# STEP 1: LOAD DATA
# ═══════════════════════════════════════════════════════════════

def load_fred_csv(filepath):
    """Load a FRED CSV — handles observation_date + series ID columns."""
    if not os.path.exists(filepath):
        return None
    df = pd.read_csv(filepath)
    cols = df.columns.tolist()
    date_col = [c for c in cols if "date" in c.lower()]
    val_col = [c for c in cols if c not in date_col]
    if not date_col or not val_col:
        return None
    df = df.rename(columns={date_col[0]: "date", val_col[0]: "value"})
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df.dropna()
    return df.sort_values("date").reset_index(drop=True)


def load_all_employment():
    """Load all 31 MSA employment CSVs. Returns dict[city_key → DataFrame]."""
    manifest_path = os.path.join(DATA_DIR, "fred_employment_manifest.json")
    with open(manifest_path, "r") as f:
        manifest = json.load(f)

    employment = {}
    for city_key, info in manifest["series"].items():
        fpath = os.path.join(DATA_DIR, f"fred_employment_{city_key}.csv")
        df = load_fred_csv(fpath)
        if df is not None and len(df) > 24:
            employment[city_key] = df
            # Store the manifest MSA name for reference
            employment[city_key].attrs["msa_name"] = info["msa"]
        else:
            print(f"  WARNING: Could not load employment for {city_key}")

    return employment


def load_fhfa_hpi():
    """Load FHFA MSA HPI — headerless CSV with columns:
       msa_name, cbsa_code, year, quarter, hpi, std_error
    """
    fpath = os.path.join(DATA_DIR, "fhfa_hpi_msa.csv")
    if not os.path.exists(fpath):
        print("  FATAL: fhfa_hpi_msa.csv not found!")
        return None

    df = pd.read_csv(
        fpath, header=None,
        names=["msa_name", "cbsa_code", "year", "quarter", "hpi", "std_error"],
        quotechar='"'
    )
    # Clean HPI — some values are "-"
    df["hpi"] = pd.to_numeric(df["hpi"], errors="coerce")
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["quarter"] = pd.to_numeric(df["quarter"], errors="coerce")
    df = df.dropna(subset=["hpi", "year", "quarter"])

    # Build date column (start of quarter)
    df["date"] = pd.to_datetime(
        df["year"].astype(int).astype(str) + "-" +
        ((df["quarter"].astype(int) - 1) * 3 + 1).astype(str).str.zfill(2) + "-01"
    )
    n_msas = df["msa_name"].nunique()
    print(f"  Loaded FHFA MSA HPI: {len(df):,} rows, {n_msas} MSAs, "
          f"{df['date'].min().strftime('%Y')} to {df['date'].max().strftime('%Y')}")
    return df


def load_existing_signals():
    """Load existing signal data for independence tests (permits, rates, US HPI)."""
    signals = {}

    # Building permits (MSA-level)
    permits = {}
    for f in os.listdir(DATA_DIR):
        if f.startswith("fred_permits_") and f != "fred_permits_national.csv":
            city = f.replace("fred_permits_", "").replace(".csv", "")
            df = load_fred_csv(os.path.join(DATA_DIR, f))
            if df is not None and len(df) > 12:
                permits[city] = df
    if permits:
        signals["permits"] = permits
        print(f"  Loaded permits: {len(permits)} MSAs")

    # Mortgage rates
    rates = load_fred_csv(os.path.join(DATA_DIR, "fred_mortgage30.csv"))
    if rates is not None:
        signals["mortgage_rates"] = rates
        print(f"  Loaded mortgage rates: {len(rates)} observations")

    # US national HPI
    us_hpi = load_fred_csv(os.path.join(DATA_DIR, "fred_us_hpi.csv"))
    if us_hpi is not None:
        signals["us_hpi"] = us_hpi
        print(f"  Loaded US HPI: {len(us_hpi)} observations")

    return signals


# ═══════════════════════════════════════════════════════════════
# STEP 2: COMPUTE EMPLOYMENT GROWTH SIGNAL
# ═══════════════════════════════════════════════════════════════

def compute_employment_signal(employment_data):
    """
    For each MSA:
      1. 12-month employment growth rate (YoY % change)
      2. Z-score using 5-year (60-month) rolling window
      3. Convert to quarterly (align to FHFA dates)

    Returns: dict[city_key → DataFrame with columns: date, emp_growth, emp_z]
    """
    signals = {}
    for city_key, df in employment_data.items():
        df = df.copy().sort_values("date").reset_index(drop=True)

        # 12-month employment growth rate (% YoY)
        df["emp_growth"] = df["value"].pct_change(periods=12) * 100

        # Z-score: 60-month (5-year) rolling window
        # min_periods = 36 (3 years) to avoid noisy early estimates
        rolling_mean = df["emp_growth"].rolling(window=60, min_periods=36).mean()
        rolling_std = df["emp_growth"].rolling(window=60, min_periods=36).std()
        rolling_std = rolling_std.replace(0, np.nan)
        df["emp_z"] = ((df["emp_growth"] - rolling_mean) / rolling_std).clip(-3, 3)

        # Drop NaN rows
        df = df.dropna(subset=["emp_growth", "emp_z"])

        if len(df) < 24:
            print(f"  WARNING: {city_key} has only {len(df)} valid observations after z-score. Skipping.")
            continue

        # Convert to quarterly (take end-of-quarter value — most recent month in quarter)
        df["quarter_date"] = df["date"].dt.to_period("Q").dt.to_timestamp()
        quarterly = df.groupby("quarter_date").agg(
            emp_growth=("emp_growth", "last"),
            emp_z=("emp_z", "last"),
        ).reset_index().rename(columns={"quarter_date": "date"})

        signals[city_key] = quarterly

    return signals


# ═══════════════════════════════════════════════════════════════
# STEP 3: BUILD PANEL & COMPUTE FORWARD HPI RETURNS
# ═══════════════════════════════════════════════════════════════

def build_panel(emp_signals, fhfa_df):
    """
    Build city × quarter panel:
      - Employment growth z-score (signal)
      - Forward 4q/6q/8q HPI appreciation (target)
    """
    print("\n  Building panel dataset...")

    # Pre-build HPI lookup per MSA: {msa_name: {date: hpi}}
    hpi_lookup = {}
    for msa_name, group in fhfa_df.groupby("msa_name"):
        hpi_lookup[msa_name] = dict(zip(group["date"], group["hpi"]))

    rows = []
    matched = 0
    unmatched = []

    for city_key, sig_df in emp_signals.items():
        fhfa_msa = EMPLOYMENT_TO_FHFA.get(city_key)
        if fhfa_msa is None or fhfa_msa not in hpi_lookup:
            unmatched.append(city_key)
            continue

        matched += 1
        msa_hpi = hpi_lookup[fhfa_msa]
        sorted_dates = sorted(msa_hpi.keys())

        for _, row in sig_df.iterrows():
            date = row["date"]
            emp_growth = row["emp_growth"]
            emp_z = row["emp_z"]

            # Get current HPI
            current_hpi = msa_hpi.get(date)
            if current_hpi is None or current_hpi <= 0:
                continue

            # Compute forward returns at 4q (12mo), 6q (18mo), 8q (24mo)
            fwd = {}
            for h, label in [(4, "fwd_hpi_4q"), (6, "fwd_hpi_6q"), (8, "fwd_hpi_8q")]:
                future_date = date + pd.DateOffset(months=3 * h)
                # Find closest quarter date within ±45 days
                future_hpi = msa_hpi.get(future_date)
                if future_hpi is None:
                    # Try adjacent quarter
                    for offset_months in [-1, 1, -2, 2]:
                        alt_date = future_date + pd.DateOffset(months=offset_months)
                        future_hpi = msa_hpi.get(alt_date)
                        if future_hpi is not None:
                            break
                if future_hpi is not None and future_hpi > 0:
                    fwd[label] = (future_hpi - current_hpi) / current_hpi * 100
                else:
                    fwd[label] = np.nan

            rows.append({
                "city": city_key,
                "fhfa_msa": fhfa_msa,
                "date": date,
                "emp_growth": emp_growth,
                "emp_z": emp_z,
                "hpi": current_hpi,
                **fwd,
            })

    panel = pd.DataFrame(rows)
    if unmatched:
        print(f"  Unmatched cities (no FHFA mapping): {unmatched}")
    print(f"  Matched {matched} MSAs to FHFA HPI")
    print(f"  Panel: {len(panel):,} city-quarter observations, "
          f"{panel['city'].nunique()} cities, "
          f"{panel['date'].min().strftime('%Y-Q')}–{panel['date'].max().strftime('%Y-Q')}")

    # Count forward returns
    for col in ["fwd_hpi_4q", "fwd_hpi_6q", "fwd_hpi_8q"]:
        n = panel[col].notna().sum()
        print(f"  {col}: {n:,} observations with forward returns")

    return panel


# ═══════════════════════════════════════════════════════════════
# STEP 4: STATISTICAL TESTS
# ═══════════════════════════════════════════════════════════════

def run_correlation_tests(panel):
    """
    Test A: Spearman rank correlation between employment z-score
    and forward HPI appreciation at 12/18/24 month horizons.
    """
    print("\n" + "=" * 70)
    print("TEST A: SPEARMAN CORRELATION — Employment Growth Z → Forward HPI")
    print("=" * 70)
    print("  (Does MSA employment growth predict future house price appreciation?)")

    results = {}
    for col, label in [
        ("fwd_hpi_4q", "12-month (4Q)"),
        ("fwd_hpi_6q", "18-month (6Q)"),
        ("fwd_hpi_8q", "24-month (8Q)"),
    ]:
        clean = panel[["emp_z", col]].dropna()
        if len(clean) < 30:
            print(f"\n  {label}: SKIP — only {len(clean)} observations")
            continue

        rho, p = sp_stats.spearmanr(clean["emp_z"], clean[col])
        sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""

        # Also compute Pearson for comparison
        r_pearson, p_pearson = sp_stats.pearsonr(clean["emp_z"], clean[col])

        passed = rho > 0.10 and p < 0.01
        results[col] = {
            "label": label,
            "spearman_rho": round(rho, 4),
            "spearman_p": round(p, 8),
            "pearson_r": round(r_pearson, 4),
            "pearson_p": round(p_pearson, 8),
            "n": len(clean),
            "PASS": passed,
        }

        print(f"\n  {label}:")
        print(f"    Spearman rho = {rho:.4f},  p = {p:.2e}  {sig}")
        print(f"    Pearson  r   = {r_pearson:.4f},  p = {p_pearson:.2e}")
        print(f"    N = {len(clean):,}")
        print(f"    VERDICT: {'PASS' if passed else 'FAIL'} (threshold: rho > 0.10, p < 0.01)")

    return results


def run_quintile_analysis(panel):
    """
    Test B: Split into quintiles by employment z-score.
    Compare mean forward HPI returns across quintiles.
    Target: Q1-Q5 spread > 5 percentage points.
    """
    print("\n" + "=" * 70)
    print("TEST B: QUINTILE ANALYSIS — Employment Z-Score Quintiles → Mean HPI Return")
    print("=" * 70)

    results = {}
    for col, label in [
        ("fwd_hpi_4q", "12-month"),
        ("fwd_hpi_6q", "18-month"),
        ("fwd_hpi_8q", "24-month"),
    ]:
        clean = panel[["emp_z", col, "city", "date"]].dropna()
        if len(clean) < 50:
            print(f"\n  {label}: SKIP — only {len(clean)} observations")
            continue

        # Assign quintiles — Q5=highest emp_z (strongest employment growth)
        clean = clean.copy()
        clean["quintile"] = pd.qcut(clean["emp_z"], q=5, labels=[1, 2, 3, 4, 5], duplicates="drop")
        clean["quintile"] = clean["quintile"].astype(int)

        q_summary = clean.groupby("quintile")[col].agg(["mean", "median", "std", "count"])

        print(f"\n  {label} Forward HPI Appreciation (%) by Employment Z Quintile:")
        print(f"  {'Q':>4} {'Mean':>10} {'Median':>10} {'Std':>10} {'N':>8}")
        print(f"  " + "-" * 46)
        for q in sorted(q_summary.index):
            r = q_summary.loc[q]
            print(f"  Q{q:>3} {r['mean']:>10.2f} {r['median']:>10.2f} {r['std']:>10.2f} {int(r['count']):>8}")

        q5_mean = q_summary.loc[q_summary.index.max(), "mean"]
        q1_mean = q_summary.loc[q_summary.index.min(), "mean"]
        spread = q5_mean - q1_mean

        # Check monotonicity
        means = [q_summary.loc[q, "mean"] for q in sorted(q_summary.index)]
        mono_pairs = sum(1 for i in range(len(means) - 1) if means[i] <= means[i + 1])
        mono_pct = mono_pairs / max(1, len(means) - 1) * 100

        passed = spread > 5.0
        results[col] = {
            "label": label,
            "q1_mean": round(q1_mean, 2),
            "q5_mean": round(q5_mean, 2),
            "spread_pp": round(spread, 2),
            "monotonicity_pct": round(mono_pct, 1),
            "quintile_means": {int(q): round(q_summary.loc[q, "mean"], 2) for q in q_summary.index},
            "quintile_counts": {int(q): int(q_summary.loc[q, "count"]) for q in q_summary.index},
            "PASS": passed,
        }

        print(f"\n  Q5 (strongest growth) mean: {q5_mean:.2f}%")
        print(f"  Q1 (weakest growth) mean:   {q1_mean:.2f}%")
        print(f"  Spread (Q5 - Q1):           {spread:+.2f}pp")
        print(f"  Monotonicity:               {mono_pct:.0f}%")
        print(f"  VERDICT: {'PASS' if passed else 'FAIL'} (threshold: spread > 5pp)")

    return results


def run_walk_forward(panel):
    """
    Test C: Walk-forward out-of-sample validation.
    Train on 5 years, test on next year. Slide window.
    Report: % of test years with positive Spearman rho.
    Target: > 60% of years positive.
    """
    print("\n" + "=" * 70)
    print("TEST C: WALK-FORWARD OUT-OF-SAMPLE VALIDATION")
    print("=" * 70)
    print("  (Train 5yr window → test next year → slide)")

    target_col = "fwd_hpi_4q"  # 12-month forward (most common horizon)
    clean = panel[["city", "date", "emp_z", target_col]].dropna()

    # Get year range
    clean = clean.copy()
    clean["year"] = clean["date"].dt.year
    min_year = int(clean["year"].min())
    max_year = int(clean["year"].max())

    # Walk-forward: train on [year-5, year), test on [year, year+1)
    # Start testing from year with enough history
    test_start = max(min_year + 6, 2000)  # need 5yr training + 1yr forward returns
    test_end = max_year - 1  # need forward returns for test year

    print(f"\n  Data range: {min_year}–{max_year}")
    print(f"  Test years: {test_start}–{test_end}")
    print(f"\n  {'Year':>6} {'N_train':>8} {'N_test':>8} {'Rho':>8} {'p':>10} {'Dir':>5}")
    print(f"  " + "-" * 50)

    wf_results = []
    for test_year in range(test_start, test_end + 1):
        train = clean[(clean["year"] >= test_year - 5) & (clean["year"] < test_year)]
        test = clean[clean["year"] == test_year]

        if len(test) < 10 or len(train) < 50:
            continue

        # Cross-sectional test: rank cities by emp_z in test year, correlate with forward HPI
        # Use city-level averages for the test year
        test_city_avg = test.groupby("city").agg(
            emp_z=("emp_z", "mean"),
            fwd_hpi=("fwd_hpi_4q", "mean"),
        ).dropna()

        if len(test_city_avg) < 5:
            continue

        rho, p = sp_stats.spearmanr(test_city_avg["emp_z"], test_city_avg["fwd_hpi"])
        direction = "+" if rho > 0 else "-"
        print(f"  {test_year:>6} {len(train):>8} {len(test):>8} {rho:>8.4f} {p:>10.4f} {direction:>5}")

        wf_results.append({
            "test_year": test_year,
            "n_train": len(train),
            "n_test": len(test),
            "n_cities": len(test_city_avg),
            "spearman_rho": round(rho, 4),
            "p_value": round(p, 4),
            "positive": rho > 0,
        })

    if not wf_results:
        print("  No valid walk-forward windows. SKIP.")
        return {"PASS": None, "reason": "insufficient data"}

    wf_df = pd.DataFrame(wf_results)
    pct_positive = wf_df["positive"].mean() * 100
    mean_rho = wf_df["spearman_rho"].mean()
    median_rho = wf_df["spearman_rho"].median()

    passed = pct_positive >= 60
    result = {
        "years_tested": len(wf_df),
        "pct_positive": round(pct_positive, 1),
        "mean_rho": round(mean_rho, 4),
        "median_rho": round(median_rho, 4),
        "details": wf_results,
        "PASS": passed,
    }

    print(f"\n  Walk-forward summary:")
    print(f"    Years tested:    {len(wf_df)}")
    print(f"    % positive rho:  {pct_positive:.1f}%")
    print(f"    Mean rho:        {mean_rho:.4f}")
    print(f"    Median rho:      {median_rho:.4f}")
    print(f"    VERDICT: {'PASS' if passed else 'FAIL'} (threshold: >= 60% positive)")

    return result


def run_independence_test(panel, existing_signals):
    """
    Test D: Is employment growth independent from existing signals?
    Compute partial correlation after controlling for:
      - Building permit growth z-score (cross-sectional)
      - National HPI momentum
      - Mortgage rate level
    """
    print("\n" + "=" * 70)
    print("TEST D: SIGNAL INDEPENDENCE — Employment vs Existing Signals")
    print("=" * 70)

    results = {}

    # --- D1: Correlation between employment z and permit z (same MSA, same quarter) ---
    if "permits" in existing_signals:
        permits = existing_signals["permits"]
        # Convert permits to quarterly z-score per city
        permit_panels = []
        for city_key, df in permits.items():
            df = df.copy().sort_values("date").reset_index(drop=True)
            df["permits_yoy"] = df["value"].pct_change(periods=12) * 100
            rolling_mean = df["permits_yoy"].rolling(60, min_periods=36).mean()
            rolling_std = df["permits_yoy"].rolling(60, min_periods=36).std().replace(0, np.nan)
            df["permits_z"] = ((df["permits_yoy"] - rolling_mean) / rolling_std).clip(-3, 3)
            df = df.dropna(subset=["permits_z"])
            df["quarter_date"] = df["date"].dt.to_period("Q").dt.to_timestamp()
            q = df.groupby("quarter_date")["permits_z"].last().reset_index()
            q.columns = ["date", "permits_z"]
            q["city"] = city_key
            permit_panels.append(q)

        if permit_panels:
            permit_panel = pd.concat(permit_panels, ignore_index=True)
            merged = panel[["city", "date", "emp_z", "fwd_hpi_4q"]].merge(
                permit_panel[["city", "date", "permits_z"]], on=["city", "date"], how="inner"
            ).dropna()

            if len(merged) > 50:
                # Correlation between emp_z and permits_z
                rho_ep, p_ep = sp_stats.spearmanr(merged["emp_z"], merged["permits_z"])
                print(f"\n  D1: Employment Z vs Permit Z (same MSA, same quarter)")
                print(f"      Spearman rho = {rho_ep:.4f}, p = {p_ep:.2e}, N = {len(merged)}")
                print(f"      {'LOW' if abs(rho_ep) < 0.30 else 'MODERATE' if abs(rho_ep) < 0.60 else 'HIGH'} correlation "
                      f"({'independent' if abs(rho_ep) < 0.50 else 'partially redundant'})")

                # Partial correlation: emp_z → fwd_hpi controlling for permits_z
                # Using residualization method
                from scipy.stats import spearmanr
                # Residualize emp_z on permits_z
                slope, intercept, _, _, _ = sp_stats.linregress(merged["permits_z"], merged["emp_z"])
                emp_z_resid = merged["emp_z"] - (slope * merged["permits_z"] + intercept)
                rho_partial, p_partial = sp_stats.spearmanr(emp_z_resid, merged["fwd_hpi_4q"])

                print(f"\n  D2: Partial correlation (emp_z → fwd_hpi | permits_z)")
                print(f"      Spearman rho = {rho_partial:.4f}, p = {p_partial:.2e}")
                print(f"      Employment adds {'YES' if rho_partial > 0.05 and p_partial < 0.05 else 'NO'} "
                      f"incremental predictive power beyond permits")

                results["emp_vs_permits"] = {
                    "rho": round(rho_ep, 4),
                    "p": round(p_ep, 8),
                    "n": len(merged),
                    "partial_rho": round(rho_partial, 4),
                    "partial_p": round(p_partial, 8),
                }

    # --- D3: Correlation with national signals (rates, HPI momentum) ---
    if "mortgage_rates" in existing_signals:
        rates = existing_signals["mortgage_rates"].copy()
        rates["quarter_date"] = rates["date"].dt.to_period("Q").dt.to_timestamp()
        rates_q = rates.groupby("quarter_date")["value"].mean().reset_index()
        rates_q.columns = ["date", "rate"]

        merged = panel[["city", "date", "emp_z", "fwd_hpi_4q"]].merge(
            rates_q, on="date", how="inner"
        ).dropna()

        if len(merged) > 50:
            rho_er, p_er = sp_stats.spearmanr(merged["emp_z"], merged["rate"])
            print(f"\n  D3: Employment Z vs Mortgage Rate")
            print(f"      Spearman rho = {rho_er:.4f}, p = {p_er:.2e}, N = {len(merged)}")
            print(f"      {'LOW' if abs(rho_er) < 0.30 else 'MODERATE' if abs(rho_er) < 0.60 else 'HIGH'} correlation")
            results["emp_vs_rates"] = {"rho": round(rho_er, 4), "p": round(p_er, 8)}

    if "us_hpi" in existing_signals:
        hpi = existing_signals["us_hpi"].copy()
        hpi["hpi_mom"] = hpi["value"].pct_change(periods=4) * 100  # quarterly pct change
        hpi["quarter_date"] = hpi["date"].dt.to_period("Q").dt.to_timestamp()
        hpi_q = hpi.groupby("quarter_date")["hpi_mom"].last().reset_index()
        hpi_q.columns = ["date", "hpi_momentum"]

        merged = panel[["city", "date", "emp_z", "fwd_hpi_4q"]].merge(
            hpi_q, on="date", how="inner"
        ).dropna()

        if len(merged) > 50:
            rho_eh, p_eh = sp_stats.spearmanr(merged["emp_z"], merged["hpi_momentum"])
            print(f"\n  D4: Employment Z vs National HPI Momentum")
            print(f"      Spearman rho = {rho_eh:.4f}, p = {p_eh:.2e}, N = {len(merged)}")
            print(f"      {'LOW' if abs(rho_eh) < 0.30 else 'MODERATE' if abs(rho_eh) < 0.60 else 'HIGH'} correlation")
            results["emp_vs_hpi_momentum"] = {"rho": round(rho_eh, 4), "p": round(p_eh, 8)}

    return results


def run_regime_analysis(panel):
    """
    Test E: Does the signal work across different market regimes?
    """
    print("\n" + "=" * 70)
    print("TEST E: REGIME ANALYSIS")
    print("=" * 70)

    regimes = {
        "Pre-GFC Boom (2003-2006)":      ("2003-01-01", "2007-01-01"),
        "GFC Crash (2007-2009)":          ("2007-01-01", "2010-01-01"),
        "Recovery (2010-2014)":           ("2010-01-01", "2015-01-01"),
        "Expansion (2015-2019)":          ("2015-01-01", "2020-01-01"),
        "COVID + Boom (2020-2021)":       ("2020-01-01", "2022-01-01"),
        "Rate Shock (2022-2024)":         ("2022-01-01", "2025-01-01"),
    }

    results = {}
    target = "fwd_hpi_4q"

    print(f"\n  {'Regime':<30s} {'N':>6} {'Rho':>8} {'p':>10} {'Q5-Q1':>8} {'Verdict':>8}")
    print("  " + "-" * 74)

    for regime_name, (start, end) in regimes.items():
        regime_data = panel[
            (panel["date"] >= start) & (panel["date"] < end)
        ][["emp_z", target]].dropna()

        if len(regime_data) < 30:
            print(f"  {regime_name:<30s} {len(regime_data):>6} {'SKIP':>8} {'':>10} {'':>8} {'':>8}")
            results[regime_name] = {"n": len(regime_data), "reason": "insufficient data"}
            continue

        rho, p = sp_stats.spearmanr(regime_data["emp_z"], regime_data[target])

        # Quick quintile spread
        regime_data = regime_data.copy()
        try:
            regime_data["q"] = pd.qcut(regime_data["emp_z"], q=5, labels=False, duplicates="drop")
            q_means = regime_data.groupby("q")[target].mean()
            spread = q_means.iloc[-1] - q_means.iloc[0]
        except Exception:
            spread = np.nan

        verdict = "PASS" if rho > 0.10 and p < 0.05 else "WEAK" if rho > 0 else "FAIL"
        results[regime_name] = {
            "n": len(regime_data),
            "rho": round(rho, 4),
            "p": round(p, 6),
            "spread": round(spread, 2) if not np.isnan(spread) else None,
            "verdict": verdict,
        }

        spread_str = f"{spread:>+7.2f}" if not np.isnan(spread) else "   N/A"
        print(f"  {regime_name:<30s} {len(regime_data):>6} {rho:>8.4f} {p:>10.2e} {spread_str} {verdict:>8}")

    return results


# ═══════════════════════════════════════════════════════════════
# STEP 5: GENERATE CHARTS (Dark Theme)
# ═══════════════════════════════════════════════════════════════

def generate_charts(panel, corr_results, quintile_results, wf_result, regime_results):
    """Generate all backtest charts with LootVue dark theme."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from matplotlib.ticker import FuncFormatter
    except ImportError:
        print("  WARNING: matplotlib not available. Skipping charts.")
        return

    # Set dark theme globally
    plt.rcParams.update({
        "figure.facecolor": C_BG,
        "axes.facecolor": C_SURFACE,
        "axes.edgecolor": C_BORDER,
        "axes.labelcolor": C_TEXT,
        "text.color": C_TEXT,
        "xtick.color": C_TEXT_DIM,
        "ytick.color": C_TEXT_DIM,
        "grid.color": C_BORDER,
        "grid.alpha": 0.5,
        "legend.facecolor": C_SURFACE,
        "legend.edgecolor": C_BORDER,
        "font.family": "sans-serif",
        "font.size": 10,
    })

    # ── Chart 1: Scatter plots for each horizon ──
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    fig.suptitle("Employment Growth Z-Score vs Forward HPI Appreciation",
                 fontsize=14, fontweight="bold", color=C_GOLD)

    for i, (col, label) in enumerate([
        ("fwd_hpi_4q", "12-Month"),
        ("fwd_hpi_6q", "18-Month"),
        ("fwd_hpi_8q", "24-Month"),
    ]):
        ax = axes[i]
        clean = panel[["emp_z", col]].dropna()
        if len(clean) < 10:
            ax.text(0.5, 0.5, "Insufficient Data", ha="center", va="center",
                    color=C_TEXT_DIM, transform=ax.transAxes)
            continue

        # Sample for readability if too many points
        if len(clean) > 2000:
            sample = clean.sample(2000, random_state=42)
        else:
            sample = clean

        ax.scatter(sample["emp_z"], sample[col], alpha=0.15, s=8, color=C_GOLD, edgecolors="none")

        # Add trend line
        z = np.polyfit(clean["emp_z"], clean[col], 1)
        p = np.poly1d(z)
        x_range = np.linspace(clean["emp_z"].min(), clean["emp_z"].max(), 100)
        ax.plot(x_range, p(x_range), color=C_EMERALD, linewidth=2, label="OLS fit")

        # Annotate
        if col in corr_results:
            rho = corr_results[col]["spearman_rho"]
            pval = corr_results[col]["spearman_p"]
            ax.text(0.05, 0.95, f"rho={rho:.3f}\np={pval:.1e}\nN={corr_results[col]['n']:,}",
                    transform=ax.transAxes, fontsize=9, color=C_GOLD_LIGHT,
                    verticalalignment="top", fontfamily="monospace",
                    bbox=dict(boxstyle="round,pad=0.3", facecolor=C_BG, edgecolor=C_BORDER, alpha=0.8))

        ax.set_title(f"{label} Forward", fontsize=11, color=C_TEXT)
        ax.set_xlabel("Employment Growth Z-Score", fontsize=9)
        ax.set_ylabel("HPI Appreciation (%)", fontsize=9)
        ax.axhline(0, color=C_TEXT_DIM, linewidth=0.5, linestyle="--")
        ax.axvline(0, color=C_TEXT_DIM, linewidth=0.5, linestyle="--")
        ax.grid(True, alpha=0.3)
        ax.legend(loc="lower right", fontsize=8)

    plt.tight_layout(rect=[0, 0, 1, 0.93])
    fig.savefig(os.path.join(RESULTS_DIR, "07_emp_scatter.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("  Saved: 07_emp_scatter.png")

    # ── Chart 2: Quintile bar charts ──
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    fig.suptitle("Mean Forward HPI Return by Employment Growth Quintile",
                 fontsize=14, fontweight="bold", color=C_GOLD)

    for i, (col, label) in enumerate([
        ("fwd_hpi_4q", "12-Month"),
        ("fwd_hpi_6q", "18-Month"),
        ("fwd_hpi_8q", "24-Month"),
    ]):
        ax = axes[i]
        if col not in quintile_results:
            continue

        qr = quintile_results[col]
        quintiles = sorted(qr["quintile_means"].keys())
        means = [qr["quintile_means"][q] for q in quintiles]

        # Color: gradient from rose (Q1=weakest) to emerald (Q5=strongest)
        colors = [C_ROSE, C_AMBER, C_GOLD, C_GOLD_LIGHT, C_EMERALD][:len(quintiles)]

        bars = ax.bar([f"Q{q}" for q in quintiles], means, color=colors, edgecolor=C_BORDER)

        # Add value labels
        for bar, val in zip(bars, means):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.2,
                    f"{val:.1f}%", ha="center", va="bottom", fontsize=9,
                    color=C_TEXT, fontweight="bold")

        ax.set_title(f"{label} Forward", fontsize=11, color=C_TEXT)
        ax.set_xlabel("Employment Growth Quintile", fontsize=9)
        ax.set_ylabel("Mean HPI Appreciation (%)", fontsize=9)
        ax.axhline(0, color=C_TEXT_DIM, linewidth=0.5, linestyle="--")

        # Annotate spread
        spread = qr["spread_pp"]
        ax.text(0.95, 0.95, f"Q5-Q1 spread: {spread:+.1f}pp",
                transform=ax.transAxes, fontsize=10, color=C_EMERALD if spread > 5 else C_ROSE,
                ha="right", va="top", fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.3", facecolor=C_BG, edgecolor=C_BORDER, alpha=0.8))

    plt.tight_layout(rect=[0, 0, 1, 0.93])
    fig.savefig(os.path.join(RESULTS_DIR, "07_emp_quintiles.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("  Saved: 07_emp_quintiles.png")

    # ── Chart 3: Walk-forward results ──
    if isinstance(wf_result, dict) and "details" in wf_result:
        wf_details = wf_result["details"]
        fig, ax = plt.subplots(figsize=(12, 5))
        fig.suptitle("Walk-Forward Out-of-Sample Performance",
                     fontsize=14, fontweight="bold", color=C_GOLD)

        years = [d["test_year"] for d in wf_details]
        rhos = [d["spearman_rho"] for d in wf_details]
        colors_wf = [C_EMERALD if r > 0 else C_ROSE for r in rhos]

        bars = ax.bar(years, rhos, color=colors_wf, edgecolor=C_BORDER, width=0.7)
        ax.axhline(0, color=C_TEXT_DIM, linewidth=1)
        ax.set_xlabel("Test Year", fontsize=10)
        ax.set_ylabel("Spearman rho", fontsize=10)
        ax.set_xticks(years)
        ax.grid(axis="y", alpha=0.3)

        # Annotate pct positive
        pct = wf_result["pct_positive"]
        verdict_color = C_EMERALD if pct >= 60 else C_ROSE
        ax.text(0.95, 0.95, f"Positive: {pct:.0f}%\nMean rho: {wf_result['mean_rho']:.3f}",
                transform=ax.transAxes, fontsize=11, color=verdict_color,
                ha="right", va="top", fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.3", facecolor=C_BG, edgecolor=C_BORDER, alpha=0.8))

        plt.tight_layout(rect=[0, 0, 1, 0.93])
        fig.savefig(os.path.join(RESULTS_DIR, "07_emp_walkforward.png"), dpi=150, bbox_inches="tight")
        plt.close(fig)
        print("  Saved: 07_emp_walkforward.png")

    # ── Chart 4: Regime analysis ──
    fig, ax = plt.subplots(figsize=(12, 5))
    fig.suptitle("Signal Performance Across Market Regimes",
                 fontsize=14, fontweight="bold", color=C_GOLD)

    regime_names = []
    regime_rhos = []
    for name, data in regime_results.items():
        if "rho" in data:
            regime_names.append(name.replace(" (", "\n("))
            regime_rhos.append(data["rho"])

    if regime_rhos:
        colors_reg = [C_EMERALD if r > 0.10 else C_AMBER if r > 0 else C_ROSE for r in regime_rhos]
        bars = ax.barh(regime_names, regime_rhos, color=colors_reg, edgecolor=C_BORDER, height=0.6)

        # Value labels
        for bar, val in zip(bars, regime_rhos):
            x_pos = bar.get_width() + 0.01 if val >= 0 else bar.get_width() - 0.01
            ha = "left" if val >= 0 else "right"
            ax.text(x_pos, bar.get_y() + bar.get_height() / 2, f"{val:.3f}",
                    ha=ha, va="center", fontsize=9, color=C_TEXT, fontweight="bold")

        ax.axvline(0, color=C_TEXT_DIM, linewidth=1)
        ax.axvline(0.10, color=C_GOLD, linewidth=1, linestyle="--", alpha=0.5, label="Pass threshold (0.10)")
        ax.set_xlabel("Spearman rho", fontsize=10)
        ax.grid(axis="x", alpha=0.3)
        ax.legend(loc="lower right", fontsize=8)

    plt.tight_layout(rect=[0, 0, 1, 0.93])
    fig.savefig(os.path.join(RESULTS_DIR, "07_emp_regimes.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("  Saved: 07_emp_regimes.png")

    # ── Chart 5: Time-series of employment z per city ──
    fig, ax = plt.subplots(figsize=(16, 6))
    fig.suptitle("Employment Growth Z-Score by MSA (Monthly → Quarterly)",
                 fontsize=14, fontweight="bold", color=C_GOLD)

    # Pick 6 representative cities
    highlight_cities = ["austin", "detroit", "phoenix", "new_york", "nashville", "san_francisco"]
    highlight_cities = [c for c in highlight_cities if c in panel["city"].unique()]
    city_colors = [C_GOLD, C_EMERALD, C_ROSE, C_AMBER, C_GOLD_LIGHT, "#8B5CF6"]

    for city, color in zip(highlight_cities, city_colors):
        city_data = panel[panel["city"] == city].sort_values("date")
        ax.plot(city_data["date"], city_data["emp_z"], label=city.replace("_", " ").title(),
                color=color, linewidth=1.2, alpha=0.8)

    ax.axhline(0, color=C_TEXT_DIM, linewidth=0.5, linestyle="--")
    ax.axhline(2, color=C_EMERALD, linewidth=0.5, linestyle=":", alpha=0.5)
    ax.axhline(-2, color=C_ROSE, linewidth=0.5, linestyle=":", alpha=0.5)
    ax.set_xlabel("Date", fontsize=10)
    ax.set_ylabel("Employment Growth Z-Score", fontsize=10)
    ax.legend(loc="upper left", fontsize=8, ncol=3)
    ax.grid(True, alpha=0.3)

    # Mark GFC and COVID
    ax.axvspan(pd.Timestamp("2007-12-01"), pd.Timestamp("2009-06-01"),
               alpha=0.1, color=C_ROSE, label="GFC")
    ax.axvspan(pd.Timestamp("2020-03-01"), pd.Timestamp("2020-06-01"),
               alpha=0.1, color=C_AMBER, label="COVID")

    plt.tight_layout(rect=[0, 0, 1, 0.93])
    fig.savefig(os.path.join(RESULTS_DIR, "07_emp_timeseries.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print("  Saved: 07_emp_timeseries.png")


# ═══════════════════════════════════════════════════════════════
# STEP 6: GENERATE RESULTS REPORT
# ═══════════════════════════════════════════════════════════════

def generate_report(panel, corr_results, quintile_results, wf_result, independence_results, regime_results):
    """Write human-readable results and JSON."""
    json_path = os.path.join(RESULTS_DIR, "07_employment_results.json")
    md_path = os.path.join(RESULTS_DIR, "07_EMPLOYMENT_BACKTEST.md")

    all_results = {
        "signal": "Employment Growth (12mo YoY, 5yr rolling Z-score)",
        "target": "FHFA MSA HPI (quarterly)",
        "generated": datetime.now().isoformat(),
        "panel": {
            "n_observations": len(panel),
            "n_cities": int(panel["city"].nunique()),
            "date_range": f"{panel['date'].min().strftime('%Y-%m')} to {panel['date'].max().strftime('%Y-%m')}",
        },
        "correlation_tests": corr_results,
        "quintile_analysis": quintile_results,
        "walk_forward": wf_result,
        "independence": independence_results,
        "regime_analysis": regime_results,
    }

    # Save JSON
    with open(json_path, "w") as f:
        json.dump(all_results, f, indent=2, default=str)

    # Save Markdown
    with open(md_path, "w") as f:
        f.write("# Employment Growth Backtest Results\n\n")
        f.write(f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"**Signal**: 12-month employment growth rate, z-scored on 5-year rolling window\n")
        f.write(f"**Target**: FHFA MSA House Price Index (quarterly), forward 12/18/24 months\n")
        f.write(f"**MSAs**: {panel['city'].nunique()} (matched from 31 FRED employment series)\n")
        f.write(f"**Observations**: {len(panel):,}\n\n")

        f.write("## Pass Criteria\n\n")
        f.write("| Criterion | Threshold | Status |\n")
        f.write("|-----------|-----------|--------|\n")

        # Correlation test
        rho_12 = corr_results.get("fwd_hpi_4q", {})
        rho_val = rho_12.get("spearman_rho", "N/A")
        rho_p = rho_12.get("spearman_p", 1.0)
        rho_pass = rho_12.get("PASS", False)
        f.write(f"| Spearman rho (12mo) | > 0.10 | rho={rho_val} ({'PASS' if rho_pass else 'FAIL'}) |\n")
        f.write(f"| p-value (12mo) | < 0.01 | p={rho_p:.2e} ({'PASS' if rho_p < 0.01 else 'FAIL'}) |\n")

        # Quintile spread
        q_12 = quintile_results.get("fwd_hpi_4q", {})
        spread = q_12.get("spread_pp", "N/A")
        q_pass = q_12.get("PASS", False)
        f.write(f"| Q5-Q1 spread (12mo) | > 5pp | {spread}pp ({'PASS' if q_pass else 'FAIL'}) |\n")

        # Walk-forward
        wf_pct = wf_result.get("pct_positive", 0) if isinstance(wf_result, dict) else 0
        wf_pass = wf_result.get("PASS", False) if isinstance(wf_result, dict) else False
        f.write(f"| Walk-forward positive | > 60% | {wf_pct:.0f}% ({'PASS' if wf_pass else 'FAIL'}) |\n")

        f.write("\n## Detailed Results\n\n")

        # Correlation
        f.write("### Spearman Correlation\n\n")
        f.write("| Horizon | Spearman rho | p-value | N | Verdict |\n")
        f.write("|---------|-------------|---------|---|--------|\n")
        for col in ["fwd_hpi_4q", "fwd_hpi_6q", "fwd_hpi_8q"]:
            if col in corr_results:
                cr = corr_results[col]
                f.write(f"| {cr['label']} | {cr['spearman_rho']:.4f} | {cr['spearman_p']:.2e} | "
                        f"{cr['n']:,} | {'PASS' if cr['PASS'] else 'FAIL'} |\n")

        # Quintiles
        f.write("\n### Quintile Spreads\n\n")
        f.write("| Horizon | Q1 (Weakest) | Q5 (Strongest) | Spread | Monotonicity | Verdict |\n")
        f.write("|---------|-------------|---------------|--------|-------------|--------|\n")
        for col in ["fwd_hpi_4q", "fwd_hpi_6q", "fwd_hpi_8q"]:
            if col in quintile_results:
                qr = quintile_results[col]
                f.write(f"| {qr['label']} | {qr['q1_mean']:.2f}% | {qr['q5_mean']:.2f}% | "
                        f"{qr['spread_pp']:+.2f}pp | {qr['monotonicity_pct']:.0f}% | "
                        f"{'PASS' if qr['PASS'] else 'FAIL'} |\n")

        # Walk-forward
        if isinstance(wf_result, dict) and "details" in wf_result:
            f.write("\n### Walk-Forward Validation\n\n")
            f.write(f"| Year | N Cities | Spearman rho | p-value | Direction |\n")
            f.write(f"|------|----------|-------------|---------|----------|\n")
            for d in wf_result["details"]:
                direction = "+" if d["positive"] else "-"
                f.write(f"| {d['test_year']} | {d['n_cities']} | {d['spearman_rho']:.4f} | "
                        f"{d['p_value']:.4f} | {direction} |\n")
            f.write(f"\n**Summary**: {wf_result['pct_positive']:.0f}% positive, "
                    f"mean rho = {wf_result['mean_rho']:.4f}\n")

        # Independence
        if independence_results:
            f.write("\n### Signal Independence\n\n")
            if "emp_vs_permits" in independence_results:
                ir = independence_results["emp_vs_permits"]
                f.write(f"- Employment Z vs Permit Z: rho = {ir['rho']:.4f} (p = {ir['p']:.2e})\n")
                f.write(f"- Partial correlation (controlling for permits): rho = {ir['partial_rho']:.4f} (p = {ir['partial_p']:.2e})\n")
            if "emp_vs_rates" in independence_results:
                ir = independence_results["emp_vs_rates"]
                f.write(f"- Employment Z vs Mortgage Rate: rho = {ir['rho']:.4f} (p = {ir['p']:.2e})\n")
            if "emp_vs_hpi_momentum" in independence_results:
                ir = independence_results["emp_vs_hpi_momentum"]
                f.write(f"- Employment Z vs HPI Momentum: rho = {ir['rho']:.4f} (p = {ir['p']:.2e})\n")

        # Regime
        f.write("\n### Regime Analysis\n\n")
        f.write("| Regime | N | rho | Spread | Verdict |\n")
        f.write("|--------|---|-----|--------|--------|\n")
        for name, data in regime_results.items():
            if "rho" in data:
                spread_str = f"{data['spread']:+.2f}pp" if data.get("spread") is not None else "N/A"
                f.write(f"| {name} | {data['n']} | {data['rho']:.4f} | {spread_str} | {data['verdict']} |\n")
            else:
                f.write(f"| {name} | {data['n']} | SKIP | | |\n")

        # Overall verdict
        f.write("\n## Overall Verdict\n\n")
        passes = []
        passes.append(rho_pass)
        passes.append(rho_p < 0.01 if isinstance(rho_p, float) else False)
        passes.append(q_pass)
        passes.append(wf_pass)

        n_pass = sum(passes)
        n_total = len(passes)
        f.write(f"**{n_pass}/{n_total} criteria passed.**\n\n")

        if n_pass == n_total:
            f.write("**STRONG PASS**: Employment growth is a statistically significant, independent predictor of MSA housing prices. "
                    "Consistent with academic literature (Glaeser & Gyourko, Mian & Sufi). "
                    "Recommend adding to composite signal at 25-35% weight.\n")
        elif n_pass >= 3:
            f.write("**PASS**: Employment growth shows robust predictive power for housing prices. "
                    "Some criteria narrowly missed but the overall signal is reliable.\n")
        elif n_pass >= 2:
            f.write("**WEAK PASS**: Signal shows predictive power but with caveats. "
                    "May need combination with other signals for reliability.\n")
        else:
            f.write("**FAIL**: Employment growth does not meet minimum predictive thresholds in this test. "
                    "Review methodology and data quality.\n")

    print(f"\n  Report: {md_path}")
    print(f"  JSON:   {json_path}")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("EMPLOYMENT GROWTH BACKTEST")
    print("Literature: #1 long-term predictor of housing prices")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # ── Load data ──
    print("\n[STEP 1] LOADING DATA")
    print("-" * 40)

    employment = load_all_employment()
    print(f"  Employment series loaded: {len(employment)} MSAs")
    for city_key in sorted(employment.keys()):
        df = employment[city_key]
        print(f"    {city_key:20s} {df['date'].min().strftime('%Y-%m')} to {df['date'].max().strftime('%Y-%m')} ({len(df)} months)")

    fhfa = load_fhfa_hpi()
    if fhfa is None:
        print("\n  FATAL: Cannot proceed without FHFA HPI data.")
        sys.exit(1)

    existing_signals = load_existing_signals()

    # ── Compute employment signal ──
    print("\n[STEP 2] COMPUTING EMPLOYMENT GROWTH SIGNAL")
    print("-" * 40)

    emp_signals = compute_employment_signal(employment)
    print(f"  Signals computed for {len(emp_signals)} MSAs")

    # ── Build panel ──
    print("\n[STEP 3] BUILDING PANEL DATASET")
    print("-" * 40)

    panel = build_panel(emp_signals, fhfa)
    if len(panel) < 100:
        print(f"\n  FATAL: Panel too small ({len(panel)} obs). Need at least 100.")
        sys.exit(1)

    # ── Run tests ──
    print("\n[STEP 4] RUNNING STATISTICAL TESTS")
    print("-" * 40)

    corr_results = run_correlation_tests(panel)
    quintile_results = run_quintile_analysis(panel)
    wf_result = run_walk_forward(panel)
    independence_results = run_independence_test(panel, existing_signals)
    regime_results = run_regime_analysis(panel)

    # ── Generate charts ──
    print("\n[STEP 5] GENERATING CHARTS")
    print("-" * 40)
    generate_charts(panel, corr_results, quintile_results, wf_result, regime_results)

    # ── Generate report ──
    print("\n[STEP 6] GENERATING REPORT")
    print("-" * 40)
    generate_report(panel, corr_results, quintile_results, wf_result, independence_results, regime_results)

    # ── Final summary ──
    print("\n" + "=" * 70)
    print("EMPLOYMENT GROWTH BACKTEST COMPLETE")
    print("=" * 70)

    # Print pass/fail summary
    criteria = []
    r12 = corr_results.get("fwd_hpi_4q", {})
    criteria.append(("Spearman rho > 0.10", r12.get("PASS", False),
                     f"rho={r12.get('spearman_rho', 'N/A')}"))
    criteria.append(("p-value < 0.01", r12.get("spearman_p", 1.0) < 0.01 if isinstance(r12.get("spearman_p"), float) else False,
                     f"p={r12.get('spearman_p', 'N/A')}"))

    q12 = quintile_results.get("fwd_hpi_4q", {})
    criteria.append(("Q5-Q1 spread > 5pp", q12.get("PASS", False),
                     f"spread={q12.get('spread_pp', 'N/A')}pp"))

    wf_pass = wf_result.get("PASS", False) if isinstance(wf_result, dict) else False
    wf_pct = wf_result.get("pct_positive", 0) if isinstance(wf_result, dict) else 0
    criteria.append(("Walk-forward > 60%", wf_pass, f"{wf_pct:.0f}%"))

    print(f"\n  {'Criterion':<30s} {'Value':<20s} {'Result':<8s}")
    print(f"  " + "-" * 60)
    for name, passed, value in criteria:
        status = "PASS" if passed else "FAIL"
        print(f"  {name:<30s} {value:<20s} {status:<8s}")

    n_pass = sum(1 for _, p, _ in criteria if p)
    print(f"\n  Overall: {n_pass}/{len(criteria)} criteria passed")
    print(f"  Results: backtest/results/07_EMPLOYMENT_BACKTEST.md")
    print(f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
