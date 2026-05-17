import { Headphones, Mic, Square } from "lucide-react";

interface TransportBarProps {
  isGeneratingReference: boolean;
  isModelReady: boolean;
  isRecording: boolean;
  onPlayReference(): void;
  onToggleRecording(): void;
}

export function TransportBar({
  isGeneratingReference,
  isModelReady,
  isRecording,
  onPlayReference,
  onToggleRecording,
}: TransportBarProps) {
  return (
    <div className="transport-bar">
      <div className="transport-actions" aria-label="Audio actions">
        <button
          className="button primary transport-action"
          type="button"
          disabled={isGeneratingReference || !isModelReady}
          onClick={onPlayReference}
        >
          <Headphones aria-hidden="true" size={17} strokeWidth={2.2} />
          <span>{isGeneratingReference ? "Preparing" : "Listen"}</span>
        </button>
        <button
          className={
            isRecording
              ? "button primary transport-action record-active"
              : "button secondary transport-action"
          }
          type="button"
          aria-pressed={isRecording}
          onClick={onToggleRecording}
        >
          {isRecording ? (
            <Square aria-hidden="true" size={15} strokeWidth={2.4} />
          ) : (
            <Mic aria-hidden="true" size={16} strokeWidth={2.2} />
          )}
          <span>{isRecording ? "Stop" : "Record"}</span>
        </button>
      </div>
    </div>
  );
}
