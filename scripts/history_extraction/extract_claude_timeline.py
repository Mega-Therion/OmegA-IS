import json
import zipfile
import datetime
import os

zip_path = "/home/mega/MEGA downloads/Claude Data.zip"
json_filename = "conversations.json"
output_file = "OMEGA_CLAUDE_TIMELINE.txt"

print(f"Reading {json_filename} from {zip_path}...")

try:
    with zipfile.ZipFile(zip_path, 'r') as z:
        with z.open(json_filename) as f:
            data = json.load(f)

    print(f"Successfully loaded {len(data)} conversations.")

    timeline = []

    for conv in data:
        title = conv.get('name', 'No Title')
        create_time = conv.get('created_at')
        
        if create_time:
            # Claude timestamps are ISO strings
            dt_object = datetime.datetime.fromisoformat(create_time.replace('Z', '+00:00'))
            formatted_date = dt_object.strftime('%Y-%m-%d %H:%M:%S')
            timeline.append({
                'date': formatted_date,
                'timestamp': dt_object.timestamp(),
                'title': title,
                'id': conv.get('uuid')
            })

    # Sort by timestamp
    timeline.sort(key=lambda x: x['timestamp'])

    with open(output_file, "w") as out:
        for entry in timeline:
            out.write(f"[{entry['date']}] {entry['title']} (UUID: {entry['id']})\n")

    print(f"Timeline sorted and saved to {output_file}")
    
    for entry in timeline[:10]:
        print(f"[{entry['date']}] {entry['title']}")
    print("...")
    for entry in timeline[-10:]:
        print(f"[{entry['date']}] {entry['title']}")

except Exception as e:
    print(f"Error processing file: {e}")
