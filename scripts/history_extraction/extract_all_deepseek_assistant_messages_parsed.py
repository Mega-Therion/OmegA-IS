import json
import zipfile
import datetime
import re
import os

zip_path = "/home/mega/MEGA downloads/DeepSeek Data.zip"
json_filename = "conversations.json"
output_file = "/home/mega/.gemini/tmp/deepseek_all_assistant_messages_parsed.txt"

print(f"Extracting and robustly parsing all assistant messages from {json_filename} in {zip_path}...")

try:
    with zipfile.ZipFile(zip_path, 'r') as z:
        with z.open(json_filename) as f:
            data = json.load(f)

    with open(output_file, "w") as out:
        for conv in data:
            conv_id = conv.get('id')
            conv_title = conv.get('title', 'No Title')
            
            mapping = conv.get('mapping', {})
            
            # Filter out nodes without a message or inserted_at for robust sorting
            valid_nodes = [node for node in mapping.values() if node.get('message', {}).get('inserted_at')]
            
            sorted_messages = sorted(
                valid_nodes,
                key=lambda x: datetime.datetime.fromisoformat(x['message']['inserted_at']).timestamp()
            )
            
            for node in sorted_messages:
                msg = node.get('message')
                if msg:
                    content_obj = msg.get('content')
                    role = msg.get('author', {}).get('role')
                    
                    if content_obj and role == 'assistant': # Only extract assistant's responses
                        parts = content_obj.get('parts', [])
                        
                        message_text_accumulator = []
                        for part in parts:
                            if isinstance(part, str):
                                message_text_accumulator.append(part)
                            elif isinstance(part, dict) and 'fragments' in part: # Handle the fragments structure
                                for fragment in part.get('fragments', []):
                                    if isinstance(fragment, dict) and 'content' in fragment:
                                        message_text_accumulator.append(fragment['content'])
                                    elif isinstance(fragment, str): # Fallback for fragments as strings
                                        message_text_accumulator.append(fragment)
                            elif isinstance(part, dict) and 'content' in part: # Direct content in part dict
                                message_text_accumulator.append(part['content'])
                            # Add other cases if DeepSeek has more complex 'parts' structures
                        
                        message_text = " ".join(message_text_accumulator).strip()
                        
                        inserted_at_str = msg.get('inserted_at')
                        msg_dt_object = datetime.datetime.fromisoformat(inserted_at_str) if inserted_at_str else datetime.datetime.fromtimestamp(0) # Fallback timestamp
                        
                        if message_text: # Only write if there's actual text
                            out.write(f"--- Conversation: {conv_title} (ID: {conv_id}) ---\n")
                            out.write(f"Date: {msg_dt_object.strftime('%Y-%m-%d %H:%M:%S')}\n")
                            out.write(f"[ASSISTANT]:\n{message_text}\n\n{'='*80}\n\n")
    print(f"All assistant messages extracted and parsed to {output_file}")

except Exception as e:
    print(f"Error processing file: {e}")