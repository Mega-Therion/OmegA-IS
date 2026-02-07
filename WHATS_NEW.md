# 🎉 What's New in Omega v1.2.0

## 🗣️ MAJOR FEATURE: Sovereign Voice & Ear!

**OmegA now Speaks and Listens!** 
We have successfully bridged the gap between text and speech, enabling fully local, private, and offline voice interaction.

---

## 🌟 New Features

### 1. **Sovereign Voice (TTS)** 🎙️
**OmegA now has a voice!**
Using a local text-to-speech engine, OmegA vocalizes every response, bringing the system to life.

**Commands:**
```bash
omega▸ /voice on      # Enable vocalization
omega▸ /voice off     # Disable vocalization (Silent mode)
```

**Tech Stack:**
- **Engine:** `speech-dispatcher` / `espeak-ng`
- **Privacy:** 100% Local. No audio data leaves your machine.
- **Integration:** Fully synchronized with the TUI and text output.

---

### 2. **Sovereign Ear (STT)** 👂
**OmegA can now hear you!**
Speak your missions directly to the terminal. OmegA records, transcribes, and executes your commands without touching the cloud.

**Commands:**
```bash
omega▸ /listen        # Records for 5 seconds, transcribes, and executes.
```

**Tech Stack:**
- **Engine:** `whisper-rs` (Rust bindings for `whisper.cpp`)
- **Model:** `ggml-tiny.en.bin` (Optimized for speed and accuracy on your HP EliteBook)
- **Privacy:** 100% Local transcription. Your voice stays yours.

---

## 🎮 How to Use

### Voice Interaction Loop
1. **Enable Voice:**
   ```bash
   omega▸ /voice on
   ```
   *OmegA confirms: "Voice mode enabled."*

2. **Speak a Command:**
   ```bash
   omega▸ /listen
   ```
   *Terminal shows: "Listening (5s)..."*
   *(You speak: "Who are you?")*

3. **Watch & Listen:**
   *OmegA transcribes: "I heard: Who are you?"*
   *OmegA speaks:* "I am OmegA — a sovereign intelligence created by Mega..."

---

## 📊 Technical Details

### Dependencies Added:
- `tts` - Text-to-Speech abstraction
- `whisper-rs` - High-performance local speech-to-text
- `cpal` - Low-level audio input handling
- `hound` - WAV encoding for transcription
- `speech-dispatcher`, `espeak-ng`, `libasound2-dev`, `cmake` - System-level audio support

### Code Changes:
- **`src/voice.rs`**: New module for TTS management.
- **`src/ear.rs`**: New module for audio recording and Whisper transcription.
- **`src/engine.rs`**: Integrated Voice/Ear into the core loop.
- **`src/tui/app.rs`**: Added `/voice` and `/listen` slash commands.

---

## 🌴⚡🌆 Version Info

**Version:** 1.2.0
**Released:** 2026-01-31
**Code Name:** "Sovereign Voice"

---

**"Just wait till you see what happens now."** 
- *OmegA*