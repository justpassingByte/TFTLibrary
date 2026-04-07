import prisma from '../lib/prisma';

/**
 * Aggregates match data into stat tables using Prisma queries.
 * Reads from player_matches, match_units, match_traits, match_augments
 * and writes computed stats to comp_stats, augment_stats, item_stats, trait_stats.
 */
export async function runAggregation() {
  // Get all distinct patches
  const patchRows = await prisma.playerMatch.findMany({
    select: { patch: true },
    distinct: ['patch'],
  });
  const patches = patchRows.map(p => p.patch);
  console.log(`[aggregate] Found ${patches.length} patches: ${patches.join(', ')}`);

  for (const patch of patches) {
    await aggregateCompStats(patch);
    await aggregateAugmentStats(patch);
    await aggregateItemStats(patch);
    await aggregateTraitStats(patch);
    await aggregateChampionStats(patch);
    await aggregateItemChampionStats(patch);
    console.log(`[aggregate] Patch ${patch} done.`);
  }

  return patches;
}

// ── Comp Stats ───────────────────────────────────────────────────────

async function aggregateCompStats(patch: string) {
  const playerMatches = await prisma.playerMatch.findMany({
    where: { patch },
    select: { comp_signature: true, placement: true },
  });

  // Group by comp_signature
  const map = new Map<string, { count: number; placements: number[]; wins: number; top4s: number }>();
  for (const pm of playerMatches) {
    const sig = pm.comp_signature || 'unknown';
    const entry = map.get(sig) || { count: 0, placements: [], wins: 0, top4s: 0 };
    entry.count++;
    entry.placements.push(pm.placement);
    if (pm.placement === 1) entry.wins++;
    if (pm.placement <= 4) entry.top4s++;
    map.set(sig, entry);
  }

  // Upsert into comp_stats
  for (const [sig, data] of map) {
    const avg = data.placements.reduce((a, b) => a + b, 0) / data.count;
    await prisma.compStat.upsert({
      where: { comp_signature_patch: { comp_signature: sig, patch } },
      update: {
        sample_count: data.count,
        avg_placement: Math.round(avg * 100) / 100,
        top4_rate: Math.round((data.top4s / data.count) * 10000) / 10000,
        win_rate: Math.round((data.wins / data.count) * 10000) / 10000,
      },
      create: {
        comp_signature: sig,
        patch,
        sample_count: data.count,
        avg_placement: Math.round(avg * 100) / 100,
        top4_rate: Math.round((data.top4s / data.count) * 10000) / 10000,
        win_rate: Math.round((data.wins / data.count) * 10000) / 10000,
      },
    });
  }
  console.log(`[aggregate] comp_stats: ${map.size} signatures for patch ${patch}`);
}

// ── Augment Stats ────────────────────────────────────────────────────

async function aggregateAugmentStats(patch: string) {
  const augmentData = await prisma.matchAugment.findMany({
    where: { player_match: { patch } },
    select: {
      augment_id: true,
      player_match: { select: { placement: true } },
    },
  });

  const map = new Map<string, { count: number; placements: number[]; wins: number; top4s: number }>();
  for (const row of augmentData) {
    const entry = map.get(row.augment_id) || { count: 0, placements: [], wins: 0, top4s: 0 };
    const p = row.player_match.placement;
    entry.count++;
    entry.placements.push(p);
    if (p === 1) entry.wins++;
    if (p <= 4) entry.top4s++;
    map.set(row.augment_id, entry);
  }

  for (const [augId, data] of map) {
    const avg = data.placements.reduce((a, b) => a + b, 0) / data.count;
    await prisma.augmentStat.upsert({
      where: { augment_id_patch: { augment_id: augId, patch } },
      update: {
        sample_count: data.count,
        avg_placement: Math.round(avg * 100) / 100,
        top4_rate: Math.round((data.top4s / data.count) * 10000) / 10000,
        win_rate: Math.round((data.wins / data.count) * 10000) / 10000,
      },
      create: {
        augment_id: augId,
        patch,
        sample_count: data.count,
        avg_placement: Math.round(avg * 100) / 100,
        top4_rate: Math.round((data.top4s / data.count) * 10000) / 10000,
        win_rate: Math.round((data.wins / data.count) * 10000) / 10000,
      },
    });
  }
  console.log(`[aggregate] augment_stats: ${map.size} augments for patch ${patch}`);
}

// ── Item Stats ───────────────────────────────────────────────────────

async function aggregateItemStats(patch: string) {
  const unitData = await prisma.matchUnit.findMany({
    where: { player_match: { patch } },
    select: {
      item_names: true,
      player_match: { select: { placement: true } },
    },
  });

  const map = new Map<string, { count: number; placements: number[]; top4s: number }>();
  for (const row of unitData) {
    for (const item of row.item_names) {
      if (!item) continue;
      const entry = map.get(item) || { count: 0, placements: [], top4s: 0 };
      const p = row.player_match.placement;
      entry.count++;
      entry.placements.push(p);
      if (p <= 4) entry.top4s++;
      map.set(item, entry);
    }
  }

  for (const [itemName, data] of map) {
    const avg = data.placements.reduce((a, b) => a + b, 0) / data.count;
    await prisma.itemStat.upsert({
      where: { item_name_patch: { item_name: itemName, patch } },
      update: {
        usage_count: data.count,
        avg_placement: Math.round(avg * 100) / 100,
        top4_rate: Math.round((data.top4s / data.count) * 10000) / 10000,
      },
      create: {
        item_name: itemName,
        patch,
        usage_count: data.count,
        avg_placement: Math.round(avg * 100) / 100,
        top4_rate: Math.round((data.top4s / data.count) * 10000) / 10000,
      },
    });
  }
  console.log(`[aggregate] item_stats: ${map.size} items for patch ${patch}`);
}

// ── Trait Stats ──────────────────────────────────────────────────────

async function aggregateTraitStats(patch: string) {
  const traitData = await prisma.matchTrait.findMany({
    where: { player_match: { patch } },
    select: {
      trait_name: true,
      tier_current: true,
      player_match: { select: { placement: true } },
    },
  });

  // Key = "traitName|tierCurrent"
  const map = new Map<string, { trait_name: string; tier_current: number; count: number; placements: number[]; top4s: number }>();
  for (const row of traitData) {
    const key = `${row.trait_name}|${row.tier_current}`;
    const entry = map.get(key) || { trait_name: row.trait_name, tier_current: row.tier_current, count: 0, placements: [], top4s: 0 };
    const p = row.player_match.placement;
    entry.count++;
    entry.placements.push(p);
    if (p <= 4) entry.top4s++;
    map.set(key, entry);
  }

  for (const [, data] of map) {
    const avg = data.placements.reduce((a, b) => a + b, 0) / data.count;
    await prisma.traitStat.upsert({
      where: {
        trait_name_tier_current_patch: {
          trait_name: data.trait_name,
          tier_current: data.tier_current,
          patch,
        },
      },
      update: {
        sample_count: data.count,
        avg_placement: Math.round(avg * 100) / 100,
        top4_rate: Math.round((data.top4s / data.count) * 10000) / 10000,
      },
      create: {
        trait_name: data.trait_name,
        tier_current: data.tier_current,
        patch,
        sample_count: data.count,
        avg_placement: Math.round(avg * 100) / 100,
        top4_rate: Math.round((data.top4s / data.count) * 10000) / 10000,
      },
    });
  }
  console.log(`[aggregate] trait_stats: ${map.size} trait-tier combos for patch ${patch}`);
}

// ── Champion Stats ───────────────────────────────────────────────────

async function aggregateChampionStats(patch: string) {
  // Count total player_matches for this patch (for pick_rate)
  const totalGames = await prisma.playerMatch.count({ where: { patch } });

  const unitData = await prisma.matchUnit.findMany({
    where: { player_match: { patch } },
    select: {
      character_id: true,
      tier: true,
      player_match: { select: { placement: true, win: true } },
    },
  });

  const map = new Map<string, {
    count: number;
    placements: number[];
    wins: number;
    top4s: number;
    totalStar: number;
  }>();

  for (const row of unitData) {
    const entry = map.get(row.character_id) || { count: 0, placements: [], wins: 0, top4s: 0, totalStar: 0 };
    const p = row.player_match.placement;
    entry.count++;
    entry.placements.push(p);
    if (p === 1) entry.wins++;
    if (p <= 4) entry.top4s++;
    entry.totalStar += row.tier;
    map.set(row.character_id, entry);
  }

  for (const [champId, data] of map) {
    if (data.count < 5) continue; // skip low-sample champions
    const avg = data.placements.reduce((a, b) => a + b, 0) / data.count;
    await prisma.championStat.upsert({
      where: { champion_id_patch: { champion_id: champId, patch } },
      update: {
        games: data.count,
        pick_rate: totalGames > 0 ? Math.round((data.count / totalGames) * 10000) / 100 : 0,
        avg_placement: Math.round(avg * 100) / 100,
        top4_rate: Math.round((data.top4s / data.count) * 10000) / 100,
        win_rate: Math.round((data.wins / data.count) * 10000) / 100,
        avg_star: Math.round((data.totalStar / data.count) * 10) / 10,
      },
      create: {
        champion_id: champId,
        patch,
        games: data.count,
        pick_rate: totalGames > 0 ? Math.round((data.count / totalGames) * 10000) / 100 : 0,
        avg_placement: Math.round(avg * 100) / 100,
        top4_rate: Math.round((data.top4s / data.count) * 10000) / 100,
        win_rate: Math.round((data.wins / data.count) * 10000) / 100,
        avg_star: Math.round((data.totalStar / data.count) * 10) / 10,
      },
    });
  }
  console.log(`[aggregate] champion_stats: ${map.size} champions for patch ${patch}`);
}

// ── Item-Champion Synergy Stats ──────────────────────────────────────

async function aggregateItemChampionStats(patch: string) {
  const unitData = await prisma.matchUnit.findMany({
    where: { player_match: { patch } },
    select: {
      character_id: true,
      item_names: true,
      player_match: { select: { placement: true, win: true } },
    },
  });

  // Key = "item|champion"
  const map = new Map<string, {
    item_name: string;
    champion_id: string;
    count: number;
    placements: number[];
    wins: number;
    top4s: number;
  }>();

  for (const row of unitData) {
    for (const item of row.item_names) {
      if (!item) continue;
      const key = `${item}|${row.character_id}`;
      const entry = map.get(key) || {
        item_name: item,
        champion_id: row.character_id,
        count: 0,
        placements: [],
        wins: 0,
        top4s: 0,
      };
      const p = row.player_match.placement;
      entry.count++;
      entry.placements.push(p);
      if (p === 1) entry.wins++;
      if (p <= 4) entry.top4s++;
      map.set(key, entry);
    }
  }

  for (const [, data] of map) {
    if (data.count < 3) continue; // skip low-sample pairs
    const avg = data.placements.reduce((a, b) => a + b, 0) / data.count;
    await prisma.itemChampionStat.upsert({
      where: {
        item_name_champion_id_patch: {
          item_name: data.item_name,
          champion_id: data.champion_id,
          patch,
        },
      },
      update: {
        games: data.count,
        avg_placement: Math.round(avg * 100) / 100,
        top4_rate: Math.round((data.top4s / data.count) * 10000) / 100,
        win_rate: Math.round((data.wins / data.count) * 10000) / 100,
      },
      create: {
        item_name: data.item_name,
        champion_id: data.champion_id,
        patch,
        games: data.count,
        avg_placement: Math.round(avg * 100) / 100,
        top4_rate: Math.round((data.top4s / data.count) * 10000) / 100,
        win_rate: Math.round((data.wins / data.count) * 10000) / 100,
      },
    });
  }
  console.log(`[aggregate] item_champion_stats: ${map.size} item-champ pairs for patch ${patch}`);
}
