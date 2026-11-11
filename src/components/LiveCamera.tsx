import { useRef, useEffect, type FC } from 'react';
import Webcam from 'react-webcam';
import { Eye, EyeOff, Volume2, Mic, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveCameraProps {
  isLooking: boolean;
  eyeContactPct: number;
  currentVolume: number; // 0-100
  elapsedSeconds: number;
  wordCount: number;
  fillerCount: number;
  isReady: boolean;
  onVideoElementReady: (video: HTMLVideoElement) => void;
  onStreamReady: (stream: MediaStream) => void;
  onCameraError?: (err: string) => void;
}

export const LiveCamera: FC<LiveCameraProps> = ({
  isLooking,
  eyeContactPct,
  currentVolume,
  elapsedSeconds,
  wordCount,
  fillerCount,
  isReady,
  onVideoElementReady,
  onStreamReady,
  onCameraError,
}) => {
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (webcamRef.current && webcamRef.current.video) {
        onVideoElementReady(webcamRef.current.video);
        clearInterval(checkInterval);
      }
    }, 200);

    return () => clearInterval(checkInterval);
  }, [onVideoElementReady]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  };

  return (
    <div className="relative w-full aspect-video max-h-[480px] bg-stone-900 rounded-2xl overflow-hidden shadow-warm-xl border-2 border-stone-200/50">
      {/* Live Webcam Stream */}
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored={true}
        videoConstraints={videoConstraints}
        className="w-full h-full object-cover"
        onUserMedia={(stream) => {
          onStreamReady(stream);
          if (webcamRef.current?.video) {
            onVideoElementReady(webcamRef.current.video);
          }
        }}
        onUserMediaError={(err) => {
          console.warn('Webcam access error:', err);
          if (onCameraError) {
            onCameraError(typeof err === 'string' ? err : 'Camera access denied or unavailable.');
          }
        }}
      />

      {/* Top Left: Recording Status & Timer */}
      <div className="absolute top-4 left-4 flex items-center gap-2.5 z-20">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900/80 backdrop-blur-md border border-white/10 text-white text-xs font-medium">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
          <span className="tracking-wide">REC</span>
          <span className="text-stone-400">•</span>
          <span className="font-mono text-stone-100 font-semibold">{formatTimer(elapsedSeconds)}</span>
        </div>

        {/* Filler Word Counter Badge */}
        <div className="px-3 py-1.5 rounded-full bg-stone-900/80 backdrop-blur-md border border-white/10 text-xs font-medium flex items-center gap-1.5 text-stone-200">
          <AlertCircle className={`w-3.5 h-3.5 ${fillerCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span>Fillers:</span>
          <span className={`font-semibold ${fillerCount > 2 ? 'text-rose-400' : fillerCount > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
            {fillerCount}
          </span>
        </div>

        {/* Word Count Badge */}
        <div className="hidden sm:flex px-3 py-1.5 rounded-full bg-stone-900/80 backdrop-blur-md border border-white/10 text-xs font-medium items-center gap-1.5 text-stone-200">
          <Mic className="w-3.5 h-3.5 text-teal-400" />
          <span>Words:</span>
          <span className="font-semibold text-white">{wordCount}</span>
        </div>
      </div>

      {/* Top Right: Real-time Eye Contact Indicator */}
      <div className="absolute top-4 right-4 z-20">
        <AnimatePresence mode="wait">
          {isLooking ? (
            <motion.div
              key="looking"
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/90 text-white backdrop-blur-md border border-teal-300/40 shadow-lg text-xs font-semibold"
            >
              <Eye className="w-4 h-4 text-white animate-pulse" />
              <span>Eye Contact: Locked</span>
              <span className="bg-teal-700/60 px-1.5 py-0.5 rounded text-[11px] font-mono">
                {eyeContactPct}%
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="away"
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/90 text-white backdrop-blur-md border border-amber-300/40 shadow-lg text-xs font-semibold"
            >
              <EyeOff className="w-4 h-4 text-white" />
              <span>Looking Away</span>
              <span className="bg-amber-700/60 px-1.5 py-0.5 rounded text-[11px] font-mono">
                {eyeContactPct}%
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Target Framing Guides (Rule of Thirds / Eye Line) */}
      <div className="absolute inset-0 pointer-events-none opacity-20 transition-opacity duration-300">
        <div className="w-full h-full border border-white/20 grid grid-cols-3 grid-rows-3">
          <div className="border-r border-b border-white/15"></div>
          <div className="border-r border-b border-white/15"></div>
          <div className="border-b border-white/15"></div>
          <div className="border-r border-b border-white/15"></div>
          <div className="border-r border-b border-white/15"></div>
          <div className="border-b border-white/15"></div>
          <div className="border-r border-white/15"></div>
          <div className="border-r border-white/15"></div>
          <div></div>
        </div>
        {/* Eye Target Box */}
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-20 border border-teal-400/40 rounded-xl flex items-center justify-center">
          <span className="text-[10px] tracking-widest uppercase text-teal-300/60 font-mono">
            Anchor Gaze Here
          </span>
        </div>
      </div>

      {/* Bottom Bar: Live RMS Volume Level Meter */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 bg-stone-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 w-full max-w-sm">
          <Volume2 className={`w-4 h-4 ${currentVolume > 15 ? 'text-teal-400' : 'text-stone-400'}`} />
          <span className="text-xs text-stone-300 font-medium whitespace-nowrap">Volume:</span>
          {/* Animated Volume Meter Bars */}
          <div className="flex items-center gap-1 w-full h-4">
            {Array.from({ length: 16 }).map((_, i) => {
              const barThreshold = (i + 1) * 6;
              const isActive = currentVolume >= barThreshold;
              const isHigh = i >= 13;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm transition-all duration-75 ${
                    isActive
                      ? isHigh
                        ? 'h-full bg-rose-400'
                        : 'h-full bg-teal-400'
                      : 'h-1.5 bg-stone-700/60'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[11px] font-mono text-stone-300 w-7 text-right">
            {currentVolume}%
          </span>
        </div>

        {/* Model Status Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900/70 backdrop-blur-md border border-white/10 text-[11px] text-stone-300">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>{isReady ? 'WASM Iris Tracker: Active' : 'Initializing MediaPipe...'}</span>
        </div>
      </div>
    </div>
  );
};
