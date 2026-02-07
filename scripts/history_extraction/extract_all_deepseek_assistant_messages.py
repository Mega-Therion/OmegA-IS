import json
import zipfile
import datetime
import re

zip_path = "/home/mega/MEGA downloads/DeepSeek Data.zip"
json_filename = "conversations.json"
output_file = "/home/mega/.gemini/tmp/deepseek_all_assistant_messages.txt"

print(f"Extracting all assistant messages from {json_filename} in {zip_path}...")

try:
    with zipfile.ZipFile(zip_path, 'r') as z:
        with z.open(json_filename) as f:
            data = json.load(f)

    with open(output_file, "w") as out:
        for conv in data:
            conv_id = conv.get('id')
            conv_title = conv.get('title', 'No Title')
            
            mapping = conv.get('mapping', {})
            sorted_messages = sorted(
                [node for node in mapping.values() if node.get('message', {}).get('inserted_at')],
                key=lambda x: datetime.datetime.fromisoformat(x['message']['inserted_at']).timestamp()
            )
            
            for node in sorted_messages:
                msg = node.get('message')
                if msg:
                    content = msg.get('content')
                    role = msg.get('author', {}).get('role')
                    
                    if content and role == 'assistant': # Only extract assistant's responses
                        parts = content.get('parts', [])
                        message_text = ""
                        for part in parts:
                            if isinstance(part, str):
                                message_text += part
                            elif isinstance(part, dict) and 'content' in part:
                                message_text += part['content']
                        
                        inserted_at_str = msg.get('inserted_at')
                        msg_dt_object = datetime.datetime.fromisoformat(inserted_at_str) if inserted_at_str else datetime.datetime.fromtimestamp(0)
                        
                        out.write(f"--- Conversation: {conv_title} (ID: {conv_id}) ---\n")
                        out.write(f"Date: {msg_dt_object.strftime('%Y-%m-%d %H:%M:%S')}\n")
                        out.write(f"[ASSISTANT]:\n{message_text}\n\n{'='*80}\n\n")
    print(f"All assistant messages extracted to {output_file}")

except Exception as e:
    print(f"Error processing file: {e}")