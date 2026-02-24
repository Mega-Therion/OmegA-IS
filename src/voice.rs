use std::sync::{Arc, Mutex};
use tts::{Error, Tts};

/// The Sovereign Voice of ΩmegΑ.
/// Provides local, private text-to-speech capabilities.
#[derive(Clone)]
pub struct SovereignVoice {
    tts: Arc<Mutex<Tts>>,
}

impl SovereignVoice {
    /// Initializes the TTS engine.
    pub fn new() -> Result<Self, Error> {
        let tts = Tts::default()?;
        Ok(Self {
            tts: Arc::new(Mutex::new(tts)),
        })
    }

    /// Speaks the provided text.
    pub fn speak(&self, text: &str) -> Result<(), Error> {
        let mut tts = self.tts.lock().unwrap();

        // Stop any current speech before starting new speech
        tts.stop()?;

        // Speak the text
        tts.speak(text, true)?;

        Ok(())
    }

    /// Stops any ongoing speech.
    pub fn stop(&self) -> Result<(), Error> {
        let mut tts = self.tts.lock().unwrap();
        tts.stop()?;
        Ok(())
    }
}

/// Helper function to create a global or shared voice instance if needed.
pub fn init_voice() -> Option<SovereignVoice> {
    match SovereignVoice::new() {
        Ok(voice) => Some(voice),
        Err(e) => {
            eprintln!("Failed to initialize Sovereign Voice: {:?}", e);
            None
        }
    }
}
