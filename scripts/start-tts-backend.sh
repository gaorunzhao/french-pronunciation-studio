#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "$(uname -s)" == "Darwin" ]]; then
  DEFAULT_MODEL_DIR="$HOME/Library/Application Support/Voix Claire/models"
else
  DEFAULT_MODEL_DIR="$ROOT_DIR/models"
fi
MODEL_DIR="${VOIX_CLAIRE_MODEL_DIR:-$DEFAULT_MODEL_DIR}"
UVX_BIN="${UVX_BIN:-$(command -v uvx || true)}"

export VOIX_CLAIRE_MODEL_DIR="$MODEL_DIR"
export HF_ENDPOINT="${HF_ENDPOINT:-https://huggingface.co}"
export HF_HOME="${HF_HOME:-$MODEL_DIR/huggingface}"
export HF_HUB_CACHE="${HF_HUB_CACHE:-$MODEL_DIR/huggingface}"
export TTS_HOST="${TTS_HOST:-127.0.0.1}"
export TTS_PORT="${TTS_PORT:-8765}"
export TTS_DEVICE="${TTS_DEVICE:-auto}"
export TTS_OUTPUT_DIR="${TTS_OUTPUT_DIR:-$MODEL_DIR/generated-audio}"

mkdir -p "$HF_HUB_CACHE" "$TTS_OUTPUT_DIR"

if [[ -z "$UVX_BIN" ]]; then
  echo "uvx is required to start the Chatterbox backend. Install uv first: https://docs.astral.sh/uv/" >&2
  exit 127
fi

UVX_ARGS=(
  --isolated
  --with chatterbox-tts
  --with socksio
  --with torch
  --with torchaudio
  --with soundfile
  --overrides "$ROOT_DIR/backend/torch-overrides.txt"
)

if [[ -n "${TTS_TORCH_BACKEND:-}" ]]; then
  UVX_ARGS+=(--torch-backend "$TTS_TORCH_BACKEND")
elif [[ "$(uname -s)" == "Linux" ]]; then
  UVX_ARGS+=(--torch-backend cu128)
fi

exec "$UVX_BIN" \
  "${UVX_ARGS[@]}" \
  --prerelease allow \
  python "$ROOT_DIR/backend/chatterbox_tts_server.py" \
  --host "$TTS_HOST" \
  --port "$TTS_PORT" \
  --output-dir "$TTS_OUTPUT_DIR" \
  --device "$TTS_DEVICE"
