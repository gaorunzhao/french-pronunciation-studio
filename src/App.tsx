import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenText,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { PracticeWorkspace } from "./components/PracticeWorkspace";
import { SessionList } from "./components/SessionList";
import { TextImport } from "./components/TextImport";
import { InMemoryRepository } from "./data/inMemoryRepository";
import type { StudioRepository } from "./data/repository";
import type {
  PracticeSession,
  PracticeSentence,
  TextDocument,
  VoiceSettings,
} from "./domain/types";
import { chunkFrenchText } from "./domain/sentenceChunker";
import { MockTtsAdapter } from "./modelAdapters/mockAdapters";
import { HttpTtsAdapter } from "./modelAdapters/httpTtsAdapter";
import type { TtsAdapter } from "./modelAdapters/types";

const defaultTtsAdapter = createDefaultTtsAdapter();
const defaultTtsBackendUrl = configuredTtsBackendUrl();

const defaultVoice: VoiceSettings = {
  engine: defaultTtsBackendUrl ? "chatterbox" : "mock",
  voiceId: "female-fr",
  speed: 1,
  styleStrength: 0.6,
};

const seedPracticeText = {
  title: "Le train vers le Grand Lac Salé",
  source:
    "Jules Verne, Le Tour du monde en quatre-vingts jours, chapitre XXVII, Wikisource, https://fr.wikisource.org/wiki/Le_Tour_du_monde_en_quatre-vingts_jours/Chapitre_27",
  body:
    "Pendant la nuit du 5 au 6 décembre, le train courut au sud-est sur un espace de cinquante milles environ ; puis il remonta d'autant vers le nord-est, en s'approchant du grand lac Salé. " +
    "Passepartout, vers neuf heures du matin, vint prendre l'air sur les passerelles. Le temps était froid, le ciel gris, mais il ne neigeait plus. " +
    "Le disque du soleil, élargi par les brumes, apparaissait comme une énorme pièce d'or, et Passepartout s'occupait à en calculer la valeur en livres sterling, quand il fut distrait de cet utile travail par l'apparition d'un personnage assez étrange. " +
    "Ce personnage, qui avait pris le train à la station d'Elko, était un homme de haute taille, très brun, moustaches noires, bas noirs, chapeau de soie noir, gilet noir, pantalon noir, cravate blanche, gants de peau de chien. " +
    "On eût dit un révérend. Il allait d'une extrémité du train à l'autre, et, sur la portière de chaque wagon, il collait avec des pains à cacheter une notice écrite à la main. " +
    "Passepartout s'approcha et lut sur une de ces notices que l'honorable elder William Hitch, missionnaire mormon, profitant de sa présence sur le train numéro quarante-huit, ferait, de onze heures à midi, dans le car numéro cent dix-sept, une conférence sur le Mormonisme. " +
    "La nouvelle se répandit rapidement dans le train, qui emportait une centaine de voyageurs. " +
    "Sur ce nombre, trente au plus, alléchés par l'appât de la conférence, occupaient à onze heures les banquettes du car numéro cent dix-sept. " +
    "Passepartout figurait au premier rang des fidèles. Ni son maître, ni Fix n'avaient cru devoir se déranger. " +
    "Mais pendant cette conférence, le train avait marché rapidement, et, vers midi et demi, il touchait à sa pointe nord-ouest le grand lac Salé. " +
    "De là, on pouvait embrasser, sur un vaste périmètre, l'aspect de cette mer intérieure, qui porte aussi le nom de mer Morte et dans laquelle se jette un Jourdain d'Amérique. " +
    "Lac admirable, encadré de belles roches sauvages, à larges assises, encroûtées de sel blanc, superbe nappe d'eau qui couvrait autrefois un espace plus considérable. " +
    "Autour du lac, la campagne était admirablement cultivée, car les Mormons s'entendent aux travaux de la terre : des ranchos et des corrals pour les animaux domestiques, des champs de blé, de maïs, de sorgho, des prairies luxuriantes, partout des haies de rosiers sauvages, des bouquets d'acacias et d'euphorbes. " +
    "Mais en ce moment le sol disparaissait sous une mince couche de neige, qui le poudrait légèrement.",
};

const emotionStrengthById = {
  neutral: 0.55,
  warm: 0.68,
  calm: 0.42,
  expressive: 0.82,
  focused: 0.6,
} as const;

type EmotionId = keyof typeof emotionStrengthById;

const modelIds = ["chatterbox"] as const;
type ModelId = (typeof modelIds)[number];

const voiceIds = ["default", "female-fr", "male-fr"] as const;
type VoiceId = (typeof voiceIds)[number];

interface PracticePreferences {
  modelId: ModelId;
  voiceId: VoiceId;
  emotion: EmotionId;
  speed: number;
  volume: number;
}

interface LocalModel {
  id: ModelId;
  name: string;
  shortName: string;
  size: string;
  detail: string;
  status: "ready" | "missing" | "downloading" | "error";
  progress: number;
  statusMessage?: string;
  voices: Array<{ id: VoiceId; label: string }>;
  emotions: Array<{ id: EmotionId; label: string }>;
  error?: string;
}

const practicePreferencesKey = "voix-claire:practice-preferences";
const defaultPracticePreferences: PracticePreferences = {
  modelId: "chatterbox",
  voiceId: "default",
  emotion: "warm",
  speed: 1,
  volume: 1,
};
const defaultModels: LocalModel[] = [
  {
    id: "chatterbox",
    name: "Chatterbox",
    shortName: "Chatterbox",
    size: "~11 GB",
    detail: "Higher quality multilingual TTS. Voice cloning needs reference audio; expression maps to exaggeration.",
    status: "missing",
    progress: 0,
    statusMessage: "Checking",
    voices: [{ id: "default", label: "Default" }],
    emotions: [
      { id: "neutral", label: "Neutral" },
      { id: "warm", label: "Warm" },
      { id: "calm", label: "Calm" },
      { id: "expressive", label: "Expressive" },
      { id: "focused", label: "Focused" },
    ],
  },
];

const defaultSeedState = createDefaultSeedState();

interface RecordingAttempt {
  id: string;
  name: string;
  audioUrl: string;
  durationMs: number;
  createdAt: string;
}

function configuredTtsBackendUrl() {
  const configuredUrl = import.meta.env.VITE_TTS_BACKEND_URL?.trim();
  if (configuredUrl) return configuredUrl;

  if (isTauriRuntime()) {
    return "http://127.0.0.1:8765";
  }

  if (isLocalBrowserRuntime()) {
    return "http://127.0.0.1:8765";
  }

  return "";
}

function createDefaultTtsAdapter() {
  const backendUrl = configuredTtsBackendUrl();
  return backendUrl
    ? new HttpTtsAdapter({ baseUrl: backendUrl })
    : new MockTtsAdapter();
}

function isTauriRuntime() {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in window
  );
}

function isLocalBrowserRuntime() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function formatRecordingTimestamp(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sortSessionsNewestFirst(sessions: PracticeSession[]) {
  return [...sessions].sort(
    (left, right) =>
      new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  );
}

function readPracticePreferences(): PracticePreferences {
  if (typeof window === "undefined") return defaultPracticePreferences;

  try {
    const rawPreferences = window.localStorage.getItem(practicePreferencesKey);
    if (!rawPreferences) return defaultPracticePreferences;
    const parsed = JSON.parse(rawPreferences) as Partial<PracticePreferences>;
    return {
      modelId: isModelId(parsed.modelId)
        ? parsed.modelId
        : defaultPracticePreferences.modelId,
      voiceId: isVoiceId(parsed.voiceId)
        ? parsed.voiceId
        : defaultPracticePreferences.voiceId,
      emotion: isEmotionId(parsed.emotion)
        ? parsed.emotion
        : defaultPracticePreferences.emotion,
      speed: clampNumber(parsed.speed, 0.25, 2, defaultPracticePreferences.speed),
      volume: clampNumber(parsed.volume, 0, 1, defaultPracticePreferences.volume),
    };
  } catch {
    return defaultPracticePreferences;
  }
}

function writePracticePreferences(preferences: PracticePreferences) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(practicePreferencesKey, JSON.stringify(preferences));
  } catch {
    // Preference persistence should never block practice.
  }
}

function isVoiceId(value: unknown): value is VoiceId {
  return typeof value === "string" && voiceIds.includes(value as VoiceId);
}

function isModelId(value: unknown): value is ModelId {
  return typeof value === "string" && modelIds.includes(value as ModelId);
}

function parseModelStatus(value: unknown): LocalModel["status"] | undefined {
  if (
    value === "ready" ||
    value === "missing" ||
    value === "downloading" ||
    value === "error"
  ) {
    return value;
  }
  return undefined;
}

function isEmotionId(value: unknown): value is EmotionId {
  return typeof value === "string" && value in emotionStrengthById;
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(value, min), max)
    : fallback;
}

function createDefaultSeedState(): {
  text: TextDocument;
  sentences: PracticeSentence[];
  session: PracticeSession;
} {
  const textId = "text-default-b2-verne";
  const sentences = chunkFrenchText(seedPracticeText.body).map(
    (sentence, index): PracticeSentence => ({
      id: `sentence-default-${index + 1}`,
      textId,
      index,
      text: sentence,
      state: "new",
    }),
  );
  const text: TextDocument = {
    id: textId,
    title: seedPracticeText.title,
    source: seedPracticeText.source,
    createdAt: new Date().toISOString(),
    sentenceIds: sentences.map((sentence) => sentence.id),
  };
  const session: PracticeSession = {
    id: "session-default-b2-verne",
    textId,
    startedAt: text.createdAt,
    attemptIds: [],
  };

  return { text, sentences, session };
}

interface AppProps {
  repository?: StudioRepository;
  ttsAdapter?: TtsAdapter;
}

type Screen = "import" | "practice";

export default function App({
  repository: providedRepository,
  ttsAdapter = defaultTtsAdapter,
}: AppProps) {
  const initialPreferences = useMemo(() => readPracticePreferences(), []);
  const [repository] = useState<StudioRepository>(
    () =>
      providedRepository ??
      new InMemoryRepository({
        texts: [defaultSeedState.text],
        sentences: defaultSeedState.sentences,
        sessions: [defaultSeedState.session],
      }),
  );
  const [screen, setScreen] = useState<Screen>(
    () => (providedRepository ? "import" : "practice"),
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [texts, setTexts] = useState<TextDocument[]>(
    () => (providedRepository ? [] : [defaultSeedState.text]),
  );
  const [sentences, setSentences] = useState<PracticeSentence[]>(
    () => (providedRepository ? [] : defaultSeedState.sentences),
  );
  const [sessions, setSessions] = useState<PracticeSession[]>(
    () => (providedRepository ? [] : [defaultSeedState.session]),
  );
  const [selectedTextId, setSelectedTextId] = useState<string | undefined>(
    () => (providedRepository ? undefined : defaultSeedState.text.id),
  );
  const [selectedSentenceId, setSelectedSentenceId] = useState<
    string | undefined
  >(
    () => (providedRepository ? undefined : defaultSeedState.sentences[0]?.id),
  );
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    () => (providedRepository ? undefined : defaultSeedState.session.id),
  );
  const [hasReference, setHasReference] = useState(false);
  const [isGeneratingReference, setIsGeneratingReference] = useState(false);
  const [referenceAudioUrl, setReferenceAudioUrl] = useState<string>();
  const [referenceVoiceKey, setReferenceVoiceKey] = useState("");
  const [referencePlaybackRequest, setReferencePlaybackRequest] = useState(0);
  const [referenceError, setReferenceError] = useState<string>();
  const [referenceDurationMs, setReferenceDurationMs] = useState(0);
  const [recordingAudioUrl, setRecordingAudioUrl] = useState<string>();
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [recordingError, setRecordingError] = useState<string>();
  const [recordingAttempts, setRecordingAttempts] = useState<RecordingAttempt[]>([]);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>();
  const [isRecording, setIsRecording] = useState(false);
  const [speed, setSpeed] = useState(initialPreferences.speed);
  const [playbackVolume, setPlaybackVolume] = useState(initialPreferences.volume);
  const [isWaveformExpanded, setIsWaveformExpanded] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<ModelId>(
    initialPreferences.modelId,
  );
  const [models, setModels] = useState<LocalModel[]>(defaultModels);
  const [voiceId, setVoiceId] = useState<VoiceId>(initialPreferences.voiceId);
  const [emotion, setEmotion] = useState<EmotionId>(initialPreferences.emotion);
  const mediaRecorderRef = useRef<MediaRecorder | undefined>(undefined);
  const mediaStreamRef = useRef<MediaStream | undefined>(undefined);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const recordingCancelledRef = useRef(false);
  const selectedSentenceIdRef = useRef<string | undefined>(
    providedRepository ? undefined : defaultSeedState.sentences[0]?.id,
  );
  const selectedTextIdRef = useRef<string | undefined>(
    providedRepository ? undefined : defaultSeedState.text.id,
  );
  const hasInitializedRef = useRef(false);

  const selectedText = useMemo(
    () => texts.find((text) => text.id === selectedTextId),
    [selectedTextId, texts],
  );
  const selectedSentence = useMemo(
    () => sentences.find((sentence) => sentence.id === selectedSentenceId),
    [selectedSentenceId, sentences],
  );
  const selectedRecording = useMemo(
    () => recordingAttempts.find((attempt) => attempt.id === selectedRecordingId),
    [recordingAttempts, selectedRecordingId],
  );
  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? models[0],
    [models, selectedModelId],
  );

  useEffect(() => {
    let isMounted = true;

    async function refreshModelStatus() {
      if (!defaultTtsBackendUrl) {
        if (isMounted) {
          markChatterboxModel("missing", "Backend off");
        }
        return;
      }

      try {
        const response = await fetch(`${defaultTtsBackendUrl}/health`);
        if (!response.ok) throw new Error(`health ${response.status}`);
        const health = (await response.json()) as {
          model?: string;
          modelLoaded?: boolean;
          error?: string;
          status?: string;
        };
        const modelName = String(health.model ?? "").toLowerCase();
        const isChatterboxBackend = modelName.includes("chatterbox");
        const backendStatus = parseModelStatus(health.status);
        const nextStatus = !isChatterboxBackend
          ? "missing"
          : health.modelLoaded
            ? "ready"
            : backendStatus === "error"
              ? "error"
              : "missing";
        if (!isMounted) return;
        markChatterboxModel(
          nextStatus,
          nextStatus === "ready"
            ? undefined
            : health.error || (isChatterboxBackend ? undefined : "Model missing"),
        );
      } catch {
        if (isMounted) {
          markChatterboxModel("missing", "Backend off");
        }
      }
    }

    void refreshModelStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  function markChatterboxModel(
    status: LocalModel["status"],
    statusMessage?: string,
  ) {
    setModels((currentModels) =>
      currentModels.map((model) =>
        model.id === "chatterbox"
          ? {
              ...model,
              status,
              progress: status === "ready" ? 100 : 0,
              statusMessage,
            }
          : model,
      ),
    );
  }

  async function ensureChatterboxModelReady() {
    if (selectedModel?.status === "ready") return true;
    if (!defaultTtsBackendUrl) {
      markChatterboxModel("missing", "Backend off");
      return false;
    }

    markChatterboxModel("downloading", "Downloading");

    try {
      const response = await fetch(
        `${defaultTtsBackendUrl}/models/chatterbox/download`,
        { method: "POST" },
      );
      const payload = (await response.json()) as {
        modelLoaded?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.modelLoaded) {
        markChatterboxModel("error", payload.error || "Download failed");
        return false;
      }

      markChatterboxModel("ready");
      return true;
    } catch (error) {
      markChatterboxModel(
        "error",
        error instanceof Error ? error.message : "Download failed",
      );
      return false;
    }
  }

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    if (!providedRepository) return;

    let isMounted = true;

    async function initializeStudio() {
      let availableTexts = await repository.listTexts();

      if (availableTexts.length === 0 && !providedRepository) {
        await repository.createText(seedPracticeText);
        availableTexts = await repository.listTexts();
      }

      let availableSessions = sortSessionsNewestFirst(await repository.listSessions());
      const firstText = availableTexts[0];

      if (
        firstText &&
        !availableSessions.some((session) => session.textId === firstText.id)
      ) {
        await repository.createSession(firstText.id);
        availableSessions = sortSessionsNewestFirst(await repository.listSessions());
      }

      const firstSession = availableSessions[0];
      const activeTextId = firstSession?.textId ?? firstText?.id;
      const activeSentences = activeTextId
        ? await repository.listSentences(activeTextId)
        : [];

      if (!isMounted) return;

      setTexts(availableTexts);
      setSessions(sortSessionsNewestFirst(availableSessions));
      setSentences(activeSentences);
      setActiveSessionId(firstSession?.id);
      setSelectedTextId(activeTextId);
      setSelectedSentenceId(activeSentences[0]?.id);
      selectedTextIdRef.current = activeTextId;
      selectedSentenceIdRef.current = activeSentences[0]?.id;
      setScreen(activeTextId ? "practice" : "import");
    }

    void initializeStudio();

    return () => {
      isMounted = false;
    };
  }, [providedRepository, repository]);

  useEffect(() => {
    writePracticePreferences({
      modelId: selectedModelId,
      voiceId,
      emotion,
      speed,
      volume: playbackVolume,
    });
  }, [emotion, playbackVolume, selectedModelId, speed, voiceId]);

function selectModel(modelId: string) {
    if (!isModelId(modelId)) return;
    setSelectedModelId(modelId);
    const nextModel = models.find((model) => model.id === modelId);
    const nextVoice = nextModel?.voices[0]?.id;
    const nextEmotion = nextModel?.emotions[0]?.id;
    if (nextVoice && !nextModel?.voices.some((voice) => voice.id === voiceId)) {
      setVoiceId(nextVoice);
    }
    if (nextEmotion && !nextModel?.emotions.some((item) => item.id === emotion)) {
      setEmotion(nextEmotion);
    }
  }

  async function createSessionFromImport(input: { title: string; body: string }) {
    const title = input.title.trim() || `Passage ${texts.length + 1}`;
    const created = await repository.createText({
      ...input,
      title,
      body: input.body.trim(),
    });
    const session = await repository.createSession(created.text.id);
    const nextTexts = await repository.listTexts();
    const nextSessions = sortSessionsNewestFirst(await repository.listSessions());

    setTexts(nextTexts);
    setSessions(nextSessions);
    setSentences(created.sentences);
    setSelectedTextId(created.text.id);
    setSelectedSentenceId(created.sentences[0]?.id);
    setActiveSessionId(session.id);
    selectedTextIdRef.current = created.text.id;
    selectedSentenceIdRef.current = created.sentences[0]?.id;
    clearSentenceLabState();
    setScreen("practice");
  }

  async function selectSession(sessionId: string) {
    if (sessionId === activeSessionId) {
      setScreen("practice");
      return;
    }

    const nextSession = sessions.find((session) => session.id === sessionId);
    if (!nextSession) return;

    const nextSentences = await repository.listSentences(nextSession.textId);
    setActiveSessionId(sessionId);
    setSelectedTextId(nextSession.textId);
    setSentences(nextSentences);
    setSelectedSentenceId(nextSentences[0]?.id);
    selectedTextIdRef.current = nextSession.textId;
    selectedSentenceIdRef.current = nextSentences[0]?.id;
    clearSentenceLabState();
    setScreen("practice");
  }

  async function playReference() {
    if (!selectedSentence) return;
    if (selectedModel?.status !== "ready") {
      const modelReady = await ensureChatterboxModelReady();
      if (!modelReady) return;
    }

    const sentenceId = selectedSentence.id;
    const sentenceText = selectedSentence.text;
    const textId = selectedSentence.textId;
    const nextReferenceVoiceKey = [
      textId,
      sentenceId,
      sentenceText,
      selectedModelId,
      voiceId,
      emotion,
      speed.toFixed(2),
    ].join(":");
    setIsWaveformExpanded(true);

    if (referenceAudioUrl && referenceVoiceKey === nextReferenceVoiceKey) {
      setReferencePlaybackRequest((current) => current + 1);
      return;
    }

    setIsGeneratingReference(true);
    setReferenceError(undefined);

    try {
      const generated = await ttsAdapter.generate({
        sentenceId,
        text: sentenceText,
        voice: {
          ...defaultVoice,
          engine: "chatterbox",
          voiceId,
          speed,
          styleStrength: emotionStrengthById[emotion],
        },
      });
      if (
        selectedSentenceIdRef.current !== sentenceId ||
        selectedTextIdRef.current !== textId
      ) {
        return;
      }

      setHasReference(true);
      setReferenceAudioUrl(generated.playbackUrl);
      setReferenceVoiceKey(nextReferenceVoiceKey);
      setReferenceDurationMs(generated.durationMs);
      if (generated.playbackUrl) {
        setReferencePlaybackRequest((current) => current + 1);
      }
    } catch (error) {
      if (selectedSentenceIdRef.current !== sentenceId) return;
      setReferenceError(
        error instanceof Error
          ? error.message
          : "Could not generate reference audio.",
      );
    } finally {
      if (selectedSentenceIdRef.current === sentenceId) {
        setIsGeneratingReference(false);
      }
    }
  }

  function clearSentenceLabState() {
    stopActiveRecording();
    setHasReference(false);
    setIsGeneratingReference(false);
    setReferenceAudioUrl(undefined);
    setReferenceVoiceKey("");
    setReferenceError(undefined);
    setReferenceDurationMs(0);
    clearRecordingState();
  }

  function selectSentence(sentenceId: string) {
    if (sentenceId === selectedSentenceId) return;

    selectedSentenceIdRef.current = sentenceId;
    setSelectedSentenceId(sentenceId);
    clearSentenceLabState();
  }

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("Recording is not available in this browser.");
      return;
    }

    setRecordingError(undefined);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      recordingStartedAtRef.current = performance.now();
      recordingCancelledRef.current = false;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const durationMs = Math.max(0, performance.now() - recordingStartedAtRef.current);
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stopRecordingStream();
        setIsRecording(false);
        if (recordingCancelledRef.current) {
          recordingChunksRef.current = [];
          return;
        }
        if (!blob.size) {
          setRecordingError("No recording was captured.");
          return;
        }

        const nextUrl = URL.createObjectURL(blob);
        const createdAt = new Date();
        const attempt: RecordingAttempt = {
          id: `recording-${createdAt.getTime()}`,
          name: `Take ${formatRecordingTimestamp(createdAt)}`,
          audioUrl: nextUrl,
          durationMs,
          createdAt: createdAt.toISOString(),
        };

        setRecordingAttempts((currentAttempts) => [attempt, ...currentAttempts]);
        setSelectedRecordingId(attempt.id);
        setRecordingAudioUrl(nextUrl);
        setRecordingDurationMs(durationMs);
      });

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      stopRecordingStream();
      setIsRecording(false);
      setRecordingError(
        error instanceof Error
          ? error.message
          : "Could not start recording.",
      );
    }
  }

  function clearRecordingState() {
    recordingAttempts.forEach((attempt) => URL.revokeObjectURL(attempt.audioUrl));
    setRecordingAttempts([]);
    setSelectedRecordingId(undefined);
    setRecordingAudioUrl(undefined);
    setRecordingDurationMs(0);
    setRecordingError(undefined);
    setIsRecording(false);
    recordingChunksRef.current = [];
    recordingCancelledRef.current = true;
  }

  function selectRecordingAttempt(recordingId: string) {
    const nextRecording = recordingAttempts.find((attempt) => attempt.id === recordingId);
    setSelectedRecordingId(recordingId);
    setRecordingAudioUrl(nextRecording?.audioUrl);
    setRecordingDurationMs(nextRecording?.durationMs ?? 0);
  }

  function renameRecordingAttempt(recordingId: string, name: string) {
    setRecordingAttempts((currentAttempts) =>
      currentAttempts.map((attempt) =>
        attempt.id === recordingId ? { ...attempt, name } : attempt,
      ),
    );
  }

  function selectAdjacentSentence(offset: number) {
    if (!selectedSentenceId) return;
    const currentIndex = sentences.findIndex((sentence) => sentence.id === selectedSentenceId);
    if (currentIndex < 0) return;
    const nextSentence = sentences[currentIndex + offset];
    if (nextSentence) {
      selectSentence(nextSentence.id);
    }
  }

  function reorderSessions(sourceSessionId: string, targetSessionId: string) {
    setSessions((currentSessions) => {
      const sourceIndex = currentSessions.findIndex((session) => session.id === sourceSessionId);
      const targetIndex = currentSessions.findIndex((session) => session.id === targetSessionId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return currentSessions;
      }

      const nextSessions = [...currentSessions];
      const [movedSession] = nextSessions.splice(sourceIndex, 1);
      nextSessions.splice(targetIndex, 0, movedSession);
      return nextSessions;
    });
  }

  useEffect(() => {
    if (screen !== "practice") return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        selectAdjacentSentence(1);
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        selectAdjacentSentence(-1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, selectedSentenceId, sentences]);

  function stopActiveRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") {
      recorder.stop();
    }
    stopRecordingStream();
    mediaRecorderRef.current = undefined;
  }

  function stopRecordingStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = undefined;
  }

  return (
    <main
      className={
        isSidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"
      }
    >
      <aside
        className="sidebar"
        aria-label="App sidebar"
        data-collapsed={isSidebarCollapsed}
      >
        <div className="sidebar-header">
          <h1 className="app-title">Voix Claire</h1>
          <button
            className="icon-button sidebar-toggle"
            type="button"
            aria-label={
              isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-expanded={!isSidebarCollapsed}
            onClick={() => setIsSidebarCollapsed((current) => !current)}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen aria-hidden="true" size={18} strokeWidth={2.1} />
            ) : (
              <PanelLeftClose aria-hidden="true" size={18} strokeWidth={2.1} />
            )}
          </button>
        </div>
        <nav className="nav-stack" aria-label="Main navigation">
          <button
            className={screen === "import" ? "nav-button active" : "nav-button"}
            type="button"
            aria-label="New passage"
            aria-current={screen === "import" ? "page" : undefined}
            onClick={() => setScreen("import")}
          >
            <BookOpenText aria-hidden="true" size={18} strokeWidth={2.1} />
            <span className="nav-label">New passage</span>
          </button>
        </nav>
        <SessionList
          sessions={sessions}
          texts={texts}
          selectedSessionId={screen === "practice" ? activeSessionId : undefined}
          onSelectSession={selectSession}
          onReorderSessions={reorderSessions}
        />
      </aside>
      <section className="workspace" aria-label="Practice workspace">
        {screen === "import" ? (
          <TextImport onCreate={createSessionFromImport} />
        ) : (
          <PracticeWorkspace
            text={selectedText}
            sentences={sentences}
            selectedSentenceId={selectedSentenceId}
            hasReference={hasReference}
            isGeneratingReference={isGeneratingReference}
            referenceAudioUrl={referenceAudioUrl}
            referencePlaybackRequest={referencePlaybackRequest}
            referenceError={referenceError}
            referenceDurationMs={referenceDurationMs}
            recordingAudioUrl={selectedRecording?.audioUrl}
            recordingError={recordingError}
            recordingDurationMs={selectedRecording?.durationMs ?? recordingDurationMs}
            recordingAttempts={recordingAttempts}
            selectedRecordingId={selectedRecordingId}
            isRecording={isRecording}
            isWaveformExpanded={isWaveformExpanded}
            modelId={selectedModelId}
            modelOptions={models.map((model) => ({
              id: model.id,
              label: model.shortName,
              status: model.status,
              progress: model.progress,
              size: model.size,
              statusMessage: model.statusMessage,
            }))}
            selectedModelStatus={selectedModel?.status ?? "missing"}
            selectedModelProgress={selectedModel?.progress ?? 0}
            selectedModelStatusMessage={selectedModel?.statusMessage}
            speed={speed}
            volume={playbackVolume}
            voiceId={voiceId}
            emotion={emotion}
            voiceOptions={selectedModel?.voices ?? []}
            emotionOptions={selectedModel?.emotions ?? []}
            onModelChange={selectModel}
            onVoiceChange={(nextVoiceId) => {
              if (isVoiceId(nextVoiceId)) {
                setVoiceId(nextVoiceId);
              }
            }}
            onEmotionChange={(nextEmotion) => setEmotion(nextEmotion as EmotionId)}
            onSpeedChange={setSpeed}
            onVolumeChange={setPlaybackVolume}
            onSelectSentence={selectSentence}
            onPlayReference={playReference}
            onToggleRecording={toggleRecording}
            onSelectRecording={selectRecordingAttempt}
            onRenameRecording={renameRecordingAttempt}
            onToggleWaveform={() => setIsWaveformExpanded((current) => !current)}
          />
        )}
      </section>
    </main>
  );
}
