import json
import zipfile

zip_path = "/home/mega/MEGA downloads/Safa Data.zip"
json_filename = "conversations.json"
target_ids = {
    "94ea2382-3dad-4d93-a296-6fe77fa25bab": "Diagram: Holding Company Model (March 2024)",
    "39e78808-246a-4c54-be9d-09e6d27a7bd5": "Ambigram Logo RY (March 2024)"
}

try:
    with zipfile.ZipFile(zip_path, 'r') as z:
        with z.open(json_filename) as f:
            data = json.load(f)

    for conv in data:
        if conv.get('id') in target_ids:
            print(f"\n--- FOUND: {target_ids[conv.get('id')]} ---")
            print(f"Title: {conv.get('title')}")
            print(f"Create Time: {conv.get('create_time')}")
            
            # Print the first few messages to see the context
            mapping = conv.get('mapping', {})
            sorted_messages = sorted(mapping.values(), key=lambda x: x.get('message', {}).get('create_time') or 0 if x.get('message') else 0)
            
            for node in sorted_messages:
                msg = node.get('message')
                if msg and msg.get('content'):
                    parts = msg.get('content').get('parts', [])
                    role = msg.get('author', {}).get('role')
                    if parts and role in ['user', 'assistant']:
                        print(f"[{role}]: {str(parts[0])[:300]}...") # Print first 300 chars

except Exception as e:
    print(f"Error: {e}")
