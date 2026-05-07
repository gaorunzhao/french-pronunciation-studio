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

macOS packaging and real local model validation happen later on the MacBook Air.

## Model Direction

- Quality TTS target: Chatterbox Multilingual.
- Lightweight TTS fallback: Kokoro French voice.
- ASR target: whisper.cpp.
- v1 feedback: local ASR comparison and timing rules.
