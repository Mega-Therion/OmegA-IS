const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'rlhf');
const EXPERIMENTS_FILE = path.join(DATA_DIR, 'experiments.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const defaults = [
    [EXPERIMENTS_FILE, []],
    [FEEDBACK_FILE, []],
  ];

  for (const [file, value] of defaults) {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, JSON.stringify(value, null, 2));
    }
  }
}

async function readJson(file) {
  await ensureStore();
  const data = await fs.readFile(file, 'utf-8');
  return JSON.parse(data);
}

async function writeJson(file, data) {
  await ensureStore();
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

function stableBucket(experimentId, userId, variants) {
  const hash = crypto.createHash('sha256').update(`${experimentId}:${userId}`).digest('hex');
  const index = parseInt(hash.slice(0, 8), 16) % variants.length;
  return variants[index];
}

async function listExperiments() {
  return readJson(EXPERIMENTS_FILE);
}

async function createExperiment({ name, variants }) {
  if (!name || !variants || variants.length < 2) {
    throw new Error('name and at least two variants required');
  }
  const experiments = await readJson(EXPERIMENTS_FILE);
  const experiment = {
    id: crypto.randomUUID(),
    name,
    variants,
    created_at: new Date().toISOString(),
  };
  experiments.push(experiment);
  await writeJson(EXPERIMENTS_FILE, experiments);
  return experiment;
}

async function assignVariant({ experimentId, userId }) {
  const experiments = await readJson(EXPERIMENTS_FILE);
  const experiment = experiments.find(exp => exp.id === experimentId);
  if (!experiment) {
    throw new Error('Experiment not found');
  }
  const variant = stableBucket(experimentId, userId, experiment.variants);
  return { experiment, variant };
}

async function recordFeedback({ experimentId, userId, variant, score, metadata }) {
  const feedback = await readJson(FEEDBACK_FILE);
  const entry = {
    id: crypto.randomUUID(),
    experimentId,
    userId,
    variant,
    score,
    metadata: metadata || {},
    created_at: new Date().toISOString(),
  };
  feedback.push(entry);
  await writeJson(FEEDBACK_FILE, feedback);
  return entry;
}

async function feedbackSummary(experimentId) {
  const feedback = await readJson(FEEDBACK_FILE);
  const filtered = experimentId ? feedback.filter(f => f.experimentId === experimentId) : feedback;
  const summary = {};

  filtered.forEach(entry => {
    if (!summary[entry.variant]) {
      summary[entry.variant] = { count: 0, totalScore: 0 };
    }
    summary[entry.variant].count += 1;
    summary[entry.variant].totalScore += Number(entry.score || 0);
  });

  Object.values(summary).forEach((stats) => {
    stats.averageScore = stats.count ? stats.totalScore / stats.count : 0;
  });

  return summary;
}

module.exports = {
  listExperiments,
  createExperiment,
  assignVariant,
  recordFeedback,
  feedbackSummary,
};
