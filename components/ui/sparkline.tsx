'use client';

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineProps {
  data: { t: string; winrate: number }[];
  trend: 'RISING' | 'FALLING' | 'STABLE';
  height?: number;
}

const TREND_COLORS = {
  RISING: '#C7D7BE',
  FALLING: '#FCA5A5',
  STABLE: '#8290A7',
};

export function Sparkline({ data, trend, height = 50 }: SparklineProps) {
  const color = TREND_COLORS[trend];

  return (
    <div className="sparkline-container" style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
