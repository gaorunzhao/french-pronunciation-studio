# Local Model Store

Development backends use this directory by default:

- `models/huggingface/` for Hugging Face model cache files.
- `models/generated-audio/` for generated WAV files.

Packaged desktop builds should use the OS app data directory instead:

- Windows: `%LOCALAPPDATA%/Voix Claire/models`
- macOS: `~/Library/Application Support/Voix Claire/models`

Keep downloaded model weights out of git. Set `VOIX_CLAIRE_MODEL_DIR` to point
the backend at another model store when needed.
