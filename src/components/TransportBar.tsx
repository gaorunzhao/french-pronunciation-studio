interface TransportBarProps {
  speed: number;
  isLooping: boolean;
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
  canCompare,
  onSpeedChange,
  onPlayReference,
  onRecord,
  onCompare,
  onToggleLoop,
}: TransportBarProps) {
  return (
    <div className="transport-bar">
      <button className="button primary" type="button" onClick={onPlayReference}>
        Play reference
      </button>
      <button className="button secondary" type="button" onClick={onRecord}>
        Record
      </button>
      <button
        className="button secondary"
        type="button"
        disabled={!canCompare}
        onClick={onCompare}
      >
        Compare
      </button>
      <button
        className={isLooping ? "button primary" : "button secondary"}
        type="button"
        aria-pressed={isLooping}
        onClick={onToggleLoop}
      >
        Loop
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
