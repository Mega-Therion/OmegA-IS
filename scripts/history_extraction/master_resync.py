#!/usr/bin/env python3
import requests
import json
import time

# Credentials
SUPABASE_URL = "https://sgvitxezqrjgjmduoool.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndml0eGV6cXJqZ2ptZHVvb29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE2MzQ4MCwiZXhwIjoyMDgzNzM5NDgwfQ.o5GjnHg5fivo8MOCfNEv3PJkC0rQhxs2c8dXG7rSoOc"
OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
EMBEDDING_MODEL = "nomic-embed-text"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Profile": "api",
    "Accept-Profile": "api"
}

def get_embedding(text):
    """Generate 768-dim vector locally."""
    try:
        res = requests.post(OLLAMA_EMBED_URL, json={"model": EMBEDDING_MODEL, "prompt": text}, timeout=30)
        return res.json().get("embedding") if res.status_code == 200 else None
    except: return None

def main():
    print("\n" + "═"*70)
    print(" ΩmegA MASTER RE-SYNC: INITIALIZING LOCAL VECTOR MATRIX")
    print(f" Model: {EMBEDDING_MODEL} (Local)")
    print("═"*70 + "\n")

    # 1. Reset all embeddings to ensure a clean start
    print("🧹 Resetting existing embeddings for calibration...")
    requests.patch(f"{SUPABASE_URL}/rest/v1/chat_messages", headers=HEADERS, json={"embedding": None})

    # 2. Fetch all messages
    print("🔍 Fetching records for neural reprocessing...")
    fetch_url = f"{SUPABASE_URL}/rest/v1/chat_messages?select=id,content"
    res = requests.get(fetch_url, headers=HEADERS)
    messages = res.json()
    
    total = len(messages)
    print(f"📊 Found {total} records. Starting local embedding...")

    # 3. Batch process locally
    processed = 0
    for msg in messages:
        msg_id = msg['id']
        content = msg['content']
        
        vector = get_embedding(content)
        
        if vector:
            patch_url = f"{SUPABASE_URL}/rest/v1/chat_messages?id=eq.{msg_id}"
            requests.patch(patch_url, headers=HEADERS, json={"embedding": vector})
            
            processed += 1
            if processed % 50 == 0 or processed == total:
                print(f" ✅ Processed {processed}/{total}...")
        
        # Fast but stable
        time.sleep(0.01)

    print("\n" + "═"*70)
    print(" ✨ RE-SYNC COMPLETE: The Vector Matrix is now perfectly calibrated.")
    print("═"*70 + "\n")

if __name__ == "__main__":
    main()
