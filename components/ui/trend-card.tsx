'use client';

import { motion } from 'framer-motion';
import { Sparkline } from './sparkline';
import type { TrendData } from '@/lib/mock-data';

interface TrendCardProps {
  data: TrendData;
  index: number;
}

export function TrendCard({ data, index }: TrendCardProps) {
  const trendClass =
    data.trend === 'RISING' ? 'trend-rising' :
    data.trend === 'FALLING' ? 'trend-falling' :
    'trend-stable';

  const trendIcon =
    data.trend === 'RISING' ? '🔺' :
    data.trend === 'FALLING' ? '🔻' :
    '➖';

  const deltaColor =
    data.delta > 0 ? 'text-[var(--color-necrotic)]' :
    data.delta < 0 ? 'text-[var(--color-blood)]' :
    'text-[var(--color-text-muted)]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`grimoire-card p-4 hover-float ${trendClass}`}
      style={{ borderWidth: '1px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold text-[var(--color-text-primary)] truncate"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {data.comp_name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${trendClass}`}>
              {trendIcon} {data.trend}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {data.games.toLocaleString()} games
            </span>
          </div>
        </div>

        {/* Delta pill */}
        <div className={`text-right ${deltaColor}`}>
          <div className="text-lg font-bold">
            {data.delta > 0 ? '+' : ''}{data.delta.toFixed(1)}%
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">win Δ</div>
        </div>
      </div>

      {/* Sparkline */}
      <Sparkline data={data.history} trend={data.trend} height={48} />

      {/* Win rates */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-[var(--color-text-muted)]">
          prev: {data.winrate_prev}%
        </span>
        <span className="text-[var(--color-text-primary)] font-semibold">
          now: {data.winrate_now}%
        </span>
      </div>

      {/* Insight */}
      {data.insight && (
        <p className="mt-3 text-xs text-[var(--color-text-muted)] italic leading-relaxed border-t border-[var(--color-border)] pt-2">
          {data.insight}
        </p>
      )}
    </motion.div>
  );
}
