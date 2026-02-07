// OMEGAI Voice Authentication Store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface VoiceFingerprint {
  passPhrase: string;
  recordedAt: Date;
  userId: string;
}

interface VoiceAuthState {
  // State
  fingerprint: VoiceFingerprint | null;
  isAuthenticated: boolean;
  lastAuthAttempt: Date | null;
  failedAttempts: number;

  // Config
  similarityThreshold: number; // 0-1, how strict the voice match should be
  maxFailedAttempts: number;

  // Actions
  setFingerprint: (passPhrase: string, userId?: string) => void;
  clearFingerprint: () => void;
  verifyVoice: (transcript: string) => { isMatch: boolean; similarity: number };
  recordAuthAttempt: (success: boolean) => void;
  resetFailedAttempts: () => void;
  setSimilarityThreshold: (threshold: number) => void;
}

// Simple Levenshtein distance implementation for similarity matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Calculate similarity percentage (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLength;
}

export const useVoiceAuthStore = create<VoiceAuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      fingerprint: null,
      isAuthenticated: false,
      lastAuthAttempt: null,
      failedAttempts: 0,
      similarityThreshold: 0.75, // 75% similarity required by default
      maxFailedAttempts: 3,

      // Actions
      setFingerprint: (passPhrase, userId = 'omega-user') => {
        set({
          fingerprint: {
            passPhrase: passPhrase.toLowerCase().trim(),
            recordedAt: new Date(),
            userId,
          },
          isAuthenticated: false,
          failedAttempts: 0,
        });
      },

      clearFingerprint: () => {
        set({
          fingerprint: null,
          isAuthenticated: false,
          failedAttempts: 0,
          lastAuthAttempt: null,
        });
      },

      verifyVoice: (transcript) => {
        const { fingerprint, similarityThreshold } = get();

        if (!fingerprint) {
          return { isMatch: false, similarity: 0 };
        }

        const similarity = calculateSimilarity(
          fingerprint.passPhrase,
          transcript.trim()
        );

        const isMatch = similarity >= similarityThreshold;

        return { isMatch, similarity };
      },

      recordAuthAttempt: (success) => {
        set((state) => ({
          lastAuthAttempt: new Date(),
          isAuthenticated: success,
          failedAttempts: success ? 0 : state.failedAttempts + 1,
        }));
      },

      resetFailedAttempts: () => {
        set({ failedAttempts: 0 });
      },

      setSimilarityThreshold: (threshold) => {
        set({ similarityThreshold: Math.max(0, Math.min(1, threshold)) });
      },
    }),
    {
      name: 'omegai-voice-auth',
      partialize: (state) => ({
        fingerprint: state.fingerprint,
        similarityThreshold: state.similarityThreshold,
        maxFailedAttempts: state.maxFailedAttempts,
      }),
    }
  )
);
