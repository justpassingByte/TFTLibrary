import type { Article } from './types';

// ─── Seed Articles ─────────────────────────────────────────────────────────
// Local structured content (zero-infra MVP — no DB required).
// Replace with CMS/DB fetch later without changing the consumer API.

export const ARTICLES: Article[] = [
  {
    slug: 'mastering-economy',
    title: 'Mastering Economy: When to Roll vs Level',
    excerpt:
      'Understanding econ breakpoints is the single most impactful skill in TFT. Learn the 50g rule, when to break it, and how top players think about gold.',
    tags: ['Economy', 'Fundamentals'],
    author: 'Dishsoap',
    publishedAt: '2026-03-28',
    readTime: '8 min',
    status: 'published',
    blocks: [
      {
        id: 'b1',
        type: 'heading-1',
        content: { text: 'The Foundation of Every TFT Game' },
      },
      {
        id: 'b2',
        type: 'paragraph',
        content: {
          text: "Gold management is the invisible skill separating Diamond players from Grandmasters. You can have perfect game knowledge and still finish 5th because you didn't understand when to roll. This guide breaks down the math and the mindset.",
        },
      },
      {
        id: 'b3',
        type: 'callout',
        content: {
          text: 'The 50g Interest Rule: Always try to hit 50g before spending. Every 10g over 0 earns 1g interest per round — that adds up to 5g/round at 50g.',
          variant: 'tip',
        },
      },
      {
        id: 'b4',
        type: 'heading-2',
        content: { text: 'Stage 2: Economy or Fight?' },
      },
      {
        id: 'b5',
        type: 'paragraph',
        content: {
          text: "Stage 2 is about establishing your econ. Unless you're 6-0 in stage 1, you should be saving gold and picking up interest. A winstreak is worth sacrificing a little health for — but a dead-even win rate means you're better off loss-streaking intentionally to preserve gold.",
        },
      },
      {
        id: 'b6',
        type: 'list',
        content: {
          ordered: true,
          items: [
            'Hit 50g before Wolves (2-5) if possible.',
            'Roll aggressively only if your HP drops below 40.',
            'Level to 5 on 2-1 if you have a strong early comp.',
            'Level to 6 on 3-2 to spike your board.',
          ],
        },
      },
      {
        id: 'b7',
        type: 'heading-2',
        content: { text: 'Stage 3: The Pivot Point' },
      },
      {
        id: 'b8',
        type: 'paragraph',
        content: {
          text: 'Stage 3 is when most lobbies diverge. Strong-economy players can afford to roll 20-30g on 3-2 to stabilize, then pivot into the strongest available comp. Weak-economy players are forced to roll just to survive. Avoid being reactive — plan your level spikes around your gold.',
        },
      },
      {
        id: 'b9',
        type: 'callout',
        content: {
          text: 'Warning: Rolling to 0 on stage 3 without a 3-star 4-cost is almost always a mistake. You need gold to compete in stage 4.',
          variant: 'warning',
        },
      },
      {
        id: 'b10',
        type: 'heading-2',
        content: { text: 'Late Game: When to FF vs Fight' },
      },
      {
        id: 'b11',
        type: 'paragraph',
        content: {
          text: "By stage 5, you're either in top-4 or fighting to stay alive. If you're at 20HP and holding 40g, spend it. Holding interest in a losing game is one of the most common mistakes. Conversely, if you're in top-3 with 60HP, slow-roll and be patient — your opponents will over-roll trying to catch up to you.",
        },
      },
    ],
  },
  {
    slug: 'positioning-masterclass',
    title: 'Positioning Masterclass: Anti-Assassin & Zephyr',
    excerpt:
      'Positioning wins games. Learn the corner carry setup, anti-assassin formations, and how to bait Zephyr in high elo lobbies.',
    tags: ['Positioning', 'Advanced'],
    author: 'KCDouble0',
    publishedAt: '2026-04-01',
    readTime: '6 min',
    status: 'published',
    blocks: [
      {
        id: 'p1',
        type: 'heading-1',
        content: { text: 'Why Positioning is a Superpower' },
      },
      {
        id: 'p2',
        type: 'paragraph',
        content: {
          text: "Two players can run the exact same comp and get radically different results because of positioning. It's one of the few areas where skill consistently creates an edge in TFT, and it's completely free to learn.",
        },
      },
      {
        id: 'p3',
        type: 'callout',
        content: {
          text: 'Core Principle: Your carry should be unreachable by assassins unless sacrificing another unit to absorb the jump.',
          variant: 'info',
        },
      },
      {
        id: 'p4',
        type: 'heading-2',
        content: { text: 'Anti-Assassin Formations' },
      },
      {
        id: 'p5',
        type: 'list',
        content: {
          ordered: false,
          items: [
            'Place your carry in the back corner (row 4, col 1 or 7) — assassins always jump to the farthest target.',
            'Put a tanky decoy in the opposite back corner to split assassin jumps.',
            'Keep your backline units clustered only if they have self-peel (e.g. Poppy shield).',
            'Never stack your carries in a line — one Zed flip wrecks you.',
          ],
        },
      },
      {
        id: 'p6',
        type: 'heading-2',
        content: { text: 'Baiting Zephyr' },
      },
      {
        id: 'p7',
        type: 'paragraph',
        content: {
          text: "Zephyr drops on the unit directly mirrored from your opponent's positioning. High-elo players shuffle units at the last second to dodge the zone. If you're consistently getting Zephyr'd, try moving your carry one hex right or left from their \"obvious\" expected position.",
        },
      },
      {
        id: 'p8',
        type: 'callout',
        content: {
          text: 'Pro tip: Watch your opponent hover their units before combat. If they move a unit at the last second, they might be shuffling their carry — re-evaluate your Zephyr placement.',
          variant: 'tip',
        },
      },
    ],
  },
  {
    slug: 'augment-selection-framework',
    title: 'Augment Selection Framework',
    excerpt:
      'A decision framework for every augment choice. Economy augments vs combat augments: when each is correct, and the math behind the decision.',
    tags: ['Augments', 'Advanced'],
    author: 'MismatchedSocks',
    publishedAt: '2026-04-03',
    readTime: '10 min',
    status: 'published',
    blocks: [
      {
        id: 'a1',
        type: 'heading-1',
        content: { text: 'The Augment Trilemma' },
      },
      {
        id: 'a2',
        type: 'paragraph',
        content: {
          text: 'Every augment round forces the same question: do I take the econ augment, the combat augment, or the comp-specific augment? The answer depends on timing, health, and what your comp actually needs.',
        },
      },
      {
        id: 'a3',
        type: 'heading-2',
        content: { text: 'Stage 2-1: Economy is King' },
      },
      {
        id: 'a4',
        type: 'paragraph',
        content: {
          text: 'On 2-1, your board is weak regardless. Taking a gold-generating augment at 2-1 (Hedge Fund, Golden Ticket, Tons of Stats) compounds across the entire game rather than spiking a weak board. Combat augments on 2-1 are rarely worth it unless you are rolling 100% into a winstreak strategy.',
        },
      },
      {
        id: 'a5',
        type: 'callout',
        content: {
          text: 'Silver Rule: If you see "Hedge Fund" or "Tons of Stats" at 2-1, you almost always take it — even over a comp-specific prismatic.',
          variant: 'info',
        },
      },
      {
        id: 'a6',
        type: 'heading-2',
        content: { text: 'Stage 3-2 & 4-2: Combat Spike' },
      },
      {
        id: 'a7',
        type: 'list',
        content: {
          ordered: false,
          items: [
            'By 3-2, you should know your comp. Take the augment that directly buffs your 3-star or key traits.',
            'If HP < 40, prioritize combat over econ — you need to stabilize.',
            "Comp-specific augments (e.g. 'Cybernetic Leech' for Cybernetics) are often +15% win rate — don't skip them for generic options.",
            'Reroll comps LOVE combat augments at 4-2 because you\'ll be 3-starring fast.',
          ],
        },
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug && a.status === 'published');
}

export function getPublishedArticles(): Article[] {
  return ARTICLES.filter((a) => a.status === 'published');
}
