'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Admin Error Boundary]', error)
  }, [error])

  return (
    <div className="admin-error-boundary">
      <div className="aeb-icon">⚠️</div>
      <h2 className="aeb-title">Something went wrong</h2>
      <p className="aeb-message">{error.message || 'An unexpected error occurred in this admin section.'}</p>
      {error.digest && (
        <code className="aeb-digest">Digest: {error.digest}</code>
      )}
      <button id="admin-error-retry" className="aeb-retry" onClick={reset}>
        Try Again
      </button>

      <style>{`
        .admin-error-boundary {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          max-width: 480px;
          margin: 0 auto;
        }

        .aeb-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .aeb-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #f1effe;
          margin: 0 0 0.5rem;
        }

        .aeb-message {
          font-size: 0.875rem;
          color: #7c75a0;
          margin: 0 0 0.75rem;
          line-height: 1.5;
        }

        .aeb-digest {
          display: block;
          font-size: 0.75rem;
          color: #4a4566;
          margin-bottom: 1.5rem;
          font-family: monospace;
        }

        .aeb-retry {
          padding: 0.6rem 1.5rem;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.15s;
        }

        .aeb-retry:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  )
}
