'use client'

import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function DashboardCharts() {
  const activityData = [
    { name: '01', val: 20000 },
    { name: '02', val: 28000 },
    { name: '03', val: 12000 },
    { name: '04', val: 15000 },
    { name: '05', val: 32210 },
    { name: '06', val: 20000 },
    { name: '07', val: 35000 },
  ]
  const growthData = [
    { name: '01', val: 120 },
    { name: '02', val: 190 },
    { name: '03', val: 300 },
    { name: '04', val: 280 },
    { name: '05', val: 400 },
    { name: '06', val: 350 },
    { name: '07', val: 600 },
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#fff',
          padding: '10px 15px',
          borderRadius: '8px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.05)',
          textAlign: 'center',
          border: '1px solid #f0f0f0'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: '#222' }}>{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', width: '100%', marginTop: '20px' }}>
      <div style={{ height: '220px' }}>
        <h3 style={{ fontSize: '14px', color: '#222', fontFamily: 'Courier New', marginBottom: '10px' }}>Active Users</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={activityData} margin={{ left: 10, right: 10, bottom: 0, top: 0 }}>
            <XAxis 
               dataKey="name" 
               axisLine={false} 
               tickLine={false} 
               tick={{ fontSize: 11, fill: '#9A9A9A' }} 
               dy={10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{stroke: '#f0f0f0', strokeWidth: 1}} />
            <Line 
              type="monotone" 
              dataKey="val" 
              stroke="#F5A623" 
              strokeWidth={3} 
              dot={false}
              activeDot={{ r: 6, fill: '#F5A623', stroke: '#fff', strokeWidth: 3 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{ height: '220px' }}>
        <h3 style={{ fontSize: '14px', color: '#222', fontFamily: 'Courier New', marginBottom: '10px' }}>Tierlist Exports</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={growthData} margin={{ left: 10, right: 10, bottom: 0, top: 0 }}>
            <XAxis 
               dataKey="name" 
               axisLine={false} 
               tickLine={false} 
               tick={{ fontSize: 11, fill: '#9A9A9A' }} 
               dy={10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{stroke: '#f0f0f0', strokeWidth: 1}} />
            <Line 
              type="monotone" 
              dataKey="val" 
              stroke="#50E3C2" 
              strokeWidth={3} 
              dot={false}
              activeDot={{ r: 6, fill: '#50E3C2', stroke: '#fff', strokeWidth: 3 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
