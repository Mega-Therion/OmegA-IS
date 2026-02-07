import { getBrainBaseUrl, getBrainToken } from "@/lib/orchestrator-config";

export interface BrainMemory {
  id: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface BrainTask {
  id: string;
  type?: string;
  sender?: string;
  intent?: string;
  priority?: number;
  data?: Record<string, unknown>;
  created_at?: string;
}

const normalizeBase = (base: string) => base.replace(/\/$/, "");

const buildHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getBrainToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const brainRequest = async (path: string, options: RequestInit = {}) => {
  const base = getBrainBaseUrl();
  if (!base) {
    throw new Error("Brain base URL not configured");
  }
  const response = await fetch(`${normalizeBase(base)}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Brain API error (${response.status})`);
  }
  return response.json();
};

export const brainEnabled = () => Boolean(getBrainBaseUrl());

export async function fetchMemories(limit = 200): Promise<BrainMemory[]> {
  const data = await brainRequest(`/memories?limit=${limit}`);
  return data.memories || [];
}

export async function createMemory(payload: {
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Promise<BrainMemory> {
  const data = await brainRequest("/memories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.memory;
}

export async function updateMemory(
  id: string,
  payload: { content?: string; tags?: string[]; metadata?: Record<string, unknown> }
): Promise<BrainMemory> {
  const data = await brainRequest(`/memories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.memory;
}

export async function enqueueTask(payload: {
  type?: string;
  priority?: number;
  sender: string;
  intent: string;
  data?: Record<string, unknown>;
  deadline?: string;
}): Promise<BrainTask> {
  const data = await brainRequest("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.task;
}

export async function completeTask(taskId: string, result?: Record<string, unknown>) {
  const data = await brainRequest(`/tasks/${taskId}/complete`, {
    method: "POST",
    body: JSON.stringify({ result: result || {} }),
  });
  return data;
}

export async function fetchOrchestratorTasks(): Promise<BrainTask[]> {
  const data = await brainRequest("/bridge/orchestrate/tasks", {
    method: "GET",
  });
  return data.tasks || [];
}
