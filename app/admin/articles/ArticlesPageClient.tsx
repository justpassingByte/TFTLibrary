'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, Archive, Trash2, Edit2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type Article = {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'pending' | 'published' | 'archived';
  author_name: string;
  created_at: string;
  published_at: string | null;
};

const STATUS_COLORS = {
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  published: 'bg-green-500/20 text-green-400 border-green-500/30',
  archived: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_ICONS = {
  draft: <FileText size={12} />,
  pending: <Clock size={12} />,
  published: <CheckCircle size={12} />,
  archived: <Archive size={12} />,
};

export default function ArticlesPageClient({ initialArticles }: { initialArticles: Article[] }) {
  const [articles, setArticles] = useState(initialArticles);
  const [updating, setUpdating] = useState<string | null>(null);

  const updateStatus = async (slug: string, newStatus: string) => {
    setUpdating(slug);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/admin/insights/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setArticles(prev => prev.map(a => a.slug === slug ? { ...a, status: newStatus as any } : a));
      }
    } finally {
      setUpdating(null);
    }
  };

  const deleteArticle = async (slug: string) => {
    if (!confirm('Are you sure you want to permanently delete this article?')) return;
    setUpdating(slug);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/admin/insights/${slug}`, { method: 'DELETE' });
      if (res.ok) {
        setArticles(prev => prev.filter(a => a.slug !== slug));
      }
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Study Hall Articles</h1>
          <p className="text-[var(--color-text-secondary)]">Manage and publish strategy guides submitted by users.</p>
        </div>
        <Link 
          href="/studyhall/editor" 
          className="px-4 py-2 bg-[var(--color-amethyst)] text-white rounded-lg font-bold text-sm hover:brightness-110 transition-all"
        >
          New Article
        </Link>
      </div>

      <div className="bg-[#141419] border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-sm text-left relative">
          <thead className="bg-[#1a1a2e] text-xs uppercase text-[var(--color-text-muted)] border-b border-white/5">
            <tr>
              <th className="px-6 py-4 font-semibold tracking-wider">Title & Slug</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Author</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
              <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {articles.map((article, i) => (
              <motion.tr 
                key={article.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-white/5 transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-[var(--color-text-primary)] mb-0.5">{article.title}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)] font-mono">{article.slug}</div>
                </td>
                <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                  {article.author_name}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${STATUS_COLORS[article.status]}`}>
                    {STATUS_ICONS[article.status]}
                    {article.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[11px] text-[var(--color-text-muted)] whitespace-nowrap">
                  {new Date(article.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/studyhall/${article.slug}`} target="_blank" className="p-2 hover:bg-white/10 rounded text-[var(--color-text-muted)] hover:text-white" title="Read">
                    <ExternalLink size={14} />
                  </Link>
                  <Link href={`/studyhall/editor?slug=${article.slug}`} className="p-2 hover:bg-white/10 rounded text-[var(--color-text-muted)] hover:text-blue-400" title="Edit">
                    <Edit2 size={14} />
                  </Link>
                  
                  {article.status === 'pending' || article.status === 'draft' ? (
                    <button 
                      onClick={() => updateStatus(article.slug, 'published')}
                      disabled={updating === article.slug}
                      className="p-2 hover:bg-green-500/20 rounded text-[var(--color-text-muted)] hover:text-green-400"
                      title="Publish"
                    >
                      <CheckCircle size={14} />
                    </button>
                  ) : article.status === 'published' ? (
                    <button 
                      onClick={() => updateStatus(article.slug, 'archived')}
                      disabled={updating === article.slug}
                      className="p-2 hover:bg-yellow-500/20 rounded text-[var(--color-text-muted)] hover:text-yellow-400"
                      title="Archive"
                    >
                      <Archive size={14} />
                    </button>
                  ) : null}

                  <button 
                    onClick={() => deleteArticle(article.slug)}
                    disabled={updating === article.slug}
                    className="p-2 hover:bg-red-500/20 rounded text-[var(--color-text-muted)] hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </motion.tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[var(--color-text-muted)]">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <FileText size={32} className="opacity-20" />
                    <p>No articles found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
