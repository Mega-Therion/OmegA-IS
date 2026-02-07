#!/usr/bin/env python3
import json
import requests
from datetime import datetime

# Your Supabase credentials
SUPABASE_URL = "https://sgvitxezqrjgjmduoool.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndml0eGV6cXJqZ2ptZHVvb29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE2MzQ4MCwiZXhwIjoyMDgzNzM5NDgwfQ.o5GjnHg5fivo8MOCfNEv3PJkC0rQhxs2c8dXG7rSoOc"

# Load chat history
HISTORY_FILE = "/home/mega/MEGA downloads/OmegA Exports script/full_chat_history.json"

def main():
    print("\n" + "="*70)
    print("UPLOADING CHAT HISTORY TO SUPABASE")
    print("="*70 + "\n")

    # Load the JSON data
    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✅ Loaded chat history ({len(data['conversations'])} conversations)")
    except Exception as e:
        print(f"❌ Failed to load chat history: {e}")
        return

    # Extract all messages
    all_messages = []
    now = datetime.now().isoformat()
    for conv_id, conv_data in data['conversations'].items():
        for msg in conv_data['messages']:
            all_messages.append({
                'conversation_id': conv_id,
                'role': str(msg.get('role', 'Unknown')),
                'content': str(msg.get('content', '')),
                'source_file': str(msg.get('source_file', '')),
                'created_at': now,
                'message_at': now
            })

    print(f"📊 Total messages to upload: {len(all_messages)}\n")

    # REST API endpoint (api schema)
    rest_url = f"{SUPABASE_URL}/rest/v1/chat_messages"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
        "Content-Profile": "api",
        "Accept-Profile": "api"
    }

    # Upload in batches
    batch_size = 50
    uploaded = 0
    failed = 0

    try:
        for i in range(0, len(all_messages), batch_size):
            batch = all_messages[i:i+batch_size]

            try:
                response = requests.post(
                    rest_url,
                    json=batch,
                    headers=headers,
                    timeout=10
                )

                if response.status_code in [200, 201]:
                    uploaded += len(batch)
                    print(f"✅ Uploaded {uploaded}/{len(all_messages)} messages")
                else:
                    failed += len(batch)
                    print(f"⚠️  Response {response.status_code}: {response.text[:200]}")

            except Exception as e:
                failed += len(batch)
                print(f"⚠️  Error uploading batch: {e}")

        print(f"\n" + "="*70)
        print(f"✅ UPLOAD COMPLETE!")
        print(f"   Uploaded: {uploaded} messages")
        print(f"   Failed: {failed} messages")
        print(f"="*70)

        if uploaded > 0:
            print(f"\n✨ Success! Your chat history is now searchable in Supabase!")

    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return

if __name__ == "__main__":
    main()
