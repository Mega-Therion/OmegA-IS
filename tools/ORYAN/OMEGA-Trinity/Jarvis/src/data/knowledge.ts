export interface KnowledgeDocument {
  id: string
  title: string
  content: string
  tags: string[]
}

export const knowledgeBase: KnowledgeDocument[] = [
  {
    id: 'kb-1',
    title: 'Neuro-Link Core Systems',
    content:
      'The Neuro-Link core orchestrates multimodal streams, aligning input channels with adaptive memory layers. It prioritizes low-latency context retrieval and proactive safety gating.',
    tags: ['core', 'neuro-link', 'systems']
  },
  {
    id: 'kb-2',
    title: 'Memory Weaving Protocol',
    content:
      'Memory weaving blends short-term conversational state with long-term recall. Key signals include intent, sentiment, task-critical entities, and user preferences.',
    tags: ['memory', 'state', 'preferences']
  },
  {
    id: 'kb-3',
    title: 'Retrieval-Augmented Generation (RAG)',
    content:
      'RAG pipelines surface high-signal documents using vector similarity, then ground responses by summarizing and citing retrieved context. Compression layers reduce token footprint while preserving facts.',
    tags: ['rag', 'retrieval', 'grounding']
  },
  {
    id: 'kb-4',
    title: 'Optimization Layer',
    content:
      'Adaptive optimization monitors performance metrics, adjusting compute intensity, rendering complexity, and memory compaction to maintain target responsiveness.',
    tags: ['optimization', 'performance']
  },
  {
    id: 'kb-5',
    title: 'Agent Orchestration',
    content:
      'Agent orchestration routes tasks to specialized tools with stateful coordination. Key components include task graphs, priority queues, and resilience fallbacks.',
    tags: ['agents', 'orchestration', 'tools']
  }
]
