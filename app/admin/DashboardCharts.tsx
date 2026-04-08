'use client'

import { useState, useEffect } from 'react'
import { XAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

interface ExportDay {
  date: string
  builder: number
  tierlist: number
  total: number
}

interface ExportStats {
  daily: ExportDay[]
  totals: { builder: number; tierlist: number; total: number }
}

export function DashboardCharts() {
  const [stats, setStats] = useState<ExportStats | null>(null)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  useEffect(() => {
    fetch(`${apiUrl}/api/admin/exports/stats?days=14`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.daily) setStats(data)
      })
      .catch(() => {})
  }, [apiUrl])

  const exportData = (stats?.daily || []).map(d => ({
    name: d.date.slice(5), // "MM-DD"
    Builder: d.builder,
    Tierlist: d.tierlist,
  }))

  // Mock user activity data (replace with real API when user tracking is implemented)
  const userData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return {
      name: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      'Active Users': Math.floor(80 + Math.random() * 150 + i * 8),
      'Subscribers': Math.floor(10 + Math.random() * 30 + i * 3),
    }
  })

  const ExportTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#fff',
          padding: '10px 14px',
          borderRadius: '10px',
          boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
          border: '1px solid #f0f0f0',
          minWidth: '130px'
        }}>
          <p style={{ margin: '0 0 5px', fontWeight: 700, fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
          {payload.map((p: any) => (
            <p key={p.dataKey} style={{ margin: '2px 0', fontSize: '13px', color: p.color, fontWeight: 600 }}>
              {p.dataKey}: <strong>{p.value}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', width: '100%', marginTop: '20px' }}>
      {/* Exports Chart — Builder + Tierlist combined */}
      <div style={{ height: '220px' }}>
        <h3 style={{ fontSize: '14px', color: '#222', fontFamily: 'Courier New', marginBottom: '10px' }}>
          Image Exports
          {stats && <span style={{ fontSize: '11px', color: '#999', fontWeight: 400, marginLeft: '10px' }}>
            Total: {stats.totals.total}
          </span>}
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={exportData} margin={{ left: 10, right: 10, bottom: 0, top: 0 }}>
            <defs>
              <linearGradient id="builderGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F5A623" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#F5A623" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="tierlistGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#50E3C2" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#50E3C2" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis
               dataKey="name"
               axisLine={false}
               tickLine={false}
               tick={{ fontSize: 11, fill: '#9A9A9A' }}
               dy={10}
            />
            <Tooltip content={<ExportTooltip />} cursor={{stroke: '#f0f0f0', strokeWidth: 1}} />
            <Area
              type="monotone"
              dataKey="Builder"
              stroke="#F5A623"
              strokeWidth={2.5}
              fill="url(#builderGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#F5A623', stroke: '#fff', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="Tierlist"
              stroke="#50E3C2"
              strokeWidth={2.5}
              fill="url(#tierlistGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#50E3C2', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Users Chart — Active Users + Subscribers combined */}
      <div style={{ height: '220px' }}>
        <h3 style={{ fontSize: '14px', color: '#222', fontFamily: 'Courier New', marginBottom: '10px' }}>Users</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={userData} margin={{ left: 10, right: 10, bottom: 0, top: 0 }}>
            <defs>
              <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C5CFC" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#7C5CFC" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EB5E28" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#EB5E28" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis
               dataKey="name"
               axisLine={false}
               tickLine={false}
               tick={{ fontSize: 11, fill: '#9A9A9A' }}
               dy={10}
            />
            <Tooltip content={<ExportTooltip />} cursor={{stroke: '#f0f0f0', strokeWidth: 1}} />
            <Area
              type="monotone"
              dataKey="Active Users"
              stroke="#7C5CFC"
              strokeWidth={2.5}
              fill="url(#activeGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#7C5CFC', stroke: '#fff', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="Subscribers"
              stroke="#EB5E28"
              strokeWidth={2.5}
              fill="url(#subGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#EB5E28', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
