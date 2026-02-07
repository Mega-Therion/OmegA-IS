import json
import zipfile
import os

zip_path = "/home/mega/MEGA downloads/DeepSeek Data.zip"
json_filename = "conversations.json"
target_conv_id = "af5c322d-4088-4a26-b3a1-5ab1d17524f4"
output_file = f"/home/mega/.gemini/tmp/deepseek_challenge_pretty.json"

print(f"Extracting and pretty-printing conversation {target_conv_id} from {zip_path}...")

try:
    with zipfile.ZipFile(zip_path, 'r') as z:
        with z.open(json_filename) as f:
            data = json.load(f)

    found_conversation = None
    for conv in data:
        if conv.get('id') == target_conv_id:
            found_conversation = conv
            break

    if found_conversation:
        with open(output_file, "w") as out:
            json.dump(found_conversation, out, indent=2)
        print(f"Conversation content pretty-printed to {output_file}")
    else:
        print(f"Conversation with ID {target_conv_id} not found.")

except Exception as e:
    print(f"Error processing file: {e}")
