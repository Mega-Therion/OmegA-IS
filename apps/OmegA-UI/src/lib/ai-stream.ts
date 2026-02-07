// Streaming chat utility for OmegA Orchestrator
import { getOrchestratorKey, getOrchestratorUrl } from "@/lib/orchestrator-config";

const getChatUrl = () => `${getOrchestratorUrl().replace(/\/$/, "")}/api/chat`;

const getStoredId = (key: string, prefix: string) => {
  if (typeof window === "undefined") {
    return `${prefix}_server`;
  }
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const newId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, newId);
  return newId;
};

const getUserId = () =>
  import.meta.env.VITE_OMEGA_USER_ID || getStoredId("omega_user_id", "user");
const getSessionId = () =>
  import.meta.env.VITE_OMEGA_SESSION_ID || getStoredId("omega_session_id", "session");

const formatMessages = (messages: ChatMessage[]) => {
  return messages
    .slice(-8)
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n");
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface StreamChatOptions {
  messages: ChatMessage[];
  agentName: string;
  agentRole: string;
  agentRules?: string[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export async function streamChat({
  messages,
  agentName,
  agentRole,
  agentRules,
  onDelta,
  onDone,
  onError,
}: StreamChatOptions): Promise<void> {
  try {
    const userId = getUserId();
    const sessionId = getSessionId();
    const latest = messages[messages.length - 1]?.content || "";
    const conversation = formatMessages(messages);
    const payloadText = conversation
      ? `Conversation so far:\n${conversation}\n\nLatest user message:\n${latest}`
      : latest;

    const resp = await fetch(getChatUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getOrchestratorKey() ? { "X-Omega-Key": getOrchestratorKey() } : {}),
      },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        ctx: {
          channel: "hud",
          device: "loveable",
          client_version: import.meta.env.VITE_APP_VERSION,
        },
        input: {
          text: payloadText,
          raw: { messages, agentName, agentRole, agentRules },
        },
        permissions: {},
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const content = data.text || "";
    if (content) {
      onDelta(content);
    }

    onDone();
  } catch (error) {
    onError(error instanceof Error ? error : new Error("Stream failed"));
  }
}
