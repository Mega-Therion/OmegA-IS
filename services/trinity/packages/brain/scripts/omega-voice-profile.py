#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path.home() / ".omega" / "voice_profile.npz"))
    ap.add_argument("--list", required=True, help="text file: one audio path per line")
    args = ap.parse_args()

    try:
        from resemblyzer import VoiceEncoder, preprocess_wav
        import numpy as np
    except Exception as e:
        raise SystemExit(f"Missing deps. Install: pip install resemblyzer soundfile. ({e})")

    paths = [p.strip() for p in open(args.list, "r", encoding="utf-8") if p.strip()]
    if not paths:
        raise SystemExit("No audio paths in list")

    encoder = VoiceEncoder()
    embs = []
    ok = []
    for p in paths:
        try:
            wav = preprocess_wav(p)
            emb = encoder.embed_utterance(wav)
            embs.append(emb)
            ok.append(p)
        except Exception:
            pass

    if not embs:
        raise SystemExit("No valid audio files to embed")

    profile = np.mean(np.stack(embs, axis=0), axis=0)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    np.savez_compressed(out, embedding=profile)
    meta = {
        "model": "resemblyzer",
        "num_files": len(ok),
        "files": ok,
    }
    with open(out.with_suffix(".json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"Saved voice profile: {out}")
    print(f"Used files: {len(ok)}")


if __name__ == "__main__":
    main()
