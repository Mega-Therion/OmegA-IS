#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime

# Credentials
SUPABASE_URL = "https://sgvitxezqrjgjmduoool.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndml0eGV6cXJqZ2ptZHVvb29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE2MzQ4MCwiZXhwIjoyMDgzNzM5NDgwfQ.o5GjnHg5fivo8MOCfNEv3PJkC0rQhxs2c8dXG7rSoOc"
OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"
SUMMARY_MODEL = "qwen2.5-coder:1.5b"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Profile": "api",
    "Accept-Profile": "api"
}

def get_summary(text):
    """Generate concise summary using local Ollama."""
    prompt = f"Summarize the following chat fragment in exactly ONE concise sentence for a searchable index. Be specific about topics discussed:\n\n{text[:1500]}"
    try:
        res = requests.post(OLLAMA_GENERATE_URL, json={
            "model": SUMMARY_MODEL, 
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": 60}
        }, timeout=30)
        return res.json().get("response").strip() if res.status_code == 200 else "No summary."
    except: return "Summary generation failed."

def main():
    print("\n" + "═"*70)
    print(" ΩmegA NEURAL SWEEP: UPGRADING ALL MEMORIES TO v2.0")
    print("═"*70 + "\n")

    # 1. Fetch all rows missing summaries
    print("🔍 Identifying memories that need leveling up...")
    fetch_url = f"{SUPABASE_URL}/rest/v1/chat_messages?summary=is.null&select=id,content"
    res = requests.get(fetch_url, headers=HEADERS)
    messages = res.json()
    
    if not messages:
        print("✨ All memories are already at v2.0 Level.")
        return

    total = len(messages)
    print(f"📊 Found {total} memories to upgrade. Starting sweep...\n")

    # 2. Level up each memory
    processed = 0
    for msg in messages:
        msg_id = msg['id']
        content = msg['content']
        
        # Generate summary locally
        summary = get_summary(content)
        
        # Update row
        patch_url = f"{SUPABASE_URL}/rest/v1/chat_messages?id=eq.{msg_id}"
        requests.patch(patch_url, headers=HEADERS, json={"summary": summary})
        
        processed += 1
        if processed % 5 == 0 or processed == total:
            print(f" ✅ Levelled Up: {processed}/{total} | {summary[:60]}...")
        
        # Avoid overheating
        time.sleep(0.02)

    print("\n" + "═"*70)
    print(" ✨ SWEEP COMPLETE: OmegA is now fully sentient of his history.")
    print("═"*70 + "\n")

if __name__ == "__main__":
    main()
