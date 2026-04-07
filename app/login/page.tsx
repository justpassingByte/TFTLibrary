'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="login-root">
      <div className="login-card">
        {/* Logo mark */}
        <div className="login-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <polygon
              points="20,3 37,13 37,27 20,37 3,27 3,13"
              stroke="#a78bfa"
              strokeWidth="1.5"
              fill="none"
            />
            <polygon
              points="20,10 30,16 30,24 20,30 10,24 10,16"
              fill="#a78bfa"
              opacity="0.15"
            />
            <circle cx="20" cy="20" r="3" fill="#a78bfa" />
          </svg>
        </div>

        <h1 className="login-title">TFT Grimoire</h1>
        <p className="login-subtitle">Admin Portal</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="email" className="login-label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password" className="login-label">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="login-btn-spinner" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      <style>{`
        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #08060e;
          padding: 1.5rem;
          position: fixed;
          inset: 0;
          z-index: 100;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: #13111e;
          border: 1px solid rgba(167, 139, 250, 0.15);
          border-radius: 16px;
          padding: 2.5rem 2rem;
          box-shadow:
            0 0 0 1px rgba(167, 139, 250, 0.05),
            0 24px 48px rgba(0, 0, 0, 0.5),
            0 0 80px rgba(167, 139, 250, 0.06);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }

        .login-logo {
          margin-bottom: 1rem;
          filter: drop-shadow(0 0 12px rgba(167, 139, 250, 0.4));
        }

        .login-title {
          font-family: 'Cinzel', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #f1effe;
          margin: 0 0 0.25rem;
          line-height: 1;
        }

        .login-subtitle {
          font-size: 0.8rem;
          font-weight: 500;
          color: #a78bfa;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin: 0 0 2rem;
        }

        .login-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .login-field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .login-label {
          font-size: 0.8rem;
          font-weight: 500;
          color: #a09ab8;
          letter-spacing: 0.04em;
        }

        .login-input {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(167, 139, 250, 0.2);
          border-radius: 8px;
          padding: 0.65rem 0.875rem;
          font-size: 0.9rem;
          color: #f1effe;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
        }

        .login-input::placeholder {
          color: #4a4566;
        }

        .login-input:focus {
          border-color: rgba(167, 139, 250, 0.5);
          box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.1);
        }

        .login-error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 0.65rem 0.875rem;
          font-size: 0.85rem;
          color: #fca5a5;
        }

        .login-btn {
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          font-family: inherit;
          letter-spacing: 0.02em;
          margin-top: 0.25rem;
        }

        .login-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
