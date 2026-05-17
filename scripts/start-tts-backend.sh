#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODEL_DIR="${VOIX_CLAIRE_MODEL_DIR:-$ROOT_DIR/models}"

export VOIX_CLAIRE_MODEL_DIR="$MODEL_DIR"
export HF_ENDPOINT="${HF_ENDPOINT:-https://hf-mirror.com}"
export HF_HOME="${HF_HOME:-$MODEL_DIR/huggingface}"
export HF_HUB_CACHE="${HF_HUB_CACHE:-$MODEL_DIR/huggingface}"
export TTS_HOST="${TTS_HOST:-127.0.0.1}"
export TTS_PORT="${TTS_PORT:-8765}"
export TTS_DEVICE="${TTS_DEVICE:-cuda}"
export TTS_OUTPUT_DIR="${TTS_OUTPUT_DIR:-$MODEL_DIR/generated-audio}"

mkdir -p "$HF_HUB_CACHE" "$TTS_OUTPUT_DIR"

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
