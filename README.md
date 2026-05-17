# French Pronunciation Studio

Local-only French pronunciation practice app.

## Current State

This WSL development build validates the Tauri-ready app shell, text/session data
flow, sentence practice workflow, bundled local TTS sidecar startup, optional
Chatterbox TTS integration, and lab-style feedback. Browser development can run
with mock adapters; the desktop app starts an embedded local backend on
`127.0.0.1:8765` when no existing backend is already running.

## Commands

```bash
npm install
npm run dev
npm test
npm run build
```

Tauri commands:

```bash
npm run tauri:dev
npm run tauri:build
```

Windows packaging from WSL is done from the Windows host toolchain, not from
Linux cargo. The current verified path is:

```powershell
cd C:\Users\yotta\french-pronunciation-studio-winbuild
npm run tauri:build -- --bundles nsis
```

The raw Windows release executable is produced at
`src-tauri\target\release\french-pronunciation-studio.exe`.

The current Windows artifact copied back into this repo is:

```text
artifacts/windows/French-Pronunciation-Studio-0.1.0-windows-x64-embedded-backend.exe
```

WSL web development is supported with `npm run dev`, `npm test`, and
`npm run build`. Tauri desktop commands require Rust (`rustc`, `cargo`) and
native Tauri Linux prerequisites such as WebKitGTK and librsvg, or final
validation on macOS.

Observed environment gaps during Phase 1 setup: `npm run tauri:dev` failed here because `cargo` was missing. Reviewer Tauri info also reported missing `webkit2gtk-4.1`, `rsvg2`, `rustc`, and `Cargo`.

macOS packaging still needs final validation on the MacBook Air.

The current Tauri config keeps `csp: null` as a Phase 1 scaffolding choice.
Tighten the CSP and replace the generated placeholder icon with production
icons before production or macOS packaging.

## Bundled TTS Backend

The desktop executable contains an embedded backend mode. On app startup, Tauri
checks `127.0.0.1:8765`; if nothing is listening, it launches a child process of
itself with `--tts-backend`. The embedded backend exposes:

- `GET /health`
- `POST /tts`
- `GET /audio/<file>`

For now this bundled backend is a lightweight placeholder service that proves the
ToC packaging and service lifecycle. It does not include the Chatterbox model.
The production path is to keep this sidecar and add model download/runtime setup
inside it.

Model files should live in a fixed app model store, not in a user-specific WSL
cache path. Browser/WSL development defaults to `models/huggingface/` and
`models/generated-audio/` under this repo. Packaged Windows/macOS builds should
use the app data model directory:

- Windows: `%LOCALAPPDATA%/Voix Claire/models`
- macOS: `~/Library/Application Support/Voix Claire/models`

Set `VOIX_CLAIRE_MODEL_DIR` to override the model store location.

## Local Chatterbox TTS Backend

For RTX 5070 / Blackwell WSL testing, start the backend with the CUDA 12.8 Torch override:

```bash
npm run tts:server
```

Then start the frontend with the backend URL:

```bash
VITE_TTS_BACKEND_URL=http://127.0.0.1:8765 npm run dev
```

The frontend calls `POST /tts` when `Play reference` is clicked and plays the
returned WAV from `GET /audio/<file>`. In browser development without
`VITE_TTS_BACKEND_URL`, the app keeps using the mock TTS adapter. In the Tauri
desktop runtime, the app defaults to `http://127.0.0.1:8765`.

## Model Direction

- Quality TTS target: Chatterbox Multilingual.
- Lightweight TTS fallback: not exposed until a backend adapter is implemented.
- ASR target: whisper.cpp.
- v1 feedback: local ASR comparison and timing rules.
