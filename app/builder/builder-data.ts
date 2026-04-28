// ============================================================
// Builder Data & Types
// ============================================================

export function getChampionOrigin(champ: Omit<BuilderChampion, 'cost'> & { traits: string[] }, traitsDb: any[]): string {
  return champ.traits.find(t => traitsDb.find(gen => gen.name === t)?.type === 'Origin') || champ.traits[0] || '';
}

export function getChampionClass(champ: Omit<BuilderChampion, 'cost'> & { traits: string[] }, traitsDb: any[]): string {
  return champ.traits.find(t => traitsDb.find(gen => gen.name === t)?.type === 'Class') || champ.traits[1] || champ.traits[0] || '';
}
export interface BuilderAugment {
  id: string;
  name: string;
  desc: string;
  icon?: string;
}



export interface BuilderChampion {
  id: string;
  name: string;
  cost: number;
  traits: string[];
  icon?: string;
}

export interface PlacedUnit {
  champion: BuilderChampion;
  items: string[];
  starLevel?: 1 | 2 | 3;
}

export type BoardCell = PlacedUnit | null;

export type TierNode =
  | { type: 'champion'; id: string; data: BuilderChampion }
  | { type: 'item'; id: string; data: ItemDef }
  | { type: 'augment'; id: string; data: BuilderAugment };

export interface TierRow {
  label: string;
  color: string;
  nodes: TierNode[];
}

export type ItemCategory = 'Components' | 'Completed' | 'Radiants' | 'Support' | 'Artifacts' | 'Emblems' | 'Special';

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  category: ItemCategory;
}

// ── Component (base) item IDs ──
const COMPONENT_IDS = new Set([
  'TFT_Item_BFSword',
  'TFT_Item_NeedlesslyLargeRod',
  'TFT_Item_RecurveBow',
  'TFT_Item_TearOfTheGoddess',
  'TFT_Item_ChainVest',
  'TFT_Item_NegatronCloak',
  'TFT_Item_GiantsBelt',
  'TFT_Item_SparringGloves',
  'TFT_Item_Spatula',
  'TFT_Item_FryingPan',
]);

// ── Completed (craftable) item IDs — real equippable combined items ──
const COMPLETED_IDS = new Set([
  'TFT_Item_Bloodthirster',
  'TFT_Item_BrambleVest',
  'TFT_Item_Deathblade',
  'TFT_Item_DragonsClaw',
  'TFT_Item_ForceOfNature',
  'TFT_Item_ThiefsGloves',
  'TFT_Item_FrozenHeart',
  'TFT_Item_MadredsBloodrazor',
  'TFT_Item_GuardianAngel',
  'TFT_Item_GuinsoosRageblade',
  'TFT_Item_UnstableConcoction',
  'TFT_Item_HextechGunblade',
  'TFT_Item_InfinityEdge',
  'TFT_Item_IonicSpark',
  'TFT_Item_JeweledGauntlet',
  'TFT_Item_LastWhisper',
  'TFT_Item_ArchangelsStaff',
  'TFT_Item_Quicksilver',
  'TFT_Item_Morellonomicon',
  'TFT_Item_PowerGauntlet',
  'TFT_Item_RabadonsDeathcap',
  'TFT_Item_RapidFireCannon',
  'TFT_Item_RedBuff',
  'TFT_Item_Redemption',
  'TFT_Item_RunaansHurricane',
  'TFT_Item_SpearOfShojin',
  'TFT_Item_StatikkShiv',
  'TFT_Item_GargoyleStoneplate',
  'TFT_Item_TitanicHydra',
  'TFT_Item_TitansResolve',
  'TFT_Item_WarmogsArmor',
  'TFT_Item_SteraksGage',
  'TFT_Item_BlueBuff',
  'TFT_Item_AdaptiveHelm',
  'TFT_Item_Leviathan',
  'TFT_Item_SpectralGauntlet',
  'TFT_Item_Crownguard',
  'TFT_Item_NightHarvester',
  'TFT_Item_SentinelSwarm',
]);

// ── Support item IDs ──
const SUPPORT_IDS = new Set([
  'TFT_Item_Chalice',
  'TFT_Item_Shroud',
  'TFT_Item_LocketOfTheIronSolari',
  'TFT_Item_ZekesHerald',
  'TFT_Item_Zephyr',
  'TFT_Item_AegisOfTheLegion',
  'TFT_Item_BansheesVeil',
  'TFT_Item_SupportKnightsVow',
  'TFT_Item_Moonstone',
  // Note: RadiantVirtue is treated as Support item by TFT, but its ID has Radiant.
  'TFT_Item_EternalFlame',
]);

export function categorizeItem(id: string): ItemCategory | null {
  if (COMPONENT_IDS.has(id)) return 'Components';
  if (COMPLETED_IDS.has(id)) return 'Completed';
  if (SUPPORT_IDS.has(id) || id === 'TFT_Item_RadiantVirtue') return 'Support';
  if (id.includes('Radiant')) return 'Radiants';
  if (id.includes('Artifact_') || id.includes('Darkin')) return 'Artifacts';
  if (id.includes('Emblem') || id.includes('Crown')) return 'Emblems';
  return 'Special'; // Any unrecognized items are thrown into Special
}


export const COST_COLORS: Record<number, string> = {
  1: '#9CA3AF',
  2: '#7FB883',
  3: '#6FA3D9',
  4: '#B08AD8',
  5: '#D4AF37',
};

export const COST_BG: Record<number, string> = {
  1: 'rgba(156,163,175,0.13)',
  2: 'rgba(127,184,131,0.14)',
  3: 'rgba(111,163,217,0.14)',
  4: 'rgba(176,138,216,0.14)',
  5: 'rgba(212,175,55,0.16)',
};

export const TIER_CONFIG = [
  { label: 'S', color: '#FACC15', bg: 'rgba(250,204,21,0.055)', border: 'rgba(250,204,21,0.28)' },
  { label: 'A', color: '#D4AF37', bg: 'rgba(212,175,55,0.044)', border: 'rgba(212,175,55,0.14)' },
  { label: 'B', color: '#8B6F2A', bg: 'rgba(139,111,42,0.038)', border: 'rgba(139,111,42,0.12)' },
  { label: 'C', color: '#8FA7C2', bg: 'rgba(143,167,194,0.03)', border: 'rgba(255,255,255,0.06)' },
  { label: 'X', color: '#8290A7', bg: 'rgba(130,144,167,0.026)', border: 'rgba(255,255,255,0.05)' },
];

export const BOARD_ROWS = 4;
export const BOARD_COLS = 7;
