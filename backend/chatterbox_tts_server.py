from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import threading
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote


DEFAULT_OUTPUT_DIR = Path("/tmp/french-pronunciation-studio/tts")
DEFAULT_HF_ENDPOINT = "https://huggingface.co"
VOICE_PROMPT_ENV = {
    "female-fr": "TTS_FEMALE_PROMPT_PATH",
    "male-fr": "TTS_MALE_PROMPT_PATH",
}
VOICE_LABELS = {
    "default": "Default",
    "female-fr": "Female FR",
    "male-fr": "Male FR",
}
TERMINAL_PUNCTUATION = (".", "!", "?", "-", ",", "、", "，", "。", "？", "！")


def build_audio_filename(sentence_id: str, text: str, voice: dict[str, Any]) -> str:
    safe_sentence_id = re.sub(r"[^a-zA-Z0-9_-]+", "-", sentence_id).strip("-").lower()
    if not safe_sentence_id:
        safe_sentence_id = "sentence"
    digest = hashlib.sha256(
        json.dumps(
            {
                "sentenceId": sentence_id,
                "text": text,
                "voice": voice,
            },
            sort_keys=True,
            ensure_ascii=False,
        ).encode("utf-8"),
    ).hexdigest()[:12]
    return f"{safe_sentence_id}-{digest}.wav"


def duration_ms_from_samples(sample_count: int, sample_rate: int) -> int:
    if sample_rate <= 0:
        raise ValueError("sample_rate must be positive")
    return round((sample_count / sample_rate) * 1000)


def parse_tts_request(body: bytes) -> dict[str, Any]:
    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError("request body must be valid JSON") from exc

    text = str(payload.get("text", "")).strip()
    if not text:
        raise ValueError("text is required")

    language_id = str(payload.get("languageId", "fr")).strip().lower()
    if language_id != "fr":
        raise ValueError("only French languageId 'fr' is supported")

    sentence_id = str(payload.get("sentenceId", "sentence")).strip() or "sentence"
    voice = payload.get("voice")
    if not isinstance(voice, dict):
        voice = {}

    return {
        "sentence_id": sentence_id,
        "text": text,
        "language_id": language_id,
        "voice": voice,
    }


class ChatterboxEngine:
    def __init__(self, output_dir: Path, device: str | None = None):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.device = device
        self._model = None
        self._model_lock = threading.Lock()
        self._last_model_error: str | None = None

    @property
    def model_loaded(self) -> bool:
        return self._model is not None

    def model_status(self) -> dict[str, Any]:
        status = "ready" if self.model_loaded else "missing"
        if self._last_model_error:
            status = "error"
        return {
            "model": "ResembleAI/chatterbox",
            "status": status,
            "device": self.device or "auto",
            "modelLoaded": self.model_loaded,
            "modelInstalled": self.model_loaded,
            "hfEndpoint": active_hf_endpoint(),
            "downloadEndpoint": "/models/chatterbox/download",
            "voices": available_voice_options(),
            "error": self._last_model_error,
        }

    def download_model(self) -> dict[str, Any]:
        self._load_model()
        return self.model_status()

    def synthesize(
        self,
        *,
        sentence_id: str,
        text: str,
        language_id: str,
        voice: dict[str, Any],
    ) -> dict[str, Any]:
        model = self._load_model()
        generation_text = normalize_generation_text(text)
        filename = build_audio_filename(sentence_id, generation_text, voice)
        output_path = self.output_dir / filename

        wav = model.generate(
            generation_text,
            **build_chatterbox_generate_kwargs(language_id=language_id, voice=voice),
        )
        audio = wav.squeeze().detach().cpu().numpy()

        import soundfile as sf

        sf.write(output_path, audio, model.sr)

        return {
            "audioPath": str(output_path),
            "audioUrl": f"/audio/{filename}",
            "durationMs": duration_ms_from_samples(len(audio), model.sr),
            "sampleRate": model.sr,
        }

    def _load_model(self):
        if self._model is not None:
            return self._model

        with self._model_lock:
            if self._model is not None:
                return self._model

            try:
                self._model = self._create_model()
            except Exception as exc:
                self._last_model_error = str(exc)
                raise

            self._last_model_error = None
            return self._model

    def _create_model(self):
        import torch
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS

        device = None if self.device in (None, "", "auto") else self.device
        if device is None:
            if torch.cuda.is_available():
                device = "cuda"
            elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"
        self.device = device
        return ChatterboxMultilingualTTS.from_pretrained(device=device)


def _clamped_float(value: Any, default: float, minimum: float, maximum: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return min(max(parsed, minimum), maximum)


def active_hf_endpoint() -> str:
    return os.environ.get("HF_ENDPOINT", DEFAULT_HF_ENDPOINT).strip() or DEFAULT_HF_ENDPOINT


def normalize_generation_text(text: str) -> str:
    normalized = " ".join(text.split()).strip()
    if normalized and not normalized.endswith(TERMINAL_PUNCTUATION):
        return f"{normalized}."
    return normalized


def build_chatterbox_generate_kwargs(language_id: str, voice: dict[str, Any]) -> dict[str, Any]:
    return {
        "language_id": language_id,
        "audio_prompt_path": _audio_prompt_path_for_voice(voice),
        "exaggeration": _clamped_float(voice.get("styleStrength"), 0.5, 0.0, 1.2),
        "cfg_weight": _cfg_for_speed(_clamped_float(voice.get("speed"), 0.9, 0.65, 1.2)),
        "temperature": 0.45,
        "repetition_penalty": 1.5,
        "min_p": 0.05,
        "top_p": 0.85,
    }


def available_voice_options() -> list[dict[str, str]]:
    voices = [{"id": "default", "label": VOICE_LABELS["default"]}]
    for voice_id, env_name in VOICE_PROMPT_ENV.items():
        prompt_path = os.environ.get(env_name, "").strip()
        if prompt_path and Path(prompt_path).exists():
            voices.append({"id": voice_id, "label": VOICE_LABELS[voice_id]})
    return voices


def _cfg_for_speed(speed: float) -> float:
    if speed >= 1.05:
        return 0.35
    if speed <= 0.75:
        return 0.65
    return 0.5


def _audio_prompt_path_for_voice(voice: dict[str, Any]) -> str | None:
    voice_id = str(voice.get("voiceId", "default")).strip()
    if voice_id in ("", "default"):
        return None

    env_name = VOICE_PROMPT_ENV.get(voice_id)
    if env_name is None:
        raise ValueError(f"unknown voice preset: {voice_id}")

    prompt_path = os.environ.get(env_name, "").strip()
    if not prompt_path:
        raise ValueError(f"voice preset {voice_id} requires {env_name}")

    if not Path(prompt_path).exists():
        raise ValueError(f"voice prompt file not found: {prompt_path}")

    return prompt_path


class TtsRequestHandler(SimpleHTTPRequestHandler):
    engine: ChatterboxEngine

    def do_OPTIONS(self):
        self._send_empty(HTTPStatus.NO_CONTENT)

    def do_GET(self):
        if self.path == "/health":
            self._send_json({"backend": "chatterbox", **self.engine.model_status()})
            return

        if self.path.startswith("/audio/"):
            self._serve_audio(unquote(self.path.removeprefix("/audio/")))
            return

        self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)

    def do_POST(self):
        if self.path == "/models/chatterbox/download":
            try:
                self._send_json({"backend": "chatterbox", **self.engine.download_model()})
            except Exception as exc:
                print(f"TTS model download failed: {exc}", file=sys.stderr)
                self._send_json(
                    {"backend": "chatterbox", **self.engine.model_status()},
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return

        if self.path != "/tts":
            self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            request = parse_tts_request(self.rfile.read(length))
            response = self.engine.synthesize(**request)
        except ValueError as exc:
            self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return
        except Exception as exc:
            print(f"TTS generation failed: {exc}", file=sys.stderr)
            self._send_json({"error": str(exc)}, HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        self._send_json(response)

    def _serve_audio(self, filename: str):
        if "/" in filename or "\\" in filename:
            self._send_json({"error": "invalid audio path"}, HTTPStatus.BAD_REQUEST)
            return

        audio_path = self.engine.output_dir / filename
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


def create_server(host: str, port: int, engine: ChatterboxEngine):
    handler = type("ConfiguredTtsRequestHandler", (TtsRequestHandler,), {"engine": engine})
    return ThreadingHTTPServer((host, port), handler)


def main():
    parser = argparse.ArgumentParser(description="Local Chatterbox French TTS backend")
    parser.add_argument("--host", default=os.environ.get("TTS_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("TTS_PORT", "8765")))
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(os.environ.get("TTS_OUTPUT_DIR", DEFAULT_OUTPUT_DIR)),
    )
    parser.add_argument("--device", default=os.environ.get("TTS_DEVICE"))
    args = parser.parse_args()

    engine = ChatterboxEngine(output_dir=args.output_dir, device=args.device)
    server = create_server(args.host, args.port, engine)
    print(f"Chatterbox TTS server listening on http://{args.host}:{args.port}")
    print(f"Audio output directory: {args.output_dir}")
    server.serve_forever()


if __name__ == "__main__":
    main()
