import json
from collections import Counter
from datetime import datetime

file_path = "/home/mega/OmegA-SI/PHYLACTERY_MASTER_TIMELINE.json"

print(f"Analyzing {file_path}...")

try:
    with open(file_path, 'r') as f:
        data = json.load(f)

    print(f"Total entries found: {len(data)}")

    sources = Counter(entry.get('source') for entry in data)
    print("\nEntries by source:")
    for source, count in sources.items():
        print(f"- {source}: {count}")

    roles = Counter(entry.get('role') for entry in data)
    print("\nEntries by role:")
    for role, count in roles.items():
        print(f"- {role}: {count}")

    timestamps = []
    for entry in data:
        ts_str = entry.get('timestamp')
        if ts_str and not ts_str.startswith('0001'):
            try:
                # Handle potential variations in timestamp format
                if ' ' in ts_str:
                    dt = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S')
                else:
                    dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                timestamps.append(dt)
            except ValueError:
                continue

    if timestamps:
        timestamps.sort()
        print(f"\nChronological span: {timestamps[0]} to {timestamps[-1]}")
    else:
        print("\nNo valid timestamps found (other than placeholders).")

except Exception as e:
    print(f"Error: {e}")
