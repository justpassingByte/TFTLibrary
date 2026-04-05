'use client';

import { motion } from 'framer-motion';
import { PRICING_PLANS } from '@/lib/mock-data';

export default function PricingPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-5xl font-extrabold mb-4"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Choose Your <span className="gradient-text">Path</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto"
          >
            From free initiate to powerful Arch-Mage. Unlock the full power of the grimoire.
          </motion.p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PRICING_PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              className={`relative rounded-2xl p-6 flex flex-col ${
                plan.highlighted
                  ? 'bg-gradient-to-b from-[var(--color-grimoire)] to-[var(--color-grimoire-light)] border-2 border-[var(--color-pumpkin)] shadow-[0_0_40px_rgba(255,122,0,0.15)]'
                  : 'grimoire-card'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold ${
                  plan.highlighted
                    ? 'bg-[var(--color-pumpkin)] text-black'
                    : 'bg-[var(--color-pumpkin)] text-black'
                }`}>
                  {plan.badge}
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h2
                  className={`text-xl font-bold mb-1 ${
                    plan.highlighted ? 'text-[var(--color-pumpkin)]' : 'text-[var(--color-text-primary)]'
                  }`}
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {plan.name}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-4xl font-black"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-sm text-[var(--color-text-muted)]">/ mo</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
                    <span className={`mt-0.5 flex-shrink-0 text-xs ${
                      plan.highlighted ? 'text-[var(--color-pumpkin)]' : 'text-[var(--color-amethyst)]'
                    }`}>
                      ✦
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  plan.highlighted
                    ? 'bg-[var(--color-pumpkin)] text-black hover:opacity-90 shadow-lg shadow-[var(--color-pumpkin)]/20'
                    : 'bg-[var(--color-grimoire-light)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-grimoire-lighter)]'
                }`}
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grimoire-card overflow-hidden"
        >
          <div className="p-6 border-b border-[var(--color-border)]">
            <h3
              className="text-xl font-bold gradient-text"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Feature Comparison
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--color-text-secondary)]">Feature</th>
                  {PRICING_PLANS.map(plan => (
                    <th
                      key={plan.id}
                      className={`px-6 py-4 text-sm font-semibold text-center ${
                        plan.highlighted ? 'text-[var(--color-pumpkin)]' : 'text-[var(--color-text-secondary)]'
                      }`}
                      style={{ fontFamily: "'Cinzel', serif" }}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Comp Tier Lists', initiate: true, coven: true, archmage: true },
                  { feature: 'Item & Augment Data', initiate: true, coven: true, archmage: true },
                  { feature: 'Study Hall Guides', initiate: true, coven: true, archmage: true },
                  { feature: 'Meta Shift Tracker', initiate: false, coven: true, archmage: true },
                  { feature: 'Smart Recommendations', initiate: false, coven: true, archmage: true },
                  { feature: 'Team Builder Save/Share', initiate: false, coven: true, archmage: true },
                  { feature: 'Ad-Free Experience', initiate: false, coven: true, archmage: true },
                  { feature: 'Desktop Overlay App', initiate: false, coven: false, archmage: true },
                  { feature: 'API Access', initiate: false, coven: false, archmage: true },
                  { feature: 'Branded Exports', initiate: false, coven: false, archmage: true },
                  { feature: 'Coach Profile', initiate: false, coven: false, archmage: true },
                  { feature: '1-on-1 Meta Review', initiate: false, coven: false, archmage: true },
                ].map((row, idx) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-[var(--color-border)]/50 ${
                      idx % 2 === 0 ? 'bg-white/[0.01]' : ''
                    }`}
                  >
                    <td className="px-6 py-3 text-sm text-[var(--color-text-secondary)]">{row.feature}</td>
                    <td className="px-6 py-3 text-center">
                      {row.initiate ? <span className="text-[var(--color-necrotic)]">✓</span> : <span className="text-[var(--color-text-muted)]">—</span>}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {row.coven ? <span className="text-[var(--color-pumpkin)]">✓</span> : <span className="text-[var(--color-text-muted)]">—</span>}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {row.archmage ? <span className="text-[var(--color-amethyst)]">✓</span> : <span className="text-[var(--color-text-muted)]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-[var(--color-text-muted)] mb-4">
            Questions? Join our <span className="text-[var(--color-amethyst)] cursor-pointer hover:underline">Discord community</span> or check our FAQ.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
