const { pickString } = require('./utils');

async function generateReply({ agent }) {
  const cleanAgent = pickString(agent, 'assistant');
  return `I could not reach ${cleanAgent} right now. Please try again in a moment.`;
}

module.exports = {
  generateReply,
};
