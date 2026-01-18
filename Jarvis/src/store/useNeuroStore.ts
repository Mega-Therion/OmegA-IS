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
  setMetrics: (metrics: Metrics) => void
  addMessage: (message: ChatMessage) => void
  addMemory: (memory: MemoryItem) => void
  togglePin: (id: string) => void
  toggleRag: () => void
  setQualityMode: (mode: NeuroState['qualityMode']) => void
  clearSession: () => void
}

export const useNeuroStore = create<NeuroState>()(
  persist(
    (set) => ({
      messages: [],
      memory: [],
      metrics: { fps: 60, latency: 24, memory: 512, mood: 0.5 },
      ragEnabled: true,
      qualityMode: 'balanced',
      setMetrics: (metrics) => set({ metrics }),
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      addMemory: (memory) =>
        set((state) => ({ memory: [memory, ...state.memory].slice(0, 20) })),
      togglePin: (id) =>
        set((state) => ({
          memory: state.memory.map((item) =>
            item.id === id ? { ...item, pinned: !item.pinned } : item
          )
        })),
      toggleRag: () => set((state) => ({ ragEnabled: !state.ragEnabled })),
      setQualityMode: (mode) => set({ qualityMode: mode }),
      clearSession: () => set({ messages: [], memory: [] })
    }),
    {
      name: 'neuro-link-memory',
      partialize: (state) => ({ messages: state.messages, memory: state.memory })
    }
  )
)
