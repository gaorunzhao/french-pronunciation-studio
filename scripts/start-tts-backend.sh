#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export HF_HOME="${HF_HOME:-/home/yotta/.cache/huggingface}"
export HF_HUB_CACHE="${HF_HUB_CACHE:-/home/yotta/.cache/huggingface}"
export TTS_HOST="${TTS_HOST:-127.0.0.1}"
export TTS_PORT="${TTS_PORT:-8765}"
export TTS_DEVICE="${TTS_DEVICE:-cuda}"
export TTS_OUTPUT_DIR="${TTS_OUTPUT_DIR:-/tmp/french-pronunciation-studio/tts}"

exec /home/yotta/.local/bin/uvx \
  --isolated \
  --with chatterbox-tts \
  --with socksio \
  --with torch \
  --with torchaudio \
  --with soundfile \
  --overrides "$ROOT_DIR/backend/torch-overrides.txt" \
  --torch-backend cu128 \
  --prerelease allow \
  python "$ROOT_DIR/backend/chatterbox_tts_server.py" \
  --host "$TTS_HOST" \
  --port "$TTS_PORT" \
  --output-dir "$TTS_OUTPUT_DIR" \
  --device "$TTS_DEVICE"
