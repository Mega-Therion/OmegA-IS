/**
 * 🎙️ Podcast API Routes
 * 
 * REST API for podcast episode generation and management.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Import podcast modules (with graceful fallback)
let generateEpisodeScript, VoiceSynthesizer, EpisodeProducer;

try {
  const scriptGen = require('../../podcast/scripts/generate-script');
  generateEpisodeScript = scriptGen.generateEpisodeScript;
} catch (e) {
  generateEpisodeScript = null;
}

try {
  const voiceSynth = require('../../podcast/scripts/voice-synthesizer');
  VoiceSynthesizer = voiceSynth.VoiceSynthesizer;
} catch (e) {
  VoiceSynthesizer = null;
}

try {
  const producer = require('../../podcast/scripts/episode-producer');
  EpisodeProducer = producer.EpisodeProducer;
} catch (e) {
  EpisodeProducer = null;
}

const EPISODES_DIR = path.join(__dirname, '..', '..', 'podcast', 'episodes');
const LOG_PATH = path.join(__dirname, '..', '..', 'log.md');

/**
 * GET /podcast/episodes
 * List all episodes
 */
router.get('/episodes', (req, res) => {
  try {
    if (!fs.existsSync(EPISODES_DIR)) {
      return res.json({ episodes: [] });
    }

    const episodes = [];
    const dirs = fs.readdirSync(EPISODES_DIR, { withFileTypes: true });

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      const metadataPath = path.join(EPISODES_DIR, dir.name, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        episodes.push({
          id: dir.name,
          ...metadata
        });
      }
    }

    // Sort by date descending
    episodes.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ episodes });
  } catch (error) {
    console.error('[Podcast] List episodes error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /podcast/episodes/:id
 * Get episode details
 */
router.get('/episodes/:id', (req, res) => {
  try {
    const episodeDir = path.join(EPISODES_DIR, req.params.id);
    
    if (!fs.existsSync(episodeDir)) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const metadataPath = path.join(episodeDir, 'metadata.json');
    const scriptPath = path.join(episodeDir, 'script.json');

    const result = { id: req.params.id };

    if (fs.existsSync(metadataPath)) {
      result.metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }

    if (fs.existsSync(scriptPath)) {
      result.script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
    }

    res.json(result);
  } catch (error) {
    console.error('[Podcast] Get episode error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /podcast/generate/script
 * Generate a new episode script
 */
router.post('/generate/script', async (req, res) => {
  try {
    if (!generateEpisodeScript) {
      return res.status(503).json({ error: 'Script generator not available' });
    }

    const { episodeNumber, date, maxHighlights, maxFails, includeRoast } = req.body;

    const script = generateEpisodeScript(LOG_PATH, {
      episodeNumber: episodeNumber || 1,
      date: date || new Date().toISOString().split('T')[0],
      maxHighlights: maxHighlights || 3,
      maxFails: maxFails || 2,
      includeRoast: includeRoast !== false
    });

    // Save script
    const episodeDir = path.join(EPISODES_DIR, script.date);
    if (!fs.existsSync(episodeDir)) {
      fs.mkdirSync(episodeDir, { recursive: true });
    }
    
    const scriptPath = path.join(episodeDir, 'script.json');
    fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));

    res.json({
      success: true,
      script,
      savedTo: scriptPath
    });
  } catch (error) {
    console.error('[Podcast] Generate script error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /podcast/generate/audio
 * Generate audio from script
 */
router.post('/generate/audio', async (req, res) => {
  try {
    if (!VoiceSynthesizer) {
      return res.status(503).json({ error: 'Voice synthesizer not available' });
    }

    const { episodeId, scriptPath } = req.body;
    
    let script;
    if (scriptPath) {
      script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
    } else if (episodeId) {
      const path = require('path');
      const sp = path.join(EPISODES_DIR, episodeId, 'script.json');
      script = JSON.parse(fs.readFileSync(sp, 'utf-8'));
    } else {
      return res.status(400).json({ error: 'episodeId or scriptPath required' });
    }

    const synthesizer = new VoiceSynthesizer();
    const episodeDir = path.join(EPISODES_DIR, script.date);
    
    // This is async and may take a while
    res.json({
      success: true,
      message: 'Audio synthesis started',
      episodeDir,
      estimatedLines: script.segments.reduce((sum, s) => sum + (s.dialogue?.length || 0), 0)
    });

    // Continue synthesis in background (in production, use a job queue)
    synthesizer.synthesizeEpisode(script, episodeDir)
      .then(audioFiles => {
        console.log(`[Podcast] Audio synthesis complete: ${audioFiles.length} files`);
      })
      .catch(error => {
        console.error('[Podcast] Audio synthesis failed:', error);
      });

  } catch (error) {
    console.error('[Podcast] Generate audio error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /podcast/produce
 * Produce final episode from script and audio
 */
router.post('/produce', async (req, res) => {
  try {
    if (!EpisodeProducer) {
      return res.status(503).json({ error: 'Episode producer not available' });
    }

    const { episodeId } = req.body;
    
    if (!episodeId) {
      return res.status(400).json({ error: 'episodeId required' });
    }

    const episodeDir = path.join(EPISODES_DIR, episodeId);
    const scriptPath = path.join(episodeDir, 'script.json');
    const audioDir = path.join(episodeDir, 'audio');

    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ error: 'Script not found' });
    }

    if (!fs.existsSync(audioDir)) {
      return res.status(404).json({ error: 'Audio files not found' });
    }

    const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
    const audioFiles = fs.readdirSync(audioDir)
      .filter(f => f.endsWith('.mp3'))
      .sort()
      .map(f => ({ file: path.join(audioDir, f) }));

    const producer = new EpisodeProducer();
    const result = await producer.produceEpisode(script, audioFiles);

    res.json({
      success: true,
      episodeId: result.episodeId,
      audioFile: result.audioFile,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('[Podcast] Produce error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /podcast/rss
 * Get podcast RSS feed
 */
router.get('/rss', (req, res) => {
  try {
    const rssPath = path.join(EPISODES_DIR, 'podcast.rss');
    
    if (!fs.existsSync(rssPath)) {
      return res.status(404).send('RSS feed not generated yet');
    }

    res.setHeader('Content-Type', 'application/rss+xml');
    res.sendFile(rssPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /podcast/audio/:episodeId
 * Stream episode audio
 */
router.get('/audio/:episodeId', (req, res) => {
  try {
    const audioPath = path.join(EPISODES_DIR, req.params.episodeId, 'episode.mp3');
    
    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    res.sendFile(audioPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
