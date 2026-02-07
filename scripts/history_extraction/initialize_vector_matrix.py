#!/usr/bin/env python3
import os
import json
import time
import requests
from openai import OpenAI

# Credentials (read from environment)
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# Initialize OpenAI
if not OPENAI_API_KEY:
    raise RuntimeError("Missing OPENAI_API_KEY in environment")
openai = OpenAI(api_key=OPENAI_API_KEY)

# Supabase REST Headers
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY in environment")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Content-Profile": "api",
    "Accept-Profile": "api"
}

def get_embedding(text):
    """Generate embedding for a given text using OpenAI"""
    text = str(text).replace("\n", " ").strip()
    if not text:
        return [0] * 1536
    
    try:
        response = openai.embeddings.create(
            input=[text],
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"❌ OpenAI Error: {e}")
        return None

def main():
    print("\n" + "="*70)
    print("HYBRID RAG & VECTOR MATRIX INITIALIZATION")
    print("="*70 + "\n")

    # 1. Fetch messages that don't have embeddings yet
    print("🔍 Checking for messages missing embeddings...")
    fetch_url = f"{SUPABASE_URL}/rest/v1/chat_messages?embedding=is.null&select=id,content"
    
    try:
        response = requests.get(fetch_url, headers=HEADERS)
        if response.status_code != 200:
            print(f"❌ Failed to fetch: {response.text}")
            return
        messages = response.json()
    except Exception as e:
        print(f"❌ Error during fetch: {e}")
        return

    if not messages:
        print("✨ All messages already have embeddings! Nothing to do.")
        return

    total = len(messages)
    print(f"📊 Found {total} messages to process.\n")

    # 2. Process and update
    processed = 0
    
    for msg in messages:
        msg_id = msg['id']
        content = msg['content']
        
        # Generate vector
        embedding = get_embedding(content)
        
        if embedding:
            try:
                # Update via REST API
                patch_url = f"{SUPABASE_URL}/rest/v1/chat_messages?id=eq.{msg_id}"
                update_res = requests.patch(patch_url, headers=HEADERS, json={'embedding': embedding})
                
                if update_res.status_code in [200, 204]:
                    processed += 1
                    if processed % 10 == 0 or processed == total:
                        print(f"✅ Processed {processed}/{total} embeddings...")
                else:
                    print(f"⚠️  Failed to update {msg_id}: {update_res.text}")
            except Exception as e:
                print(f"⚠️  Exception for {msg_id}: {e}")
        
        # Avoid hitting rate limits
        time.sleep(0.05)

    print(f"\n" + "="*70)
    print(f"✨ SUCCESS! Vector Matrix initialized.")
    print(f"   Total Messages Embedded: {processed}")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
