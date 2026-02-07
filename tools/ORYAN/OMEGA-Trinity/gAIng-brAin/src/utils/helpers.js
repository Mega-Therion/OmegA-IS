function toLimit(value, fallback = 50, max = 200) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function sanitizeString(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function isValidAgentName(name) {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 100 && /^[\w\-. ]+$/.test(trimmed);
}

function isValidIntent(intent) {
  const validIntents = ['instruction', 'task', 'report', 'ack', 'query', 'broadcast', 'status', 'error'];
  return typeof intent === 'string' && validIntents.includes(intent.trim().toLowerCase());
}

function isValidUUID(id) {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function isLocalRequest(req) {
  const ip = req.ip || '';
  return ip === '127.0.0.1' || ip === '::1' || ip.endsWith('127.0.0.1');
}

function normalizeChatRequest(body) {
  if (!body || !Array.isArray(body.messages)) {
    return { error: 'messages array is required' };
  }

  const messages = body.messages.map((msg) => ({
    role: String(msg.role || '').trim(),
    content: String(msg.content || '').trim(),
  }));

  if (messages.some((msg) => !msg.role || !msg.content)) {
    return { error: 'each message must include role and content' };
  }

  const temperature = body.temperature;
  if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 2)) {
    return { error: 'temperature must be a number between 0 and 2' };
  }

  const maxTokens = body.max_tokens;
  if (maxTokens !== undefined && (!Number.isInteger(maxTokens) || maxTokens <= 0)) {
    return { error: 'max_tokens must be a positive integer' };
  }

  return {
    messages,
    model: body.model,
    temperature,
    maxTokens,
  };
}

module.exports = {
  toLimit,
  sanitizeString,
  isValidAgentName,
  isValidIntent,
  isValidUUID,
  isLocalRequest,
  normalizeChatRequest
};
