import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BlockRenderer } from '@/components/editor/BlockRenderer';

const TAG_COLORS: Record<string, string> = {
  Economy: 'text-[var(--color-gold)] border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10',
  Fundamentals: 'text-[var(--color-spectral)] border-[var(--color-spectral)]/30 bg-[var(--color-spectral)]/10',
  Positioning: 'text-[var(--color-necrotic)] border-[var(--color-necrotic)]/30 bg-[var(--color-necrotic)]/10',
  Advanced: 'text-[var(--color-blood)] border-[var(--color-blood)]/30 bg-[var(--color-blood)]/10',
  Augments: 'text-[var(--color-amethyst)] border-[var(--color-amethyst)]/30 bg-[var(--color-amethyst)]/10',
  Mindset: 'text-[var(--color-pumpkin)] border-[var(--color-pumpkin)]/30 bg-[var(--color-pumpkin)]/10',
};

async function getArticle(slug: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  // Since we don't have GET /:id, we fetch all and find
  try {
     const res = await fetch(`${apiUrl}/api/admin/insights`, { cache: 'no-store' });
     if (!res.ok) return null;
     const insights = await res.json();
     const insight = Array.isArray(insights) ? insights.find((i: any) => i.id === slug) : null;
     if (!insight) return null;
     
     let parsedBody: any = {};
     if (insight.body) {
        try { parsedBody = JSON.parse(insight.body); } catch(e){}
     }
     
     return {
         title: insight.title,
         excerpt: parsedBody.excerpt || '',
         blocks: parsedBody.blocks || [],
         author_name: insight.author_id || 'Unknown',
         read_time: '5 min',
         published_at: insight.created_at,
         cover_image: null,
         tags: insight.tags || []
     };
  } catch (err) {
     return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  return {
    title: `${article.title} — TFT Grimoire Archives`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      authors: [article.author_name],
      images: article.cover_image ? [article.cover_image] : [],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  return (
    <div className="article-page">
      {/* Back nav */}
      <div className="article-back-nav">
        <div className="article-container">
          <Link href="/studyhall" className="article-back-link">
            <ArrowLeft size={16} />
            <span>Back to Archives</span>
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="article-header">
        <div className="article-container">
          {/* Cover image */}
          {article.cover_image && (
            <div className="w-full h-64 rounded-2xl overflow-hidden mb-8">
              <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Tags */}
          <div className="article-tags">
            {article.tags.map((tag: string) => (
              <span
                key={tag}
                className={`article-tag ${TAG_COLORS[tag] ?? 'text-[var(--color-text-muted)] border-[var(--color-border)] bg-[var(--color-grimoire)]'}`}
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="article-title">{article.title}</h1>

          {/* Excerpt */}
          <p className="article-excerpt">{article.excerpt}</p>

          {/* Meta */}
          <div className="article-meta">
            <div className="article-author-avatar">
              {article.author_name[0]}
            </div>
            <div className="article-meta-info">
              <div className="article-meta-row">
                <User size={12} />
                <span className="article-meta-author">{article.author_name}</span>
              </div>
              <div className="article-meta-row article-meta-secondary">
                <Clock size={11} />
                <span>{article.read_time} read</span>
                <span className="article-meta-dot">·</span>
                <span>{new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="article-header-divider" />
        </div>
      </header>

      {/* Body */}
      <main className="article-main">
        <div className="article-container">
          <BlockRenderer blocks={article.blocks} />
        </div>
      </main>

      {/* Footer nav */}
      <div className="article-footer-nav">
        <div className="article-container">
          <Link href="/studyhall" className="article-back-link">
            <ArrowLeft size={16} />
            <span>More articles in the Archives</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
