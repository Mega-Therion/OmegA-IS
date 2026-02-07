import json
import zipfile
import datetime
import os

# Path to the zip file
zip_path = "/home/mega/MEGA downloads/Safa Data.zip"
json_filename = "conversations.json"

print(f"Reading {json_filename} from {zip_path}...")

try:
    with zipfile.ZipFile(zip_path, 'r') as z:
        with z.open(json_filename) as f:
            data = json.load(f)

    print(f"Successfully loaded {len(data)} conversations.")

    timeline = []

    for conv in data:
        title = conv.get('title', 'No Title')
        create_time = conv.get('create_time')
        
        # Handle cases where create_time might be missing or None
        if create_time:
            dt_object = datetime.datetime.fromtimestamp(create_time)
            formatted_date = dt_object.strftime('%Y-%m-%d %H:%M:%S')
            timeline.append({
                'date': formatted_date,
                'timestamp': create_time,
                'title': title,
                'id': conv.get('id')
            })

    # Sort by timestamp
    timeline.sort(key=lambda x: x['timestamp'])

    # Write to a summary file
    output_file = "OMEGA_MASTER_TIMELINE.txt"
    with open(output_file, "w") as out:
        for entry in timeline:
            out.write(f"[{entry['date']}] {entry['title']} (ID: {entry['id']})\n")

    print(f"Timeline sorted and saved to {output_file}")
    
    # Print the first 20 and last 20 entries to verify range
    print("\n--- First 20 Conversations ---")
    for entry in timeline[:20]:
        print(f"[{entry['date']}] {entry['title']}")
        
    print("\n--- Last 20 Conversations ---")
    for entry in timeline[-20:]:
        print(f"[{entry['date']}] {entry['title']}")

except Exception as e:
    print(f"Error processing file: {e}")
