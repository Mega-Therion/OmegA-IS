/**
 * 🔌 Plugin Architecture
 * 
 * Hot-loadable extensions system for gAIng Brain.
 * Supports lifecycle hooks, API extensions, and UI components.
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// Plugin lifecycle hooks
const HOOKS = {
  BEFORE_START: 'beforeStart',
  AFTER_START: 'afterStart',
  BEFORE_STOP: 'beforeStop',
  AFTER_STOP: 'afterStop',
  ON_MESSAGE: 'onMessage',
  ON_CHAT: 'onChat',
  ON_ERROR: 'onError',
  BEFORE_RESPONSE: 'beforeResponse',
  AFTER_RESPONSE: 'afterResponse'
};

/**
 * Plugin base class
 */
class Plugin {
  constructor(manifest) {
    this.id = manifest.id;
    this.name = manifest.name;
    this.version = manifest.version;
    this.description = manifest.description || '';
    this.author = manifest.author || 'Unknown';
    this.dependencies = manifest.dependencies || [];
    this.enabled = true;
    this.loaded = false;
  }

  // Lifecycle methods - override in plugins
  async onLoad(context) {}
  async onUnload() {}
  async onEnable() {}
  async onDisable() {}

  // Hook handlers - override as needed
  async beforeStart(context) {}
  async afterStart(context) {}
  async beforeStop(context) {}
  async afterStop(context) {}
  async onMessage(message, context) { return message; }
  async onChat(request, context) { return request; }
  async onError(error, context) {}
  async beforeResponse(response, context) { return response; }
  async afterResponse(response, context) {}

  // Utility methods
  log(...args) {
    console.log(`[Plugin:${this.id}]`, ...args);
  }

  error(...args) {
    console.error(`[Plugin:${this.id}]`, ...args);
  }
}

/**
 * Plugin Manager
 */
class PluginManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.plugins = new Map();
    this.hooks = new Map();
    this.pluginsDir = options.pluginsDir || path.join(__dirname, '..', '..', 'plugins');
    this.context = options.context || {};
    
    // Initialize hook registry
    Object.values(HOOKS).forEach(hook => {
      this.hooks.set(hook, []);
    });
  }

  /**
   * Discover and load all plugins
   */
  async discoverPlugins() {
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
      console.log('[Plugins] Created plugins directory:', this.pluginsDir);
      return [];
    }

    const discovered = [];
    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const manifestPath = path.join(this.pluginsDir, entry.name, 'manifest.json');
      
      if (!fs.existsSync(manifestPath)) {
        console.warn(`[Plugins] No manifest found for: ${entry.name}`);
        continue;
      }

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        manifest.directory = path.join(this.pluginsDir, entry.name);
        discovered.push(manifest);
      } catch (error) {
        console.error(`[Plugins] Failed to parse manifest for ${entry.name}:`, error.message);
      }
    }

    return discovered;
  }

  /**
   * Load a plugin from manifest
   */
  async loadPlugin(manifest) {
    if (this.plugins.has(manifest.id)) {
      console.warn(`[Plugins] Plugin already loaded: ${manifest.id}`);
      return false;
    }

    // Check dependencies
    for (const dep of manifest.dependencies || []) {
      if (!this.plugins.has(dep)) {
        console.error(`[Plugins] Missing dependency ${dep} for ${manifest.id}`);
        return false;
      }
    }

    try {
      const mainPath = path.join(manifest.directory, manifest.main || 'index.js');
      
      if (!fs.existsSync(mainPath)) {
        console.error(`[Plugins] Main file not found: ${mainPath}`);
        return false;
      }

      // Load plugin module
      const PluginClass = require(mainPath);
      const plugin = new PluginClass(manifest);

      // Initialize plugin
      await plugin.onLoad(this.context);
      plugin.loaded = true;

      // Register hooks
      this.registerPluginHooks(plugin);

      // Store plugin
      this.plugins.set(manifest.id, plugin);

      console.log(`[Plugins] Loaded: ${manifest.name} v${manifest.version}`);
      this.emit('load', plugin);
      
      return true;
    } catch (error) {
      console.error(`[Plugins] Failed to load ${manifest.id}:`, error);
      return false;
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    
    if (!plugin) {
      console.warn(`[Plugins] Plugin not found: ${pluginId}`);
      return false;
    }

    try {
      await plugin.onUnload();
      
      // Unregister hooks
      this.unregisterPluginHooks(plugin);

      // Remove from cache to allow hot reload
      const pluginPath = path.join(this.pluginsDir, pluginId);
      Object.keys(require.cache).forEach(key => {
        if (key.startsWith(pluginPath)) {
          delete require.cache[key];
        }
      });

      this.plugins.delete(pluginId);
      
      console.log(`[Plugins] Unloaded: ${plugin.name}`);
      this.emit('unload', plugin);
      
      return true;
    } catch (error) {
      console.error(`[Plugins] Failed to unload ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Reload a plugin (hot reload)
   */
  async reloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    const manifests = await this.discoverPlugins();
    const manifest = manifests.find(m => m.id === pluginId);
    
    if (!manifest) return false;

    await this.unloadPlugin(pluginId);
    return await this.loadPlugin(manifest);
  }

  /**
   * Register a plugin's hooks
   */
  registerPluginHooks(plugin) {
    for (const hookName of Object.values(HOOKS)) {
      if (typeof plugin[hookName] === 'function') {
        const handlers = this.hooks.get(hookName);
        handlers.push({
          pluginId: plugin.id,
          handler: plugin[hookName].bind(plugin),
          priority: plugin.priority || 100
        });
        // Sort by priority (lower = higher priority)
        handlers.sort((a, b) => a.priority - b.priority);
      }
    }
  }

  /**
   * Unregister a plugin's hooks
   */
  unregisterPluginHooks(plugin) {
    for (const hookName of Object.values(HOOKS)) {
      const handlers = this.hooks.get(hookName);
      const filtered = handlers.filter(h => h.pluginId !== plugin.id);
      this.hooks.set(hookName, filtered);
    }
  }

  /**
   * Execute a hook
   */
  async executeHook(hookName, ...args) {
    const handlers = this.hooks.get(hookName) || [];
    let result = args[0];

    for (const { handler, pluginId } of handlers) {
      try {
        const hookResult = await handler(result, ...args.slice(1), this.context);
        
        // For transforming hooks, use the returned value
        if (hookResult !== undefined) {
          result = hookResult;
        }
      } catch (error) {
        console.error(`[Plugins] Hook error in ${pluginId}.${hookName}:`, error);
        this.emit('hookError', { pluginId, hookName, error });
      }
    }

    return result;
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    plugin.enabled = true;
    await plugin.onEnable();
    this.emit('enable', plugin);
    return true;
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    plugin.enabled = false;
    await plugin.onDisable();
    this.emit('disable', plugin);
    return true;
  }

  /**
   * Load all discovered plugins
   */
  async loadAll() {
    const manifests = await this.discoverPlugins();
    const results = [];

    // Sort by dependencies
    const sorted = this.topologicalSort(manifests);

    for (const manifest of sorted) {
      const success = await this.loadPlugin(manifest);
      results.push({ id: manifest.id, success });
    }

    return results;
  }

  /**
   * Topological sort for dependency ordering
   */
  topologicalSort(manifests) {
    const sorted = [];
    const visited = new Set();
    const manifestMap = new Map(manifests.map(m => [m.id, m]));

    const visit = (manifest) => {
      if (visited.has(manifest.id)) return;
      visited.add(manifest.id);

      for (const dep of manifest.dependencies || []) {
        const depManifest = manifestMap.get(dep);
        if (depManifest) {
          visit(depManifest);
        }
      }

      sorted.push(manifest);
    };

    manifests.forEach(m => visit(m));
    return sorted;
  }

  /**
   * Get plugin info
   */
  getPluginInfo(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return null;

    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      enabled: plugin.enabled,
      loaded: plugin.loaded
    };
  }

  /**
   * List all plugins
   */
  listPlugins() {
    return Array.from(this.plugins.values()).map(p => this.getPluginInfo(p.id));
  }
}

/**
 * Create example plugin template
 */
function createPluginTemplate(pluginId, pluginName, directory) {
  const pluginDir = path.join(directory, pluginId);
  
  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true });
  }

  // manifest.json
  const manifest = {
    id: pluginId,
    name: pluginName,
    version: '1.0.0',
    description: 'A gAIng Brain plugin',
    author: 'You',
    main: 'index.js',
    dependencies: []
  };
  
  fs.writeFileSync(
    path.join(pluginDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // index.js
  const indexContent = `const { Plugin } = require('../../src/services/plugins');

class ${pluginName.replace(/\s+/g, '')}Plugin extends Plugin {
  async onLoad(context) {
    this.log('Plugin loaded!');
  }

  async onUnload() {
    this.log('Plugin unloaded!');
  }

  async onMessage(message, context) {
    // Process or modify messages
    return message;
  }

  async onChat(request, context) {
    // Process chat requests
    return request;
  }
}

module.exports = ${pluginName.replace(/\s+/g, '')}Plugin;
`;

  fs.writeFileSync(path.join(pluginDir, 'index.js'), indexContent);

  console.log(`[Plugins] Created template at: ${pluginDir}`);
  return pluginDir;
}

module.exports = {
  HOOKS,
  Plugin,
  PluginManager,
  createPluginTemplate
};
