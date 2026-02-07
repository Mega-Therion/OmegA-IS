import json
import zipfile
import datetime
import os

# Path to the zip file
zip_path = "/home/mega/MEGA downloads/DeepSeek Data.zip"
json_filename = "conversations.json"
output_file = "OMEGA_DEEPSEEK_TIMELINE.txt"

print(f"Reading {json_filename} from {zip_path}...")

try:
    with zipfile.ZipFile(zip_path, 'r') as z:
        with z.open(json_filename) as f:
            data = json.load(f)

    print(f"Successfully loaded {len(data)} conversations.")

    timeline = []

    for conv in data:
        title = conv.get('title', 'No Title')
        # Use 'inserted_at' and parse ISO 8601 string
        inserted_at_str = conv.get('inserted_at')
        
        if inserted_at_str:
            # Parse ISO 8601 string (e.g., "2025-12-15T12:31:38.889000+08:00")
            # Handle potential timezone info in string
            dt_object = datetime.datetime.fromisoformat(inserted_at_str)
            
            # Convert to Unix timestamp for consistent sorting and storage
            create_time_ts = dt_object.timestamp()
            formatted_date = dt_object.strftime('%Y-%m-%d %H:%M:%S')
            
            timeline.append({
                'date': formatted_date,
                'timestamp': create_time_ts,
                'title': title,
                'id': conv.get('id')
            })

    # Sort by timestamp
    timeline.sort(key=lambda x: x['timestamp'])

    # Write to a summary file
    with open(output_file, "w") as out:
        for entry in timeline:
            out.write(f"[{entry['date']}] {entry['title']} (ID: {entry['id']})\n")

    print(f"Timeline sorted and saved to {output_file}")
    
    # Print the first 20 and last 20 entries to verify range
    num_entries = len(timeline)
    print(f"\n--- First {min(20, num_entries)} Conversations ---")
    for entry in timeline[:20]:
        out.write(f"[{entry['date']}] {entry['title']}\n") # Also write to file for completeness
        print(f"[{entry['date']}] {entry['title']}")
        
    print(f"\n--- Last {min(20, num_entries)} Conversations ---")
    for entry in timeline[-20:]:
        out.write(f"[{entry['date']}] {entry['title']}\n") # Also write to file for completeness
        print(f"[{entry['date']}] {entry['title']}")

except Exception as e:
    print(f"Error processing file: {e}")