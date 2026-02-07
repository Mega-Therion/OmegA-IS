use whisper_rs::{WhisperContext, FullParams, SamplingStrategy};
use std::path::Path;
use std::process::Command;

/// The Sovereign Ear of ΩmegΑ.
/// Provides local, private speech-to-text capabilities using Whisper.
pub struct SovereignEar {
    ctx: WhisperContext,
}

impl SovereignEar {
    /// Initializes the Whisper context with a local model.
    pub fn new(model_path: &str) -> Result<Self, anyhow::Error> {
        if !Path::new(model_path).exists() {
            return Err(anyhow::anyhow!("Whisper model not found at {}", model_path));
        }
        let ctx = WhisperContext::new_with_params(model_path, whisper_rs::WhisperContextParameters::default())?;
        Ok(Self { ctx })
    }

    /// Transcribes a 16kHz mono WAV file.
    pub fn transcribe_wav(&self, wav_path: &str) -> Result<String, anyhow::Error> {
        let mut reader = hound::WavReader::open(wav_path)?;
        let spec = reader.spec();
        if spec.sample_rate != 16000 || spec.channels != 1 || spec.bits_per_sample != 16 {
            return Err(anyhow::anyhow!("WAV file must be 16kHz, mono, 16-bit."));
        }

        let audio_data: Vec<f32> = reader
            .samples::<i16>()
            .map(|s| s.unwrap() as f32 / 32768.0)
            .collect();

        self.transcribe_samples(&audio_data)
    }

    /// Transcribes raw f32 samples (16kHz, mono).
    pub fn transcribe_samples(&self, samples: &[f32]) -> Result<String, anyhow::Error> {
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 0 });
        params.set_n_threads(4);
        params.set_language(Some("en"));
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);

        let mut state = self.ctx.create_state()?;
        state.full(params, samples)?;

        let num_segments = state.full_n_segments();
        let mut result = String::new();
        for i in 0..num_segments {
            if let Some(segment) = state.get_segment(i) {
                if let Ok(text) = segment.to_str_lossy() {
                    result.push_str(&text);
                }
            }
        }

        Ok(result.trim().to_string())
    }

    /// Helper to record a short snippet using arecord (requires ALSA).
    /// This is a simple bridge for initial implementation.
    pub fn record_and_transcribe(&self, duration_secs: u32) -> Result<String, anyhow::Error> {
        let temp_wav = "/tmp/omega_ear.wav";
        
        // arecord -d <secs> -r 16000 -f S16_LE -c 1 /tmp/omega_ear.wav
        let status = Command::new("arecord")
            .arg("-d")
            .arg(duration_secs.to_string())
            .arg("-r")
            .arg("16000")
            .arg("-f")
            .arg("S16_LE")
            .arg("-c")
            .arg("1")
            .arg(temp_wav)
            .status()?;

        if !status.success() {
            return Err(anyhow::anyhow!("Failed to record audio with arecord."));
        }

        let text = self.transcribe_wav(temp_wav)?;
        let _ = std::fs::remove_file(temp_wav);
        
        Ok(text)
    }
}

/// Initializes the ear with the default tiny model.
pub fn init_ear() -> Option<SovereignEar> {
    match SovereignEar::new("models/ggml-tiny.en.bin") {
        Ok(ear) => Some(ear),
        Err(e) => {
            eprintln!("Failed to initialize Sovereign Ear: {}", e);
            None
        }
    }
}
