#!/usr/bin/env python3
"""
Extract hospital data from OpenStreetMap via Overpass API.
Run: python scripts/extract_hospitals.py

Output: public/data/hospitals_*.geojson
Requires: pip install requests
"""
import json
import requests
from pathlib import Path

COUNTRIES = {
    "togo": {"area": "area[name='Togo']", "output": "hospitals_togo.geojson"},
    "nigeria": {"area": "area[name='Nigeria']", "output": "hospitals_nigeria.geojson"},
    "ghana": {"area": "area[name='Ghana']", "output": "hospitals_ghana.geojson"},
    "benin": {"area": "area[name='Bénin']", "output": "hospitals_benin.geojson"},
    "cote_divoire": {
        "area": 'area[name="Côte d\'Ivoire"]',
        "output": "hospitals_cote_divoire.geojson",
    },
}

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "data"


def extract_services(tags: dict) -> list:
    services = []
    if tags.get("emergency") == "yes":
        services.append("urgences")
    if tags.get("healthcare:speciality"):
        services.extend(tags["healthcare:speciality"].split(";"))
    return services or ["general"]


def extract_hospitals(country_name: str, area_query: str) -> dict:
    query = f"""
    [out:json][timeout:120];
    {area_query}->.searchArea;
    (
      node["amenity"="hospital"](area.searchArea);
      way["amenity"="hospital"](area.searchArea);
      node["amenity"="clinic"](area.searchArea);
    );
    out center tags;
    """
    print(f"Fetching {country_name}...")
    response = requests.post(OVERPASS_URL, data={"data": query}, timeout=180)
    response.raise_for_status()
    data = response.json()

    features = []
    for element in data.get("elements", []):
        lat = element.get("lat") or element.get("center", {}).get("lat")
        lon = element.get("lon") or element.get("center", {}).get("lon")
        if not lat or not lon:
            continue

        tags = element.get("tags", {})
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id": f"{country_name}_{element['id']}",
                "name": tags.get("name") or tags.get("name:fr") or "Unknown Hospital",
                "city": tags.get("addr:city", ""),
                "country": country_name.replace("_", " ").title(),
                "type": "public" if tags.get("operator:type") == "public" else "private",
                "phone": tags.get("phone") or tags.get("contact:phone", ""),
                "services": extract_services(tags),
                "opening_hours": tags.get("opening_hours", ""),
                "emergency": tags.get("emergency") == "yes",
                "osm_id": element["id"],
            },
        })

    return {"type": "FeatureCollection", "country": country_name, "features": features}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for country, cfg in COUNTRIES.items():
        try:
            geojson = extract_hospitals(country, cfg["area"])
            out_path = OUTPUT_DIR / cfg["output"]
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(geojson, f, ensure_ascii=False, indent=2)
            print(f"✓ {cfg['output']}: {len(geojson['features'])} hospitals")
        except Exception as e:
            print(f"✗ {country}: {e}")


if __name__ == "__main__":
    main()
