/**
 * 🎤 Voice Synthesis Service
 * 
 * Generates AI voices for podcast with support for multiple providers.
 * Includes voice cloning and multi-speaker synthesis.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Voice profiles for each character
const VOICE_PROFILES = {
  creator: {
    provider: 'elevenlabs',
    voiceId: null, // Set after cloning
    name: 'Creator',
    settings: { stability: 0.7, similarity_boost: 0.8, style: 0.3 }
  },
  gemini: {
    provider: 'elevenlabs',
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - British, calm
    name: 'Gemini',
    settings: { stability: 0.8, similarity_boost: 0.7, style: 0.2 }
  },
  claude: {
    provider: 'elevenlabs',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Warm, thoughtful
    name: 'Claude',
    settings: { stability: 0.6, similarity_boost: 0.75, style: 0.4 }
  },
  codex: {
    provider: 'elevenlabs',
    voiceId: 'VR6AewLTigWG4xSOukaG', // Arnold - Energetic
    name: 'Codex',
    settings: { stability: 0.5, similarity_boost: 0.6, style: 0.6 }
  },
  grok: {
    provider: 'elevenlabs',
    voiceId: 'ODq5zmih8GrVes37Dizd', // Patrick - Sarcastic
    name: 'Grok',
    settings: { stability: 0.7, similarity_boost: 0.65, style: 0.5 }
  }
};

/**
 * ElevenLabs Voice Provider
 */
class ElevenLabsProvider {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'api.elevenlabs.io';
    this.model = 'eleven_multilingual_v2';
  }

  /**
   * Generate speech from text
   */
  async textToSpeech(text, voiceId, settings = {}) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        text,
        model_id: this.model,
        voice_settings: {
          stability: settings.stability || 0.5,
          similarity_boost: settings.similarity_boost || 0.75,
          style: settings.style || 0.0,
          use_speaker_boost: true
        }
      });

      const options = {
        hostname: this.baseUrl,
        path: `/v1/text-to-speech/${voiceId}`,
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        }
      };

      const req = https.request(options, (res) => {
        if (res.statusCode !== 200) {
          let error = '';
          res.on('data', chunk => error += chunk);
          res.on('end', () => reject(new Error(`ElevenLabs error: ${res.statusCode} - ${error}`)));
          return;
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Get available voices
   */
  async getVoices() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: '/v1/voices',
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Clone a voice from audio samples
   */
  async cloneVoice(name, files, description = '') {
    // This requires form-data, simplified version
    console.log(`[Voice] Voice cloning requires uploading audio samples for: ${name}`);
    console.log('[Voice] Use ElevenLabs web interface or provide audio files');
    return null;
  }
}

/**
 * OpenAI TTS Provider (Fallback)
 */
class OpenAITTSProvider {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  async textToSpeech(text, voice = 'alloy') {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3'
      });

      const options = {
        hostname: 'api.openai.com',
        path: '/v1/audio/speech',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      };

      const req = https.request(options, (res) => {
        if (res.statusCode !== 200) {
          let error = '';
          res.on('data', chunk => error += chunk);
          res.on('end', () => reject(new Error(`OpenAI TTS error: ${error}`)));
          return;
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}

/**
 * Main Voice Synthesis Service
 */
class VoiceSynthesizer {
  constructor(options = {}) {
    this.elevenlabs = new ElevenLabsProvider(options.elevenLabsKey);
    this.openai = new OpenAITTSProvider(options.openaiKey);
    this.profiles = { ...VOICE_PROFILES, ...options.profiles };
    this.outputDir = options.outputDir || path.join(__dirname, '..', '..', 'podcast', 'audio');
  }

  /**
   * Synthesize speech for a single line
   */
  async synthesizeLine(speaker, text, options = {}) {
    const profile = this.profiles[speaker.toLowerCase()];
    
    if (!profile) {
      console.warn(`[Voice] Unknown speaker: ${speaker}, using default`);
      return this.synthesizeWithOpenAI(text, 'alloy');
    }

    try {
      if (profile.provider === 'elevenlabs' && profile.voiceId) {
        return await this.elevenlabs.textToSpeech(text, profile.voiceId, profile.settings);
      } else {
        // Fallback to OpenAI
        const openaiVoices = { gemini: 'onyx', claude: 'nova', codex: 'echo', grok: 'fable' };
        return await this.openai.textToSpeech(text, openaiVoices[speaker] || 'alloy');
      }
    } catch (error) {
      console.error(`[Voice] Synthesis error for ${speaker}:`, error.message);
      throw error;
    }
  }

  /**
   * Synthesize entire dialogue
   */
  async synthesizeDialogue(dialogue, outputDir = null) {
    const dir = outputDir || this.outputDir;
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const audioFiles = [];

    for (let i = 0; i < dialogue.length; i++) {
      const { speaker, line } = dialogue[i];
      const filename = `${String(i).padStart(3, '0')}_${speaker}.mp3`;
      const filepath = path.join(dir, filename);

      console.log(`[Voice] Synthesizing ${i + 1}/${dialogue.length}: ${speaker}`);

      try {
        const audio = await this.synthesizeLine(speaker, line);
        fs.writeFileSync(filepath, audio);
        
        audioFiles.push({
          index: i,
          speaker,
          line,
          file: filepath,
          duration: null // Would need audio analysis
        });
      } catch (error) {
        console.error(`[Voice] Failed to synthesize line ${i}: ${error.message}`);
        audioFiles.push({
          index: i,
          speaker,
          line,
          file: null,
          error: error.message
        });
      }

      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    return audioFiles;
  }

  /**
   * Synthesize episode from script
   */
  async synthesizeEpisode(script, episodeDir) {
    const allDialogue = [];
    
    // Flatten all dialogue from segments
    for (const segment of script.segments) {
      if (segment.dialogue) {
        allDialogue.push(...segment.dialogue);
      }
    }

    const audioDir = path.join(episodeDir, 'audio');
    return await this.synthesizeDialogue(allDialogue, audioDir);
  }
}

/**
 * Audio mixing utilities (requires FFmpeg)
 */
const AudioMixer = {
  /**
   * Concatenate audio files
   */
  async concatenate(files, output) {
    const { exec } = require('child_process');
    
    // Create file list
    const listPath = output + '.list';
    const listContent = files.map(f => `file '${f}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    return new Promise((resolve, reject) => {
      exec(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy "${output}"`, (error, stdout, stderr) => {
        fs.unlinkSync(listPath);
        if (error) reject(error);
        else resolve(output);
      });
    });
  },

  /**
   * Add background music
   */
  async addBackgroundMusic(voiceTrack, musicTrack, output, musicVolume = 0.15) {
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const cmd = `ffmpeg -i "${voiceTrack}" -i "${musicTrack}" -filter_complex "[1:a]volume=${musicVolume}[music];[0:a][music]amix=inputs=2:duration=longest" "${output}"`;
      exec(cmd, (error) => {
        if (error) reject(error);
        else resolve(output);
      });
    });
  },

  /**
   * Add silence between clips
   */
  async addSilence(inputFile, outputFile, silenceMs = 500) {
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const cmd = `ffmpeg -i "${inputFile}" -af "apad=pad_dur=${silenceMs}ms" "${outputFile}"`;
      exec(cmd, (error) => {
        if (error) reject(error);
        else resolve(outputFile);
      });
    });
  }
};

module.exports = {
  VOICE_PROFILES,
  ElevenLabsProvider,
  OpenAITTSProvider,
  VoiceSynthesizer,
  AudioMixer
};
