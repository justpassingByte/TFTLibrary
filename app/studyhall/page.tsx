'use client';

import { motion } from 'framer-motion';

const GUIDES = [
  {
    id: '1',
    title: 'Mastering Economy: When to Roll vs Level',
    category: 'Fundamentals',
    author: 'Dishsoap',
    readTime: '8 min',
    excerpt: 'Understanding econ breakpoints is the single most impactful skill in TFT. Learn the 50g rule, when to break it, and how top players think about gold.',
    tag: 'Economy',
  },
  {
    id: '2',
    title: 'Set 17 Space Gods: Complete Trait Guide',
    category: 'New Set',
    author: 'Frodan',
    readTime: '12 min',
    excerpt: 'Deep dive into every new trait in Set 17. Which ones are sleeper OP, which look good but underperform, and which comps to start testing on day one.',
    tag: 'Set 17',
  },
  {
    id: '3',
    title: 'Positioning Masterclass: Anti-Assassin & Zephyr',
    category: 'Advanced',
    author: 'KCDouble0',
    readTime: '6 min',
    excerpt: 'Positioning wins games. Learn the corner carry setup, anti-assassin formations, and how to bait Zephyr in high elo lobbies.',
    tag: 'Positioning',
  },
  {
    id: '4',
    title: 'How to Scout Efficiently in 10 Seconds',
    category: 'Intermediate',
    author: 'Soju',
    readTime: '5 min',
    excerpt: 'You don\'t need to check every board. Focus on these 3 things to get 90% of the information you need in under 10 seconds every round.',
    tag: 'Scouting',
  },
  {
    id: '5',
    title: 'Augment Selection Framework',
    category: 'Advanced',
    author: 'MismatchedSocks',
    readTime: '10 min',
    excerpt: 'A decision framework for every augment choice. Economy augments vs combat augments: when each is correct, and the math behind the decision.',
    tag: 'Augments',
  },
  {
    id: '6',
    title: 'Climbing from Diamond to Masters: Mindset Guide',
    category: 'Mindset',
    author: 'Bebe872',
    readTime: '7 min',
    excerpt: 'The biggest difference between Diamond and Master isn\'t mechanics — it\'s consistency. Learn the mental habits that separate hardstuck players from climbers.',
    tag: 'Mindset',
  },
];

const TAG_COLORS: Record<string, string> = {
  Economy: 'text-[var(--color-gold)] border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10',
  'Set 17': 'text-[var(--color-spectral)] border-[var(--color-spectral)]/30 bg-[var(--color-spectral)]/10',
  Positioning: 'text-[var(--color-necrotic)] border-[var(--color-necrotic)]/30 bg-[var(--color-necrotic)]/10',
  Scouting: 'text-[var(--color-pumpkin)] border-[var(--color-pumpkin)]/30 bg-[var(--color-pumpkin)]/10',
  Augments: 'text-[var(--color-amethyst)] border-[var(--color-amethyst)]/30 bg-[var(--color-amethyst)]/10',
  Mindset: 'text-[var(--color-blood)] border-[var(--color-blood)]/30 bg-[var(--color-blood)]/10',
};

export default function StudyHallPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3 mb-2"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            <span className="text-3xl">📚</span>
            <span className="gradient-text">The Archives</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] max-w-xl">
            Deep-dive strategy guides written by high-elo players and coaches. Open a scroll and learn the dark arts of TFT.
          </p>
        </div>

        {/* Category tags filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {['All', 'Economy', 'Set 17', 'Positioning', 'Scouting', 'Augments', 'Mindset'].map((cat, i) => (
            <button
              key={cat}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                i === 0
                  ? 'bg-[var(--color-amethyst)] text-white border-[var(--color-amethyst)]'
                  : 'bg-[var(--color-grimoire)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Guide Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {GUIDES.map((guide, i) => (
            <motion.article
              key={guide.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="grimoire-card p-5 hover-float group cursor-pointer"
            >
              {/* Tag + Meta */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TAG_COLORS[guide.tag] || ''}`}>
                  {guide.tag}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {guide.readTime} read
                </span>
              </div>

              {/* Title */}
              <h3
                className="text-base font-bold mb-2 text-[var(--color-text-primary)] group-hover:text-[var(--color-pumpkin)] transition-colors leading-snug"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {guide.title}
              </h3>

              {/* Excerpt */}
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-4 line-clamp-3">
                {guide.excerpt}
              </p>

              {/* Author */}
              <div className="flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-amethyst)] to-[var(--color-pumpkin)] flex items-center justify-center text-[10px] font-bold text-white">
                  {guide.author[0]}
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  by <span className="text-[var(--color-text-secondary)]">{guide.author}</span>
                </span>
                <span className="text-[8px] text-[var(--color-text-muted)] ml-auto px-1.5 py-0.5 rounded bg-[var(--color-grimoire-light)]">
                  {guide.category}
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
