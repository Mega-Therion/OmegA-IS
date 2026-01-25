const llm = require('./llm-enhanced');
const { analyzeJavaScript } = require('./code-analysis');

function heuristicReview(code) {
  const issues = [];
  const lines = code.split('\n');

  lines.forEach((line, idx) => {
    if (line.length > 140) {
      issues.push({
        severity: 'low',
        message: 'Line exceeds 140 characters',
        line: idx + 1,
      });
    }
    if (line.includes('console.log')) {
      issues.push({
        severity: 'low',
        message: 'Console logging left in code',
        line: idx + 1,
      });
    }
    if (line.includes('eval(')) {
      issues.push({
        severity: 'high',
        message: 'eval usage detected',
        line: idx + 1,
      });
    }
  });

  return issues;
}

async function reviewCode({ code, language = 'javascript', provider, guidance }) {
  const issues = heuristicReview(code);
  const analysis = language === 'javascript' ? analyzeJavaScript(code) : null;
  const status = llm.getLlmStatus();

  if (!status.ready) {
    return {
      issues,
      analysis,
      llmReview: null,
      notice: 'LLM not configured; returning heuristic review only.',
    };
  }

  const prompt = `
You are a senior code reviewer. Provide a concise review focusing on bugs, security risks, and maintainability.
Return JSON with keys: summary, findings (array of {severity, message, line}).
Guidance: ${guidance || 'Prefer actionable issues; avoid nitpicks.'}
Code:
${code}
`;

  const response = await llm.callLlm({
    provider,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    maxTokens: 800,
  });

  const content = response?.choices?.[0]?.message?.content || '';
  return {
    issues,
    analysis,
    llmReview: content,
  };
}

module.exports = {
  reviewCode,
};
