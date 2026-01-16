# Safa iOS Shortcut Setup

Talk to the gAIng from your iPhone using Siri or the Shortcuts app.

## Quick Setup

### 1. Create the Shortcut

1. Open the **Shortcuts** app on your iPhone
2. Tap **+** to create a new shortcut
3. Add these actions in order:

---

**Action 1: Dictate Text** (or "Ask for Input" if you prefer typing)
- Tap "Add Action"
- Search for "Dictate Text"
- This captures your voice command

---

**Action 2: Get Contents of URL**
- Tap "Add Action"
- Search for "Get Contents of URL"
- URL: `https://YOUR_NGROK_URL/safa/intake`
- Method: `POST`
- Headers:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer YOUR_TOKEN`
- Request Body: JSON
  ```json
  {
    "message": [Dictated Text],
    "priority": "medium"
  }
  ```

---

**Action 3: Get Dictionary Value**
- Tap "Add Action"
- Search for "Get Dictionary Value"
- Key: `message`
- This extracts the response message

---

**Action 4: Show Result** (or "Speak Text" for voice feedback)
- Tap "Add Action"
- Search for "Show Result" or "Speak Text"
- Input: [Dictionary Value]

---

### 2. Configure the Shortcut

1. Tap the shortcut name at the top
2. Rename it to "Safa" or "Hey Safa"
3. Tap the info (i) button
4. Enable "Show in Share Sheet" (optional)
5. Add to Home Screen for quick access

### 3. Set Up Siri

1. Go to shortcut settings (info button)
2. Tap "Add to Siri"
3. Record a phrase like "Hey Safa" or "Talk to the gang"

---

## Example Shortcuts JSON

If you want to import a pre-made shortcut, here's the configuration:

```json
{
  "WFWorkflowName": "Safa",
  "WFWorkflowActions": [
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.dictatetext",
      "WFWorkflowActionParameters": {}
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.downloadurl",
      "WFWorkflowActionParameters": {
        "WFHTTPMethod": "POST",
        "WFHTTPHeaders": {
          "Content-Type": "application/json",
          "Authorization": "Bearer YOUR_TOKEN"
        },
        "WFHTTPBodyType": "Json",
        "WFJSONValues": {
          "message": {"WFValue": {"WFDictionaryFieldValue": {"Value": {"Variable": {"Type": "ExtensionInput"}}}}}
        },
        "WFURL": "https://YOUR_NGROK_URL/safa/intake"
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.getvalueforkey",
      "WFWorkflowActionParameters": {
        "WFDictionaryKey": "message"
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.speaktext",
      "WFWorkflowActionParameters": {}
    }
  ]
}
```

---

## Alternative: Text Input Version

If you prefer typing instead of voice:

1. Replace "Dictate Text" with "Ask for Input"
2. Set the prompt to "What do you need?"
3. Set input type to "Text"

---

## Priority Shortcuts

Create additional shortcuts for different priorities:

### "Urgent Safa"
Same as above, but change the JSON body to:
```json
{
  "message": [Dictated Text],
  "priority": "high"
}
```

### "Emergency Safa"
```json
{
  "message": [Dictated Text],
  "priority": "critical"
}
```

---

## Troubleshooting

### "Could not connect to server"
- Make sure ngrok is running: `npm run start:ngrok`
- Check the ngrok URL is correct in the shortcut
- Verify the brain server is running: `npm start`

### "Invalid token"
- Check your `GAING_SHARED_TOKEN` in `.env`
- Make sure the token in the shortcut matches

### Voice not transcribing
- Check your phone's microphone permissions for Shortcuts
- Try "Ask for Input" instead of "Dictate Text"

---

## Pro Tips

1. **Widget**: Add the shortcut to your home screen widget for one-tap access
2. **Apple Watch**: Shortcuts sync to Apple Watch - talk to Safa from your wrist
3. **Back Tap**: Go to Settings > Accessibility > Touch > Back Tap and assign Safa to double or triple tap
4. **CarPlay**: Use Siri while driving: "Hey Siri, Safa" + your command
