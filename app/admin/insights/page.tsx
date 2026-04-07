'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BlockRenderer } from '@/components/editor/BlockRenderer'

interface Insight {
  id: string
  title: string
  author_id: string | null
  status: string
  created_at: string
  body?: string
}

export default function InsightsPage() {
  const router = useRouter()
  const [insights, setInsights] = useState<Insight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => {
    fetchInsights()
  }, [])

  async function fetchInsights() {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/insights`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setInsights(data)
      }
    } catch (error) {
      console.error('Failed to fetch insights', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/insights/${id}`
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        setInsights(prev => prev.map(ins => ins.id === id ? { ...ins, status: newStatus } : ins))
      } else {
        alert('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating insight status', error)
      alert('Error updating status')
    }
  }

  function renderPreview(ins: Insight) {
     if (!ins.body) return <div style={{ color: '#999', fontSize: '13px' }}>No content available.</div>;
     try {
        const data = JSON.parse(ins.body);
        return (
           <div style={{ textAlign: 'left', fontSize: '14px', fontFamily: 'sans-serif' }}>
              <div style={{ marginBottom: '15px' }}>
                 <strong>Excerpt:</strong> <span style={{ color: '#555', marginLeft: '5px' }}>{data.excerpt || 'None'}</span>
              </div>
              <div style={{ padding: '15px', background: '#FFF', borderRadius: '8px', border: '1px solid #EAEAEA', maxHeight: '400px', overflowY: 'auto' }}>
                 <BlockRenderer blocks={data.blocks || []} />
              </div>
           </div>
        )
     } catch(e) {
        return <div style={{ color: '#555', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{ins.body}</div>
     }
  }

  return (
    <div className="ds-overview">
      <div className="ds-header-block">
        <h1 className="ds-title">
          Insights Management
          <span className="ds-title-dot">1</span>
        </h1>
        <p style={{ color: '#9A9A9A', marginTop: '5px' }}>Review, edit, and approve community and staff insights before publishing.</p>
      </div>
      
      <div className="pd-card" style={{ marginTop: '20px', padding: '0' }}>
         <table className="ds-table">
            <thead>
               <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
               </tr>
            </thead>
            <tbody>
               {isLoading ? (
                  <tr>
                     <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Loading insights...</td>
                  </tr>
               ) : insights.length === 0 ? (
                  <tr>
                     <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No insights found.</td>
                  </tr>
               ) : insights.map(ins => {
                  const displayDate = new Date(ins.created_at).toLocaleDateString()
                  const displayStatus = ins.status.charAt(0).toUpperCase() + ins.status.slice(1)
                  return (
                     <React.Fragment key={ins.id}>
                     <tr style={{ background: previewId === ins.id ? '#FDFBFA' : 'transparent' }}>
                       <td style={{ fontWeight: '600', color: '#222' }}>{ins.title}</td>
                       <td style={{ color: '#777', fontSize: '13px' }}>{ins.author_id || 'Unknown'}</td>
                       <td style={{ color: '#777', fontSize: '13px' }}>{displayDate}</td>
                       <td>
                          <span className={`status-badge status-${ins.status.toLowerCase()}`}>
                             {displayStatus}
                          </span>
                       </td>
                       <td style={{ textAlign: 'right' }}>
                          <div className="action-buttons">
                             <button className="btn-view" title="Toggle preview" onClick={() => setPreviewId(previewId === ins.id ? null : ins.id)}>
                               {previewId === ins.id ? 'Hide' : 'Preview'}
                             </button>
                             <button className="btn-edit" title="Edit content" onClick={() => router.push(`/studyhall/editor?slug=${ins.id}`)}>Edit</button>
                             {(ins.status === 'pending' || ins.status === 'Pending') && (
                                <>
                                   <button className="btn-approve" onClick={() => updateStatus(ins.id, 'published')} title="Approve & Publish">Approve</button>
                                   <button className="btn-reject" onClick={() => updateStatus(ins.id, 'rejected')} title="Reject">Reject</button>
                                </>
                             )}
                          </div>
                       </td>
                    </tr>
                    {previewId === ins.id && (
                       <tr>
                          <td colSpan={5} style={{ padding: '0 20px', background: '#FDFBFA', borderBottom: '1px solid #F1EAE0' }}>
                             <div style={{ padding: '20px 0', borderTop: '1px dashed #E0DFDB' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#222', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Preview</h3>
                                <div className="preview-content">
                                   {renderPreview(ins)}
                                </div>
                             </div>
                          </td>
                       </tr>
                    )}
                  </React.Fragment>
                  )
               })}
            </tbody>
         </table>
      </div>

      <style>{`
         .ds-overview { max-width: 1200px; padding-bottom: 50px; font-family: -apple-system, sans-serif; }
         .ds-header-block { margin-bottom: 25px; }
         .ds-title { font-family: 'Courier New', Courier, serif; font-size: 28px; font-weight: 800; margin: 0; color: #222; display: flex; align-items: flex-start; gap: 4px; }
         .ds-title-dot { background-color: #50E3C2; color: #FFF; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: bold; font-family: sans-serif; }
         
         .pd-card {
            background-color: #FFFFFF;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(204, 197, 185, 0.2);
            border: 1px solid #F1EAE0;
            overflow: hidden;
         }

         .ds-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
         }
         
         .ds-table th {
            background: #FDFBFA;
            padding: 15px 20px;
            font-size: 11px;
            text-transform: uppercase;
            color: #9A9A9A;
            font-weight: 700;
            border-bottom: 1px solid #F1EAE0;
         }
         
         .ds-table td {
            padding: 15px 20px;
            border-bottom: 1px solid #F1EAE0;
            vertical-align: middle;
         }
         
         .ds-table tr:last-child td { border-bottom: none; }
         
         .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: bold;
         }
         .status-pending { background: #FFF4E5; color: #F5A623; }
         .status-published { background: #E8F7F3; color: #50E3C2; }
         .status-rejected { background: #FDECEA; color: #EB5E28; }

         .action-buttons {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
         }
         
         .action-buttons button {
            background: #F4F3EF;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s;
            color: #666;
         }
         
         .action-buttons button:hover { background: #E0DFDB; color: #222; }
         
         .action-buttons .btn-approve { background: #50E3C2; color: #FFF; }
         .action-buttons .btn-approve:hover { background: #3CCEA9; color: #FFF; }
         
         .action-buttons .btn-reject { background: #EB5E28; color: #FFF; }
         .action-buttons .btn-reject:hover { background: #D54F1C; color: #FFF; }
      `}</style>
    </div>
  )
}

