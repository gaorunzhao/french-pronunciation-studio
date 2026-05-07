interface WaveformPairProps {
  hasReference: boolean;
  hasRecording: boolean;
}

export function WaveformPair({ hasReference, hasRecording }: WaveformPairProps) {
  return (
    <div className="waveform-grid">
      <div className="waveform-card">
        <p className="eyebrow">Reference Audio</p>
        <div
          className={hasReference ? "waveform reference active" : "waveform reference"}
        />
      </div>
      <div className="waveform-card">
        <p className="eyebrow">Your Recording</p>
        <div
          className={hasRecording ? "waveform recording active" : "waveform recording"}
        />
      </div>
    </div>
  );
}
