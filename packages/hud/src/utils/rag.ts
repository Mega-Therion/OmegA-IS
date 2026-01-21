import type { KnowledgeDocument } from '@/data/knowledge'

const tokenizer = /[a-z0-9']+/gi

export interface RagMatch {
  document: KnowledgeDocument
  score: number
  highlights: string[]
}

const buildVocabulary = (documents: KnowledgeDocument[]) => {
  const vocab = new Map<string, number>()
  documents.forEach((doc) => {
    const tokens = doc.content.toLowerCase().match(tokenizer) ?? []
    tokens.forEach((token) => {
      if (!vocab.has(token)) {
        vocab.set(token, vocab.size)
      }
    })
  })
  return vocab
}

const vectorize = (text: string, vocab: Map<string, number>) => {
  const vector = new Array(vocab.size).fill(0)
  const tokens = text.toLowerCase().match(tokenizer) ?? []
  tokens.forEach((token) => {
    const index = vocab.get(token)
    if (index !== undefined) {
      vector[index] += 1
    }
  })
  return vector
}

const cosineSimilarity = (a: number[], b: number[]) => {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

const highlight = (text: string, terms: string[]) => {
  const sentences = text.split('. ').map((sentence) => sentence.trim())
  return sentences
    .filter((sentence) => terms.some((term) => sentence.toLowerCase().includes(term)))
    .slice(0, 2)
}

export const retrieveContext = (query: string, documents: KnowledgeDocument[]): RagMatch[] => {
  const vocab = buildVocabulary(documents)
  const queryVector = vectorize(query, vocab)
  const queryTerms = query.toLowerCase().match(tokenizer) ?? []

  return documents
    .map((document) => {
      const documentVector = vectorize(document.content, vocab)
      const score = cosineSimilarity(queryVector, documentVector)
      return {
        document,
        score,
        highlights: highlight(document.content, queryTerms)
      }
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}
