import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Mic,
  StopCircle,
  Play,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Volume2,
  FileText,
  ChevronRight,
  TrendingUp,
  Brain,
  Award,
  Sun,
  Moon,
} from 'lucide-react';
import { LiveCamera } from './components/LiveCamera';
import { ScoreCard } from './components/ScoreCard';
import { useEyeContact } from './hooks/useEyeContact';
import { useSpeechAnalysis } from './hooks/useSpeechAnalysis';
import { useVolumeAnalysis } from './hooks/useVolumeAnalysis';
import {
  SessionMetrics,
  computePaceScore,
  computeFillerScore,
  computeEyeContactScore,
  computeVocabDiversity,
  computePauseScore,
  computeOverallScore,
  getStatusFromScore,
  getFeedback,
} from './lib/metrics';

type AppMode = 'idle' | 'recording' | 'results';

const PRACTICE_PROMPTS = [
  {
    title: 'Startup Pitch (60s)',
    topic: 'Pitch your AI product: problem, solution, traction, and why now.',
  },
  {
    title: 'Executive Update (90s)',
    topic: 'Explain quarterly performance, key bottlenecks, and next sprint priorities.',
  },
  {
    title: 'Explain Like I\'m 5 (60s)',
    topic: 'Explain how machine learning or quantum computing works without technical jargon.',
  },
  {
    title: 'Keynote Introduction (45s)',
    topic: 'Deliver a high-energy welcome to an auditorium of 500 tech innovators.',
  },
];

export default function App() {
  const [mode, setMode] = useState<AppMode>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedPrompt, setSelectedPrompt] = useState(PRACTICE_PROMPTS[0]);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Theme state: defaults to Light Mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('presentpro_theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('presentpro_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Analysis Hooks
  const eyeContact = useEyeContact(videoElementRef);
  const speech = useSpeechAnalysis();
  const volume = useVolumeAnalysis();

  // Elapsed Timer Effect
  useEffect(() => {
    if (mode === 'recording') {
      setElapsedSeconds(0);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  const handleStartSession = useCallback(() => {
    setCameraError(null);
    setMode('recording');
    eyeContact.reset();
    speech.reset();
    volume.reset();

    // Start tracking services
    eyeContact.startTracking();
    speech.start();
  }, [eyeContact, speech, volume]);

  const handleVideoElementReady = useCallback((video: HTMLVideoElement) => {
    videoElementRef.current = video;
  }, []);

  const handleStreamReady = useCallback(
    (stream: MediaStream) => {
      activeStreamRef.current = stream;
      volume.start(stream);
    },
    [volume]
  );

  const handleStopSession = useCallback(() => {
    // Stop recording hooks
    eyeContact.stopTracking();
    speech.stop();
    volume.stop();

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }

    // Compute all 6 metrics
    const duration = Math.max(1, elapsedSeconds);
    const words = speech.words;
    const wordCount = speech.wordCount;
    const wpm = Math.round((wordCount / (duration / 60)) || 0);
    const eyeContactPct = eyeContact.pct;
    const fillerCount = speech.fillerInstances.length;

    const eyeScore = computeEyeContactScore(eyeContactPct);
    const fillerScore = computeFillerScore(fillerCount, wordCount);
    const paceScore = computePaceScore(wpm);
    const pauseScore = computePauseScore(speech.pauses, duration);
    const volumeScore = volume.volumeConsistencyScore;
    const vocabData = computeVocabDiversity(words);

    const overallScore = computeOverallScore({
      eyeContact: eyeScore,
      filler: fillerScore,
      pace: paceScore,
      pause: pauseScore,
      volume: volumeScore,
      vocab: vocabData.score,
    });

    const metricsDraft: Omit<SessionMetrics, 'feedback'> = {
      durationSeconds: duration,
      wordCount,
      uniqueWordCount: vocabData.uniqueCount,
      wpm,
      eyeContactPct,
      fillerCount,
      fillerInstances: speech.fillerInstances,
      fillerWordBreakdown: speech.fillerWordBreakdown,
      pauseQualityScore: pauseScore,
      volumeConsistencyScore: volumeScore,
      vocabDiversityScore: vocabData.score,
      overallScore,
      breakdown: {
        eyeContact: {
          name: 'Eye Contact',
          score: eyeScore,
          label: 'Eye Contact',
          valueDisplay: `${Math.round(eyeContactPct)}%`,
          status: getStatusFromScore(eyeScore),
          description: 'Gaze direction analyzed via WASM iris vector tracking.',
          benchmark: '70% - 85%',
        },
        fillerWords: {
          name: 'Verbal Clarity',
          score: fillerScore,
          label: 'Verbal Clarity',
          valueDisplay: `${fillerCount} fillers`,
          status: getStatusFromScore(fillerScore),
          description: 'Frequency of filler words like "um", "uh", "basically".',
          benchmark: '0 - 2 per session',
        },
        pace: {
          name: 'Speaking Pace',
          score: paceScore,
          label: 'Speaking Pace',
          valueDisplay: `${wpm} WPM`,
          status: getStatusFromScore(paceScore),
          description: 'Speaking tempo calibrated against TED talk standards.',
          benchmark: '130 - 150 WPM',
        },
        pauseQuality: {
          name: 'Pause Quality',
          score: pauseScore,
          label: 'Pause Quality',
          valueDisplay: `${pauseScore}/100`,
          status: getStatusFromScore(pauseScore),
          description: 'Rhythm and length of natural speaking pauses.',
          benchmark: '2 - 5 per min',
        },
        volumeConsistency: {
          name: 'Volume Stability',
          score: volumeScore,
          label: 'Volume Stability',
          valueDisplay: `${volumeScore}/100`,
          status: getStatusFromScore(volumeScore),
          description: 'Microphone RMS amplitude variance across session.',
          benchmark: 'Steady projection',
        },
        vocabDiversity: {
          name: 'Vocab Diversity',
          score: vocabData.score,
          label: 'Vocab Diversity',
          valueDisplay: `${vocabData.uniqueCount} unique`,
          status: getStatusFromScore(vocabData.score),
          description: 'Type-Token Ratio assessing lexical richness.',
          benchmark: 'TTR > 0.60',
        },
      },
    };

    const coachingFeedback = getFeedback(metricsDraft);

    const completedMetrics: SessionMetrics = {
      ...metricsDraft,
      feedback: coachingFeedback,
    };

    setSessionMetrics(completedMetrics);
    setMode('results');
  }, [elapsedSeconds, eyeContact, speech, volume]);

  const handleSimulateSampleRun = useCallback(() => {
    // High-fidelity precomputed demo for evaluators/offline testing
    const sampleDuration = 58;
    const sampleTranscript =
      'Good morning everyone. Today I am thrilled to introduce PresentPro, the AI presentation coach that sees how you speak, not just what you say. We track eye contact directly using browser WASM, meaning your video never leaves your laptop. We also measure volume consistency, speaking pace, and pause quality in real-time. With zero API keys and 100% offline capability, speakers can rehearse high-stakes keynotes with complete privacy and instant feedback. Thank you.';

    const words = sampleTranscript.trim().split(/\s+/);
    const wordCount = words.length;
    const wpm = 142;
    const eyeContactPct = 78;
    const fillerCount = 2; // "basically", "like"

    const eyeScore = computeEyeContactScore(eyeContactPct);
    const fillerScore = computeFillerScore(fillerCount, wordCount);
    const paceScore = computePaceScore(wpm);
    const pauseScore = 88;
    const volumeScore = 91;
    const vocabData = computeVocabDiversity(words);

    const overallScore = computeOverallScore({
      eyeContact: eyeScore,
      filler: fillerScore,
      pace: paceScore,
      pause: pauseScore,
      volume: volumeScore,
      vocab: vocabData.score,
    });

    const metricsDraft: Omit<SessionMetrics, 'feedback'> = {
      durationSeconds: sampleDuration,
      wordCount,
      uniqueWordCount: vocabData.uniqueCount,
      wpm,
      eyeContactPct,
      fillerCount,
      fillerInstances: [
        { word: 'like', timestamp: 14.2, index: 22 },
        { word: 'basically', timestamp: 24.8, index: 38 },
      ],
      fillerWordBreakdown: { basically: 1, like: 1 },
      pauseQualityScore: pauseScore,
      volumeConsistencyScore: volumeScore,
      vocabDiversityScore: vocabData.score,
      overallScore,
      breakdown: {
        eyeContact: {
          name: 'Eye Contact',
          score: eyeScore,
          label: 'Eye Contact',
          valueDisplay: '78%',
          status: 'excellent',
          description: 'Gaze direction analyzed via WASM iris vector tracking.',
          benchmark: '70% - 85%',
        },
        fillerWords: {
          name: 'Verbal Clarity',
          score: fillerScore,
          label: 'Verbal Clarity',
          valueDisplay: '2 fillers',
          status: 'good',
          description: 'Frequency of filler words like "um", "uh", "basically".',
          benchmark: '0 - 2 per session',
        },
        pace: {
          name: 'Speaking Pace',
          score: paceScore,
          label: 'Speaking Pace',
          valueDisplay: '142 WPM',
          status: 'excellent',
          description: 'Speaking tempo calibrated against TED talk standards.',
          benchmark: '130 - 150 WPM',
        },
        pauseQuality: {
          name: 'Pause Quality',
          score: pauseScore,
          label: 'Pause Quality',
          valueDisplay: '88/100',
          status: 'excellent',
          description: 'Rhythm and length of natural speaking pauses.',
          benchmark: '2 - 5 per min',
        },
        volumeConsistency: {
          name: 'Volume Stability',
          score: volumeScore,
          label: 'Volume Stability',
          valueDisplay: '91/100',
          status: 'excellent',
          description: 'Microphone RMS amplitude variance across session.',
          benchmark: 'Steady projection',
        },
        vocabDiversity: {
          name: 'Vocab Diversity',
          score: vocabData.score,
          label: 'Vocab Diversity',
          valueDisplay: `${vocabData.uniqueCount} unique`,
          status: 'good',
          description: 'Type-Token Ratio assessing lexical richness.',
          benchmark: 'TTR > 0.60',
        },
      },
    };

    const coachingFeedback = getFeedback(metricsDraft);

    const completedMetrics: SessionMetrics = {
      ...metricsDraft,
      feedback: coachingFeedback,
    };

    setSessionMetrics(completedMetrics);
    speech.setSimulatedSpeech?.(sampleTranscript);
    setMode('results');
  }, [speech]);

  const handleReset = useCallback(() => {
    setMode('idle');
    setSessionMetrics(null);
    setElapsedSeconds(0);
    eyeContact.reset();
    speech.reset();
    volume.reset();
  }, [eyeContact, speech, volume]);

  return (
    <div className="min-h-screen bg-paper-200 dark:bg-[#0b0f19] text-stone-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar - Frosted Header */}
      <header className="sticky top-0 z-50 bg-paper-100/90 dark:bg-[#0f172a]/90 backdrop-blur-md border-b border-stone-200/80 dark:border-slate-800 transition-colors duration-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-teal-600/30">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-stone-900 dark:text-white tracking-tight leading-none m-0">
                  PresentPro
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                  WASM Native
                </span>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-slate-400 m-0">
                100% Client-Side AI Presentation Coach
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-600 dark:text-slate-400 font-medium bg-stone-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-stone-200 dark:border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Zero API Keys • 100% Private</span>
            </div>

            {mode === 'idle' && (
              <button
                onClick={handleSimulateSampleRun}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-300 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                Sample 60s Pitch
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-stone-50 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-300 dark:text-slate-200 transition-colors shadow-sm"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600 dark:text-slate-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          {/* STATE 1: IDLE / ONBOARDING */}
          {mode === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="space-y-12"
            >
              {/* Hero Section */}
              <div className="text-center max-w-3xl mx-auto space-y-4 pt-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>AI Multimodal Presentation Intelligence</span>
                </div>

                <h2 className="text-4xl sm:text-5xl font-black text-stone-900 dark:text-white tracking-tight leading-tight">
                  Master HOW you speak, <br className="hidden sm:inline" />
                  <span className="text-teal-600">not just what you say.</span>
                </h2>

                <p className="text-stone-600 dark:text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                  PresentPro tracks your facial gaze via MediaPipe iris WASM, analyzes vocal RMS projection, and detects filler words in real time — with zero cloud latency and complete browser privacy.
                </p>

                {/* Primary Action Button */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                  <button
                    onClick={handleStartSession}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-warm-lg shadow-teal-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Start Practice Session</span>
                  </button>

                  <button
                    onClick={handleSimulateSampleRun}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 font-semibold text-sm transition-all shadow-sm"
                  >
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Preview Sample Analysis</span>
                  </button>
                </div>
              </div>

              {/* Practice Prompts Selector */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-stone-200/90 dark:border-slate-800 shadow-warm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-600" />
                      <span>Select a Practice Topic</span>
                    </h3>
                    <p className="text-xs text-stone-500">
                      Choose an interactive prompt to anchor your rehearsal session.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {PRACTICE_PROMPTS.map((p) => {
                    const isSelected = selectedPrompt.title === p.title;
                    return (
                      <div
                        key={p.title}
                        onClick={() => setSelectedPrompt(p)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-teal-50/70 border-teal-500 shadow-sm'
                            : 'bg-paper-100 hover:bg-stone-50 border-stone-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold text-stone-900">{p.title}</h4>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-teal-600" />
                          )}
                        </div>
                        <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">{p.topic}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 6 Multimodal Metrics Feature Grid */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-stone-900">
                    6 Real-Time Presentation Dimensions
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Everything runs 100% offline in browser memory.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-warm">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                      <Video className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-900 mb-1">
                      WASM Iris Eye Tracking
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                      Measures gaze angle and audience lock using MediaPipe 478 face landmarks. Never leaves your device.
                    </p>
                  </div>

                  <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-warm">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                      <Mic className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-900 mb-1">
                      Filler Word Interceptor
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                      Flags "um", "uh", "like", and "basically" with exact timestamps and visual transcript highlighting.
                    </p>
                  </div>

                  <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-warm">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-900 mb-1">
                      Pace Analysis (WPM)
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                      Calibrates cadence against the 130-150 WPM TED-talk standard to prevent rushing or dragging.
                    </p>
                  </div>

                  <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-warm">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                      <Clock className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-900 mb-1">
                      Pause Flow Quality
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                      Differentiates between confident rhetorical pauses (0.8s-1.8s) and hesitant awkward silences.
                    </p>
                  </div>

                  <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-warm">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-900 mb-1">
                      Volume Consistency RMS
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                      Web Audio API analyzer monitors decibel stability so you don't drop volume at sentence endings.
                    </p>
                  </div>

                  <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-warm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                      <Brain className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-900 mb-1">
                      Lexical Diversity (TTR)
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                      Computes Type-Token Ratio to reward rich verbs and avoid repetitive linguistic crutches.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STATE 2: RECORDING / LIVE HUD */}
          {mode === 'recording' && (
            <motion.div
              key="recording"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              {/* Active Prompt Banner */}
              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-warm flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    Active Challenge
                  </span>
                  <h3 className="text-base font-bold text-stone-900 mt-0.5">
                    {selectedPrompt.title}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-400">{selectedPrompt.topic}</p>
                </div>

                <button
                  onClick={handleStopSession}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/25 transition-all hover:scale-105 active:scale-95"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Finish & Analyze</span>
                </button>
              </div>

              {/* Live Camera View with Eye Contact HUD */}
              <LiveCamera
                isLooking={eyeContact.isLooking}
                eyeContactPct={eyeContact.pct}
                currentVolume={volume.currentVolume}
                elapsedSeconds={elapsedSeconds}
                wordCount={speech.wordCount}
                fillerCount={speech.fillerInstances.length}
                isReady={eyeContact.ready}
                onVideoElementReady={handleVideoElementReady}
                onStreamReady={handleStreamReady}
                onCameraError={(err) => setCameraError(err)}
              />

              {cameraError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                  {cameraError} — Please ensure camera permissions are allowed in your browser.
                </div>
              )}

              {/* Real-Time Live Transcript Preview */}
              <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-warm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>Real-Time Speech Stream</span>
                  </h4>
                  <div className="flex items-center gap-2 text-xs font-mono text-stone-600 dark:text-slate-400">
                    <span>{speech.wordCount} words spoken</span>
                    <span>•</span>
                    <span>
                      {elapsedSeconds > 0
                        ? `${Math.round((speech.wordCount / (elapsedSeconds / 60)) || 0)} WPM`
                        : '0 WPM'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-paper-100 rounded-xl border border-stone-200/80 min-h-[70px] max-h-[140px] overflow-y-auto text-sm leading-relaxed text-stone-800">
                  {speech.transcript ? (
                    <span>
                      {speech.transcript}{' '}
                      <span className="text-stone-400 italic">
                        {speech.interimTranscript}
                      </span>
                    </span>
                  ) : (
                    <span className="text-stone-400 italic">
                      Start speaking naturally into your microphone... Transcript and filler words will stream here.
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* STATE 3: RESULTS / COACHING REPORT */}
          {mode === 'results' && sessionMetrics && (
            <ScoreCard
              metrics={sessionMetrics}
              transcript={speech.transcript}
              onReset={handleReset}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-paper-100 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700 dark:text-slate-300">PresentPro</span>
            <span>•</span>
            <span>AI Presentation Coach</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-teal-700 font-medium">100% In-Browser WASM</span>
            <span>Zero Data Exfiltration</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
