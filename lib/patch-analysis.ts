// ============================================================
// TFT Patch 16.2 — Meta Impact Analysis Data
// Generated from patch notes analysis
// ============================================================

export interface PatchChange {
  entity: string;
  type: 'unit' | 'trait' | 'item';
  changeType: 'buff' | 'nerf' | 'adjust';
  stat: string;
  score: number;
}

export interface PredictedComp {
  name: string;
  tier: 'S' | 'A' | 'B' | 'NERFED';
  score: number;
  reason: string;
  keyUnits: string[];
  buffedEntities: string[];
  nerfedEntities: string[];
}

export const PATCH_VERSION = '16.2';

export const PATCH_CHANGES: PatchChange[] = [
  // BUFFS
  { entity: 'Juggernaut', type: 'trait', changeType: 'buff', stat: 'Survivability / damage', score: 3 },
  { entity: 'Noxus', type: 'trait', changeType: 'buff', stat: 'Stacking power', score: 3 },
  { entity: 'Shadow Isles', type: 'trait', changeType: 'buff', stat: 'Drain / sustain', score: 3 },
  { entity: 'Zaun', type: 'trait', changeType: 'buff', stat: 'Augment synergy', score: 1.5 },
  { entity: 'Aurelion Sol', type: 'unit', changeType: 'buff', stat: 'Ability scaling', score: 3 },
  { entity: 'Ambessa', type: 'unit', changeType: 'buff', stat: 'Damage / mobility', score: 2 },
  { entity: 'Jinx', type: 'unit', changeType: 'buff', stat: 'Attack speed / damage', score: 2 },
  { entity: 'Darius', type: 'unit', changeType: 'buff', stat: 'Damage / tankiness', score: 2 },
  { entity: 'Kai\'Sa', type: 'unit', changeType: 'buff', stat: 'Damage / execute', score: 2 },
  { entity: 'Twisted Fate', type: 'unit', changeType: 'buff', stat: 'Utility / mana', score: 2 },
  { entity: 'LeBlanc', type: 'unit', changeType: 'buff', stat: 'Burst damage', score: 1 },
  { entity: 'Kalista', type: 'unit', changeType: 'buff', stat: 'Attack scaling', score: 1 },
  { entity: 'Teemo', type: 'unit', changeType: 'buff', stat: 'Ability damage', score: 1 },
  { entity: 'Miss Fortune', type: 'unit', changeType: 'buff', stat: 'AoE damage', score: 1 },
  { entity: 'Ziggs', type: 'unit', changeType: 'buff', stat: 'Ability damage', score: 1 },
  { entity: 'Seraphine', type: 'unit', changeType: 'buff', stat: 'Healing / shield', score: 1 },
  { entity: 'All Emblems', type: 'item', changeType: 'buff', stat: 'Trait flexibility', score: 1 },
  // NERFS
  { entity: 'Bilgewater', type: 'trait', changeType: 'nerf', stat: 'Gold / treasure', score: -3 },
  { entity: 'Piltover', type: 'trait', changeType: 'nerf', stat: 'Tech scaling', score: -3 },
  { entity: 'Baron Nashor', type: 'unit', changeType: 'nerf', stat: 'Summon power', score: -3 },
  { entity: 'Draven', type: 'unit', changeType: 'nerf', stat: 'AD damage', score: -2 },
  { entity: 'Graves', type: 'unit', changeType: 'nerf', stat: 'Burst damage', score: -2 },
  { entity: 'Veigar', type: 'unit', changeType: 'nerf', stat: 'Scaling damage', score: -2 },
  { entity: 'T-Hex', type: 'unit', changeType: 'nerf', stat: 'Scaling power', score: -2 },
  { entity: 'Lucian & Senna', type: 'unit', changeType: 'nerf', stat: 'Duo synergy', score: -2 },
  { entity: 'Diana', type: 'unit', changeType: 'nerf', stat: 'Tankiness', score: -1 },
  { entity: 'Skarner', type: 'unit', changeType: 'nerf', stat: 'CC / tankiness', score: -1 },
  { entity: 'Trydamere', type: 'unit', changeType: 'nerf', stat: 'Crit / sustain', score: -1 },
  { entity: 'Kindred', type: 'unit', changeType: 'nerf', stat: 'Execute / sustain', score: -1 },
  { entity: 'Kraken\'s Fury', type: 'item', changeType: 'nerf', stat: 'On-hit damage', score: -1 },
  // ADJUSTED
  { entity: 'Ionia', type: 'trait', changeType: 'adjust', stat: 'Reworked thresholds', score: 0 },
  { entity: 'Ixtal', type: 'trait', changeType: 'adjust', stat: 'Element scaling', score: 0 },
  { entity: 'Koruko & Yuumi', type: 'unit', changeType: 'adjust', stat: 'Redistribution', score: 0 },
  { entity: 'Bard', type: 'unit', changeType: 'adjust', stat: 'Doot scaling', score: 0 },
];

export const PREDICTED_META: PredictedComp[] = [
  {
    name: 'Noxus Juggernaut (Darius Carry)',
    tier: 'S',
    score: 10,
    reason: 'Double trait buff (Noxus +3, Juggernaut +3) plus direct Darius and Ambessa buffs create the strongest frontline carry comp this patch.',
    keyUnits: ['Darius', 'Ambessa', 'LeBlanc'],
    buffedEntities: ['Noxus', 'Juggernaut', 'Darius', 'Ambessa'],
    nerfedEntities: [],
  },
  {
    name: 'Shadow Isles Aurelion Sol',
    tier: 'S',
    score: 6,
    reason: 'Major ASol buff (+3) combined with Shadow Isles trait buff makes this the premier late-game AP carry comp.',
    keyUnits: ['Aurelion Sol', 'Kalista'],
    buffedEntities: ['Shadow Isles', 'Aurelion Sol'],
    nerfedEntities: [],
  },
  {
    name: 'Noxus LeBlanc Assassins',
    tier: 'S',
    score: 6,
    reason: 'Noxus trait buff benefits the entire roster. LeBlanc and Darius both individually buffed, creating a strong aggressive mid-game spike.',
    keyUnits: ['LeBlanc', 'Darius', 'Ambessa'],
    buffedEntities: ['Noxus', 'LeBlanc', 'Darius'],
    nerfedEntities: [],
  },
  {
    name: 'Jinx Zaun Reroll',
    tier: 'A',
    score: 3.5,
    reason: 'Jinx direct buff plus Zaun trait improvement. Low-cost reroll comp that benefits from the buffs without being contested.',
    keyUnits: ['Jinx', 'Ziggs'],
    buffedEntities: ['Zaun', 'Jinx'],
    nerfedEntities: [],
  },
  {
    name: 'Twisted Fate Flex',
    tier: 'A',
    score: 3,
    reason: 'TF utility buff and Ziggs buff improve the early-mid game. Flexible comp that can pivot into multiple late-game boards.',
    keyUnits: ['Twisted Fate', 'Ziggs'],
    buffedEntities: ['Twisted Fate', 'Ziggs'],
    nerfedEntities: [],
  },
  {
    name: 'Kai\'Sa Void',
    tier: 'A',
    score: 2,
    reason: 'Moderate Kai\'Sa buff improves her as a carry. Solid comp that should see increased play.',
    keyUnits: ['Kai\'Sa'],
    buffedEntities: ['Kai\'Sa'],
    nerfedEntities: [],
  },
  {
    name: 'Ionia Flex',
    tier: 'B',
    score: 0,
    reason: 'Adjusted but not clearly buffed or nerfed. Power level depends on how the threshold rework plays out in practice.',
    keyUnits: ['Koruko & Yuumi', 'Bard'],
    buffedEntities: [],
    nerfedEntities: [],
  },
  {
    name: 'Veigar Mages',
    tier: 'NERFED',
    score: -1,
    reason: 'Veigar directly nerfed. Seraphine buff is minor compensation. Previously strong scaling comp takes a meaningful hit.',
    keyUnits: ['Veigar', 'Seraphine'],
    buffedEntities: ['Seraphine'],
    nerfedEntities: ['Veigar'],
  },
  {
    name: 'Draven AD Carry',
    tier: 'NERFED',
    score: -3,
    reason: 'Draven nerfed alongside Kraken\'s Fury item nerf. AD-focused comps lose their strongest carry option.',
    keyUnits: ['Draven'],
    buffedEntities: [],
    nerfedEntities: ['Draven', 'Kraken\'s Fury'],
  },
  {
    name: 'Bilgewater Graves',
    tier: 'NERFED',
    score: -5,
    reason: 'Double hit: Bilgewater trait nerf removes economy advantage, Graves damage nerf kills the carry potential.',
    keyUnits: ['Graves'],
    buffedEntities: [],
    nerfedEntities: ['Bilgewater', 'Graves'],
  },
  {
    name: 'Piltover T-Hex',
    tier: 'NERFED',
    score: -5,
    reason: 'Piltover trait nerf and T-Hex scaling nerf—the comp\'s entire identity is weakened.',
    keyUnits: ['T-Hex'],
    buffedEntities: [],
    nerfedEntities: ['Piltover', 'T-Hex'],
  },
];
