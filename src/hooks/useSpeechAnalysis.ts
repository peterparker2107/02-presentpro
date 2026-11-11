import { useState, useRef, useCallback, useEffect } from 'react';
import { FillerInstance, COMMON_FILLER_WORDS, normalizeWord } from '../lib/metrics';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface PauseEvent {
  startTime: number;
  endTime: number;
  duration: number; // in seconds
}

export interface SpeechAnalysisState {
  transcript: string;
  interimTranscript: string;
  wordCount: number;
  words: string[];
  fillerInstances: FillerInstance[];
  fillerWordBreakdown: Record<string, number>;
  pauses: PauseEvent[];
  isListening: boolean;
  supported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  setSimulatedSpeech?: (text: string) => void;
}

export function useSpeechAnalysis(): SpeechAnalysisState {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const [fillerInstances, setFillerInstances] = useState<FillerInstance[]>([]);
  const [fillerWordBreakdown, setFillerWordBreakdown] = useState<Record<string, number>>({});
  const [pauses, setPauses] = useState<PauseEvent[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const lastSpeechTimeRef = useRef<number>(0);
  const wordsRef = useRef<string[]>([]);
  const fillersRef = useRef<FillerInstance[]>([]);
  const breakdownRef = useRef<Record<string, number>>({});
  const pausesRef = useRef<PauseEvent[]>([]);

  // Check support on mount
  useEffect(() => {
    const SpeechConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechConstructor) {
      setSupported(false);
    }
  }, []);

  const analyzeWordsForFillers = useCallback((fullText: string) => {
    const rawTokens = fullText.trim().split(/\s+/).filter(Boolean);
    wordsRef.current = rawTokens;
    setWords(rawTokens);
    setWordCount(rawTokens.length);

    const detectedFillers: FillerInstance[] = [];
    const breakdown: Record<string, number> = {};
    const lowerText = fullText.toLowerCase();

    // Check multi-word fillers first
    const multiWordFillers = COMMON_FILLER_WORDS.filter(w => w.includes(' '));
    for (const phrase of multiWordFillers) {
      let searchIdx = 0;
      while ((searchIdx = lowerText.indexOf(phrase, searchIdx)) !== -1) {
        // Word boundary check
        const before = searchIdx === 0 || /[\s.,/#!$%^&*;:{}=\-_`~()?]/.test(lowerText[searchIdx - 1]);
        const afterIdx = searchIdx + phrase.length;
        const after = afterIdx >= lowerText.length || /[\s.,/#!$%^&*;:{}=\-_`~()?]/.test(lowerText[afterIdx]);

        if (before && after) {
          const timestamp = startTimeRef.current > 0 ? (Date.now() - startTimeRef.current) / 1000 : 0;
          detectedFillers.push({
            word: phrase,
            timestamp: parseFloat(timestamp.toFixed(1)),
            index: searchIdx,
          });
          breakdown[phrase] = (breakdown[phrase] || 0) + 1;
        }
        searchIdx += phrase.length;
      }
    }

    // Check single-word fillers
    rawTokens.forEach((token, idx) => {
      const clean = normalizeWord(token);
      if (COMMON_FILLER_WORDS.includes(clean as typeof COMMON_FILLER_WORDS[number]) && !clean.includes(' ')) {
        const timestamp = startTimeRef.current > 0 ? (Date.now() - startTimeRef.current) / 1000 : 0;
        detectedFillers.push({
          word: clean,
          timestamp: parseFloat(timestamp.toFixed(1)),
          index: idx,
        });
        breakdown[clean] = (breakdown[clean] || 0) + 1;
      }
    });

    fillersRef.current = detectedFillers;
    breakdownRef.current = breakdown;
    setFillerInstances([...detectedFillers]);
    setFillerWordBreakdown({ ...breakdown });
  }, []);

  const start = useCallback(() => {
    const SpeechConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

    isListeningRef.current = true;
    setIsListening(true);
    startTimeRef.current = Date.now();
    lastSpeechTimeRef.current = Date.now();

    if (!SpeechConstructor) {
      console.warn('SpeechRecognition API not supported in this browser. Running with manual/sample transcript.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const now = Date.now();
        const timeDiffSec = (now - lastSpeechTimeRef.current) / 1000;

        // Check for meaningful pause (> 0.65s)
        if (timeDiffSec >= 0.65 && lastSpeechTimeRef.current > startTimeRef.current) {
          const pause: PauseEvent = {
            startTime: parseFloat(((lastSpeechTimeRef.current - startTimeRef.current) / 1000).toFixed(2)),
            endTime: parseFloat(((now - startTimeRef.current) / 1000).toFixed(2)),
            duration: parseFloat(timeDiffSec.toFixed(2)),
          };
          pausesRef.current.push(pause);
          setPauses([...pausesRef.current]);
        }
        lastSpeechTimeRef.current = now;

        let accumulatedFinal = '';
        let currentInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            accumulatedFinal += result[0].transcript + ' ';
          } else {
            currentInterim += result[0].transcript;
          }
        }

        const fullCurrentTranscript = (accumulatedFinal + ' ' + currentInterim).trim();
        setTranscript(accumulatedFinal.trim());
        setInterimTranscript(currentInterim);
        analyzeWordsForFillers(fullCurrentTranscript);
      };

      recognition.onerror = (e: Event) => {
        console.warn('Speech recognition status notice:', e);
      };

      recognition.onend = () => {
        // Auto-restart if session is still active (prevents browser mic timeouts)
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            // ignore if already started
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Error starting speech recognition:', err);
    }
  }, [analyzeWordsForFillers]);

  const stop = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setTranscript('');
    setInterimTranscript('');
    setWordCount(0);
    setWords([]);
    setFillerInstances([]);
    setFillerWordBreakdown({});
    setPauses([]);
    wordsRef.current = [];
    fillersRef.current = [];
    breakdownRef.current = {};
    pausesRef.current = [];
    startTimeRef.current = 0;
    lastSpeechTimeRef.current = 0;
  }, [stop]);

  // Fallback simulator for demonstrations/unsupported environments
  const setSimulatedSpeech = useCallback((text: string) => {
    setTranscript(text);
    setInterimTranscript('');
    analyzeWordsForFillers(text);
  }, [analyzeWordsForFillers]);

  return {
    transcript,
    interimTranscript,
    wordCount,
    words,
    fillerInstances,
    fillerWordBreakdown,
    pauses,
    isListening,
    supported,
    start,
    stop,
    reset,
    setSimulatedSpeech,
  };
}
