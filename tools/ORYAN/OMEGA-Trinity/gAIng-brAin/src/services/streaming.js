/**
 * ⚡ Server-Sent Events (SSE) Streaming Response Handler
 * 
 * Enables real-time token streaming from AI providers.
 */

const { Transform } = require('stream');

/**
 * SSE Response helper class
 */
class SSEResponse {
  constructor(res) {
    this.res = res;
    this.isOpen = true;
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // For nginx
    
    // Handle client disconnect
    res.on('close', () => {
      this.isOpen = false;
    });
  }

  /**
   * Send an event
   */
  send(event, data) {
    if (!this.isOpen) return false;
    
    if (event) {
      this.res.write(`event: ${event}\n`);
    }
    
    const lines = JSON.stringify(data).split('\n');
    for (const line of lines) {
      this.res.write(`data: ${line}\n`);
    }
    
    this.res.write('\n');
    return true;
  }

  /**
   * Send a comment (keep-alive)
   */
  comment(text) {
    if (!this.isOpen) return false;
    this.res.write(`: ${text}\n\n`);
    return true;
  }

  /**
   * Send token chunk
   */
  token(content) {
    return this.send('token', { content });
  }

  /**
   * Send progress update
   */
  progress(data) {
    return this.send('progress', data);
  }

  /**
   * Send completion
   */
  done(data = {}) {
    this.send('done', data);
    this.end();
  }

  /**
   * Send error
   */
  error(message, code = 'ERROR') {
    this.send('error', { message, code });
    this.end();
  }

  /**
   * End the stream
   */
  end() {
    if (this.isOpen) {
      this.res.end();
      this.isOpen = false;
    }
  }
}

/**
 * Streaming chat endpoint handler
 */
async function streamingChatHandler(req, res) {
  const sse = new SSEResponse(res);
  
  try {
    const { prompt, agent = 'gemini', context = [] } = req.body;
    
    if (!prompt) {
      sse.error('Prompt is required', 'MISSING_PROMPT');
      return;
    }

    // Start streaming
    sse.progress({ status: 'connecting', agent });

    // Get streaming response from AI provider
    const stream = await getStreamingResponse(prompt, agent, context);
    
    let fullResponse = '';
    
    // Process stream chunks
    for await (const chunk of stream) {
      if (!sse.isOpen) break;
      
      const content = chunk.content || chunk.text || chunk;
      fullResponse += content;
      
      sse.token(content);
    }

    // Complete
    sse.done({ 
      agent, 
      full_response: fullResponse,
      tokens: fullResponse.split(/\s+/).length
    });

  } catch (error) {
    console.error('[SSE] Streaming error:', error);
    sse.error(error.message, 'STREAM_ERROR');
  }
}

/**
 * Get streaming response from AI provider
 */
async function getStreamingResponse(prompt, agent, context) {
  // This is a simulated streaming response
  // Replace with actual AI provider streaming API
  
  const mockResponse = `I'm ${agent}, and I'm responding to: "${prompt.substring(0, 50)}..."

This is a streaming response that demonstrates real-time token delivery. Each word appears as it's "generated" by the AI model.

The streaming capability provides a much better user experience because users can see the response forming in real-time rather than waiting for the entire response.`;

  // Create async generator for streaming
  async function* streamGenerator() {
    const words = mockResponse.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      // Simulate token generation delay
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
      
      yield { content: words[i] + ' ' };
    }
  }

  return streamGenerator();
}

/**
 * Transform stream for parsing SSE from upstream
 */
class SSEParser extends Transform {
  constructor() {
    super({ objectMode: true });
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    
    const lines = this.buffer.split('\n\n');
    this.buffer = lines.pop() || '';
    
    for (const eventBlock of lines) {
      const event = this.parseEvent(eventBlock);
      if (event) {
        this.push(event);
      }
    }
    
    callback();
  }

  parseEvent(block) {
    const lines = block.split('\n');
    const event = { type: 'message', data: null };
    
    for (const line of lines) {
      if (line.startsWith('event:')) {
        event.type = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        try {
          event.data = JSON.parse(line.slice(5).trim());
        } catch {
          event.data = line.slice(5).trim();
        }
      }
    }
    
    return event.data !== null ? event : null;
  }
}

/**
 * Express middleware for SSE endpoints
 */
function sseMiddleware(req, res, next) {
  res.sse = new SSEResponse(res);
  next();
}

/**
 * Keep-alive ping for long-running connections
 */
function startKeepAlive(sse, intervalMs = 15000) {
  const interval = setInterval(() => {
    if (!sse.isOpen) {
      clearInterval(interval);
      return;
    }
    sse.comment('keep-alive');
  }, intervalMs);
  
  return () => clearInterval(interval);
}

module.exports = {
  SSEResponse,
  SSEParser,
  sseMiddleware,
  streamingChatHandler,
  getStreamingResponse,
  startKeepAlive
};
