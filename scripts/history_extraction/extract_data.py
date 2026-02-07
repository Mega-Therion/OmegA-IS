import os
import json
import zipfile
from datetime import datetime
from collections import defaultdict

source_folder = '/home/mega/MEGA downloads'
output_folder = os.path.join(source_folder, 'OmegA Exports script')

if not os.path.exists(output_folder):
    os.makedirs(output_folder)

def deep_search(obj, keys_to_find, max_depth=10, current_depth=0):
    """Recursively search nested structures for multiple keys"""
    results = {}

    if current_depth > max_depth:
        return results

    if isinstance(obj, dict):
        for k, v in obj.items():
            k_lower = k.lower()
            # Exact and partial matches
            for target in keys_to_find:
                if target.lower() in k_lower or k_lower in target.lower():
                    results[k] = v

            if isinstance(v, (dict, list)):
                nested = deep_search(v, keys_to_find, max_depth, current_depth + 1)
                results.update(nested)

    elif isinstance(obj, list):
        for item in obj:
            nested = deep_search(item, keys_to_find, max_depth, current_depth + 1)
            results.update(nested)

    return results

def extract_message_data(item):
    """Extract comprehensive message data from various formats"""
    msg = {}

    # Look for content/text
    text_keys = ['content', 'text', 'body', 'message', 'parts', 'payload', 'value']
    content_search = deep_search(item, text_keys)

    if content_search:
        msg['content'] = str(list(content_search.values())[0])

    # Look for timestamps
    date_keys = ['timestamp', 'created_at', 'create_time', 'time', 'date', 'sent_at']
    date_search = deep_search(item, date_keys)

    if date_search:
        msg['timestamp'] = str(list(date_search.values())[0])

    # Look for role/author/speaker
    role_keys = ['role', 'author', 'speaker', 'from', 'sender', 'name']
    role_search = deep_search(item, role_keys)

    if role_search:
        msg['role'] = str(list(role_search.values())[0])

    # Look for conversation metadata
    meta_keys = ['conversation_id', 'thread_id', 'session_id', 'title', 'subject', 'model']
    meta_search = deep_search(item, meta_keys)

    for k, v in meta_search.items():
        msg[k.lower()] = str(v)

    # Check for nested 'parts' structure (like OpenAI's format)
    if 'parts' in item and isinstance(item['parts'], list):
        for part in item['parts']:
            if isinstance(part, dict):
                part_text = part.get('text', '')
                if part_text and msg.get('content') != part_text:
                    if 'content' not in msg:
                        msg['content'] = part_text
                    else:
                        msg['content'] = msg.get('content', '') + ' ' + str(part_text)

    return msg if msg.get('content') else None

def process_archives():
    all_conversations = defaultdict(list)
    total_messages = 0

    for filename in os.listdir(source_folder):
        if filename.endswith('.zip'):
            zip_path = os.path.join(source_folder, filename)
            print(f"Processing {filename}...")

            with zipfile.ZipFile(zip_path, 'r') as z:
                for file_info in z.infolist():
                    if file_info.filename.endswith('.json'):
                        with z.open(file_info) as f:
                            try:
                                raw_data = json.load(f)

                                # Handle list format (array of messages)
                                if isinstance(raw_data, list):
                                    for item in raw_data:
                                        msg_data = extract_message_data(item)
                                        if msg_data and len(msg_data.get('content', '')) > 5:
                                            conv_id = msg_data.get('conversation_id', msg_data.get('thread_id', 'uncategorized'))
                                            all_conversations[conv_id].append({
                                                **msg_data,
                                                'source_file': filename,
                                                'json_file': file_info.filename
                                            })
                                            total_messages += 1

                                # Handle dict format (single conversation or nested structure)
                                elif isinstance(raw_data, dict):
                                    msg_data = extract_message_data(raw_data)
                                    if msg_data and len(msg_data.get('content', '')) > 5:
                                        conv_id = msg_data.get('conversation_id', msg_data.get('thread_id', 'uncategorized'))
                                        all_conversations[conv_id].append({
                                            **msg_data,
                                            'source_file': filename,
                                            'json_file': file_info.filename
                                        })
                                        total_messages += 1

                                    # Check for nested messages/conversations
                                    for k, v in raw_data.items():
                                        if isinstance(v, list):
                                            for item in v:
                                                msg_data = extract_message_data(item)
                                                if msg_data and len(msg_data.get('content', '')) > 5:
                                                    conv_id = msg_data.get('conversation_id', msg_data.get('thread_id', k))
                                                    all_conversations[conv_id].append({
                                                        **msg_data,
                                                        'source_file': filename,
                                                        'json_file': file_info.filename
                                                    })
                                                    total_messages += 1

                            except Exception as e:
                                print(f"  Error processing {file_info.filename}: {e}")
                                continue

    # Save comprehensive output
    output_data = {
        'metadata': {
            'extraction_date': datetime.now().isoformat(),
            'total_conversations': len(all_conversations),
            'total_messages': total_messages,
            'source_files': list(set([conv[0].get('source_file') for conv in all_conversations.values() if conv]))
        },
        'conversations': {}
    }

    # Organize conversations
    for conv_id, messages in sorted(all_conversations.items()):
        output_data['conversations'][conv_id] = {
            'message_count': len(messages),
            'earliest': messages[0].get('timestamp', 'Unknown') if messages else 'Unknown',
            'latest': messages[-1].get('timestamp', 'Unknown') if messages else 'Unknown',
            'messages': messages
        }

    # Save main output
    output_file = os.path.join(output_folder, 'full_chat_history.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    # Also save a human-readable transcript version
    transcript_file = os.path.join(output_folder, 'chat_transcripts.txt')
    with open(transcript_file, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("FULL CHAT HISTORY TRANSCRIPTS\n")
        f.write(f"Extracted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total Conversations: {len(all_conversations)}\n")
        f.write(f"Total Messages: {total_messages}\n")
        f.write("=" * 80 + "\n\n")

        for conv_id, messages in sorted(all_conversations.items()):
            f.write(f"\n{'='*80}\n")
            f.write(f"CONVERSATION: {conv_id}\n")
            f.write(f"Messages: {len(messages)}\n")
            f.write(f"{'='*80}\n\n")

            for msg in messages:
                timestamp = msg.get('timestamp', 'Unknown')
                role = msg.get('role', 'Unknown')
                content = msg.get('content', '')

                f.write(f"[{timestamp}] {role}:\n")
                f.write(f"{content}\n")
                f.write("-" * 40 + "\n\n")

    print(f"\n✅ Extraction Complete!")
    print(f"Total Messages Extracted: {total_messages}")
    print(f"Total Conversations: {len(all_conversations)}")
    print(f"\nFiles saved:")
    print(f"  • {output_file}")
    print(f"  • {transcript_file}")

if __name__ == "__main__":
    process_archives()
