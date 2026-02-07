#!/usr/bin/env python3
"""
ΩmegA Hybrid Search Engine v2.1
===============================
Features: Semantic + Keyword + Temporal + Local Vector Caching.
"""

import requests
import json
import sqlite3
import os
from typing import List, Dict, Optional
from datetime import datetime, timedelta

# Credentials
SUPABASE_URL = "https://sgvitxezqrjgjmduoool.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndml0eGV6cXJqZ2ptZHVvb29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE2MzQ4MCwiZXhwIjoyMDgzNzM5NDgwfQ.o5GjnHg5fivo8MOCfNEv3PJkC0rQhxs2c8dXG7rSoOc"
OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBEDDING_MODEL = "nomic-embed-text"
CACHE_DB = os.path.expanduser("~/.omega_vector_cache.db")

class ChatHistorySearch:
    """The Intelligence Layer for OmegA's Memory with Performance Caching"""

    @staticmethod
    def _get_cache(text: str) -> Optional[List[float]]:
        """Retrieve vector from local SQLite cache."""
        try:
            with sqlite3.connect(CACHE_DB) as conn:
                cursor = conn.cursor()
                cursor.execute("CREATE TABLE IF NOT EXISTS vectors (text TEXT PRIMARY KEY, vector TEXT, created_at TIMESTAMP)")
                cursor.execute("SELECT vector FROM vectors WHERE text = ?", (text,))
                row = cursor.fetchone()
                if row:
                    return json.loads(row[0])
        except: pass
        return None

    @staticmethod
    def _set_cache(text: str, vector: List[float]):
        """Store vector in local cache."""
        try:
            with sqlite3.connect(CACHE_DB) as conn:
                cursor = conn.cursor()
                cursor.execute("INSERT OR REPLACE INTO vectors (text, vector, created_at) VALUES (?, ?, ?)",
                             (text, json.dumps(vector), datetime.now().isoformat()))
        except: pass

    @staticmethod
    def get_embedding(text: str) -> List[float]:
        """Generate 768-dim vector (with local caching)."""
        # 1. Try Cache
        cached = ChatHistorySearch._get_cache(text)
        if cached: return cached

        # 2. Call Ollama
        try:
            res = requests.post(OLLAMA_URL, json={"model": EMBEDDING_MODEL, "prompt": text}, timeout=10)
            if res.status_code == 200:
                vector = res.json().get("embedding")
                if vector:
                    ChatHistorySearch._set_cache(text, vector)
                    return vector
        except Exception as e:
            print(f"❌ Local Embedding Error: {e}")
        return None

    @staticmethod
    def hybrid_search(query: str, limit: int = 10) -> List[Dict]:
        embedding = ChatHistorySearch.get_embedding(query)
        if not embedding:
            return ChatHistorySearch.search_by_keyword(query, limit)

        rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/hybrid_search"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Accept-Profile": "api"
        }
        
        payload = {
            "query_text": query,
            "query_embedding": embedding,
            "match_count": limit,
            "keyword_weight": 0.2,
            "semantic_weight": 0.7,
            "recency_weight": 0.1
        }

        try:
            res = requests.post(rpc_url, headers=headers, json=payload)
            return res.json() if res.status_code == 200 else []
        except Exception as e:
            return []

    @staticmethod
    def search_by_keyword(keyword: str, limit: int = 20) -> List[Dict]:
        headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Profile": "api"}
        url = f"{SUPABASE_URL}/rest/v1/chat_messages?content=ilike.*{keyword}*&limit={limit}&select=*"
        try:
            response = requests.get(url, headers=headers)
            return response.json() if response.status_code == 200 else []
        except: return []

    @staticmethod
    def get_recent_messages(hours: int = 24, limit: int = 50) -> List[Dict]:
        cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()
        headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Profile": "api"}
        url = f"{SUPABASE_URL}/rest/v1/chat_messages?created_at=gte.{cutoff}&limit={limit}&order=created_at.desc&select=*"
        try:
            response = requests.get(url, headers=headers)
            return response.json() if response.status_code == 200 else []
        except: return []

if __name__ == "__main__":
    # Maintenance: Clear old cache (>30 days)
    try:
        with sqlite3.connect(CACHE_DB) as conn:
            conn.execute("DELETE FROM vectors WHERE created_at < datetime('now', '-30 days')")
    except: pass
