"""
Months-of-Supply Backtest — The #1 Signal
==========================================
Richmond Fed 2025: R²=0.347 — strongest single predictor of house price appreciation.
Lower supply → higher expected appreciation (inverted signal).

Data:
- Signal: Redfin months-of-supply (158,830 rows, 932 metros, 2012-2026)
- Target: FHFA HPI for 410 MSAs (quarterly, 1975-2025)
- V1 Signals for independence: building permits, HPI momentum, mortgage rates

Methodology:
1. Map Redfin metro names → FHFA MSA names (fuzzy matching on city + state)
2. Aggregate monthly MoS → quarterly (mean)
3. Compute 3-year rolling z-score per MSA
4. INVERT signal: z_signal = -z_mos (lower supply = higher expected appreciation)
5. Test Spearman rho vs forward 4q/6q/8q HPI change
6. Quintile analysis (Q1 top = lowest supply vs Q5 bottom = highest supply)
7. Walk-forward validation (train 5yr, test 1yr rolling)
8. Independence vs V1 signals (partial correlation)
9. Dark-theme charts saved to results/

Pass criteria: rho > 0.10, p < 0.01, Q1-Q5 spread > 5pp, walk-forward positive > 60%
"""
import os
import re
import json
import warnings
from datetime import datetime

import numpy as np
import pandas as pd
from scipy import stats as sp_stats

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from matplotlib.gridspec import GridSpec

warnings.filterwarnings("ignore")

# ═══════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
os.makedirs(RESULTS_DIR, exist_ok=True)

COLORS = {
    "bg": "#000000", "card": "#0A0A0A", "border": "#1F1F1F",
    "text": "#E5E5E5", "text_dim": "#666666", "gold": "#C9A227",
    "gold_light": "#E8C547", "emerald": "#10B981", "amber": "#F59E0B",
    "rose": "#EF4444", "blue": "#3B82F6", "purple": "#8B5CF6",
    "cyan": "#06B6D4",
}

plt.rcParams.update({
    "figure.facecolor": COLORS["bg"],
    "axes.facecolor": COLORS["card"],
    "axes.edgecolor": COLORS["border"],
    "axes.labelcolor": COLORS["text"],
    "text.color": COLORS["text"],
    "xtick.color": COLORS["text_dim"],
    "ytick.color": COLORS["text_dim"],
    "grid.color": COLORS["border"],
    "grid.alpha": 0.5,
    "font.size": 10,
    "font.family": "sans-serif",
    "legend.facecolor": COLORS["card"],
    "legend.edgecolor": COLORS["border"],
    "legend.labelcolor": COLORS["text"],
})

# Forward horizons in quarters
FWD_HORIZONS = {4: "12-month", 6: "18-month", 8: "24-month"}

# Z-score rolling window: 12 quarters = 3 years (monthly data aggregated to quarterly)
ZSCORE_WINDOW = 12  # quarters
ZSCORE_MIN_PERIODS = 6


# ═══════════════════════════════════════════════════════════════
# STEP 1: LOAD DATA
# ═══════════════════════════════════════════════════════════════

def load_redfin_mos():
    """Load Redfin months-of-supply data."""
    fpath = os.path.join(DATA_DIR, "months_supply_redfin.csv")
    df = pd.read_csv(fpath)
    df["period_begin"] = pd.to_datetime(df["period_begin"], errors="coerce")
    df["months_of_supply"] = pd.to_numeric(df["months_of_supply"], errors="coerce")
    df = df.dropna(subset=["period_begin", "months_of_supply", "region"])
    # Filter out extreme outliers (data quality)
    df = df[(df["months_of_supply"] > 0) & (df["months_of_supply"] < 60)]
    print(f"  Redfin MoS: {len(df):,} rows, {df['region'].nunique()} metros, "
          f"{df['period_begin'].min().strftime('%Y-%m')} to {df['period_begin'].max().strftime('%Y-%m')}")
    return df


def load_fhfa_msa():
    """Load FHFA MSA-level HPI (headerless CSV)."""
    fpath = os.path.join(DATA_DIR, "fhfa_hpi_msa.csv")
    df = pd.read_csv(fpath, header=None,
                     names=["msa_name", "cbsa", "year", "quarter", "hpi", "std_err"],
                     quotechar='"')
    df["hpi"] = pd.to_numeric(df["hpi"], errors="coerce")
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["quarter"] = pd.to_numeric(df["quarter"], errors="coerce")
    df = df.dropna(subset=["hpi", "year", "quarter"])
    df["date"] = pd.to_datetime(
        df["year"].astype(int).astype(str) + "-" +
        ((df["quarter"].astype(int) - 1) * 3 + 1).astype(str).str.zfill(2) + "-01"
    )
    print(f"  FHFA HPI: {len(df):,} rows, {df['msa_name'].nunique()} MSAs, "
          f"{df['date'].min().strftime('%Y')} to {df['date'].max().strftime('%Y')}")
    return df


def load_fred_csv(filename):
    """Load a FRED CSV with date+value columns."""
    fpath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(fpath):
        return None
    df = pd.read_csv(fpath)
    cols = df.columns.tolist()
    date_col = [c for c in cols if "date" in c.lower()]
    val_col = [c for c in cols if c not in date_col]
    if not date_col or not val_col:
        return None
    df = df.rename(columns={date_col[0]: "date", val_col[0]: "value"})
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    return df.dropna()


# ═══════════════════════════════════════════════════════════════
# STEP 2: METRO NAME MATCHING (Redfin → FHFA)
# ═══════════════════════════════════════════════════════════════

def normalize_metro_name(name):
    """Extract (city, state) from a metro name string for matching.
    Redfin: 'Nashville - TN metro area'
    FHFA:   'Nashville-Davidson--Murfreesboro--Franklin, TN'
    """
    name = name.strip()

    # Redfin format: "City - ST metro area"
    m = re.match(r'^(.+?)\s*-\s*([A-Z]{2})\s*metro area$', name)
    if m:
        city = m.group(1).strip()
        state = m.group(2).strip()
        return city.lower(), state.lower()

    # FHFA format: "City-Suburb-Area, ST" or "City-Suburb-Area, ST-ST (MSAD)"
    m = re.match(r'^(.+?),\s*([A-Z]{2}(?:-[A-Z]{2})?)', name)
    if m:
        city_part = m.group(1).strip()
        state = m.group(2).strip().split("-")[0]  # Take first state
        # Extract the primary city (before first hyphen or dash)
        primary_city = re.split(r'[-–—]', city_part)[0].strip()
        return primary_city.lower(), state.lower()

    return name.lower(), ""


def build_metro_mapping(redfin_regions, fhfa_msas):
    """
    Build a mapping from Redfin region names to FHFA MSA names.
    Strategy: match on (primary_city, state) — exact first, then fuzzy.
    """
    # Build FHFA index: (city, state) → msa_name
    fhfa_index = {}
    for msa in fhfa_msas:
        city, state = normalize_metro_name(msa)
        if city and state:
            fhfa_index[(city, state)] = msa

    # Match Redfin regions
    mapping = {}
    matched = 0
    for region in redfin_regions:
        city, state = normalize_metro_name(region)
        if not city or not state:
            continue

        # Exact match
        key = (city, state)
        if key in fhfa_index:
            mapping[region] = fhfa_index[key]
            matched += 1
            continue

        # Fuzzy: try partial city match (Redfin uses shorter names)
        best_match = None
        best_score = 0
        for (fhfa_city, fhfa_state), msa_name in fhfa_index.items():
            if fhfa_state != state:
                continue
            # Check if redfin city is a prefix of fhfa city or vice versa
            if fhfa_city.startswith(city) or city.startswith(fhfa_city):
                score = min(len(city), len(fhfa_city)) / max(len(city), len(fhfa_city))
                if score > best_score and score > 0.5:
                    best_score = score
                    best_match = msa_name

        if best_match:
            mapping[region] = best_match
            matched += 1

    print(f"  Metro mapping: {matched}/{len(redfin_regions)} Redfin metros matched to FHFA MSAs")
    return mapping


# ═══════════════════════════════════════════════════════════════
# STEP 3: BUILD PANEL
# ═══════════════════════════════════════════════════════════════

def aggregate_monthly_to_quarterly(redfin_df):
    """Convert monthly Redfin data to quarterly averages per metro."""
    df = redfin_df.copy()
    df["quarter_date"] = df["period_begin"].dt.to_period("Q").dt.to_timestamp()
    quarterly = df.groupby(["region", "quarter_date"]).agg(
        mos=("months_of_supply", "mean"),
        inventory=("inventory", "mean"),
        homes_sold=("homes_sold", "mean"),
        median_price=("median_sale_price", "mean"),
    ).reset_index()
    quarterly = quarterly.rename(columns={"quarter_date": "date"})
    return quarterly


def compute_zscore_per_msa(quarterly_df):
    """Compute rolling z-score of MoS per MSA. INVERTED: lower supply = positive signal."""
    df = quarterly_df.sort_values(["region", "date"]).copy()

    def rolling_zscore(group):
        s = group["mos"]
        rm = s.rolling(window=ZSCORE_WINDOW, min_periods=ZSCORE_MIN_PERIODS).mean()
        rs = s.rolling(window=ZSCORE_WINDOW, min_periods=ZSCORE_MIN_PERIODS).std().replace(0, np.nan)
        z = (s - rm) / rs
        # INVERT: lower supply = higher signal score
        return (-z).clip(-3, 3)

    df["mos_z"] = df.groupby("region", group_keys=False).apply(
        lambda g: pd.Series(rolling_zscore(g).values, index=g.index)
    )
    return df


def compute_forward_hpi(fhfa_df, horizons=[4, 6, 8]):
    """Compute forward HPI percent change for each MSA at each quarter."""
    df = fhfa_df.sort_values(["msa_name", "date"]).copy()
    for h in horizons:
        col = f"fwd_hpi_{h}q"
        df[col] = df.groupby("msa_name")["hpi"].transform(
            lambda x: (x.shift(-h) - x) / x * 100
        )
    return df


def build_panel(redfin_quarterly, fhfa_with_fwd, metro_mapping):
    """
    Merge Redfin MoS signals with FHFA forward returns.
    Returns a panel: MSA × quarter → (mos_z, fwd_hpi_4q, fwd_hpi_6q, fwd_hpi_8q)
    """
    # Map Redfin regions to FHFA names
    redfin_quarterly = redfin_quarterly.copy()
    redfin_quarterly["fhfa_msa"] = redfin_quarterly["region"].map(metro_mapping)
    matched = redfin_quarterly.dropna(subset=["fhfa_msa", "mos_z"])
    print(f"  Redfin rows with FHFA match and z-score: {len(matched):,}")

    # Merge with FHFA forward returns
    fhfa_cols = ["msa_name", "date"] + [f"fwd_hpi_{h}q" for h in FWD_HORIZONS.keys()]
    fhfa_slim = fhfa_with_fwd[fhfa_cols].copy()

    panel = matched.merge(
        fhfa_slim,
        left_on=["fhfa_msa", "date"],
        right_on=["msa_name", "date"],
        how="inner"
    )

    n_msas = panel["fhfa_msa"].nunique()
    n_quarters = panel["date"].nunique()
    if len(panel) > 0:
        d_min = panel['date'].min()
        d_max = panel['date'].max()
        print(f"  Panel: {len(panel):,} MSA-quarter observations, {n_msas} MSAs, "
              f"{n_quarters} quarters ({d_min.year}Q{(d_min.month-1)//3+1} to {d_max.year}Q{(d_max.month-1)//3+1})")
    else:
        print("  Panel: EMPTY")
    return panel


# ═══════════════════════════════════════════════════════════════
# STEP 4: STATISTICAL TESTS
# ═══════════════════════════════════════════════════════════════

def test_spearman_by_horizon(panel):
    """Spearman correlation of MoS z-score vs forward HPI at each horizon."""
    print("\n  === SPEARMAN CORRELATION: MoS z-score → Forward HPI ===\n")
    results = {}
    for h, label in FWD_HORIZONS.items():
        col = f"fwd_hpi_{h}q"
        clean = panel[["mos_z", col]].dropna()
        if len(clean) < 50:
            print(f"  {label:15s} SKIP (only {len(clean)} obs)")
            continue
        rho, p = sp_stats.spearmanr(clean["mos_z"], clean[col])
        sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
        passed = rho > 0.10 and p < 0.01
        verdict = "PASS" if passed else "FAIL"
        print(f"  {label:15s} rho={rho:>+.4f}  p={p:.2e}  N={len(clean):,}  {sig}  [{verdict}]")
        results[f"fwd_{h}q"] = {
            "horizon": label,
            "rho": round(rho, 4),
            "p": float(f"{p:.6e}"),
            "n": len(clean),
            "significant": p < 0.01,
            "PASS": passed,
        }
    return results


def test_quintile_spread(panel):
    """Quintile analysis: sort by MoS z-score, check spread in forward HPI."""
    print("\n  === QUINTILE ANALYSIS: MoS Signal Quintiles → Forward HPI ===\n")
    results = {}

    for h, label in FWD_HORIZONS.items():
        col = f"fwd_hpi_{h}q"
        clean = panel[["mos_z", col, "fhfa_msa"]].dropna()
        if len(clean) < 100:
            print(f"  {label}: SKIP (only {len(clean)} obs)")
            continue

        clean = clean.copy()
        clean["quintile"] = pd.qcut(clean["mos_z"], q=5, labels=False, duplicates="drop") + 1

        q_means = clean.groupby("quintile")[col].agg(["mean", "median", "std", "count"])
        q_means.columns = ["mean_return", "median_return", "std_return", "count"]

        q1 = q_means.loc[q_means.index.max()]  # Highest z (lowest supply → best)
        q5 = q_means.loc[q_means.index.min()]  # Lowest z (highest supply → worst)
        spread = q1["mean_return"] - q5["mean_return"]
        passed = spread > 5.0

        print(f"  {label} Forward HPI by MoS Signal Quintile:")
        print(f"    {'Q':>4} {'Mean':>10} {'Median':>10} {'Std':>10} {'N':>8}")
        print(f"    " + "-" * 46)
        for q_val in sorted(q_means.index):
            row = q_means.loc[q_val]
            q_label = "TOP " if q_val == q_means.index.max() else "BOT " if q_val == q_means.index.min() else "    "
            print(f"    Q{q_val}{q_label}{row['mean_return']:>+9.2f}% {row['median_return']:>+9.2f}% "
                  f"{row['std_return']:>9.2f}% {int(row['count']):>8}")
        print(f"    Spread (Q{q_means.index.max()}-Q{q_means.index.min()}): {spread:+.2f}pp  [{'PASS' if passed else 'FAIL'}]")

        # Check monotonicity
        vals = [q_means.loc[q, "mean_return"] for q in sorted(q_means.index)]
        mono_pairs = sum(1 for i in range(len(vals) - 1) if vals[i] <= vals[i + 1])
        mono_pct = mono_pairs / max(1, len(vals) - 1) * 100

        print(f"    Monotonicity: {mono_pct:.0f}%")
        print()

        results[f"fwd_{h}q"] = {
            "horizon": label,
            "q_top_mean": round(float(q1["mean_return"]), 2),
            "q_bot_mean": round(float(q5["mean_return"]), 2),
            "spread_pp": round(float(spread), 2),
            "monotonicity_pct": round(mono_pct, 1),
            "quintile_means": {int(q): round(float(q_means.loc[q, "mean_return"]), 2)
                               for q in sorted(q_means.index)},
            "PASS": passed,
        }
    return results


def test_walk_forward(panel, train_years=5):
    """
    Walk-forward validation: train on N years of cross-sectional data,
    test on the next year. Check if MoS signal ranks predict forward HPI ranks.
    """
    print("\n  === WALK-FORWARD VALIDATION ===\n")

    panel = panel.copy()
    panel["year"] = panel["date"].dt.year

    # Use 6-quarter forward as the primary horizon
    fwd_col = "fwd_hpi_6q"
    clean = panel[["fhfa_msa", "date", "year", "mos_z", fwd_col]].dropna()
    years = sorted(clean["year"].unique())

    if len(years) < train_years + 2:
        print("  SKIP: Not enough years for walk-forward test.")
        return {"PASS": None, "reason": "insufficient years"}

    wf_results = []
    print(f"  Training window: {train_years} years, sliding 1 year")
    print(f"  {'Test Year':>10} {'N Obs':>8} {'Rho':>8} {'p-value':>12} {'Direction':>10}")
    print(f"  " + "-" * 54)

    for test_year in years:
        train_start = test_year - train_years
        train_data = clean[(clean["year"] >= train_start) & (clean["year"] < test_year)]
        test_data = clean[clean["year"] == test_year]

        if len(test_data) < 20 or len(train_data) < 50:
            continue

        # In test period: does the MoS signal (computed from data up to test_year)
        # still correlate with forward HPI?
        rho, p = sp_stats.spearmanr(test_data["mos_z"], test_data[fwd_col])
        direction = "+" if rho > 0 else "-"
        print(f"  {test_year:>10} {len(test_data):>8} {rho:>+8.4f} {p:>12.4e} {direction:>10}")

        wf_results.append({
            "test_year": int(test_year),
            "n_obs": len(test_data),
            "rho": round(rho, 4),
            "p": round(p, 6),
            "positive": rho > 0,
            "significant": p < 0.05,
        })

    if not wf_results:
        print("  No valid walk-forward windows.")
        return {"PASS": None, "reason": "no valid windows"}

    wf_df = pd.DataFrame(wf_results)
    pct_positive = wf_df["positive"].mean() * 100
    pct_significant = wf_df["significant"].mean() * 100
    mean_rho = wf_df["rho"].mean()
    passed = pct_positive >= 60

    print(f"\n  Walk-forward summary:")
    print(f"    Years tested: {len(wf_df)}")
    print(f"    % positive direction: {pct_positive:.0f}%")
    print(f"    % significant (p<0.05): {pct_significant:.0f}%")
    print(f"    Mean rho: {mean_rho:+.4f}")
    print(f"    VERDICT: {'PASS' if passed else 'FAIL'} (threshold: >=60% positive)")

    return {
        "years_tested": len(wf_df),
        "pct_positive": round(pct_positive, 1),
        "pct_significant": round(pct_significant, 1),
        "mean_rho": round(mean_rho, 4),
        "details": wf_results,
        "PASS": passed,
    }


def test_independence_vs_v1_signals(panel):
    """
    Test whether MoS signal provides information BEYOND existing V1 signals.
    Load permits, HPI momentum, and mortgage rate data. Compute partial correlations.
    """
    print("\n  === INDEPENDENCE TEST: MoS vs V1 Signals ===\n")

    results = {}

    # Load V1 signals
    # 1. Building permits (MSA-level)
    permit_files = [f for f in os.listdir(DATA_DIR)
                    if f.startswith("fred_permits_") and f != "fred_permits_national.csv"]

    # Build permit city → FHFA MSA mapping (reuse from 02 script)
    CITY_TO_SEARCH = {
        "atlanta": "Atlanta", "austin": "Austin", "boston": "Boston",
        "charlotte": "Charlotte", "chicago": "Chicago", "houston": "Houston",
        "miami": "Miami", "minneapolis": "Minneapolis", "new_york": "New York",
        "orlando": "Orlando", "san_francisco": "San Francisco", "seattle": "Seattle",
        "dallas": "Dallas", "denver": "Denver", "detroit": "Detroit",
        "nashville": "Nashville", "phoenix": "Phoenix", "tampa": "Tampa",
        "raleigh": "Raleigh", "portland": "Portland", "los_angeles": "Los Angeles",
        "philadelphia": "Philadelphia", "cleveland": "Cleveland", "columbus": "Columbus",
        "indianapolis": "Indianapolis", "jacksonville": "Jacksonville",
        "kansas_city": "Kansas City", "salt_lake_city": "Salt Lake City",
        "san_diego": "San Diego", "pittsburgh": "Pittsburgh", "cincinnati": "Cincinnati",
    }

    fhfa_msas = panel["fhfa_msa"].unique()
    permit_data = {}
    for f in permit_files:
        city = f.replace("fred_permits_", "").replace(".csv", "")
        search = CITY_TO_SEARCH.get(city, city.replace("_", " ").title())
        # Find matching FHFA MSA
        match = [m for m in fhfa_msas if search.lower() in m.lower()]
        if not match:
            continue
        msa_name = match[0]
        df = load_fred_csv(f)
        if df is not None and len(df) > 12:
            # Convert to quarterly
            df["quarter_date"] = df["date"].dt.to_period("Q").dt.to_timestamp()
            q = df.groupby("quarter_date")["value"].mean().reset_index()
            q.columns = ["date", "permits"]
            q = q.sort_values("date")
            q["permits_yoy"] = q["permits"].pct_change(periods=4) * 100
            # Z-score
            rm = q["permits_yoy"].rolling(ZSCORE_WINDOW, min_periods=ZSCORE_MIN_PERIODS).mean()
            rs = q["permits_yoy"].rolling(ZSCORE_WINDOW, min_periods=ZSCORE_MIN_PERIODS).std().replace(0, np.nan)
            q["permits_z"] = ((q["permits_yoy"] - rm) / rs).clip(-3, 3)
            permit_data[msa_name] = q[["date", "permits_z"]].dropna()

    print(f"  Loaded permits for {len(permit_data)} MSAs matching panel")

    # 2. Mortgage rates (national)
    mortgage = load_fred_csv("fred_mortgage30.csv")
    rate_q = None
    if mortgage is not None:
        mortgage["quarter_date"] = mortgage["date"].dt.to_period("Q").dt.to_timestamp()
        rate_q = mortgage.groupby("quarter_date")["value"].mean().reset_index()
        rate_q.columns = ["date", "rate"]
        rate_q = rate_q.sort_values("date")
        rm = rate_q["rate"].rolling(40, min_periods=8).mean()
        rs = rate_q["rate"].rolling(40, min_periods=8).std().replace(0, np.nan)
        rate_q["rate_z_inv"] = -(((rate_q["rate"] - rm) / rs).clip(-3, 3))
        rate_q = rate_q[["date", "rate_z_inv"]].dropna()
        print(f"  Loaded mortgage rates: {len(rate_q)} quarters")

    # 3. HPI momentum (per MSA from FHFA)
    fhfa = load_fhfa_msa()
    fhfa = fhfa.sort_values(["msa_name", "date"])
    fhfa["hpi_mom"] = fhfa.groupby("msa_name")["hpi"].transform(
        lambda x: x.pct_change(periods=2) * 100
    )
    fhfa_g = fhfa.groupby("msa_name")
    hpi_mom_z = fhfa.copy()
    hpi_mom_z["hpi_mom_z"] = fhfa_g["hpi_mom"].transform(
        lambda x: ((x - x.rolling(40, min_periods=8).mean()) /
                    x.rolling(40, min_periods=8).std().replace(0, np.nan)).clip(-3, 3)
    )
    hpi_mom_lookup = hpi_mom_z[["msa_name", "date", "hpi_mom_z"]].dropna()
    print(f"  Loaded HPI momentum z-scores: {len(hpi_mom_lookup):,} rows")

    # Merge V1 signals into panel
    enriched = panel[["fhfa_msa", "date", "mos_z", "fwd_hpi_6q"]].dropna().copy()

    # Add permits
    permit_frames = []
    for msa, pdf in permit_data.items():
        pdf = pdf.copy()
        pdf["fhfa_msa"] = msa
        permit_frames.append(pdf)
    if permit_frames:
        all_permits = pd.concat(permit_frames)
        enriched = enriched.merge(all_permits, on=["fhfa_msa", "date"], how="left")
    else:
        enriched["permits_z"] = np.nan

    # Add rates
    if rate_q is not None:
        enriched = enriched.merge(rate_q, on="date", how="left")
    else:
        enriched["rate_z_inv"] = np.nan

    # Add HPI momentum
    enriched = enriched.merge(
        hpi_mom_lookup[["msa_name", "date", "hpi_mom_z"]],
        left_on=["fhfa_msa", "date"],
        right_on=["msa_name", "date"],
        how="left"
    )
    if "msa_name" in enriched.columns:
        enriched = enriched.drop(columns=["msa_name"])

    print(f"  Enriched panel: {len(enriched)} rows")
    print(f"    With permits: {enriched['permits_z'].notna().sum()}")
    print(f"    With rates: {enriched['rate_z_inv'].notna().sum()}")
    print(f"    With HPI momentum: {enriched['hpi_mom_z'].notna().sum()}")

    # Compute pairwise and partial correlations
    target = "fwd_hpi_6q"

    # Bivariate correlations
    print(f"\n  Bivariate Spearman correlations with {target}:")
    for sig_col, sig_name in [("mos_z", "MoS (inverted)"), ("permits_z", "Permits YoY"),
                               ("rate_z_inv", "Rate (inverted)"), ("hpi_mom_z", "HPI Momentum")]:
        subset = enriched[[sig_col, target]].dropna()
        if len(subset) > 30:
            rho, p = sp_stats.spearmanr(subset[sig_col], subset[target])
            sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
            print(f"    {sig_name:25s} rho={rho:>+.4f}  p={p:.2e}  N={len(subset):,}  {sig}")
            results[f"bivariate_{sig_col}"] = {"rho": round(rho, 4), "p": float(f"{p:.6e}"), "n": len(subset)}
        else:
            print(f"    {sig_name:25s} SKIP (N={len(subset)})")

    # Inter-signal correlations (check collinearity)
    print(f"\n  Inter-signal correlations (collinearity check):")
    signal_cols = ["mos_z", "permits_z", "rate_z_inv", "hpi_mom_z"]
    for i, col_a in enumerate(signal_cols):
        for col_b in signal_cols[i + 1:]:
            subset = enriched[[col_a, col_b]].dropna()
            if len(subset) > 30:
                rho, p = sp_stats.spearmanr(subset[col_a], subset[col_b])
                print(f"    {col_a:15s} vs {col_b:15s}  rho={rho:>+.4f}  (N={len(subset):,})")
                results[f"collinear_{col_a}_vs_{col_b}"] = {"rho": round(rho, 4)}

    # Partial correlation: MoS → HPI controlling for each V1 signal
    print(f"\n  Partial correlations (MoS → {target}, controlling for V1 signals):")
    for control_col, control_name in [("permits_z", "Permits"), ("rate_z_inv", "Rates"),
                                       ("hpi_mom_z", "HPI Momentum")]:
        subset = enriched[["mos_z", target, control_col]].dropna()
        if len(subset) > 50:
            # Partial Spearman via rank residuals
            rank_mos = sp_stats.rankdata(subset["mos_z"])
            rank_target = sp_stats.rankdata(subset[target])
            rank_control = sp_stats.rankdata(subset[control_col])

            # Regress out control from both
            from numpy.polynomial.polynomial import polyfit
            coef_mos = np.polyfit(rank_control, rank_mos, 1)
            resid_mos = rank_mos - np.polyval(coef_mos, rank_control)
            coef_target = np.polyfit(rank_control, rank_target, 1)
            resid_target = rank_target - np.polyval(coef_target, rank_control)

            partial_rho, partial_p = sp_stats.spearmanr(resid_mos, resid_target)
            sig = "***" if partial_p < 0.001 else "**" if partial_p < 0.01 else "*" if partial_p < 0.05 else ""
            print(f"    Controlling for {control_name:15s}: partial_rho={partial_rho:>+.4f}  p={partial_p:.2e}  N={len(subset):,}  {sig}")
            results[f"partial_vs_{control_col}"] = {
                "partial_rho": round(partial_rho, 4),
                "p": float(f"{partial_p:.6e}"),
                "n": len(subset),
            }
        else:
            print(f"    Controlling for {control_name:15s}: SKIP (N={len(subset)})")

    # Combined: MoS controlling for ALL V1 signals
    all_cols = ["mos_z", target, "permits_z", "rate_z_inv", "hpi_mom_z"]
    full_subset = enriched[all_cols].dropna()
    if len(full_subset) > 50:
        # Multiple regression approach: rank-transform all, regress target on all signals
        from numpy.linalg import lstsq
        rank_data = full_subset.rank()
        X = rank_data[["mos_z", "permits_z", "rate_z_inv", "hpi_mom_z"]].values
        X = np.column_stack([X, np.ones(len(X))])  # Add intercept
        y = rank_data[target].values
        coeffs, residuals, rank_X, sv = lstsq(X, y, rcond=None)
        print(f"\n  Multiple rank regression (N={len(full_subset):,}):")
        for i, name in enumerate(["MoS (inverted)", "Permits YoY", "Rate (inv)", "HPI Momentum"]):
            print(f"    {name:25s} coeff={coeffs[i]:>+.4f}")
        results["multiple_regression_coeffs"] = {
            "mos_z": round(coeffs[0], 4),
            "permits_z": round(coeffs[1], 4),
            "rate_z_inv": round(coeffs[2], 4),
            "hpi_mom_z": round(coeffs[3], 4),
            "n": len(full_subset),
        }
    else:
        print(f"\n  Multiple regression: SKIP (only {len(full_subset)} complete observations)")

    return results


def test_regime_analysis(panel):
    """Test signal performance across different market regimes."""
    print("\n  === REGIME ANALYSIS ===\n")

    regimes = {
        "Post-GFC Recovery (2013-2015)": ("2013-01-01", "2016-01-01"),
        "Expansion (2016-2019)": ("2016-01-01", "2020-01-01"),
        "COVID Boom (2020-2021)": ("2020-01-01", "2022-01-01"),
        "Rate Shock (2022-2024)": ("2022-01-01", "2025-01-01"),
    }

    fwd_col = "fwd_hpi_6q"
    results = {}

    print(f"  {'Regime':>35s} {'N':>8} {'Rho':>8} {'p-value':>12} {'Spread':>10}")
    print(f"  " + "-" * 78)

    for name, (start, end) in regimes.items():
        subset = panel[(panel["date"] >= start) & (panel["date"] < end)].copy()
        clean = subset[["mos_z", fwd_col]].dropna()
        if len(clean) < 30:
            print(f"  {name:>35s} {len(clean):>8} SKIP")
            results[name] = {"n": len(clean), "reason": "insufficient data"}
            continue

        rho, p = sp_stats.spearmanr(clean["mos_z"], clean[fwd_col])
        # Quintile spread
        clean = clean.copy()
        clean["q"] = pd.qcut(clean["mos_z"], q=5, labels=False, duplicates="drop") + 1
        q_means = clean.groupby("q")[fwd_col].mean()
        spread = q_means.iloc[-1] - q_means.iloc[0]

        sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else ""
        print(f"  {name:>35s} {len(clean):>8} {rho:>+8.4f} {p:>12.2e} {spread:>+9.2f}pp  {sig}")

        results[name] = {
            "n": len(clean),
            "rho": round(rho, 4),
            "p": float(f"{p:.6e}"),
            "spread_pp": round(float(spread), 2),
        }

    return results


# ═══════════════════════════════════════════════════════════════
# STEP 5: CHARTS
# ═══════════════════════════════════════════════════════════════

def plot_main_results(panel, spearman_results, quintile_results, wf_results, regime_results):
    """Generate the master results chart — 6-panel dark theme."""

    fig = plt.figure(figsize=(20, 24))
    gs = GridSpec(3, 2, figure=fig, hspace=0.35, wspace=0.25,
                  left=0.08, right=0.95, top=0.93, bottom=0.04)

    fig.suptitle("MONTHS-OF-SUPPLY BACKTEST — The #1 Signal",
                 fontsize=20, fontweight="bold", color=COLORS["gold"], y=0.97)
    fig.text(0.5, 0.95,
             "Richmond Fed 2025: R²=0.347 | Redfin MoS (932 metros, 2012-2026) → FHFA HPI (410 MSAs)",
             fontsize=11, ha="center", color=COLORS["text_dim"])

    # ── Panel 1: Scatter plot — MoS z-score vs forward HPI (18-month) ──
    ax1 = fig.add_subplot(gs[0, 0])
    fwd_col = "fwd_hpi_6q"
    clean = panel[["mos_z", fwd_col]].dropna()
    if len(clean) > 0:
        # Subsample for readability
        sample = clean.sample(min(3000, len(clean)), random_state=42)
        ax1.scatter(sample["mos_z"], sample[fwd_col], alpha=0.15, s=8,
                    color=COLORS["gold"], edgecolors="none")
        # Trend line
        z = np.polyfit(clean["mos_z"], clean[fwd_col], 1)
        x_range = np.linspace(clean["mos_z"].min(), clean["mos_z"].max(), 100)
        ax1.plot(x_range, np.polyval(z, x_range), color=COLORS["emerald"],
                 linewidth=2.5, label=f"Trend (slope={z[0]:.2f})")
        ax1.axhline(y=0, color=COLORS["text_dim"], linestyle="--", alpha=0.5)
        ax1.axvline(x=0, color=COLORS["text_dim"], linestyle="--", alpha=0.5)

        rho_6q = spearman_results.get("fwd_6q", {}).get("rho", 0)
        p_6q = spearman_results.get("fwd_6q", {}).get("p", 1)
        ax1.text(0.05, 0.95, f"rho = {rho_6q:+.4f}\np = {p_6q:.2e}\nN = {len(clean):,}",
                 transform=ax1.transAxes, fontsize=10, va="top",
                 color=COLORS["emerald"] if rho_6q > 0.10 else COLORS["rose"],
                 fontfamily="monospace",
                 bbox=dict(boxstyle="round,pad=0.5", facecolor=COLORS["card"],
                           edgecolor=COLORS["border"], alpha=0.9))
    ax1.set_xlabel("MoS Z-Score (inverted: lower supply = higher)", fontsize=10)
    ax1.set_ylabel("Forward 18-Month HPI Change (%)", fontsize=10)
    ax1.set_title("Signal vs Forward Returns", fontsize=13, fontweight="bold",
                  color=COLORS["gold"], pad=10)
    ax1.legend(loc="lower right", fontsize=9)
    ax1.grid(True, alpha=0.3)

    # ── Panel 2: Quintile bar chart (18-month) ──
    ax2 = fig.add_subplot(gs[0, 1])
    qr = quintile_results.get("fwd_6q", {})
    q_means = qr.get("quintile_means", {})
    if q_means:
        quintiles = sorted(q_means.keys())
        values = [q_means[q] for q in quintiles]
        colors = [COLORS["emerald"] if v > 0 else COLORS["rose"] for v in values]
        # Make top/bottom quintile bars bolder
        bar_colors = []
        for i, q in enumerate(quintiles):
            if q == max(quintiles):
                bar_colors.append(COLORS["emerald"])
            elif q == min(quintiles):
                bar_colors.append(COLORS["rose"])
            else:
                bar_colors.append(COLORS["amber"])

        bars = ax2.bar([f"Q{q}" for q in quintiles], values, color=bar_colors,
                       edgecolor=COLORS["border"], linewidth=0.5, width=0.6)
        # Value labels
        for bar, val in zip(bars, values):
            ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3,
                     f"{val:+.1f}%", ha="center", fontsize=10, fontweight="bold",
                     color=COLORS["text"])

        spread = qr.get("spread_pp", 0)
        ax2.axhline(y=0, color=COLORS["text_dim"], linestyle="-", alpha=0.5)

        ax2.text(0.5, 0.95,
                 f"Q{max(quintiles)}-Q{min(quintiles)} Spread: {spread:+.1f}pp",
                 transform=ax2.transAxes, ha="center", va="top", fontsize=12,
                 fontweight="bold",
                 color=COLORS["emerald"] if spread > 5 else COLORS["rose"],
                 bbox=dict(boxstyle="round,pad=0.5", facecolor=COLORS["card"],
                           edgecolor=COLORS["border"], alpha=0.9))
    ax2.set_xlabel("MoS Signal Quintile (Q5=lowest supply → best signal)", fontsize=10)
    ax2.set_ylabel("Mean Forward 18-Month HPI (%)", fontsize=10)
    ax2.set_title("Quintile Spread Analysis", fontsize=13, fontweight="bold",
                  color=COLORS["gold"], pad=10)
    ax2.grid(True, alpha=0.3, axis="y")

    # ── Panel 3: Walk-forward rho over time ──
    ax3 = fig.add_subplot(gs[1, 0])
    wf_details = wf_results.get("details", [])
    if wf_details:
        years = [d["test_year"] for d in wf_details]
        rhos = [d["rho"] for d in wf_details]
        bar_colors = [COLORS["emerald"] if r > 0 else COLORS["rose"] for r in rhos]
        bars = ax3.bar(years, rhos, color=bar_colors, edgecolor=COLORS["border"],
                       linewidth=0.5, width=0.7)
        ax3.axhline(y=0, color=COLORS["text_dim"], linestyle="-", alpha=0.8)
        ax3.axhline(y=wf_results.get("mean_rho", 0), color=COLORS["gold"],
                     linestyle="--", alpha=0.8, label=f"Mean rho={wf_results.get('mean_rho', 0):+.4f}")

        pct_pos = wf_results.get("pct_positive", 0)
        ax3.text(0.05, 0.95,
                 f"{pct_pos:.0f}% positive\n({'PASS' if pct_pos >= 60 else 'FAIL'})",
                 transform=ax3.transAxes, fontsize=11, va="top", fontweight="bold",
                 color=COLORS["emerald"] if pct_pos >= 60 else COLORS["rose"],
                 bbox=dict(boxstyle="round,pad=0.5", facecolor=COLORS["card"],
                           edgecolor=COLORS["border"], alpha=0.9))
        ax3.legend(loc="lower right", fontsize=9)
    ax3.set_xlabel("Test Year", fontsize=10)
    ax3.set_ylabel("Spearman Rho (out-of-sample)", fontsize=10)
    ax3.set_title("Walk-Forward Validation", fontsize=13, fontweight="bold",
                  color=COLORS["gold"], pad=10)
    ax3.grid(True, alpha=0.3, axis="y")

    # ── Panel 4: Horizon comparison ──
    ax4 = fig.add_subplot(gs[1, 1])
    horizons = []
    rho_vals = []
    spread_vals = []
    for h, label in FWD_HORIZONS.items():
        key = f"fwd_{h}q"
        if key in spearman_results:
            horizons.append(label)
            rho_vals.append(spearman_results[key]["rho"])
        if key in quintile_results:
            spread_vals.append(quintile_results[key]["spread_pp"])
        else:
            spread_vals.append(0)

    if horizons:
        x = np.arange(len(horizons))
        width = 0.35
        bars1 = ax4.bar(x - width / 2, rho_vals, width, color=COLORS["gold"],
                        edgecolor=COLORS["border"], label="Spearman Rho")
        ax4_twin = ax4.twinx()
        bars2 = ax4_twin.bar(x + width / 2, spread_vals, width, color=COLORS["cyan"],
                             edgecolor=COLORS["border"], label="Q5-Q1 Spread (pp)", alpha=0.7)
        ax4.set_xticks(x)
        ax4.set_xticklabels(horizons)
        ax4.set_ylabel("Spearman Rho", fontsize=10, color=COLORS["gold"])
        ax4_twin.set_ylabel("Quintile Spread (pp)", fontsize=10, color=COLORS["cyan"])
        ax4_twin.tick_params(axis="y", colors=COLORS["cyan"])
        # Combined legend
        lines1, labels1 = ax4.get_legend_handles_labels()
        lines2, labels2 = ax4_twin.get_legend_handles_labels()
        ax4.legend(lines1 + lines2, labels1 + labels2, loc="upper left", fontsize=9)
    ax4.set_title("Signal Strength by Forecast Horizon", fontsize=13, fontweight="bold",
                  color=COLORS["gold"], pad=10)
    ax4.grid(True, alpha=0.3, axis="y")

    # ── Panel 5: Regime analysis ──
    ax5 = fig.add_subplot(gs[2, 0])
    regime_names = []
    regime_rhos = []
    regime_ns = []
    for name, data in regime_results.items():
        if "rho" in data:
            regime_names.append(name.split("(")[0].strip())
            regime_rhos.append(data["rho"])
            regime_ns.append(data["n"])

    if regime_names:
        bar_colors = [COLORS["emerald"] if r > 0 else COLORS["rose"] for r in regime_rhos]
        bars = ax5.barh(regime_names, regime_rhos, color=bar_colors,
                        edgecolor=COLORS["border"], linewidth=0.5, height=0.5)
        ax5.axvline(x=0, color=COLORS["text_dim"], linestyle="-", alpha=0.8)
        ax5.axvline(x=0.10, color=COLORS["gold"], linestyle="--", alpha=0.6,
                     label="Threshold (0.10)")
        for i, (bar, n) in enumerate(zip(bars, regime_ns)):
            ax5.text(bar.get_width() + 0.005, bar.get_y() + bar.get_height() / 2,
                     f"N={n:,}", va="center", fontsize=9, color=COLORS["text_dim"])
        ax5.legend(loc="lower right", fontsize=9)
    ax5.set_xlabel("Spearman Rho", fontsize=10)
    ax5.set_title("Performance by Market Regime", fontsize=13, fontweight="bold",
                  color=COLORS["gold"], pad=10)
    ax5.grid(True, alpha=0.3, axis="x")

    # ── Panel 6: Time-series of median MoS by quintile ──
    ax6 = fig.add_subplot(gs[2, 1])
    fwd_col = "fwd_hpi_6q"
    ts_data = panel[["date", "mos_z", fwd_col]].dropna().copy()
    if len(ts_data) > 100:
        # National median MoS z-score over time
        national_mos = ts_data.groupby("date")["mos_z"].median().reset_index()
        national_mos = national_mos.sort_values("date")
        ax6.plot(national_mos["date"], national_mos["mos_z"],
                 color=COLORS["gold"], linewidth=2, label="Median MoS Z-Score (inverted)")
        ax6.fill_between(national_mos["date"], 0, national_mos["mos_z"],
                         where=national_mos["mos_z"] > 0,
                         alpha=0.2, color=COLORS["emerald"])
        ax6.fill_between(national_mos["date"], 0, national_mos["mos_z"],
                         where=national_mos["mos_z"] < 0,
                         alpha=0.2, color=COLORS["rose"])
        ax6.axhline(y=0, color=COLORS["text_dim"], linestyle="-", alpha=0.5)
        # Overlay forward HPI median
        national_hpi = ts_data.groupby("date")[fwd_col].median().reset_index()
        national_hpi = national_hpi.sort_values("date")
        ax6_twin = ax6.twinx()
        ax6_twin.plot(national_hpi["date"], national_hpi[fwd_col],
                      color=COLORS["amber"], linewidth=1.5, alpha=0.7,
                      label="Median Fwd 18m HPI (%)")
        ax6_twin.set_ylabel("Forward 18m HPI (%)", fontsize=10, color=COLORS["amber"])
        ax6_twin.tick_params(axis="y", colors=COLORS["amber"])
        # Combined legend
        lines1, labels1 = ax6.get_legend_handles_labels()
        lines2, labels2 = ax6_twin.get_legend_handles_labels()
        ax6.legend(lines1 + lines2, labels1 + labels2, loc="upper left", fontsize=9)
    ax6.set_xlabel("Date", fontsize=10)
    ax6.set_ylabel("MoS Z-Score (inverted)", fontsize=10, color=COLORS["gold"])
    ax6.set_title("Signal & Forward Returns Over Time", fontsize=13, fontweight="bold",
                  color=COLORS["gold"], pad=10)
    ax6.grid(True, alpha=0.3)

    # Save
    out_path = os.path.join(RESULTS_DIR, "07_months_of_supply.png")
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"\n  Chart saved: {out_path}")
    return out_path


def plot_independence(panel, independence_results):
    """Generate independence/collinearity chart."""
    fig, axes = plt.subplots(1, 2, figsize=(16, 7))
    fig.patch.set_facecolor(COLORS["bg"])

    fig.suptitle("MoS Signal Independence from V1 Signals",
                 fontsize=16, fontweight="bold", color=COLORS["gold"], y=1.02)

    # Panel 1: Bivariate correlations comparison
    ax1 = axes[0]
    signals = []
    rhos = []
    for key, data in independence_results.items():
        if key.startswith("bivariate_"):
            name = key.replace("bivariate_", "").replace("_z", "").replace("_inv", "")
            name = name.replace("mos", "MoS").replace("permits", "Permits")
            name = name.replace("rate", "Rate").replace("hpi_mom", "HPI Mom")
            signals.append(name)
            rhos.append(data["rho"])

    if signals:
        bar_colors = [COLORS["gold"] if "MoS" in s else COLORS["blue"] for s in signals]
        bars = ax1.barh(signals, rhos, color=bar_colors, edgecolor=COLORS["border"],
                        height=0.5)
        ax1.axvline(x=0, color=COLORS["text_dim"], linestyle="-", alpha=0.8)
        for bar, rho in zip(bars, rhos):
            ax1.text(bar.get_width() + 0.005, bar.get_y() + bar.get_height() / 2,
                     f"{rho:+.4f}", va="center", fontsize=10, color=COLORS["text"],
                     fontfamily="monospace")
    ax1.set_xlabel("Spearman Rho vs Forward 18m HPI", fontsize=10)
    ax1.set_title("Bivariate Correlations", fontsize=12, fontweight="bold",
                  color=COLORS["gold"])
    ax1.grid(True, alpha=0.3, axis="x")

    # Panel 2: Partial correlations
    ax2 = axes[1]
    partial_names = []
    partial_rhos = []
    for key, data in independence_results.items():
        if key.startswith("partial_"):
            control = key.replace("partial_vs_", "").replace("_z", "").replace("_inv", "")
            control = control.replace("permits", "Permits").replace("rate", "Rate")
            control = control.replace("hpi_mom", "HPI Mom")
            partial_names.append(f"Ctrl: {control}")
            partial_rhos.append(data["partial_rho"])

    if partial_names:
        bar_colors = [COLORS["gold"]] * len(partial_names)
        bars = ax2.barh(partial_names, partial_rhos, color=bar_colors,
                        edgecolor=COLORS["border"], height=0.5)
        ax2.axvline(x=0, color=COLORS["text_dim"], linestyle="-", alpha=0.8)
        for bar, rho in zip(bars, partial_rhos):
            ax2.text(bar.get_width() + 0.005, bar.get_y() + bar.get_height() / 2,
                     f"{rho:+.4f}", va="center", fontsize=10, color=COLORS["text"],
                     fontfamily="monospace")
    ax2.set_xlabel("Partial Spearman Rho (MoS → Fwd HPI)", fontsize=10)
    ax2.set_title("MoS Partial Correlations (controlling for V1)", fontsize=12,
                  fontweight="bold", color=COLORS["gold"])
    ax2.grid(True, alpha=0.3, axis="x")

    out_path = os.path.join(RESULTS_DIR, "08_mos_independence.png")
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Chart saved: {out_path}")
    return out_path


# ═══════════════════════════════════════════════════════════════
# STEP 6: RESULTS REPORT
# ═══════════════════════════════════════════════════════════════

def save_results(spearman, quintile, wf, independence, regime, panel_stats):
    """Save all results as JSON."""
    all_results = {
        "generated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "signal": "Months of Supply (Redfin, inverted z-score)",
        "target": "FHFA HPI forward change",
        "panel": panel_stats,
        "spearman_correlation": spearman,
        "quintile_analysis": quintile,
        "walk_forward": wf,
        "independence": independence,
        "regime_analysis": regime,
    }

    # Pass/fail summary
    tests_passed = 0
    tests_failed = 0
    tests_total = 0

    # Spearman pass: rho > 0.10, p < 0.01
    for key, data in spearman.items():
        tests_total += 1
        if data.get("PASS"):
            tests_passed += 1
        else:
            tests_failed += 1

    # Quintile pass: spread > 5pp
    for key, data in quintile.items():
        tests_total += 1
        if data.get("PASS"):
            tests_passed += 1
        else:
            tests_failed += 1

    # Walk-forward pass: >= 60% positive
    if isinstance(wf, dict) and "PASS" in wf:
        tests_total += 1
        if wf["PASS"]:
            tests_passed += 1
        else:
            tests_failed += 1

    all_results["summary"] = {
        "tests_passed": tests_passed,
        "tests_failed": tests_failed,
        "tests_total": tests_total,
        "overall_pass": tests_passed > tests_failed and tests_passed >= 3,
    }

    json_path = os.path.join(RESULTS_DIR, "06_mos_backtest_results.json")
    with open(json_path, "w") as f:
        json.dump(all_results, f, indent=2, default=str)
    print(f"\n  JSON results saved: {json_path}")
    return all_results


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("MONTHS-OF-SUPPLY BACKTEST — The #1 Signal")
    print("Richmond Fed 2025: R²=0.347 — Strongest single predictor")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # ── Load data ──
    print("\n[1/7] LOADING DATA")
    print("-" * 50)
    redfin = load_redfin_mos()
    fhfa = load_fhfa_msa()

    # ── Build metro mapping ──
    print("\n[2/7] MATCHING REDFIN METROS → FHFA MSAs")
    print("-" * 50)
    redfin_regions = redfin["region"].unique()
    fhfa_msas = fhfa["msa_name"].unique()
    metro_map = build_metro_mapping(redfin_regions, fhfa_msas)

    # Show some sample matches
    sample_matches = list(metro_map.items())[:10]
    for rf, fh in sample_matches:
        print(f"    {rf:45s} → {fh}")
    if len(metro_map) > 10:
        print(f"    ... and {len(metro_map) - 10} more")

    # ── Aggregate and compute signals ──
    print("\n[3/7] BUILDING SIGNAL PANEL")
    print("-" * 50)

    # Quarterly aggregation
    print("  Aggregating monthly → quarterly...")
    quarterly = aggregate_monthly_to_quarterly(redfin)
    print(f"  Quarterly: {len(quarterly):,} metro-quarter observations")

    # Z-score computation
    print("  Computing 3-year rolling z-scores (inverted)...")
    quarterly = compute_zscore_per_msa(quarterly)
    print(f"  Z-scores computed: {quarterly['mos_z'].notna().sum():,} valid")

    # Forward HPI returns
    print("  Computing forward HPI returns...")
    fhfa_fwd = compute_forward_hpi(fhfa)
    for h, label in FWD_HORIZONS.items():
        col = f"fwd_hpi_{h}q"
        n_valid = fhfa_fwd[col].notna().sum()
        print(f"    {label}: {n_valid:,} valid observations")

    # Build merged panel
    print("  Merging signal with forward returns...")
    panel = build_panel(quarterly, fhfa_fwd, metro_map)

    if len(panel) < 100:
        print(f"\n  FATAL: Panel only has {len(panel)} observations. Cannot run meaningful backtest.")
        return

    panel_stats = {
        "n_observations": len(panel),
        "n_msas": int(panel["fhfa_msa"].nunique()),
        "n_quarters": int(panel["date"].nunique()),
        "date_range": f"{panel['date'].min().year}Q{(panel['date'].min().month-1)//3+1} to {panel['date'].max().year}Q{(panel['date'].max().month-1)//3+1}",
        "redfin_metros_total": len(redfin_regions),
        "fhfa_msas_total": len(fhfa_msas),
        "matched_msas": len(metro_map),
    }

    # ── Run tests ──
    print("\n[4/7] STATISTICAL TESTS")
    print("=" * 70)

    spearman_results = test_spearman_by_horizon(panel)
    quintile_results = test_quintile_spread(panel)
    wf_results = test_walk_forward(panel)
    regime_results = test_regime_analysis(panel)

    print("\n[5/7] INDEPENDENCE TESTS")
    print("=" * 70)
    independence_results = test_independence_vs_v1_signals(panel)

    # ── Generate charts ──
    print("\n[6/7] GENERATING CHARTS")
    print("-" * 50)
    plot_main_results(panel, spearman_results, quintile_results, wf_results, regime_results)
    plot_independence(panel, independence_results)

    # ── Save results ──
    print("\n[7/7] SAVING RESULTS")
    print("-" * 50)
    all_results = save_results(spearman_results, quintile_results, wf_results,
                                independence_results, regime_results, panel_stats)

    # ── Final summary ──
    print("\n" + "=" * 70)
    print("MONTHS-OF-SUPPLY BACKTEST — FINAL RESULTS")
    print("=" * 70)

    summary = all_results["summary"]
    print(f"\n  Tests PASSED: {summary['tests_passed']}")
    print(f"  Tests FAILED: {summary['tests_failed']}")
    print(f"  Tests TOTAL:  {summary['tests_total']}")

    print(f"\n  Pass Criteria:")
    # Spearman
    for key, data in spearman_results.items():
        label = data.get("horizon", key)
        rho = data.get("rho", 0)
        p = data.get("p", 1)
        status = "PASS" if data.get("PASS") else "FAIL"
        print(f"    [{status}] {label} Spearman rho={rho:+.4f} (threshold: >0.10, p<0.01)")

    # Quintile
    for key, data in quintile_results.items():
        label = data.get("horizon", key)
        spread = data.get("spread_pp", 0)
        status = "PASS" if data.get("PASS") else "FAIL"
        print(f"    [{status}] {label} Q5-Q1 spread={spread:+.2f}pp (threshold: >5pp)")

    # Walk-forward
    pct_pos = wf_results.get("pct_positive", 0) if isinstance(wf_results, dict) else 0
    wf_pass = wf_results.get("PASS", False) if isinstance(wf_results, dict) else False
    print(f"    [{'PASS' if wf_pass else 'FAIL'}] Walk-forward {pct_pos:.0f}% positive (threshold: >=60%)")

    overall = "SIGNAL VALIDATED" if summary["overall_pass"] else "SIGNAL NEEDS MORE WORK"
    print(f"\n  OVERALL VERDICT: {overall}")
    print(f"\n  Results: backtest/results/06_mos_backtest_results.json")
    print(f"  Charts:  backtest/results/07_months_of_supply.png")
    print(f"           backtest/results/08_mos_independence.png")
    print(f"\n  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
