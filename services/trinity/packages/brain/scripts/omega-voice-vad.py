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
import webrtcvad

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")

os.environ.setdefault("HUGGINGFACE_HUB_VERBOSITY", "error")
warnings.filterwarnings(
    "ignore",
    message="pkg_resources is deprecated as an API.*",
    category=UserWarning,
)


def strip_ansi(s: str) -> str:
    return ANSI_RE.sub("", s)


def transcribe(wav_path: str, model: str) -> str:
    from faster_whisper import WhisperModel

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
        # cosine similarity
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


def vad_loop(
    sample_rate: int,
    frame_ms: int,
    vad_aggressiveness: int,
    padding_ms: int,
    silence_ms: int,
    max_segment_ms: int,
    device: str | None,
):
    vad = webrtcvad.Vad(vad_aggressiveness)
    frame_bytes = int(sample_rate * frame_ms / 1000) * 2
    padding_frames = int(padding_ms / frame_ms)
    silence_frames = int(silence_ms / frame_ms)
    max_segment_frames = int(max_segment_ms / frame_ms)

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

    with sd.RawInputStream(
        samplerate=sample_rate,
        blocksize=int(sample_rate * frame_ms / 1000),
        dtype="int16",
        channels=1,
        callback=callback,
        device=device,
    ):
        print("Listening... (hands-free VAD)", flush=True)
        while True:
            frame = audio_q.get()
            if len(frame) < frame_bytes:
                continue
            is_speech = vad.is_speech(frame, sample_rate)

            if not triggered:
                ring.append((frame, is_speech))
                num_voiced = sum(1 for _, v in ring if v)
                if num_voiced > 0.6 * ring.maxlen:
                    triggered = True
                    voiced_frames.extend(f for f, _ in ring)
                    ring.clear()
                    print("Recording... (speech detected)", flush=True)
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
                        voiced_frames.clear()
                        triggered = False
                        silence_count = 0
                        segment_frames = 0
                        yield segment
                if segment_frames >= max_segment_frames:
                    print("Transcribing... (max segment)", flush=True)
                    segment = b"".join(voiced_frames)
                    voiced_frames.clear()
                    triggered = False
                    silence_count = 0
                    segment_frames = 0
                    yield segment


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
    ap.add_argument(
        "--spk-profile",
        default=os.environ.get("OMEGA_SPK_PROFILE", str(Path.home() / ".omega" / "voice_profile.npz")),
    )
    ap.add_argument(
        "--spk-verify",
        default=os.environ.get("OMEGA_SPK_VERIFY", "off"),
        choices=["off", "soft", "hard"],
    )
    ap.add_argument(
        "--spk-threshold",
        type=float,
        default=float(os.environ.get("OMEGA_SPK_THRESHOLD", "0.70")),
    )
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
    args = ap.parse_args()

    device = args.device
    if isinstance(device, str):
        if device.strip() == "" or device.strip().lower() == "default":
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
    print("Ω OmegA Voice — hands-free", flush=True)
    print(f"Mic: {device if device is not None else 'default'} @ {sample_rate}Hz", flush=True)
    print("-" * 48, flush=True)

    profile_emb = load_voice_profile(args.spk_profile) if args.spk_verify != "off" else None
    if args.spk_verify != "off" and profile_emb is None:
        print("Speaker verify enabled but profile not found. Continuing without gate.", flush=True)
        args.spk_verify = "off"

    seg_idx = 0
    for segment in vad_loop(
        sample_rate,
        args.frame_ms,
        args.vad,
        args.padding_ms,
        args.silence_ms,
        args.max_segment_ms,
        device,
    ):
        if not segment:
            continue
        seg_idx += 1
        in_wav = f"/tmp/omega_in_{seg_idx}.wav"
        write_wav(in_wav, segment, sample_rate)
        score = speaker_score(in_wav, profile_emb) if args.spk_verify != "off" else None
        if score is not None:
            print(f"Voice match: {score:.3f} (threshold {args.spk_threshold:.2f})", flush=True)
            if args.spk_verify == "hard" and score < args.spk_threshold:
                print("Voice rejected (not a match).", flush=True)
                continue
        text = transcribe(in_wav, args.stt_model)
        if not text:
            continue
        print(f"You: {text}")
        print("Omega: thinking...", flush=True)
        reply = call_omega(text, args.api_url)
        if not reply:
            print("Omega: (no response)", flush=True)
            continue
        print(f"Omega: {reply}")
        speak(reply, args.voice_onnx, args.voice_json, args.out_wav)
        play_wav(args.out_wav)


if __name__ == "__main__":
    main()
