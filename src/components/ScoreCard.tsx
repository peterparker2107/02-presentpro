import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import {
  Award,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Share2,
  FileText,
  Volume2,
  Eye,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  } from 'lucide-react';
import { SessionMetrics } from '../lib/metrics';
import { MetricRing } from './MetricRing';

interface ScoreCardProps {
  metrics: SessionMetrics;
  transcript: string;
  onReset: () => void;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ metrics, transcript, onReset }) => {
  const [activeTab, setActiveTab] = useState<'coaching' | 'transcript'>('coaching');
  const [copied, setCopied] = useState(false);

  // Radar chart data mapping
  const radarData = [
    { subject: 'Eye Contact', score: metrics.breakdown.eyeContact.score, fullMark: 100 },
    { subject: 'Verbal Clarity', score: metrics.breakdown.fillerWords.score, fullMark: 100 },
    { subject: 'Pace (WPM)', score: metrics.breakdown.pace.score, fullMark: 100 },
    { subject: 'Pause Quality', score: metrics.breakdown.pauseQuality.score, fullMark: 100 },
    { subject: 'Volume Stability', score: metrics.breakdown.volumeConsistency.score, fullMark: 100 },
    { subject: 'Vocab Diversity', score: metrics.breakdown.vocabDiversity.score, fullMark: 100 },
  ];

  const getScoreVerdict = (score: number) => {
    if (score >= 90) return { title: 'Executive Ready', badge: 'Elite Speaker', color: 'text-teal-600 bg-teal-50 border-teal-200' };
    if (score >= 80) return { title: 'Polished & Impactful', badge: 'Keynote Ready', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (score >= 70) return { title: 'Strong Potential', badge: 'Competent', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    return { title: 'Needs Practice', badge: 'Developing', color: 'text-rose-600 bg-rose-50 border-rose-200' };
  };

  const verdict = getScoreVerdict(metrics.overallScore);

  const handleCopySummary = () => {
    const text = `🎯 PresentPro Coaching Report:
Overall Score: ${metrics.overallScore}/100 (${verdict.title})
• Eye Contact: ${metrics.eyeContactPct}% (${metrics.breakdown.eyeContact.score}/100)
• Speaking Pace: ${metrics.wpm} WPM (${metrics.breakdown.pace.score}/100)
• Filler Words: ${metrics.fillerCount} detected (${metrics.breakdown.fillerWords.score}/100)
• Pause Quality: ${metrics.pauseQualityScore}/100
• Volume Stability: ${metrics.volumeConsistencyScore}/100
• Vocab Diversity: ${metrics.vocabDiversityScore}/100
Analyzed 100% locally with PresentPro.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Render transcript with filler words highlighted
  const renderHighlightedTranscript = () => {
    if (!transcript.trim()) {
      return (
        <p className="text-stone-600 dark:text-slate-400 italic">No audible transcript recorded in this session.</p>
      );
    }

    const words = transcript.split(/\s+/);
    const fillerLowerSet = new Set(
      Object.keys(metrics.fillerWordBreakdown).map(w => w.toLowerCase())
    );

    return (
      <div className="leading-relaxed text-stone-800 text-base font-sans">
        {words.map((w, i) => {
          const clean = w.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '');
          const isFiller = fillerLowerSet.has(clean);
          return (
            <React.Fragment key={i}>
              {isFiller ? (
                <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-medium border border-amber-300">
                  {w}
                </span>
              ) : (
                <span>{w}</span>
              )}{' '}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Top Banner: Big Overall Score & High-Level Summary */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-slate-700/90 dark:border-slate-800 shadow-warm text-stone-900 dark:text-white dark:text-slate-100-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-6">
            {/* Circular Spring Score Badge */}
            <motion.div
              initial={{ scale: 0.6, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-teal-500 to-teal-700 text-white flex flex-col items-center justify-center shadow-lg shadow-teal-500/20"
            >
              <span className="text-4xl sm:text-5xl font-black tracking-tight font-sans">
                {metrics.overallScore}
              </span>
              <span className="text-[11px] font-semibold tracking-widest uppercase opacity-90 mt-0.5">
                Out of 100
              </span>
            </motion.div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${verdict.color}`}>
                  {verdict.badge}
                </span>
                <span className="text-xs text-stone-600 dark:text-slate-400 font-mono">
                  {metrics.durationSeconds}s session • {metrics.wordCount} words
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">
                {verdict.title}
              </h2>
              <p className="text-stone-600 dark:text-slate-400 text-sm mt-1 max-w-md">
                PresentPro analyzed 6 multimodal presentation dimensions client-side with zero latency and complete privacy.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleCopySummary}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-slate-600 text-stone-700 dark:text-slate-300 bg-paper-100 dark:bg-slate-800 hover:bg-stone-50 font-medium text-sm transition-colors shadow-sm"
            >
              <Share2 className="w-4 h-4 text-stone-500" />
              <span>{copied ? 'Copied Report!' : 'Share Stats'}</span>
            </button>

            <button
              onClick={onReset}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all shadow-md shadow-teal-600/20 hover:scale-[1.02]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practice Again</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* 6 Metric Gauges Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-600" />
            <span>6-Metric Performance Breakdown</span>
          </h3>
          <span className="text-xs text-stone-600 dark:text-slate-400">
            TED & Executive Benchmark Standards
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <MetricRing
            score={metrics.breakdown.eyeContact.score}
            label="Eye Contact"
            valueDisplay={`${Math.round(metrics.eyeContactPct)}%`}
            benchmark="Target: 70-85%"
          />
          <MetricRing
            score={metrics.breakdown.fillerWords.score}
            label="Verbal Clarity"
            valueDisplay={`${metrics.fillerCount} fillers`}
            benchmark="Target: 0-2"
          />
          <MetricRing
            score={metrics.breakdown.pace.score}
            label="Pace"
            valueDisplay={`${Math.round(metrics.wpm)} WPM`}
            benchmark="Sweet: 130-150"
          />
          <MetricRing
            score={metrics.breakdown.pauseQuality.score}
            label="Pause Flow"
            valueDisplay={`${metrics.pauseQualityScore}/100`}
            benchmark="Natural breath"
          />
          <MetricRing
            score={metrics.breakdown.volumeConsistency.score}
            label="Volume Control"
            valueDisplay={`${metrics.volumeConsistencyScore}/100`}
            benchmark="Uniform RMS"
          />
          <MetricRing
            score={metrics.breakdown.vocabDiversity.score}
            label="Vocab Range"
            valueDisplay={`${metrics.uniqueWordCount} unique`}
            benchmark="TTR > 0.60"
          />
        </div>
      </div>

      {/* Two Column Section: Radar Chart & High-Level Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart Card (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-stone-200 dark:border-slate-700/90 dark:border-slate-800 shadow-warm text-stone-900 dark:text-white dark:text-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>Presentation Shape (Radar)</span>
              </h4>
              <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                Balanced Profile
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-400 mb-4">
              Visualizes multidimensional delivery balance across gaze, pace, vocabulary, and acoustics.
            </p>
          </div>

          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#E8E2D8" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#57534E', fontSize: 11, fontWeight: 500 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="You"
                  dataKey="score"
                  stroke="#0d9488"
                  fill="#0d9488"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-stone-600 dark:text-slate-400 border-t border-stone-100 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-teal-600 inline-block"></span>
              <span>Your Session Shape</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-stone-300 inline-block"></span>
              <span>100-pt Outer Perimeter</span>
            </div>
          </div>
        </div>

        {/* Tabbed Coaching & Details Card (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-stone-200 dark:border-slate-700/90 dark:border-slate-800 shadow-warm text-stone-900 dark:text-white dark:text-slate-100 flex flex-col">
          {/* Tabs header */}
          <div className="flex items-center gap-2 border-b border-stone-200 dark:border-slate-700 pb-3 mb-5">
            <button
              onClick={() => setActiveTab('coaching')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'coaching'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:text-white hover:bg-stone-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Coach Says ({metrics.feedback.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('transcript')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'transcript'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:text-white hover:bg-stone-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Interactive Transcript</span>
            </button>

            
          </div>

          {/* TAB 1: Coaching Recommendations */}
          {activeTab === 'coaching' && (
            <div className="space-y-3.5 overflow-y-auto max-h-[400px] pr-1">
              {metrics.feedback.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.type === 'strength'
                      ? 'bg-emerald-50/60 border-emerald-200/70'
                      : item.type === 'improvement'
                      ? 'bg-amber-50/60 border-amber-200/70'
                      : 'bg-teal-50/60 border-teal-200/70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {item.type === 'strength' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                      {item.type === 'improvement' && (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      {item.type === 'pro-tip' && (
                        <Lightbulb className="w-4 h-4 text-teal-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="text-sm font-bold text-stone-900 dark:text-white">{item.title}</h5>
                        {item.metric && (
                          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-white/80 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300">
                            {item.metric}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed mb-2.5">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900 dark:text-white bg-white/90 p-2 rounded-xl border border-stone-200 dark:border-slate-700/60">
                        <ArrowRight className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Action: {item.actionableStep}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: Transcript with Highlighted Fillers */}
          {activeTab === 'transcript' && (
            <div className="space-y-4">
              {/* Filler badge list */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-stone-700 dark:text-slate-300">
                    Detected Filler Words:
                  </span>
                  <span className="text-xs font-mono text-stone-500">
                    {metrics.fillerCount} total occurrences
                  </span>
                </div>
                {Object.keys(metrics.fillerWordBreakdown).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(metrics.fillerWordBreakdown).map(([w, cnt]) => (
                      <span
                        key={w}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300"
                      >
                        <span>"{w}"</span>
                        <span className="bg-amber-200/80 px-1.5 py-0.2 rounded text-[10px]">
                          ×{cnt}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700 font-medium">
                    ✨ Perfect run! No filler words ("um", "uh", "like") detected.
                  </p>
                )}
              </div>

              {/* Transcript text box */}
              <div className="p-4 bg-paper-100 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-slate-700 max-h-[300px] overflow-y-auto">
                {renderHighlightedTranscript()}
              </div>
            </div>
          )}

          
        </div>
      </div>
    </div>
  );
};
