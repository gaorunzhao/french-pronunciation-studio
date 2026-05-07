interface TransportBarProps {
  speed: number;
  onSpeedChange(speed: number): void;
  onPlayReference(): void;
  onRecord(): void;
  onCompare(): void;
}

export function TransportBar({
  speed,
  onSpeedChange,
  onPlayReference,
  onRecord,
  onCompare,
}: TransportBarProps) {
  return (
    <div className="transport-bar">
      <button className="button primary" type="button" onClick={onPlayReference}>
        Play reference
      </button>
      <button className="button secondary" type="button" onClick={onRecord}>
        Record
      </button>
      <button className="button secondary" type="button" onClick={onCompare}>
        Compare
      </button>
      <button className="button secondary" type="button">
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
