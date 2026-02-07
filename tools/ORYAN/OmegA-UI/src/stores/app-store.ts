// OMEGAI Command Deck - Global App State
import { create } from 'zustand';
import { ModuleView, AppSettings, Agent, Conversation, Message, MemoryItem, Protocol, Task, ConsentEvent } from '@/lib/types';
import * as db from '@/lib/db';
import { generateEmbedding } from '@/lib/vector-search';
import {
  brainEnabled,
  fetchMemories,
  createMemory as createBrainMemory,
  updateMemory as updateBrainMemory,
  enqueueTask,
  completeTask,
} from '@/lib/brain-api';
import {
  getBrainBaseUrl,
  getBrainToken,
  getOrchestratorKey,
  getOrchestratorUrl,
  getUtilsEnabled,
  setBrainConfig,
  setOrchestratorConfig,
} from '@/lib/orchestrator-config';

const mapBrainMemoryToLocal = (
  memory: { id: string; content?: string; tags?: string[]; metadata?: Record<string, unknown>; created_at?: string; updated_at?: string },
  fallback?: Partial<MemoryItem>
): MemoryItem => {
  const metadata = memory.metadata || {};
  const title = typeof metadata.title === 'string'
    ? metadata.title
    : fallback?.title || (memory.content || '').split('\n')[0].slice(0, 64) || 'Untitled memory';
  const source = typeof metadata.source === 'string' ? metadata.source : fallback?.source || 'brain';
  const confidence = typeof metadata.confidence === 'number' ? metadata.confidence : fallback?.confidence ?? 0.5;
  const pinned = typeof metadata.pinned === 'boolean' ? metadata.pinned : fallback?.pinned || false;
  const createdAt = memory.created_at ? new Date(memory.created_at) : fallback?.createdAt || new Date();
  const updatedAt = memory.updated_at ? new Date(memory.updated_at) : fallback?.updatedAt || createdAt;
  return {
    id: memory.id,
    title,
    content: memory.content || fallback?.content || '',
    tags: Array.isArray(memory.tags) ? memory.tags : fallback?.tags || [],
    source,
    confidence,
    pinned,
    createdAt,
    updatedAt,
    embedding: Array.isArray((metadata as { embedding?: number[] }).embedding)
      ? (metadata as { embedding: number[] }).embedding
      : fallback?.embedding,
  };
};

const buildBrainMemoryPayload = (memory: MemoryItem) => ({
  content: memory.content,
  tags: memory.tags,
  metadata: {
    title: memory.title,
    source: memory.source,
    confidence: memory.confidence,
    pinned: memory.pinned,
  },
});

interface AppState {
  // UI State
  currentView: ModuleView;
  commandPaletteOpen: boolean;
  fourEyesMode: boolean;
  externalMode: boolean;
  sidebarCollapsed: boolean;
  
  // Data
  agents: Agent[];
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  memories: MemoryItem[];
  protocols: Protocol[];
  tasks: Task[];
  consentEvents: ConsentEvent[];
  settings: AppSettings;
  
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  setView: (view: ModuleView) => void;
  toggleCommandPalette: () => void;
  toggleFourEyesMode: () => void;
  toggleExternalMode: () => void;
  toggleSidebar: () => void;
  
  // Data actions
  loadData: () => Promise<void>;
  setCurrentConversation: (id: string | null) => void;
  addMessage: (message: Omit<Message, 'id' | 'createdAt'>) => Promise<Message>;
  createConversation: (title: string, agentIds: string[]) => Promise<Conversation>;
  updateConversation: (id: string, updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>) => Promise<void>;
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt'>) => Promise<Agent>;
  updateAgent: (agent: Agent) => Promise<void>;
  addMemory: (memory: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>) => Promise<MemoryItem>;
  updateMemory: (memory: MemoryItem) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  addProtocol: (protocol: Omit<Protocol, 'id' | 'createdAt'>) => Promise<Protocol>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  logConsent: (event: Omit<ConsentEvent, 'id' | 'createdAt'>) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial UI State
  currentView: 'chat',
  commandPaletteOpen: false,
  fourEyesMode: false,
  externalMode: false,
  sidebarCollapsed: false,
  
  // Initial Data
  agents: [],
  conversations: [],
  currentConversationId: null,
  messages: [],
  memories: [],
  protocols: [],
  tasks: [],
  consentEvents: [],
  settings: {
    fourEyesMode: false,
    externalMode: false,
    theme: 'dark',
    apiKeys: {},
    orchestratorUrl: getOrchestratorUrl(),
    orchestratorKey: getOrchestratorKey(),
    orchestratorUtilsEnabled: getUtilsEnabled(),
    brainBaseUrl: getBrainBaseUrl(),
    brainToken: getBrainToken(),
  },
  
  isLoading: true,
  isInitialized: false,
  
  // UI Actions
  setView: (view) => set({ currentView: view }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  toggleFourEyesMode: () => {
    const newValue = !get().fourEyesMode;
    set({ fourEyesMode: newValue });
    get().updateSettings({ fourEyesMode: newValue });
  },
  toggleExternalMode: () => {
    const newValue = !get().externalMode;
    set({ externalMode: newValue });
    get().updateSettings({ externalMode: newValue });
  },
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  // Data Loading
  loadData: async () => {
    try {
      set({ isLoading: true });
      
      const [agents, conversations, localMemories, protocols, tasks, consentEvents, storedSettings] = await Promise.all([
        db.agents.getAll(),
        db.conversations.getAll(),
        db.memories.getAll(),
        db.protocols.getAll(),
        db.tasks.getAll(),
        db.consent.getAll(),
        db.settings.get(),
      ]);

      const settings: AppSettings = {
        ...storedSettings,
        orchestratorUrl: storedSettings.orchestratorUrl || getOrchestratorUrl(),
        orchestratorKey: storedSettings.orchestratorKey || getOrchestratorKey(),
        orchestratorUtilsEnabled: storedSettings.orchestratorUtilsEnabled ?? getUtilsEnabled(),
        brainBaseUrl: storedSettings.brainBaseUrl || getBrainBaseUrl(),
        brainToken: storedSettings.brainToken || getBrainToken(),
      };

      if (settings.orchestratorUrl || settings.orchestratorKey || settings.orchestratorUtilsEnabled !== undefined) {
        setOrchestratorConfig({
          url: settings.orchestratorUrl,
          apiKey: settings.orchestratorKey,
          utilsEnabled: settings.orchestratorUtilsEnabled,
        });
      }
      if (settings.brainBaseUrl || settings.brainToken) {
        setBrainConfig({
          url: settings.brainBaseUrl,
          token: settings.brainToken,
        });
      }

      let memories = localMemories;
      if (brainEnabled()) {
        try {
          const brainMemories = await fetchMemories(200);
          memories = brainMemories.map((mem) => mapBrainMemoryToLocal(mem));
          await Promise.all(memories.map((mem) => db.memories.put(mem)));
        } catch (error) {
          console.error('Failed to load brain memories:', error);
        }
      }
      
      // Sort by date
      conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      memories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      consentEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const currentConversationId = conversations[0]?.id || null;
      let messages: Message[] = [];
      
      if (currentConversationId) {
        messages = await db.messages.getByConversation(currentConversationId);
        messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
      
      set({
        agents,
        conversations,
        currentConversationId,
        messages,
        memories,
        protocols,
        tasks,
        consentEvents,
        settings,
        fourEyesMode: settings.fourEyesMode,
        externalMode: settings.externalMode,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },
  
  setCurrentConversation: async (id) => {
    if (!id) {
      set({ currentConversationId: null, messages: [] });
      return;
    }
    
    const messages = await db.messages.getByConversation(id);
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    set({ currentConversationId: id, messages });
  },
  
  addMessage: async (messageData) => {
    const message: Message = {
      ...messageData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    await db.messages.put(message);
    set((state) => ({ messages: [...state.messages, message] }));
    
    // Update conversation timestamp
    const conv = get().conversations.find(c => c.id === message.conversationId);
    if (conv) {
      const updated = { ...conv, updatedAt: new Date() };
      await db.conversations.put(updated);
      set((state) => ({
        conversations: state.conversations.map(c => c.id === updated.id ? updated : c),
      }));
    }
    
    return message;
  },
  
  createConversation: async (title, agentIds) => {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title,
      agentIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.conversations.put(conversation);
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
      messages: [],
    }));
    
    return conversation;
  },
  
  updateConversation: async (id, updates) => {
    const conv = get().conversations.find(c => c.id === id);
    if (!conv) return;
    
    const updated = { ...conv, ...updates, updatedAt: new Date() };
    await db.conversations.put(updated);
    set((state) => ({
      conversations: state.conversations.map(c => c.id === id ? updated : c),
    }));
  },
  
  addAgent: async (agentData) => {
    const agent: Agent = {
      ...agentData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    await db.agents.put(agent);
    set((state) => ({ agents: [...state.agents, agent] }));
    return agent;
  },
  
  updateAgent: async (agent) => {
    await db.agents.put(agent);
    set((state) => ({
      agents: state.agents.map(a => a.id === agent.id ? agent : a),
    }));
  },
  
  addMemory: async (memoryData) => {
    let memory: MemoryItem | null = null;
    if (brainEnabled()) {
      try {
        const created = await createBrainMemory({
          content: memoryData.content,
          tags: memoryData.tags,
          metadata: {
            title: memoryData.title,
            source: memoryData.source,
            confidence: memoryData.confidence,
            pinned: memoryData.pinned,
          },
        });
        memory = mapBrainMemoryToLocal(created, {
          ...memoryData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error('Failed to create brain memory:', error);
      }
    }

    if (!memory) {
      memory = {
        ...memoryData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    
    // Store initially without embedding
    await db.memories.put(memory);
    set((state) => ({ memories: [memory, ...state.memories] }));
    
    // Generate embedding asynchronously
    try {
      const textForEmbedding = `${memory.title}\n${memory.content}`;
      const embedding = await generateEmbedding(textForEmbedding);
      if (embedding.length > 0) {
        const memoryWithEmbedding = { ...memory, embedding };
        await db.memories.put(memoryWithEmbedding);
        set((state) => ({
          memories: state.memories.map(m => m.id === memory.id ? memoryWithEmbedding : m),
        }));
      }
    } catch (error) {
      console.error('Failed to generate embedding:', error);
    }
    
    return memory;
  },
  
  updateMemory: async (memory) => {
    let updated = { ...memory, updatedAt: new Date() };
    if (brainEnabled()) {
      try {
        const brainUpdated = await updateBrainMemory(memory.id, buildBrainMemoryPayload(updated));
        updated = mapBrainMemoryToLocal(brainUpdated, updated);
      } catch (error) {
        console.error('Failed to update brain memory:', error);
      }
    }

    await db.memories.put(updated);
    set((state) => ({
      memories: state.memories.map(m => m.id === updated.id ? updated : m),
    }));
  },
  
  deleteMemory: async (id) => {
    if (brainEnabled()) {
      const existing = get().memories.find((mem) => mem.id === id);
      if (existing) {
        try {
          const archivedTags = existing.tags.includes('archived')
            ? existing.tags
            : [...existing.tags, 'archived'];
          await updateBrainMemory(id, {
            ...buildBrainMemoryPayload({ ...existing, tags: archivedTags }),
            metadata: {
              ...buildBrainMemoryPayload(existing).metadata,
              archived: true,
            },
          });
        } catch (error) {
          console.error('Failed to archive brain memory:', error);
        }
      }
    }
    await db.memories.remove(id);
    set((state) => ({
      memories: state.memories.filter(m => m.id !== id),
    }));
  },
  
  addProtocol: async (protocolData) => {
    const protocol: Protocol = {
      ...protocolData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    await db.protocols.put(protocol);
    set((state) => ({ protocols: [...state.protocols, protocol] }));
    return protocol;
  },
  
  addTask: async (taskData) => {
    const priorityMap: Record<string, number> = {
      low: 3,
      medium: 5,
      high: 8,
      critical: 10,
    };
    let task: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (brainEnabled()) {
      try {
        const brainTask = await enqueueTask({
          type: 'loveable',
          sender: 'loveable-ui',
          intent: taskData.title,
          priority: priorityMap[taskData.priority] || 5,
          data: {
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            links: taskData.links,
          },
        });
        if (brainTask?.id) {
          task = {
            ...task,
            id: brainTask.id,
            links: {
              ...task.links,
              brainTaskId: brainTask.id,
            },
          };
        }
      } catch (error) {
        console.error('Failed to enqueue brain task:', error);
      }
    }
    
    await db.tasks.put(task);
    set((state) => ({ tasks: [...state.tasks, task] }));
    return task;
  },
  
  updateTask: async (task) => {
    const previous = get().tasks.find((t) => t.id === task.id);
    const updated = { ...task, updatedAt: new Date() };
    if (brainEnabled()) {
      const wasDone = previous?.status === 'done';
      if (!wasDone && updated.status === 'done') {
        const brainTaskId = updated.links?.brainTaskId || updated.id;
        try {
          await completeTask(brainTaskId, {
            status: 'done',
            completedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Failed to complete brain task:', error);
        }
      }
    }
    await db.tasks.put(updated);
    set((state) => ({
      tasks: state.tasks.map(t => t.id === updated.id ? updated : t),
    }));
  },
  
  deleteTask: async (id) => {
    await db.tasks.remove(id);
    set((state) => ({
      tasks: state.tasks.filter(t => t.id !== id),
    }));
  },
  
  logConsent: async (eventData) => {
    const event: ConsentEvent = {
      ...eventData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    await db.consent.put(event);
    set((state) => ({ consentEvents: [event, ...state.consentEvents] }));
  },
  
  updateSettings: async (newSettings) => {
    const current = get().settings;
    const updated = { ...current, ...newSettings };
    await db.settings.put(updated);
    set({ settings: updated });
    if (
      Object.prototype.hasOwnProperty.call(newSettings, 'orchestratorUrl') ||
      Object.prototype.hasOwnProperty.call(newSettings, 'orchestratorKey') ||
      Object.prototype.hasOwnProperty.call(newSettings, 'orchestratorUtilsEnabled')
    ) {
      setOrchestratorConfig({
        url: updated.orchestratorUrl,
        apiKey: updated.orchestratorKey,
        utilsEnabled: updated.orchestratorUtilsEnabled,
      });
    }
    if (
      Object.prototype.hasOwnProperty.call(newSettings, 'brainBaseUrl') ||
      Object.prototype.hasOwnProperty.call(newSettings, 'brainToken')
    ) {
      setBrainConfig({
        url: updated.brainBaseUrl,
        token: updated.brainToken,
      });
    }
  },
}));
