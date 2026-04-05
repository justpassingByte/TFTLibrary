'use client';

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineProps {
  data: { t: string; winrate: number }[];
  trend: 'RISING' | 'FALLING' | 'STABLE';
  height?: number;
}

const TREND_COLORS = {
  RISING: '#39FF14',
  FALLING: '#ff2244',
  STABLE: '#6b5e80',
};

export function Sparkline({ data, trend, height = 50 }: SparklineProps) {
  const color = TREND_COLORS[trend];

  return (
    <div className="sparkline-container" style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
          <Line
            type="monotone"
            dataKey="winrate"
            stroke={color}
            strokeWidth={2}
            dot={false}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
