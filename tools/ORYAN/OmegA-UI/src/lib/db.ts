// OMEGAI Command Deck - IndexedDB Storage Layer
import { Agent, Conversation, Message, MemoryItem, Protocol, Task, ConsentEvent, AppSettings } from './types';

const DB_NAME = 'omegai_command_deck';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Agents store
      if (!database.objectStoreNames.contains('agents')) {
        database.createObjectStore('agents', { keyPath: 'id' });
      }

      // Conversations store
      if (!database.objectStoreNames.contains('conversations')) {
        const store = database.createObjectStore('conversations', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }

      // Messages store
      if (!database.objectStoreNames.contains('messages')) {
        const store = database.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('conversationId', 'conversationId');
        store.createIndex('createdAt', 'createdAt');
      }

      // Memory items store
      if (!database.objectStoreNames.contains('memories')) {
        const store = database.createObjectStore('memories', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('pinned', 'pinned');
      }

      // Protocols store
      if (!database.objectStoreNames.contains('protocols')) {
        database.createObjectStore('protocols', { keyPath: 'id' });
      }

      // Tasks store
      if (!database.objectStoreNames.contains('tasks')) {
        const store = database.createObjectStore('tasks', { keyPath: 'id' });
        store.createIndex('status', 'status');
      }

      // Consent events store
      if (!database.objectStoreNames.contains('consent')) {
        const store = database.createObjectStore('consent', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }

      // Settings store
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'id' });
      }
    };
  });
}

// Generic CRUD operations
async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly') {
  const database = await initDB();
  const transaction = database.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function put<T>(storeName: string, item: T): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function remove(storeName: string, id: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
  const store = await getStore(storeName);
  const index = store.index(indexName);
  return new Promise((resolve, reject) => {
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Typed helpers
export const agents = {
  getAll: () => getAll<Agent>('agents'),
  get: (id: string) => getById<Agent>('agents', id),
  put: (agent: Agent) => put('agents', agent),
  remove: (id: string) => remove('agents', id),
};

export const conversations = {
  getAll: () => getAll<Conversation>('conversations'),
  get: (id: string) => getById<Conversation>('conversations', id),
  put: (conv: Conversation) => put('conversations', conv),
  remove: (id: string) => remove('conversations', id),
};

export const messages = {
  getAll: () => getAll<Message>('messages'),
  getByConversation: (conversationId: string) => getByIndex<Message>('messages', 'conversationId', conversationId),
  put: (msg: Message) => put('messages', msg),
  remove: (id: string) => remove('messages', id),
};

export const memories = {
  getAll: () => getAll<MemoryItem>('memories'),
  get: (id: string) => getById<MemoryItem>('memories', id),
  put: (item: MemoryItem) => put('memories', item),
  remove: (id: string) => remove('memories', id),
};

export const protocols = {
  getAll: () => getAll<Protocol>('protocols'),
  get: (id: string) => getById<Protocol>('protocols', id),
  put: (protocol: Protocol) => put('protocols', protocol),
  remove: (id: string) => remove('protocols', id),
};

export const tasks = {
  getAll: () => getAll<Task>('tasks'),
  get: (id: string) => getById<Task>('tasks', id),
  put: (task: Task) => put('tasks', task),
  remove: (id: string) => remove('tasks', id),
};

export const consent = {
  getAll: () => getAll<ConsentEvent>('consent'),
  put: (event: ConsentEvent) => put('consent', event),
};

export const settings = {
  get: async (): Promise<AppSettings> => {
    const result = await getById<AppSettings & { id: string }>('settings', 'app');
    return result || {
      fourEyesMode: false,
      externalMode: false,
      theme: 'dark',
      apiKeys: {},
      orchestratorUrl: '',
      orchestratorKey: '',
      orchestratorUtilsEnabled: false,
      brainBaseUrl: '',
      brainToken: '',
    };
  },
  put: (s: AppSettings) => put('settings', { id: 'app', ...s }),
};
