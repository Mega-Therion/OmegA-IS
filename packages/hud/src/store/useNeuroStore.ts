import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  tags?: string[]
}

export interface MemoryItem {
  id: string
  label: string
  content: string
  pinned: boolean
  updatedAt: string
}

interface Metrics {
  fps: number
  latency: number
  memory: number
  mood: number
}

interface NeuroState {
  messages: ChatMessage[]
  memory: MemoryItem[]
  metrics: Metrics
  ragEnabled: boolean
  qualityMode: 'ultra' | 'balanced' | 'lite'
  activeTab: 'console' | 'terminal' | 'podcast' | 'vision'

  setMetrics: (metrics: Metrics) => void
  addMessage: (message: ChatMessage) => void
  addMemory: (memory: MemoryItem) => void
  togglePin: (id: string) => void
  toggleRag: () => void
  setQualityMode: (mode: NeuroState['qualityMode']) => void
  setActiveTab: (tab: NeuroState['activeTab']) => void
  clearSession: () => void

  // Voice & Input State
  isListening: boolean
  setIsListening: (isListening: boolean) => void
  inputText: string
  setInputText: (text: string) => void
  submitMessage: (text: string) => void
}

export const useNeuroStore = create<NeuroState>()(
  persist(
    (set) => ({
      messages: [],
      memory: [],
      metrics: { fps: 60, latency: 24, memory: 512, mood: 0.5 },
      ragEnabled: true,
      qualityMode: 'balanced',
      activeTab: 'console',

      setMetrics: (metrics: Metrics) => set({ metrics }),
      addMessage: (message: ChatMessage) =>
        set((state: NeuroState) => ({ messages: [...state.messages, message] })),
      addMemory: (memory: MemoryItem) =>
        set((state: NeuroState) => ({ memory: [memory, ...state.memory].slice(0, 20) })),
      togglePin: (id: string) =>
        set((state: NeuroState) => ({
          memory: state.memory.map((item) =>
            item.id === id ? { ...item, pinned: !item.pinned } : item
          )
        })),
      toggleRag: () => set((state: NeuroState) => ({ ragEnabled: !state.ragEnabled })),
      setQualityMode: (mode: NeuroState['qualityMode']) => set({ qualityMode: mode }),
      setActiveTab: (tab: NeuroState['activeTab']) => set({ activeTab: tab }),
      clearSession: () => set({ messages: [], memory: [] }),

      // Voice & Input State
      isListening: false,
      setIsListening: (isListening: boolean) => set({ isListening }),
      inputText: '',
      setInputText: (inputText: string) => set({ inputText }),
      submitMessage: (text: string) =>
        set((state: NeuroState) => ({
          messages: [
            ...state.messages,
            {
              id: Date.now().toString(),
              role: 'user',
              content: text,
              timestamp: new Date().toISOString()
            }
          ]
        }))
    }),
    {
      name: 'neuro-link-memory',
      partialize: (state: NeuroState) => ({ messages: state.messages, memory: state.memory })
    }
  )
)
