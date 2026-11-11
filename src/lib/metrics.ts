export interface FillerInstance {
  word: string;
  timestamp: number; // seconds from session start
  index: number;
}

export interface MetricDetail {
  name: string;
  score: number; // 0-100
  label: string;
  valueDisplay: string;
  status: 'excellent' | 'good' | 'warning' | 'needs-work';
  description: string;
  benchmark: string;
}

export interface CoachingFeedback {
  category: 'eye-contact' | 'filler-words' | 'pace' | 'pauses' | 'volume' | 'vocab' | 'general';
  type: 'strength' | 'improvement' | 'pro-tip';
  title: string;
  message: string;
  metric?: string;
  actionableStep: string;
}

export interface SessionMetrics {
  durationSeconds: number;
  wordCount: number;
  uniqueWordCount: number;
  wpm: number;
  eyeContactPct: number; // 0-100
  fillerCount: number;
  fillerInstances: FillerInstance[];
  fillerWordBreakdown: Record<string, number>;
  pauseQualityScore: number; // 0-100
  volumeConsistencyScore: number; // 0-100
  vocabDiversityScore: number; // 0-100
  overallScore: number; // 0-100
  breakdown: {
    eyeContact: MetricDetail;
    fillerWords: MetricDetail;
    pace: MetricDetail;
    pauseQuality: MetricDetail;
    volumeConsistency: MetricDetail;
    vocabDiversity: MetricDetail;
  };
  feedback: CoachingFeedback[];
}

export const COMMON_FILLER_WORDS = [
  'um',
  'uh',
  'like',
  'basically',
  'actually',
  'literally',
  'you know',
  'sort of',
  'kind of',
  'right',
  'honestly',
  'so yeah',
  'i mean',
  'okay so',
  'anyway',
] as const;

export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '').trim();
}

export function isFillerWord(phrase: string): boolean {
  const clean = normalizeWord(phrase);
  return COMMON_FILLER_WORDS.some(f => f === clean);
}

export function computePaceScore(wpm: number): number {
  if (wpm === 0) return 0;
  // Sweet spot: 125 - 155 WPM
  if (wpm >= 130 && wpm <= 150) {
    return 98;
  }
  if (wpm >= 120 && wpm <= 160) {
    return 90;
  }
  if (wpm >= 110 && wpm < 120) {
    return Math.round(78 + (wpm - 110) * 1.2);
  }
  if (wpm > 160 && wpm <= 175) {
    return Math.round(90 - (wpm - 160) * 1.3);
  }
  if (wpm >= 90 && wpm < 110) {
    return Math.round(60 + (wpm - 90) * 0.9);
  }
  if (wpm > 175 && wpm <= 200) {
    return Math.round(70 - (wpm - 175) * 1.2);
  }
  if (wpm < 90) {
    return Math.max(25, Math.round(60 - (90 - wpm) * 0.8));
  }
  // wpm > 200
  return Math.max(20, Math.round(40 - (wpm - 200) * 0.5));
}

export function computeFillerScore(fillerCount: number, wordCount: number): number {
  if (wordCount === 0) return 100;
  const fillerPct = (fillerCount / wordCount) * 100;
  
  if (fillerCount === 0) return 99;
  if (fillerPct <= 1.0) return Math.round(94 - fillerPct * 6);
  if (fillerPct <= 2.5) return Math.round(88 - (fillerPct - 1.0) * 8);
  if (fillerPct <= 5.0) return Math.round(76 - (fillerPct - 2.5) * 6);
  if (fillerPct <= 8.0) return Math.round(61 - (fillerPct - 5.0) * 5);
  return Math.max(20, Math.round(46 - (fillerPct - 8.0) * 3));
}

export function computeEyeContactScore(eyeContactPct: number): number {
  // Best practice: 65% - 85% audience focus is natural and engaging
  if (eyeContactPct >= 70 && eyeContactPct <= 85) {
    return 98;
  }
  if (eyeContactPct >= 60 && eyeContactPct < 70) {
    return Math.round(88 + (eyeContactPct - 60) * 1.0);
  }
  if (eyeContactPct > 85 && eyeContactPct <= 95) {
    return Math.round(98 - (eyeContactPct - 85) * 0.6); // slight deduction for unblinking stare
  }
  if (eyeContactPct >= 45 && eyeContactPct < 60) {
    return Math.round(72 + (eyeContactPct - 45) * 1.0);
  }
  if (eyeContactPct < 45) {
    return Math.max(20, Math.round(eyeContactPct * 1.6));
  }
  return 90;
}

export function computeVocabDiversity(words: string[]): { score: number; uniqueCount: number; ttr: number } {
  if (words.length === 0) {
    return { score: 0, uniqueCount: 0, ttr: 0 };
  }
  const cleanWords = words
    .map(w => normalizeWord(w))
    .filter(w => w.length > 0);
  
  if (cleanWords.length === 0) {
    return { score: 0, uniqueCount: 0, ttr: 0 };
  }

  const unique = new Set(cleanWords);
  const ttr = unique.size / cleanWords.length;

  // For speech between 20-300 words, normal TTR sits between 0.45 and 0.75
  let score = Math.round(ttr * 120);
  if (cleanWords.length < 20) {
    score = Math.min(score, 85);
  }
  score = Math.min(98, Math.max(35, score));

  return {
    score,
    uniqueCount: unique.size,
    ttr: parseFloat(ttr.toFixed(2)),
  };
}

export function computePauseScore(pauses: { duration: number }[], totalSpeechDurationSec: number): number {
  if (totalSpeechDurationSec <= 5) return 80;
  
  // Good presenters pause 2-5 times per minute for 0.6s - 1.8s
  const minutes = totalSpeechDurationSec / 60;
  const pauseCount = pauses.length;
  const pausesPerMin = pauseCount / Math.max(minutes, 0.2);

  // Check average pause duration
  const avgPause = pauses.length > 0 
    ? pauses.reduce((acc, p) => acc + p.duration, 0) / pauses.length 
    : 0;

  let score = 85;

  if (pausesPerMin >= 2 && pausesPerMin <= 6) {
    score += 10;
  } else if (pausesPerMin < 1.5) {
    score -= 15; // Rushing without breathing
  } else if (pausesPerMin > 9) {
    score -= 20; // Hesitant, too many stops
  }

  if (avgPause >= 0.5 && avgPause <= 2.2) {
    score += 5;
  } else if (avgPause > 3.0) {
    score -= 15; // Awkward silence
  }

  return Math.min(99, Math.max(30, score));
}

export function getStatusFromScore(score: number): 'excellent' | 'good' | 'warning' | 'needs-work' {
  if (score >= 88) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'warning';
  return 'needs-work';
}

export function computeOverallScore(weights: {
  eyeContact: number;
  filler: number;
  pace: number;
  pause: number;
  volume: number;
  vocab: number;
}): number {
  const total =
    weights.eyeContact * 0.22 +
    weights.filler * 0.20 +
    weights.pace * 0.20 +
    weights.pause * 0.14 +
    weights.volume * 0.12 +
    weights.vocab * 0.12;

  return Math.min(100, Math.max(0, Math.round(total)));
}

export function getFeedback(metrics: Omit<SessionMetrics, 'feedback'>): CoachingFeedback[] {
  const list: CoachingFeedback[] = [];

  // Eye Contact Feedback
  if (metrics.eyeContactPct >= 70) {
    list.push({
      category: 'eye-contact',
      type: 'strength',
      title: 'Commanding Eye Presence',
      message: `You maintained direct eye contact ${Math.round(metrics.eyeContactPct)}% of the time, creating an instant subconscious bond with your viewers.`,
      metric: `${Math.round(metrics.eyeContactPct)}% Eye Contact`,
      actionableStep: 'Keep looking straight into the lens as if speaking to one trusted colleague.',
    });
  } else if (metrics.eyeContactPct < 55) {
    list.push({
      category: 'eye-contact',
      type: 'improvement',
      title: 'Elevate Visual Engagement',
      message: `Your gaze was on target ${Math.round(metrics.eyeContactPct)}% of the time. Glancing away or reading slides lowers audience retention by up to 40%.`,
      metric: `${Math.round(metrics.eyeContactPct)}% (Target: 70%+)`,
      actionableStep: 'Place your webcam directly at eye level and imagine a green dot right above the camera to anchor your focus.',
    });
  } else {
    list.push({
      category: 'eye-contact',
      type: 'pro-tip',
      title: 'Solid Eye Contact Foundation',
      message: `At ${Math.round(metrics.eyeContactPct)}%, your camera engagement is respectable. A slight bump into the 75% range will make your pitch feel razor sharp.`,
      metric: `${Math.round(metrics.eyeContactPct)}% Eye Contact`,
      actionableStep: 'Hold your gaze steady at key transition sentences before checking your notes.',
    });
  }

  // Pace Feedback
  if (metrics.wpm >= 125 && metrics.wpm <= 155) {
    list.push({
      category: 'pace',
      type: 'strength',
      title: 'Goldilocks Speaking Pace',
      message: `Clocking in at ${Math.round(metrics.wpm)} WPM puts you directly in the TED-talk sweet spot (130-150 WPM). Listeners can absorb complex ideas effortlessly.`,
      metric: `${Math.round(metrics.wpm)} WPM`,
      actionableStep: 'Maintain this measured tempo when introducing technical diagrams or competitive charts.',
    });
  } else if (metrics.wpm > 165) {
    list.push({
      category: 'pace',
      type: 'improvement',
      title: 'Speed Trap Alert',
      message: `You averaged ${Math.round(metrics.wpm)} WPM. Rapid delivery often stems from adrenaline and causes judges to miss key value propositions.`,
      metric: `${Math.round(metrics.wpm)} WPM (Ideal: 130-150)`,
      actionableStep: 'Take one deliberate diaphragmatic breath after completing each slide or major milestone.',
    });
  } else if (metrics.wpm < 115 && metrics.wpm > 0) {
    list.push({
      category: 'pace',
      type: 'improvement',
      title: 'Inject Dynamic Momentum',
      message: `At ${Math.round(metrics.wpm)} WPM, your delivery is slightly contemplative. Increasing energy will keep executive attention locked in.`,
      metric: `${Math.round(metrics.wpm)} WPM (Ideal: 130-150)`,
      actionableStep: 'Stand up while rehearsing to naturally elevate your heart rate and vocal propulsion.',
    });
  }

  // Filler Words Feedback
  if (metrics.fillerCount === 0) {
    list.push({
      category: 'filler-words',
      type: 'strength',
      title: 'Flawless Verbal Clarity',
      message: 'Zero filler words detected! Your speech was crisp, authoritative, and completely clutter-free.',
      metric: '0 fillers detected',
      actionableStep: 'Celebrate this precision — it signals total mastery of your material.',
    });
  } else if (metrics.fillerCount <= 3) {
    list.push({
      category: 'filler-words',
      type: 'pro-tip',
      title: 'Minimal Crutch Words',
      message: `Only ${metrics.fillerCount} filler word${metrics.fillerCount > 1 ? 's' : ''} detected across ${metrics.wordCount} words. High signal-to-noise ratio.`,
      metric: `${metrics.fillerCount} filler words`,
      actionableStep: 'When you feel a filler coming, simply close your lips and allow 1 second of clean silence.',
    });
  } else {
    const topFillers = Object.entries(metrics.fillerWordBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([w, c]) => `"${w}" (${c}x)`)
      .join(', ');
    list.push({
      category: 'filler-words',
      type: 'improvement',
      title: 'Filter Verbal Placeholders',
      message: `Detected ${metrics.fillerCount} filler words (${topFillers}). These creep in when the brain is thinking ahead of the tongue.`,
      metric: `${metrics.fillerCount} fillers`,
      actionableStep: 'Replace filler sounds with deliberate mini-pauses. Silence projects supreme confidence.',
    });
  }

  // Pause Quality Feedback
  if (metrics.pauseQualityScore >= 85) {
    list.push({
      category: 'pauses',
      type: 'strength',
      title: 'Masterful Strategic Pauses',
      message: 'You gave your audience room to digest key punchlines. Strategic pauses make numbers and takeaways land with weight.',
      metric: `${metrics.pauseQualityScore}/100 Pause Score`,
      actionableStep: 'Continue using the "Question - 2s Pause - Answer" rhetorical pattern.',
    });
  } else {
    list.push({
      category: 'pauses',
      type: 'improvement',
      title: 'Harness The Power of The Pause',
      message: 'Your speech flowed with few resting points. Continuous vocal flow without pauses overwhelms listeners.',
      metric: `${metrics.pauseQualityScore}/100 Pause Score`,
      actionableStep: 'Count "one-Mississippi, two-Mississippi" after asking a rhetorical question.',
    });
  }

  // Volume Consistency Feedback
  if (metrics.volumeConsistencyScore >= 80) {
    list.push({
      category: 'volume',
      type: 'strength',
      title: 'Steady Vocal Projection',
      message: 'Your decibel levels stayed uniform throughout, preventing the common trap of fading out at the end of sentences.',
      metric: `${metrics.volumeConsistencyScore}/100 Volume Stability`,
      actionableStep: 'Maintain this strong diaphragm support all the way through Q&A.',
    });
  } else {
    list.push({
      category: 'volume',
      type: 'improvement',
      title: 'Stabilize Sentence Endings',
      message: 'Noticeable volume fluctuations detected. Speakers often drop decibels at sentence endings, conveying uncertainty.',
      metric: `${metrics.volumeConsistencyScore}/100 Volume Stability`,
      actionableStep: 'Keep breath pressure steady right up until the final period of each sentence.',
    });
  }

  // Vocabulary Diversity Feedback
  if (metrics.vocabDiversityScore >= 80) {
    list.push({
      category: 'vocab',
      type: 'strength',
      title: 'Rich & Nuanced Lexicon',
      message: `Your Type-Token Ratio demonstrates high lexical range (${metrics.uniqueWordCount} unique words out of ${metrics.wordCount}), keeping the pitch vibrant.`,
      metric: `${metrics.vocabDiversityScore}/100 Diversity`,
      actionableStep: 'Pair diverse vocabulary with concrete metrics to make claims unforgettable.',
    });
  } else {
    list.push({
      category: 'vocab',
      type: 'pro-tip',
      title: 'Expand Action Verbs',
      message: 'You leaned on a few repetitive descriptors. Switching in active, evocative verbs multiplies listener intrigue.',
      metric: `${metrics.vocabDiversityScore}/100 Diversity`,
      actionableStep: 'Swap generic terms like "do" or "make" for vivid verbs like "orchestrate", "accelerate", and "pioneer".',
    });
  }

  return list;
}
