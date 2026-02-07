import json
import zipfile
import datetime
import re

zip_path = "/home/mega/MEGA downloads/DeepSeek Data.zip"
json_filename = "conversations.json"
target_conv_id = "af5c322d-4088-4a26-b3a1-5ab1d17524f4"
output_file = f"/home/mega/.gemini/tmp/deepseek_challenge_{target_conv_id}.txt"

print(f"Extracting conversation {target_conv_id} from {zip_path}...")

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
            conv_title = found_conversation.get('title', 'No Title')
            out.write(f"--- Conversation: {conv_title} (ID: {found_conversation.get('id')}) ---\n")
            
            inserted_at_str = found_conversation.get('inserted_at')
            if inserted_at_str:
                dt_object = datetime.datetime.fromisoformat(inserted_at_str)
                out.write(f"Conversation Start: {dt_object.strftime('%Y-%m-%d %H:%M:%S')}\n\n")

            mapping = found_conversation.get('mapping', {})
            
            # Filter out nodes without a message to prevent NoneType errors in sorting
            valid_nodes = [node for node in mapping.values() if node.get('message', {}).get('inserted_at')]
            sorted_messages = sorted(valid_nodes, key=lambda x: datetime.datetime.fromisoformat(x['message']['inserted_at']).timestamp())
            
            for node in sorted_messages:
                msg = node.get('message')
                if msg: # Ensure message exists
                    content = msg.get('content')
                    role = msg.get('author', {}).get('role')
                    
                    if content and role: # Ensure content and role exist
                        parts = content.get('parts', [])
                        
                        # Handle parts being a list of strings or dicts
                        message_text = ""
                        for part in parts:
                            if isinstance(part, str):
                                message_text += part
                            elif isinstance(part, dict) and 'content' in part: # Handle tool fragments
                                message_text += part['content']
                            # Add more specific handling if other dict structures are found
                        
                        msg_inserted_at_str = msg.get('inserted_at')
                        # Use conversation start time if message inserted_at is missing (shouldn't be after filter)
                        msg_dt_object = datetime.datetime.fromisoformat(msg_inserted_at_str) if msg_inserted_at_str else dt_object
                        
                        out.write(f"[{msg_dt_object.strftime('%Y-%m-%d %H:%M:%S')}] [{role}]: {message_text}\n\n")
        print(f"Conversation content extracted to {output_file}")
    else:
        print(f"Conversation with ID {target_conv_id} not found.")

except Exception as e:
    print(f"Error processing file: {e}")