// OMEGAI Command Deck - Core Types

export interface User {
  id: string;
  displayName: string;
  createdAt: Date;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar?: string;
  color: string;
  weights: number;
  rules: string[];
  strengths: string[];
  boundaries: string[];
  style: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  title: string;
  agentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type MessageTag = 'hot thot' | 'Bside' | 'system' | 'pinned';

export interface Message {
  id: string;
  conversationId: string;
  authorType: 'user' | 'agent' | 'system';
  agentId?: string;
  content: string;
  tags: MessageTag[];
  createdAt: Date;
}

export interface MemoryItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source: string;
  confidence: number;
  pinned: boolean;
  embedding?: number[]; // 64-dimensional vector for semantic search
  createdAt: Date;
  updatedAt: Date;
}

export interface Protocol {
  id: string;
  name: string;
  triggerPhrase: string;
  content: string;
  category: string;
  createdAt: Date;
}

export type TaskStatus = 'backlog' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  links: {
    conversationId?: string;
    memoryId?: string;
    brainTaskId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentEvent {
  id: string;
  actionType: 'api_enable' | 'external_call' | 'data_sync' | 'key_store';
  details: string;
  approved: boolean;
  createdAt: Date;
}

export interface AppSettings {
  fourEyesMode: boolean;
  externalMode: boolean;
  theme: 'dark' | 'darker';
  apiKeys: {
    openai?: string;
    groq?: string;
    anthropic?: string;
    localEndpoint?: string;
  };
  orchestratorUrl?: string;
  orchestratorKey?: string;
  orchestratorUtilsEnabled?: boolean;
  brainBaseUrl?: string;
  brainToken?: string;
}

export type ModuleView = 'chat' | 'crew' | 'memory' | 'protocols' | 'tasks' | 'consent' | 'settings' | 'monitoring';
