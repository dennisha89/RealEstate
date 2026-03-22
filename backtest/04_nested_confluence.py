"""
Nested Convergence/Divergence Analysis
=======================================
Tests whether stacking convergence pairs on top of each other
produces stronger predictive signals at each nesting level.

LEVEL 0: Individual signals (permits_z, rate_z, hpi_momentum_z)
LEVEL 1: Pairwise convergence (do pairs agree? converge/diverge)
LEVEL 2: Meta-convergence (do the PAIRS agree with each other?)
LEVEL 3: Convergence momentum (is convergence TRENDING up or down?)

At each level, test: does this predict forward HPI better than the level below?
"""
import os
import warnings
import numpy as np
import pandas as pd
from scipy import stats as sp_stats
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

warnings.filterwarnings("ignore")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")

COLORS = {
    "bg": "#000000", "card": "#0A0A0A", "border": "#1F1F1F",
    "text": "#E5E5E5", "text_dim": "#666666", "gold": "#C9A227",
    "emerald": "#10B981", "amber": "#F59E0B", "rose": "#EF4444",
    "blue": "#3B82F6", "purple": "#8B5CF6", "cyan": "#06B6D4",
}

plt.rcParams.update({
    "figure.facecolor": COLORS["bg"], "axes.facecolor": COLORS["card"],
    "axes.edgecolor": COLORS["border"], "axes.labelcolor": COLORS["text"],
    "text.color": COLORS["text"], "xtick.color": COLORS["text_dim"],
    "ytick.color": COLORS["text_dim"], "grid.color": COLORS["border"],
    "font.size": 10,
})


# ═══════════════════════════════════════════════════════════════
# DATA LOADING (reuse from backtest)
# ═══════════════════════════════════════════════════════════════

def load_fred_csv(filename):
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

def compute_zscore(series, window=40):
    rm = series.rolling(window=window, min_periods=max(8, window//4)).mean()
    rs = series.rolling(window=window, min_periods=max(8, window//4)).std().replace(0, np.nan)
    return ((series - rm) / rs).clip(-3, 3)

def build_quarterly(monthly_df):
    df = monthly_df.copy()
    df["quarter"] = df["date"].dt.to_period("Q")
    q = df.groupby("quarter")["value"].mean().reset_index()
    q["date"] = q["quarter"].dt.to_timestamp()
    return q[["date", "value"]]

def build_panel():
    """Build the same panel as the backtest, with FHFA forward returns."""
    mortgage = load_fred_csv("fred_mortgage30.csv")
    m2v = load_fred_csv("fred_m2v.csv")
    us_hpi = load_fred_csv("fred_us_hpi.csv")

    permits = {}
    for f in os.listdir(DATA_DIR):
        if f.startswith("fred_permits_") and f != "fred_permits_national.csv":
            city = f.replace("fred_permits_", "").replace(".csv", "")
            df = load_fred_csv(f)
            if df is not None and len(df) > 12:
                permits[city] = df

    # Build quarterly signals
    quarterly_permits = {}
    for city, df in permits.items():
        q = build_quarterly(df)
        if len(q) > 20:
            quarterly_permits[city] = q

    rates_q = build_quarterly(mortgage).sort_values("date").reset_index(drop=True)
    rates_q["rate_z"] = compute_zscore(rates_q["value"], window=40)
    rates_q["rate_z_inv"] = -rates_q["rate_z"]

    hpi_q = us_hpi.sort_values("date").reset_index(drop=True)
    hpi_q["hpi_mom"] = hpi_q["value"].pct_change(periods=2) * 100
    hpi_q["hpi_momentum_z"] = compute_zscore(hpi_q["hpi_mom"], window=40)

    city_signals = {}
    for city, q_p in quarterly_permits.items():
        q_p = q_p.sort_values("date").reset_index(drop=True)
        q_p["yoy"] = q_p["value"].pct_change(periods=4) * 100
        q_p["permits_z"] = compute_zscore(q_p["yoy"], window=40)
        city_signals[city] = q_p[["date", "permits_z"]].dropna()

    rate_lookup = dict(zip(rates_q["date"], rates_q["rate_z_inv"]))
    hpi_mom_lookup = dict(zip(hpi_q["date"], hpi_q["hpi_momentum_z"]))

    all_dates = set()
    for cs in city_signals.values():
        all_dates.update(cs["date"].tolist())
    common = sorted(all_dates & set(rate_lookup.keys()) & set(hpi_mom_lookup.keys()))
    common = [d for d in common if d >= pd.Timestamp("2000-01-01")]

    rows = []
    for city, cs in city_signals.items():
        cs_lookup = dict(zip(cs["date"], cs["permits_z"]))
        for date in common:
            pz = cs_lookup.get(date)
            rz = rate_lookup.get(date)
            hz = hpi_mom_lookup.get(date)
            if all(v is not None and not np.isnan(v) for v in [pz, rz, hz]):
                rows.append({"city": city, "date": date,
                             "permits_z": pz, "rate_z_inv": rz, "hpi_momentum_z": hz})

    panel = pd.DataFrame(rows)

    # Attach FHFA forward returns
    fhfa_path = os.path.join(DATA_DIR, "fhfa_hpi_msa.csv")
    if os.path.exists(fhfa_path):
        fhfa = pd.read_csv(fhfa_path, header=None,
                           names=["msa_name", "cbsa", "year", "quarter", "hpi", "std_err"],
                           quotechar='"')
        fhfa["hpi"] = pd.to_numeric(fhfa["hpi"], errors="coerce")
        fhfa["year"] = pd.to_numeric(fhfa["year"], errors="coerce")
        fhfa["quarter"] = pd.to_numeric(fhfa["quarter"], errors="coerce")
        fhfa = fhfa.dropna(subset=["hpi", "year", "quarter"])
        fhfa["date"] = pd.to_datetime(
            fhfa["year"].astype(int).astype(str) + "-" +
            ((fhfa["quarter"].astype(int) - 1) * 3 + 1).astype(str).str.zfill(2) + "-01")

        CITY_TO_MSA = {
            "atlanta": "Atlanta", "austin": "Austin", "boston": "Boston",
            "charlotte": "Charlotte", "chicago": "Chicago", "houston": "Houston",
            "miami": "Miami", "minneapolis": "Minneapolis", "new_york": "New York",
            "orlando": "Orlando", "san_francisco": "San Francisco", "seattle": "Seattle",
            "dallas": "Dallas", "denver": "Denver", "detroit": "Detroit",
            "nashville": "Nashville", "phoenix": "Phoenix", "tampa": "Tampa",
            "raleigh": "Raleigh", "portland": "Portland", "cincinnati": "Cincinnati",
            "cleveland": "Cleveland", "columbus": "Columbus",
            "indianapolis": "Indianapolis", "jacksonville": "Jacksonville",
            "kansas_city": "Kansas City", "los_angeles": "Los Angeles",
            "philadelphia": "Philadelphia", "pittsburgh": "Pittsburgh",
            "salt_lake_city": "Salt Lake City", "san_diego": "San Diego",
        }
        fhfa_msas = fhfa["msa_name"].unique()
        city_msa = {}
        for city in panel["city"].unique():
            search = CITY_TO_MSA.get(city, city.replace("_", " ").title())
            matches = [m for m in fhfa_msas if search.lower() in m.lower()]
            if matches:
                city_msa[city] = matches[0]

        for h in [4, 6, 8]:
            panel[f"fwd_hpi_{h}q"] = np.nan

        for idx, row in panel.iterrows():
            msa = city_msa.get(row["city"])
            if not msa:
                continue
            msa_data = fhfa[fhfa["msa_name"] == msa].sort_values("date")
            cur = msa_data[msa_data["date"] == row["date"]]["hpi"]
            if len(cur) == 0:
                continue
            cv = cur.iloc[0]
            for h in [4, 6, 8]:
                fd = row["date"] + pd.DateOffset(months=3 * h)
                fut = msa_data[(msa_data["date"] >= fd - pd.DateOffset(months=2)) &
                               (msa_data["date"] <= fd + pd.DateOffset(months=2))]["hpi"]
                if len(fut) > 0 and cv > 0:
                    panel.at[idx, f"fwd_hpi_{h}q"] = (fut.iloc[0] - cv) / cv * 100

    return panel


# ═══════════════════════════════════════════════════════════════
# LEVEL 0: Individual Signals (baseline)
# ═══════════════════════════════════════════════════════════════

def level0_individual(panel):
    """Test each signal individually against forward HPI."""
    print("\n" + "=" * 70)
    print("LEVEL 0: INDIVIDUAL SIGNALS (baseline)")
    print("=" * 70)

    results = {}
    for col, name in [("permits_z", "Permits"), ("rate_z_inv", "Rates(inv)"), ("hpi_momentum_z", "HPI Mom.")]:
        for fwd, horizon in [("fwd_hpi_4q", "12mo"), ("fwd_hpi_6q", "18mo")]:
            clean = panel[[col, fwd]].dropna()
            if len(clean) > 50:
                rho, p = sp_stats.spearmanr(clean[col], clean[fwd])
                sig = "***" if p < 0.01 else "**" if p < 0.05 else ""
                results[f"{name}_{horizon}"] = {"rho": rho, "p": p, "n": len(clean)}
                print(f"  {name:15s} → {horizon}: rho={rho:>7.4f} {sig:3s}  (n={len(clean)})")
    return results


# ═══════════════════════════════════════════════════════════════
# LEVEL 1: Pairwise Convergence/Divergence
# ═══════════════════════════════════════════════════════════════

def level1_pairwise(panel):
    """
    For each pair of signals, compute whether they CONVERGE (same sign)
    or DIVERGE (opposite sign). Test if convergence predicts better.
    """
    print("\n" + "=" * 70)
    print("LEVEL 1: PAIRWISE CONVERGENCE / DIVERGENCE")
    print("=" * 70)

    signals = ["permits_z", "rate_z_inv", "hpi_momentum_z"]
    signal_names = ["Permits", "Rates", "HPI Mom."]
    pairs = [(0, 1), (0, 2), (1, 2)]

    panel = panel.copy()

    for i, j in pairs:
        col_i, col_j = signals[i], signals[j]
        name_i, name_j = signal_names[i], signal_names[j]
        pair_name = f"{name_i}_{name_j}"

        # Convergence = both same sign (both bullish or both bearish)
        # Divergence = opposite signs
        # Strength = product of z-scores (positive = converge, negative = diverge)
        panel[f"pair_{pair_name}_product"] = panel[col_i] * panel[col_j]
        panel[f"pair_{pair_name}_converge"] = (
            (panel[col_i] > 0) & (panel[col_j] > 0)  # both bullish
        ).astype(int) - (
            (panel[col_i] < 0) & (panel[col_j] < 0)  # both bearish
        ).astype(int)
        # +1 = both bullish, -1 = both bearish, 0 = diverging

        # Alternative: continuous measure — product of z-scores
        # Positive product = converge, negative = diverge, magnitude = strength

    # Test each pair's convergence product against forward HPI
    print("\n  Pair Product (z1 * z2) → Forward HPI:")
    print(f"  {'Pair':25s} {'→12mo rho':>12} {'→18mo rho':>12} {'N':>8}")
    print(f"  " + "-" * 60)

    results = {}
    for i, j in pairs:
        name_i, name_j = signal_names[i], signal_names[j]
        pair_name = f"{name_i}_{name_j}"
        product_col = f"pair_{pair_name}_product"

        rhos = {}
        for fwd, horizon in [("fwd_hpi_4q", "12mo"), ("fwd_hpi_6q", "18mo")]:
            clean = panel[[product_col, fwd]].dropna()
            if len(clean) > 50:
                rho, p = sp_stats.spearmanr(clean[product_col], clean[fwd])
                sig = "***" if p < 0.01 else "**" if p < 0.05 else ""
                rhos[horizon] = f"{rho:>7.4f}{sig:3s}"
                results[f"{pair_name}_{horizon}"] = {"rho": rho, "p": p, "n": len(clean)}
            else:
                rhos[horizon] = "   N/A   "

        n = len(panel[product_col].dropna())
        print(f"  {pair_name:25s} {rhos.get('12mo', 'N/A'):>12} {rhos.get('18mo', 'N/A'):>12} {n:>8}")

    # ── Show convergence states vs forward returns ──
    print("\n  Convergence States → Avg 18mo Forward HPI:")
    print(f"  {'State':35s} {'Avg Return':>12} {'N':>8}")
    print(f"  " + "-" * 58)

    # Count how many pairs converge bullish
    panel["n_converge_bullish"] = 0
    panel["n_converge_bearish"] = 0
    panel["n_diverge"] = 0

    for i, j in pairs:
        name_i, name_j = signal_names[i], signal_names[j]
        pair_name = f"{name_i}_{name_j}"
        product_col = f"pair_{pair_name}_product"

        panel["n_converge_bullish"] += (panel[product_col] > 0).astype(int) * \
            ((panel[signals[i]] > 0) & (panel[signals[j]] > 0)).astype(int)
        panel["n_converge_bearish"] += (panel[product_col] > 0).astype(int) * \
            ((panel[signals[i]] < 0) & (panel[signals[j]] < 0)).astype(int)
        panel["n_diverge"] += (panel[product_col] < 0).astype(int)

    # Classify overall state
    def classify_state(row):
        if row["n_converge_bullish"] == 3:
            return "3/3 Bullish Convergence"
        elif row["n_converge_bullish"] == 2:
            return "2/3 Bullish + 1 Mixed"
        elif row["n_converge_bearish"] == 3:
            return "3/3 Bearish Convergence"
        elif row["n_converge_bearish"] == 2:
            return "2/3 Bearish + 1 Mixed"
        else:
            return "Full Divergence (mixed)"

    panel["convergence_state"] = panel.apply(classify_state, axis=1)

    fwd_col = "fwd_hpi_6q"
    state_returns = panel.groupby("convergence_state")[fwd_col].agg(["mean", "count"]).sort_values("mean", ascending=False)
    for state, row in state_returns.iterrows():
        if row["count"] >= 10:
            print(f"  {state:35s} {row['mean']:>10.2f}% {int(row['count']):>8}")

    return panel, results


# ═══════════════════════════════════════════════════════════════
# LEVEL 2: Meta-Convergence (Convergence OF Convergences)
# ═══════════════════════════════════════════════════════════════

def level2_meta(panel):
    """
    Stack the pairwise convergence products into a meta-signal.
    Does the AGREEMENT between pairs predict forward returns?
    """
    print("\n" + "=" * 70)
    print("LEVEL 2: META-CONVERGENCE (Convergence of Convergences)")
    print("=" * 70)

    # Meta signal: average of all pair products
    pair_cols = [c for c in panel.columns if c.startswith("pair_") and c.endswith("_product")]
    panel["meta_convergence"] = panel[pair_cols].mean(axis=1)

    # Also: variance of pair products (low variance = all pairs agree, high = disagreement)
    panel["meta_divergence"] = panel[pair_cols].std(axis=1)

    # Test meta-convergence against forward HPI
    print("\n  Meta-Convergence (avg of pair products) → Forward HPI:")
    results = {}
    for fwd, horizon in [("fwd_hpi_4q", "12mo"), ("fwd_hpi_6q", "18mo"), ("fwd_hpi_8q", "24mo")]:
        clean = panel[["meta_convergence", fwd]].dropna()
        if len(clean) > 50:
            rho, p = sp_stats.spearmanr(clean["meta_convergence"], clean[fwd])
            sig = "***" if p < 0.01 else "**" if p < 0.05 else ""
            results[f"meta_{horizon}"] = {"rho": rho, "p": p, "n": len(clean)}
            print(f"    {horizon}: rho={rho:.4f} {sig}  (n={len(clean)})")

    # Test meta-divergence (std of pairs) — does disagreement predict worse returns?
    print("\n  Meta-Divergence (std of pair products) → Forward HPI:")
    for fwd, horizon in [("fwd_hpi_4q", "12mo"), ("fwd_hpi_6q", "18mo")]:
        clean = panel[["meta_divergence", fwd]].dropna()
        if len(clean) > 50:
            rho, p = sp_stats.spearmanr(clean["meta_divergence"], clean[fwd])
            sig = "***" if p < 0.01 else "**" if p < 0.05 else ""
            print(f"    {horizon}: rho={rho:.4f} {sig}  (n={len(clean)})")
            # Negative rho = more divergence → worse returns (expected)

    # Quintile analysis of meta-convergence
    print("\n  Meta-Convergence Quintiles → 18mo Forward HPI:")
    clean = panel[["meta_convergence", "fwd_hpi_6q"]].dropna()
    if len(clean) > 50:
        clean = clean.copy()
        clean["quintile"] = pd.qcut(clean["meta_convergence"], q=5,
                                     labels=["Q1 (Diverge)", "Q2", "Q3", "Q4", "Q5 (Converge)"],
                                     duplicates="drop")
        q_means = clean.groupby("quintile", observed=True)["fwd_hpi_6q"].agg(["mean", "count"])
        print(f"  {'Quintile':20s} {'Avg 18mo HPI':>15} {'N':>8}")
        print(f"  " + "-" * 46)
        for q, row in q_means.iterrows():
            print(f"  {str(q):20s} {row['mean']:>13.2f}% {int(row['count']):>8}")
        spread = q_means.iloc[-1]["mean"] - q_means.iloc[0]["mean"]
        print(f"\n  Spread (Q5-Q1): {spread:+.2f}pp")

    return panel, results


# ═══════════════════════════════════════════════════════════════
# LEVEL 3: Convergence Momentum (Is convergence trending?)
# ═══════════════════════════════════════════════════════════════

def level3_momentum(panel):
    """
    Does the TREND of convergence (increasing vs decreasing over time)
    add predictive power beyond the current convergence level?
    """
    print("\n" + "=" * 70)
    print("LEVEL 3: CONVERGENCE MOMENTUM (Is convergence trending up/down?)")
    print("=" * 70)

    # For each city, compute rolling change in meta-convergence
    panel = panel.sort_values(["city", "date"])
    panel["meta_conv_4q_change"] = panel.groupby("city")["meta_convergence"].transform(
        lambda x: x - x.shift(4)  # change over 4 quarters (1 year)
    )
    panel["meta_conv_2q_change"] = panel.groupby("city")["meta_convergence"].transform(
        lambda x: x - x.shift(2)  # change over 2 quarters (6 months)
    )

    # Test: does ACCELERATING convergence predict better returns than static convergence?
    print("\n  Convergence Momentum (4q change) → Forward HPI:")
    results = {}
    for fwd, horizon in [("fwd_hpi_4q", "12mo"), ("fwd_hpi_6q", "18mo")]:
        clean = panel[["meta_conv_4q_change", fwd]].dropna()
        if len(clean) > 50:
            rho, p = sp_stats.spearmanr(clean["meta_conv_4q_change"], clean[fwd])
            sig = "***" if p < 0.01 else "**" if p < 0.05 else ""
            results[f"momentum_4q_{horizon}"] = {"rho": rho, "p": p, "n": len(clean)}
            print(f"    {horizon}: rho={rho:.4f} {sig}  (n={len(clean)})")

    print("\n  Convergence Momentum (2q change) → Forward HPI:")
    for fwd, horizon in [("fwd_hpi_4q", "12mo"), ("fwd_hpi_6q", "18mo")]:
        clean = panel[["meta_conv_2q_change", fwd]].dropna()
        if len(clean) > 50:
            rho, p = sp_stats.spearmanr(clean["meta_conv_2q_change"], clean[fwd])
            sig = "***" if p < 0.01 else "**" if p < 0.05 else ""
            print(f"    {horizon}: rho={rho:.4f} {sig}  (n={len(clean)})")

    # ── Interaction: Static convergence × Momentum ──
    print("\n  Interaction: High Meta-Convergence + Increasing Momentum → 18mo HPI:")
    clean = panel[["meta_convergence", "meta_conv_4q_change", "fwd_hpi_6q"]].dropna()
    if len(clean) > 100:
        clean = clean.copy()
        clean["conv_high"] = clean["meta_convergence"] > clean["meta_convergence"].median()
        clean["mom_positive"] = clean["meta_conv_4q_change"] > 0

        groups = clean.groupby(["conv_high", "mom_positive"])["fwd_hpi_6q"].agg(["mean", "count"])
        print(f"  {'Convergence':>15} {'Momentum':>12} {'Avg 18mo HPI':>15} {'N':>8}")
        print(f"  " + "-" * 54)
        for (conv, mom), row in groups.iterrows():
            conv_label = "HIGH" if conv else "LOW"
            mom_label = "RISING" if mom else "FALLING"
            print(f"  {conv_label:>15} {mom_label:>12} {row['mean']:>13.2f}% {int(row['count']):>8}")

        # The key test: does HIGH convergence + RISING momentum beat everything else?
        best = groups.loc[(True, True), "mean"] if (True, True) in groups.index else None
        worst = groups.loc[(False, False), "mean"] if (False, False) in groups.index else None
        if best is not None and worst is not None:
            print(f"\n  Best (High+Rising) vs Worst (Low+Falling): {best - worst:+.2f}pp")

    return panel, results


# ═══════════════════════════════════════════════════════════════
# COMPARISON: Does Nesting Improve Prediction?
# ═══════════════════════════════════════════════════════════════

def compare_levels(panel, l0_results, l1_results, l2_results, l3_results):
    """Compare predictive power across all nesting levels."""
    print("\n" + "=" * 70)
    print("COMPARISON: DOES DEEPER NESTING IMPROVE PREDICTION?")
    print("=" * 70)

    # Build comparison table
    rows = []

    # Level 0: best individual signal
    best_l0 = max(l0_results.items(), key=lambda x: abs(x[1]["rho"]) if "18mo" in x[0] else 0)
    l0_rho = max(abs(v["rho"]) for k, v in l0_results.items() if "18mo" in k)

    # Level 1: best pair product
    l1_rho = max(abs(v["rho"]) for k, v in l1_results.items() if "18mo" in k) if l1_results else 0

    # Level 2: meta convergence
    l2_rho = abs(l2_results.get("meta_18mo", {}).get("rho", 0))

    # Level 3: convergence momentum
    l3_rho = abs(l3_results.get("momentum_4q_18mo", {}).get("rho", 0))

    # Simple composite (Level 0): weighted average of all signals
    composite = 0.60 * panel["permits_z"] + 0.25 * panel["rate_z_inv"] + 0.15 * panel["hpi_momentum_z"]
    clean = pd.DataFrame({"composite": composite, "fwd": panel["fwd_hpi_6q"]}).dropna()
    if len(clean) > 50:
        composite_rho = abs(sp_stats.spearmanr(clean["composite"], clean["fwd"])[0])
    else:
        composite_rho = 0

    print(f"\n  {'Level':35s} {'|rho| vs 18mo HPI':>20} {'Improvement':>15}")
    print(f"  " + "-" * 72)
    print(f"  {'L0: Best Individual Signal':35s} {l0_rho:>18.4f} {'(baseline)':>15}")
    print(f"  {'L0: Simple Weighted Composite':35s} {composite_rho:>18.4f} {composite_rho - l0_rho:>+14.4f}")
    print(f"  {'L1: Best Pairwise Product':35s} {l1_rho:>18.4f} {l1_rho - l0_rho:>+14.4f}")
    print(f"  {'L2: Meta-Convergence':35s} {l2_rho:>18.4f} {l2_rho - l0_rho:>+14.4f}")
    print(f"  {'L3: Convergence Momentum':35s} {l3_rho:>18.4f} {l3_rho - l0_rho:>+14.4f}")

    # Determine optimal depth
    all_levels = {
        "L0 Individual": l0_rho,
        "L0 Composite": composite_rho,
        "L1 Pairwise": l1_rho,
        "L2 Meta": l2_rho,
        "L3 Momentum": l3_rho,
    }
    best_level = max(all_levels, key=all_levels.get)
    best_rho = all_levels[best_level]

    print(f"\n  OPTIMAL DEPTH: {best_level} (rho={best_rho:.4f})")

    if l2_rho > l0_rho:
        print("  META-CONVERGENCE ADDS VALUE — nested confluence improves prediction")
    else:
        print("  META-CONVERGENCE DOES NOT ADD VALUE — simple composite is sufficient")

    if l3_rho > l2_rho:
        print("  MOMENTUM ADDS VALUE — trend of convergence provides additional signal")
    else:
        print("  MOMENTUM DOES NOT ADD VALUE — deeper nesting = overfitting")

    return all_levels


# ═══════════════════════════════════════════════════════════════
# VISUALIZATION
# ═══════════════════════════════════════════════════════════════

def visualize_nesting(panel, all_levels):
    """Generate chart showing nesting depth vs predictive power."""
    fig, axes = plt.subplots(1, 3, figsize=(20, 7))
    fig.suptitle("NESTED CONVERGENCE/DIVERGENCE — Does Deeper Nesting Improve Prediction?",
                 fontsize=14, fontweight="bold", color=COLORS["gold"], y=1.02)

    # Chart 1: Bar chart of rho by nesting level
    ax = axes[0]
    levels = list(all_levels.keys())
    rhos = list(all_levels.values())
    colors = [COLORS["emerald"] if r == max(rhos) else COLORS["gold"] for r in rhos]
    bars = ax.barh(range(len(levels)), rhos, color=colors, edgecolor=COLORS["border"])
    ax.set_yticks(range(len(levels)))
    ax.set_yticklabels(levels, fontsize=9)
    ax.set_xlabel("|Spearman rho| vs 18mo Forward HPI", fontsize=9)
    ax.set_title("Predictive Power by Nesting Depth", fontsize=11, fontweight="bold")
    for bar, r in zip(bars, rhos):
        ax.text(bar.get_width() + 0.005, bar.get_y() + bar.get_height()/2,
                f"{r:.4f}", va="center", fontsize=9, color=COLORS["text"])
    ax.grid(True, axis="x", alpha=0.3)

    # Chart 2: Meta-convergence quintiles vs forward HPI
    ax = axes[1]
    if "meta_convergence" in panel.columns and "fwd_hpi_6q" in panel.columns:
        clean = panel[["meta_convergence", "fwd_hpi_6q"]].dropna()
        if len(clean) > 50:
            clean = clean.copy()
            clean["q"] = pd.qcut(clean["meta_convergence"], q=5, labels=False, duplicates="drop")
            q_means = clean.groupby("q")["fwd_hpi_6q"].mean()
            bar_colors = [COLORS["rose"] if v < 0 else COLORS["emerald"] for v in q_means]
            ax.bar(range(len(q_means)), q_means.values, color=bar_colors, edgecolor=COLORS["border"])
            ax.set_xticks(range(len(q_means)))
            ax.set_xticklabels(["Q1\nDiverge", "Q2", "Q3", "Q4", "Q5\nConverge"], fontsize=9)
            for i, v in enumerate(q_means.values):
                ax.text(i, v + 0.3, f"{v:.1f}%", ha="center", fontsize=9, color=COLORS["text"])
    ax.set_ylabel("Avg 18mo Forward HPI (%)", fontsize=9)
    ax.set_title("Meta-Convergence Quintiles", fontsize=11, fontweight="bold")
    ax.axhline(y=0, color=COLORS["text_dim"], linewidth=0.8)
    ax.grid(True, axis="y", alpha=0.3)

    # Chart 3: 2x2 interaction (convergence level × momentum direction)
    ax = axes[2]
    if "meta_convergence" in panel.columns and "meta_conv_4q_change" in panel.columns:
        clean = panel[["meta_convergence", "meta_conv_4q_change", "fwd_hpi_6q"]].dropna()
        if len(clean) > 100:
            clean = clean.copy()
            clean["conv"] = np.where(clean["meta_convergence"] > clean["meta_convergence"].median(), "High Conv.", "Low Conv.")
            clean["mom"] = np.where(clean["meta_conv_4q_change"] > 0, "Rising", "Falling")
            clean["group"] = clean["conv"] + " + " + clean["mom"]

            group_order = ["Low Conv. + Falling", "Low Conv. + Rising", "High Conv. + Falling", "High Conv. + Rising"]
            group_colors = [COLORS["rose"], COLORS["amber"], COLORS["amber"], COLORS["emerald"]]
            g_means = clean.groupby("group")["fwd_hpi_6q"].mean()

            vals = [g_means.get(g, 0) for g in group_order]
            ax.bar(range(4), vals, color=group_colors, edgecolor=COLORS["border"])
            ax.set_xticks(range(4))
            ax.set_xticklabels(["Low Conv\nFalling", "Low Conv\nRising", "High Conv\nFalling", "High Conv\nRising"], fontsize=8)
            for i, v in enumerate(vals):
                ax.text(i, v + 0.3, f"{v:.1f}%", ha="center", fontsize=9, color=COLORS["text"])
    ax.set_ylabel("Avg 18mo Forward HPI (%)", fontsize=9)
    ax.set_title("Convergence Level x Momentum", fontsize=11, fontweight="bold")
    ax.axhline(y=0, color=COLORS["text_dim"], linewidth=0.8)
    ax.grid(True, axis="y", alpha=0.3)

    fig.tight_layout()
    fig.savefig(os.path.join(RESULTS_DIR, "06_nested_confluence.png"), dpi=150, bbox_inches="tight")
    print(f"\n  Saved: 06_nested_confluence.png")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("NESTED CONVERGENCE / DIVERGENCE ANALYSIS")
    print("Testing: Do deeper layers of signal agreement improve predictions?")
    print("=" * 70)

    print("\nBuilding panel...")
    panel = build_panel()
    print(f"Panel: {len(panel)} obs, {panel['city'].nunique()} cities")
    fwd_count = panel["fwd_hpi_6q"].notna().sum()
    print(f"Observations with 18mo forward HPI: {fwd_count}")

    # Run all levels
    l0_results = level0_individual(panel)
    panel, l1_results = level1_pairwise(panel)
    panel, l2_results = level2_meta(panel)
    panel, l3_results = level3_momentum(panel)

    # Compare
    all_levels = compare_levels(panel, l0_results, l1_results, l2_results, l3_results)

    # Visualize
    print("\nGenerating charts...")
    visualize_nesting(panel, all_levels)

    print("\n" + "=" * 70)
    print("ANALYSIS COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
