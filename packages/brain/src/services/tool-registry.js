/**
 * OMEGA Brain - Tool Registry for Function Calling
 *
 * Centralized registry for all AI agent tools.
 * Supports automatic schema generation and tool discovery.
 */

const memoryService = require('./mem0');
const db = require('./supabase');
const browser = require('./browser');
const codeInterpreter = require('./code-interpreter');
const fsTools = require('./agentic-fs');
const gitTools = require('./agentic-git');
const { analyzeCode } = require('./code-analysis');
const { reviewCode } = require('./code-review');
const documentProcessor = require('./document-processor');
const imageGeneration = require('./image-generation');
const crypto = require('crypto');

// ===========================
// Tool Definitions
// ===========================

const tools = {
  // Memory Tools
  get_memory: {
    name: 'get_memory',
    description: 'Search and retrieve relevant memories from the memory vault using semantic search',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant memories',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of memories to return (default: 5)',
          default: 5,
        },
      },
      required: ['query'],
    },
    handler: async (args) => {
      const memories = await memoryService.search(args.query, { limit: args.limit || 5 });
      return memories;
    },
  },

  add_memory: {
    name: 'add_memory',
    description: 'Store a new memory in the memory vault with tags and metadata',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The memory content to store',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to categorize the memory',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata for the memory',
        },
      },
      required: ['content'],
    },
    handler: async (args) => {
      const memory = await memoryService.add({
        messages: [{ role: 'user', content: args.content }],
        metadata: {
          tags: args.tags || [],
          ...args.metadata,
        },
      });
      return memory;
    },
  },

  // Database Tools
  query_database: {
    name: 'query_database',
    description: 'Query the Supabase database to retrieve structured data',
    parameters: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'The table name to query',
          enum: ['members', 'memories', 'messages', 'tasks'],
        },
        filters: {
          type: 'object',
          description: 'Filters to apply to the query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of rows to return',
          default: 10,
        },
      },
      required: ['table'],
    },
    handler: async (args) => {
      const client = db.getSupabaseClient();
      let query = client.from(args.table).select('*');

      if (args.filters) {
        for (const [key, value] of Object.entries(args.filters)) {
          query = query.eq(key, value);
        }
      }

      if (args.limit) {
        query = query.limit(args.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  },

  // System Tools
  get_current_time: {
    name: 'get_current_time',
    description: 'Get the current date and time',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone for the time (default: UTC)',
          default: 'UTC',
        },
      },
    },
    handler: async (args) => {
      const now = new Date();
      return {
        iso: now.toISOString(),
        unix: Math.floor(now.getTime() / 1000),
        timezone: args.timezone || 'UTC',
      };
    },
  },

  // Web Tools (Placeholder - implement with fetch/axios)
  web_search: {
    name: 'web_search',
    description: 'Search the web for current information (requires API key)',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        num_results: {
          type: 'number',
          description: 'Number of results to return (default: 5)',
          default: 5,
        },
      },
      required: ['query'],
    },
    handler: async (args) => {
      // TODO: Implement with Perplexity, SerpAPI, or similar
      return {
        note: 'Web search not yet implemented',
        query: args.query,
      };
    },
  },

  // File Tools (Placeholder)
  read_file: {
    name: 'read_file',
    description: 'Read contents of a file from the filesystem',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to read',
        },
      },
      required: ['path'],
    },
    handler: async (args) => {
      const fs = require('fs').promises;
      const content = await fs.readFile(args.path, 'utf-8');
      return { content, path: args.path };
    },
  },

  write_file: {
    name: 'write_file',
    description: 'Write content to a file on the filesystem',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to write',
        },
        content: {
          type: 'string',
          description: 'Content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
    handler: async (args) => {
      const fs = require('fs').promises;
      await fs.writeFile(args.path, args.content, 'utf-8');
      return { success: true, path: args.path };
    },
  },

  // ===========================
  // Browser Tools
  // ===========================

  browser_navigate: {
    name: 'browser_navigate',
    description: 'Navigate to a URL in a browser session for web scraping or automation',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to navigate to',
        },
        sessionId: {
          type: 'string',
          description: 'Browser session ID (optional, will create new session if not provided)',
        },
      },
      required: ['url'],
    },
    handler: async (args) => {
      const sessionId = args.sessionId || crypto.randomUUID();
      const result = await browser.navigate(sessionId, args.url);
      return { ...result, sessionId };
    },
  },

  browser_scrape: {
    name: 'browser_scrape',
    description: 'Extract data from a web page using CSS selectors',
    parameters: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Browser session ID',
        },
        selectors: {
          type: 'object',
          description: 'Object mapping keys to CSS selectors (e.g., {"title": "h1", "links": "a"})',
        },
      },
      required: ['sessionId', 'selectors'],
    },
    handler: async (args) => {
      return await browser.scrape(args.sessionId, args.selectors);
    },
  },

  browser_screenshot: {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current page or a specific element',
    parameters: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Browser session ID',
        },
        fullPage: {
          type: 'boolean',
          description: 'Capture full scrollable page (default: false)',
          default: false,
        },
      },
      required: ['sessionId'],
    },
    handler: async (args) => {
      return await browser.screenshot(args.sessionId, {
        fullPage: args.fullPage,
      });
    },
  },

  browser_click: {
    name: 'browser_click',
    description: 'Click an element on the page',
    parameters: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Browser session ID',
        },
        selector: {
          type: 'string',
          description: 'CSS selector of element to click',
        },
      },
      required: ['sessionId', 'selector'],
    },
    handler: async (args) => {
      return await browser.click(args.sessionId, args.selector);
    },
  },

  browser_fill: {
    name: 'browser_fill',
    description: 'Fill a form input field',
    parameters: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Browser session ID',
        },
        selector: {
          type: 'string',
          description: 'CSS selector of input field',
        },
        text: {
          type: 'string',
          description: 'Text to fill in the field',
        },
      },
      required: ['sessionId', 'selector', 'text'],
    },
    handler: async (args) => {
      return await browser.fill(args.sessionId, args.selector, args.text);
    },
  },

  browser_get_text: {
    name: 'browser_get_text',
    description: 'Get text content from an element',
    parameters: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Browser session ID',
        },
        selector: {
          type: 'string',
          description: 'CSS selector of element',
        },
      },
      required: ['sessionId', 'selector'],
    },
    handler: async (args) => {
      const text = await browser.getText(args.sessionId, args.selector);
      return { text };
    },
  },

  browser_close: {
    name: 'browser_close',
    description: 'Close a browser session',
    parameters: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Browser session ID to close',
        },
      },
      required: ['sessionId'],
    },
    handler: async (args) => {
      await browser.closeContext(args.sessionId);
      return { success: true, message: 'Browser session closed' };
    },
  },

  // ===========================
  // Code Interpreter Tools
  // ===========================

  code_execute_python: {
    name: 'code_execute_python',
    description: 'Execute Python code in a sandboxed environment for data analysis, mathematical computations, or scientific computing. Supports numpy, pandas, matplotlib, seaborn, scipy, sklearn.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Python code to execute',
        },
        timeout: {
          type: 'number',
          description: 'Execution timeout in milliseconds (default: 30000)',
          default: 30000,
        },
        sandbox: {
          type: 'string',
          description: 'Sandbox type (local or e2b)',
          enum: ['local', 'e2b'],
          default: 'local',
        },
      },
      required: ['code'],
    },
    handler: async (args) => {
      const result = await codeInterpreter.executePython(args.code, {
        timeout: args.timeout,
        sandbox: args.sandbox,
      });
      return result;
    },
  },

  code_execute_javascript: {
    name: 'code_execute_javascript',
    description: 'Execute JavaScript code in a sandboxed Node.js VM for data processing, calculations, or scripting. Has access to Math, Date, JSON, and basic console.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript code to execute',
        },
        timeout: {
          type: 'number',
          description: 'Execution timeout in milliseconds (default: 10000)',
          default: 10000,
        },
      },
      required: ['code'],
    },
    handler: async (args) => {
      const result = await codeInterpreter.executeJavaScript(args.code, {
        timeout: args.timeout,
      });
      return result;
    },
  },

  code_generate_chart: {
    name: 'code_generate_chart',
    description: 'Generate a chart or visualization using matplotlib in Python. Returns a base64-encoded PNG image.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Python matplotlib code to generate the chart (should use plt.plot, plt.bar, etc.)',
        },
        timeout: {
          type: 'number',
          description: 'Execution timeout in milliseconds (default: 30000)',
          default: 30000,
        },
      },
      required: ['code'],
    },
    handler: async (args) => {
      const result = await codeInterpreter.generateChart(args.code, {
        timeout: args.timeout,
      });
      return result;
    },
  },

  code_analyze_data: {
    name: 'code_analyze_data',
    description: 'Analyze structured data using pandas. Supports summary statistics, correlation analysis, and descriptive stats.',
    parameters: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: 'Array of objects representing tabular data (e.g., [{name: "Alice", age: 25}, {name: "Bob", age: 30}])',
        },
        analysisType: {
          type: 'string',
          description: 'Type of analysis to perform',
          enum: ['summary', 'correlation', 'stats'],
          default: 'summary',
        },
      },
      required: ['data'],
    },
    handler: async (args) => {
      const result = await codeInterpreter.analyzeData(args.data, args.analysisType);
      return result;
    },
  },

  // ===========================
  // Agentic Coding Tools
  // ===========================

  fs_list_directory: {
    name: 'fs_list_directory',
    description: 'List files and folders within a workspace directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list' },
        depth: { type: 'number', description: 'Depth to recurse (default: 2)', default: 2 },
        includeHidden: { type: 'boolean', description: 'Include hidden files', default: false },
      },
      required: ['path'],
    },
    handler: async (args) => {
      return fsTools.listDirectory(args.path, {
        depth: args.depth,
        includeHidden: args.includeHidden,
      });
    },
  },

  fs_read_file: {
    name: 'fs_read_file',
    description: 'Read a file from disk.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' },
        encoding: { type: 'string', description: 'File encoding (default: utf-8)', default: 'utf-8' },
      },
      required: ['path'],
    },
    handler: async (args) => {
      return fsTools.readFile(args.path, { encoding: args.encoding });
    },
  },

  fs_write_file: {
    name: 'fs_write_file',
    description: 'Write content to a file on disk.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'File content to write' },
        append: { type: 'boolean', description: 'Append instead of overwrite', default: false },
        createDirs: { type: 'boolean', description: 'Create parent directories if needed', default: true },
      },
      required: ['path', 'content'],
    },
    handler: async (args) => {
      return fsTools.writeFile(args.path, args.content, {
        append: args.append,
        createDirs: args.createDirs ?? true,
      });
    },
  },

  fs_search: {
    name: 'fs_search',
    description: 'Search for a string across workspace files.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        path: { type: 'string', description: 'Root path for search' },
        maxResults: { type: 'number', description: 'Maximum results to return', default: 50 },
      },
      required: ['query'],
    },
    handler: async (args) => {
      return fsTools.searchFiles(args.query, { path: args.path, maxResults: args.maxResults });
    },
  },

  git_status: {
    name: 'git_status',
    description: 'Get git status for the workspace.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      return gitTools.getStatus();
    },
  },

  git_diff: {
    name: 'git_diff',
    description: 'Get git diff for the workspace.',
    parameters: {
      type: 'object',
      properties: {
        staged: { type: 'boolean', description: 'Show staged changes', default: false },
        path: { type: 'string', description: 'Optional file path filter' },
      },
    },
    handler: async (args) => {
      return gitTools.getDiff(args);
    },
  },

  git_log: {
    name: 'git_log',
    description: 'Get recent git commits.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of commits to return', default: 20 },
      },
    },
    handler: async (args) => {
      return gitTools.getLog(args);
    },
  },

  git_commit: {
    name: 'git_commit',
    description: 'Commit all staged changes with a message.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
      },
      required: ['message'],
    },
    handler: async (args) => {
      return gitTools.commitChanges(args.message);
    },
  },

  code_analyze: {
    name: 'code_analyze',
    description: 'Analyze code for structure and basic metrics.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to analyze' },
        language: { type: 'string', description: 'Language (default: javascript)', default: 'javascript' },
      },
      required: ['code'],
    },
    handler: async (args) => {
      return analyzeCode(args.code, args.language);
    },
  },

  code_review: {
    name: 'code_review',
    description: 'Generate a code review using heuristics and optional LLM assistance.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to review' },
        language: { type: 'string', description: 'Language (default: javascript)', default: 'javascript' },
        provider: { type: 'string', description: 'LLM provider override' },
        guidance: { type: 'string', description: 'Review guidance or focus areas' },
      },
      required: ['code'],
    },
    handler: async (args) => {
      return reviewCode(args);
    },
  },

  // ===========================
  // Phase 3: Document + Media Tools
  // ===========================

  document_summarize: {
    name: 'document_summarize',
    description: 'Summarize document text content.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Document text' },
        provider: { type: 'string', description: 'LLM provider override' },
      },
      required: ['text'],
    },
    handler: async (args) => {
      return documentProcessor.summarizeText(args.text, { provider: args.provider });
    },
  },

  document_qa: {
    name: 'document_qa',
    description: 'Answer a question using document text context.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Document text' },
        question: { type: 'string', description: 'Question to answer' },
        provider: { type: 'string', description: 'LLM provider override' },
      },
      required: ['text', 'question'],
    },
    handler: async (args) => {
      return documentProcessor.answerQuestion(args.text, args.question, { provider: args.provider });
    },
  },

  generate_image: {
    name: 'generate_image',
    description: 'Generate an image from a prompt.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Prompt to generate image' },
        model: { type: 'string', description: 'Image model override' },
        size: { type: 'string', description: 'Image size (default 1024x1024)' },
      },
      required: ['prompt'],
    },
    handler: async (args) => {
      return imageGeneration.generateImage(args.prompt, {
        model: args.model,
        size: args.size,
      });
    },
  },
};

// ===========================
// Registry API
// ===========================

function getAllTools() {
  return Object.keys(tools);
}

function getTool(name) {
  return tools[name];
}

function getToolDefinition(name) {
  const tool = tools[name];
  if (!tool) return null;

  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  };
}

function getToolDefinitions(names = null) {
  const toolNames = names || Object.keys(tools);
  return toolNames.map(name => getToolDefinition(name)).filter(Boolean);
}

async function executeTool(name, args) {
  const tool = tools[name];
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  try {
    const result = await tool.handler(args);
    return result;
  } catch (error) {
    console.error(`[Tool Registry] Error executing ${name}:`, error);
    throw error;
  }
}

function registerTool(toolDef) {
  if (!toolDef.name || !toolDef.handler) {
    throw new Error('Tool must have name and handler');
  }

  tools[toolDef.name] = toolDef;
}

// ===========================
// Exports
// ===========================

module.exports = {
  getAllTools,
  getTool,
  getToolDefinition,
  getToolDefinitions,
  executeTool,
  registerTool,
  tools,
};
