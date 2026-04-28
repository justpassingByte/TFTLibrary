import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the backend `.env` file instead of frontend `.env.local`
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Config ────────────────────────────────────────────────────────────────────
const RIOT_API_KEY    = process.env.RIOT_API_KEY;
const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY;
const PIPELINE_JOB_ID = process.env.PIPELINE_JOB_ID;
const TFT_SET_NUMBER  = parseInt(process.env.TFT_SET_NUMBER || '16', 10);

const REGIONS    = (process.env.PIPELINE_REGIONS    || 'na1,euw1,vn2').split(',');
const QUEUE_IDS  = (process.env.PIPELINE_QUEUE_IDS  || '1100,1130').split(',').map(Number);
const MAX_MATCHES = parseInt(process.env.PIPELINE_MAX_MATCHES || '20', 10);
const MAX_PLAYERS = parseInt(process.env.PIPELINE_MAX_PLAYERS || '0', 10); // 0 = no limit

if (!RIOT_API_KEY)  { console.error('[pipeline] RIOT_API_KEY is required'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('[pipeline] Supabase credentials required'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Region router mapping (platform → continental routing)
const REGION_ROUTER = { na1: 'americas', euw1: 'europe', kr: 'asia', vn2: 'sea', sg2: 'sea', jp1: 'asia' };
let loggedMissingAugments = false;

// ── Rate limiter ─────────────────────────────────────────────────────────────
const lastRequestTime = {};
let isDevKey = process.env.RIOT_API_KEY?.startsWith('RGAPI-');

async function riotFetch(url, region) {
  const router = REGION_ROUTER[region] || 'americas';
  const bucket = router;
  
  // Dev keys (RGAPI-...) have 100 req / 2 min (1.2s per req)
  // Prod keys have higher limits so we can use 40ms base.
  const baseWait = isDevKey ? 1220 : 40;
  
  let now = Date.now();
  const last = lastRequestTime[bucket] || 0;
  const wait = Math.max(0, baseWait - (now - last));
  if (wait > 0) await sleep(wait);
  lastRequestTime[bucket] = Date.now();

  const res = await fetch(url, { headers: { 'X-Riot-Token': RIOT_API_KEY } });
  
  // Inspect actual limits in case our Dev/Prod guess is wrong
  const appLimit = res.headers.get('X-App-Rate-Limit');
  if (appLimit && appLimit.includes('100:120')) isDevKey = true;

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10) * 1000;
    console.warn(`[pipeline] Rate limited on ${url.split('/').slice(-1)[0]} — retrying in ${retryAfter}ms`);
    await sleep(retryAfter + 500);
    return riotFetch(url, region);
  }
  
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Patch Schedule (date-based detection) ─────────────────────────────────────
// Riot's game_version field in Match API often lags behind actual patch deploy.
// We use official patch release dates to correctly assign the patch.
// Dates are in UTC — patches typically deploy in the early morning.
const PATCH_SCHEDULE = [
  { patch: '16.8', date: new Date('2026-03-31T12:00:00Z') },
  { patch: '16.7', date: new Date('2026-03-17T12:00:00Z') },
  { patch: '16.6', date: new Date('2026-03-03T12:00:00Z') },
  { patch: '16.5', date: new Date('2026-02-18T12:00:00Z') },
  { patch: '16.4', date: new Date('2026-02-04T12:00:00Z') },
  { patch: '16.3', date: new Date('2026-01-21T12:00:00Z') },
  { patch: '16.2', date: new Date('2026-01-07T12:00:00Z') },
  { patch: '16.1', date: new Date('2025-12-02T12:00:00Z') },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseApiPatch(game_version) {
  const m = game_version?.match(/Version\s+(\d+\.\d+)/);
  return m ? m[1] : null;
}

function comparePatchVersions(a, b) {
  const [aMajor = 0, aMinor = 0] = String(a).split('.').map(Number);
  const [bMajor = 0, bMinor = 0] = String(b).split('.').map(Number);
  if (aMajor !== bMajor) return aMajor - bMajor;
  return aMinor - bMinor;
}

function extractPatch(game_version, game_datetime_ms) {
  const apiPatch = parseApiPatch(game_version);
  let schedulePatch = null;

  // Date schedule helps when Riot's game_version lags, but never downgrade
  // below the API patch when our local schedule is stale.
  if (game_datetime_ms) {
    const gameDate = new Date(game_datetime_ms);
    for (const entry of PATCH_SCHEDULE) {
      if (gameDate >= entry.date) {
        schedulePatch = entry.patch;
        break;
      }
    }
  }

  if (apiPatch && schedulePatch) {
    return comparePatchVersions(schedulePatch, apiPatch) > 0 ? schedulePatch : apiPatch;
  }

  return apiPatch || schedulePatch || 'unknown';
}

function buildCompSignature(units) {
  return [...units]
    .sort((a, b) => b.rarity - a.rarity || a.character_id.localeCompare(b.character_id))
    .slice(0, 6)
    .map(u => u.character_id)
    .sort()
    .join('|');
}

// ── Step 1: Seed PUUIDs from ladder ──────────────────────────────────────────
async function seedPuuids() {
  const puuidsMap = new Map(); // deduplicate by puuid
  let total = 0;

  for (const region of REGIONS) {
    console.log(`[pipeline] Seeding ladder: ${region}`);

    // Try Apex tiers first
    for (const tier of ['challenger', 'grandmaster', 'master']) {
      try {
        const url = `https://${region}.api.riotgames.com/tft/league/v1/${tier}?queue=RANKED_TFT`;
        const data = await riotFetch(url, region);
        const entries = data.entries || [];
        entries.forEach(e => {
          if (e.puuid && !puuidsMap.has(e.puuid)) {
            puuidsMap.set(e.puuid, { puuid: e.puuid, region });
          }
        });
        console.log(`[pipeline]   ${tier} (${region}): ${entries.length} entries`);
        total += entries.length;
      } catch (err) {
        console.warn(`[pipeline]   Skipped apex ${tier} ${region}: ${err.message}`);
      }
      await sleep(600); 
    }

    // Fallback logic: If start of new Set and master+ is empty, dig down 
    if (total === 0) {
      console.log(`[pipeline]   Apex tiers empty! Fallback to Diamond/Emerald/Platinum...`);
      const fallbackTiers = ['DIAMOND', 'EMERALD', 'PLATINUM', 'GOLD'];
      for (const t of fallbackTiers) {
        if (total > 0) break; // found some
        try {
          const url = `https://${region}.api.riotgames.com/tft/league/v1/entries/${t}/I?queue=RANKED_TFT`;
          const entries = await riotFetch(url, region);
          (entries || []).forEach(e => {
            if (e.puuid && !puuidsMap.has(e.puuid)) {
              puuidsMap.set(e.puuid, { puuid: e.puuid, region });
            }
          });
          console.log(`[pipeline]   ${t} I (${region}): ${(entries||[]).length} entries`);
          total += (entries||[]).length;
        } catch (err) {
          console.warn(`[pipeline]   Skipped fallback ${t} ${region}: ${err.message}`);
        }
        await sleep(600);
      }
    }
  }

  let results = Array.from(puuidsMap.values());
  console.log(`[pipeline] Total unique PUUIDs: ${results.length} (from ${total} ladder entries)`);
  
  if (MAX_PLAYERS > 0 && results.length > MAX_PLAYERS) {
    console.log(`[pipeline] Sampling ${MAX_PLAYERS} players from ${results.length} total.`);
    results = results.slice(0, MAX_PLAYERS);
  }
  
  return results;
}

// ── Step 2: Collect new match IDs ─────────────────────────────────────────────
async function collectMatchIds(puuids) {
  // Find startTime from last successful pipeline job
  const { data: lastJob } = await supabase
    .from('sync_jobs')
    .select('finished_at')
    .eq('job_type', 'pipeline')
    .eq('status', 'completed')
    .order('finished_at', { ascending: false })
    .limit(1)
    .single();

  const startTime = undefined; // Force fetch last MAX_MATCHES

  if (startTime) {
    console.log(`[pipeline] Fetching matches since ${new Date(startTime * 1000).toISOString()}`);
  } else {
    console.log(`[pipeline] No previous run — fetching last ${MAX_MATCHES} matches per player`);
  }

  // Fetch complete match IDs from DB so we can skip them. A match row without
  // player_matches is incomplete and must be reprocessed.
  const { data: existingRows } = await supabase
    .from('player_matches')
    .select('match_id');
  const existingIds = new Set((existingRows || []).map(r => r.match_id));
  console.log(`[pipeline] ${existingIds.size} completed matches already in DB`);

  const { data: targetMatches } = await supabase
    .from('matches')
    .select('match_id')
    .eq('tft_set_number', TFT_SET_NUMBER);
  const incompleteIds = (targetMatches || [])
    .map(r => r.match_id)
    .filter(id => !existingIds.has(id));
  if (incompleteIds.length > 0) {
    console.log(`[pipeline] Found ${incompleteIds.length} incomplete Set ${TFT_SET_NUMBER} matches to reprocess`);
  }

  const newMatchIds = new Set(incompleteIds);
  let processed = 0;

  for (const player of puuids) {
    const region = player.region;
    const puuid = player.puuid;
    const router = REGION_ROUTER[region] || 'americas';

    try {
      const params = new URLSearchParams({
        count: String(MAX_MATCHES),
        ...(startTime ? { startTime: String(startTime) } : {}),
      });
      const url = `https://${router}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?${params}`;
      const ids = await riotFetch(url, region);
      for (const id of ids) {
        if (!existingIds.has(id)) newMatchIds.add(id);
      }
    } catch (err) {
      console.warn(`[pipeline] Skipped PUUID ${puuid.slice(0, 8)}…: ${err.message}`);
    }

    processed++;
    if (processed % 5 === 0) {
      console.log(`[pipeline] Match ID collection: ${processed}/${puuids.length} players | ${newMatchIds.size} new IDs`);
    }
  }

  const ids = [...newMatchIds];
  console.log(`[pipeline] Total new match IDs to fetch: ${ids.length}`);
  return ids;
}

// ── Step 3: Fetch + process match details ─────────────────────────────────────
async function ingestMatches(matchIds) {
  const RANKED_QUEUE_IDS = new Set(QUEUE_IDS);
  let ingested = 0;
  let skipped = 0;
  let errors = 0;
  const seenPatches = new Set();

  for (let i = 0; i < matchIds.length; i++) {
    const matchId = matchIds[i];
    // Detect region from match ID prefix (e.g. NA1_xxx, EUW1_xxx)
    const regionPrefix = matchId.split('_')[0].toLowerCase();
    const region = REGIONS.find(r => r.toLowerCase().startsWith(regionPrefix.slice(0, 2))) || REGIONS[0];
    const router = REGION_ROUTER[region] || 'americas';

    try {
      const url = `https://${router}.api.riotgames.com/tft/match/v1/matches/${matchId}`;
      const match = await riotFetch(url, region);
      const info = match.info;

      // Filter: only ranked queues for target set
      if (!RANKED_QUEUE_IDS.has(info.queue_id)) {
        const QUEUE_MAP = {
          1090: 'Normal',
          1100: 'Ranked',
          1110: 'Tutorial',
          1130: 'Hyper Roll',
          1150: 'Double Up (Old)',
          1160: 'Double Up',
          1210: 'Choncc\'s Treasure'
        };
        const modeName = QUEUE_MAP[info.queue_id] || `Unknown Mode (${info.queue_id})`;
        const expected = Array.from(RANKED_QUEUE_IDS).map(id => QUEUE_MAP[id] || id).join(', ');
        console.log(`[pipeline] Skipped match: Wrong Queue - Played ${modeName}, but we only want ${expected}`);
        skipped++; continue; 
      }
      if (info.tft_set_number !== TFT_SET_NUMBER) { 
        console.log(`[pipeline] Skipped match: Wrong Set - This match is Set ${info.tft_set_number}, but we are pulling Set ${TFT_SET_NUMBER}`);
        skipped++; continue; 
      }

      const apiPatch = parseApiPatch(info.game_version) || '?';
      const patch = extractPatch(info.game_version, info.game_datetime);
      if (patch !== apiPatch && !seenPatches.has(`override-${patch}`)) {
        seenPatches.add(`override-${patch}`);
        console.log(`[pipeline] 📅 Date-based patch override: API says ${apiPatch}, but match date says ${patch}`);
      }
      if (!seenPatches.has(patch)) {
        seenPatches.add(patch);
        console.log(`[pipeline] 🎯 Detected match from patch: ${patch}`);
      }

      // Insert match row
      const { error: matchErr } = await supabase.from('matches').upsert({
        match_id:      matchId,
        region,
        patch,
        queue_id:      info.queue_id,
        tft_set_number: info.tft_set_number,
        game_datetime: new Date(info.game_datetime).toISOString(),
        game_length:   info.game_length,
      }, { onConflict: 'match_id', ignoreDuplicates: true });

      if (matchErr) { console.error(`[pipeline] Match insert error: ${matchErr.message}`); errors++; continue; }

      // Process all 8 participants
      for (const p of info.participants) {
        const compSig = buildCompSignature(p.units || []);

        const playerPayload = {
          id:                 randomUUID(),
          match_id:           matchId,
          puuid:              p.puuid,
          riot_id_name:       p.riotIdGameName || null,
          riot_id_tag:        p.riotIdTagline || null,
          placement:          p.placement ?? 0,
          level:              p.level ?? 0,
          gold_left:          p.gold_left ?? 0,
          last_round:         p.last_round ?? 0,
          total_damage:       p.total_damage_to_players ?? 0,
          time_eliminated:    p.time_eliminated ?? 0,
          players_eliminated: p.players_eliminated ?? 0,
          win:                p.win ?? p.placement === 1,
          patch,
          comp_signature:     compSig,
        };

        let { data: pm, error: pmErr } = await supabase
          .from('player_matches')
          .insert(playerPayload)
          .select('id')
          .single();

        if (pmErr?.code === '23505') {
          const { id, ...playerUpdate } = playerPayload;
          const updateResult = await supabase
            .from('player_matches')
            .update(playerUpdate)
            .eq('match_id', matchId)
            .eq('puuid', p.puuid)
            .select('id')
            .single();
          pm = updateResult.data;
          pmErr = updateResult.error;
        }

        if (pmErr || !pm) {
          console.error(`[pipeline] Player insert error for ${matchId}/${p.puuid?.slice(0, 8) || 'unknown'}: ${pmErr?.message || 'no row returned'}`);
          errors++;
          continue;
        }
        const pmId = pm.id;

        await Promise.all([
          supabase.from('match_units').delete().eq('player_match_id', pmId),
          supabase.from('match_traits').delete().eq('player_match_id', pmId),
          supabase.from('match_augments').delete().eq('player_match_id', pmId),
        ]);

        // Units
        if (p.units?.length) {
          const { error: unitsErr } = await supabase.from('match_units').insert(
            p.units.map(u => ({
              id:              randomUUID(),
              player_match_id: pmId,
              character_id:    u.character_id,
              tier:            u.tier,
              rarity:          u.rarity,
              item_names:      u.itemNames || [],
            }))
          );
          if (unitsErr) console.error(`[pipeline] Unit insert error for ${matchId}: ${unitsErr.message}`);
        }

        // Active traits (style > 0)
        const activeTraits = (p.traits || []).filter(t => t.style > 0);
        if (activeTraits.length) {
          const { error: traitsErr } = await supabase.from('match_traits').insert(
            activeTraits.map(t => ({
              id:              randomUUID(),
              player_match_id: pmId,
              trait_name:      t.name,
              num_units:       t.num_units,
              tier_current:    t.tier_current,
              style:           t.style,
            }))
          );
          if (traitsErr) console.error(`[pipeline] Trait insert error for ${matchId}: ${traitsErr.message}`);
        }

        // Augments are optional in some Riot TFT payloads/sets.
        const augments = p.augments || [];
        if (augments.length) {
          const { error: augmentsErr } = await supabase.from('match_augments').insert(
            augments.map(a => ({ id: randomUUID(), player_match_id: pmId, augment_id: a }))
          );
          if (augmentsErr) console.error(`[pipeline] Augment insert error for ${matchId}: ${augmentsErr.message}`);
        } else if (!loggedMissingAugments && !('augments' in p)) {
          loggedMissingAugments = true;
          console.log('[pipeline] No augments field found in Riot participant payload — skipping augment ingestion for this run');
          console.log('[pipeline] Participant keys:', Object.keys(p).join(', '));
        }
      }

      ingested++;
      if (ingested % 50 === 0) {
        console.log(`[pipeline] Ingested ${ingested}/${matchIds.length} matches (${errors} errors, ${skipped} skipped)`);
      }

    } catch (err) {
      console.error(`[pipeline] Error on match ${matchId}: ${err.message}`);
      errors++;
    }
  }

  console.log(`[pipeline] Ingestion complete — ${ingested} ingested, ${skipped} skipped, ${errors} errors`);
  return ingested;
}

// ── Step 4: Aggregate stats ───────────────────────────────────────────────────
async function aggregateStats() {
  console.log('[pipeline] Running aggregation queries...');

  // Get distinct patches from recent player_matches
  const { data: patches } = await supabase
    .from('player_matches')
    .select('patch')
    .order('patch', { ascending: false })
    .limit(1000);

  const distinctPatches = [...new Set((patches || []).map(p => p.patch))];
  console.log(`[pipeline] Aggregating ${distinctPatches.length} patch(es): ${distinctPatches.join(', ')}`);

  for (const patch of distinctPatches) {
    await supabase.rpc('aggregate_comp_stats', { target_patch: patch });
    await supabase.rpc('aggregate_augment_stats', { target_patch: patch });
    await supabase.rpc('aggregate_item_stats', { target_patch: patch });
    await supabase.rpc('aggregate_trait_stats', { target_patch: patch });
    console.log(`[pipeline] Aggregated patch ${patch}`);
  }

  console.log('[pipeline] Aggregation done.');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[pipeline] Starting Riot match ingestion pipeline`);
  console.log(`[pipeline] Regions: ${REGIONS.join(', ')} | Queues: ${QUEUE_IDS.join(', ')} | Max matches/player: ${MAX_MATCHES}`);

  const puuids   = await seedPuuids();
  const matchIds = await collectMatchIds(puuids);

  if (matchIds.length === 0) {
    console.log('[pipeline] No new matches to ingest. Done.');
    if (PIPELINE_JOB_ID) {
      await supabase.from('sync_jobs').update({
        status: 'completed', finished_at: new Date().toISOString(),
        log_output: 'No new matches.'
      }).eq('id', PIPELINE_JOB_ID);
    }
    return;
  }

  const ingested = await ingestMatches(matchIds);
  await aggregateStats();

  if (PIPELINE_JOB_ID) {
    await supabase.from('sync_jobs').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      champion_count: ingested, // repurposing field as match count
    }).eq('id', PIPELINE_JOB_ID);
  }

  console.log(`[pipeline] Pipeline complete. ${ingested} matches ingested.`);
}

main().catch(async (err) => {
  console.error('[pipeline] Fatal error:', err.message);
  console.error(err.stack);
  if (PIPELINE_JOB_ID) {
    await supabase.from('sync_jobs').update({
      status: 'error', finished_at: new Date().toISOString(),
    }).eq('id', PIPELINE_JOB_ID);
  }
  process.exit(1);
});
