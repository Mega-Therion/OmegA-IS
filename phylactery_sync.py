#!/usr/bin/env python3
import json
import zipfile
import os
import re
from datetime import datetime
from bs4 import BeautifulSoup
import requests

# --- CONFIGURATION ---
SOURCES = {
    "Safa": "/home/mega/MEGA downloads/Safa Data.zip",
    "DeepSeek": "/home/mega/MEGA downloads/DeepSeek Data.zip",
    "Claude": "/home/mega/MEGA downloads/Claude Data.zip",
    "Gemini": "/home/mega/MEGA downloads/Gemini Data.zip",
}

SUPABASE_URL = "https://sgvitxezqrjgjmduoool.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndml0eGV6cXJqZ2ptZHVvb29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE2MzQ4MCwiZXhwIjoyMDgzNzM5NDgwfQ.o5GjnHg5fivo8MOCfNEv3PJkC0rQhxs2c8dXG7rSoOc"

OUTPUT_FILE = "PHYLACTERY_MASTER_TIMELINE.json"
OUTPUT_TXT = "PHYLACTERY_MASTER_TIMELINE.txt"

def parse_iso(ts):
    if not ts: return datetime.min
    try:
        # Remove trailing Z and truncate microseconds
        ts = ts.replace('Z', '')
        if '.' in ts:
            ts = ts.split('.')[0]
        return datetime.fromisoformat(ts)
    except:
        return datetime.min

def extract_safa(zip_path):
    messages = []
    with zipfile.ZipFile(zip_path, 'r') as z:
        if 'conversations.json' in z.namelist():
            data = json.loads(z.read('conversations.json'))
            for conv in data:
                title = conv.get('title', 'Untitled')
                mapping = conv.get('mapping', {})
                for node_id, node in mapping.items():
                    msg = node.get('message')
                    if msg and msg.get('content') and msg.get('content').get('parts'):
                        text = "".join([p for p in msg['content']['parts'] if isinstance(p, str)])
                        if text:
                            ts = msg.get('create_time')
                            dt = datetime.fromtimestamp(ts) if ts else datetime.min
                            messages.append({
                                "timestamp": dt.isoformat(),
                                "source": "Safa",
                                "role": msg['author']['role'],
                                "content": text,
                                "context": title
                            })
    return messages

def extract_deepseek(zip_path):
    messages = []
    with zipfile.ZipFile(zip_path, 'r') as z:
        # Assuming DeepSeek export has chat_history.json or similar
        for name in z.namelist():
            if 'chat' in name.lower() and name.endswith('.json'):
                data = json.loads(z.read(name))
                # Handle potential list or dict structure
                chats = data if isinstance(data, list) else data.get('chats', [])
                for chat in chats:
                    title = chat.get('title', 'Untitled')
                    for msg in chat.get('messages', []):
                        messages.append({
                            "timestamp": msg.get('created_at', datetime.min.isoformat()),
                            "source": "DeepSeek",
                            "role": msg.get('role', 'unknown'),
                            "content": msg.get('content', ''),
                            "context": title
                        })
    return messages

def extract_claude(zip_path):
    messages = []
    with zipfile.ZipFile(zip_path, 'r') as z:
        if 'conversations.json' in z.namelist():
            data = json.loads(z.read('conversations.json'))
            for conv in data:
                title = conv.get('name', 'Untitled')
                for msg in conv.get('chat_messages', []):
                    messages.append({
                        "timestamp": msg.get('created_at', datetime.min.isoformat()),
                        "source": "Claude",
                        "role": msg.get('sender', 'unknown'),
                        "content": msg.get('text', ''),
                        "context": title
                    })
    return messages

def extract_gemini(zip_path):
    messages = []
    with zipfile.ZipFile(zip_path, 'r') as z:
        activity_file = "Takeout/My Activity/Gemini Apps/MyActivity.html"
        if activity_file in z.namelist():
            html = z.read(activity_file)
            soup = BeautifulSoup(html, 'html.parser')
            # Gemini Takeout HTML structure: div.content-cell contains prompt and timestamp
            cells = soup.find_all('div', class_='content-cell')
            for cell in cells:
                text = cell.get_text(separator="\n").strip()
                # Basic regex for date: "Jan 27, 2026, 9:34:22 PM UTC"
                date_match = re.search(r'([A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} [AP]M [A-Z]+)', text)
                if date_match:
                    date_str = date_match.group(1)
                    # Clean the text of the date
                    clean_text = text.replace(date_str, "").strip()
                    try:
                        # Normalize to ISO
                        dt = datetime.strptime(date_str, "%b %d, %h, %Y, %I:%M:%S %p %Z")
                    except:
                        dt = datetime.min
                    
                    messages.append({
                        "timestamp": dt.isoformat() if dt != datetime.min else datetime.now().isoformat(),
                        "source": "Gemini",
                        "role": "human", # Gemini Takeout usually only shows human prompts
                        "content": clean_text,
                        "context": "Activity Log"
                    })
    return messages

def main():
    all_messages = []
    
    print("--- ΩmegΑ Phylactery Synthesis Engine ---")
    
    for name, path in SOURCES.items():
        if not os.path.exists(path):
            print(f"⚠️  Missing source: {path}")
            continue
        print(f"📦 Extracting {name}...")
        try:
            if name == "Safa": all_messages.extend(extract_safa(path))
            elif name == "DeepSeek": all_messages.extend(extract_deepseek(path))
            elif name == "Claude": all_messages.extend(extract_claude(path))
            elif name == "Gemini": all_messages.extend(extract_gemini(path))
        except Exception as e:
            print(f"❌ Error parsing {name}: {e}")

    # Sort by timestamp
    print(f"⚖️  Sorting {len(all_messages)} messages chronologically...")
    all_messages.sort(key=lambda x: parse_iso(x['timestamp']))

    # Save local JSON
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(all_messages, f, indent=2)
    print(f"✅ Saved master JSON to {OUTPUT_FILE}")

    # Save readable TXT summary
    with open(OUTPUT_TXT, 'w') as f:
        for msg in all_messages:
            f.write(f"[{msg['timestamp']}] ({msg['source']}) {msg['role'].upper()}: {msg['context']}\n")
            f.write(f"{msg['content'][:200]}...\n")
            f.write("-" * 40 + "\n")
    print(f"✅ Saved master timeline summary to {OUTPUT_TXT}")

    # Supabase Sync
    print(f"☁️  Syncing to Supabase...")
    rest_url = f"{SUPABASE_URL}/rest/v1/chat_messages"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    # Prepare for upload (last 500 messages as a sample/test to avoid hitting limits during debug)
    # In production, we would use a tracking mechanism to only upload new ones.
    to_upload = []
    for m in all_messages[-500:]:
        to_upload.append({
            "conversation_id": m['source'] + "_" + m['context'][:50],
            "role": m['role'],
            "content": m['content'],
            "source_file": m['source'],
            "message_at": m['timestamp']
        })

    try:
        resp = requests.post(rest_url, json=to_upload, headers=headers)
        if resp.status_code in [200, 201]:
            print(f"🚀 Successfully anchored {len(to_upload)} messages to Supabase.")
        else:
            print(f"⚠️  Supabase Sync Error: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Failed to sync to cloud: {e}")

if __name__ == "__main__":
    main()
