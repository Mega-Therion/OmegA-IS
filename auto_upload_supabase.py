#!/usr/bin/env python3
import json
import os
from supabase import create_client, Client

# Your Supabase credentials
SUPABASE_URL = "https://sgvitxezqrjgjmduoool.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndml0eGV6cXJqZ2ptZHVvb29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE2MzQ4MCwiZXhwIjoyMDgzNzM5NDgwfQ.o5GjnHg5fivo8MOCfNEv3PJkC0rQhxs2c8dXG7rSoOc"

# Load chat history
HISTORY_FILE = "/home/mega/MEGA downloads/OmegA Exports script/full_chat_history.json"

def main():
    print("\n" + "="*70)
    print("AUTOMATIC CHAT HISTORY UPLOAD TO SUPABASE")
    print("="*70 + "\n")

    # Initialize Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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
    for conv_id, conv_data in data['conversations'].items():
        for msg in conv_data['messages']:
            all_messages.append({
                'conversation_id': conv_id,
                'role': str(msg.get('role', 'Unknown')),
                'content': str(msg.get('content', '')),
                'source_file': str(msg.get('source_file', ''))
            })

    total_messages = len(all_messages)
    print(f"📊 Total messages to upload: {total_messages}\n")

    # Table name to try
    TABLE_NAME = "chat_messages" # Trying existing table first

    # Upload in batches
    batch_size = 50
    uploaded = 0
    failed = 0

    print(f"🚀 Starting upload to table: {TABLE_NAME}...")

    for i in range(0, total_messages, batch_size):
        batch = all_messages[i:i+batch_size]
        
        try:
            # Use the library instead of raw requests for better error handling
            data, count = supabase.table(TABLE_NAME).insert(batch).execute()
            uploaded += len(batch)
            print(f"✅ [{uploaded}/{total_messages}] messages uploaded successfully.")
        except Exception as e:
            print(f"⚠️  Failed to upload batch starting at {i}: {e}")
            failed += len(batch)
            
            # If we get a permission error on the first batch, stop and report
            if i == 0:
                print("\n🚨 PERMISSION DENIED. Trying to create a new table 'chat_history_automatic' in public schema...")
                # We can't create tables via the REST API client easily without SQL access
                # So we tell the user what they need to do once.
                print("Actually, I cannot create tables via the API. You must run one SQL command in Supabase first.")
                break

    print(f"\n" + "="*70)
    print(f"📊 FINAL STATUS")
    print(f"   Uploaded: {uploaded} messages")
    print(f"   Failed: {failed} messages")
    print("="*70)

if __name__ == "__main__":
    main()
