'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Eye, Settings, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { BlockEditor } from '@/components/editor/BlockEditor';
import type { Block } from '@/lib/editor/types';

const TAGS_OPTIONS = ['Economy', 'Fundamentals', 'Positioning', 'Scouting', 'Augments', 'Mindset', 'Advanced', 'Set 16'];

function EditorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get('slug');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>(editSlug ? 'loading' : 'idle');
  const [savedSlug, setSavedSlug] = useState<string | null>(editSlug);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!editSlug) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${apiUrl}/api/admin/insights`) // Backend has no GET /:id yet, fetching all for now
      .then(async (r) => {
         const contentType = r.headers.get("content-type");
         if (!contentType || contentType.indexOf("application/json") === -1) {
            throw new Error('API returned non-JSON response');
         }
         return r.json();
      })
      .then(res => {
        // Since there is no /:id, find it from the list
        const insight = Array.isArray(res) ? res.find(i => i.id === editSlug) : res;
        if (insight) {
          setTitle(insight.title || '');
          setSelectedTags(insight.tags || []);
          try {
             // We stringified { excerpt, blocks } into body
             if (insight.body) {
                const parsedBody = JSON.parse(insight.body);
                setExcerpt(parsedBody.excerpt || '');
                setBlocks(parsedBody.blocks || []);
             }
          } catch (e) {
             setExcerpt(insight.body || '');
          }
        }
        setSaveState('idle');
      })
      .catch(err => {
        setErrorMsg('Failed to load article');
        setSaveState('error');
      });
  }, [editSlug]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const saveArticle = async (status: 'draft' | 'pending' | 'published') => {
    if (!title.trim()) { setErrorMsg('Please add a title first'); return; }
    setSaveState('saving');
    setErrorMsg('');
    try {
      const isEditing = !!editSlug;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = isEditing ? `${apiUrl}/api/admin/insights/${editSlug}` : `${apiUrl}/api/admin/insights`;
      const method = isEditing ? 'PATCH' : 'POST';

      const payload = {
        title,
        tags: selectedTags,
        status,
        body: JSON.stringify({ excerpt, blocks }) 
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // Handle HTML error responses from proxies gracefully
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
         const json = await res.json();
         if (!res.ok) throw new Error(json.error || 'Save failed');
         setSaveState('saved');
         setSavedSlug(json.id || json.data?.slug || editSlug || 'saved');
      } else {
         if (!res.ok) throw new Error(`Save failed with status ${res.status}`);
         setSaveState('saved');
         setSavedSlug(editSlug || 'saved');
      }
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (err: any) {
      setSaveState('error');
      setErrorMsg(err.message);
      setTimeout(() => setSaveState('idle'), 4000);
    }
  };


  const wordCount = blocks
    .map((b) => {
      const c = b.content;
      if ('text' in c) return (c as { text: string }).text;
      if ('items' in c) return (c as { items: string[] }).items.join(' ');
      return '';
    })
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="editor-page">
      {/* Top bar */}
      <div className="editor-topbar">
        <div className="editor-topbar-inner">
          <Link href="/studyhall" className="editor-topbar-back">
            <ArrowLeft size={16} />
            <span>Archives</span>
          </Link>

          <div className="editor-topbar-meta">
            <span className="editor-wordcount">{wordCount} words · ~{readTime} min read</span>
            {saveState === 'saved' && savedSlug && (
              <Link href={`/studyhall/${savedSlug}`} className="text-[10px] text-[var(--color-necrotic)] flex items-center gap-1 ml-3">
                <CheckCircle size={12} /> Saved! View article →
              </Link>
            )}
            {saveState === 'error' && (
              <span className="text-[10px] text-red-400 flex items-center gap-1 ml-3">
                <AlertCircle size={12} /> {errorMsg}
              </span>
            )}
          </div>

          <div className="editor-topbar-actions">
            <button className="editor-action-btn" disabled={saveState === 'saving'}
              onClick={() => saveArticle('draft')}
            >
              <Save size={15} />
              <span>{saveState === 'saving' ? 'Saving...' : 'Save draft'}</span>
            </button>
            <button
              className="editor-save-btn"
              onClick={() => saveArticle('pending')}
              disabled={saveState === 'saving'}
            >
              <Send size={15} />
              <span>Submit for review</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main editor area */}
      <div className="editor-layout">
        {/* Article content column */}
        <div className="editor-main-col">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Title */}
            <input
              type="text"
              value={title}
              placeholder="Article title…"
              className="editor-title-input"
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* Excerpt */}
            <textarea
              value={excerpt}
              placeholder="Short excerpt — shown on the Archives feed…"
              rows={2}
              className="editor-excerpt-input"
              onChange={(e) => setExcerpt(e.target.value)}
            />

            {/* Divider */}
            <div className="editor-title-divider" />

            {/* Block editor */}
            <BlockEditor
              articleTitle={title}
              onChange={setBlocks}
            />
          </motion.div>
        </div>

        {/* Sidebar */}
        <aside className="editor-sidebar">
          <div className="editor-sidebar-section">
            <div className="editor-sidebar-header">
              <Settings size={14} />
              <span>Article settings</span>
            </div>

            {/* Status */}
            <div className="editor-sidebar-field">
              <label className="editor-sidebar-label">Status</label>
              <div className="editor-status-badge">Draft</div>
            </div>

            {/* Tags */}
            <div className="editor-sidebar-field">
              <label className="editor-sidebar-label">Tags</label>
              <div className="editor-tag-grid">
                {TAGS_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`editor-tag-btn ${selectedTags.includes(tag) ? 'editor-tag-btn--active' : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="editor-sidebar-field">
              <label className="editor-sidebar-label">Stats</label>
              <div className="editor-stats">
                <div className="editor-stat">
                  <span className="editor-stat-value">{blocks.length}</span>
                  <span className="editor-stat-label">blocks</span>
                </div>
                <div className="editor-stat">
                  <span className="editor-stat-value">{wordCount}</span>
                  <span className="editor-stat-label">words</span>
                </div>
                <div className="editor-stat">
                  <span className="editor-stat-value">{readTime}m</span>
                  <span className="editor-stat-label">read</span>
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard hints */}
          <div className="editor-sidebar-hints">
            <p className="editor-hint-title">Shortcuts</p>
            <div className="editor-hint"><kbd>/</kbd> Open block menu</div>
            <div className="editor-hint"><kbd>↵ Enter</kbd> New block</div>
            <div className="editor-hint"><kbd>⌫ Backspace</kbd> Delete empty block</div>
            <div className="editor-hint"><span className="editor-hint-sparkle">✦</span> AI Assist per block</div>
          </div>
        </aside>
      </div>
      {saveState === 'loading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm">
          <div className="text-[var(--color-amethyst)] font-bold text-lg animate-pulse">Loading article...</div>
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen items-center justify-center flex text-white/50">Loading Editor...</div>}>
      <EditorPageContent />
    </Suspense>
  );
}
