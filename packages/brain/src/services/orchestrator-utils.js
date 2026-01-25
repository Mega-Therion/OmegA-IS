const OpenAI = require('openai');
const llm = require('./llm-enhanced');
const config = require('../config/env');

function getOpenAIClient() {
  if (!config.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: config.OPENAI_API_KEY,
    baseURL: config.OPENAI_BASE_URL,
  });
}

function heuristicRouteAgent(content, agents = []) {
  const lower = (content || '').toLowerCase();
  for (const agent of agents) {
    const strengths = agent.strengths || [];
    for (const strength of strengths) {
      if (lower.includes(String(strength).toLowerCase())) {
        return agent.id || agent.name || '';
      }
    }
  }
  return agents[0]?.id || agents[0]?.name || '';
}

async function routeAgent(content, agents) {
  const status = llm.getLlmStatus();
  if (!status.ready || !agents?.length) {
    return heuristicRouteAgent(content, agents);
  }

  const prompt = `Pick the best agent id for this request. Return ONLY the id.\nRequest: ${content}\nAgents: ${JSON.stringify(agents)}`;
  const response = await llm.callLlm({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    maxTokens: 50,
  });
  return response?.choices?.[0]?.message?.content?.trim() || heuristicRouteAgent(content, agents);
}

async function generateTitle(content) {
  const status = llm.getLlmStatus();
  if (!status.ready) {
    return content.split(' ').slice(0, 5).join(' ') || 'New Chat';
  }
  const prompt = `Generate a short 4-6 word title for this message: ${content}`;
  const response = await llm.callLlm({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    maxTokens: 60,
  });
  return response?.choices?.[0]?.message?.content?.trim() || 'New Chat';
}

async function generateEmbeddings(texts) {
  const client = getOpenAIClient();
  if (!client) {
    return texts.map(() => []);
  }
  const model = process.env.OMEGA_EMBED_MODEL || 'text-embedding-3-small';
  const response = await client.embeddings.create({
    model,
    input: texts,
  });
  return response.data.map(item => item.embedding);
}

module.exports = {
  routeAgent,
  generateTitle,
  generateEmbeddings,
};
