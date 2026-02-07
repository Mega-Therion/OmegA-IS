# Telegram MCP Server

> Built for the **gAIng** - OMEGA Trinity

A comprehensive Model Context Protocol (MCP) server that enables AI agents to interact with Telegram via the Bot API.

## 🚀 Features

- **Send Messages** - Text, photos, documents to chats, groups, and channels
- **Receive Updates** - Long polling support for incoming messages
- **Manage Webhooks** - Set up push-based updates
- **Chat Management** - Get chat info, member counts
- **Message Operations** - Forward, edit, delete messages
- **Flexible Output** - JSON or Markdown response formats

## 📦 Installation

```bash
cd telegram-mcp-server
npm install
npm run build
```

## ⚙️ Configuration

Set your Telegram Bot Token as an environment variable:

```bash
export TELEGRAM_BOT_TOKEN="your-bot-token-here"
```

Or pass it directly in tool calls via the `bot_token` parameter.

### Getting a Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the HTTP API token provided

## 🏃 Running the Server

### stdio Mode (Default)

```bash
npm start
```

### HTTP Mode

```bash
TRANSPORT=http PORT=3000 npm start
```

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `telegram_send_message` | Send text messages |
| `telegram_get_updates` | Receive incoming updates |
| `telegram_get_me` | Get bot information |
| `telegram_get_chat` | Get chat details |
| `telegram_get_chat_member_count` | Count chat members |
| `telegram_forward_message` | Forward messages |
| `telegram_set_webhook` | Configure webhook |
| `telegram_delete_webhook` | Remove webhook |
| `telegram_get_webhook_info` | Check webhook status |
| `telegram_send_photo` | Send photos |
| `telegram_send_document` | Send files/documents |
| `telegram_delete_message` | Delete messages |
| `telegram_edit_message_text` | Edit message text |

## 📝 Usage Examples

### Send a Message

```json
{
  "tool": "telegram_send_message",
  "params": {
    "chat_id": 123456789,
    "text": "Hello from the gAIng! 🤖",
    "parse_mode": "Markdown"
  }
}
```

### Get Updates

```json
{
  "tool": "telegram_get_updates",
  "params": {
    "limit": 10,
    "timeout": 30
  }
}
```

### Set Up Webhook

```json
{
  "tool": "telegram_set_webhook",
  "params": {
    "url": "https://your-server.com/telegram/webhook",
    "secret_token": "your-secret"
  }
}
```

## 🔒 Security

- Store bot tokens in environment variables
- Use `secret_token` for webhook verification
- Validate all incoming webhook requests

## 🏗️ Architecture

```
telegram-mcp-server/
├── src/
│   ├── index.ts           # Main entry, tool registration
│   ├── types.ts           # TypeScript interfaces
│   ├── constants.ts       # Configuration constants
│   ├── services/
│   │   └── telegram-client.ts  # API client
│   └── schemas/
│       └── telegram.ts    # Zod validation schemas
├── package.json
├── tsconfig.json
└── README.md
```

## 🤝 Integration with gAIng

This MCP server is designed to integrate with the OMEGA Trinity ecosystem:

- **OxySpine** - Unified interface architecture
- **gAIng-brAin** - Collective memory system
- **CollectiveBrain** - DCBFT consensus

## 📄 License

MIT - Built with 💜 for the gAIng
