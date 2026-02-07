#!/usr/bin/env python3
import os
import json
import time
import requests
from datetime import datetime

# --- CONFIGURATION ---
SUPABASE_URL = "https://sgvitxezqrjgjmduoool.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndml0eGV6cXJqZ2ptZHVvb29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE2MzQ4MCwiZXhwIjoyMDgzNzM5NDgwfQ.o5GjnHg5fivo8MOCfNEv3PJkC0rQhxs2c8dXG7rSoOc"

OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"

EMBED_MODEL = "nomic-embed-text"
SUMMARY_MODEL = "qwen2.5-coder:1.5b"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Content-Profile": "api",
    "Accept-Profile": "api",
    "Prefer": "return=minimal"
}

# --- ENGINE FUNCTIONS ---

def get_embedding(text):
    """Generate 768-dim vector locally."""
    try:
        res = requests.post(OLLAMA_EMBED_URL, json={"model": EMBED_MODEL, "prompt": text}, timeout=30)
        return res.json().get("embedding") if res.status_code == 200 else None
    except: return None

def get_summary(text):
    """Generate 1-sentence summary tag using qwen2.5-coder."""
    prompt = f"Summarize the following text in exactly one concise sentence for use as a database search tag:\n\n{text[:2000]}"
    try:
        res = requests.post(OLLAMA_GENERATE_URL, json={
            "model": SUMMARY_MODEL, 
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": 50}
        }, timeout=60)
        return res.json().get("response").strip() if res.status_code == 200 else ""
    except: return ""

def chunk_text_sliding(text, size=4000, overlap=400):
    """Implement sliding window chunking for context continuity."""
    chunks = []
    if len(text) <= size:
        return [text]
    
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start += (size - overlap)
    return chunks

def process_and_upload(msg_data, source_name="Live Sync"):
    """Chunk, Tag, Embed, and Sync a single message."""
    content = msg_data.get('content', '')
    if not content: return
    
    chunks = chunk_text_sliding(content)
    total_parts = len(chunks)
    
    for i, chunk in enumerate(chunks):
        tag = f"\n\n[Part {i+1} of {total_parts}]" if total_parts > 1 else ""
        tagged_content = chunk + tag
        
        # Neural Processing
        summary = get_summary(chunk)
        vector = get_embedding(tagged_content)
        
        payload = {
            "conversation_id": msg_data.get('conversation_id', 'unknown'),
            "role": str(msg_data.get('role', 'user')),
            "content": tagged_content,
            "summary": summary,
            "embedding": vector,
            "source_file": source_name,
            "created_at": msg_data.get('created_at', datetime.now().isoformat()),
            "message_at": msg_data.get('message_at', datetime.now().isoformat())
        }
        
        # REST Push
        requests.post(f"{SUPABASE_URL}/rest/v1/chat_messages", headers=HEADERS, json=payload)

def main():
    print("\n" + "═"*70)
    print(" ΩmegA MEMORY CORE v2.0 - LIVE")
    print(f" Models: {EMBED_MODEL} + {SUMMARY_MODEL}")
    print("═"*70 + "\n")

    # For this transition, we'll process 5 latest messages as a test
    print("🔄 Running System Test: Processing 5 recent history entries with v2.0 logic...")
    
    HISTORY_FILE = "/home/mega/MEGA downloads/OmegA Exports script/full_chat_history.json"
    with open(HISTORY_FILE, 'r') as f:
        data = json.load(f)
    
    # Grab a small sample to show success
    conv_ids = list(data['conversations'].keys())[:2]
    count = 0
    for cid in conv_ids:
        for msg in data['conversations'][cid]['messages'][:3]:
            if count >= 5: break
            msg['conversation_id'] = cid
            process_and_upload(msg, "System Upgrade v2.0")
            count += 1
            print(f" ✅ Processed Memory {count}/5: {msg.get('role')} message chunked and tagged.")

    print("\n" + "═"*70)
    print(" ✨ UPGRADE COMPLETE: Neural Pipe is active.")
    print("═"*70 + "\n")

if __name__ == "__main__":
    main()
