# OMEGA Brain Alexa Skill

Voice interface for interacting with your OmegAI Brain via Amazon Echo devices.

## Features

- **Voice Chat**: "Alexa, ask Omega Brain what is the status of my project"
- **System Status**: "Alexa, ask Omega Brain for status"
- **Mission Updates**: "Alexa, ask Omega Brain about my missions"
- **Agent Switching**: "Alexa, ask Omega Brain to talk to Claude"

## Setup

### Prerequisites

1. [Amazon Developer Account](https://developer.amazon.com/)
2. [AWS Account](https://aws.amazon.com/) (for Lambda)
3. [ASK CLI](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html)
4. gAIng-Brain server running and accessible from the internet

### Installation

1. **Install ASK CLI**
   ```bash
   npm install -g ask-cli
   ask configure
   ```

2. **Deploy the Skill**
   ```bash
   cd alexa-skill
   ask deploy
   ```

3. **Configure Environment**
   
   In AWS Lambda console, set environment variables:
   - `OMEGA_API_URL`: Your gAIng-Brain API URL (must be HTTPS)
   - `OMEGA_AGENT`: Default agent (gemini, claude, codex, grok)
   - `OMEGA_API_TOKEN`: Supabase auth token for protected endpoints

4. **Enable the Skill**
   - Go to [Alexa App](https://alexa.amazon.com)
   - Find "Omega Brain" in Your Skills
   - Enable it

## Usage

### Invocation
- "Alexa, open Omega Brain"
- "Alexa, ask Omega Brain..."

### Sample Utterances

| Intent | Phrases |
|--------|---------|
| Chat | "ask about project status", "what is machine learning", "help me plan my day" |
| Status | "status", "how are you", "is everything working" |
| Missions | "what are my missions", "mission status", "list missions" |
| Agents | "talk to Claude", "switch to Grok", "use Codex" |

### Example Conversations

```
User: "Alexa, open Omega Brain"
Alexa: "Welcome to Omega Brain! I'm connected to your OmegAI collective..."

User: "Ask about the current development phase"
Alexa: "According to Gemini, the current phase is..."

User: "Talk to Claude"
Alexa: "Switching to Claude. What would you like to ask Claude?"

User: "Analyze the project architecture"
Alexa: "Claude says: The architecture follows a..."
```

## Project Structure

```
alexa-skill/
├── lambda/
│   └── index.js          # Lambda handler
├── model/
│   └── en-US.json        # Interaction model
├── skill.json            # Skill manifest
├── package.json
└── README.md
```

## API Requirements

Your gAIng-Brain API must support:

| Endpoint | Method | Description |
|----------|--------|-------------|
| /llm/chat | POST | Chat with agents (requires bearer token) |
| /health | GET | System status |
| /missions | GET | List missions |

The API must be accessible via HTTPS for Alexa to connect.

## Testing

### Local Testing
```bash
npm test
```

### Alexa Simulator
1. Go to [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Select your skill
3. Go to "Test" tab
4. Type or speak commands

## Troubleshooting

### "I'm having trouble connecting"
- Ensure gAIng-Brain server is running
- Check API URL is HTTPS
- Verify API is publicly accessible

### Skill not responding
- Check Lambda logs in AWS CloudWatch
- Verify environment variables are set
- Test API endpoints directly

### Timeouts
- Alexa has an 8-second timeout
- Ensure your API responds quickly
- Consider caching frequent responses

## Security

- Never commit real API keys
- Use environment variables for secrets
- Enable HTTPS for API endpoints
- Restrict Lambda execution role

## License

MIT
