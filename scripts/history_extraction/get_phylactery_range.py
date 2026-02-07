import json
from datetime import datetime

file_path = "/home/mega/OmegA-SI/PHYLACTERY_MASTER_TIMELINE.json"

try:
    with open(file_path, 'r') as f:
        data = json.load(f)

    timestamps = []
    for entry in data:
        ts_str = entry.get('timestamp')
        if ts_str and not ts_str.startswith('0001'):
            try:
                # Normalize to naive UTC for comparison
                if ' ' in ts_str:
                    dt = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S')
                else:
                    dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                    dt = dt.replace(tzinfo=None)
                timestamps.append(dt)
            except ValueError:
                continue

    if timestamps:
        timestamps.sort()
        print(f"START_DATE: {timestamps[0].isoformat()}")
        print(f"END_DATE: {timestamps[-1].isoformat()}")
        print(f"TOTAL_VALID_TIMESTAMPS: {len(timestamps)}")
    else:
        print("NO_VALID_TIMESTAMPS")

except Exception as e:
    print(f"ERROR: {e}")
