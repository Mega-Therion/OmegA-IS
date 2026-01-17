/**
 * OMEGA Desktop - Preload Script
 * 
 * Secure bridge between renderer and main process.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld('omega', {
  // Get configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  
  // Send chat message
  chat: async (message, agent = 'gemini', options = {}) => {
    const config = await ipcRenderer.invoke('get-config');
    const useOmega = options.useOmega === true;
    const payload = useOmega
      ? {
          messages: [{ role: 'user', content: message }],
          max_tokens: 500,
          temperature: 0.7
        }
      : {
          messages: [{ role: 'user', content: message }],
          model: agent,
          max_tokens: 500,
          temperature: 0.7
        };

    const response = await fetch(`${config.apiUrl}${useOmega ? '/omega/chat' : '/llm/chat'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  // Generate speech via OmegA
  speak: async (text, options = {}) => {
    const config = await ipcRenderer.invoke('get-config');
    const response = await fetch(`${config.apiUrl}/omega/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceId: options.voiceId,
        provider: options.provider,
        voice: options.voice
      })
    });
    return response.json();
  },
  
  // Get system status
  getStatus: async () => {
    const config = await ipcRenderer.invoke('get-config');
    const response = await fetch(`${config.apiUrl}/health`);
    return response.json();
  },
  
  // Get missions
  getMissions: async () => {
    const config = await ipcRenderer.invoke('get-config');
    const response = await fetch(`${config.apiUrl}/missions`);
    return response.json();
  },
  
  // Show system notification
  notify: (title, body) => {
    ipcRenderer.invoke('show-notification', { title, body });
  },
  
  // Platform info
  platform: process.platform,
  
  // App version
  version: process.env.npm_package_version || '1.0.0'
});

// Listen for main process messages
window.addEventListener('message', (event) => {
  if (event.data.type === 'OMEGA_QUICK_CHAT') {
    // Handle quick chat request from main process
    const customEvent = new CustomEvent('omega:quick-chat', {
      detail: { agent: event.data.agent }
    });
    window.dispatchEvent(customEvent);
  }
  
  if (event.data.type === 'OMEGA_VIEW_MISSIONS') {
    const customEvent = new CustomEvent('omega:view-missions');
    window.dispatchEvent(customEvent);
  }
  
  if (event.data.type === 'OMEGA_PREFERENCES') {
    const customEvent = new CustomEvent('omega:preferences');
    window.dispatchEvent(customEvent);
  }
});
