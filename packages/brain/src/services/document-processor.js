const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const llm = require('./llm-enhanced');

async function parsePdf(buffer) {
  const data = await pdfParse(buffer);
  return { text: data.text, metadata: data.info || {} };
}

async function ocrImage(buffer) {
  const result = await Tesseract.recognize(buffer, 'eng');
  return { text: result.data.text };
}

async function summarizeText(text, options = {}) {
  const status = llm.getLlmStatus();
  if (!status.ready) {
    return { summary: text.slice(0, 1000), notice: 'LLM not configured; returning truncated text.' };
  }

  const response = await llm.callLlm({
    provider: options.provider,
    messages: [{
      role: 'user',
      content: `Summarize the following document:\n${text}`,
    }],
    temperature: 0.2,
    maxTokens: 600,
  });

  return { summary: response?.choices?.[0]?.message?.content || '' };
}

async function answerQuestion(text, question, options = {}) {
  const status = llm.getLlmStatus();
  if (!status.ready) {
    return { answer: 'LLM not configured; cannot answer question.' };
  }

  const response = await llm.callLlm({
    provider: options.provider,
    messages: [{
      role: 'user',
      content: `Answer the question using the document context.\nQuestion: ${question}\nDocument:\n${text}`,
    }],
    temperature: 0.2,
    maxTokens: 500,
  });

  return { answer: response?.choices?.[0]?.message?.content || '' };
}

module.exports = {
  parsePdf,
  ocrImage,
  summarizeText,
  answerQuestion,
};
