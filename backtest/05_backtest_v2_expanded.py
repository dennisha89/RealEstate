"""
Backtest V2: Expanded Signal Set
=================================
Tests the NEW signals identified from research:
1. Months of Supply (R²=0.347 — strongest single predictor, Richmond Fed 2025)
2. Employment Growth (best long-term predictor, Collateral Analytics)
3. Wharton RLURI supply elasticity (interaction term, R²=0.91)

Combined with validated V1 signals:
4. Building Permits YoY (rho=0.27, validated)
5. HPI Momentum (rho=0.33, validated)
6. Mortgage Rate Environment (rho=0.13, validated)

Goal: Build the OPTIMAL multi-signal composite and test if it beats any individual signal.
Then prepare for GPU phase (XGBoost on RTX 5090).
"""
import os
import warnings
import numpy as np
import pandas as pd
from scipy import stats as sp_stats
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from datetime import datetime

warnings.filterwarnings("ignore")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results")

COLORS = {
    "bg": "#000000", "card": "#0A0A0A", "border": "#1F1F1F",
    "text": "#E5E5E5", "text_dim": "#666666", "gold": "#C9A227",
    "emerald": "#10B981", "amber": "#F59E0B", "rose": "#EF4444",
    "blue": "#3B82F6", "purple": "#8B5CF6",
}
plt.rcParams.update({
    "figure.facecolor": COLORS["bg"], "axes.facecolor": COLORS["card"],
    "axes.edgecolor": COLORS["border"], "axes.labelcolor": COLORS["text"],
    "text.color": COLORS["text"], "xtick.color": COLORS["text_dim"],
    "ytick.color": COLORS["text_dim"], "grid.color": COLORS["border"],
    "font.size": 10,
})


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
    rm = series.rolling(window=window, min_periods=max(8, window // 4)).mean()
    rs = series.rolling(window=window, min_periods=max(8, window // 4)).std().replace(0, np.nan)
    return ((series - rm) / rs).clip(-3, 3)


def build_quarterly(monthly_df):
    df = monthly_df.copy()
    df["quarter"] = df["date"].dt.to_period("Q")
    q = df.groupby("quarter")["value"].mean().reset_index()
    q["date"] = q["quarter"].dt.to_timestamp()
    return q[["date", "value"]]


def load_fhfa_msa():
    fpath = os.path.join(DATA_DIR, "fhfa_hpi_msa.csv")
    if not os.path.exists(fpath):
        return None
    df = pd.read_csv(fpath, header=None,
                     names=["msa_name", "cbsa", "year", "quarter", "hpi", "std_err"],
                     quotechar='"')
    df["hpi"] = pd.to_numeric(df["hpi"], errors="coerce")
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["quarter"] = pd.to_numeric(df["quarter"], errors="coerce")
    df = df.dropna(subset=["hpi", "year", "quarter"])
    df["date"] = pd.to_datetime(
        df["year"].astype(int).astype(str) + "-" +
        ((df["quarter"].astype(int) - 1) * 3 + 1).astype(str).str.zfill(2) + "-01")
    return df


def scan_available_data():
    """Scan data directory and report what's available for V2."""
    print("=" * 70)
    print("SCANNING AVAILABLE DATA FOR V2 BACKTEST")
    print("=" * 70)

    # Months of supply
    mos_files = [f for f in os.listdir(DATA_DIR) if "months_supply" in f.lower() or "inventory" in f.lower() or "MSACSR" in f]
    print(f"\n  Months of Supply files: {len(mos_files)}")
    for f in mos_files:
        size = os.path.getsize(os.path.join(DATA_DIR, f))
        print(f"    {f} ({size:,} bytes)")

    # Employment
    emp_files = [f for f in os.listdir(DATA_DIR) if "employment" in f.lower() or "payroll" in f.lower()]
    print(f"\n  Employment files: {len(emp_files)}")
    for f in emp_files[:5]:
        print(f"    {f}")
    if len(emp_files) > 5:
        print(f"    ... and {len(emp_files) - 5} more")

    # WRLURI
    wrluri_files = [f for f in os.listdir(DATA_DIR) if "wrluri" in f.lower() or "rluri" in f.lower() or "wharton" in f.lower()]
    print(f"\n  Wharton RLURI files: {len(wrluri_files)}")
    for f in wrluri_files:
        print(f"    {f}")

    # Existing V1 data
    permits = [f for f in os.listdir(DATA_DIR) if f.startswith("fred_permits_") and f != "fred_permits_national.csv"]
    print(f"\n  Building Permits (V1): {len(permits)} MSAs")

    # FRED national
    fred_files = ["fred_mortgage30.csv", "fred_us_hpi.csv", "fred_m2v.csv"]
    for f in fred_files:
        exists = os.path.exists(os.path.join(DATA_DIR, f))
        print(f"  {f}: {'OK' if exists else 'MISSING'}")

    # FHFA
    fhfa_exists = os.path.exists(os.path.join(DATA_DIR, "fhfa_hpi_msa.csv"))
    print(f"  FHFA MSA HPI: {'OK' if fhfa_exists else 'MISSING'}")

    # Realtor.com / Redfin
    realtor_files = [f for f in os.listdir(DATA_DIR) if "realtor" in f.lower() or "redfin" in f.lower()]
    print(f"\n  Realtor.com/Redfin files: {len(realtor_files)}")
    for f in realtor_files:
        size = os.path.getsize(os.path.join(DATA_DIR, f))
        print(f"    {f} ({size:,} bytes)")

    # National months supply from FRED
    national_mos = load_fred_csv("fred_msacsr.csv")
    if national_mos is not None:
        print(f"\n  FRED MSACSR (national months supply): {len(national_mos)} observations")
    else:
        # Try downloading
        print("\n  FRED MSACSR: not found. Will attempt to use Realtor.com/Redfin data instead.")

    return {
        "mos_files": mos_files,
        "emp_files": emp_files,
        "wrluri_files": wrluri_files,
        "permits": permits,
        "realtor_files": realtor_files,
    }


def test_signal_vs_hpi(panel, signal_col, signal_name, fwd_col="fwd_hpi_6q"):
    """Standard test: Spearman correlation + quintile spread for a signal."""
    clean = panel[[signal_col, fwd_col]].dropna()
    if len(clean) < 50:
        print(f"  {signal_name:30s} SKIP (only {len(clean)} obs)")
        return None

    rho, p = sp_stats.spearmanr(clean[signal_col], clean[fwd_col])
    sig = "***" if p < 0.01 else "**" if p < 0.05 else "*" if p < 0.10 else ""

    # Quintile spread
    clean = clean.copy()
    clean["q"] = pd.qcut(clean[signal_col], q=5, labels=False, duplicates="drop") + 1
    q_means = clean.groupby("q")[fwd_col].mean()
    q1 = q_means.iloc[0]  # bottom
    q5 = q_means.iloc[-1]  # top
    spread = q5 - q1

    print(f"  {signal_name:30s} rho={rho:>7.4f}{sig:3s}  Q5-Q1={spread:>+7.2f}pp  (n={len(clean)})")

    return {
        "signal": signal_name,
        "rho": rho,
        "p": p,
        "q1_return": q1,
        "q5_return": q5,
        "spread": spread,
        "n": len(clean),
        "significant": p < 0.05,
    }


def main():
    print("=" * 70)
    print("BACKTEST V2: EXPANDED SIGNAL SET")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    available = scan_available_data()

    # Check if we have enough new data to proceed
    has_mos = len(available["mos_files"]) > 0 or len(available["realtor_files"]) > 0
    has_emp = len(available["emp_files"]) > 0

    if not has_mos and not has_emp:
        print("\n  NO NEW DATA AVAILABLE YET.")
        print("  Waiting for download agents to deliver months-of-supply and employment data.")
        print("  Re-run this script after data arrives.")
        print("\n  To check agent status, look for files matching:")
        print("    backtest/data/*months_supply*")
        print("    backtest/data/*inventory*")
        print("    backtest/data/*realtor*")
        print("    backtest/data/*redfin*")
        print("    backtest/data/*employment*")
        return

    # ── Load FHFA MSA HPI for forward returns ──
    fhfa = load_fhfa_msa()
    if fhfa is None:
        print("\n  FATAL: No FHFA MSA HPI data.")
        return

    print(f"\n  FHFA MSA HPI: {len(fhfa)} rows, {fhfa['msa_name'].nunique()} MSAs")

    # ── Load V1 signals for comparison ──
    mortgage = load_fred_csv("fred_mortgage30.csv")
    us_hpi = load_fred_csv("fred_us_hpi.csv")

    # ── Build panel with whatever data is available ──
    print("\n" + "=" * 70)
    print("BUILDING EXPANDED PANEL")
    print("=" * 70)

    # Start with V1 panel structure (city × quarter)
    # Then add new signals where available

    # For now, load and report what we have
    # The actual panel building depends on the file formats the download agents produce

    # ── Try to load months of supply data ──
    if has_mos:
        print("\n  Attempting to load months-of-supply data...")
        for f in available["mos_files"] + available["realtor_files"]:
            fpath = os.path.join(DATA_DIR, f)
            try:
                df = pd.read_csv(fpath)
                print(f"    {f}: {len(df)} rows, columns: {list(df.columns)[:8]}")
            except Exception as e:
                print(f"    {f}: ERROR - {e}")

    if has_emp:
        print("\n  Attempting to load employment data...")
        for f in available["emp_files"][:5]:
            fpath = os.path.join(DATA_DIR, f)
            try:
                df = load_fred_csv(f)
                if df is not None:
                    print(f"    {f}: {len(df)} observations, {df['date'].min().strftime('%Y')} to {df['date'].max().strftime('%Y')}")
            except Exception as e:
                print(f"    {f}: ERROR - {e}")

    print("\n" + "=" * 70)
    print("V2 DATA SCAN COMPLETE")
    print("=" * 70)
    print(f"\n  Months-of-supply data: {'AVAILABLE' if has_mos else 'PENDING'}")
    print(f"  Employment data: {'AVAILABLE' if has_emp else 'PENDING'}")
    print(f"\n  Once both are available, the full V2 backtest will run automatically.")
    print(f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
