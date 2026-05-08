interface WaveformPairProps {
  hasReference: boolean;
  hasRecording: boolean;
  isGeneratingReference: boolean;
  referenceAudioUrl?: string;
  referenceError?: string;
}

export function WaveformPair({
  hasReference,
  hasRecording,
  isGeneratingReference,
  referenceAudioUrl,
  referenceError,
}: WaveformPairProps) {
  return (
    <div className="waveform-grid">
      <div className="waveform-card">
        <p className="eyebrow">Reference Audio</p>
        {isGeneratingReference ? (
          <p className="audio-state">Generating reference audio...</p>
        ) : null}
        {referenceError ? (
          <p className="audio-state error">{referenceError}</p>
        ) : null}
        <div
          role="img"
          aria-label={
            hasReference ? "Reference audio ready" : "Reference audio not generated"
          }
          className={hasReference ? "waveform reference active" : "waveform reference"}
        />
        {referenceAudioUrl ? (
          <audio
            aria-label="Reference audio player"
            className="reference-player"
            controls
            src={referenceAudioUrl}
          />
        ) : null}
      </div>
      <div className="waveform-card">
        <p className="eyebrow">Your Recording</p>
        <div
          role="img"
          aria-label={
            hasRecording ? "Your recording ready" : "Your recording not captured"
          }
          className={hasRecording ? "waveform recording active" : "waveform recording"}
        />
      </div>
    </div>
  );
}
