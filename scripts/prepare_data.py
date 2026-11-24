"""
Prepare the Eurostat dataset isoc_eb_ai ("Artificial intelligence by size
class of enterprise") for the charts on the website.

Usage (from the repository root):

    python3 scripts/prepare_data.py            # uses data/raw/isoc_eb_ai.csv
    python3 scripts/prepare_data.py --download # downloads a fresh copy first

Only the Python standard library is used.

Output files in data/:
    ai_adoption.csv   - % of enterprises using at least one AI technology
                        (E_AI_TANY), per country, size class and year
    ai_intensity.csv  - EU27, latest year: enterprises split by how many
                        AI technologies they use (0, 1, 2, 3+), per size class
"""

import csv
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_FILE = os.path.join(ROOT, "data", "raw", "isoc_eb_ai.csv")
OUT_DIR = os.path.join(ROOT, "data")

URL = (
    "https://ec.europa.eu/eurostat/api/dissemination/sdmx/3.0/data/dataflow/"
    "ESTAT/isoc_eb_ai/1.0?format=csvdata&compress=false"
)

# EU member states (Eurostat codes) and the EU aggregate, with English names.
COUNTRIES = {
    "EU27_2020": "EU-27",
    "AT": "Austria", "BE": "Belgium", "BG": "Bulgaria", "CY": "Cyprus",
    "CZ": "Czechia", "DE": "Germany", "DK": "Denmark", "EE": "Estonia",
    "EL": "Greece", "ES": "Spain", "FI": "Finland", "FR": "France",
    "HR": "Croatia", "HU": "Hungary", "IE": "Ireland", "IT": "Italy",
    "LT": "Lithuania", "LU": "Luxembourg", "LV": "Latvia", "MT": "Malta",
    "NL": "Netherlands", "PL": "Poland", "PT": "Portugal", "RO": "Romania",
    "SE": "Sweden", "SI": "Slovenia", "SK": "Slovakia",
}

# Size classes (number of employees). Note: Eurostat uses hyphens here.
SIZES = {
    "10-49": "Small (10-49)",
    "50-249": "Medium (50-249)",
    "GE250": "Large (250+)",
    "GE10": "All (10+)",
}


def download():
    print("Downloading", URL)
    os.makedirs(os.path.dirname(RAW_FILE), exist_ok=True)
    urllib.request.urlretrieve(URL, RAW_FILE)


def load_rows():
    """Read the raw SDMX-CSV and keep only the rows we need."""
    with open(RAW_FILE, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if (
                row["unit"] == "PC_ENT"          # % of enterprises
                and row["geo"] in COUNTRIES
                and row["size_emp"] in SIZES
                and row["OBS_VALUE"] != ""
            ):
                yield row


def main():
    if "--download" in sys.argv or not os.path.exists(RAW_FILE):
        download()

    rows = list(load_rows())

    # --- 1) ai_adoption.csv: share of enterprises using any AI technology ---
    adoption = [
        {
            "geo": r["geo"],
            "country": COUNTRIES[r["geo"]],
            "size": r["size_emp"],
            "size_label": SIZES[r["size_emp"]],
            "year": r["TIME_PERIOD"],
            "value": float(r["OBS_VALUE"]),
            "flag": r["OBS_FLAG"],  # e.g. "b" = break in time series
        }
        for r in rows
        if r["indic_is"] == "E_AI_TANY"
    ]
    adoption.sort(key=lambda d: (d["geo"], d["size"], d["year"]))
    write_csv("ai_adoption.csv", adoption)

    # --- 2) ai_intensity.csv: EU27, latest year, number of AI technologies ---
    # Eurostat gives cumulative shares: "at least 1" (TANY), "at least 2"
    # (TGE2) and "at least 3" (TGE3). Subtracting them gives groups that do
    # not overlap and therefore add up to exactly 100 %.
    latest = max(r["TIME_PERIOD"] for r in rows if r["indic_is"] == "E_AI_TANY")
    lookup = {
        (r["size_emp"], r["indic_is"]): float(r["OBS_VALUE"])
        for r in rows
        if r["geo"] == "EU27_2020" and r["TIME_PERIOD"] == latest
    }
    intensity = []
    for size, label in SIZES.items():
        any_ai = lookup[(size, "E_AI_TANY")]
        ge2 = lookup[(size, "E_AI_TGE2")]
        ge3 = lookup[(size, "E_AI_TGE3")]
        parts = {
            "none": 100 - any_ai,
            "one": any_ai - ge2,
            "two": ge2 - ge3,
            "three_plus": ge3,
        }
        for category, value in parts.items():
            intensity.append({
                "size": size,
                "size_label": label,
                "year": latest,
                "category": category,
                "value": round(value, 2),
            })
    write_csv("ai_intensity.csv", intensity)


def write_csv(name, records):
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)
    print(f"Wrote {len(records)} rows to {os.path.relpath(path, ROOT)}")


if __name__ == "__main__":
    main()
