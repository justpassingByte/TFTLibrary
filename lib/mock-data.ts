// ============================================================
// TFT Grimoire — Mock Data Layer
// All mock data for comps, champions, items, augments, trends
// ============================================================

export interface Champion {
  id: string;
  name: string;
  cost: number;
  image: string;
  traits: string[];
  isCarry?: boolean;
}

export interface CompData {
  id: string;
  name: string;
  tier: 'S' | 'A' | 'B' | 'C' | 'X';
  champions: Champion[];
  keyItems: string[];
  augments: string[];
  strategy: string;
  winrate: number;
  pickrate: number;
  avgPlacement: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface TrendData {
  comp_name: string;
  comp_id: string;
  trend: 'RISING' | 'FALLING' | 'STABLE';
  winrate_now: number;
  winrate_prev: number;
  delta: number;
  pickrate: number;
  games: number;
  history: { t: string; winrate: number }[];
  insight: string | null;
}

export interface RecommendResult {
  comp_name: string;
  winrate: number;
  games: number;
  is_best: boolean;
  insight: string | null;
  champions: string[];
}

export interface ItemData {
  id: string;
  name: string;
  image: string;
  tier: 'S' | 'A' | 'B' | 'C';
  avgPlacement: number;
  winrate: number;
  pickrate: number;
}

export interface AugmentData {
  id: string;
  name: string;
  tier: 'S' | 'A' | 'B' | 'C';
  avgPlacement: number;
  winrate: number;
  pickrate: number;
  rarity: 'Silver' | 'Gold' | 'Prismatic';
}

// Hardcoded tiny subset of standard comps since static data is deleted.
const CHAMPIONS: Champion[] = [
  { id: 'TFT16_Ekko', name: 'Ekko', cost: 5, image: '', traits: [], isCarry: false },
  { id: 'TFT16_Ambessa', name: 'Ambessa', cost: 4, image: '', traits: [], isCarry: false }
];

function pick(ids: string[]): Champion[] {
  return ids.map(id => {
    const c = CHAMPIONS.find(champ => champ.name.toLowerCase().includes(id.toLowerCase()));
    if (c) return { ...c, isCarry: ['ahri', 'syndra', 'jinx', 'varus', 'orianna', 'ryze', 'smolder'].includes(id.toLowerCase()) };
    return null;
  }).filter(Boolean) as Champion[];
}

// ============================================================
// Comp Data
// ============================================================
export const COMPS: CompData[] = [
  {
    id: 'ahri-arcana',
    name: 'Ahri Arcana Scholars',
    tier: 'S',
    champions: pick(['nami', 'lux', 'veigar', 'ahri', 'orianna', 'karma', 'taric', 'galio']),
    keyItems: ['Jeweled Gauntlet', 'Blue Buff', 'Giant Slayer'],
    augments: ['Jeweled Lotus', 'Scholar Heart', 'Arcana Crest'],
    strategy: 'Fast 8, roll for Ahri. Slam AP items on Ahri as carry. Orianna provides late-game insurance.',
    winrate: 56.2,
    pickrate: 8.4,
    avgPlacement: 3.2,
    difficulty: 'Medium',
  },
  {
    id: 'syndra-eldritch',
    name: 'Syndra Eldritch Invoker',
    tier: 'S',
    champions: pick(['cassiopeia', 'zilean', 'syndra', 'varus', 'morgana', 'karma', 'galio', 'ryze']),
    keyItems: ['Hextech Gunblade', 'Spear of Shojin', 'Guardbreaker'],
    augments: ['Eldritch Heart', 'Incantor Crown', 'Jeweled Lotus'],
    strategy: 'Slow roll at 8 for Syndra 3-star. Stack AP on Syndra; Varus secondary carry.',
    winrate: 54.8,
    pickrate: 7.2,
    avgPlacement: 3.4,
    difficulty: 'Hard',
  },
  {
    id: 'smolder-dragon',
    name: 'Smolder Dragon Blasters',
    tier: 'S',
    champions: pick(['jhin', 'rumble', 'tristana', 'ekko', 'smolder', 'jinx', 'taric', 'galio']),
    keyItems: ['Giant Slayer', 'Last Whisper', "Guinsoo's Rageblade"],
    augments: ['Blaster Heart', 'Dragon Soul', 'Combat Caster'],
    strategy: 'Strongest board through mid-game. Level 8 for Smolder, itemize AD. Jinx backup carry.',
    winrate: 55.1,
    pickrate: 9.1,
    avgPlacement: 3.3,
    difficulty: 'Easy',
  },
  {
    id: 'jinx-sugarcraft',
    name: 'Jinx Sugarcraft Hunters',
    tier: 'A',
    champions: pick(['twitch', 'rumble', 'ekko', 'jinx', 'sett', 'cassiopeia', 'morgana', 'smolder']),
    keyItems: ['Giant Slayer', 'Infinity Edge', 'Last Whisper'],
    augments: ['Sugarcraft Heart', 'Hunter Crown', 'Preparation'],
    strategy: 'Roll at 7 for Jinx 3. Sugarcraft cupcakes fuel economy. Transition to Smolder at 8 if needed.',
    winrate: 52.4,
    pickrate: 6.8,
    avgPlacement: 3.6,
    difficulty: 'Easy',
  },
  {
    id: 'varus-eldritch',
    name: 'Varus Eldritch Blasters',
    tier: 'A',
    champions: pick(['jhin', 'cassiopeia', 'zilean', 'veigar', 'varus', 'morgana', 'syndra', 'swain']),
    keyItems: ["Guinsoo's Rageblade", 'Giant Slayer', 'Quicksilver'],
    augments: ['Eldritch Crest', 'Blaster Heart', 'Scoped Weapons'],
    strategy: 'Flex Varus as primary carry with Eldritch sustain. Level 9 for Swain power spike.',
    winrate: 51.8,
    pickrate: 5.4,
    avgPlacement: 3.7,
    difficulty: 'Medium',
  },
  {
    id: 'karma-chrono',
    name: 'Karma Chrono Incantors',
    tier: 'A',
    champions: pick(['jhin', 'zilean', 'seraphine', 'karma', 'sett', 'morgana', 'taric', 'ryze']),
    keyItems: ['Spear of Shojin', 'Jeweled Gauntlet', "Archangel's Staff"],
    augments: ['Chrono Heart', 'Incantor Crown', 'Jeweled Lotus'],
    strategy: 'Karma item slam early. Chrono gives free value. Level 8 for Ryze cap.',
    winrate: 51.2,
    pickrate: 4.9,
    avgPlacement: 3.8,
    difficulty: 'Medium',
  },
  {
    id: 'ryze-portal',
    name: 'Ryze Portal Scholars',
    tier: 'B',
    champions: pick(['poppy', 'lux', 'veigar', 'karma', 'taric', 'galio', 'orianna', 'ryze']),
    keyItems: ['Blue Buff', 'Hextech Gunblade', 'Spear of Shojin'],
    augments: ['Portal Heart', 'Scholar Crown', 'Arcana Crest'],
    strategy: 'Level 9 cap comp. Ryze as primary carry. Slow play and pivot at 8.',
    winrate: 49.2,
    pickrate: 3.8,
    avgPlacement: 4.1,
    difficulty: 'Hard',
  },
  {
    id: 'sett-pyro',
    name: 'Sett Pyro Warriors',
    tier: 'B',
    champions: pick(['nasus', 'olaf', 'warwick', 'sett', 'ekko', 'jinx', 'morgana', 'swain']),
    keyItems: ["Titan's Resolve", "Warmog's Armor", 'Quicksilver'],
    augments: ['Pyro Heart', 'Warrior Crown', 'Determination'],
    strategy: 'Tanky frontline with Sett carry. Pyro burn stacks. Easy to force, low contested.',
    winrate: 48.1,
    pickrate: 4.2,
    avgPlacement: 4.3,
    difficulty: 'Easy',
  },
  {
    id: 'nami-faerie',
    name: 'Nami Faerie Enchanters',
    tier: 'C',
    champions: pick(['nami', 'seraphine', 'tristana', 'lux', 'karma', 'taric', 'orianna', 'galio']),
    keyItems: ["Archangel's Staff", 'Morellonomicon', 'Redemption'],
    augments: ['Faerie Heart', 'Mage Crest', 'Hedge Fund'],
    strategy: 'Support-heavy comp relying on sustained damage. Weak early, strong late if uncontested.',
    winrate: 46.5,
    pickrate: 2.1,
    avgPlacement: 4.8,
    difficulty: 'Hard',
  },
  {
    id: 'swain-frost',
    name: 'Swain Frost Control',
    tier: 'C',
    champions: pick(['olaf', 'twitch', 'warwick', 'zilean', 'ekko', 'sett', 'morgana', 'swain']),
    keyItems: ["Warmog's Armor", "Dragon's Claw", 'Gargoyle Stoneplate'],
    augments: ['Frost Heart', 'Shapeshifter Crown', 'Cybernetic Uplink'],
    strategy: 'Slow roll at 7 for Frost synergy. Swain transforms to dominate late fights. Very matchup dependent.',
    winrate: 45.8,
    pickrate: 1.9,
    avgPlacement: 5.0,
    difficulty: 'Hard',
  },
  {
    id: 'orianna-flex',
    name: 'Orianna Flex Cap',
    tier: 'X',
    champions: pick(['lux', 'zilean', 'karma', 'ahri', 'taric', 'galio', 'orianna', 'ryze']),
    keyItems: ['Blue Buff', 'Jeweled Gauntlet', 'Guardbreaker'],
    augments: ['Arcana Crown', 'Scholar Heart', 'Level Up!'],
    strategy: 'Situational: only when hitting Orianna naturally at 8. Powerful but unreliable.',
    winrate: 53.0,
    pickrate: 1.2,
    avgPlacement: 3.5,
    difficulty: 'Hard',
  },
];

// ============================================================
// Meta Shift Trend Data
// ============================================================
function generateHistory(base: number, trend: 'up' | 'down' | 'flat'): { t: string; winrate: number }[] {
  const points = [];
  let val = base;
  for (let i = 0; i < 8; i++) {
    const date = new Date(2026, 3, 4, i * 3);
    if (trend === 'up') val += 0.3 + Math.random() * 0.6;
    else if (trend === 'down') val -= 0.3 + Math.random() * 0.5;
    else val += (Math.random() - 0.5) * 0.4;
    points.push({ t: date.toISOString(), winrate: parseFloat(val.toFixed(1)) });
  }
  return points;
}

export const TRENDS: TrendData[] = [
  {
    comp_name: 'Ahri Arcana Scholars', comp_id: 'ahri-arcana',
    trend: 'RISING', winrate_now: 56.2, winrate_prev: 52.8, delta: 3.4, pickrate: 8.4, games: 2420,
    history: generateHistory(52.0, 'up'),
    insight: 'Rising due to strong synergy with Jeweled Lotus augment and Arcana buffs in patch 16.8.',
  },
  {
    comp_name: 'Smolder Dragon Blasters', comp_id: 'smolder-dragon',
    trend: 'RISING', winrate_now: 55.1, winrate_prev: 53.0, delta: 2.1, pickrate: 9.1, games: 3100,
    history: generateHistory(52.5, 'up'),
    insight: 'Smolder buffed in 16.8 hotfix. Dragon trait now gives 15% bonus AP.',
  },
  {
    comp_name: 'Karma Chrono Incantors', comp_id: 'karma-chrono',
    trend: 'RISING', winrate_now: 51.2, winrate_prev: 49.0, delta: 2.2, pickrate: 4.9, games: 890,
    history: generateHistory(48.5, 'up'),
    insight: 'Chrono trait rework making Karma a consistent carry. Low contest rate = free wins.',
  },
  {
    comp_name: 'Syndra Eldritch Invoker', comp_id: 'syndra-eldritch',
    trend: 'STABLE', winrate_now: 54.8, winrate_prev: 54.5, delta: 0.3, pickrate: 7.2, games: 2800,
    history: generateHistory(54.2, 'flat'),
    insight: null,
  },
  {
    comp_name: 'Jinx Sugarcraft Hunters', comp_id: 'jinx-sugarcraft',
    trend: 'STABLE', winrate_now: 52.4, winrate_prev: 52.1, delta: 0.3, pickrate: 6.8, games: 1850,
    history: generateHistory(52.0, 'flat'),
    insight: null,
  },
  {
    comp_name: 'Ryze Portal Scholars', comp_id: 'ryze-portal',
    trend: 'STABLE', winrate_now: 49.2, winrate_prev: 49.5, delta: -0.3, pickrate: 3.8, games: 720,
    history: generateHistory(49.3, 'flat'),
    insight: null,
  },
  {
    comp_name: 'Varus Eldritch Blasters', comp_id: 'varus-eldritch',
    trend: 'FALLING', winrate_now: 51.8, winrate_prev: 54.2, delta: -2.4, pickrate: 5.4, games: 1540,
    history: generateHistory(54.5, 'down'),
    insight: 'Varus nerfed in 16.8. AD scaling reduced from 120% to 100%.',
  },
  {
    comp_name: 'Sett Pyro Warriors', comp_id: 'sett-pyro',
    trend: 'FALLING', winrate_now: 48.1, winrate_prev: 51.0, delta: -2.9, pickrate: 4.2, games: 980,
    history: generateHistory(51.5, 'down'),
    insight: 'Pyro trait burn damage nerfed. Warrior frontline easily countered by Frost comps.',
  },
];

// ============================================================
// Items
// ============================================================
// Randomize Items securely
const allItems = [] as any[];
export const ITEMS: ItemData[] = allItems.map(i => ({
  id: i.id,
  name: i.name,
  image: '', // Replaced by CDN util later
  tier: ['S', 'A', 'B', 'C'][Math.floor(Math.random() * 4)] as 'S'|'A'|'B'|'C',
  avgPlacement: parseFloat((3.0 + Math.random() * 2).toFixed(1)),
  winrate: parseFloat((45 + Math.random() * 15).toFixed(1)),
  pickrate: parseFloat((1 + Math.random() * 10).toFixed(1)),
})).slice(0, 150); // Give a good amount but keep it sane

// ============================================================
// Augments
// ============================================================
export const AUGMENTS: AugmentData[] = [
  { id: 'jl', name: 'Jeweled Lotus', tier: 'S', avgPlacement: 3.0, winrate: 57.2, pickrate: 6.2, rarity: 'Prismatic' },
  { id: 'sh', name: 'Scholar Heart', tier: 'A', avgPlacement: 3.4, winrate: 53.8, pickrate: 5.1, rarity: 'Gold' },
  { id: 'ac', name: 'Arcana Crest', tier: 'A', avgPlacement: 3.5, winrate: 52.4, pickrate: 4.8, rarity: 'Silver' },
  { id: 'eh', name: 'Eldritch Heart', tier: 'S', avgPlacement: 3.1, winrate: 56.1, pickrate: 5.5, rarity: 'Gold' },
  { id: 'bh', name: 'Blaster Heart', tier: 'A', avgPlacement: 3.6, winrate: 51.9, pickrate: 4.2, rarity: 'Gold' },
  { id: 'cc', name: 'Combat Caster', tier: 'B', avgPlacement: 3.8, winrate: 50.2, pickrate: 3.8, rarity: 'Silver' },
  { id: 'pr', name: 'Preparation', tier: 'B', avgPlacement: 3.9, winrate: 49.8, pickrate: 4.5, rarity: 'Silver' },
  { id: 'lu', name: 'Level Up', tier: 'S', avgPlacement: 3.0, winrate: 58.1, pickrate: 3.2, rarity: 'Prismatic' },
  { id: 'hf', name: 'Hedge Fund', tier: 'A', avgPlacement: 3.3, winrate: 54.2, pickrate: 5.8, rarity: 'Gold' },
  { id: 'dt', name: 'Determination', tier: 'B', avgPlacement: 4.0, winrate: 49.1, pickrate: 3.1, rarity: 'Silver' },
  { id: 'sw', name: 'Scoped Weapons', tier: 'A', avgPlacement: 3.4, winrate: 53.0, pickrate: 4.0, rarity: 'Gold' },
  { id: 'ic', name: 'Incantor Crown', tier: 'S', avgPlacement: 3.2, winrate: 55.5, pickrate: 3.9, rarity: 'Prismatic' },
];

// ============================================================
// Recommend Logic (client-side mock)
// ============================================================
export function getRecommendations(
  selectedItems: string[],
  selectedAugment?: string
): RecommendResult[] {
  // Simple rule-based: find comps that use >= 2 of selected items or the augment
  const scored = COMPS.map(comp => {
    let score = 0;
    const itemMatches = selectedItems.filter(item =>
      comp.keyItems.some(ki => ki.toLowerCase().includes(item.toLowerCase()))
    ).length;
    score += itemMatches * 2;

    if (selectedAugment && comp.augments.some(a =>
      a.toLowerCase().includes(selectedAugment.toLowerCase())
    )) {
      score += 3;
    }

    // Add base winrate as tiebreaker
    score += comp.winrate / 100;

    return { comp, score };
  })
  .filter(s => s.score > 1)
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);

  return scored.map((s, i) => ({
    comp_name: s.comp.name,
    winrate: s.comp.winrate,
    games: Math.floor(500 + Math.random() * 2000),
    is_best: i === 0,
    insight: i === 0
      ? `Strong synergy with ${selectedItems.join(' + ')}${selectedAugment ? ` and ${selectedAugment}` : ''}.`
      : i === 1
        ? 'Solid alternative when primary comp is contested.'
        : null,
    champions: s.comp.champions.map(c => c.image),
  }));
}

// ============================================================
// Pricing Plans
// ============================================================
export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month';
  description: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
  cta: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'initiate',
    name: 'Initiate',
    price: 0,
    interval: 'month',
    description: 'Free access to core features. Start your journey.',
    features: [
      'Comp tier lists (Comps, Items, Augments)',
      'Basic meta overview',
      'Study Hall articles',
      'Community Discord access',
      'Weekly meta snapshot',
    ],
    highlighted: false,
    cta: 'Get Started Free',
  },
  {
    id: 'coven',
    name: 'Coven Member',
    price: 5.99,
    interval: 'month',
    description: 'Unlock the full grimoire. For dedicated climbers.',
    features: [
      'Everything in Initiate',
      'Meta Shift Tracker (real-time trends)',
      'Smart Comp Recommendations',
      'Item & Augment deeper analytics',
      'Team Builder: save & share boards',
      'Tierlist Maker: unlimited exports',
      'Ad-free experience',
      'Priority Discord role',
    ],
    highlighted: true,
    badge: 'Most Popular',
    cta: 'Join the Coven',
  },
  {
    id: 'archmage',
    name: 'Arch-Mage',
    price: 12.99,
    interval: 'month',
    description: 'Ultimate power. For content creators & coaches.',
    features: [
      'Everything in Coven',
      'Desktop Overlay companion app',
      'API access for custom integrations',
      'Early access to new features',
      'Custom branded tierlist exports',
      'Coach profile & booking system',
      'Monthly 1-on-1 meta review call',
      'Exclusive Arch-Mage Discord channel',
    ],
    highlighted: false,
    badge: 'Pro',
    cta: 'Ascend to Arch-Mage',
  },
];
