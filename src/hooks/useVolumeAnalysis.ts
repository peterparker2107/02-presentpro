import { useState, useRef, useCallback, useEffect } from 'react';

export interface VolumeAnalysisState {
  currentVolume: number; // 0-100 real-time RMS
  volumeHistory: number[];
  volumeConsistencyScore: number; // 0-100
  start: (stream: MediaStream) => void;
  stop: () => void;
  reset: () => void;
}

export function useVolumeAnalysis(): VolumeAnalysisState {
  const [currentVolume, setCurrentVolume] = useState(0);
  const [volumeHistory, setVolumeHistory] = useState<number[]>([]);
  const [volumeConsistencyScore, setVolumeConsistencyScore] = useState(85);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>([]);
  const isAnalyzingRef = useRef(false);

  const processVolume = useCallback(() => {
    if (!isAnalyzingRef.current || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    // Amplify RMS for speech visualization (0 - 100 scale)
    const normalized = Math.min(100, Math.round(rms * 350));

    setCurrentVolume(normalized);

    // Record sample every few frames
    if (normalized > 3) {
      historyRef.current.push(normalized);
      // Keep recent 100 points for live visualizer
      if (historyRef.current.length % 5 === 0) {
        setVolumeHistory([...historyRef.current.slice(-60)]);
      }
    }

    if (isAnalyzingRef.current) {
      animFrameRef.current = requestAnimationFrame(processVolume);
    }
  }, []);

  const calculateConsistencyScore = useCallback((history: number[]): number => {
    // Filter active speech volume samples (exclude absolute silence)
    const activeSamples = history.filter(v => v >= 8);
    if (activeSamples.length < 15) {
      return 85; // Default sensible baseline
    }

    // Compute mean
    const mean = activeSamples.reduce((a, b) => a + b, 0) / activeSamples.length;

    // Compute standard deviation
    const variance =
      activeSamples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / activeSamples.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation (CV = stdDev / mean)
    const cv = mean > 0 ? stdDev / mean : 0.5;

    // Ideal CV for engaging speech is between 0.18 and 0.40 (expressive without erratic dips)
    // CV < 0.15 = robotic monotone
    // CV > 0.55 = erratic trailing off or shouting
    let score = 90;
    if (cv >= 0.18 && cv <= 0.38) {
      score = 96;
    } else if (cv > 0.38 && cv <= 0.52) {
      score = Math.round(92 - (cv - 0.38) * 80);
    } else if (cv < 0.18) {
      score = Math.round(80 + (cv / 0.18) * 10); // slight monotone penalty
    } else {
      score = Math.max(30, Math.round(75 - (cv - 0.52) * 60));
    }

    return Math.min(99, Math.max(25, score));
  }, []);

  const start = useCallback(
    (stream: MediaStream) => {
      try {
        if (audioContextRef.current) {
          try {
            audioContextRef.current.close();
          } catch {
            // ignore
          }
        }

        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.4;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
        historyRef.current = [];
        isAnalyzingRef.current = true;

        animFrameRef.current = requestAnimationFrame(processVolume);
      } catch (err) {
        console.warn('AudioContext volume analysis error:', err);
      }
    },
    [processVolume]
  );

  const stop = useCallback(() => {
    isAnalyzingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }

    const finalScore = calculateConsistencyScore(historyRef.current);
    setVolumeConsistencyScore(finalScore);
    setCurrentVolume(0);
  }, [calculateConsistencyScore]);

  const reset = useCallback(() => {
    stop();
    historyRef.current = [];
    setVolumeHistory([]);
    setCurrentVolume(0);
    setVolumeConsistencyScore(85);
  }, [stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    currentVolume,
    volumeHistory,
    volumeConsistencyScore,
    start,
    stop,
    reset,
  };
}
