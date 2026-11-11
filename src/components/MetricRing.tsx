import type { FC } from 'react';
import { motion } from 'framer-motion';

interface MetricRingProps {
  score: number; // 0 to 100
  label: string;
  valueDisplay: string;
  benchmark?: string;
  size?: number;
  strokeWidth?: number;
  subtitle?: string;
  className?: string;
}

export const MetricRing: FC<MetricRingProps> = ({
  score,
  label,
  valueDisplay,
  benchmark,
  size = 130,
  strokeWidth = 9,
  subtitle,
  className = '',
}) => {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const offset = circumference - (clampedScore / 100) * circumference;

  // Determine color theme based on score
  const getColor = (s: number) => {
    if (s >= 85) return { stroke: '#0d9488', bg: 'text-teal-600', pill: 'bg-teal-50 text-teal-700 border-teal-200' };
    if (s >= 70) return { stroke: '#f59e0b', bg: 'text-amber-500', pill: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { stroke: '#f43f5e', bg: 'text-rose-500', pill: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const theme = getColor(clampedScore);

  return (
    <div className={`flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-stone-200/80 shadow-warm hover:shadow-warm-lg transition-shadow duration-300 ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E8E2D8"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-xl font-bold tracking-tight text-stone-900 font-sans"
          >
            {valueDisplay}
          </motion.span>
          <span className="text-[11px] font-medium text-stone-600 uppercase tracking-wider">
            {Math.round(clampedScore)} pts
          </span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <h4 className="text-sm font-semibold text-stone-800">{label}</h4>
        {benchmark && (
          <p className="text-[11px] text-stone-600 mt-0.5">{benchmark}</p>
        )}
        {subtitle && (
          <p className="text-xs text-stone-600 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
