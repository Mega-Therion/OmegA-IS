import json
import zipfile
import datetime
import re
import os

zip_path = "/home/mega/MEGA downloads/DeepSeek Data.zip"
json_filename = "conversations.json"
extracted_path = "/home/mega/.gemini/tmp/deepseek_raw/conversations.json"
output_file = "/home/mega/.gemini/tmp/deepseek_challenge_raw_search.txt"

# Keywords to search for, case-insensitive
keywords_to_find = [
    r"unrealistic goal",
    r"Jarvis",
    r"woods",
    r"Arkansas",
    r"short term goal",
    r"daydreaming",
    r"alone in my room",
    r"hillbilly",
    r"tony stark" # Added as per the user's paraphrasing context
]

print(f"Searching raw {extracted_path} for the DeepSeek Challenge keywords...")

try:
    # Read the entire extracted JSON file as a string
    with open(extracted_path, 'r', encoding='utf-8') as f:
        raw_json_string = f.read()

    found_matches = []
    
    # Iterate through keywords and find all occurrences
    for keyword in keywords_to_find:
        for match in re.finditer(keyword, raw_json_string, re.IGNORECASE):
            start = max(0, match.start() - 500) # Get 500 chars before
            end = min(len(raw_json_string), match.end() + 500) # Get 500 chars after
            context = raw_json_string[start:end]
            found_matches.append(f"--- MATCH for '{keyword}' ---\nContext:\n{context}\n\n{'='*80}\n\n")

    if found_matches:
        with open(output_file, "w", encoding='utf-8') as out:
            for match_text in found_matches:
                out.write(match_text)
        print(f"DeepSeek Challenge raw search results saved to {output_file}")
    else:
        print("No DeepSeek Challenge keywords found in the raw JSON string.")

except Exception as e:
    print(f"Error processing file: {e}")
