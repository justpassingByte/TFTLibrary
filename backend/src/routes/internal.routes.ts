import { Router } from 'express';
import prisma from '../lib/prisma';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const RIOT_API_KEY = process.env.RIOT_API_KEY;

// Platform → Continental routing mapping (official Riot docs)
// AMERICAS: NA, BR, LAN, LAS
// ASIA: KR, JP
// EUROPE: EUNE, EUW, TR, ME1, RU
// SEA: OCE, SG2, TW2, VN2
const REGION_ROUTER: Record<string, string> = {
  // Platform identifiers → continental routing
  na1: 'americas', br1: 'americas', la1: 'americas', la2: 'americas',
  kr: 'asia', jp1: 'asia',
  eun1: 'europe', euw1: 'europe', tr1: 'europe', me1: 'europe', ru: 'europe',
  oc1: 'sea', sg2: 'sea', tw2: 'sea', vn2: 'sea',
  // Allow passing continental routing values directly
  americas: 'americas', asia: 'asia', europe: 'europe', sea: 'sea',
};

// Rate limiters
// Match IDs endpoint: 600 requests / 10 seconds
// Match detail endpoint: 250 requests / 10 seconds
// Dev keys (RGAPI-...): 100 req / 2 min = ~1.2s per req
let isDevKey = RIOT_API_KEY?.startsWith('RGAPI-');
const lastRequestTime: Record<string, number> = {};

async function riotFetch(url: string, routerRegion: string, isDetailEndpoint = false) {
  // Dev keys are very restrictive regardless of endpoint
  // Prod keys: use endpoint-specific limits
  const baseWait = isDevKey ? 1220 : (isDetailEndpoint ? 40 : 17); // 250/10s detail, 600/10s IDs
  const bucket = routerRegion;
  const now = Date.now();
  const last = lastRequestTime[bucket] || 0;
  const wait = Math.max(0, baseWait - (now - last));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime[bucket] = Date.now();

  const res = await fetch(url, { headers: { 'X-Riot-Token': RIOT_API_KEY! } });

  // Inspect actual limits
  const appLimit = res.headers.get('X-App-Rate-Limit');
  if (appLimit && appLimit.includes('100:120')) isDevKey = true;

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10) * 1000;
    console.warn(`[internal] Rate limited — retrying in ${retryAfter}ms`);
    await new Promise(r => setTimeout(r, retryAfter + 500));
    return riotFetch(url, routerRegion);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Riot API ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

// ══════════════════════════════════════════════════════════════
// POST /api/internal/match/fetch-latest
// 
// Finds the latest TFT match for given PUUIDs, enriches with
// game asset icons from Grimoire's database.
//
// Body: {
//   puuids: string[],       // 1-2 PUUIDs to poll
//   region?: string,        // default 'sea'
//   startTime?: number,     // epoch seconds
//   endTime?: number,       // epoch seconds
//   count?: number,         // max match IDs to fetch (default 5)
//   allPuuids?: string[],   // all lobby participants (to verify match)
// }
// ══════════════════════════════════════════════════════════════

router.post('/match/fetch-latest', async (req, res) => {
  try {
    if (!RIOT_API_KEY) {
      return res.status(500).json({ success: false, error: 'Riot API key not configured on Grimoire' });
    }

    const {
      puuids,
      region,
      startTime,
      endTime,
      count = 5,
      allPuuids,
      matchId,
    } = req.body;

    if (!region) {
      return res.status(400).json({ success: false, error: 'region is required (e.g. vn2, sg2, na1, kr, euw1)' });
    }

    const routerRegion = REGION_ROUTER[region.toLowerCase()];
    if (!routerRegion) {
      return res.status(400).json({ success: false, error: `Unknown region '${region}'. Valid: ${Object.keys(REGION_ROUTER).join(', ')}` });
    }

    let matchData: any = null;
    let matchedId: string | null = null;
    let matchIds: string[] = [];

    if (matchId) {
      // Step 1: Fetch match directly if matchId is provided
      console.log(`[internal] Fetching specific match ID ${matchId} from ${routerRegion}`);
      try {
        const matchUrl = `https://${routerRegion}.api.riotgames.com/tft/match/v1/matches/${matchId}`;
        matchData = await riotFetch(matchUrl, routerRegion, true);
        matchedId = matchId;
      } catch (err: any) {
        return res.status(404).json({ success: false, message: `Failed to fetch match ${matchId}: ${err.message}` });
      }
    } else {
      // Step 1: Fetch recent match IDs for the polling PUUID
      if (!puuids || !Array.isArray(puuids) || puuids.length === 0) {
        return res.status(400).json({ success: false, error: 'puuids array is required when matchId is not provided' });
      }

      const pollingPuuid = puuids[0]; 
      let matchIdsUrl = `https://${routerRegion}.api.riotgames.com/tft/match/v1/matches/by-puuid/${pollingPuuid}/ids?count=${count}`;
      if (startTime) matchIdsUrl += `&startTime=${startTime}`;
      if (endTime) matchIdsUrl += `&endTime=${endTime}`;

      console.log(`[internal] Fetching match IDs for ${pollingPuuid.substring(0, 12)}... from ${routerRegion}`);
      matchIds = await riotFetch(matchIdsUrl, routerRegion);

      if (!matchIds || matchIds.length === 0) {
        return res.json({ success: true, match: null, message: 'No matches found for this PUUID' });
      }

      console.log(`[internal] Found ${matchIds.length} match IDs: ${matchIds.join(', ')}`);

      // Step 2: For each match, fetch detail and check if all participants are present
      const verifyPuuids = allPuuids && Array.isArray(allPuuids) && allPuuids.length > 0 ? allPuuids : puuids;

      for (const currentMatchId of matchIds) {
        try {
          const matchUrl = `https://${routerRegion}.api.riotgames.com/tft/match/v1/matches/${currentMatchId}`;
          const data = await riotFetch(matchUrl, routerRegion, true); 
          const participants = data?.info?.participants || [];
          const participantPuuids = participants.map((p: any) => p.puuid);

          // Check if all target PUUIDs are in this match
          const allFound = verifyPuuids.every((targetPuuid: string) =>
            participantPuuids.includes(targetPuuid)
          );

          if (allFound) {
            matchData = data;
            matchedId = currentMatchId;
            console.log(`[internal] Found matching match: ${currentMatchId}`);
            break;
          }
        } catch (err: any) {
          console.warn(`[internal] Failed to fetch match ${currentMatchId}: ${err.message}`);
          continue;
        }
      }

      if (!matchData) {
        return res.json({
          success: true,
          match: null,
          matchIds, 
          message: 'No match found containing all specified participants',
        });
      }
    }

    // Step 3: Enrich with icons from Grimoire's database
    // Load game asset lookup tables
    const [champions, traits, items, augments] = await Promise.all([
      prisma.champion.findMany({ select: { id: true, name: true, icon: true, cost: true } }),
      prisma.trait.findMany({ select: { id: true, name: true, icon: true } }),
      prisma.item.findMany({ select: { id: true, name: true, icon: true } }),
      prisma.augment.findMany({ select: { id: true, name: true, icon: true } }),
    ]);

    const champMap = new Map(champions.map(c => [c.id, c]));
    const traitMap = new Map(traits.map(t => [t.name, t])); // Riot uses trait name, not ID
    // Also map by ID for fallback
    const traitIdMap = new Map(traits.map(t => [t.id, t]));
    const itemMap = new Map(items.map(i => [i.id, i]));
    // Also map by name for items
    const itemNameMap = new Map(items.map(i => [i.name, i]));
    const augmentMap = new Map(augments.map(a => [a.id, a]));

    const getIconUrl = (iconPath: string | null) => {
      if (!iconPath) return '';
      if (iconPath.startsWith('http')) return iconPath;
      return `https://raw.communitydragon.org/latest/game/${iconPath}`;
    };

    // Step 4: Build enriched response
    const info = matchData.info;
    const enrichedParticipants = info.participants.map((p: any) => {
      // Enrich traits
      const enrichedTraits = (p.traits || [])
        .filter((t: any) => t.style > 0) // Only active traits
        .sort((a: any, b: any) => b.style - a.style || b.tier_current - a.tier_current)
        .map((t: any) => {
          const traitData = traitMap.get(t.name) || traitIdMap.get(t.name);
          return {
            name: t.name,
            displayName: traitData?.name || t.name.split('_').pop() || t.name,
            numUnits: t.num_units,
            style: t.style,
            tierCurrent: t.tier_current,
            tierTotal: t.tier_total,
            iconUrl: getIconUrl(traitData?.icon || null),
          };
        });

      // Enrich units
      const enrichedUnits = (p.units || [])
        .sort((a: any, b: any) => b.tier - a.tier)
        .map((u: any) => {
          const champData = champMap.get(u.character_id);
          return {
            characterId: u.character_id,
            name: champData?.name || u.character_id.split('_').pop() || u.character_id,
            tier: u.tier,
            rarity: u.rarity,
            cost: champData?.cost || 0,
            iconUrl: getIconUrl(champData?.icon || null),
            items: (u.itemNames || []).filter((i: string) => i !== 'TFT_Item_EmptyBag').map((itemId: string) => {
              const itemData = itemMap.get(itemId) || itemNameMap.get(itemId);
              return {
                id: itemId,
                name: itemData?.name || itemId.replace(/^TFT\d*_Item_/, ''),
                iconUrl: getIconUrl(itemData?.icon || null),
              };
            }),
          };
        });

      // Enrich augments
      const enrichedAugments = (p.augments || []).map((augId: string) => {
        const augData = augmentMap.get(augId);
        return {
          id: augId,
          name: augData?.name || augId.replace(/^TFT\d*_Augment_/, ''),
          iconUrl: getIconUrl(augData?.icon || null),
        };
      });

      return {
        puuid: p.puuid,
        placement: p.placement,
        level: p.level,
        goldLeft: p.gold_left,
        lastRound: p.last_round,
        timeEliminated: p.time_eliminated,
        playersEliminated: p.players_eliminated,
        totalDamage: p.total_damage_to_players,
        gameName: p.riotIdGameName || '',
        tagLine: p.riotIdTagline || '',
        traits: enrichedTraits,
        units: enrichedUnits,
        augments: enrichedAugments,
      };
    });

    // Sort by placement
    enrichedParticipants.sort((a: any, b: any) => a.placement - b.placement);

    const response = {
      success: true,
      match: {
        matchId: matchedId,
        gameCreation: info.game_datetime,
        gameDuration: info.game_length,
        gameVersion: info.game_version,
        queueId: info.queue_id,
        tftSetNumber: info.tft_set_number,
        participants: enrichedParticipants,
      },
    };

    console.log(`[internal] Returning enriched match ${matchedId} with ${enrichedParticipants.length} participants`);
    res.json(response);

  } catch (error: any) {
    console.error('[internal] Error in /match/fetch-latest:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/internal/summoner/puuid
// 
// Retrieves a player's PUUID by using their Riot ID.
//
// Body: {
//   gameName: string,      
//   tagLine: string,       
//   region: string,        // e.g. vn2, sg2, etc. (uses REGION_ROUTER inside)
// }
// ══════════════════════════════════════════════════════════════

router.post('/summoner/puuid', async (req, res) => {
  try {
    if (!RIOT_API_KEY) {
      return res.status(500).json({ success: false, error: 'Riot API key not configured on Grimoire' });
    }

    const { gameName, tagLine, region } = req.body;

    if (!gameName || !tagLine || !region) {
      return res.status(400).json({ success: false, error: 'gameName, tagLine, and region are required' });
    }

    // Default to 'sea' if region maps to undefined
    const routerRegion = REGION_ROUTER[region.toLowerCase()] || 'sea';

    const cleanedTagLine = tagLine.startsWith('#') ? tagLine.substring(1) : tagLine;
    const url = `https://${routerRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(cleanedTagLine)}`;

    const response = await riotFetch(url, routerRegion);

    if (response && response.puuid) {
      res.json({ success: true, puuid: response.puuid });
    } else {
      res.status(404).json({ success: false, error: 'PUUID not found in response' });
    }

  } catch (error: any) {
    console.error('[internal] Error in /summoner/puuid:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/internal/riot/match
// 
// Proxies raw Riot Match data for backward compatibility with TesTicTour.
// ══════════════════════════════════════════════════════════════

router.post('/riot/match', async (req, res) => {
  try {
    if (!RIOT_API_KEY) {
      return res.status(500).json({ success: false, error: 'Riot API key not configured on Grimoire' });
    }

    const { matchId, region } = req.body;

    if (!matchId || !region) {
      return res.status(400).json({ success: false, error: 'matchId and region are required' });
    }

    const routerRegion = REGION_ROUTER[region.toLowerCase()] || 'sea';
    const matchUrl = `https://${routerRegion}.api.riotgames.com/tft/match/v1/matches/${matchId}`;

    const data = await riotFetch(matchUrl, routerRegion, true);
    
    res.json({ success: true, data });

  } catch (error: any) {
    console.error('[internal] Error in /riot/match:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/internal/match/validate
//
// Validates whether a Riot match belongs to a tournament lobby.
// This is the single source of truth for match validation.
//
// Body: {
//   lobbyId?: string,            // optional — for context logging
//   puuids: string[],            // CURRENT active lobby participants
//   lobbyStartTime: number,      // epoch seconds when lobby entered PLAYING
//   region: string,              // e.g. 'vn2', 'sg2'
//   candidateMatchId?: string,   // optional: validate a specific match ID
// }
//
// Returns: { status: 'valid' | 'invalid' | 'pending', matchId?, placements?, reason?, enrichedMatch? }
// ══════════════════════════════════════════════════════════════

router.post('/match/validate', async (req, res) => {
  try {
    if (!RIOT_API_KEY) {
      return res.status(500).json({ success: false, error: 'Riot API key not configured on Grimoire' });
    }

    const { lobbyId, puuids, lobbyStartTime, region, candidateMatchId } = req.body;

    if (!puuids || !Array.isArray(puuids) || puuids.length === 0) {
      return res.status(400).json({ status: 'invalid', reason: 'puuids array is required' });
    }
    if (typeof lobbyStartTime !== 'number') {
      return res.status(400).json({ status: 'invalid', reason: 'lobbyStartTime (epoch seconds) is required' });
    }
    if (!region) {
      return res.status(400).json({ status: 'invalid', reason: 'region is required' });
    }

    const routerRegion = REGION_ROUTER[region.toLowerCase()];
    if (!routerRegion) {
      return res.status(400).json({ status: 'invalid', reason: `Unknown region '${region}'` });
    }

    // Configurable allowed queue IDs (default: 1090 = TFT Ranked)
    let allowedQueueIds: number[] = [1090];
    try {
      const setting = await prisma.platformSetting.findUnique({ where: { key: 'tft_allowed_queue_ids' } });
      if (setting?.value) {
        allowedQueueIds = setting.value.split(',').map((s: string) => parseInt(s.trim(), 10)).filter(Boolean);
      }
    } catch (_) {
      // PlatformSetting table may not exist yet — use default
    }

    // Dynamic overlap threshold: max(4, ceil(puuids.length * 0.75))
    const dynamicThreshold = Math.max(4, Math.ceil(puuids.length * 0.75));
    const lobbyStartTimeMs = lobbyStartTime * 1000; // convert to milliseconds

    console.log(`[validate] lobbyId=${lobbyId || 'n/a'}, region=${region}->${routerRegion}, players=${puuids.length}, threshold=${dynamicThreshold}, allowedQueues=${allowedQueueIds.join(',')}`);

    let matchData: any = null;
    let matchedId: string | null = null;

    if (candidateMatchId) {
      // Validate a specific match ID
      try {
        const matchUrl = `https://${routerRegion}.api.riotgames.com/tft/match/v1/matches/${candidateMatchId}`;
        matchData = await riotFetch(matchUrl, routerRegion, true);
        matchedId = candidateMatchId;
      } catch (err: any) {
        console.warn(`[validate] Failed to fetch candidate match ${candidateMatchId}: ${err.message}`);
        return res.json({ status: 'pending', reason: `Could not fetch match ${candidateMatchId}: ${err.message}` });
      }
    } else {
      // Poll recent match IDs for puuids[0]
      const pollingPuuid = puuids[0];
      const matchIdsUrl = `https://${routerRegion}.api.riotgames.com/tft/match/v1/matches/by-puuid/${pollingPuuid}/ids?count=10&startTime=${Math.floor(lobbyStartTime)}`;

      let matchIds: string[] = [];
      try {
        matchIds = await riotFetch(matchIdsUrl, routerRegion);
      } catch (err: any) {
        console.warn(`[validate] Failed to fetch match IDs: ${err.message}`);
        return res.json({ status: 'pending', reason: `Riot API error fetching match IDs: ${err.message}` });
      }

      if (!matchIds || matchIds.length === 0) {
        return res.json({ status: 'pending', reason: 'No recent matches found for polling PUUID' });
      }

      // Try each match until one passes all validation checks
      for (const currentMatchId of matchIds) {
        try {
          const matchUrl = `https://${routerRegion}.api.riotgames.com/tft/match/v1/matches/${currentMatchId}`;
          const data = await riotFetch(matchUrl, routerRegion, true);
          const info = data?.info;

          if (!info) continue;

          // Check queue type
          if (!allowedQueueIds.includes(info.queue_id)) {
            console.log(`[validate] Match ${currentMatchId} rejected: queue_id ${info.queue_id} not in [${allowedQueueIds.join(',')}]`);
            continue;
          }

          // Check timestamp: game must have started after lobbyStartTime
          if (info.game_datetime < lobbyStartTimeMs) {
            console.log(`[validate] Match ${currentMatchId} rejected: game_datetime ${info.game_datetime} < lobbyStartTime ${lobbyStartTimeMs}`);
            continue;
          }

          // Check participant overlap
          const participantPuuids: string[] = (info.participants || []).map((p: any) => p.puuid);
          const overlapCount = puuids.filter((p: string) => participantPuuids.includes(p)).length;

          if (overlapCount < dynamicThreshold) {
            console.log(`[validate] Match ${currentMatchId} rejected: overlap ${overlapCount} < threshold ${dynamicThreshold}`);
            continue;
          }

          // All checks passed!
          matchData = data;
          matchedId = currentMatchId;
          console.log(`[validate] Match ${currentMatchId} VALID — overlap ${overlapCount}/${puuids.length}`);
          break;
        } catch (err: any) {
          console.warn(`[validate] Failed to fetch match ${currentMatchId}: ${err.message}`);
          continue;
        }
      }

      if (!matchData) {
        return res.json({ status: 'pending', reason: 'No valid match found in recent history' });
      }
    }

    // ── At this point, we have a candidate matchData ──
    // Re-validate the candidate (in case it was fetched directly via candidateMatchId)
    const info = matchData.info;

    if (!allowedQueueIds.includes(info.queue_id)) {
      return res.json({ status: 'invalid', reason: `Queue type ${info.queue_id} not allowed (allowed: ${allowedQueueIds.join(',')})` });
    }

    if (info.game_datetime < lobbyStartTimeMs) {
      return res.json({ status: 'invalid', reason: `Match started before lobby (game: ${info.game_datetime}, lobby: ${lobbyStartTimeMs})` });
    }

    const participantPuuids: string[] = (info.participants || []).map((p: any) => p.puuid);
    const overlapCount = puuids.filter((p: string) => participantPuuids.includes(p)).length;
    if (overlapCount < dynamicThreshold) {
      return res.json({ status: 'invalid', reason: `Insufficient overlap: ${overlapCount} of ${puuids.length} players found (threshold: ${dynamicThreshold})` });
    }

    // ── Enrich with icons from Grimoire's database ──
    const [champions, traits, items, augments] = await Promise.all([
      prisma.champion.findMany({ select: { id: true, name: true, icon: true, cost: true } }),
      prisma.trait.findMany({ select: { id: true, name: true, icon: true } }),
      prisma.item.findMany({ select: { id: true, name: true, icon: true } }),
      prisma.augment.findMany({ select: { id: true, name: true, icon: true } }),
    ]);

    const champMap = new Map(champions.map(c => [c.id, c]));
    const traitMap = new Map(traits.map(t => [t.name, t]));
    const traitIdMap = new Map(traits.map(t => [t.id, t]));
    const itemMap = new Map(items.map(i => [i.id, i]));
    const itemNameMap = new Map(items.map(i => [i.name, i]));
    const augmentMap = new Map(augments.map(a => [a.id, a]));

    const getIconUrl = (iconPath: string | null) => {
      if (!iconPath) return '';
      if (iconPath.startsWith('http')) return iconPath;
      return `https://raw.communitydragon.org/latest/game/${iconPath}`;
    };

    const enrichedParticipants = info.participants.map((p: any) => {
      const enrichedTraits = (p.traits || [])
        .filter((t: any) => t.style > 0)
        .sort((a: any, b: any) => b.style - a.style || b.tier_current - a.tier_current)
        .map((t: any) => {
          const traitData = traitMap.get(t.name) || traitIdMap.get(t.name);
          return {
            name: t.name,
            displayName: traitData?.name || t.name.split('_').pop() || t.name,
            numUnits: t.num_units,
            style: t.style,
            tierCurrent: t.tier_current,
            tierTotal: t.tier_total,
            iconUrl: getIconUrl(traitData?.icon || null),
          };
        });

      const enrichedUnits = (p.units || [])
        .sort((a: any, b: any) => b.tier - a.tier)
        .map((u: any) => {
          const champData = champMap.get(u.character_id);
          return {
            characterId: u.character_id,
            name: champData?.name || u.character_id.split('_').pop() || u.character_id,
            tier: u.tier,
            rarity: u.rarity,
            cost: champData?.cost || 0,
            iconUrl: getIconUrl(champData?.icon || null),
            items: (u.itemNames || []).filter((i: string) => i !== 'TFT_Item_EmptyBag').map((itemId: string) => {
              const itemData = itemMap.get(itemId) || itemNameMap.get(itemId);
              return {
                id: itemId,
                name: itemData?.name || itemId.replace(/^TFT\d*_Item_/, ''),
                iconUrl: getIconUrl(itemData?.icon || null),
              };
            }),
          };
        });

      const enrichedAugments = (p.augments || []).map((augId: string) => {
        const augData = augmentMap.get(augId);
        return {
          id: augId,
          name: augData?.name || augId.replace(/^TFT\d*_Augment_/, ''),
          iconUrl: getIconUrl(augData?.icon || null),
        };
      });

      return {
        puuid: p.puuid,
        placement: p.placement,
        level: p.level,
        goldLeft: p.gold_left,
        lastRound: p.last_round,
        timeEliminated: p.time_eliminated,
        playersEliminated: p.players_eliminated,
        totalDamage: p.total_damage_to_players,
        gameName: p.riotIdGameName || '',
        tagLine: p.riotIdTagline || '',
        traits: enrichedTraits,
        units: enrichedUnits,
        augments: enrichedAugments,
      };
    });

    enrichedParticipants.sort((a: any, b: any) => a.placement - b.placement);

    const enrichedMatch = {
      matchId: matchedId,
      gameCreation: info.game_datetime,
      gameDuration: info.game_length,
      gameVersion: info.game_version,
      queueId: info.queue_id,
      tftSetNumber: info.tft_set_number,
      participants: enrichedParticipants,
    };

    console.log(`[validate] Returning valid match ${matchedId} with ${enrichedParticipants.length} participants`);

    return res.json({
      status: 'valid',
      matchId: matchedId,
      placements: enrichedParticipants.map((p: any) => ({ puuid: p.puuid, placement: p.placement })),
      enrichedMatch,
    });

  } catch (error: any) {
    console.error('[validate] Error in /match/validate:', error.message);
    res.status(500).json({ status: 'invalid', reason: error.message });
  }
});

export default router;

