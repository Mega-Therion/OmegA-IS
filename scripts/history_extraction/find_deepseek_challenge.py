import json
import zipfile
import datetime
import re

zip_path = "/home/mega/MEGA downloads/DeepSeek Data.zip"
json_filename = "conversations.json"
output_file = "/home/mega/.gemini/tmp/deepseek_challenge_search_results.txt"

# Keywords to search for, case-insensitive
keywords_to_find = [
    r"unrealistic goal",
    r"Jarvis",
    r"woods",
    r"Arkansas",
    r"short term goal",
    r"daydreaming",
    r"alone in my room",
    r"hillbilly" # Even if paraphrased, good to check for variations
]

print(f"Searching {json_filename} in {zip_path} for the DeepSeek Challenge keywords...")

try:
    with zipfile.ZipFile(zip_path, 'r') as z:
        with z.open(json_filename) as f:
            data = json.load(f)

    found_exchanges = []

    for conv in data:
        conv_id = conv.get('id')
        conv_title = conv.get('title', 'No Title')
        
        mapping = conv.get('mapping', {})
        for node_id, node in mapping.items():
            msg = node.get('message')
            if msg:
                content = msg.get('content')
                role = msg.get('author', {}).get('role')
                
                if content and role == 'assistant': # Only check assistant's responses
                    parts = content.get('parts', [])
                    message_text = ""
                    for part in parts:
                        if isinstance(part, str):
                            message_text += part
                        elif isinstance(part, dict) and 'content' in part:
                            message_text += part['content']
                    
                    for keyword in keywords_to_find:
                        if re.search(keyword, message_text, re.IGNORECASE):
                            inserted_at_str = msg.get('inserted_at')
                            msg_dt_object = datetime.datetime.fromisoformat(inserted_at_str) if inserted_at_str else datetime.datetime.fromtimestamp(0)
                            
                            found_exchanges.append({
                                'date': msg_dt_object.strftime('%Y-%m-%d %H:%M:%S'),
                                'conversation_title': conv_title,
                                'conversation_id': conv_id,
                                'message_content_snippet': message_text[:500] + "..." if len(message_text) > 500 else message_text
                            })
                            break # Move to next message once a keyword is found

    if found_exchanges:
        with open(output_file, "w") as out:
            for exchange in found_exchanges:
                out.write(f"--- Conversation: {exchange['conversation_title']} (ID: {exchange['conversation_id']}) ---\n")
                out.write(f"Date: {exchange['date']}\n")
                out.write(f"Snippet: {exchange['message_content_snippet']}\n\n")
        print(f"DeepSeek Challenge search results saved to {output_file}")
    else:
        print("No DeepSeek Challenge keywords found in assistant messages.")

except Exception as e:
    print(f"Error processing file: {e}")
