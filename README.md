# French Pronunciation Studio

Local-only French pronunciation practice app.

## Phase 1

This prototype is built for WSL development and uses mock local model adapters. It validates the UI, text/session data flow, sentence practice workflow, and lab-style feedback before macOS model testing.

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

WSL web development is supported for Phase 1: `npm run dev`, `npm test`, and `npm run build` run against the mock local model adapters. Tauri desktop commands require Rust (`rustc`, `cargo`) and native Tauri Linux prerequisites such as WebKitGTK and librsvg, or final validation on macOS.

Observed environment gaps during Phase 1 setup: `npm run tauri:dev` failed here because `cargo` was missing. Reviewer Tauri info also reported missing `webkit2gtk-4.1`, `rsvg2`, `rustc`, and `Cargo`.

macOS packaging and real local model validation happen later on the MacBook Air.

The current Tauri config keeps `csp: null` and an empty icon list as Phase 1 scaffolding choices. Tighten the CSP and add production icons before production or macOS packaging.

## Model Direction

- Quality TTS target: Chatterbox Multilingual.
- Lightweight TTS fallback: Kokoro French voice.
- ASR target: whisper.cpp.
- v1 feedback: local ASR comparison and timing rules.
