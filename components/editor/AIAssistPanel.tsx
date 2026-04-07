'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Check, RotateCcw, ChevronDown } from 'lucide-react';
import type { AIAction } from '@/lib/editor/types';

interface Props {
  blockText: string;
  articleTitle: string;
  onAccept: (text: string) => void;
  onClose: () => void;
}

const ACTIONS: { id: AIAction; label: string; desc: string }[] = [
  { id: 'rewrite', label: 'Rewrite', desc: 'Cleaner prose' },
  { id: 'expand', label: 'Expand', desc: 'Add more depth' },
  { id: 'summarize', label: 'Summarize', desc: 'Make it shorter' },
  { id: 'generate', label: 'Generate', desc: 'Write from topics' },
];

export function AIAssistPanel({ blockText, articleTitle, onAccept, onClose }: Props) {
  const [action, setAction] = useState<AIAction>('rewrite');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showActions, setShowActions] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const run = async () => {
    if (!blockText.trim()) { setError('Block has no text to process.'); return; }
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: blockText, action, context: articleTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI request failed');
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const currentAction = ACTIONS.find((a) => a.id === action)!;

  return (
    <div ref={panelRef} className="ai-panel">
      {/* Header */}
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <Sparkles size={14} className="ai-panel-icon" />
          <span>AI Assist</span>
        </div>
        <button className="ai-panel-close" onClick={onClose}><X size={14} /></button>
      </div>

      {/* Action selector */}
      <div className="ai-action-selector" onClick={() => setShowActions(!showActions)}>
        <div className="ai-action-current">
          <span className="ai-action-label">{currentAction.label}</span>
          <span className="ai-action-desc">{currentAction.desc}</span>
        </div>
        <ChevronDown size={14} className={`ai-action-chevron ${showActions ? 'rotate-180' : ''}`} />
      </div>

      {showActions && (
        <div className="ai-action-dropdown">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              className={`ai-action-item ${action === a.id ? 'active' : ''}`}
              onClick={() => { setAction(a.id); setShowActions(false); }}
            >
              <span className="ai-action-item-label">{a.label}</span>
              <span className="ai-action-item-desc">{a.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="ai-result">
          <p className="ai-result-text">{result}</p>
        </div>
      )}

      {error && <div className="ai-error">{error}</div>}

      {/* Actions */}
      <div className="ai-panel-footer">
        <button className="ai-run-btn" onClick={run} disabled={loading}>
          {loading ? (
            <><RotateCcw size={13} className="animate-spin" /> Thinking…</>
          ) : (
            <><Sparkles size={13} /> {result ? 'Try again' : 'Generate'}</>
          )}
        </button>
        {result && (
          <button className="ai-accept-btn" onClick={() => onAccept(result)}>
            <Check size={13} /> Accept
          </button>
        )}
      </div>
    </div>
  );
}
