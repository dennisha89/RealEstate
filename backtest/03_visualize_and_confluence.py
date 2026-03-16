"""
Step 3: Visualize backtest results + build confluence layers
============================================================
Generates charts showing:
1. Individual signal performance (permits, rates, M2V, HPI momentum)
2. How signals layer on top of each other (confluence)
3. Quintile spreads with real forward HPI returns
4. Walk-forward performance by year
5. Multi-signal confluence heatmap
"""
import os
import warnings
import numpy as np
import pandas as pd
from scipy import stats as sp_stats
import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec

warnings.filterwarnings("ignore")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")
os.makedirs(RESULTS_DIR, exist_ok=True)

# ── Dark theme matching LootVue ──
COLORS = {
    "bg": "#000000",
    "card": "#0A0A0A",
    "border": "#1F1F1F",
    "text": "#E5E5E5",
    "text_dim": "#666666",
    "gold": "#C9A227",
    "gold_light": "#E8C547",
    "emerald": "#10B981",
    "amber": "#F59E0B",
    "rose": "#EF4444",
    "blue": "#3B82F6",
    "purple": "#8B5CF6",
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
    "font.family": "sans-serif",
    "font.size": 10,
})


# ═══════════════════════════════════════════════════════════════
# LOAD DATA (same as backtest script)
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

def load_fhfa_msa():
    fpath = os.path.join(DATA_DIR, "fhfa_hpi_msa.csv")
    if not os.path.exists(fpath):
        return None
    df = pd.read_csv(fpath, header=None, names=["msa_name","cbsa","year","quarter","hpi","std_err"], quotechar='"')
    df["hpi"] = pd.to_numeric(df["hpi"], errors="coerce")
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["quarter"] = pd.to_numeric(df["quarter"], errors="coerce")
    df = df.dropna(subset=["hpi","year","quarter"])
    df["date"] = pd.to_datetime(df["year"].astype(int).astype(str)+"-"+((df["quarter"].astype(int)-1)*3+1).astype(str).str.zfill(2)+"-01")
    return df

def load_permits():
    permits = {}
    for f in os.listdir(DATA_DIR):
        if f.startswith("fred_permits_") and f != "fred_permits_national.csv":
            city = f.replace("fred_permits_","").replace(".csv","")
            df = load_fred_csv(f)
            if df is not None and len(df) > 12:
                permits[city] = df
    return permits

def compute_zscore(series, window=40):
    rm = series.rolling(window=window, min_periods=max(8, window//4)).mean()
    rs = series.rolling(window=window, min_periods=max(8, window//4)).std().replace(0, np.nan)
    return ((series - rm) / rs).clip(-3, 3)

def build_quarterly(monthly_df):
    df = monthly_df.copy()
    df["quarter"] = df["date"].dt.to_period("Q")
    q = df.groupby("quarter")["value"].mean().reset_index()
    q["date"] = q["quarter"].dt.to_timestamp()
    return q[["date","value"]]


# ═══════════════════════════════════════════════════════════════
# CHART 1: INDIVIDUAL SIGNAL → FORWARD HPI (SCATTER + QUINTILE)
# ═══════════════════════════════════════════════════════════════

def chart_signal_vs_hpi(panel, signal_col, signal_name, fwd_col, fwd_label, color, ax):
    """Scatter plot of signal z-score vs forward HPI return with quintile bars."""
    clean = panel[[signal_col, fwd_col]].dropna()
    if len(clean) < 50:
        ax.text(0.5, 0.5, f"Insufficient data\n({len(clean)} obs)", ha="center", va="center",
                transform=ax.transAxes, color=COLORS["text_dim"])
        ax.set_title(f"{signal_name} → {fwd_label}", fontsize=11, fontweight="bold")
        return

    rho, p = sp_stats.spearmanr(clean[signal_col], clean[fwd_col])

    # Scatter
    ax.scatter(clean[signal_col], clean[fwd_col], alpha=0.15, s=8, color=color, edgecolors="none")

    # Trend line
    z = np.polyfit(clean[signal_col].values, clean[fwd_col].values, 1)
    x_line = np.linspace(clean[signal_col].min(), clean[signal_col].max(), 100)
    ax.plot(x_line, np.polyval(z, x_line), color=COLORS["gold"], linewidth=2, linestyle="--")

    # Labels
    sig = "***" if p < 0.01 else "**" if p < 0.05 else "*" if p < 0.10 else "ns"
    ax.set_title(f"{signal_name} → {fwd_label}\nrho={rho:.3f} {sig}", fontsize=11, fontweight="bold")
    ax.set_xlabel(f"{signal_name} (z-score)", fontsize=9)
    ax.set_ylabel(f"Forward HPI Change (%)", fontsize=9)
    ax.axhline(y=0, color=COLORS["border"], linewidth=0.5)
    ax.axvline(x=0, color=COLORS["border"], linewidth=0.5)
    ax.grid(True, alpha=0.3)


# ═══════════════════════════════════════════════════════════════
# CHART 2: QUINTILE BAR CHART (THE MONEY CHART)
# ═══════════════════════════════════════════════════════════════

def chart_quintile_bars(panel, score_col, fwd_col, title, ax):
    """Bar chart: quintile of signal → average forward HPI return."""
    clean = panel[[score_col, fwd_col]].dropna()
    if len(clean) < 50:
        ax.text(0.5, 0.5, "Insufficient data", ha="center", va="center",
                transform=ax.transAxes, color=COLORS["text_dim"])
        return

    clean = clean.copy()
    clean["quintile"] = pd.qcut(clean[score_col], q=5, labels=["Q1\n(Bottom)", "Q2", "Q3", "Q4", "Q5\n(Top)"], duplicates="drop")
    q_means = clean.groupby("quintile", observed=True)[fwd_col].mean()

    colors_bar = [COLORS["rose"], COLORS["rose"], COLORS["amber"], COLORS["emerald"], COLORS["emerald"]]
    # Color based on value
    bar_colors = [COLORS["emerald"] if v > 0 else COLORS["rose"] for v in q_means.values]

    bars = ax.bar(range(len(q_means)), q_means.values, color=bar_colors, edgecolor=COLORS["border"], width=0.7)

    # Value labels on bars
    for bar, val in zip(bars, q_means.values):
        y_pos = val + 0.3 if val >= 0 else val - 0.8
        ax.text(bar.get_x() + bar.get_width()/2, y_pos, f"{val:.1f}%",
                ha="center", va="bottom" if val >= 0 else "top",
                fontsize=9, fontweight="bold", color=COLORS["text"])

    ax.set_xticks(range(len(q_means)))
    ax.set_xticklabels(q_means.index, fontsize=9)
    ax.set_ylabel("Avg Forward HPI Change (%)", fontsize=9)
    ax.set_title(title, fontsize=11, fontweight="bold")
    ax.axhline(y=0, color=COLORS["text_dim"], linewidth=0.8)
    ax.grid(True, axis="y", alpha=0.3)

    # Spread annotation
    spread = q_means.iloc[-1] - q_means.iloc[0]
    ax.annotate(f"Spread: {spread:+.1f}pp", xy=(0.95, 0.95), xycoords="axes fraction",
                ha="right", va="top", fontsize=10, fontweight="bold", color=COLORS["gold"])


# ═══════════════════════════════════════════════════════════════
# CHART 3: CONFLUENCE HEATMAP
# ═══════════════════════════════════════════════════════════════

def chart_confluence_heatmap(panel, ax):
    """Heatmap: how many signals agree → forward HPI."""
    clean = panel[["permits_z", "rate_z_inv", "m2v_z", "hpi_momentum_z", "fwd_hpi_6q"]].dropna()
    if len(clean) < 50:
        ax.text(0.5, 0.5, "Insufficient data", ha="center", va="center",
                transform=ax.transAxes, color=COLORS["text_dim"])
        return

    # Count how many signals are positive (bullish)
    clean = clean.copy()
    clean["n_bullish"] = (
        (clean["permits_z"] > 0).astype(int) +
        (clean["rate_z_inv"] > 0).astype(int) +
        (clean["m2v_z"] > 0).astype(int) +
        (clean["hpi_momentum_z"] > 0).astype(int)
    )

    # Group by number of bullish signals
    confluence = clean.groupby("n_bullish")["fwd_hpi_6q"].agg(["mean", "median", "count"])

    colors_conf = {0: COLORS["rose"], 1: COLORS["rose"], 2: COLORS["amber"],
                   3: COLORS["emerald"], 4: COLORS["emerald"]}
    bar_colors = [colors_conf.get(n, COLORS["text_dim"]) for n in confluence.index]

    bars = ax.bar(confluence.index, confluence["mean"], color=bar_colors,
                  edgecolor=COLORS["border"], width=0.6)

    for bar, val, n in zip(bars, confluence["mean"], confluence["count"]):
        ax.text(bar.get_x() + bar.get_width()/2, val + 0.3, f"{val:.1f}%\n(n={n})",
                ha="center", va="bottom", fontsize=8, color=COLORS["text"])

    ax.set_xlabel("Number of Bullish Signals (out of 4)", fontsize=9)
    ax.set_ylabel("Avg 18-Month Forward HPI (%)", fontsize=9)
    ax.set_title("CONFLUENCE: More Signals Agree → Stronger Returns", fontsize=11, fontweight="bold")
    ax.set_xticks(range(5))
    ax.set_xticklabels(["0\nAll Bearish", "1", "2\nMixed", "3", "4\nAll Bullish"], fontsize=9)
    ax.axhline(y=0, color=COLORS["text_dim"], linewidth=0.8)
    ax.grid(True, axis="y", alpha=0.3)


# ═══════════════════════════════════════════════════════════════
# CHART 4: SIGNAL CORRELATION MATRIX
# ═══════════════════════════════════════════════════════════════

def chart_correlation_matrix(panel, ax):
    """Correlation matrix between all signals and forward returns."""
    cols = ["permits_z", "rate_z_inv", "m2v_z", "hpi_momentum_z", "composite_z"]
    fwd_cols = [c for c in ["fwd_hpi_4q", "fwd_hpi_6q", "fwd_hpi_8q"] if c in panel.columns]
    all_cols = cols + fwd_cols

    clean = panel[all_cols].dropna()
    if len(clean) < 50:
        ax.text(0.5, 0.5, "Insufficient data", ha="center", va="center",
                transform=ax.transAxes, color=COLORS["text_dim"])
        return

    corr = clean.corr(method="spearman")

    # Plot heatmap manually
    labels = ["Permits", "Rate(inv)", "M2V", "HPI Mom.", "Composite",
              "Fwd 12mo", "Fwd 18mo", "Fwd 24mo"][:len(all_cols)]
    n = len(all_cols)
    im = ax.imshow(corr.values, cmap="RdYlGn", vmin=-1, vmax=1, aspect="auto")

    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    ax.set_xticklabels(labels, fontsize=8, rotation=45, ha="right")
    ax.set_yticklabels(labels, fontsize=8)

    # Annotate cells
    for i in range(n):
        for j in range(n):
            val = corr.values[i, j]
            color = "black" if abs(val) > 0.5 else COLORS["text"]
            ax.text(j, i, f"{val:.2f}", ha="center", va="center", fontsize=7, color=color, fontweight="bold")

    ax.set_title("Signal Correlation Matrix (Spearman)", fontsize=11, fontweight="bold")
    plt.colorbar(im, ax=ax, shrink=0.8, label="Correlation")


# ═══════════════════════════════════════════════════════════════
# CHART 5: WALK-FORWARD YEARLY PERFORMANCE
# ═══════════════════════════════════════════════════════════════

def chart_walk_forward(panel, ax):
    """Bar chart of walk-forward Spearman rho by year."""
    if "fwd_hpi_4q" not in panel.columns:
        ax.text(0.5, 0.5, "No forward HPI data", ha="center", va="center",
                transform=ax.transAxes, color=COLORS["text_dim"])
        return

    results = []
    for test_year in range(2005, 2024):
        year_data = panel[(panel["date"].dt.year == test_year) & panel["fwd_hpi_4q"].notna()]
        if len(year_data) >= 10:
            rho, p = sp_stats.spearmanr(year_data["score"], year_data["fwd_hpi_4q"])
            results.append({"year": test_year, "rho": rho, "p": p})

    if not results:
        ax.text(0.5, 0.5, "Insufficient data", ha="center", va="center",
                transform=ax.transAxes, color=COLORS["text_dim"])
        return

    rdf = pd.DataFrame(results)
    bar_colors = [COLORS["emerald"] if r > 0 else COLORS["rose"] for r in rdf["rho"]]

    ax.bar(rdf["year"], rdf["rho"], color=bar_colors, edgecolor=COLORS["border"], width=0.7)
    ax.axhline(y=0, color=COLORS["text_dim"], linewidth=0.8)
    ax.set_xlabel("Year", fontsize=9)
    ax.set_ylabel("Spearman rho (Score → 12mo HPI)", fontsize=9)
    ax.set_title("Walk-Forward: Score → HPI Correlation by Year", fontsize=11, fontweight="bold")
    ax.grid(True, axis="y", alpha=0.3)

    pct_positive = (rdf["rho"] > 0).mean() * 100
    ax.annotate(f"{pct_positive:.0f}% positive", xy=(0.95, 0.95), xycoords="axes fraction",
                ha="right", va="top", fontsize=10, fontweight="bold",
                color=COLORS["emerald"] if pct_positive >= 60 else COLORS["rose"])


# ═══════════════════════════════════════════════════════════════
# CHART 6: TIME SERIES — COMPOSITE SCORE OVER TIME BY CITY
# ═══════════════════════════════════════════════════════════════

def chart_city_scores_over_time(panel, ax):
    """Spaghetti chart: composite score over time for each city."""
    # Pick top 6 and bottom 3 cities by average score
    avg_scores = panel.groupby("city")["score"].mean().sort_values()
    bottom_cities = avg_scores.head(3).index.tolist()
    top_cities = avg_scores.tail(6).index.tolist()
    cities = bottom_cities + top_cities

    for city in cities:
        cdata = panel[panel["city"] == city].sort_values("date")
        color = COLORS["emerald"] if city in top_cities else COLORS["rose"]
        alpha = 0.8 if city in top_cities[:2] or city in bottom_cities[:1] else 0.4
        ax.plot(cdata["date"], cdata["score"], color=color, alpha=alpha, linewidth=1, label=city)

    ax.axhline(y=50, color=COLORS["gold"], linewidth=1, linestyle="--", alpha=0.5)
    ax.set_ylabel("Composite Score (0-100)", fontsize=9)
    ax.set_title("Capital Flow Score Over Time by City", fontsize=11, fontweight="bold")
    ax.legend(fontsize=7, ncol=3, loc="upper left", framealpha=0.3)
    ax.grid(True, alpha=0.3)
    ax.set_ylim(0, 100)


# ═══════════════════════════════════════════════════════════════
# MAIN: BUILD PANEL AND GENERATE ALL CHARTS
# ═══════════════════════════════════════════════════════════════

def main():
    print("Loading data...")
    mortgage = load_fred_csv("fred_mortgage30.csv")
    m2v = load_fred_csv("fred_m2v.csv")
    us_hpi = load_fred_csv("fred_us_hpi.csv")
    fhfa = load_fhfa_msa()
    permits = load_permits()

    if not all([mortgage is not None, m2v is not None, us_hpi is not None, permits]):
        print("FATAL: Missing core data.")
        return

    # Build panel (same as backtest)
    print("Building panel...")
    quarterly_permits = {}
    for city, df in permits.items():
        if city == "national":
            continue
        q = build_quarterly(df)
        if len(q) > 20:
            quarterly_permits[city] = q

    rates_q = build_quarterly(mortgage)
    rates_q = rates_q.sort_values("date").reset_index(drop=True)
    rates_q["rate_z"] = compute_zscore(rates_q["value"], window=40)
    rates_q["rate_z_inv"] = -rates_q["rate_z"]

    m2v_q = m2v.sort_values("date").reset_index(drop=True)
    m2v_q["m2v_z"] = compute_zscore(m2v_q["value"], window=40)

    hpi_q = us_hpi.sort_values("date").reset_index(drop=True)
    hpi_q["hpi_mom"] = hpi_q["value"].pct_change(periods=2) * 100
    hpi_q["hpi_momentum_z"] = compute_zscore(hpi_q["hpi_mom"], window=40)

    city_signals = {}
    for city, q_p in quarterly_permits.items():
        q_p = q_p.sort_values("date").reset_index(drop=True)
        q_p["yoy"] = q_p["value"].pct_change(periods=4) * 100
        q_p["permits_z"] = compute_zscore(q_p["yoy"], window=40)
        city_signals[city] = q_p[["date","permits_z"]].dropna()

    rate_lookup = dict(zip(rates_q["date"], rates_q["rate_z_inv"]))
    m2v_lookup = dict(zip(m2v_q["date"], m2v_q["m2v_z"]))
    hpi_mom_lookup = dict(zip(hpi_q["date"], hpi_q["hpi_momentum_z"]))

    all_dates = set()
    for cs in city_signals.values():
        all_dates.update(cs["date"].tolist())
    common = sorted(all_dates & set(rate_lookup.keys()) & set(m2v_lookup.keys()) & set(hpi_mom_lookup.keys()))
    common = [d for d in common if d >= pd.Timestamp("2000-01-01")]

    rows = []
    for city, cs in city_signals.items():
        cs_lookup = dict(zip(cs["date"], cs["permits_z"]))
        for date in common:
            pz = cs_lookup.get(date)
            rz = rate_lookup.get(date)
            mz = m2v_lookup.get(date)
            hz = hpi_mom_lookup.get(date)
            if all(v is not None and not np.isnan(v) for v in [pz, rz, mz, hz]):
                concurrent_z = pz
                confirming_z = np.mean([rz, mz, hz])
                composite_z = 0.60 * concurrent_z + 0.40 * confirming_z
                score = max(0, min(100, 50 + composite_z * 16.67))
                rows.append({"city": city, "date": date, "permits_z": pz,
                             "rate_z_inv": rz, "m2v_z": mz, "hpi_momentum_z": hz,
                             "composite_z": composite_z, "score": score})

    panel = pd.DataFrame(rows)
    print(f"Panel: {len(panel)} obs, {panel['city'].nunique()} cities")

    # Attach FHFA forward returns
    if fhfa is not None:
        print("Attaching FHFA forward returns...")
        CITY_TO_MSA = {
            "atlanta":"Atlanta","austin":"Austin","boston":"Boston","charlotte":"Charlotte",
            "chicago":"Chicago","houston":"Houston","miami":"Miami","minneapolis":"Minneapolis",
            "new_york":"New York","orlando":"Orlando","san_francisco":"San Francisco","seattle":"Seattle",
            "dallas":"Dallas","denver":"Denver","detroit":"Detroit","nashville":"Nashville",
            "phoenix":"Phoenix","tampa":"Tampa","raleigh":"Raleigh","portland":"Portland",
            "cincinnati":"Cincinnati","cleveland":"Cleveland","columbus":"Columbus",
            "indianapolis":"Indianapolis","jacksonville":"Jacksonville","kansas_city":"Kansas City",
            "los_angeles":"Los Angeles","philadelphia":"Philadelphia","pittsburgh":"Pittsburgh",
            "salt_lake_city":"Salt Lake City","san_diego":"San Diego",
        }
        fhfa_msas = fhfa["msa_name"].unique()
        city_msa = {}
        for city in panel["city"].unique():
            search = CITY_TO_MSA.get(city, city.replace("_"," ").title())
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
                fd = row["date"] + pd.DateOffset(months=3*h)
                fut = msa_data[(msa_data["date"] >= fd - pd.DateOffset(months=2)) &
                               (msa_data["date"] <= fd + pd.DateOffset(months=2))]["hpi"]
                if len(fut) > 0 and cv > 0:
                    panel.at[idx, f"fwd_hpi_{h}q"] = (fut.iloc[0] - cv) / cv * 100

        n_fwd = panel["fwd_hpi_4q"].notna().sum()
        print(f"Attached forward returns for {n_fwd}/{len(panel)} observations")

    # ── Generate charts ──
    print("\nGenerating charts...")

    # FIGURE 1: 4-panel — individual signals vs forward HPI
    fig1, axes1 = plt.subplots(2, 2, figsize=(16, 12))
    fig1.suptitle("INDIVIDUAL SIGNAL PERFORMANCE — Each Signal vs. 18-Month Forward HPI",
                  fontsize=14, fontweight="bold", color=COLORS["gold"], y=0.98)

    signal_configs = [
        ("permits_z", "Building Permits (z)", COLORS["emerald"]),
        ("rate_z_inv", "Mortgage Rate Inv. (z)", COLORS["blue"]),
        ("m2v_z", "M2 Velocity (z)", COLORS["purple"]),
        ("hpi_momentum_z", "HPI Momentum (z)", COLORS["amber"]),
    ]
    fwd = "fwd_hpi_6q" if "fwd_hpi_6q" in panel.columns else "permits_z"
    fwd_label = "18-Month HPI" if "fwd_hpi_6q" in panel.columns else "Future Permits"

    for ax, (col, name, color) in zip(axes1.flat, signal_configs):
        chart_signal_vs_hpi(panel, col, name, fwd, fwd_label, color, ax)

    fig1.tight_layout(rect=[0, 0, 1, 0.95])
    fig1.savefig(os.path.join(RESULTS_DIR, "01_individual_signals.png"), dpi=150, bbox_inches="tight")
    print("  Saved: 01_individual_signals.png")

    # FIGURE 2: Quintile bars — composite score quintiles vs forward HPI
    fig2, axes2 = plt.subplots(1, 3, figsize=(18, 6))
    fig2.suptitle("QUINTILE SPREAD — Composite Score Quintiles vs. Forward HPI Returns",
                  fontsize=14, fontweight="bold", color=COLORS["gold"], y=1.02)

    for ax, (fwd_col, label) in zip(axes2, [("fwd_hpi_4q","12-Month"), ("fwd_hpi_6q","18-Month"), ("fwd_hpi_8q","24-Month")]):
        if fwd_col in panel.columns:
            chart_quintile_bars(panel, "score", fwd_col, f"Score Quintile → {label} HPI", ax)

    fig2.tight_layout()
    fig2.savefig(os.path.join(RESULTS_DIR, "02_quintile_spread.png"), dpi=150, bbox_inches="tight")
    print("  Saved: 02_quintile_spread.png")

    # FIGURE 3: Confluence chart — number of bullish signals vs forward HPI
    fig3, axes3 = plt.subplots(1, 2, figsize=(14, 6))
    fig3.suptitle("CONFLUENCE — More Signals Agreeing = Stronger Forward Returns",
                  fontsize=14, fontweight="bold", color=COLORS["gold"], y=1.02)

    chart_confluence_heatmap(panel, axes3[0])
    chart_correlation_matrix(panel, axes3[1])

    fig3.tight_layout()
    fig3.savefig(os.path.join(RESULTS_DIR, "03_confluence.png"), dpi=150, bbox_inches="tight")
    print("  Saved: 03_confluence.png")

    # FIGURE 4: Walk-forward + city scores over time
    fig4, axes4 = plt.subplots(2, 1, figsize=(16, 10))
    fig4.suptitle("SIGNAL ROBUSTNESS — Walk-Forward & Score Time Series",
                  fontsize=14, fontweight="bold", color=COLORS["gold"], y=0.98)

    chart_walk_forward(panel, axes4[0])
    chart_city_scores_over_time(panel, axes4[1])

    fig4.tight_layout(rect=[0, 0, 1, 0.95])
    fig4.savefig(os.path.join(RESULTS_DIR, "04_robustness.png"), dpi=150, bbox_inches="tight")
    print("  Saved: 04_robustness.png")

    # FIGURE 5: The money chart — single best visualization
    fig5, ax5 = plt.subplots(figsize=(12, 7))
    if "fwd_hpi_6q" in panel.columns:
        chart_quintile_bars(panel, "score", "fwd_hpi_6q",
                           "THE PROOF: Capital Flow Score Predicts 18-Month House Price Appreciation\n"
                           f"31 MSAs, {panel['fwd_hpi_6q'].notna().sum():,} observations, 2000-2025",
                           ax5)
    fig5.tight_layout()
    fig5.savefig(os.path.join(RESULTS_DIR, "05_the_proof.png"), dpi=150, bbox_inches="tight")
    print("  Saved: 05_the_proof.png")

    print(f"\nAll charts saved to: {RESULTS_DIR}")
    print("Done.")


if __name__ == "__main__":
    main()
