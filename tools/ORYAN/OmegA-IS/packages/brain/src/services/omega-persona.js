const fs = require('fs');
const path = require('path');

const DEFAULT_PERSONA_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'bridge',
  'OmegA_Persona.md'
);

let cachedPersona = null;
let loggedMissing = false;

function loadPersona() {
  if (process.env.OMEGA_PERSONA_ENABLED === '0') return '';

  const personaPath = process.env.OMEGA_PERSONA_PATH || DEFAULT_PERSONA_PATH;
  try {
    const content = fs.readFileSync(personaPath, 'utf8').trim();
    return content;
  } catch (err) {
    if (!loggedMissing) {
      loggedMissing = true;
      console.warn(`[OmegA Persona] Unable to load persona from ${personaPath}: ${err.message}`);
    }
    return '';
  }
}

function getOmegaPersona() {
  if (cachedPersona === null) {
    cachedPersona = loadPersona();
  }
  return cachedPersona;
}

function buildOmegaMessages(messages) {
  const persona = getOmegaPersona();
  if (!persona) return messages;
  return [{ role: 'system', content: persona }, ...messages];
}

module.exports = {
  getOmegaPersona,
  buildOmegaMessages
};
