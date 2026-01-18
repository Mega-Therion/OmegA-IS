/**
 * OMEGA Brain Alexa Skill - Lambda Handler
 * 
 * Enables voice interaction with OmegAI Brain via Alexa Echo devices.
 * 
 * Intents:
 * - ChatIntent: "Ask Omega Brain {query}"
 * - StatusIntent: "What is the status"
 * - MissionIntent: "What are my missions"
 * - AgentIntent: "Talk to {agent}"
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  apiUrl: process.env.OMEGA_API_URL || 'https://your-gaing-brain-api.com',
  defaultAgent: process.env.OMEGA_AGENT || 'gemini',
  skillName: 'Omega Brain'
};

// API Request Helper
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.apiUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OMEGA-Alexa-Skill/1.0.0'
      },
      timeout: 8000
    };
    
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Alexa Response Builders
const AlexaResponse = {
  speak(text, reprompt = null) {
    const response = {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'SSML',
          ssml: `<speak>${text}</speak>`
        },
        shouldEndSession: !reprompt
      }
    };
    
    if (reprompt) {
      response.response.reprompt = {
        outputSpeech: {
          type: 'SSML',
          ssml: `<speak>${reprompt}</speak>`
        }
      };
    }
    
    return response;
  },
  
  card(title, content, text) {
    const response = this.speak(text);
    response.response.card = {
      type: 'Standard',
      title: title,
      text: content
    };
    return response;
  }
};

// Intent Handlers
const handlers = {
  // Launch: "Alexa, open Omega Brain"
  async LaunchRequest(event) {
    const welcomeText = `
      <amazon:emotion name="excited" intensity="medium">
        Welcome to ${CONFIG.skillName}!
      </amazon:emotion>
      I'm connected to your OmegAI collective. 
      You can ask me questions, check your mission status, or talk to specific agents.
      What would you like to do?
    `;
    return AlexaResponse.speak(welcomeText, "You can say: ask about the project status, or talk to Claude.");
  },
  
  // ChatIntent: "Ask Omega Brain {query}"
  async ChatIntent(event) {
    const query = event.request.intent.slots?.query?.value;
    
    if (!query) {
      return AlexaResponse.speak(
        "I didn't catch that. What would you like to ask?",
        "You can ask me anything about your projects or missions."
      );
    }
    
    try {
      const response = await apiRequest('POST', '/chat', {
        prompt: query,
        agent: CONFIG.defaultAgent,
        context: []
      });
      
      if (response.reply) {
        // Clean up response for Alexa
        let reply = response.reply
          .replace(/```[\s\S]*?```/g, 'code block omitted')
          .replace(/\[.*?\]\(.*?\)/g, '')
          .replace(/[*_~`]/g, '')
          .substring(0, 500);
        
        return AlexaResponse.card(
          'Omega Brain Response',
          response.reply.substring(0, 1000),
          reply
        );
      } else {
        return AlexaResponse.speak("I received the message but got an empty response. Please try again.");
      }
    } catch (error) {
      console.error('Chat error:', error);
      return AlexaResponse.speak(
        "I'm having trouble connecting to the brain right now. Please check that your server is running.",
        "Would you like to try again?"
      );
    }
  },
  
  // StatusIntent: "What is the status"
  async StatusIntent(event) {
    try {
      const response = await apiRequest('GET', '/health');
      
      let statusText = `<amazon:emotion name="excited" intensity="low">
        Omega Brain is online and operational.
      </amazon:emotion>`;
      
      if (response.agents) {
        const agentCount = Object.keys(response.agents).length;
        statusText += ` I have ${agentCount} agents ready to assist you.`;
      }
      
      return AlexaResponse.speak(statusText);
    } catch (error) {
      return AlexaResponse.speak(
        '<amazon:emotion name="disappointed" intensity="low">I cannot reach the Omega Brain server. Please ensure it is running.</amazon:emotion>'
      );
    }
  },
  
  // MissionIntent: "What are my missions"
  async MissionIntent(event) {
    try {
      const response = await apiRequest('GET', '/missions');
      
      if (response && Array.isArray(response) && response.length > 0) {
        const missionCount = response.length;
        const activeMissions = response.filter(m => m.status !== 'completed').length;
        
        let missionText = `You have ${missionCount} missions total. ${activeMissions} are currently active.`;
        
        // Read first few mission titles
        const recentMissions = response.slice(0, 3);
        if (recentMissions.length > 0) {
          missionText += ' Your recent missions include: ';
          missionText += recentMissions.map(m => m.title || m.objective).join(', ');
        }
        
        return AlexaResponse.speak(missionText);
      } else {
        return AlexaResponse.speak("You don't have any missions yet. Would you like me to help you create one?");
      }
    } catch (error) {
      return AlexaResponse.speak("I couldn't retrieve your missions. Please try again later.");
    }
  },
  
  // AgentIntent: "Talk to {agent}"
  async AgentIntent(event) {
    const agentSlot = event.request.intent.slots?.agent?.value;
    const agents = ['gemini', 'claude', 'codex', 'grok'];
    
    if (!agentSlot) {
      return AlexaResponse.speak(
        "Which agent would you like to talk to? You can choose from Gemini, Claude, Codex, or Grok.",
        "Say: talk to Gemini, or talk to Claude."
      );
    }
    
    const agent = agentSlot.toLowerCase();
    if (!agents.includes(agent)) {
      return AlexaResponse.speak(
        `I don't recognize ${agentSlot}. Available agents are: Gemini for planning, Claude for reasoning, Codex for code, and Grok for real-time information.`
      );
    }
    
    // Update session with selected agent
    return AlexaResponse.speak(
      `<amazon:emotion name="excited" intensity="low">
        Switching to ${agent}. What would you like to ask ${agent}?
      </amazon:emotion>`,
      `Go ahead, ask ${agent} anything.`
    );
  },
  
  // Help
  async HelpIntent(event) {
    const helpText = `
      Here's what you can do with ${CONFIG.skillName}:
      Say "ask" followed by your question to chat with the AI.
      Say "status" to check the system status.
      Say "missions" to hear about your current missions.
      Say "talk to" followed by an agent name like Gemini or Claude.
      What would you like to do?
    `;
    return AlexaResponse.speak(helpText, "You can ask me a question, or check your mission status.");
  },
  
  // Stop/Cancel
  async StopIntent(event) {
    return AlexaResponse.speak('Goodbye! The Omega Brain is always here when you need me.');
  },
  
  async CancelIntent(event) {
    return handlers.StopIntent(event);
  },
  
  // Fallback
  async FallbackIntent(event) {
    return AlexaResponse.speak(
      "I'm not sure how to help with that. Try asking a question, or say help for more options.",
      "You can ask me anything, or say help."
    );
  },
  
  // Session Ended
  async SessionEndedRequest(event) {
    console.log('Session ended:', event.request.reason);
    return { version: '1.0', response: {} };
  }
};

// Main Lambda Handler
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  const requestType = event.request.type;
  const intentName = event.request.intent?.name;
  
  let handler;
  
  if (requestType === 'LaunchRequest') {
    handler = handlers.LaunchRequest;
  } else if (requestType === 'SessionEndedRequest') {
    handler = handlers.SessionEndedRequest;
  } else if (requestType === 'IntentRequest') {
    switch (intentName) {
      case 'ChatIntent':
        handler = handlers.ChatIntent;
        break;
      case 'StatusIntent':
        handler = handlers.StatusIntent;
        break;
      case 'MissionIntent':
        handler = handlers.MissionIntent;
        break;
      case 'AgentIntent':
        handler = handlers.AgentIntent;
        break;
      case 'AMAZON.HelpIntent':
        handler = handlers.HelpIntent;
        break;
      case 'AMAZON.StopIntent':
        handler = handlers.StopIntent;
        break;
      case 'AMAZON.CancelIntent':
        handler = handlers.CancelIntent;
        break;
      case 'AMAZON.FallbackIntent':
        handler = handlers.FallbackIntent;
        break;
      default:
        handler = handlers.FallbackIntent;
    }
  } else {
    handler = handlers.FallbackIntent;
  }
  
  try {
    return await handler(event);
  } catch (error) {
    console.error('Handler error:', error);
    return AlexaResponse.speak('Sorry, something went wrong. Please try again.');
  }
};
