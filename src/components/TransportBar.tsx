import { GitCompareArrows, Mic, Play, Repeat2 } from "lucide-react";

interface TransportBarProps {
  speed: number;
  isLooping: boolean;
  isGeneratingReference: boolean;
  canCompare: boolean;
  onSpeedChange(speed: number): void;
  onPlayReference(): void;
  onRecord(): void;
  onCompare(): void;
  onToggleLoop(): void;
}

export function TransportBar({
  speed,
  isLooping,
  isGeneratingReference,
  canCompare,
  onSpeedChange,
  onPlayReference,
  onRecord,
  onCompare,
  onToggleLoop,
}: TransportBarProps) {
  return (
    <div className="transport-bar">
      <button
        className="button primary"
        type="button"
        disabled={isGeneratingReference}
        onClick={onPlayReference}
      >
        <Play aria-hidden="true" size={17} strokeWidth={2.2} />
        <span>{isGeneratingReference ? "Generating reference" : "Play reference"}</span>
      </button>
      <button className="button secondary" type="button" onClick={onRecord}>
        <Mic aria-hidden="true" size={17} strokeWidth={2.2} />
        <span>Record</span>
      </button>
      <button
        className="button secondary"
        type="button"
        disabled={!canCompare}
        onClick={onCompare}
      >
        <GitCompareArrows aria-hidden="true" size={17} strokeWidth={2.2} />
        <span>Compare</span>
      </button>
      <button
        className={isLooping ? "button primary" : "button secondary"}
        type="button"
        aria-pressed={isLooping}
        onClick={onToggleLoop}
      >
        <Repeat2 aria-hidden="true" size={17} strokeWidth={2.2} />
        <span>Loop</span>
      </button>
      <label className="speed-control">
        <span>Speed {speed.toFixed(2)}x</span>
        <input
          min="0.65"
          max="1.15"
          step="0.05"
          type="range"
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
