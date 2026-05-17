import type { PracticeSentence, TextDocument } from "../domain/types";
import { TransportBar } from "./TransportBar";
import { WaveformPair } from "./WaveformPair";

interface RecordingAttempt {
  id: string;
  name: string;
  audioUrl: string;
  durationMs: number;
  createdAt: string;
}

interface PracticeWorkspaceProps {
  text?: TextDocument;
  sentences: PracticeSentence[];
  selectedSentenceId?: string;
  hasReference: boolean;
  isGeneratingReference: boolean;
  referenceAudioUrl?: string;
  referencePlaybackRequest: number;
  referenceError?: string;
  referenceDurationMs: number;
  recordingAudioUrl?: string;
  recordingError?: string;
  recordingDurationMs: number;
  recordingAttempts: RecordingAttempt[];
  selectedRecordingId?: string;
  isRecording: boolean;
  isWaveformExpanded: boolean;
  modelId: string;
  modelOptions: Array<{
    id: string;
    label: string;
    status: "ready" | "missing" | "downloading" | "error";
    progress: number;
    size: string;
    statusMessage?: string;
  }>;
  selectedModelStatus: "ready" | "missing" | "downloading" | "error";
  selectedModelProgress: number;
  selectedModelStatusMessage?: string;
  speed: number;
  volume: number;
  voiceId: string;
  emotion: string;
  voiceOptions: Array<{ id: string; label: string }>;
  emotionOptions: Array<{ id: string; label: string }>;
  onModelChange(modelId: string): void;
  onVoiceChange(voiceId: string): void;
  onEmotionChange(emotion: string): void;
  onSpeedChange(speed: number): void;
  onVolumeChange(volume: number): void;
  onSelectSentence(sentenceId: string): void;
  onPlayReference(): void;
  onToggleRecording(): void;
  onSelectRecording(recordingId: string): void;
  onRenameRecording(recordingId: string, name: string): void;
  onToggleWaveform(): void;
}

export function PracticeWorkspace({
  text,
  sentences,
  selectedSentenceId,
  hasReference,
  isGeneratingReference,
  referenceAudioUrl,
  referencePlaybackRequest,
  referenceError,
  referenceDurationMs,
  recordingAudioUrl,
  recordingError,
  recordingDurationMs,
  recordingAttempts,
  selectedRecordingId,
  isRecording,
  isWaveformExpanded,
  modelId,
  modelOptions,
  selectedModelStatus,
  selectedModelProgress,
  selectedModelStatusMessage,
  speed,
  volume,
  voiceId,
  emotion,
  voiceOptions,
  emotionOptions,
  onModelChange,
  onVoiceChange,
  onEmotionChange,
  onSpeedChange,
  onVolumeChange,
  onSelectSentence,
  onPlayReference,
  onToggleRecording,
  onSelectRecording,
  onRenameRecording,
  onToggleWaveform,
}: PracticeWorkspaceProps) {
  const selectedSentence = sentences.find(
    (sentence) => sentence.id === selectedSentenceId,
  );
  const sentenceSizeClass = selectedSentence
    ? getSentenceSizeClass(selectedSentence.text)
    : "large";

  if (!text) {
    return (
      <section className="empty-state">
        <h2>Practice</h2>
        <p>Paste a French passage to begin.</p>
      </section>
    );
  }

  return (
    <section className="practice-layout">
      <section className="text-stage" aria-label="Current line">
        <div className="text-stage-header">
          <h2>{text.title}</h2>
        </div>
        <div className={`selected-sentence-card ${sentenceSizeClass}`}>
          <p className="selected-sentence-text">
            {selectedSentence?.text ?? "Select a sentence to begin."}
          </p>
        </div>
      </section>
      <section className="line-track" aria-label="Line by line">
        <div className="line-track-header">
          <p className="eyebrow">Line by line</p>
          <span>
            {selectedSentence ? selectedSentence.index + 1 : 0} / {sentences.length}
          </span>
        </div>
        <div className="sentence-list">
          {sentences.map((sentence) => (
            <button
              className={
                sentence.id === selectedSentenceId
                  ? "sentence-card active"
                  : "sentence-card"
              }
              key={sentence.id}
              type="button"
              aria-pressed={sentence.id === selectedSentenceId}
              onClick={() => onSelectSentence(sentence.id)}
            >
              <span className="sentence-index" aria-hidden="true">
                {sentence.index + 1}
              </span>
              <span className="sentence-card-text">{sentence.text}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="practice-controls-panel" aria-label="Practice controls">
        <div className="voice-controls" aria-label="Model and voice settings">
          <label>
            <span>Model</span>
            <span
              className="model-select-shell"
              data-status={selectedModelStatus}
            >
              <select
                aria-label="Model"
                value={modelId}
                onChange={(event) => onModelChange(event.target.value)}
              >
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} · {model.size}
                  </option>
                ))}
              </select>
              {selectedModelStatus !== "ready" ? (
                <span className="model-status-overlay">
                  {selectedModelStatusMessage
                    ? selectedModelStatusMessage
                    : formatModelStatus(selectedModelStatus, selectedModelProgress)}
                </span>
              ) : null}
            </span>
          </label>
          <label>
            <span>Voice</span>
            <select
              aria-label="Voice"
              value={voiceId}
              onChange={(event) => onVoiceChange(event.target.value)}
            >
              {voiceOptions.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Expression</span>
            <select
              aria-label="Expression"
              value={emotion}
              onChange={(event) => onEmotionChange(event.target.value)}
            >
              {emotionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <TransportBar
          isGeneratingReference={isGeneratingReference}
          isModelReady={
            selectedModelStatus !== "downloading" && selectedModelStatus !== "error"
          }
          onPlayReference={onPlayReference}
          onToggleRecording={onToggleRecording}
          isRecording={isRecording}
        />
        <WaveformPair
          hasReference={hasReference}
          isGeneratingReference={isGeneratingReference}
          referenceAudioUrl={referenceAudioUrl}
          referencePlaybackRequest={referencePlaybackRequest}
          referenceError={referenceError}
          referenceDurationMs={referenceDurationMs}
          recordingAudioUrl={recordingAudioUrl}
          recordingError={recordingError}
          recordingDurationMs={recordingDurationMs}
          recordingAttempts={recordingAttempts}
          selectedRecordingId={selectedRecordingId}
          isRecording={isRecording}
          isExpanded={isWaveformExpanded}
          speed={speed}
          volume={volume}
          onSelectRecording={onSelectRecording}
          onRenameRecording={onRenameRecording}
          onSpeedChange={onSpeedChange}
          onVolumeChange={onVolumeChange}
          onToggleExpanded={onToggleWaveform}
        />
      </section>
    </section>
  );
}

function formatModelStatus(status: string, progress: number) {
  if (status === "downloading") return `${progress}%`;
  if (status === "error") return "Not wired";
  return "Not installed";
}

function getSentenceSizeClass(text: string) {
  if (text.length > 260) return "compact";
  if (text.length > 135) return "balanced";
  return "large";
}
