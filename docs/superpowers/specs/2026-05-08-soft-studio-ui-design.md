# Soft Studio UI Refactor Design

## Goal

Refactor the Phase 1 French pronunciation studio into a calmer, more polished learning workspace without adding heavy new features or increasing local model requirements.

## Product Shape

The app keeps two primary sections: Texts and Sessions. The Texts section remains the main learning loop: import French text, select one sentence, play a reference voice, record the learner, and compare. Sessions stays a review/history area.

The sidebar becomes collapsible so the app can feel focused during practice. Expanded mode shows the app title, section labels, and import controls. Collapsed mode keeps icon-only navigation and a clear expand button.

## Visual Direction

The theme uses a warm Everforest/Ayu base with Catppuccin-style softness: warm parchment backgrounds, muted ink text, sage/teal primary actions, amber accents for learning/review state, and restrained borders. White text is used only on strong accent fills with enough contrast.

Buttons are softer and more tactile: 8px radius, tonal fills, subtle hover states, and lucide icons for common actions. The UI should feel modern and concise, closer to a focused audio tool than a dashboard.

## UX References

MiniMax TTS informs the prominent text/audio workspace and obvious playback controls. ChatGPT realtime informs the calm central practice state, simple record/compare loop, and low-friction controls. These are references for interaction clarity, not feature expansion.

## Scope

This pass updates the app shell, theme tokens, sidebar behavior, navigation, transport controls, workspace hierarchy, and feedback panel polish. It does not add production TTS, ASR scoring, model download logic, or advanced coach features.

## Testing

Add coverage for collapsing and expanding the sidebar while preserving accessible navigation. Keep the current import, practice, transport, and session tests passing.
