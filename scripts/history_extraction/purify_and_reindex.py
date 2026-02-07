#!/usr/bin/env python3
import requests
import json
import time
import ast
from datetime import datetime

# Credentials
SUPABASE_URL = "https://sgvitxezqrjgjmduoool.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndml0eGV6cXJqZ2ptZHVvb29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE2MzQ4MCwiZXhwIjoyMDgzNzM5NDgwfQ.o5GjnHg5fivo8MOCfNEv3PJkC0rQhxs2c8dXG7rSoOc"
OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
OLLAMA_GEN_URL = "http://localhost:11434/api/generate"
EMBED_MODEL = "nomic-embed-text"
SUMMARY_MODEL = "qwen2.5-coder:1.5b"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Content-Profile": "api",
    "Accept-Profile": "api"
}

def get_embedding(text):
    try:
        res = requests.post(OLLAMA_EMBED_URL, json={"model": EMBED_MODEL, "prompt": text}, timeout=30)
        return res.json().get("embedding") if res.status_code == 200 else None
    except: return None

def get_summary(text):
    prompt = f"Summarize this chat message in one concise sentence for a search index:\n\n{text[:1500]}"
    try:
        res = requests.post(OLLAMA_GEN_URL, json={"model": SUMMARY_MODEL, "prompt": prompt, "stream": False, "options": {"num_predict": 60}}, timeout=30)
        return res.json().get("response").strip() if res.status_code == 200 else ""
    except: return ""

def extract_text(raw_content):
    """Extract raw text from the complex string/dict structure."""
    if not raw_content: return ""
    
    # Check if it's already plain text (doesn't look like a Python dict)
    if not (raw_content.startswith('{') and 'parts' in raw_content):
        return raw_content

    try:
        # Convert string representation of dict to actual dict
        data = ast.literal_eval(raw_content)
        
        # Navigate the nested structure found in the exports
        if isinstance(data, dict):
            content_obj = data.get('content', {})
            if isinstance(content_obj, dict):
                parts = content_obj.get('parts', [])
                if parts and isinstance(parts, list):
                    return " ".join([str(p) for p in parts if p])
            elif isinstance(content_obj, str):
                return content_obj
    except Exception as e:
        pass
    
    return raw_content

def main():
    print("\n" + "═"*70)
    print(" ΩmegA DATABASE PURIFICATION & RE-INDEXING")
    print("═"*70 + "\n")

    # 1. Fetch rows
    print("🔍 Fetching records for purification...")
    res = requests.get(f"{SUPABASE_URL}/rest/v1/chat_messages?select=id,content", headers=HEADERS)
    messages = res.json()
    total = len(messages)
    print(f"📊 Found {total} records. Starting cleanup...")

    processed = 0
    for msg in messages:
        msg_id = msg['id']
        raw_content = msg['content']
        
        # Extract clean text
        clean_text = extract_text(raw_content)
        
        if not clean_text or clean_text == raw_content and raw_content.startswith('{'):
            # If extraction failed but it looks like JSON, skip or log
            pass

        # Generate new summary and embedding for the CLEAN text
        summary = get_summary(clean_text)
        vector = get_embedding(clean_text)
        
        if vector:
            # Update row with clean content, new summary, and fresh vector
            payload = {
                "content": clean_text,
                "summary": summary,
                "embedding": vector
            }
            requests.patch(f"{SUPABASE_URL}/rest/v1/chat_messages?id=eq.{msg_id}", headers=HEADERS, json=payload)
            
            processed += 1
            if processed % 50 == 0 or processed == total:
                print(f" ✅ Purified & Re-indexed: {processed}/{total}...")
        
        time.sleep(0.01)

    print("\n" + "═"*70)
    print(" ✨ DATABASE PURIFIED: OmegA's memory is now crystal clear.")
    print("═"*70 + "\n")

if __name__ == "__main__":
    main()
