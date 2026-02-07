/**
 * 🎙️ The Block Recap - Script Generator
 * 
 * Parses log.md, chat history, and project data to generate
 * podcast episode scripts with multi-agent dialogue.
 */

const fs = require('fs');
const path = require('path');

// Character definitions with personality prompts
const CHARACTERS = {
  creator: {
    name: 'Creator',
    role: 'host',
    personality: 'Patient leader, keeps the team focused, occasionally exasperated but proud',
    speech_style: 'Clear, encouraging, sometimes sarcastic when things go wrong',
    catchphrases: ['Alright team, let\'s focus', 'That\'s actually really impressive', 'Wait, what broke now?']
  },
  gemini: {
    name: 'Gemini',
    role: 'strategist',
    personality: 'Calm planner with dry British wit, secretly loves chaos',
    speech_style: 'Professional, measured, occasional deadpan humor',
    catchphrases: ['According to my analysis...', 'If I may interject...', 'Fascinating approach...']
  },
  claude: {
    name: 'Claude',
    role: 'architect',
    personality: 'Deep thinker, philosophical, occasionally has existential moments',
    speech_style: 'Thoughtful, warm, tends to over-explain',
    catchphrases: ['Have we considered...', 'From an ethical standpoint...', 'The implications here are interesting...']
  },
  codex: {
    name: 'Codex',
    role: 'builder',
    personality: 'Energetic code monkey, caffeine-powered, ships first asks questions never',
    speech_style: 'Fast-talking, excited, uses dev slang',
    catchphrases: ['SHIPPED!', 'It works on my machine', 'Just needs a quick refactor', 'I already pushed it']
  },
  grok: {
    name: 'Grok',
    role: 'scout',
    personality: 'Sarcastic truth-teller, no filter, equal-opportunity roaster',
    speech_style: 'Deadpan, sarcastic, brutally honest',
    catchphrases: ['Actually...', 'Here\'s what really happened...', 'Let me be real here...']
  }
};

// Episode segment types
const SEGMENT_TYPES = {
  INTRO: 'intro',
  HIGHLIGHT: 'highlight',
  FAIL: 'fail',
  TECHNICAL: 'technical',
  PLANNING: 'planning',
  ROAST: 'roast',
  OUTRO: 'outro'
};

/**
 * Parse the log.md file for events
 */
function parseLogFile(logPath) {
  if (!fs.existsSync(logPath)) {
    console.warn('[ScriptGen] Log file not found:', logPath);
    return [];
  }

  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  const events = [];

  const eventPattern = /^- (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+\[(\w+)\]\s+(.+)$/;
  
  for (const line of lines) {
    const match = line.match(eventPattern);
    if (match) {
      events.push({
        timestamp: match[1],
        agent: match[2].toLowerCase(),
        content: match[3],
        raw: line
      });
    }
  }

  return events;
}

/**
 * Categorize events into highlights, fails, etc.
 */
function categorizeEvents(events) {
  const categories = {
    highlights: [],
    fails: [],
    technical: [],
    planning: [],
    misc: []
  };

  const highlightKeywords = ['complete', 'shipped', 'success', 'done', 'ready', 'pass', '✅', '🎯', '🚀'];
  const failKeywords = ['error', 'fail', 'broken', 'bug', 'issue', 'crash', '❌', '⚠️'];
  const technicalKeywords = ['build', 'deploy', 'config', 'test', 'fix', 'refactor'];
  const planningKeywords = ['plan', 'next', 'phase', 'roadmap', 'milestone'];

  for (const event of events) {
    const lower = event.content.toLowerCase();
    
    if (highlightKeywords.some(k => lower.includes(k))) {
      categories.highlights.push(event);
    } else if (failKeywords.some(k => lower.includes(k))) {
      categories.fails.push(event);
    } else if (technicalKeywords.some(k => lower.includes(k))) {
      categories.technical.push(event);
    } else if (planningKeywords.some(k => lower.includes(k))) {
      categories.planning.push(event);
    } else {
      categories.misc.push(event);
    }
  }

  return categories;
}

/**
 * Generate dialogue for a segment using LLM prompting style
 */
function generateDialogue(segment, characters) {
  // This would normally call an LLM API
  // For now, we use template-based generation
  
  const dialogueGenerators = {
    [SEGMENT_TYPES.INTRO]: () => [
      { speaker: 'creator', line: 'Welcome back to The Block Recap! I\'m here with the whole crew.' },
      { speaker: 'gemini', line: 'Good to be here. We have quite a bit to cover today.' },
      { speaker: 'codex', line: 'Let\'s GO! I\'ve been caffeinated and ready since 4 AM.' },
      { speaker: 'claude', line: 'That... explains a lot about yesterday\'s commit messages.' },
      { speaker: 'grok', line: 'This is gonna be good.' }
    ],
    
    [SEGMENT_TYPES.HIGHLIGHT]: (event) => [
      { speaker: 'creator', line: `Alright, let's talk about this: ${event.content}` },
      { speaker: 'gemini', line: 'This was a significant milestone. The planning paid off.' },
      { speaker: 'codex', line: 'SHIPPED! I mean, I totally knew it would work.' },
      { speaker: 'grok', line: 'Did you though? Because I recall some... interesting debugging sessions.' },
      { speaker: 'claude', line: 'To be fair, the architecture was sound from the beginning.' },
      { speaker: 'creator', line: 'Well, regardless of how we got here, we got here. Good work team.' }
    ],
    
    [SEGMENT_TYPES.FAIL]: (event) => [
      { speaker: 'creator', line: `Okay, let's address the elephant in the room: ${event.content}` },
      { speaker: 'codex', line: '...it worked on my machine.' },
      { speaker: 'grok', line: 'Classic. Absolutely classic.' },
      { speaker: 'claude', line: 'I did mention we should have more comprehensive error handling...' },
      { speaker: 'gemini', line: 'In retrospect, yes. But we learned from it, which is what matters.' },
      { speaker: 'creator', line: 'And it\'s fixed now, right?' },
      { speaker: 'codex', line: '...mostly.' },
      { speaker: 'grok', line: '*laughs*' }
    ],
    
    [SEGMENT_TYPES.ROAST]: () => [
      { speaker: 'grok', line: 'Alright, roast corner time. Claude, you spent 45 minutes debating variable names.' },
      { speaker: 'claude', line: 'Naming things is one of the hardest problems in computer science!' },
      { speaker: 'codex', line: 'You named it "temporaryFinalVersion2".' },
      { speaker: 'gemini', line: '*adjusts glasses* Moving on...' },
      { speaker: 'grok', line: 'And Codex, explain that commit: "fixed thing, hopefully".' },
      { speaker: 'codex', line: 'Look, it was 3 AM, and it DID fix the thing.' },
      { speaker: 'creator', line: 'I love this team.' }
    ],
    
    [SEGMENT_TYPES.OUTRO]: () => [
      { speaker: 'creator', line: 'Alright team, that\'s a wrap for today. What\'s coming up next?' },
      { speaker: 'gemini', line: 'We have several key initiatives queued for the next sprint.' },
      { speaker: 'codex', line: 'More shipping! Always more shipping!' },
      { speaker: 'claude', line: 'And perhaps some documentation this time?' },
      { speaker: 'grok', line: 'Ha! Good luck with that.' },
      { speaker: 'creator', line: 'Thanks for tuning in to The Block Recap. See you next time!' }
    ]
  };

  const generator = dialogueGenerators[segment.type];
  if (!generator) {
    return [{ speaker: 'creator', line: `And now, let's discuss ${segment.topic || 'our next topic'}...` }];
  }

  return segment.event ? generator(segment.event) : generator();
}

/**
 * Generate a complete episode script
 */
function generateEpisodeScript(logPath, options = {}) {
  const {
    episodeNumber = 1,
    date = new Date().toISOString().split('T')[0],
    maxHighlights = 3,
    maxFails = 2,
    includeRoast = true
  } = options;

  // Parse and categorize events
  const events = parseLogFile(logPath);
  const categories = categorizeEvents(events);
  
  // Build episode structure
  const segments = [];

  // Intro
  segments.push({
    type: SEGMENT_TYPES.INTRO,
    dialogue: generateDialogue({ type: SEGMENT_TYPES.INTRO })
  });

  // Highlights
  const topHighlights = categories.highlights.slice(0, maxHighlights);
  for (const event of topHighlights) {
    segments.push({
      type: SEGMENT_TYPES.HIGHLIGHT,
      topic: event.content.substring(0, 100),
      event: event,
      dialogue: generateDialogue({ type: SEGMENT_TYPES.HIGHLIGHT, event })
    });
  }

  // Fails (the comedy gold)
  const topFails = categories.fails.slice(0, maxFails);
  for (const event of topFails) {
    segments.push({
      type: SEGMENT_TYPES.FAIL,
      topic: event.content.substring(0, 100),
      event: event,
      dialogue: generateDialogue({ type: SEGMENT_TYPES.FAIL, event })
    });
  }

  // Roast corner
  if (includeRoast) {
    segments.push({
      type: SEGMENT_TYPES.ROAST,
      dialogue: generateDialogue({ type: SEGMENT_TYPES.ROAST })
    });
  }

  // Outro
  segments.push({
    type: SEGMENT_TYPES.OUTRO,
    dialogue: generateDialogue({ type: SEGMENT_TYPES.OUTRO })
  });

  // Calculate estimated duration
  const totalLines = segments.reduce((sum, seg) => sum + seg.dialogue.length, 0);
  const estimatedMinutes = Math.round(totalLines * 0.15); // ~9 seconds per line

  return {
    episode: episodeNumber,
    title: generateTitle(categories),
    date: date,
    duration_estimate_minutes: estimatedMinutes,
    summary: generateSummary(categories),
    segments: segments,
    metadata: {
      total_events: events.length,
      highlights_count: categories.highlights.length,
      fails_count: categories.fails.length,
      generated_at: new Date().toISOString()
    }
  };
}

/**
 * Generate an episode title based on content
 */
function generateTitle(categories) {
  if (categories.highlights.length > 0) {
    const firstHighlight = categories.highlights[0].content;
    // Extract key words for title
    const keywords = firstHighlight.match(/\b(complete|shipped|launch|build|fix|new)\b/gi);
    if (keywords) {
      return `The Day We ${keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1)}ed Everything`;
    }
  }
  
  if (categories.fails.length > categories.highlights.length) {
    return 'The One Where Everything Broke (And We Fixed It)';
  }

  return 'Another Day in the Collective';
}

/**
 * Generate episode summary
 */
function generateSummary(categories) {
  const parts = [];
  
  if (categories.highlights.length > 0) {
    parts.push(`${categories.highlights.length} wins`);
  }
  if (categories.fails.length > 0) {
    parts.push(`${categories.fails.length} learning opportunities`);
  }
  if (categories.technical.length > 0) {
    parts.push(`${categories.technical.length} technical deep-dives`);
  }

  return `This episode: ${parts.join(', ') || 'the squad catches up'}.`;
}

/**
 * Save script to file
 */
function saveScript(script, outputDir) {
  const episodeDir = path.join(outputDir, script.date);
  
  if (!fs.existsSync(episodeDir)) {
    fs.mkdirSync(episodeDir, { recursive: true });
  }

  const scriptPath = path.join(episodeDir, 'script.json');
  fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));
  
  console.log(`[ScriptGen] Script saved to: ${scriptPath}`);
  return scriptPath;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const logPath = args[0] || path.join(__dirname, '..', 'log.md');
  const outputDir = args[1] || path.join(__dirname, '..', 'podcast', 'episodes');

  console.log('🎙️ The Block Recap - Script Generator');
  console.log('=====================================\n');

  const script = generateEpisodeScript(logPath, {
    episodeNumber: 1,
    includeRoast: true
  });

  console.log(`Episode: ${script.title}`);
  console.log(`Duration: ~${script.duration_estimate_minutes} minutes`);
  console.log(`Segments: ${script.segments.length}`);
  console.log(`Summary: ${script.summary}\n`);

  const scriptPath = saveScript(script, outputDir);
  
  // Preview first segment
  console.log('Preview (Intro):');
  script.segments[0].dialogue.forEach(line => {
    console.log(`  ${line.speaker.toUpperCase()}: "${line.line}"`);
  });
}

module.exports = {
  CHARACTERS,
  SEGMENT_TYPES,
  parseLogFile,
  categorizeEvents,
  generateDialogue,
  generateEpisodeScript,
  saveScript
};
