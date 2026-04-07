'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  jobId: string
  setPrefix: string
  ddVersion: string
  streamUrl?: string   // optional override; defaults to DDragon sync endpoint
  onDone: (status: 'completed' | 'error') => void
}

export function SyncConsole({ jobId, setPrefix, ddVersion, streamUrl, onDone }: Props) {
  const [lines, setLines] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!jobId) return

    setLines([])
    const baseUrl = streamUrl ??
      `/api/admin/sync/stream?${new URLSearchParams({ job_id: jobId, set_prefix: setPrefix, ddragon_version: ddVersion })}`
    
    // Bypass Next.js proxy cache for Server-Sent Events by hitting the backend directly
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
    const finalUrl = baseUrl.startsWith('http') ? baseUrl : `${BACKEND_URL}${baseUrl}`
    
    const es = new EventSource(finalUrl)
    esRef.current = es

    es.onmessage = (e) => {
      // Backend raw streams send multiple lines correctly if formatted, or just raw data strings
      if (!e.data) return;
      setLines(prev => [...prev, e.data])
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    es.addEventListener('done', (e) => {
      let status = 'error';
      try {
        status = JSON.parse(e.data);
      } catch (err) {
        status = e.data;
      }
      onDone(status === 'completed' ? 'completed' : 'error')
      es.close()
    })

    es.onerror = () => {
      setLines(prev => [...prev, '[stream] Connection lost.'])
      es.close()
    }

    return () => { es.close() }
  }, [jobId, setPrefix, ddVersion, onDone])

  if (!jobId) return null

  return (
    <div className="sync-console">
      <div className="console-titlebar">
        <span className="console-dot red" />
        <span className="console-dot yellow" />
        <span className="console-dot green" />
        <span className="console-title">Sync Output</span>
      </div>
      <div className="console-body">
        {lines.length === 0 && (
          <span className="console-waiting">Connecting to sync process...</span>
        )}
        {lines.map((line, i) => (
          <div key={i} className={`console-line ${line.includes('❌') || line.includes('error') ? 'err' : line.includes('✅') || line.includes('Done') ? 'ok' : ''}`}>
            <span className="console-prompt">{'>'}</span>
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <style>{`
        .sync-console {
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid rgba(167, 139, 250, 0.15);
          background: #07050f;
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
        }

        .console-titlebar {
          background: #110e1f;
          padding: 0.5rem 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          border-bottom: 1px solid rgba(167, 139, 250, 0.1);
        }

        .console-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .console-dot.red    { background: #ff5f57; }
        .console-dot.yellow { background: #febc2e; }
        .console-dot.green  { background: #28c840; }

        .console-title {
          font-size: 0.75rem;
          color: #5a5470;
          margin-left: 0.5rem;
          font-family: inherit;
        }

        .console-body {
          padding: 1rem 1.125rem;
          min-height: 280px;
          max-height: 480px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .console-waiting {
          color: #5a5470;
          font-size: 0.8rem;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .console-line {
          font-size: 0.8rem;
          color: #b8b0d8;
          line-height: 1.6;
          display: flex;
          gap: 0.5rem;
          word-break: break-all;
        }

        .console-line.err { color: #f87171; }
        .console-line.ok  { color: #4ade80; }

        .console-prompt {
          color: #4a4566;
          flex-shrink: 0;
          user-select: none;
        }
      `}</style>
    </div>
  )
}
