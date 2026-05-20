import { useEffect, useRef } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import type { PracticeSentence, TextDocument } from "../domain/types";
import { SelectField } from "./SelectField";
import { TransportBar } from "./TransportBar";
import { WaveformPair } from "./WaveformPair";

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
  isRecording: boolean;
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
  isRecording,
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
}: PracticeWorkspaceProps) {
  const selectedSentence = sentences.find(
    (sentence) => sentence.id === selectedSentenceId,
  );
  const sentenceSizeClass = selectedSentence
    ? getSentenceSizeClass(selectedSentence.text)
    : "large";
  const selectedSentenceButtonRef = useRef<HTMLButtonElement | null>(null);
  const modelStatus =
    selectedModelStatus !== "ready"
      ? selectedModelStatusMessage ??
        formatModelStatus(selectedModelStatus, selectedModelProgress)
      : undefined;

  useEffect(() => {
    selectedSentenceButtonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedSentenceId]);

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
        <ScrollArea.Root className="sentence-scroll" type="auto">
          <ScrollArea.Viewport className="sentence-scroll-viewport">
            <ToggleGroup.Root
              className="sentence-list"
              type="multiple"
              value={selectedSentenceId ? [selectedSentenceId] : []}
              onValueChange={(values) => {
                const nextValue = values.find((value) => value !== selectedSentenceId);
                if (nextValue) onSelectSentence(nextValue);
              }}
            >
              {sentences.map((sentence) => (
                <ToggleGroup.Item
                  className="sentence-card"
                  key={sentence.id}
                  value={sentence.id}
                  ref={
                    sentence.id === selectedSentenceId
                      ? selectedSentenceButtonRef
                      : undefined
                  }
                >
                  <span className="sentence-index" aria-hidden="true">
                    {sentence.index + 1}
                  </span>
                  <span className="sentence-card-text">{sentence.text}</span>
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar className="scrollbar" orientation="vertical">
            <ScrollArea.Thumb className="scrollbar-thumb" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </section>
      <section className="practice-controls-panel" aria-label="Practice controls">
        <div className="voice-controls" aria-label="Model and voice settings">
          <SelectField
            className="model-select-field"
            label="Model"
            value={modelId}
            options={modelOptions.map((model) => ({
              id: model.id,
              label: model.label,
              detail:
                model.status === "ready"
                  ? undefined
                  : model.statusMessage ??
                    formatModelStatus(model.status, model.progress),
            }))}
            status={modelStatus}
            onChange={onModelChange}
          />
          <SelectField
            className="voice-select-field"
            label="Voice"
            value={voiceId}
            options={voiceOptions}
            onChange={onVoiceChange}
          />
          <SelectField
            className="expression-select-field"
            label="Expression"
            value={emotion}
            options={emotionOptions}
            onChange={onEmotionChange}
          />
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
          isRecording={isRecording}
          speed={speed}
          volume={volume}
          onSpeedChange={onSpeedChange}
          onVolumeChange={onVolumeChange}
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
