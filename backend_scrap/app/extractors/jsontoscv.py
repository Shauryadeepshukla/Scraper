import json
import csv
from pathlib import Path

# File paths
input_file = Path("google_maps_leads/compiled.json")
output_file = Path("data/data.csv")

# Read JSON
with open(input_file, "r", encoding="utf-8") as f:
    data = json.load(f)

# Make sure the output directory exists
output_file.parent.mkdir(parents=True, exist_ok=True)

# Write CSV
with open(output_file, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=["name", "location", "phone", "website"],
        extrasaction="ignore"
    )

    writer.writeheader()
    writer.writerows(data)

print(f"CSV created successfully: {output_file}")