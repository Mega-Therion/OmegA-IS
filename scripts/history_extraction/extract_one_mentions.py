import json
import zipfile
import datetime
import re

# Path to the zip file
zip_path = "/home/mega/MEGA downloads/Safa Data.zip"
json_filename = "conversations.json"
output_file = "/home/mega/.gemini/tmp/one_mentions_2025_detailed.txt"

print(f"Reading {json_filename} from {zip_path}...")

# Define the date range for 2025
start_2025 = datetime.datetime(2025, 1, 1, 0, 0, 0)
end_2025 = datetime.datetime(2025, 12, 31, 23, 59, 59)

keywords = [r"one natural energy", r"one ecosystem", r"\bONE\b"] # \b for whole word match for ONE

try:
    with zipfile.ZipFile(zip_path, 'r') as z:
        with z.open(json_filename) as f:
            data = json.load(f)

    found_mentions = []

    for conv in data:
        conv_id = conv.get('id')
        conv_title = conv.get('title', 'No Title')
        conv_create_time_ts = conv.get('create_time')
        
        if not conv_create_time_ts:
            continue
            
        conv_dt_object = datetime.datetime.fromtimestamp(conv_create_time_ts)

        # Only process conversations from 2025
        if start_2025 <= conv_dt_object <= end_2025:
            # Check messages within the conversation
            mapping = conv.get('mapping', {})
            for node_id, node in mapping.items():
                msg = node.get('message')
                if msg and msg.get('content'):
                    parts = msg.get('content').get('parts', [])
                    role = msg.get('author', {}).get('role')
                    
                    if parts and role:
                        message_text = " ".join([p for p in parts if isinstance(p, str)])
                        
                        # Check for keywords in message text
                        for keyword in keywords:
                            if re.search(keyword, message_text, re.IGNORECASE):
                                # Get message creation time, default to conversation create_time if not available
                                msg_create_time_ts = msg.get('create_time') or conv_create_time_ts
                                msg_dt_object = datetime.datetime.fromtimestamp(msg_create_time_ts)
                                
                                found_mentions.append({
                                    'date': msg_dt_object.strftime('%Y-%m-%d %H:%M:%S'),
                                    'timestamp': msg_create_time_ts,
                                    'conversation_title': conv_title,
                                    'conversation_id': conv_id,
                                    'message_role': role,
                                    'message_content_snippet': message_text[:500] + "..." if len(message_text) > 500 else message_text
                                })
                                break # Found a keyword, move to next message

    # Sort mentions chronologically
    found_mentions.sort(key=lambda x: x['timestamp'])

    with open(output_file, "w") as out:
        if not found_mentions:
            out.write("No explicit mentions of 'ONE' or 'One Natural Energy' found in 2025 conversations.\n")
        else:
            for mention in found_mentions:
                out.write(f"--- Conversation: {mention['conversation_title']} (ID: {mention['conversation_id']}) ---\n")
                out.write(f"Date: {mention['date']}\n")
                out.write(f"Role: {mention['message_role']}\n")
                out.write(f"Content: {mention['message_content_snippet']}\n\n")

    print(f"Detailed mentions of 'ONE' in 2025 saved to {output_file}")

except Exception as e:
    print(f"Error processing file: {e}")
