/**
 * Supabase Client Configuration
 * Central configuration for Supabase integration with Jarvis Neuro-Link
 */

import { createClient } from '@supabase/supabase-js'

// Types for our database tables
export interface Database {
  public: {
    Tables: {
      memories: {
        Row: {
          id: string
          user_id: string
          label: string
          content: string
          pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label: string
          content: string
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          label?: string
          content?: string
          pinned?: boolean
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          agent?: string | null
          created_at?: string
        }
        Update: {
          content?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          quality_mode: 'ultra' | 'balanced' | 'lite'
          rag_enabled: boolean
          preferred_agent: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quality_mode?: 'ultra' | 'balanced' | 'lite'
          rag_enabled?: boolean
          preferred_agent?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          quality_mode?: 'ultra' | 'balanced' | 'lite'
          rag_enabled?: boolean
          preferred_agent?: string
          updated_at?: string
        }
      }
    }
  }
}

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not configured. Running in offline mode.\n' +
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
  )
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey)

// Auth helpers
export const auth = {
  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  /**
   * Sign up with email and password
   */
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  /**
   * Sign in with OAuth provider (Google, GitHub, etc.)
   */
  signInWithOAuth: async (provider: 'google' | 'github' | 'discord') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  /**
   * Sign out
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  /**
   * Get current user
   */
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  /**
   * Get current session
   */
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  /**
   * Subscribe to auth changes
   */
  onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helpers for memories
export const memories = {
  /**
   * Get all memories for the current user
   */
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  /**
   * Create a new memory
   */
  create: async (userId: string, memory: { label: string; content: string; pinned?: boolean }) => {
    const { data, error } = await supabase
      .from('memories')
      .insert({
        user_id: userId,
        label: memory.label,
        content: memory.content,
        pinned: memory.pinned || false
      })
      .select()
      .single()
    return { data, error }
  },

  /**
   * Update a memory
   */
  update: async (id: string, updates: { label?: string; content?: string; pinned?: boolean }) => {
    const { data, error } = await supabase
      .from('memories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  /**
   * Toggle pin status
   */
  togglePin: async (id: string, currentPinned: boolean) => {
    const { data, error } = await supabase
      .from('memories')
      .update({ pinned: !currentPinned, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  /**
   * Delete a memory
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id)
    return { error }
  }
}

// Database helpers for chat sessions
export const chatSessions = {
  /**
   * Get all chat sessions
   */
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    return { data, error }
  },

  /**
   * Create a new session
   */
  create: async (userId: string, title?: string) => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        title: title || `Session ${new Date().toLocaleDateString()}`
      })
      .select()
      .single()
    return { data, error }
  },

  /**
   * Get messages for a session
   */
  getMessages: async (sessionId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    return { data, error }
  },

  /**
   * Add a message to a session
   */
  addMessage: async (
    sessionId: string,
    userId: string,
    message: { role: 'user' | 'assistant' | 'system'; content: string; agent?: string }
  ) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        role: message.role,
        content: message.content,
        agent: message.agent || null
      })
      .select()
      .single()
    return { data, error }
  }
}

// Database helpers for user preferences
export const preferences = {
  /**
   * Get user preferences
   */
  get: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    return { data, error }
  },

  /**
   * Create or update preferences
   */
  upsert: async (
    userId: string,
    prefs: { quality_mode?: string; rag_enabled?: boolean; preferred_agent?: string }
  ) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...prefs,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    return { data, error }
  }
}

export default supabase
