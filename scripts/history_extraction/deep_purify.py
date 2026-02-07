#!/usr/bin/env python3
import requests
import json
import time
import ast

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
    prompt = f"Summarize this in one short sentence: {text[:1000]}"
    try:
        res = requests.post(OLLAMA_GEN_URL, json={"model": SUMMARY_MODEL, "prompt": prompt, "stream": False, "options": {"num_predict": 50}}, timeout=30)
        return res.json().get("response").strip() if res.status_code == 200 else ""
    except: return ""

def extract_text(raw_content):
    if not raw_content: return ""
    try:
        # Handle the specific Python-dict-string format from exports
        if raw_content.startswith('{') and "'parts':" in raw_content:
            data = ast.literal_eval(raw_content)
            if isinstance(data, dict):
                parts = data.get('content', {}).get('parts', [])
                if parts: return " ".join([str(p) for p in parts if p])
    except: pass
    return raw_content

def main():
    print("🚀 Starting Deep Purification of corrupted records...")
    
    # Fetch only unpurified records
    res = requests.get(f"{SUPABASE_URL}/rest/v1/chat_messages?content=like.*%7B%27id%27%3A*%7D*&select=id,content", headers=HEADERS)
    if res.status_code != 200:
        print(f"Error fetching: {res.text}")
        return

    messages = res.json()
    total = len(messages)
    print(f"📊 Processing {total} records...")

    for i, msg in enumerate(messages):
        msg_id = msg['id']
        clean_text = extract_text(msg['content'])
        
        # Don't update if it's still look like JSON (potential failure)
        if clean_text.startswith('{') and "'id':" in clean_text:
            continue

        summary = get_summary(clean_text)
        vector = get_embedding(clean_text)
        
        if vector:
            payload = {"content": clean_text, "summary": summary, "embedding": vector}
            requests.patch(f"{SUPABASE_URL}/rest/v1/chat_messages?id=eq.{msg_id}", headers=HEADERS, json=payload)
            
            if (i+1) % 10 == 0 or (i+1) == total:
                print(f" ✅ {i+1}/{total} purified...")

    print("✨ Deep Purification complete.")

if __name__ == "__main__":
    main()
