from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import struct
import wave
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote


DEFAULT_OUTPUT_DIR = Path("/tmp/french-pronunciation-studio/preview-tts")
SAMPLE_RATE = 24_000


def safe_audio_filename(sentence_id: str, text: str, voice: dict[str, Any]) -> str:
  safe_id = re.sub(r"[^a-zA-Z0-9_-]+", "-", sentence_id).strip("-").lower() or "line"
  digest = hashlib.sha256(
    json.dumps(
      {"sentenceId": sentence_id, "text": text, "voice": voice},
      sort_keys=True,
      ensure_ascii=False,
    ).encode("utf-8"),
  ).hexdigest()[:12]
  return f"{safe_id}-{digest}.wav"


def parse_request(body: bytes) -> dict[str, Any]:
  payload = json.loads(body.decode("utf-8"))
  text = str(payload.get("text", "")).strip()
  if not text:
    raise ValueError("text is required")

  language_id = str(payload.get("languageId", "fr")).strip().lower()
  if language_id != "fr":
    raise ValueError("only French languageId 'fr' is supported")

  voice = payload.get("voice")
  if not isinstance(voice, dict):
    voice = {}

  return {
    "sentence_id": str(payload.get("sentenceId", "line")).strip() or "line",
    "text": text,
    "voice": voice,
  }


def clamped_float(value: Any, default: float, minimum: float, maximum: float) -> float:
  try:
    parsed = float(value)
  except (TypeError, ValueError):
    return default
  return min(max(parsed, minimum), maximum)


def write_preview_wav(path: Path, text: str, voice: dict[str, Any]) -> int:
  pace = clamped_float(voice.get("speed"), 1.0, 0.1, 2.0)
  style = clamped_float(voice.get("styleStrength"), 0.6, 0.0, 1.2)
  voice_id = str(voice.get("voiceId", "default"))
  word_count = max(1, len(text.split()))
  duration = min(8.0, max(0.9, word_count * 0.32 / pace))
  sample_count = int(SAMPLE_RATE * duration)
  if voice_id == "female-fr":
    base_frequency = 245
  elif voice_id == "male-fr":
    base_frequency = 145
  else:
    base_frequency = 185 + (sum(ord(char) for char in text[:24]) % 110)
  modulation_depth = 0.15 + style * 0.08

  path.parent.mkdir(parents=True, exist_ok=True)
  with wave.open(str(path), "wb") as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(SAMPLE_RATE)
    frames = bytearray()
    for index in range(sample_count):
      t = index / SAMPLE_RATE
      envelope = min(1.0, index / (SAMPLE_RATE * 0.08))
      envelope *= min(1.0, (sample_count - index) / (SAMPLE_RATE * 0.12))
      modulation = 1 + modulation_depth * math.sin(2 * math.pi * 3.2 * t)
      signal = math.sin(2 * math.pi * base_frequency * modulation * t)
      signal += 0.35 * math.sin(2 * math.pi * base_frequency * 1.5 * t)
      value = int(max(-1.0, min(1.0, signal * envelope * 0.28)) * 32767)
      frames.extend(struct.pack("<h", value))
    wav.writeframes(frames)

  return round(duration * 1000)


class PreviewTtsHandler(SimpleHTTPRequestHandler):
  output_dir: Path

  def do_OPTIONS(self):
    self._send_empty(HTTPStatus.NO_CONTENT)

  def do_GET(self):
    if self.path == "/health":
      self._send_json(
        {
          "status": "ok",
          "model": "preview-wav-generator",
          "runtime": "stdlib",
          "modelLoaded": True,
        }
      )
      return

    if self.path.startswith("/audio/"):
      self._serve_audio(unquote(self.path.removeprefix("/audio/")))
      return

    self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)

  def do_POST(self):
    if self.path != "/tts":
      self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
      return

    try:
      length = int(self.headers.get("Content-Length", "0"))
      request = parse_request(self.rfile.read(length))
      filename = safe_audio_filename(request["sentence_id"], request["text"], request["voice"])
      audio_path = self.output_dir / filename
      duration_ms = write_preview_wav(audio_path, request["text"], request["voice"])
    except ValueError as error:
      self._send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
      return
    except Exception as error:
      self._send_json({"error": str(error)}, HTTPStatus.INTERNAL_SERVER_ERROR)
      return

    self._send_json(
      {
        "audioPath": str(audio_path),
        "audioUrl": f"/audio/{filename}",
        "durationMs": duration_ms,
      }
    )

  def _serve_audio(self, filename: str):
    if "/" in filename or "\\" in filename:
      self._send_json({"error": "invalid audio path"}, HTTPStatus.BAD_REQUEST)
      return

    audio_path = self.output_dir / filename
    if not audio_path.exists():
      self._send_json({"error": "audio not found"}, HTTPStatus.NOT_FOUND)
      return

    data = audio_path.read_bytes()
    self.send_response(HTTPStatus.OK)
    self._send_cors_headers()
    self.send_header("Content-Type", "audio/wav")
    self.send_header("Content-Length", str(len(data)))
    self.end_headers()
    self.wfile.write(data)

  def _send_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK):
    data = json.dumps(payload).encode("utf-8")
    self.send_response(status)
    self._send_cors_headers()
    self.send_header("Content-Type", "application/json")
    self.send_header("Content-Length", str(len(data)))
    self.end_headers()
    self.wfile.write(data)

  def _send_empty(self, status: HTTPStatus):
    self.send_response(status)
    self._send_cors_headers()
    self.end_headers()

  def _send_cors_headers(self):
    self.send_header("Access-Control-Allow-Origin", "*")
    self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Content-Type")

  def log_message(self, format: str, *args: Any):
    print(f"{self.address_string()} - {format % args}")


def main():
  parser = argparse.ArgumentParser(description="Local preview TTS backend")
  parser.add_argument("--host", default=os.environ.get("TTS_HOST", "127.0.0.1"))
  parser.add_argument("--port", type=int, default=int(os.environ.get("TTS_PORT", "8765")))
  parser.add_argument(
    "--output-dir",
    type=Path,
    default=Path(os.environ.get("TTS_OUTPUT_DIR", DEFAULT_OUTPUT_DIR)),
  )
  args = parser.parse_args()

  handler = type(
    "ConfiguredPreviewTtsHandler",
    (PreviewTtsHandler,),
    {"output_dir": args.output_dir},
  )
  server = ThreadingHTTPServer((args.host, args.port), handler)
  print(f"Preview TTS server listening on http://{args.host}:{args.port}")
  print(f"Audio output directory: {args.output_dir}")
  server.serve_forever()


if __name__ == "__main__":
  main()
