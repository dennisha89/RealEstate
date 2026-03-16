"""
Step 1: Download all historical datasets for capital flow backtest.
Sources: FHFA HPI (MSA quarterly), FRED (rates, permits, M2V), IRS SOI (migration)
"""
import os
import requests
import time

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

FRED_API_KEY = os.environ.get("FRED_API_KEY", "")

def download_file(url: str, filename: str, description: str) -> bool:
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath) and os.path.getsize(filepath) > 100:
        print(f"  [CACHED] {description} -> {filename} ({os.path.getsize(filepath):,} bytes)")
        return True
    print(f"  [DOWNLOADING] {description}...")
    try:
        resp = requests.get(url, timeout=120, stream=True)
        resp.raise_for_status()
        with open(filepath, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"  [OK] {filename} ({os.path.getsize(filepath):,} bytes)")
        return True
    except Exception as e:
        print(f"  [FAIL] {description}: {e}")
        return False


def download_fred_series(series_id: str, filename: str, description: str) -> bool:
    """Download a FRED series as CSV. Works without API key using the CSV endpoint."""
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath) and os.path.getsize(filepath) > 100:
        print(f"  [CACHED] {description} -> {filename}")
        return True
    # FRED public CSV download (no API key needed)
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd=1970-01-01&coed=2025-12-31"
    return download_file(url, filename, description)


def main():
    print("=" * 70)
    print("STEP 1: DOWNLOAD HISTORICAL DATA FOR BACKTEST")
    print("=" * 70)
    results = {}

    # ─── 1. FHFA House Price Index (MSA-level, quarterly) ───
    print("\n[1/6] FHFA House Price Index — All-Transactions, MSA level")
    # This is the main quarterly HPI file with all MSAs
    results["fhfa_msa"] = download_file(
        "https://www.fhfa.gov/hpi/download/monthly/hpi_at_metro.csv",
        "fhfa_hpi_msa.csv",
        "FHFA HPI All-Transactions MSA (quarterly)"
    )

    # Also get state-level
    print("\n[2/6] FHFA House Price Index — State level")
    results["fhfa_state"] = download_file(
        "https://www.fhfa.gov/hpi/download/monthly/hpi_at_state.csv",
        "fhfa_hpi_state.csv",
        "FHFA HPI All-Transactions State"
    )

    # ─── 2. FRED Series ───
    print("\n[3/6] FRED — Mortgage Rates, M2 Velocity, National Building Permits")

    fred_series = [
        ("MORTGAGE30US", "fred_mortgage30.csv", "30-Year Fixed Mortgage Rate"),
        ("M2V", "fred_m2v.csv", "M2 Money Velocity"),
        ("PERMIT", "fred_permits_national.csv", "National Building Permits"),
        ("USSTHPI", "fred_us_hpi.csv", "US National HPI (FHFA via FRED)"),
    ]
    for series_id, fname, desc in fred_series:
        results[f"fred_{series_id}"] = download_fred_series(series_id, fname, desc)

    # ─── 3. FRED Building Permits by MSA (top 30 metros) ───
    print("\n[4/6] FRED — Building Permits for Top 30 MSAs")

    # Series IDs for major MSAs (not seasonally adjusted total units)
    msa_permits = {
        "ATLA013BPPRIV": "Atlanta",
        "AUST448BPPRIV": "Austin",
        "BOST625BPPRIV": "Boston",
        "CHAR737BPPRIV": "Charlotte",
        "CHIC917BPPRIV": "Chicago",
        "CINC739BPPRIV": "Cincinnati",
        "CLEV839BPPRIV": "Cleveland",
        "COLU839BPPRIV": "Columbus",
        "DALL112BPPRIV": "Dallas",
        "DENV108BPPRIV": "Denver",
        "DETR426BPPRIV": "Detroit",
        "HOUS448BPPRIV": "Houston",
        "INDI118BPPRIV": "Indianapolis",
        "JACK712BPPRIV": "Jacksonville",
        "KANS429BPPRIV": "Kansas City",
        "LOSA706BPPRIV": "Los Angeles",
        "MIAM112BPPRIV": "Miami",
        "MINN427BPPRIV": "Minneapolis",
        "NASH447BPPRIV": "Nashville",
        "NEWY636BPPRIV": "New York",
        "ORLA712BPPRIV": "Orlando",
        "PHIL242BPPRIV": "Philadelphia",
        "PHOE404BPPRIV": "Phoenix",
        "PITT242BPPRIV": "Pittsburgh",
        "PORT441BPPRIV": "Portland",
        "RALE237BPPRIV": "Raleigh",
        "SALT449BPPRIV": "Salt Lake City",
        "SAND606BPPRIV": "San Diego",
        "SANF806BPPRIV": "San Francisco",
        "SEAT653BPPRIV": "Seattle",
        "TAMP112BPPRIV": "Tampa",
    }

    permits_downloaded = 0
    for series_id, metro_name in msa_permits.items():
        ok = download_fred_series(series_id, f"fred_permits_{metro_name.lower().replace(' ', '_')}.csv", f"Permits: {metro_name}")
        if ok:
            permits_downloaded += 1
    results["fred_msa_permits"] = permits_downloaded > 0
    print(f"  Downloaded permits for {permits_downloaded}/{len(msa_permits)} MSAs")

    # ─── 4. IRS SOI Migration Data ───
    print("\n[5/6] IRS SOI — State-level Migration (AGI flows)")
    # State-level inflow/outflow with AGI — available as yearly CSV downloads
    # We'll get the aggregated state-level data (smaller, faster)
    irs_years = range(2011, 2023)  # 2011-2022 available
    irs_downloaded = 0
    for year in irs_years:
        year2 = year + 1
        # State-level inflow files
        url_in = f"https://www.irs.gov/pub/irs-soi/{str(year2)[2:]}cy{str(year)[2:]}si.csv"
        url_out = f"https://www.irs.gov/pub/irs-soi/{str(year2)[2:]}cy{str(year)[2:]}so.csv"
        ok_in = download_file(url_in, f"irs_state_inflow_{year}_{year2}.csv", f"IRS State Inflow {year}-{year2}")
        ok_out = download_file(url_out, f"irs_state_outflow_{year}_{year2}.csv", f"IRS State Outflow {year}-{year2}")
        if ok_in or ok_out:
            irs_downloaded += 1
        time.sleep(0.5)  # be polite to IRS servers
    results["irs_migration"] = irs_downloaded > 0
    print(f"  Downloaded IRS migration for {irs_downloaded}/{len(list(irs_years))} years")

    # ─── 5. HMDA Summary Data ───
    print("\n[6/6] HMDA — We'll use the CFPB API in the signal building step")
    print("  HMDA loan-level data is too large for bulk download (100GB+).")
    print("  Will query CFPB Data Browser API for MSA-level aggregates in step 02.")
    results["hmda"] = True  # deferred to API queries

    # ─── Summary ───
    print("\n" + "=" * 70)
    print("DOWNLOAD SUMMARY")
    print("=" * 70)
    for key, ok in results.items():
        status = "OK" if ok else "FAILED"
        print(f"  [{status}] {key}")

    failed = [k for k, v in results.items() if not v]
    if failed:
        print(f"\n  WARNING: {len(failed)} source(s) failed. Backtest may be limited.")
    else:
        print(f"\n  All sources downloaded successfully.")

    # List data directory contents
    print(f"\n  Data directory: {DATA_DIR}")
    total_size = 0
    for f in sorted(os.listdir(DATA_DIR)):
        fpath = os.path.join(DATA_DIR, f)
        size = os.path.getsize(fpath)
        total_size += size
        print(f"    {f:50s} {size:>12,} bytes")
    print(f"    {'TOTAL':50s} {total_size:>12,} bytes")


if __name__ == "__main__":
    main()
