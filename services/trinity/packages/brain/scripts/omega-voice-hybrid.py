#!/usr/bin/env python3
import argparse
import collections
import os
import queue
import re
import subprocess
import sys
import time
import wave
import warnings
from pathlib import Path

import sounddevice as sd

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")

os.environ.setdefault("HUGGINGFACE_HUB_VERBOSITY", "error")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("HF_HUB_DISABLE_IMPLICIT_TOKEN", "1")
warnings.filterwarnings(
    "ignore",
    message="pkg_resources is deprecated as an API.*",
    category=UserWarning,
)
import webrtcvad


def strip_ansi(s: str) -> str:
    return ANSI_RE.sub("", s)


def transcribe(wav_path: str, model: str) -> str:
    from faster_whisper import WhisperModel
    try:
        from huggingface_hub.utils import logging as hf_logging

        hf_logging.set_verbosity_error()
    except Exception:
        pass

    wm = WhisperModel(model, device="cpu", compute_type="int8")
    segments, _ = wm.transcribe(wav_path)
    text_parts = []
    for seg in segments:
        if seg.text:
            text_parts.append(seg.text.strip())
    return " ".join(text_parts).strip()


def load_voice_profile(path: str):
    try:
        import numpy as np

        data = np.load(path)
        emb = data["embedding"]
        return emb
    except Exception:
        return None


def speaker_score(wav_path: str, profile_emb):
    if profile_emb is None:
        return None
    try:
        from resemblyzer import VoiceEncoder, preprocess_wav
        import numpy as np

        wav = preprocess_wav(wav_path)
        enc = VoiceEncoder()
        emb = enc.embed_utterance(wav)
        num = float(np.dot(emb, profile_emb))
        den = float(np.linalg.norm(emb) * np.linalg.norm(profile_emb) + 1e-9)
        return num / den
    except Exception:
        return None


def call_omega(prompt: str, api_url: str) -> str:
    omega_cli = Path(__file__).resolve().parents[1] / "cli" / "omega.js"
    env = os.environ.copy()
    env.setdefault("OMEGA_API_URL", api_url)
    env.setdefault("OMEGA_AGENT", "local-voice")
    env.setdefault("OMEGA_USE_TOOLS", "1")

    proc = subprocess.run(
        ["node", str(omega_cli), "chat", prompt],
        env=env,
        capture_output=True,
        text=True,
    )
    out = strip_ansi(proc.stdout).strip()
    if not out:
        return ""
    lines = [ln for ln in out.splitlines() if ln.strip()]
    if not lines:
        return ""
    for prefix in ("LOCAL:", "Response:"):
        for ln in reversed(lines):
            if prefix in ln:
                return ln.split(prefix, 1)[-1].strip()
    return lines[-1].strip()


def speak(text: str, voice_onnx: str, voice_json: str, out_wav: str):
    piper_bin = os.environ.get("PIPER_BIN") or str(
        Path.home() / ".venvs" / "omega-voice" / "bin" / "piper"
    )
    if not Path(piper_bin).exists():
        raise FileNotFoundError(f"piper not found at {piper_bin}")
    proc = subprocess.run(
        [piper_bin, "-m", voice_onnx, "-c", voice_json, "-f", out_wav],
        input=text,
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or "piper failed")


def play_wav(path: str):
    subprocess.run(["aplay", "-q", path], check=False)


def write_wav(path: str, pcm_bytes: bytes, sample_rate: int):
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)


def try_start_ptt_listener():
    try:
        from pynput import keyboard
    except Exception:
        return None, None

    state = {"active": False}

    def on_press(key):
        if key == keyboard.Key.space:
            state["active"] = True

    def on_release(key):
        if key == keyboard.Key.space:
            state["active"] = False

    listener = keyboard.Listener(on_press=on_press, on_release=on_release)
    listener.daemon = True
    listener.start()
    return listener, state


def pick_fallback_input_device():
    try:
        devices = sd.query_devices()
    except Exception:
        return None, None
    if not devices:
        return None, None
    for idx, dev in enumerate(devices):
        if dev.get("max_input_channels", 0) > 0:
            sr = int(dev.get("default_samplerate") or 16000)
            return idx, sr
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--api-url", default=os.environ.get("OMEGA_API_URL", "http://localhost:8081"))
    ap.add_argument("--stt-model", default=os.environ.get("OMEGA_STT_MODEL", "tiny"))
    ap.add_argument("--sample-rate", type=int, default=16000)
    ap.add_argument("--frame-ms", type=int, default=30)
    ap.add_argument("--vad", type=int, default=1, choices=[0, 1, 2, 3])
    ap.add_argument("--padding-ms", type=int, default=200)
    ap.add_argument("--silence-ms", type=int, default=300)
    ap.add_argument("--max-segment-ms", type=int, default=8000)
    ap.add_argument("--device", default=os.environ.get("OMEGA_AUDIO_DEVICE"))
    ap.add_argument(
        "--voice-onnx",
        default=os.environ.get(
            "OMEGA_VOICE_ONNX",
            str(Path.home() / ".omega" / "voices" / "en_US-lessac-low" / "en_US-lessac-low.onnx"),
        ),
    )
    ap.add_argument(
        "--voice-json",
        default=os.environ.get(
            "OMEGA_VOICE_JSON",
            str(Path.home() / ".omega" / "voices" / "en_US-lessac-low" / "en_US-lessac-low.onnx.json"),
        ),
    )
    ap.add_argument("--out-wav", default=os.environ.get("OMEGA_TTS_OUT", "/tmp/omega_tts.wav"))
    ap.add_argument(
        "--spk-profile",
        default=os.environ.get("OMEGA_SPK_PROFILE", str(Path.home() / ".omega" / "voice_profile.npz")),
    )
    ap.add_argument(
        "--spk-verify",
        default=os.environ.get("OMEGA_SPK_VERIFY", "soft"),
        choices=["off", "soft", "hard"],
    )
    ap.add_argument(
        "--spk-threshold",
        type=float,
        default=float(os.environ.get("OMEGA_SPK_THRESHOLD", "0.70")),
    )
    ap.add_argument("--wakeword", default=os.environ.get("OMEGA_WAKEWORD", "mega"))
    ap.add_argument(
        "--wakeword-mode",
        default=os.environ.get("OMEGA_WAKEWORD_MODE", "on"),
        choices=["on", "off"],
    )
    ap.add_argument(
        "--wakeword-timeout",
        type=float,
        default=float(os.environ.get("OMEGA_WAKEWORD_TIMEOUT", "8")),
    )
    ap.add_argument(
        "--ptt",
        default=os.environ.get("OMEGA_PTT", "on"),
        choices=["on", "off"],
    )
    args = ap.parse_args()

    device = args.device
    if isinstance(device, str):
        if device.strip() == "" or device.strip().lower() == "default":
            device = None
        elif device.strip() == "-1":
            device = None
        elif device.isdigit():
            device = int(device)

    sample_rate = args.sample_rate
    if device is not None:
        try:
            default_sr = int(sd.query_devices(device, "input")["default_samplerate"])
            if default_sr != sample_rate:
                sample_rate = default_sr
        except Exception:
            pass

    profile_emb = load_voice_profile(args.spk_profile) if args.spk_verify != "off" else None
    if args.spk_verify != "off" and profile_emb is None:
        print("Speaker verify enabled but profile not found. Continuing without gate.", flush=True)
        args.spk_verify = "off"

    listener = None
    ptt_state = None
    if args.ptt == "on":
        listener, ptt_state = try_start_ptt_listener()
        if listener is None:
            print("PTT listener not available (install pynput).", flush=True)
            args.ptt = "off"

    vad = webrtcvad.Vad(args.vad)
    frame_bytes = int(sample_rate * args.frame_ms / 1000) * 2
    padding_frames = int(args.padding_ms / args.frame_ms)
    silence_frames = int(args.silence_ms / args.frame_ms)
    max_segment_frames = int(args.max_segment_ms / args.frame_ms)

    audio_q = queue.Queue()

    def callback(indata, frames, time_info, status):
        if status:
            print(status, file=sys.stderr)
        audio_q.put(bytes(indata))

    ring = collections.deque(maxlen=padding_frames)
    voiced_frames = []
    triggered = False
    silence_count = 0
    segment_frames = 0

    ptt_buffer = []
    ptt_was_active = False

    armed = False
    armed_at = 0.0

    def reset_vad():
        nonlocal ring, voiced_frames, triggered, silence_count, segment_frames
        ring = collections.deque(maxlen=padding_frames)
        voiced_frames = []
        triggered = False
        silence_count = 0
        segment_frames = 0

    def maybe_disarm():
        nonlocal armed
        if armed and (time.time() - armed_at) > args.wakeword_timeout:
            armed = False

    def process_segment(segment: bytes, source: str):
        nonlocal armed, armed_at
        if not segment:
            return
        ts = int(time.time() * 1000)
        in_wav = f"/tmp/omega_in_{ts}.wav"
        write_wav(in_wav, segment, sample_rate)

        score = speaker_score(in_wav, profile_emb) if args.spk_verify != "off" else None
        if score is not None:
            print(f"Voice match: {score:.3f} (threshold {args.spk_threshold:.2f})", flush=True)
            if args.spk_verify == "hard" and score < args.spk_threshold:
                print("Voice rejected (not a match).", flush=True)
                return

        text = transcribe(in_wav, args.stt_model)
        if not text:
            return

        if args.wakeword_mode == "on" and source != "ptt":
            lower = text.lower()
            ww = args.wakeword.lower()
            if not armed:
                if ww in lower:
                    # use remainder after wakeword if present
                    idx = lower.find(ww)
                    remainder = text[idx + len(ww) :].strip(" ,.-")
                    if remainder:
                        text_to_send = remainder
                    else:
                        armed = True
                        armed_at = time.time()
                        print("Wake word detected. Listening...", flush=True)
                        return
                else:
                    return
            else:
                text_to_send = text
                armed = False
        else:
            text_to_send = text

        print(f"You: {text_to_send}")
        print("Omega: thinking...", flush=True)
        reply = call_omega(text_to_send, args.api_url)
        if not reply:
            print("Omega: (no response)", flush=True)
            return
        print(f"Omega: {reply}")
        speak(reply, args.voice_onnx, args.voice_json, args.out_wav)
        play_wav(args.out_wav)

    print("Ω OmegA Voice — hands-free + PTT", flush=True)
    print(f"Mic: {device if device is not None else 'default'} @ {sample_rate}Hz", flush=True)
    if args.wakeword_mode == "on":
        print(f"Wake word: {args.wakeword}", flush=True)
    if args.ptt == "on":
        print("PTT: hold Space to talk", flush=True)
    print("-" * 48, flush=True)

    try:
        stream = sd.RawInputStream(
            samplerate=sample_rate,
            blocksize=int(sample_rate * args.frame_ms / 1000),
            dtype="int16",
            channels=1,
            callback=callback,
            device=device,
        )
    except Exception:
        fallback, fallback_sr = pick_fallback_input_device()
        if fallback is None:
            print("No input audio devices detected. Check mic permissions or connect a microphone.", flush=True)
            sys.exit(1)
        device = fallback
        if fallback_sr and fallback_sr != sample_rate:
            sample_rate = fallback_sr
        print(f"Mic fallback -> device {device} @ {sample_rate}Hz", flush=True)
        stream = sd.RawInputStream(
            samplerate=sample_rate,
            blocksize=int(sample_rate * args.frame_ms / 1000),
            dtype="int16",
            channels=1,
            callback=callback,
            device=device,
        )

    with stream:
        print("Listening...", flush=True)
        while True:
            maybe_disarm()
            frame = audio_q.get()
            if len(frame) < frame_bytes:
                continue

            # PTT handling
            if args.ptt == "on" and ptt_state is not None and ptt_state.get("active"):
                if not ptt_was_active:
                    print("Recording... (PTT)", flush=True)
                ptt_buffer.append(frame)
                ptt_was_active = True
                continue

            if ptt_was_active and (args.ptt == "on"):
                print("Transcribing... (PTT)", flush=True)
                segment = b"".join(ptt_buffer)
                ptt_buffer = []
                ptt_was_active = False
                reset_vad()
                process_segment(segment, source="ptt")
                continue

            # VAD handling
            is_speech = vad.is_speech(frame, sample_rate)
            if not triggered:
                ring.append((frame, is_speech))
                num_voiced = sum(1 for _, v in ring if v)
                if num_voiced > 0.6 * ring.maxlen:
                    triggered = True
                    voiced_frames.extend(f for f, _ in ring)
                    ring.clear()
                    segment_frames = 0
                    print("Recording...", flush=True)
            else:
                voiced_frames.append(frame)
                segment_frames += 1
                if is_speech:
                    silence_count = 0
                else:
                    silence_count += 1
                    if silence_count > silence_frames:
                        print("Transcribing...", flush=True)
                        segment = b"".join(voiced_frames)
                        reset_vad()
                        process_segment(segment, source="vad")
                if segment_frames >= max_segment_frames:
                    print("Transcribing... (max segment)", flush=True)
                    segment = b"".join(voiced_frames)
                    reset_vad()
                    process_segment(segment, source="vad")


if __name__ == "__main__":
    main()
