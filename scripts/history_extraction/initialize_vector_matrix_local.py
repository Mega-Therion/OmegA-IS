#!/usr/bin/env python3
import os
import json
import time
import requests

# Credentials
SUPABASE_URL = "https://sgvitxezqrjgjmduoool.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndml0eGV6cXJqZ2ptZHVvb29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE2MzQ4MCwiZXhwIjoyMDgzNzM5NDgwfQ.o5GjnHg5fivo8MOCfNEv3PJkC0rQhxs2c8dXG7rSoOc"

# Ollama settings
OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBEDDING_MODEL = "nomic-embed-text"

# Supabase REST Headers
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Content-Profile": "api",
    "Accept-Profile": "api"
}

def get_local_embedding(text):
    """Generate embedding using local Ollama"""
    text = str(text).replace("\n", " ").strip()
    if not text:
        return [0] * 768
    
    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": EMBEDDING_MODEL, "prompt": text},
            timeout=30
        )
        if response.status_code == 200:
            return response.json().get("embedding")
        else:
            print(f"❌ Ollama Error ({response.status_code}): {response.text}")
            return None
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return None

def main():
    print("\n" + "="*70)
    print("LOCAL HYBRID RAG: VECTOR MATRIX INITIALIZATION")
    print(f"Model: {EMBEDDING_MODEL} (Local)")
    print("="*70 + "\n")

    # 1. Fetch messages missing embeddings
    print("🔍 Checking Supabase for missing embeddings...")
    fetch_url = f"{SUPABASE_URL}/rest/v1/chat_messages?embedding=is.null&select=id,content"
    
    try:
        response = requests.get(fetch_url, headers=HEADERS)
        if response.status_code != 200:
            print(f"❌ Failed to fetch from Supabase: {response.text}")
            return
        messages = response.json()
    except Exception as e:
        print(f"❌ Error during fetch: {e}")
        return

    if not messages:
        print("✨ All messages already have embeddings! Nothing to do.")
        return

    total = len(messages)
    print(f"📊 Found {total} messages to process locally.\n")

    # 2. Process and update
    processed = 0
    
    for msg in messages:
        msg_id = msg['id']
        content = msg['content']
        
        # Generate vector locally
        embedding = get_local_embedding(content)
        
        if embedding:
            try:
                # Update Supabase via REST API
                patch_url = f"{SUPABASE_URL}/rest/v1/chat_messages?id=eq.{msg_id}"
                update_res = requests.patch(patch_url, headers=HEADERS, json={'embedding': embedding})
                
                if update_res.status_code in [200, 204]:
                    processed += 1
                    if processed % 10 == 0 or processed == total:
                        print(f"✅ Processed {processed}/{total} local embeddings...")
                else:
                    print(f"⚠️  Failed to update Supabase row {msg_id}: {update_res.text}")
            except Exception as e:
                print(f"⚠️  Exception for {msg_id}: {e}")
        
        # Tiny delay to ensure system stability
        time.sleep(0.01)

    print(f"\n" + "="*70)
    print(f"✨ SUCCESS! Local Vector Matrix initialized.")
    print(f"   Total Messages Embedded: {processed}")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
