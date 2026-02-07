/**
 * Example Plugin for gAIng Brain
 * 
 * Demonstrates the plugin architecture with all lifecycle hooks.
 */

// Import the Plugin base class
let Plugin;
try {
  const plugins = require('../../src/services/plugins');
  Plugin = plugins.Plugin;
} catch (e) {
  // Fallback for standalone testing
  Plugin = class {
    constructor(manifest) {
      Object.assign(this, manifest);
    }
    log(...args) { console.log(`[Plugin:${this.id}]`, ...args); }
    error(...args) { console.error(`[Plugin:${this.id}]`, ...args); }
  };
}

class ExamplePlugin extends Plugin {
  constructor(manifest) {
    super(manifest);
    this.messageCount = 0;
    this.startTime = null;
  }

  /**
   * Called when the plugin is loaded
   */
  async onLoad(context) {
    this.log('Plugin loaded!');
    this.startTime = Date.now();
    
    // Access shared context if needed
    if (context.app) {
      this.log('Express app available');
    }
  }

  /**
   * Called when the plugin is unloaded
   */
  async onUnload() {
    const uptime = Date.now() - this.startTime;
    this.log(`Plugin unloaded after ${Math.round(uptime / 1000)}s`);
    this.log(`Processed ${this.messageCount} messages`);
  }

  /**
   * Called when the plugin is enabled
   */
  async onEnable() {
    this.log('Plugin enabled');
  }

  /**
   * Called when the plugin is disabled
   */
  async onDisable() {
    this.log('Plugin disabled');
  }

  /**
   * Process incoming messages
   * Can modify or filter messages
   */
  async onMessage(message, context) {
    this.messageCount++;
    
    // Example: Add metadata to message
    message._pluginMetadata = {
      processedAt: new Date().toISOString(),
      processedBy: this.id
    };

    // Example: Log message stats
    if (this.messageCount % 10 === 0) {
      this.log(`Processed ${this.messageCount} messages`);
    }

    // Return the (possibly modified) message
    return message;
  }

  /**
   * Process chat requests before they're sent to AI
   */
  async onChat(request, context) {
    // Example: Add system context to chat
    if (!request.systemPrompt) {
      request.systemPrompt = '';
    }
    
    request.systemPrompt += '\n[ExamplePlugin active]';
    
    return request;
  }

  /**
   * Process responses before they're sent to the client
   */
  async beforeResponse(response, context) {
    // Example: Add plugin info to response
    if (typeof response === 'object') {
      response._plugins = response._plugins || [];
      response._plugins.push(this.id);
    }
    
    return response;
  }

  /**
   * Called after response is sent (for logging, analytics, etc.)
   */
  async afterResponse(response, context) {
    // Example: Log response stats
    this.log('Response sent:', {
      type: typeof response,
      size: JSON.stringify(response).length
    });
  }

  /**
   * Handle errors
   */
  async onError(error, context) {
    this.error('Error occurred:', error.message);
    
    // Could send to error tracking service, etc.
  }
}

module.exports = ExamplePlugin;
