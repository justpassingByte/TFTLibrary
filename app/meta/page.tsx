'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendCard } from '@/components/ui/trend-card';
import { SkeletonCard } from '@/components/ui/skeleton';
import { TRENDS, ITEMS, AUGMENTS, getRecommendations, type RecommendResult } from '@/lib/mock-data';

export default function MetaOraclePage() {
  const [interval, setInterval] = useState<'24h' | '7d'>('24h');
  const [showLoading, setShowLoading] = useState(false);

  // Recommendation state
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedAugment, setSelectedAugment] = useState<string>('');
  const [recommendations, setRecommendations] = useState<RecommendResult[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);

  // Sort trends: RISING first, then STABLE, then FALLING
  const sortedTrends = useMemo(() => {
    const order = { RISING: 0, STABLE: 1, FALLING: 2 };
    return [...TRENDS].sort((a, b) => order[a.trend] - order[b.trend]);
  }, []);

  const toggleItem = (itemName: string) => {
    setSelectedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(i => i !== itemName)
        : prev.length < 4
          ? [...prev, itemName]
          : prev
    );
  };

  const handleRecommend = () => {
    setIsRecommending(true);
    setTimeout(() => {
      const results = getRecommendations(selectedItems, selectedAugment || undefined);
      setRecommendations(results);
      setIsRecommending(false);
    }, 800);
  };


  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-10">
          <h1
            className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3 mb-2"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            <span className="text-3xl">🔮</span>
            <span className="gradient-text">Meta Oracle</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] max-w-xl">
            Real-time meta intelligence. Track what&apos;s rising, what&apos;s falling, and get smart comp recommendations.
          </p>
        </div>


        {/* ============================================ */}
        {/* SECTION 1: META SHIFT TRACKER */}
        {/* ============================================ */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-xl font-bold flex items-center gap-2"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              <span className="text-lg">📊</span> Meta Shift
            </h2>

            {/* Interval Toggle */}
            <div className="flex rounded-xl overflow-hidden border border-[var(--color-border)]">
              {(['24h', '7d'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setInterval(opt)}
                  className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                    interval === opt
                      ? 'bg-[var(--color-amethyst)] text-white'
                      : 'bg-[var(--color-grimoire)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Trend Cards Grid */}
          {showLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedTrends.map((trend, i) => (
                <TrendCard key={trend.comp_id} data={trend} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* ============================================ */}
        {/* SECTION 2: SMART RECOMMENDATIONS */}
        {/* ============================================ */}
        <section>
          <h2
            className="text-xl font-bold flex items-center gap-2 mb-6"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            <span className="text-lg">🧠</span> Smart Recommendations
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Selectors */}
            <div className="lg:col-span-2 space-y-6">
              {/* Item Selector */}
              <div className="grimoire-card p-5">
                <h3 className="text-sm font-semibold text-[var(--color-pumpkin)] uppercase mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
                  Select Items (up to 4)
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {ITEMS.slice(0, 14).map(item => {
                    const isSelected = selectedItems.includes(item.name);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.name)}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all duration-200 ${
                          isSelected
                            ? 'border-[var(--color-pumpkin)] bg-[var(--color-pumpkin)]/10 shadow-[0_0_12px_rgba(255,122,0,0.2)]'
                            : 'border-[var(--color-border)] bg-[var(--color-grimoire-light)] hover:border-[var(--color-border-hover)]'
                        }`}
                      >
                        <span className="text-lg">{item.image}</span>
                        <span className="text-[8px] text-[var(--color-text-muted)] truncate max-w-full">
                          {item.name.split(' ').slice(-1)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedItems.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selectedItems.map(item => (
                      <span
                        key={item}
                        className="text-xs px-2 py-0.5 rounded-lg bg-[var(--color-pumpkin)]/15 text-[var(--color-pumpkin)] border border-[var(--color-pumpkin)]/30 flex items-center gap-1"
                      >
                        {item}
                        <button
                          onClick={() => toggleItem(item)}
                          className="hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Augment Selector */}
              <div className="grimoire-card p-5">
                <h3 className="text-sm font-semibold text-[var(--color-amethyst)] uppercase mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
                  Select Augment (optional)
                </h3>
                <select
                  value={selectedAugment}
                  onChange={(e) => setSelectedAugment(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-grimoire-light)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-amethyst)] transition-colors appearance-none cursor-pointer"
                >
                  <option value="">None</option>
                  {AUGMENTS.map(aug => (
                    <option key={aug.id} value={aug.name}>{aug.name} ({aug.rarity})</option>
                  ))}
                </select>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleRecommend}
                disabled={selectedItems.length === 0 || isRecommending}
                className={`w-full py-3.5 rounded-xl text-base font-bold transition-all duration-300 ${
                  selectedItems.length > 0
                    ? 'bg-[var(--color-pumpkin)] text-black hover:opacity-90 shadow-lg shadow-[var(--color-pumpkin)]/20 cursor-pointer'
                    : 'bg-[var(--color-grimoire-light)] text-[var(--color-text-muted)] cursor-not-allowed'
                }`}
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {isRecommending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Channeling...
                  </span>
                ) : (
                  '⚡ Summon Destiny'
                )}
              </button>
            </div>

            {/* Right: Results */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {isRecommending ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {[1, 2, 3].map(i => (
                      <SkeletonCard key={i} className="h-32" />
                    ))}
                  </motion.div>
                ) : recommendations.length > 0 ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {recommendations.map((rec, i) => (
                      <motion.div
                        key={rec.comp_name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.12 }}
                        className={`grimoire-card p-5 relative overflow-hidden ${
                          rec.is_best ? 'border-[var(--color-gold)] shadow-[0_0_20px_rgba(251,191,36,0.15)]' : ''
                        }`}
                      >
                        {/* Best Pick badge */}
                        {rec.is_best && (
                          <div className="absolute top-0 right-0 bg-gradient-to-bl from-[var(--color-gold)] to-[var(--color-pumpkin)] text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                            ⭐ BEST PICK
                          </div>
                        )}

                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3
                              className="text-base font-bold mb-1"
                              style={{ fontFamily: "'Cinzel', serif" }}
                            >
                              {rec.comp_name}
                            </h3>
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {rec.games.toLocaleString()} games
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-bold text-[var(--color-necrotic)]">
                              {rec.winrate}%
                            </div>
                            <div className="text-[10px] text-[var(--color-text-muted)]">win rate</div>
                          </div>
                        </div>

                        {/* Champions */}
                        <div className="flex gap-1 mb-3">
                          {rec.champions.map((emoji, idx) => (
                            <span key={idx} className="text-lg">{emoji}</span>
                          ))}
                        </div>

                        {/* Winrate bar */}
                        <div className="w-full bg-[var(--color-grimoire-light)] rounded-full h-2 mb-3">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${rec.winrate}%` }}
                            transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                            className="h-2 rounded-full bg-gradient-to-r from-[var(--color-necrotic)] to-[var(--color-spectral)]"
                          />
                        </div>

                        {/* Insight */}
                        {rec.insight && (
                          <p className="text-xs text-[var(--color-text-muted)] italic">
                            💡 {rec.insight}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full min-h-[300px] grimoire-card"
                  >
                    <span className="text-5xl mb-4 opacity-30">🔮</span>
                    <p className="text-[var(--color-text-muted)] text-center">
                      Select items and augments, then click<br />
                      <span className="font-semibold text-[var(--color-pumpkin)]">&quot;Summon Destiny&quot;</span> to get recommendations.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
