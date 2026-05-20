import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Progress from "@radix-ui/react-progress";
import * as Slider from "@radix-ui/react-slider";
import { Pause, Play, Volume2 } from "lucide-react";
import { downsamplePeaks } from "./waveformPeaks";

const BAR_COUNT = 56;
const RECORDING_BAR_COUNT = 38;
const PACE_OPTIONS = [2, 1.5, 1.25, 1, 0.75, 0.5, 0.25];
const WAVEFORM_AXIS_START = 18;
const WAVEFORM_AXIS_END = 702;
const WAVEFORM_AXIS_WIDTH = WAVEFORM_AXIS_END - WAVEFORM_AXIS_START;
type AudioKind = "reference" | "recording";

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
  isRecording: boolean;
  speed: number;
  volume: number;
  onSpeedChange(speed: number): void;
  onVolumeChange(volume: number): void;
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
  isRecording,
  speed,
  volume,
  onSpeedChange,
  onVolumeChange,
}: WaveformPairProps) {
  const decodedReferencePeaks = useDecodedPeaks(referenceAudioUrl);
  const decodedRecordingPeaks = useDecodedPeaks(recordingAudioUrl);
  const [isModelWaveformVisible, setIsModelWaveformVisible] = useState(true);
  const [isUserWaveformVisible, setIsUserWaveformVisible] = useState(true);
  const [playbackState, setPlaybackState] = useState<{
    currentMs: number;
    isPlaying: boolean;
    kind: AudioKind;
  }>();
  const hasRecording = Boolean(recordingAudioUrl);
  const referenceSeriesDurationMs = referenceAudioUrl ? Math.max(0, referenceDurationMs) : 0;
  const recordingSeriesDurationMs = recordingAudioUrl ? Math.max(0, recordingDurationMs) : 0;
  const waveformAxisDurationMs = Math.max(
    referenceSeriesDurationMs,
    recordingSeriesDurationMs,
    1,
  );
  const waveformLabel = getWaveformLabel({
    hasRecording,
    hasReference: Boolean(hasReference || referenceAudioUrl),
    isModelVisible: isModelWaveformVisible,
    isUserVisible: isUserWaveformVisible,
  });
  const activePlayback =
    playbackState?.isPlaying &&
    ((playbackState.kind === "reference" && isModelWaveformVisible) ||
      (playbackState.kind === "recording" && isUserWaveformVisible))
      ? playbackState
      : undefined;
  const playheadPositionMs = activePlayback
    ? Math.round(Math.min(Math.max(activePlayback.currentMs, 0), waveformAxisDurationMs))
    : undefined;

  const updatePlaybackState = useCallback((nextState: {
    currentMs: number;
    isPlaying: boolean;
    kind: AudioKind;
  }) => {
    setPlaybackState(nextState);
  }, []);

  return (
    <div className="waveform-card">
      <div className="waveform-expanded-content">
        <div
          role="img"
          aria-label={waveformLabel}
          className="waveform-shell active"
          data-axis-start={WAVEFORM_AXIS_START}
          data-axis-end={WAVEFORM_AXIS_END}
          data-axis-duration-ms={waveformAxisDurationMs}
          data-active-playback-kind={activePlayback?.kind}
          data-playhead-position-ms={playheadPositionMs}
        >
          <div className="waveform-legend" aria-label="Waveform series">
            <button
              className="waveform-legend-button model"
              type="button"
              aria-label="Model waveform"
              aria-pressed={isModelWaveformVisible}
              onClick={() => setIsModelWaveformVisible((current) => !current)}
            >
              <span aria-hidden="true" />
              Model
            </button>
            {hasRecording ? (
              <button
                className="waveform-legend-button user"
                type="button"
                aria-label="You waveform"
                aria-pressed={isUserWaveformVisible}
                onClick={() => setIsUserWaveformVisible((current) => !current)}
              >
                <span aria-hidden="true" />
                You
              </button>
            ) : null}
          </div>
          {isGeneratingReference ? (
            <div className="waveform-loading" aria-label="Generating reference audio">
              <Progress.Root className="waveform-loading-progress">
                <Progress.Indicator className="waveform-loading-indicator" />
              </Progress.Root>
            </div>
          ) : null}
          <svg
            className="waveform-overlay"
            viewBox="0 0 720 128"
            aria-hidden="true"
          >
            <WaveformBackdrop />
            {isModelWaveformVisible && decodedReferencePeaks?.length ? (
              <WaveformBars
                peaks={decodedReferencePeaks}
                durationMs={referenceSeriesDurationMs}
                axisDurationMs={waveformAxisDurationMs}
              />
            ) : null}
            {isUserWaveformVisible && decodedRecordingPeaks?.length ? (
              <RecordingBars
                peaks={decodedRecordingPeaks}
                durationMs={recordingSeriesDurationMs}
                axisDurationMs={waveformAxisDurationMs}
              />
            ) : null}
            {waveformLabel === "Empty waveform" ||
            (!decodedReferencePeaks?.length && !decodedRecordingPeaks?.length) ? (
              <EmptyWaveform />
            ) : null}
            {activePlayback ? (
              <WaveformPlayhead
                kind={activePlayback.kind}
                positionMs={activePlayback.currentMs}
                axisDurationMs={waveformAxisDurationMs}
              />
            ) : null}
          </svg>
        </div>
        <div
          className="audio-player-row"
          data-has-recording={recordingAudioUrl ? "true" : "false"}
        >
          <AudioProgress
            label="Reference"
            kind="reference"
            src={referenceAudioUrl}
            playRequest={referencePlaybackRequest}
            durationHintMs={referenceDurationMs}
            speed={speed}
            volume={volume}
            onSpeedChange={onSpeedChange}
            onVolumeChange={onVolumeChange}
            onPlaybackChange={updatePlaybackState}
          />
          {recordingAudioUrl ? (
            <AudioProgress
              label="Recording"
              kind="recording"
              src={recordingAudioUrl}
              durationHintMs={recordingDurationMs}
              volume={volume}
              onVolumeChange={onVolumeChange}
              onPlaybackChange={updatePlaybackState}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getWaveformLabel({
  hasRecording,
  hasReference,
  isModelVisible,
  isUserVisible,
}: {
  hasRecording: boolean;
  hasReference: boolean;
  isModelVisible: boolean;
  isUserVisible: boolean;
}) {
  if (hasRecording) {
    if (isModelVisible && isUserVisible) return "Model and user waveform";
    if (isModelVisible) return "Model waveform";
    if (isUserVisible) return "User waveform";
    return "Empty waveform";
  }

  if (hasReference && isModelVisible) return "Reference waveform";
  return "Empty waveform";
}

function AudioProgress({
  label,
  kind,
  src,
  playRequest = 0,
  durationHintMs = 0,
  speed,
  volume,
  onSpeedChange,
  onVolumeChange,
  onPlaybackChange,
}: {
  label: string;
  kind: AudioKind;
  src?: string;
  playRequest?: number;
  durationHintMs?: number;
  speed?: number;
  volume?: number;
  onSpeedChange?(speed: number): void;
  onVolumeChange?(volume: number): void;
  onPlaybackChange?(state: { currentMs: number; isPlaying: boolean; kind: AudioKind }): void;
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
  const effectiveSpeed = speed ?? 1;
  const effectiveDuration =
    duration > 0 ? duration : Math.max(0, durationHintMs / 1000);
  const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;
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
    onPlaybackChange?.({ currentMs: 0, isPlaying: false, kind });
    if (audio && src) {
      try {
        audio.load();
      } catch {
        // jsdom does not implement media loading; browsers do.
      }
    }
  }, [kind, onPlaybackChange, src]);

  useEffect(() => {
    if (!openMenu || openMenu === "volume") return;

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = effectiveSpeed;
  }, [effectiveSpeed]);

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
    onPlaybackChange?.({
      currentMs: clampedTime * 1000,
      isPlaying,
      kind,
    });
  }

  function updateCurrentTime(nextCurrentTime: number, nextIsPlaying = isPlaying) {
    setCurrentTime(nextCurrentTime);
    onPlaybackChange?.({
      currentMs: nextCurrentTime * 1000,
      isPlaying: nextIsPlaying,
      kind,
    });
  }

  return (
    <div className="custom-audio-player" data-audio-kind={kind} ref={playerRef}>
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          setDuration(Number.isFinite(nextDuration) ? nextDuration : 0);
        }}
        onTimeUpdate={(event) => updateCurrentTime(event.currentTarget.currentTime)}
        onPlay={(event) => {
          setIsPlaying(true);
          updateCurrentTime(event.currentTarget.currentTime, true);
        }}
        onPause={(event) => {
          setIsPlaying(false);
          updateCurrentTime(event.currentTarget.currentTime, false);
        }}
        onEnded={(event) => {
          setIsPlaying(false);
          updateCurrentTime(event.currentTarget.currentTime, false);
        }}
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
        <Popover.Root
          open={openMenu === "volume"}
          onOpenChange={(isOpen) => setOpenMenu(isOpen ? "volume" : undefined)}
        >
          <Popover.Trigger asChild>
            <button
              className="audio-control-button icon-only"
              type="button"
              aria-label={`${label} volume menu`}
            >
              <Volume2 aria-hidden="true" size={14} strokeWidth={2.3} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="volume-menu"
              aria-label={`${label} volume control`}
              align="end"
              side="top"
              sideOffset={8}
            >
              <Slider.Root
                className="volume-slider"
                aria-label={`${label} volume`}
                min={0}
                max={1}
                step={0.01}
                orientation="vertical"
                value={[effectiveVolume]}
                onValueChange={([nextValue]) => {
                  if (typeof nextValue === "number") {
                    setNextVolume(nextValue);
                  }
                }}
              >
                <Slider.Track className="volume-slider-track">
                  <Slider.Range className="volume-slider-range" />
                </Slider.Track>
                <Slider.Thumb
                  aria-label={`${label} volume`}
                  className="volume-slider-thumb"
                />
              </Slider.Root>
              <span>{`${Math.round(effectiveVolume * 100)}%`}</span>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
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

function WaveformBackdrop() {
  return (
    <>
      <defs>
        <linearGradient id="waveform-reference-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5e9a8f" />
          <stop offset="100%" stopColor="#2f625b" />
        </linearGradient>
        <linearGradient id="waveform-recording-gradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#b08a5f" />
          <stop offset="48%" stopColor="#8f704c" />
          <stop offset="100%" stopColor="#66513c" />
        </linearGradient>
      </defs>
      <g className="waveform-grid">
        <line x1={WAVEFORM_AXIS_START} y1="32" x2={WAVEFORM_AXIS_END} y2="32" />
        <line x1={WAVEFORM_AXIS_START} y1="64" x2={WAVEFORM_AXIS_END} y2="64" />
        <line x1={WAVEFORM_AXIS_START} y1="96" x2={WAVEFORM_AXIS_END} y2="96" />
      </g>
    </>
  );
}

function WaveformBars({
  peaks,
  durationMs,
  axisDurationMs,
}: {
  peaks: number[];
  durationMs: number;
  axisDurationMs: number;
}) {
  const centerY = 64;
  const bars = getSeriesBars({
    peaks,
    durationMs,
    axisDurationMs,
    widthRatio: 0.56,
    minWidth: 2.5,
    maxWidth: 6.8,
  });

  return (
    <g
      className="waveform-bars reference active"
      data-series-duration-ms={durationMs}
      data-axis-duration-ms={axisDurationMs}
    >
      {bars.map(({ peak, width, x }, index) => {
        const height = Math.max(4, peak * 94);
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

function RecordingBars({
  peaks,
  durationMs,
  axisDurationMs,
}: {
  peaks: number[];
  durationMs: number;
  axisDurationMs: number;
}) {
  const centerY = 64;
  const displayPeaks = compactPeaks(peaks, RECORDING_BAR_COUNT);
  const bars = getSeriesBars({
    peaks: displayPeaks,
    durationMs,
    axisDurationMs,
    widthRatio: 0.56,
    minWidth: 2.5,
    maxWidth: 6.8,
  });

  return (
    <g
      className="waveform-bars recording active"
      data-series-duration-ms={durationMs}
      data-axis-duration-ms={axisDurationMs}
      data-display-bar-count={displayPeaks.length}
    >
      {bars.map(({ peak, width, x }, index) => {
        const height = Math.max(4, peak * 94);
        const y = centerY - height / 2;

        return (
          <rect
            key={`recording-${index}`}
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

function compactPeaks(peaks: number[], targetCount: number) {
  if (peaks.length <= targetCount) return peaks;

  const chunkSize = peaks.length / targetCount;
  return Array.from({ length: targetCount }, (_, index) => {
    const start = Math.floor(index * chunkSize);
    const end = Math.max(start + 1, Math.ceil((index + 1) * chunkSize));
    return Math.max(...peaks.slice(start, end));
  });
}

function WaveformPlayhead({
  kind,
  positionMs,
  axisDurationMs,
}: {
  kind: AudioKind;
  positionMs: number;
  axisDurationMs: number;
}) {
  const ratio =
    axisDurationMs > 0 ? Math.min(Math.max(positionMs / axisDurationMs, 0), 1) : 0;
  const x = WAVEFORM_AXIS_START + WAVEFORM_AXIS_WIDTH * ratio;

  return (
    <g className={`waveform-playhead ${kind}`} data-position-ms={Math.round(positionMs)}>
      <rect
        className="waveform-playhead-window"
        x={Math.max(WAVEFORM_AXIS_START, x - 18)}
        y="22"
        width="36"
        height="84"
        rx="18"
      />
      <line
        className="waveform-playhead-line"
        x1={x}
        y1="20"
        x2={x}
        y2="108"
      />
      <circle className="waveform-playhead-dot" cx={x} cy="64" r="5.6" />
    </g>
  );
}

function getSeriesBars({
  peaks,
  durationMs,
  axisDurationMs,
  widthRatio,
  minWidth,
  maxWidth,
}: {
  peaks: number[];
  durationMs: number;
  axisDurationMs: number;
  widthRatio: number;
  minWidth: number;
  maxWidth: number;
}) {
  const seriesRatio =
    axisDurationMs > 0 ? Math.min(Math.max(durationMs / axisDurationMs, 0), 1) : 0;
  const seriesWidth = Math.max(0, WAVEFORM_AXIS_WIDTH * seriesRatio);
  const step = peaks.length > 0 ? seriesWidth / peaks.length : 0;
  const width = Math.min(maxWidth, Math.max(minWidth, step * widthRatio));

  return peaks.map((peak, index) => ({
    peak,
    width,
    x: WAVEFORM_AXIS_START + index * step,
  }));
}

function EmptyWaveform() {
  const ghostBars = Array.from({ length: 40 }, (_, index) => {
    const wave = Math.sin(index * 0.62) * 0.5 + 0.5;
    const height = 7 + wave * 22;
    const x = 22 + index * 17;
    return { height, x, y: 64 - height / 2 };
  });

  return (
    <g className="waveform-empty">
      {ghostBars.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y={bar.y}
          width="5"
          height={bar.height}
          rx="2.5"
        />
      ))}
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
