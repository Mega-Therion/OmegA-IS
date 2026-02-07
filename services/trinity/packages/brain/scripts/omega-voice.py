#!/usr/bin/env python3
import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def strip_ansi(s: str) -> str:
    return ANSI_RE.sub("", s)


def transcribe(wav_path: str, model: str) -> str:
    from faster_whisper import WhisperModel

    # CPU-friendly settings
    wm = WhisperModel(model, device="cpu", compute_type="int8")
    segments, _ = wm.transcribe(wav_path)
    text_parts = []
    for seg in segments:
        if seg.text:
            text_parts.append(seg.text.strip())
    return " ".join(text_parts).strip()


def call_omega(prompt: str, api_url: str) -> str:
    omega_cli = Path(__file__).resolve().parents[1] / "cli" / "omega.js"
    env = os.environ.copy()
    env.setdefault("OMEGA_API_URL", api_url)
    env.setdefault("OMEGA_AGENT", "local")
    env.setdefault("OMEGA_USE_TOOLS", "0")

    proc = subprocess.run(
        ["node", str(omega_cli), "chat", prompt],
        env=env,
        capture_output=True,
        text=True,
    )
    out = strip_ansi(proc.stdout).strip()
    if not out:
        return ""

    # Try to pull the response content out of common CLI formats
    lines = [ln for ln in out.splitlines() if ln.strip()]
    if not lines:
        return ""

    # Prefer last line after a prefix
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
        [
            piper_bin,
            "-m",
            voice_onnx,
            "-c",
            voice_json,
            "-f",
            out_wav,
        ],
        input=text,
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or "piper failed")



def play_wav(path: str):
    subprocess.run(["aplay", "-q", path], check=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("wav", help="Path to 16k mono WAV")
    ap.add_argument("--api-url", default=os.environ.get("OMEGA_API_URL", "http://localhost:8081"))
    ap.add_argument("--stt-model", default=os.environ.get("OMEGA_STT_MODEL", "tiny"))
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
    ap.add_argument(
        "--out-wav",
        default=os.environ.get("OMEGA_TTS_OUT", "/tmp/omega_tts.wav"),
    )
    args = ap.parse_args()

    text = transcribe(args.wav, args.stt_model)
    if not text:
        print("No speech detected.", file=sys.stderr)
        sys.exit(1)

    print(f"You said: {text}")
    reply = call_omega(text, args.api_url)
    if not reply:
        print("No response from Omega.", file=sys.stderr)
        sys.exit(1)

    print(f"Omega: {reply}")
    speak(reply, args.voice_onnx, args.voice_json, args.out_wav)
    play_wav(args.out_wav)


if __name__ == "__main__":
    main()
