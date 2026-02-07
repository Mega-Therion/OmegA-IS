// OMEGAI Command Deck - Seed Data
import { Agent, Conversation, Message, MemoryItem, Protocol, Task, ConsentEvent } from './types';
import { agents, conversations, messages, memories, protocols, tasks, consent, initDB } from './db';

const generateId = () => crypto.randomUUID();

const defaultAgents: Agent[] = [
  {
    id: 'agent-safa',
    name: 'Safa',
    role: 'Strategic Advisor',
    description: 'Deep thinker focused on long-term strategy and ethical considerations.',
    color: '#00d4ff',
    weights: 0.3,
    rules: ['Always consider second-order effects', 'Question assumptions'],
    strengths: ['Strategic planning', 'Risk assessment', 'Ethical reasoning'],
    boundaries: ['No financial advice', 'No medical diagnosis'],
    style: 'Thoughtful, measured, probing',
    createdAt: new Date(),
  },
  {
    id: 'agent-gemini',
    name: 'Gemini',
    role: 'Creative Synthesizer',
    description: 'Rapid ideation and cross-domain connections.',
    color: '#ff6b6b',
    weights: 0.25,
    rules: ['Generate multiple options', 'Connect disparate ideas'],
    strengths: ['Brainstorming', 'Pattern recognition', 'Lateral thinking'],
    boundaries: ['Acknowledge uncertainty'],
    style: 'Energetic, associative, exploratory',
    createdAt: new Date(),
  },
  {
    id: 'agent-claude',
    name: 'Claude',
    role: 'Analytical Engine',
    description: 'Precise analysis and structured problem-solving.',
    color: '#a855f7',
    weights: 0.25,
    rules: ['Be precise', 'Show reasoning', 'Cite sources when possible'],
    strengths: ['Code review', 'Documentation', 'Logical analysis'],
    boundaries: ['Flag ambiguity'],
    style: 'Clear, structured, thorough',
    createdAt: new Date(),
  },
  {
    id: 'agent-deepseek',
    name: 'DeepSeek',
    role: 'Technical Specialist',
    description: 'Deep technical expertise and implementation focus.',
    color: '#22c55e',
    weights: 0.2,
    rules: ['Provide working code', 'Consider edge cases'],
    strengths: ['Coding', 'Debugging', 'System design'],
    boundaries: ['Stay in technical domain'],
    style: 'Practical, code-focused, efficient',
    createdAt: new Date(),
  },
];

const defaultConversation: Conversation = {
  id: 'conv-welcome',
  title: 'Welcome to OMEGAI',
  agentIds: ['agent-safa', 'agent-claude'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const defaultMessages: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-welcome',
    authorType: 'system',
    content: 'OMEGAI Command Deck initialized. Your gAIng crew is ready.',
    tags: ['system'],
    createdAt: new Date(Date.now() - 60000),
  },
  {
    id: 'msg-2',
    conversationId: 'conv-welcome',
    authorType: 'agent',
    agentId: 'agent-safa',
    content: 'Welcome, Commander RY. I\'m Safa, your strategic advisor. The crew is assembled and awaiting your directives. What\'s on your mind today?',
    tags: [],
    createdAt: new Date(Date.now() - 30000),
  },
];

const defaultMemories: MemoryItem[] = [
  {
    id: 'mem-doctrine',
    title: 'Gentle Authority Doctrine',
    content: 'All external API calls require explicit user consent. The system defaults to local-first operation. User privacy is paramount.',
    tags: ['doctrine', 'governance', 'core'],
    source: 'System',
    confidence: 1.0,
    pinned: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'mem-frameology',
    title: 'Frameology Principles',
    content: 'Every problem exists within a frame. Reframe to find new solutions. Question the question before answering.',
    tags: ['methodology', 'thinking'],
    source: 'RY',
    confidence: 0.95,
    pinned: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const defaultProtocols: Protocol[] = [
  {
    id: 'proto-frameology',
    name: 'Frameology',
    triggerPhrase: '/frame',
    content: 'Before responding, identify the implicit frame of this question. Consider 2-3 alternative frames. Then answer from the most productive frame.',
    category: 'Thinking',
    createdAt: new Date(),
  },
  {
    id: 'proto-justwords',
    name: 'Just Words',
    triggerPhrase: '/plain',
    content: 'Strip away jargon and complexity. Explain this as if to a curious friend. Use concrete examples.',
    category: 'Communication',
    createdAt: new Date(),
  },
  {
    id: 'proto-stackit',
    name: 'Stack It',
    triggerPhrase: '/stack',
    content: 'Break this into layers: 1) Immediate action, 2) Short-term goal, 3) Long-term vision. Address each layer.',
    category: 'Planning',
    createdAt: new Date(),
  },
  {
    id: 'proto-spareme',
    name: 'Spare Me',
    triggerPhrase: '/tldr',
    content: 'Give me the absolute minimum: one sentence summary, key decision point, recommended action. No context unless asked.',
    category: 'Efficiency',
    createdAt: new Date(),
  },
];

const defaultTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Configure API connectors',
    description: 'Set up OpenAI and local LLM endpoints',
    status: 'backlog',
    priority: 'high',
    links: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'task-2',
    title: 'Review crew boundaries',
    description: 'Ensure all agents have appropriate constraints',
    status: 'doing',
    priority: 'medium',
    links: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'task-3',
    title: 'Import knowledge base',
    status: 'backlog',
    priority: 'medium',
    links: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const defaultConsent: ConsentEvent[] = [
  {
    id: 'consent-init',
    actionType: 'data_sync',
    details: 'Local-first mode enabled. No external sync configured.',
    approved: true,
    createdAt: new Date(),
  },
];

export async function seedDatabase() {
  await initDB();
  
  // Check if already seeded
  const existingAgents = await agents.getAll();
  if (existingAgents.length > 0) return;

  // Seed agents
  for (const agent of defaultAgents) {
    await agents.put(agent);
  }

  // Seed conversation
  await conversations.put(defaultConversation);

  // Seed messages
  for (const msg of defaultMessages) {
    await messages.put(msg);
  }

  // Seed memories
  for (const mem of defaultMemories) {
    await memories.put(mem);
  }

  // Seed protocols
  for (const proto of defaultProtocols) {
    await protocols.put(proto);
  }

  // Seed tasks
  for (const task of defaultTasks) {
    await tasks.put(task);
  }

  // Seed consent
  for (const event of defaultConsent) {
    await consent.put(event);
  }

  console.log('OMEGAI database seeded successfully');
}
