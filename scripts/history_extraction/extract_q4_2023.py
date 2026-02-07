import json
from datetime import datetime

file_path = "/home/mega/OmegA-SI/PHYLACTERY_MASTER_TIMELINE.json"
output_file = "/home/mega/.gemini/tmp/omega_chronicles_q4_2023.txt"

start_date = datetime(2023, 10, 1)
end_date = datetime(2023, 12, 31, 23, 59, 59)

print(f"Extracting Q4 2023 from {file_path}...")

try:
    with open(file_path, 'r') as f:
        data = json.load(f)

    matches = []
    for entry in data:
        ts_str = entry.get('timestamp')
        if ts_str and not ts_str.startswith('0001'):
            try:
                if ' ' in ts_str:
                    dt = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S')
                else:
                    dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                    dt = dt.replace(tzinfo=None)
                
                if start_date <= dt <= end_date:
                    matches.append(entry)
            except ValueError:
                continue

    # Sort by timestamp
    matches.sort(key=lambda x: x['timestamp'])

    with open(output_file, "w") as out:
        for m in matches:
            out.write(f"[{m.get('timestamp')}] {m.get('source')} {m.get('role').upper()}: {m.get('content')}\n\n")

    print(f"Extracted {len(matches)} messages to {output_file}")

except Exception as e:
    print(f"Error: {e}")
