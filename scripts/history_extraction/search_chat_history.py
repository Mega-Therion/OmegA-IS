#!/usr/bin/env python3
"""
ΩmegA Chat History Search CLI v2.0
=================================
Command-line interface for the Hybrid Search Engine.
"""

import sys
import json
from supabase_chat_search import ChatHistorySearch

def format_message(msg: dict, include_meta: bool = True) -> str:
    """Standardized output for ΩmegA."""
    similarity = msg.get('similarity', 0)
    sim_str = f" [{similarity:.2f}]" if similarity else ""
    date_str = msg.get('created_at', 'Unknown Date')[:10]
    source = f"Source: {msg.get('source_file', 'Local')}"
    summary = msg.get('summary', 'No summary.')
    content = msg.get('content', '')[:300].replace('\n', ' ')
    
    output = f"[{date_str}]{sim_str} | {source}\n"
    output += f"  Summary: {summary}\n"
    output += f"  Snippet: {content}..."
    return output

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  search_chat_history.py hybrid <query> [limit]  # RECOMMENDED")
        print("  search_chat_history.py keyword <term> [limit]")
        print("  search_chat_history.py json <command> <args...>")
        print("  search_chat_history.py recent [hours] [limit]")
        sys.exit(1)

    command = sys.argv[1].lower()
    output_json = False

    if command == "json":
        output_json = True
        if len(sys.argv) < 3:
            sys.exit(1)
        command = sys.argv[2].lower()
        sys.argv = [sys.argv[0]] + sys.argv[2:]

    try:
        results = []
        if command == "hybrid":
            query = sys.argv[2]
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
            results = ChatHistorySearch.hybrid_search(query, limit)
        
        elif command == "keyword":
            term = sys.argv[2]
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 20
            results = ChatHistorySearch.search_by_keyword(term, limit)

        elif command == "recent":
            hours = int(sys.argv[2]) if len(sys.argv) > 2 else 24
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 50
            results = ChatHistorySearch.get_recent_messages(hours, limit)

        if output_json:
            print(json.dumps(results, indent=2))
        else:
            print(f"\n🔍 ΩmegA retrieved {len(results)} results for '{command}':\n")
            for msg in results:
                print(format_message(msg))
                print("-" * 60)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()