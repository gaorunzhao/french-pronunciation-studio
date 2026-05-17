import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Pause, Play, Volume2 } from "lucide-react";
import { downsamplePeaks } from "./waveformPeaks";

const BAR_COUNT = 56;
const PACE_OPTIONS = [2, 1.5, 1.25, 1, 0.75, 0.5, 0.25];

interface RecordingAttempt {
  id: string;
  name: string;
  audioUrl: string;
  durationMs: number;
  createdAt: string;
}

interface WaveformPairProps {
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
  isExpanded: boolean;
  speed: number;
  volume: number;
  onSelectRecording(recordingId: string): void;
  onRenameRecording(recordingId: string, name: string): void;
  onSpeedChange(speed: number): void;
  onVolumeChange(volume: number): void;
  onToggleExpanded(): void;
}

export function WaveformPair({
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
  isExpanded,
  speed,
  volume,
  onSelectRecording,
  onRenameRecording,
  onSpeedChange,
  onVolumeChange,
  onToggleExpanded,
}: WaveformPairProps) {
  const decodedReferencePeaks = useDecodedPeaks(referenceAudioUrl);
  const decodedRecordingPeaks = useDecodedPeaks(recordingAudioUrl);
  const selectedRecording = recordingAttempts.find(
    (attempt) => attempt.id === selectedRecordingId,
  );
  const audioCount = 1 + Number(Boolean(recordingAudioUrl));

  return (
    <div className={isExpanded ? "waveform-card" : "waveform-card folded"}>
      <div className="waveform-card-header">
        <div>
          <p className="eyebrow">Waveform</p>
        </div>
        <div className="waveform-header-controls">
          <button
            className="icon-button waveform-toggle"
            type="button"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Fold waveform" : "Show waveform"}
            title={isExpanded ? "Fold waveform" : "Show waveform"}
            onClick={onToggleExpanded}
          >
            {isExpanded ? (
              <ChevronDown aria-hidden="true" size={17} strokeWidth={2.25} />
            ) : (
              <ChevronUp aria-hidden="true" size={17} strokeWidth={2.25} />
            )}
          </button>
        </div>
      </div>
      {isRecording ? (
        <p className="audio-state">Recording... browser permission is requested automatically.</p>
      ) : null}
      {referenceError ? (
        <p className="audio-state error">{referenceError}</p>
      ) : null}
      {recordingError ? (
        <p className="audio-state error">{recordingError}</p>
      ) : null}
      <div hidden={!isExpanded}>
        <div className="waveform-expanded-content">
          <div
            role="img"
            aria-label={
              hasReference || recordingAudioUrl
                ? "Reference and recording waveform"
                : "Empty waveform"
            }
            className="waveform-shell active"
          >
            <div className="waveform-label-row" aria-hidden="true">
              <span>Reference</span>
              {selectedRecording ? <span>{selectedRecording.name}</span> : null}
            </div>
            {isGeneratingReference ? (
              <div className="waveform-loading" aria-label="Generating reference audio">
                <span />
              </div>
            ) : null}
            <svg
              className="waveform-overlay"
              viewBox="0 0 720 128"
              aria-hidden="true"
            >
              {decodedReferencePeaks?.length ? (
                <WaveformBars peaks={decodedReferencePeaks} />
              ) : null}
              {decodedRecordingPeaks?.length ? (
                <RecordingLine peaks={decodedRecordingPeaks} />
              ) : null}
              {!decodedReferencePeaks?.length && !decodedRecordingPeaks?.length ? (
                <EmptyWaveform />
              ) : null}
            </svg>
          </div>
          <div className={audioCount === 1 ? "audio-player-row single" : "audio-player-row"}>
            <AudioProgress
              label="Reference"
              src={referenceAudioUrl}
              playRequest={referencePlaybackRequest}
              durationHintMs={referenceDurationMs}
              speed={speed}
              volume={volume}
              onSpeedChange={onSpeedChange}
              onVolumeChange={onVolumeChange}
            />
            {recordingAudioUrl ? (
              <AudioProgress
                label={selectedRecording?.name ?? "Recording"}
                src={recordingAudioUrl}
                durationHintMs={recordingDurationMs}
                volume={volume}
                onVolumeChange={onVolumeChange}
              />
            ) : null}
          </div>
          {recordingAttempts.length ? (
            <div className="recording-manager" aria-label="Recordings">
              <div>
                <p className="recording-manager-title">Recordings</p>
                <p className="recording-manager-detail">
                  Choose a saved attempt for this line.
                </p>
              </div>
              <label>
                <span>Attempt</span>
                <select
                  aria-label="Recording attempt"
                  value={selectedRecordingId ?? ""}
                  onChange={(event) => onSelectRecording(event.target.value)}
                >
                  {recordingAttempts.map((attempt) => (
                    <option key={attempt.id} value={attempt.id}>
                      {attempt.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Rename</span>
                <input
                  aria-label="Recording name"
                  value={selectedRecording?.name ?? ""}
                  onChange={(event) => {
                    if (selectedRecordingId) {
                      onRenameRecording(selectedRecordingId, event.target.value);
                    }
                  }}
                />
              </label>
            </div>
          ) : null}
        </div>
      </div>
      {!isExpanded ? (
        <p className="audio-state audio-state-centered">
          {referenceAudioUrl || recordingAudioUrl
            ? "Waveform folded. Your audio stays available."
            : "No audio yet. Press Listen or unfold the waveform."}
        </p>
      ) : null}
    </div>
  );
}

function AudioProgress({
  label,
  src,
  playRequest = 0,
  durationHintMs = 0,
  speed,
  volume,
  onSpeedChange,
  onVolumeChange,
}: {
  label: string;
  src?: string;
  playRequest?: number;
  durationHintMs?: number;
  speed?: number;
  volume?: number;
  onSpeedChange?(speed: number): void;
  onVolumeChange?(volume: number): void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const lastHandledPlayRequestRef = useRef(playRequest);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [localVolume, setLocalVolume] = useState(1);
  const [openMenu, setOpenMenu] = useState<"pace" | "volume" | undefined>();
  const effectiveVolume = volume ?? localVolume;
  const effectiveDuration =
    duration > 0 ? duration : Math.max(0, durationHintMs / 1000);
  const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;
  const volumeLabel = `${Math.round(effectiveVolume * 100)}%`;
  const progressStyle = {
    "--progress": `${progress}%`,
  } as CSSProperties & Record<"--progress", string>;

  useEffect(() => {
    const audio = audioRef.current;
    audio?.pause();
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setOpenMenu(undefined);
    if (audio && src) {
      try {
        audio.load();
      } catch {
        // jsdom does not implement media loading; browsers do.
      }
    }
  }, [src]);

  useEffect(() => {
    if (!openMenu) return;

    function closeMenuOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && playerRef.current?.contains(target)) return;
      setOpenMenu(undefined);
    }

    document.addEventListener("pointerdown", closeMenuOnOutsidePointerDown);
    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsidePointerDown);
    };
  }, [openMenu]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playRequest || playRequest <= lastHandledPlayRequestRef.current) {
      lastHandledPlayRequestRef.current = playRequest;
      return;
    }
    lastHandledPlayRequestRef.current = playRequest;
    playAudio(audio);
  }, [playRequest]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = effectiveVolume;
  }, [effectiveVolume]);

  function setNextVolume(nextVolume: number) {
    if (onVolumeChange) {
      onVolumeChange(nextVolume);
    } else {
      setLocalVolume(nextVolume);
    }
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (audio.paused) {
      playAudio(audio);
    } else {
      audio.pause();
    }
  }

  function seek(nextTime: number) {
    const audio = audioRef.current;
    if (!audio || !src) return;
    const clampedTime =
      effectiveDuration > 0
        ? Math.min(Math.max(nextTime, 0), effectiveDuration)
        : Math.max(nextTime, 0);
    try {
      audio.currentTime = clampedTime;
    } catch {
      // Keep the slider responsive even if metadata is not ready for seeking yet.
    }
    setCurrentTime(clampedTime);
  }

  return (
    <div className="custom-audio-player" ref={playerRef}>
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          setDuration(Number.isFinite(nextDuration) ? nextDuration : 0);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="custom-audio-controls">
        <button
          className="audio-play-button"
          type="button"
          aria-label={`${isPlaying ? "Pause" : "Play"} ${label}`}
          disabled={!src}
          onClick={togglePlayback}
        >
          {isPlaying ? (
            <Pause
              aria-hidden="true"
              className="audio-pause-icon"
              size={15}
              strokeWidth={2.6}
            />
          ) : (
            <Play
              aria-hidden="true"
              className="audio-play-icon"
              size={15}
              strokeWidth={2.6}
            />
          )}
        </button>
        <input
          className="audio-progress"
          aria-label={`${label} progress`}
          type="range"
          min="0"
          max={effectiveDuration}
          step="0.01"
          value={Math.min(currentTime, effectiveDuration || currentTime)}
          disabled={!src}
          style={progressStyle}
          onInput={(event) => seek(Number(event.currentTarget.value))}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <time>{formatClockTime(currentTime)} / {formatClockTime(effectiveDuration)}</time>
        {onSpeedChange && typeof speed === "number" ? (
          <div className="audio-popover-control">
            <button
              className="audio-control-button"
              type="button"
              aria-label="Playback speed"
              aria-expanded={openMenu === "pace"}
              onClick={() =>
                setOpenMenu((current) => (current === "pace" ? undefined : "pace"))
              }
            >
              <span>{formatPace(speed)}</span>
            </button>
            {openMenu === "pace" ? (
              <div className="pace-menu" role="menu" aria-label="Playback speed">
                {PACE_OPTIONS.map((pace) => (
                  <button
                    className={speed === pace ? "pace-option active" : "pace-option"}
                    key={pace}
                    type="button"
                    role="menuitemradio"
                    aria-checked={speed === pace}
                    onClick={() => {
                      onSpeedChange(pace);
                      setOpenMenu(undefined);
                    }}
                  >
                    {formatPace(pace)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="audio-popover-control">
          <button
            className="audio-control-button icon-only"
            type="button"
            aria-label={`${label} volume menu`}
            aria-expanded={openMenu === "volume"}
            onClick={() =>
              setOpenMenu((current) => (current === "volume" ? undefined : "volume"))
            }
          >
            <Volume2 aria-hidden="true" size={14} strokeWidth={2.3} />
          </button>
          {openMenu === "volume" ? (
            <div className="volume-menu" aria-label={`${label} volume control`}>
              <input
                aria-label={`${label} volume`}
                min="0"
                max="1"
                step="0.01"
                type="range"
                value={effectiveVolume}
                onChange={(event) => setNextVolume(Number(event.target.value))}
              />
              <span>{volumeLabel}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function playAudio(audio: HTMLAudioElement) {
  try {
    const playResult = audio.play();
    void playResult?.catch(() => undefined);
  } catch {
    // Browser autoplay policies and jsdom can reject playback; the UI still remains usable.
  }
}

function WaveformBars({ peaks }: { peaks: number[] }) {
  const width = 7;
  const gap = 5.2;
  const centerY = 64;

  return (
    <g className="waveform-bars reference active">
      {peaks.map((peak, index) => {
        const height = Math.max(2, peak * 108);
        const x = 12 + index * (width + gap);
        const y = centerY - height / 2;

        return (
          <rect
            key={`reference-${index}`}
            x={x}
            y={y}
            width={width}
            height={height}
            rx={3.5}
          />
        );
      })}
    </g>
  );
}

function RecordingLine({ peaks }: { peaks: number[] }) {
  const centerY = 64;
  const step = 696 / Math.max(1, peaks.length - 1);
  const points = peaks
    .map((peak, index) => {
      const x = 12 + index * step;
      const y = centerY - peak * 48;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <polyline
      className="waveform-recording-line"
      points={points}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function EmptyWaveform() {
  return (
    <g className="waveform-empty">
      <line x1="24" y1="64" x2="696" y2="64" />
    </g>
  );
}

function useDecodedPeaks(audioUrl?: string) {
  const [decodedPeaks, setDecodedPeaks] = useState<number[]>();

  useEffect(() => {
    if (!audioUrl) {
      setDecodedPeaks(undefined);
      return;
    }

    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor || typeof globalThis.fetch !== "function") {
      setDecodedPeaks(undefined);
      return;
    }

    let isCancelled = false;
    let isClosed = false;
    const sourceUrl = audioUrl;
    const audioContext = new AudioContextCtor();
    const closeAudioContext = () => {
      if (isClosed) return;
      isClosed = true;
      void audioContext.close();
    };

    async function decodeAudio() {
      try {
        const fetchAudio = globalThis.fetch.bind(globalThis);
        const response = await fetchAudio(sourceUrl);
        const buffer = await response.arrayBuffer();
        const decoded = await audioContext.decodeAudioData(buffer);
        const samples = decoded.getChannelData(0);

        if (!isCancelled) {
          setDecodedPeaks(downsamplePeaks(samples, BAR_COUNT));
        }
      } catch {
        if (!isCancelled) {
          setDecodedPeaks(undefined);
        }
      } finally {
        closeAudioContext();
      }
    }

    void decodeAudio();

    return () => {
      isCancelled = true;
      closeAudioContext();
    };
  }, [audioUrl]);

  return decodedPeaks;
}

function formatClockTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatPace(speed: number) {
  if (Number.isInteger(speed)) {
    return `${speed.toFixed(1)}x`;
  }
  return `${speed.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}x`;
}
