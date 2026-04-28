'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform, type Variants } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BookOpenText,
  Brain,
  FlaskConical,
  Gem,
  Layers3,
  LineChart,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';

type Feature = {
  title: string;
  desc: string;
  href: string;
  Icon: LucideIcon;
};

const FEATURES: Feature[] = [
  {
    title: 'Comp Tierlists',
    desc: 'Curated S through C comps with clear carry, item, augment, and board context.',
    href: '/tierlist/comps',
    Icon: Layers3,
  },
  {
    title: 'Meta Oracle',
    desc: 'Track rising and falling boards with compact trend signals and patch context.',
    href: '/meta',
    Icon: LineChart,
  },
  {
    title: 'Smart Recommendations',
    desc: 'Select items and surface the champions that convert those resources best.',
    href: '/meta',
    Icon: Brain,
  },
  {
    title: 'Item Tierlists',
    desc: 'Rank craftables, artifacts, radiants, and emblems without losing scan speed.',
    href: '/tierlist/items',
    Icon: FlaskConical,
  },
  {
    title: 'Augment Tierlists',
    desc: 'Filter silver, gold, and prismatic augments with performance-first ordering.',
    href: '/tierlist/augments',
    Icon: Gem,
  },
  {
    title: 'Study Hall',
    desc: 'Read focused guides built around real board states, tempo, and pivot choices.',
    href: '/studyhall',
    Icon: BookOpenText,
  },
];

const STATS = [
  { value: '11', label: 'Curated Comps' },
  { value: '14', label: 'Items Ranked' },
  { value: '12', label: 'Augments Analyzed' },
  { value: '17.2', label: 'Current Patch' },
];

const stagger: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 22, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function HomePage() {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 720], [0, 90]);

  return (
    <div className="arcane-page min-h-screen">
      <section className="relative min-h-[calc(100vh-1rem)] overflow-hidden pt-28 pb-16 sm:pt-32 lg:pt-36">
        <motion.img
          src="/arcane/hero-battlefield.png"
          alt=""
          aria-hidden="true"
          className="hero-atmosphere absolute inset-[-4rem] h-[calc(100%+8rem)] w-[calc(100%+8rem)] object-cover"
          style={{ y: heroY }}
        />
        <div className="arcane-glyph-layer opacity-[0.09]" />
        <div className="arcane-vignette absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--color-void)]" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="glass mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-pumpkin)] shadow-[0_0_12px_rgba(250,204,21,0.55)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
              Patch 17.2 Live
            </span>
          </motion.div>

          <motion.div initial="hidden" animate="show" variants={stagger} className="max-w-5xl">
            <motion.p
              variants={rise}
              className="mb-4 text-xs font-bold uppercase tracking-[0.34em] text-[var(--color-pumpkin)]"
            >
              Premium TFT intelligence
            </motion.p>
            <motion.h1
              variants={rise}
              className="title-reveal text-5xl font-black leading-[0.96] sm:text-6xl lg:text-8xl"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              <span className="gradient-text">TFT</span>{' '}
              <span className="text-[var(--color-text-primary)]">Grimoire</span>
            </motion.h1>
            <motion.p
              variants={rise}
              className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)] sm:text-lg"
            >
              A cinematic command center for tier lists, team building, item decisions, and patch-aware meta reads.
            </motion.p>
            <motion.div
              variants={rise}
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/tierlist/comps"
                className="arcane-primary inline-flex min-w-48 items-center justify-center gap-2 rounded-lg px-7 py-3.5 text-sm font-bold uppercase tracking-[0.08em] transition duration-300 hover:-translate-y-0.5 hover:brightness-105"
              >
                View Tier Lists
                <ArrowRight size={16} strokeWidth={1.9} />
              </Link>
              <Link
                href="/builder"
                className="arcane-secondary inline-flex min-w-48 items-center justify-center gap-2 rounded-lg px-7 py-3.5 text-sm font-bold uppercase tracking-[0.08em] transition duration-300 hover:-translate-y-0.5"
              >
                <WandSparkles size={16} strokeWidth={1.8} />
                Open Builder
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-14 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="arcane-surface px-4 py-4">
                <div className="gradient-text text-2xl font-black" style={{ fontFamily: "'Cinzel', serif" }}>
                  {stat.value}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative py-18 sm:py-20">
        <div className="arcane-glyph-layer opacity-[0.045]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-90px' }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="mb-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-[var(--color-pumpkin)]">
                Arsenal
              </p>
              <h2 className="text-3xl font-black sm:text-4xl" style={{ fontFamily: "'Cinzel', serif" }}>
                <span className="gradient-text">Tools for the Climb</span>
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
              Dense enough for ranked prep, clear enough to scan between games.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {FEATURES.map(({ title, desc, href, Icon }) => (
              <motion.div key={title} variants={rise}>
                <Link href={href} className="grimoire-card group block h-full p-6 hover-float">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-[rgba(212,175,55,0.28)] bg-[rgba(250,204,21,0.065)] shadow-[inset_0_0_24px_rgba(0,0,0,0.62)]">
                    <Icon size={22} strokeWidth={1.7} className="text-[var(--color-pumpkin)]" />
                  </div>
                  <h3
                    className="text-lg font-bold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-pumpkin)]"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {desc}
                  </p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative overflow-hidden py-18 sm:py-20">
        <div className="arcane-glyph-layer opacity-[0.055]" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.22)] to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-90px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="arcane-surface px-6 py-10 sm:px-10"
          >
            <div className="mx-auto mb-5 grid h-11 w-11 place-items-center rounded-md border border-[rgba(212,175,55,0.28)] bg-[rgba(250,204,21,0.07)]">
              <Sparkles size={20} strokeWidth={1.8} className="text-[var(--color-pumpkin)]" />
            </div>
            <h2 className="text-3xl font-black sm:text-4xl" style={{ fontFamily: "'Cinzel', serif" }}>
              <span className="gradient-text">Premium Meta Access</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--color-text-secondary)]">
              Unlock Meta Oracle, smart recommendations, ad-free use, and premium tools from $5.99/mo.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/pricing" className="arcane-primary inline-flex min-w-44 items-center justify-center rounded-lg px-7 py-3 text-sm font-bold uppercase tracking-[0.08em]">
                View Plans
              </Link>
              <Link href="/meta" className="arcane-secondary inline-flex min-w-44 items-center justify-center gap-2 rounded-lg px-7 py-3 text-sm font-bold uppercase tracking-[0.08em]">
                <Activity size={16} strokeWidth={1.8} />
                Meta Oracle
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
