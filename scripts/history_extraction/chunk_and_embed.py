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
    "Accept-Profile": "api",
    "Prefer": "return=representation"
}

def get_local_embedding(text):
    """Generate embedding using local Ollama"""
    text = str(text).replace("\n", " ").strip()
    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": EMBEDDING_MODEL, "prompt": text},
            timeout=60
        )
        if response.status_code == 200:
            return response.json().get("embedding")
    except Exception:
        pass
    return None

def chunk_text(text, max_chars=4000):
    """Split text into smaller parts"""
    chunks = []
    for i in range(0, len(text), max_chars):
        chunks.append(text[i:i+max_chars])
    return chunks

def main():
    print("\n" + "="*70)
    print("HYBRID RAG: AUTO-CHUNKING & VECTOR INTEGRATION")
    print("="*70 + "\n")

    # 1. Fetch oversized messages (NULL embeddings)
    fetch_url = f"{SUPABASE_URL}/rest/v1/chat_messages?embedding=is.null&select=*"
    response = requests.get(fetch_url, headers=HEADERS)
    messages = response.json()

    if not messages:
        print("✨ No oversized messages found.")
        return

    print(f"📊 Processing {len(messages)} oversized messages...\n")

    for msg in messages:
        original_id = msg['id']
        content = msg['content']
        
        # Split into parts
        parts = chunk_text(content)
        num_parts = len(parts)
        
        print(f"🔄 Splitting Message {original_id} ({len(content)} chars) into {num_parts} parts...")

        for idx, part_content in enumerate(parts):
            # Create part tag
            tag = f"\n\n[Part {idx+1} of {num_parts}]"
            tagged_content = part_content + tag
            
            # Generate embedding for the part
            vector = get_local_embedding(tagged_content)
            
            # Create new row payload
            new_row = {
                "conversation_id": msg['conversation_id'],
                "role": msg['role'],
                "content": tagged_content,
                "source_file": msg['source_file'],
                "created_at": msg['created_at'],
                "message_at": msg['message_at'],
                "embedding": vector
            }
            
            # Insert part
            insert_res = requests.post(f"{SUPABASE_URL}/rest/v1/chat_messages", headers=HEADERS, json=new_row)
            if insert_res.status_code in [200, 201]:
                print(f"  ✅ Part {idx+1} inserted and embedded.")
            else:
                print(f"  ❌ Failed to insert Part {idx+1}: {insert_res.text}")

        # Delete original row
        delete_res = requests.delete(f"{SUPABASE_URL}/rest/v1/chat_messages?id=eq.{original_id}", headers=HEADERS)
        if delete_res.status_code in [200, 204]:
            print(f"🗑️ Original Message {original_id} deleted.")
        else:
            print(f"⚠️ Failed to delete original {original_id}: {delete_res.text}")

    print(f"\n" + "="*70)
    print(f"✨ ALL OVERSIZED MESSAGES PROCESSED.")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
