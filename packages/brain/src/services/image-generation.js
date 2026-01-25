const OpenAI = require('openai');
const config = require('../config/env');

function getOpenAIClient() {
  if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey: config.OPENAI_API_KEY });
}

async function generateImage(prompt, options = {}) {
  if (!prompt) {
    throw new Error('prompt is required');
  }
  const client = getOpenAIClient();
  const model = options.model || 'gpt-image-1';
  const size = options.size || '1024x1024';

  const response = await client.images.generate({
    model,
    prompt,
    size,
    response_format: 'b64_json',
  });

  const image = response.data?.[0];
  if (!image?.b64_json) {
    throw new Error('Image generation failed');
  }

  return {
    base64: image.b64_json,
    model,
    size,
  };
}

module.exports = {
  generateImage,
};
