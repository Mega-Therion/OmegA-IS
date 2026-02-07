import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function processConversations() {
  const inputPath = path.join(__dirname, 'client/public/conversations.json');
  const outputPath = path.join(__dirname, 'client/public/conversations-processed.json');

  const rawData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  const processed = rawData.map((conv, index) => {
    const mapping = conv.mapping || {};
    const messages = [];

    // Extract messages from mapping
    Object.values(mapping).forEach((node) => {
      if (node.message && node.message.content && node.message.content.parts) {
        const role = node.message.author?.role || 'unknown';
        const parts = node.message.content.parts;
        let text = '';

        parts.forEach((part) => {
          if (typeof part === 'string') {
            text += part;
          } else if (typeof part === 'object') {
            // Skip non-text parts
          }
        });

        if (text.trim()) {
          messages.push({
            role,
            text: text.trim(),
            timestamp: node.message.create_time || 0,
          });
        }
      }
    });

    // Sort messages by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    return {
      id: conv.conversation_id || `conv-${index}`,
      title: conv.title || `Conversation ${index + 1}`,
      createdAt: conv.create_time || 0,
      updatedAt: conv.update_time || 0,
      messageCount: messages.length,
      messages,
      preview: messages.length > 0 ? messages[0].text.substring(0, 100) : 'No messages',
    };
  });

  // Sort by creation time (newest first)
  processed.sort((a, b) => b.createdAt - a.createdAt);

  fs.writeFileSync(outputPath, JSON.stringify(processed, null, 2));
  console.log(`Processed ${processed.length} conversations`);
  console.log(`Output saved to ${outputPath}`);
}

processConversations();
