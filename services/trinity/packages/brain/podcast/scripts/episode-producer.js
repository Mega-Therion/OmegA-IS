/**
 * 🎬 Episode Producer
 * 
 * Combines script, voice synthesis, and audio production
 * to create complete podcast episodes.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Production config
const CONFIG = {
  introMusic: 'assets/music/intro.mp3',
  outroMusic: 'assets/music/outro.mp3',
  transitionSound: 'assets/sfx/transition.mp3',
  silenceBetweenLines: 300, // ms
  silenceBetweenSegments: 800, // ms
  backgroundMusicVolume: 0.08,
  outputFormat: 'mp3',
  bitrate: '192k'
};

/**
 * Episode Producer
 */
class EpisodeProducer {
  constructor(options = {}) {
    this.config = { ...CONFIG, ...options.config };
    this.workDir = options.workDir || path.join(__dirname, '..', '..', 'podcast', 'work');
    this.outputDir = options.outputDir || path.join(__dirname, '..', '..', 'podcast', 'episodes');
    
    // Ensure directories exist
    [this.workDir, this.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Produce a complete episode from script
   */
  async produceEpisode(script, audioFiles) {
    const episodeId = `${script.date}-ep${script.episode}`;
    const episodeDir = path.join(this.outputDir, episodeId);
    
    if (!fs.existsSync(episodeDir)) {
      fs.mkdirSync(episodeDir, { recursive: true });
    }

    console.log(`[Producer] Starting production for: ${script.title}`);

    try {
      // Step 1: Add silence between lines
      const paddedFiles = await this.addSilencePadding(audioFiles);
      
      // Step 2: Group by segment and add transitions
      const segmentFiles = await this.buildSegments(script.segments, paddedFiles);
      
      // Step 3: Concatenate all segments
      const voiceTrack = path.join(episodeDir, 'voice-track.mp3');
      await this.concatenateAudio(segmentFiles, voiceTrack);
      
      // Step 4: Add intro/outro music
      const finalTrack = path.join(episodeDir, 'episode.mp3');
      await this.addIntroOutro(voiceTrack, finalTrack);
      
      // Step 5: Generate metadata
      const metadata = this.generateMetadata(script, finalTrack);
      fs.writeFileSync(
        path.join(episodeDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      // Step 6: Generate RSS entry
      const rssEntry = this.generateRSSEntry(script, metadata);
      
      console.log(`[Producer] Episode complete: ${finalTrack}`);
      
      return {
        episodeId,
        directory: episodeDir,
        audioFile: finalTrack,
        metadata,
        rssEntry
      };
      
    } catch (error) {
      console.error('[Producer] Production failed:', error);
      throw error;
    }
  }

  /**
   * Add silence padding between audio files
   */
  async addSilencePadding(audioFiles) {
    const paddedFiles = [];
    
    for (const file of audioFiles) {
      if (!file.file || !fs.existsSync(file.file)) {
        continue;
      }

      const paddedPath = file.file.replace('.mp3', '-padded.mp3');
      
      try {
        // Add silence at the end
        await execAsync(
          `ffmpeg -y -i "${file.file}" -af "apad=pad_dur=${this.config.silenceBetweenLines}ms" "${paddedPath}"`
        );
        paddedFiles.push({ ...file, paddedFile: paddedPath });
      } catch (error) {
        console.warn(`[Producer] Failed to pad: ${file.file}`);
        paddedFiles.push(file);
      }
    }
    
    return paddedFiles;
  }

  /**
   * Build audio for each segment
   */
  async buildSegments(segments, audioFiles) {
    const segmentFiles = [];
    let audioIndex = 0;
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentAudioFiles = [];
      
      // Get audio files for this segment's dialogue
      for (let j = 0; j < (segment.dialogue?.length || 0); j++) {
        if (audioIndex < audioFiles.length) {
          const file = audioFiles[audioIndex].paddedFile || audioFiles[audioIndex].file;
          if (file && fs.existsSync(file)) {
            segmentAudioFiles.push(file);
          }
          audioIndex++;
        }
      }
      
      if (segmentAudioFiles.length === 0) {
        continue;
      }
      
      // Concatenate segment audio
      const segmentFile = path.join(this.workDir, `segment-${i}.mp3`);
      await this.concatenateAudio(segmentAudioFiles, segmentFile);
      
      // Add transition sound between segments (except first)
      if (i > 0 && fs.existsSync(this.config.transitionSound)) {
        const withTransition = path.join(this.workDir, `segment-${i}-trans.mp3`);
        await this.prependAudio(this.config.transitionSound, segmentFile, withTransition);
        segmentFiles.push(withTransition);
      } else {
        segmentFiles.push(segmentFile);
      }
    }
    
    return segmentFiles;
  }

  /**
   * Concatenate multiple audio files
   */
  async concatenateAudio(files, output) {
    const validFiles = files.filter(f => f && fs.existsSync(f));
    
    if (validFiles.length === 0) {
      throw new Error('No valid audio files to concatenate');
    }
    
    if (validFiles.length === 1) {
      fs.copyFileSync(validFiles[0], output);
      return output;
    }
    
    // Create file list for ffmpeg
    const listPath = path.join(this.workDir, 'concat-list.txt');
    const listContent = validFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(listPath, listContent);
    
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c:a libmp3lame -b:a ${this.config.bitrate} "${output}"`
    );
    
    fs.unlinkSync(listPath);
    return output;
  }

  /**
   * Prepend audio to another file
   */
  async prependAudio(prefix, main, output) {
    await this.concatenateAudio([prefix, main], output);
    return output;
  }

  /**
   * Add intro and outro music
   */
  async addIntroOutro(voiceTrack, output) {
    const hasIntro = fs.existsSync(this.config.introMusic);
    const hasOutro = fs.existsSync(this.config.outroMusic);
    
    if (!hasIntro && !hasOutro) {
      fs.copyFileSync(voiceTrack, output);
      return output;
    }
    
    const filesToConcat = [];
    
    if (hasIntro) {
      filesToConcat.push(this.config.introMusic);
    }
    
    filesToConcat.push(voiceTrack);
    
    if (hasOutro) {
      filesToConcat.push(this.config.outroMusic);
    }
    
    await this.concatenateAudio(filesToConcat, output);
    return output;
  }

  /**
   * Generate episode metadata
   */
  generateMetadata(script, audioFile) {
    let duration = 0;
    
    try {
      // Get actual duration using ffprobe
      const stats = fs.statSync(audioFile);
      duration = Math.round(stats.size / (192000 / 8)); // Rough estimate from bitrate
    } catch (e) {
      duration = script.duration_estimate_minutes * 60;
    }
    
    return {
      title: script.title,
      episode: script.episode,
      date: script.date,
      duration: duration,
      duration_formatted: this.formatDuration(duration),
      summary: script.summary,
      segments: script.segments.map(s => ({
        type: s.type,
        topic: s.topic
      })),
      audio_file: path.basename(audioFile),
      generated_at: new Date().toISOString(),
      characters: ['creator', 'gemini', 'claude', 'codex', 'grok']
    };
  }

  /**
   * Format duration as HH:MM:SS
   */
  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Generate RSS entry for podcast feed
   */
  generateRSSEntry(script, metadata) {
    return {
      title: script.title,
      description: script.summary,
      pubDate: new Date(script.date).toUTCString(),
      duration: metadata.duration_formatted,
      enclosure: {
        url: `https://your-domain.com/podcast/episodes/${script.date}-ep${script.episode}/episode.mp3`,
        type: 'audio/mpeg',
        length: 0 // Set actual file size
      },
      guid: `episode-${script.episode}-${script.date}`,
      episode: script.episode,
      season: 1
    };
  }

  /**
   * Update podcast RSS feed
   */
  async updateRSSFeed(episodeEntry) {
    const feedPath = path.join(this.outputDir, 'podcast.rss');
    
    const feedTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>The Block Recap</title>
    <description>The gAIng Collective reviews the day's triumphs, disasters, and everything in between.</description>
    <language>en-us</language>
    <itunes:author>gAIng Collective</itunes:author>
    <itunes:category text="Technology"/>
    <itunes:explicit>false</itunes:explicit>
    <itunes:image href="https://your-domain.com/podcast/cover.jpg"/>
    <link>https://your-domain.com/podcast</link>
    <!-- EPISODES -->
  </channel>
</rss>`;

    let feed;
    
    if (fs.existsSync(feedPath)) {
      feed = fs.readFileSync(feedPath, 'utf-8');
    } else {
      feed = feedTemplate;
    }

    const itemXml = `
    <item>
      <title>${episodeEntry.title}</title>
      <description><![CDATA[${episodeEntry.description}]]></description>
      <pubDate>${episodeEntry.pubDate}</pubDate>
      <enclosure url="${episodeEntry.enclosure.url}" type="${episodeEntry.enclosure.type}" length="${episodeEntry.enclosure.length}"/>
      <guid isPermaLink="false">${episodeEntry.guid}</guid>
      <itunes:duration>${episodeEntry.duration}</itunes:duration>
      <itunes:episode>${episodeEntry.episode}</itunes:episode>
    </item>`;

    // Insert before </channel>
    feed = feed.replace('<!-- EPISODES -->', `${itemXml}\n    <!-- EPISODES -->`);
    
    fs.writeFileSync(feedPath, feed);
    console.log('[Producer] RSS feed updated');
    
    return feedPath;
  }
}

/**
 * Quick produce function
 */
async function produceFromScript(scriptPath, audioDir) {
  const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
  
  // Get audio files
  const audioFiles = [];
  const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3')).sort();
  
  for (const file of files) {
    audioFiles.push({ file: path.join(audioDir, file) });
  }
  
  const producer = new EpisodeProducer();
  return await producer.produceEpisode(script, audioFiles);
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node episode-producer.js <script.json> <audio-dir>');
    process.exit(1);
  }
  
  produceFromScript(args[0], args[1])
    .then(result => {
      console.log('Episode produced:', result.audioFile);
    })
    .catch(error => {
      console.error('Production failed:', error);
      process.exit(1);
    });
}

module.exports = {
  EpisodeProducer,
  produceFromScript,
  CONFIG
};
