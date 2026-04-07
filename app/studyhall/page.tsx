'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, User, BookOpen, PenLine, Search } from 'lucide-react';

const TAG_COLORS: Record<string, string> = {
  Economy: 'text-[var(--color-gold)] border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10',
  Fundamentals: 'text-[var(--color-spectral)] border-[var(--color-spectral)]/30 bg-[var(--color-spectral)]/10',
  Positioning: 'text-[var(--color-necrotic)] border-[var(--color-necrotic)]/30 bg-[var(--color-necrotic)]/10',
  Advanced: 'text-[var(--color-blood)] border-[var(--color-blood)]/30 bg-[var(--color-blood)]/10',
  Augments: 'text-[var(--color-amethyst)] border-[var(--color-amethyst)]/30 bg-[var(--color-amethyst)]/10',
  Mindset: 'text-[var(--color-pumpkin)] border-[var(--color-pumpkin)]/30 bg-[var(--color-pumpkin)]/10',
};

type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  author_name: string;
  read_time: string;
  published_at: string;
  cover_image?: string;
};

export default function StudyHallPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTag, setActiveTag] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${apiUrl}/api/admin/insights?status=published`)
      .then(r => r.json())
      .then(res => {
         const mapped = (Array.isArray(res) ? res : []).map((i: any) => {
            let parsedBody: any = {};
            try { parsedBody = JSON.parse(i.body || "{}"); } catch(e){}
            return {
               id: i.id,
               slug: i.id,
               title: i.title,
               excerpt: parsedBody.excerpt || i.body || '',
               tags: i.tags || [],
               author_name: i.author_id || 'Unknown',
               read_time: '5 min',
               published_at: i.created_at
            };
         });
         setArticles(mapped);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const allTags = ['All', ...Array.from(new Set(articles.flatMap(a => a.tags)))];

  const filtered = articles.filter(a => {
    const matchesTag = activeTag === 'All' || a.tags.includes(activeTag);
    const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchesTag && matchesSearch;
  });

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3 mb-2"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              <BookOpen size={32} className="text-[var(--color-amethyst)]" />
              <span className="gradient-text">The Archives</span>
            </h1>
            <p className="text-[var(--color-text-secondary)] max-w-xl">
              Deep-dive strategy guides written by high-elo players and coaches. Open a scroll and learn the dark arts of TFT.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search articles..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-[var(--color-grimoire)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-amethyst)] transition-colors w-48"
              />
            </div>
            {/* Editor link */}
            <Link
              href="/studyhall/editor"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-grimoire-light)] border border-[var(--color-border)] hover:border-[var(--color-amethyst)]/50 text-sm text-[var(--color-text-secondary)] hover:text-white transition-all group"
            >
              <PenLine size={15} className="text-[var(--color-amethyst)] group-hover:scale-110 transition-transform" />
              Write an article
            </Link>
          </div>
        </div>

        {/* Tag filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                activeTag === tag
                  ? 'bg-[var(--color-amethyst)] text-white border-[var(--color-amethyst)] shadow-[0_0_12px_var(--color-amethyst)/30]'
                  : 'bg-[var(--color-grimoire)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Skeleton / Article Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="grimoire-card p-5 animate-pulse space-y-3">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="h-5 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-full rounded bg-white/5" />
                <div className="h-3 w-5/6 rounded bg-white/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((article, i) => (
              <motion.div
                key={article.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Link
                  href={`/studyhall/${article.slug}`}
                  className="grimoire-card p-5 hover-float group cursor-pointer block"
                >
                  {/* Cover image */}
                  {article.cover_image && (
                    <div className="w-full h-36 rounded-lg overflow-hidden mb-3 bg-[var(--color-grimoire-light)]">
                      <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Tags + read time */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {article.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TAG_COLORS[tag] ?? ''}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                      <Clock size={10} />
                      {article.read_time}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-base font-bold mb-2 text-[var(--color-text-primary)] group-hover:text-[var(--color-pumpkin)] transition-colors leading-snug"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    {article.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-4 line-clamp-3">
                    {article.excerpt}
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-amethyst)] to-[var(--color-pumpkin)] flex items-center justify-center text-[10px] font-bold text-white">
                      {article.author_name[0]}
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                      <User size={10} />
                      <span className="text-[var(--color-text-secondary)]">{article.author_name}</span>
                    </span>
                    <span className="ml-auto text-[9px] text-[var(--color-text-muted)] flex items-center gap-1">
                      <BookOpen size={10} />
                      Open article →
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-[var(--color-text-muted)]">
            {articles.length === 0
              ? 'No articles yet. Be the first to write one!'
              : `No articles for "${activeTag}" yet.`
            }
          </div>
        )}
      </div>
    </div>
  );
}
