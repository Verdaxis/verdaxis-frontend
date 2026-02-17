#!/usr/bin/env python3
"""
One-time batch geocoder for methanol project CSV data.

Reads /tmp/verdaxis_all_projects.csv, geocodes unique city+country pairs
via Nominatim, caches results, and outputs projects-geocoded.json.
"""

import csv
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
import urllib.error

CSV_PATH = "/tmp/verdaxis_all_projects.csv"
CACHE_PATH = "/tmp/geocode-cache.json"
OUTPUT_PATH = "/tmp/projects-geocoded.json"

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
REQUEST_DELAY = 1.1  # seconds between requests
USER_AGENT = "VerdaxisGeocoder/1.0 (verdaxis.exchange)"

# ---------- Status mapping ----------
STATUS_MAP = {
    "Operational": "Operational",
    "Under construction": "Under Construction",
    "Engineering": "Engineering",
    "Feasibility or pre-feasibility": "Pre-Feasibility",
}

# ---------- Product mapping ----------
PRODUCT_MAP = {
    "E-methanol": "E-Methanol",
    "Biomethanol": "Biomethanol",
    "Low-carbon methanol": "Low-Carbon Methanol",
}


def parse_cod_year(cod_estimated: str, cod_announced: str) -> int | None:
    """Parse 'Mon-YY' format into a 4-digit year. Prefer estimated, fall back to announced."""
    for raw in [cod_estimated, cod_announced]:
        raw = raw.strip()
        if not raw:
            continue
        m = re.match(r"[A-Za-z]+-(\d{2})$", raw)
        if m:
            yy = int(m.group(1))
            return 2000 + yy if yy < 80 else 1900 + yy
    return None


def load_cache() -> dict:
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, "r") as f:
            return json.load(f)
    return {}


def save_cache(cache: dict):
    with open(CACHE_PATH, "w") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)


def geocode(city: str, country: str) -> tuple[float, float] | None:
    """Query Nominatim for lat/lng of a city+country pair."""
    query = f"{city}, {country}"
    params = urllib.parse.urlencode({
        "q": query,
        "format": "json",
        "limit": 1,
    })
    url = f"{NOMINATIM_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except (urllib.error.URLError, json.JSONDecodeError, KeyError, IndexError) as e:
        print(f"  ERROR geocoding '{query}': {e}", file=sys.stderr)
    return None


def main():
    # Read CSV
    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Read {len(rows)} projects from CSV")

    # Extract unique city+country pairs
    pairs: dict[str, set] = {}  # key -> set of row indices
    for i, row in enumerate(rows):
        city = row.get("City", "").strip()
        country = row.get("Country", "").strip()
        if city and country:
            key = f"{city}|{country}"
            pairs.setdefault(key, set()).add(i)

    print(f"Found {len(pairs)} unique city+country pairs")

    # Load geocoding cache
    cache = load_cache()
    failed = []
    new_lookups = 0

    for key in sorted(pairs.keys()):
        if key in cache:
            continue
        city, country = key.split("|", 1)
        print(f"  Geocoding: {city}, {country} ...", end=" ", flush=True)
        time.sleep(REQUEST_DELAY)
        result = geocode(city, country)
        if result:
            cache[key] = {"lat": round(result[0], 4), "lng": round(result[1], 4)}
            print(f"-> ({cache[key]['lat']}, {cache[key]['lng']})")
        else:
            cache[key] = None
            failed.append(f"{city}, {country}")
            print("-> FAILED")
        new_lookups += 1
        # Save cache periodically
        if new_lookups % 10 == 0:
            save_cache(cache)

    save_cache(cache)
    print(f"\nGeocoded {new_lookups} new pairs, {len(failed)} failures")

    if failed:
        print("\nFailed lookups (need manual coordinates):")
        for loc in failed:
            print(f"  - {loc}")

    # Build output JSON
    projects = []
    for i, row in enumerate(rows):
        city = row.get("City", "").strip()
        country = row.get("Country", "").strip()
        key = f"{city}|{country}"

        coords = cache.get(key)
        lat = coords["lat"] if coords else 0
        lng = coords["lng"] if coords else 0

        # Parse capacity
        cap_raw = row.get("Capacity", "").strip()
        try:
            capacity = float(cap_raw)
        except (ValueError, TypeError):
            capacity = 0

        # Map product -> fuelType
        product = row.get("Product", "").strip()
        fuel_type = PRODUCT_MAP.get(product, product)

        # Map status
        status = row.get("Status", "").strip()
        mapped_status = STATUS_MAP.get(status, status)

        # Parse COD year
        cod_year = parse_cod_year(
            row.get("COD (Estimated)", ""),
            row.get("COD (Announced)", ""),
        )

        # Build project ID
        proj_id = f"proj-{i + 1:03d}"

        projects.append({
            "id": proj_id,
            "name": row.get("Name", "").strip(),
            "company": row.get("Company", "").strip(),
            "fuelType": fuel_type,
            "pathway": row.get("Feedstock", "").strip(),
            "status": mapped_status,
            "capacityKtpa": capacity,
            "codYear": cod_year,
            "lat": lat,
            "lng": lng,
            "country": country,
            "city": city,
        })

    with open(OUTPUT_PATH, "w") as f:
        json.dump(projects, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {len(projects)} projects to {OUTPUT_PATH}")

    # Summary stats
    no_coords = sum(1 for p in projects if p["lat"] == 0 and p["lng"] == 0)
    no_cod = sum(1 for p in projects if p["codYear"] is None)
    print(f"Projects without coordinates: {no_coords}")
    print(f"Projects without COD year: {no_cod}")


if __name__ == "__main__":
    main()
