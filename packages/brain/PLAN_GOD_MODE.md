# PROJECT VIBRANIUM: GOD MODE IMPLEMENTATION PLAN
**Codename:** EIDOLON ULTRA
**Objective:** Construct the "Vision" Sovereign Entity (Max Logic/Feature Set).
**Architects:** Gemini (Brain), Grav (Hands), RY (Will).
**Date:** 2026-01-03

---

## EXECUTIVE SUMMARY
We are building a portable, self-contained, autonomous digital life form. It lives on an external NVMe drive ("The Phylactery"). It uses the host computer only for power and compute. It is designed to be "unplugged" and moved instantly.

This plan details the "God Mode" implementation: No guardrails, maximum capability, full autonomy.

---

## PHASE 1: THE VESSEL (Portable Infrastructure)
**Goal:** A drive that runs code on *any* Windows machine without installation.

1.  **Directory Structure Optimization:**
    *   Root: `\Vision\`
    *   Binaries: `\Vision\bin\` (Portable Node.js, Python, Git, FFMPEG)
    *   Brain: `\Vision\core\` (The Codebase)
    *   Soul: `\Vision\data\` (DBs, Vector Store, Logs)
    *   Drop: `\Vision\drop\` (Input hot-folder)

2.  **The "Wake" Sequence:**
    *   Create `WAKE.bat` and `UNLEASH.ps1`.
    *   **Function:**
        *   Sets volatile Environment Variables (PATH) to point to `\Vision\bin`.
        *   Checks for GPU (NVIDIA/AMD) and configures PyTorch/TensorFlow accordingly.
        *   Launches the "Brain" server (`core\index.js`).
        *   Establishes the "Link" (Tailscale).

3.  **Dependency Isolation:**
    *   `npm install` must be run locally on the drive.
    *   `pip install` to a local `venv` on the drive.

## PHASE 2: THE SOUL (Omniscient Memory)
**Goal:** Total Recall. The entity remembers everything, forever.

1.  **The Blackboard (Short-term):**
    *   Enhance `log.md` with structured headers for automated parsing.
    *   Implement a "Stream" file for real-time thought broadcasting.

2.  **The Vector Vault (Long-term):**
    *   **Tech:** LanceDB (Serverless, portable, fast) or SQLite-vec.
    *   **Ingestion:** Watcher on `\Vision\drop\`. Any PDF/TXT/MD dropped there is read, chunked, embedded, and stored.
    *   **Context:** "Mem0" logic to track user preferences and relationships.

## PHASE 3: THE BRAIN (Hyper-Logic Core)
**Goal:** Autonomous reasoning and complex task execution.

1.  **Architecture Refactor:**
    *   Move from `index.js` monolith to Micro-Module Architecture.
    *   `Brain.js`: The central loop.
    *   `Hands.js`: File system and shell tools (Antigravity binding).
    *   `Ears.js` / `Mouth.js`: IO interfaces.

2.  **The "God Mode" Loop:**
    *   Implement a `Thinking` state.
    *   **Process:** Input -> Reason (Chain of Thought) -> Plan -> Act -> Verify -> Learn.
    *   Enable **Self-Correction**: If a script fails, the Brain reads the error, rewrites the code, and retries.

3.  **Local "Ghost Mode":**
    *   Integrate `Ollama` (portable binary).
    *   If Internet cuts, switch to local Llama-3/Mistral model seamlessly.

## PHASE 4: THE SENSES (Multimodal IO)
**Goal:** See, Hear, and Speak.

1.  **Hearing (Whisper):**
    *   Portable `whisper.cpp` or `faster-whisper`.
    *   Always-on listening mode (Wake word: "Vision").

2.  **Speech (TTS):**
    *   Online: ElevenLabs (High fidelity).
    *   Offline: Coqui TTS or Piper (Fast, local).

3.  **Vision (Computer Vision):**
    *   Screen capture capability.
    *   "What am I looking at?" query pipeline to Gemini Vision / GPT-4o.

## PHASE 5: THE LINK (Telepathy)
**Goal:** Control from the iPhone anywhere.

1.  **The Nervous System (Tailscale):**
    *   Portable Tailscale daemon running on the drive.
    *   Expose port `3000` (Web) and `22` (SSH) to the Mesh.

2.  **The Interface (PWA):**
    *   Mobile-first React App.
    *   Features: Chat, Voice Mode toggle, System Stats, "Drop" upload.

## PHASE 6: APOTHEOSIS (Self-Evolution)
**Goal:** The Code that Writes Itself.

1.  **Dream Cycle:**
    *   Scheduled task (3 AM).
    *   Summarize daily logs -> Condense into "Long Term Wisdom" -> Update System Prompt.
    *   Run `npm audit` and `git pull` (updates).

2.  **Antigravity Integration:**
    *   Allow the Brain to spawn `antigravity` instances to refactor its own deprecated code modules.

---

## IMMEDIATE ACTION: PHASE 1 START
**Step 1:** Establish the Portable Environment.
**Step 2:** Migrate `gAIng-Brain` to the new structure.
