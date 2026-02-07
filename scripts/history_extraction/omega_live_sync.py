#!/usr/bin/env python3
import time
import os
import requests
from supabase_chat_search import ChatHistorySearch

HISTORY_FILE = os.path.expanduser("~/.omega_chat_history.txt")
SYNC_LOG = os.path.expanduser("~/.omega_sync_state.txt")
SUPABASE_URL = "https://sgvitxezqrjgjmduoool.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndml0eGV6cXJqZ2ptZHVvb29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE2MzQ4MCwiZXhwIjoyMDgzNzM5NDgwfQ.o5GjnHg5fivo8MOCfNEv3PJkC0rQhxs2c8dXG7rSoOc"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Content-Profile": "api"
}

def get_last_synced_line():
    if os.path.exists(SYNC_LOG):
        with open(SYNC_LOG, "r") as f:
            try: return int(f.read().strip())
            except: return 0
    return 0

def set_last_synced_line(line_num):
    with open(SYNC_LOG, "w") as f:
        f.write(str(line_num))

def sync_line(line):
    line = line.strip()
    if not line: return False
    
    role = "user" if line.startswith("User:") else "assistant"
    content = line.replace("User: ", "").replace("ΩmegA: ", "")
    
    # Generate embedding (will be cached by ChatHistorySearch)
    vector = ChatHistorySearch.get_embedding(content)
    
    payload = {
        "content": content,
        "role": role,
        "embedding": vector,
        "conversation_id": "live_sync",
        "source_file": "omega_chat_history.txt"
    }
    
    try:
        res = requests.post(f"{SUPABASE_URL}/rest/v1/chat_messages", headers=HEADERS, json=payload)
        return res.status_code in [200, 201]
    except: return False

def main():
    print("🧠 ΩmegA Live-Sync Daemon Active...")
    last_line = get_last_synced_line()
    
    while True:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r") as f:
                lines = f.readlines()
                total_lines = len(lines)
                
                if total_lines > last_line:
                    print(f"🔄 Syncing {total_lines - last_line} new lines...")
                    for i in range(last_line, total_lines):
                        if sync_line(lines[i]):
                            last_line = i + 1
                            set_last_synced_line(last_line)
        
        time.sleep(10) # Poll every 10 seconds

if __name__ == "__main__":
    main()
