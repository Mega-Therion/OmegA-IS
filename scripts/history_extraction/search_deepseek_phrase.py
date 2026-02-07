import json
import zipfile
import datetime
import re
import os

zip_path = "/home/mega/MEGA downloads/DeepSeek Data.zip"
json_filename = "conversations.json"
extracted_path = "/home/mega/.gemini/tmp/deepseek_raw/conversations.json"
output_file = "/home/mega/.gemini/tmp/deepseek_actual_challenge_phrase.txt"

# The user's specific phrase to find, case-insensitive
phrase_to_find = r"wait till you see what happens now"

print(f"Searching raw {extracted_path} for the exact phrase: '{phrase_to_find}'...")

try:
    # Read the entire extracted JSON file as a string
    with open(extracted_path, 'r', encoding='utf-8') as f:
        raw_json_string = f.read()

    found_matches = []
    
    # Iterate through keywords and find all occurrences
    for match in re.finditer(phrase_to_find, raw_json_string, re.IGNORECASE):
        start = max(0, match.start() - 1500) # Get more context around the phrase
        end = min(len(raw_json_string), match.end() + 1500) # Get more context around the phrase
        context = raw_json_string[start:end]
        found_matches.append(f"--- MATCH for '{phrase_to_find}' ---\nContext:\n{context}\n\n{'='*80}\n\n")

    if found_matches:
        with open(output_file, "w", encoding='utf-8') as out:
            for match_text in found_matches:
                out.write(match_text)
        print(f"DeepSeek Challenge phrase search results saved to {output_file}")
    else:
        print(f"The phrase '{phrase_to_find}' was not found in the raw JSON string.")

except Exception as e:
    print(f"Error processing file: {e}")
