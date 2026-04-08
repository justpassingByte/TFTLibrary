/**
 * sync-unified.mjs — Unified multi-source sync script
 * 
 * Fetches TFT data from CDragon and/or DDragon based on per-entity source config.
 * Admin can mix sources: e.g. Champions+Traits from CDragon, Items+Augments from DDragon.
 *
 * Environment variables:
 *   TFT_SET_PREFIX   — e.g. "TFT16"
 *   DDRAGON_VERSION  — e.g. "16.7.1" (only fetched if any entity uses ddragon)
 *   CDRAGON_SOURCE   — "latest" or "pbe" (only fetched if any entity uses cdragon)
 *   SYNC_SOURCES     — JSON: {"champions":"cdragon","traits":"cdragon","augments":"ddragon","items":"ddragon"}
 *   SYNC_JOB_ID      — job ID for status tracking
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Configuration ───────────────────────────────────────────────────────────
const TFT_SET_PREFIX  = process.env.TFT_SET_PREFIX  || 'TFT16';
const DDRAGON_VERSION = process.env.DDRAGON_VERSION  || '16.7.1';
const CDRAGON_SOURCE  = process.env.CDRAGON_SOURCE   || 'latest';
const SYNC_JOB_ID     = process.env.SYNC_JOB_ID;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Parse per-entity source config
let SOURCES = { champions: 'cdragon', traits: 'cdragon', augments: 'ddragon', items: 'ddragon' };
try {
  if (process.env.SYNC_SOURCES) SOURCES = JSON.parse(process.env.SYNC_SOURCES);
} catch (e) {
  console.warn('[unified] Invalid SYNC_SOURCES JSON, using defaults.');
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[unified] Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const setNumber = TFT_SET_PREFIX.replace('TFT', '');

// ── Determine what to fetch ──────────────────────────────────────────────────
const needCDragon = Object.values(SOURCES).some(s => s === 'cdragon');
const needDDragon = Object.values(SOURCES).some(s => s === 'ddragon');

console.log(`[unified] Starting unified sync`);
console.log(`[unified] Set: ${TFT_SET_PREFIX} | DDragon: ${DDRAGON_VERSION} | CDragon: ${CDRAGON_SOURCE}`);
console.log(`[unified] Sources: Champions=${SOURCES.champions}, Traits=${SOURCES.traits}, Augments=${SOURCES.augments}, Items=${SOURCES.items}`);
console.log(`[unified] Will fetch: ${needCDragon ? 'CDragon' : ''}${needCDragon && needDDragon ? ' + ' : ''}${needDDragon ? 'DDragon' : ''}`);

// ══════════════════════════════════════════════════════════════════════════════
// CDragon helpers (from sync-cdragon.mjs)
// ══════════════════════════════════════════════════════════════════════════════

function buildCDragonUrl(assetPath) {
  if (!assetPath) return '';
  const BASE = `https://raw.communitydragon.org/${CDRAGON_SOURCE}/game/`;
  const cleaned = assetPath
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace('.tex', '.png')
    .replace('.dds', '.png');
  return `${BASE}${cleaned}`;
}

async function fetchCDragon() {
  const url = `https://raw.communitydragon.org/${CDRAGON_SOURCE}/cdragon/tft/en_us.json`;
  console.log(`[unified] Fetching CDragon from ${url}...`);

  const data = await new Promise((resolve, reject) => {
    import('https').then(https => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`CDragon HTTP ${res.statusCode}`));
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(e); }
        });
      }).on('error', reject);
    });
  });

  const allSets = data.sets || {};
  const currentSet = allSets[setNumber] || { champions: [], traits: [] };

  // Get existing champion icons to preserve admin-cropped Supabase URLs
  const { data: existingChamps } = await supabase.from('champions').select('id, icon');
  const existingIconMap = new Map((existingChamps || []).map(c => [c.id, c.icon]));

  // Champions
  const champions = currentSet.champions
    .filter(c => {
      if (!c.name) return false;
      if (c.cost === undefined || c.cost === 0) return false;
      if (!c.traits || c.traits.length === 0) return false;
      const api = c.apiName.toLowerCase();
      if (api.includes('targetdummy') || api.includes('egg') || api.includes('anvil') || api.includes('loot')) return false;
      return true;
    })
    .map(c => {
      const options = [c.squareIcon, c.tileIcon, c.icon].filter(Boolean);
      const rawSquare = options.find(p => p.toLowerCase().includes('square') || p.toLowerCase().includes('mobile'))
                     || c.squareIcon || c.tileIcon || c.icon || '';
      const fullUrl = buildCDragonUrl(rawSquare);

      const existingIcon = existingIconMap.get(c.apiName);
      const isSupabaseUrl = existingIcon && existingIcon.includes('supabase.co');
      const finalIcon = isSupabaseUrl ? existingIcon : fullUrl;

      return {
        id: c.apiName,
        name: c.name,
        cost: c.cost,
        icon: finalIcon,
        set_prefix: TFT_SET_PREFIX,
        traits: c.traits || [],
      };
    });

  // Traits: Deduplicate by name, keeping shortest ID (base trait)
  const baseTraits = currentSet.traits.map(t => {
    let iconUrl = '';
    if (t.icon) {
      iconUrl = buildCDragonUrl(t.icon);
    } else if (t.apiName) {
      iconUrl = `https://raw.communitydragon.org/${CDRAGON_SOURCE}/game/assets/ux/tft/traiticons/${t.apiName.toLowerCase()}.png`;
    }
    return {
      id: t.apiName,
      name: t.name,
      description: t.desc,
      icon: iconUrl,
      set_prefix: TFT_SET_PREFIX,
    };
  });

  const traitsMap = new Map();
  for (const t of baseTraits) {
    if (!t.name) continue;
    const existing = traitsMap.get(t.name);
    if (!existing || t.id.length < existing.id.length) {
      traitsMap.set(t.name, t);
    }
  }
  const traits = Array.from(traitsMap.values());

  // Items & Augments
  const items = [];
  const augments = [];

  (data.items || []).forEach(i => {
    const apiName = i.apiName || '';
    if (!i.name || !i.desc) return;
    if (apiName.includes('Tutorial') || apiName.includes('Base')) return;
    if (apiName.includes('Consumable') || apiName.includes('Reward') || apiName.includes('Loot') || apiName.includes('Assist') || apiName.includes('Debug') || apiName.toLowerCase().includes('event') || apiName.includes('Support') || apiName.toLowerCase().includes('doubleup') || apiName.includes('Training') || apiName.includes('Manual')) return;

    const isAugment = apiName.includes('Augment') || i.icon?.toLowerCase().includes('augment');
    const setMatch = apiName.match(/(?:TFT|Set)(\d+)/i);
    const itemPrefixSet = setMatch ? setMatch[1] : null;
    const belongsToOtherSet = itemPrefixSet && itemPrefixSet !== setNumber;
    const isRadiantOrArtifact = apiName.includes('Radiant') || apiName.includes('Artifact');

    if (belongsToOtherSet) {
      if (!isRadiantOrArtifact) return;
      if (!['4', '5'].includes(itemPrefixSet)) return;
    }

    const icon = buildCDragonUrl(i.icon);
    const row = { id: i.apiName, name: i.name, icon, set_prefix: TFT_SET_PREFIX };

    if (isAugment) {
      let tier = 'Gold';
      const lowerApi = i.apiName.toLowerCase();
      if (lowerApi.includes('tier1') || lowerApi.endsWith('_i')) tier = 'Silver';
      else if (lowerApi.includes('tier3') || lowerApi.endsWith('_iii')) tier = 'Prismatic';
      augments.push({ ...row, description: i.desc, tier });
    } else {
      const isSetItem = apiName.startsWith(TFT_SET_PREFIX);
      const isGenericItem = apiName.startsWith('TFT_Item_');
      if (isSetItem || isGenericItem || isRadiantOrArtifact) {
        items.push(row);
      }
    }
  });

  // Raw champion data for trait mapping
  const champTraitMap = currentSet.champions
    .filter(c => c.traits?.length)
    .map(c => ({ id: c.apiName, traits: c.traits }));

  console.log(`[unified] CDragon parsed: ${champions.length} champs, ${traits.length} traits, ${items.length} items, ${augments.length} augments`);
  return { champions, traits, items, augments, champTraitMap };
}

// ══════════════════════════════════════════════════════════════════════════════
// DDragon helpers (from download-riot-data.mjs)
// ══════════════════════════════════════════════════════════════════════════════

const DD_BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US`;
const DD_IMG_BASE = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`;

async function fetchDDragonJson(file) {
  const url = `${DD_BASE_URL}/${file}`;
  console.log(`[unified] Fetching DDragon ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 403 || res.status === 404) {
      console.warn(`[unified] DDragon 404: ${url}`);
      return {};
    }
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  const json = await res.json();
  return json.data || {};
}

async function fetchDDragon() {
  const [champsData, itemsData, traitsData] = await Promise.all([
    fetchDDragonJson('tft-champion.json'),
    fetchDDragonJson('tft-item.json'),
    fetchDDragonJson('tft-trait.json'),
  ]);

  let augmentsData = await fetchDDragonJson('tft-augments.json');
  if (Object.keys(augmentsData).length === 0) {
    augmentsData = await fetchDDragonJson('tft-augment.json');
  }

  // Champions
  const champions = Object.values(champsData)
    .filter(c => c.id && c.id.startsWith(`${TFT_SET_PREFIX}_`))
    .map(c => ({
      id: c.id,
      name: (c.name || '').trim(),
      cost: c.tier || c.cost || 0,
      icon: c.image?.full ? `${DD_IMG_BASE}/img/tft-champion/${c.image.full}` : '',
      set_prefix: TFT_SET_PREFIX,
      traits: c.traits || [],
    }));

  // Traits
  const originsGuess = ['Bilgewater', 'Demacia', 'Freljord', 'Ionia', 'Ixtal', 'Noxus', 'Piltover', 'Shadow Isles', 'Shurima', 'Targon', 'Void', 'Yordle', 'Zaun', 'Darkin'];
  const traits = Object.values(traitsData)
    .filter(t => t.id && t.id.startsWith(`${TFT_SET_PREFIX}_`))
    .map(t => {
      const name = (t.name || '').trim();
      return {
        id: t.id,
        name,
        description: t.description || t.desc || '',
        icon: t.image?.full ? `${DD_IMG_BASE}/img/tft-trait/${t.image.full}` : '',
        set_prefix: TFT_SET_PREFIX,
      };
    });

  // Augments
  const augments = Object.values(augmentsData)
    .filter(a => {
      if (!a.id) return false;
      const match = a.id.match(/^TFT(\d+)_/i);
      if (match && match[1] !== setNumber) return false;
      return a.id.startsWith(`${TFT_SET_PREFIX}_`) || a.id.startsWith('TFT_');
    })
    .map(a => {
      let tier = 'Unknown';
      const name = (a.name || '').toLowerCase();
      const id = (a.id || '').toLowerCase();
      if (name.includes('silver') || id.includes('silver') || id.endsWith('1') || id.endsWith('_i')) tier = 'Silver';
      else if (name.includes('prismatic') || id.includes('prismatic') || id.endsWith('3') || id.endsWith('_iii')) tier = 'Prismatic';
      else tier = 'Gold';

      return {
        id: a.id,
        name: (a.name || '').trim(),
        description: a.description || a.desc || '',
        icon: a.image?.full ? `${DD_IMG_BASE}/img/tft-augment/${a.image.full}` : '',
        tier,
        set_prefix: TFT_SET_PREFIX,
      };
    });

  // Items
  const items = Object.values(itemsData)
    .filter(i => i.id && (i.id.startsWith(`${TFT_SET_PREFIX}_`) || i.id.startsWith('TFT_') || i.id.includes('Radiant')))
    .map(i => ({
      id: i.id || '',
      name: (i.name || '').trim(),
      icon: i.image?.full ? `${DD_IMG_BASE}/img/tft-item/${i.image.full}` : '',
      set_prefix: TFT_SET_PREFIX,
    }));

  // Champion trait map from DDragon
  const champTraitMap = Object.values(champsData)
    .filter(c => c.id && c.id.startsWith(`${TFT_SET_PREFIX}_`) && c.traits?.length)
    .map(c => ({ id: c.id, traits: c.traits }));

  console.log(`[unified] DDragon parsed: ${champions.length} champs, ${traits.length} traits, ${items.length} items, ${augments.length} augments`);
  return { champions, traits, items, augments, champTraitMap };
}

// ══════════════════════════════════════════════════════════════════════════════
// Shared DB helpers
// ══════════════════════════════════════════════════════════════════════════════

async function mergeSetPrefixes(table, itemsArray) {
  if (!itemsArray.length) return;

  const ids = itemsArray.map(r => r.id);
  let existing = [];
  const chunkSize = 150;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase.from(table).select('id, set_prefix').in('id', chunk);
    if (error) console.error(`[unified] Error fetching existing ${table}:`, error);
    else if (data) existing = existing.concat(data);
  }

  const existingMap = new Map();
  existing.forEach(r => existingMap.set(r.id, r.set_prefix));

  const mapped = itemsArray.map(row => {
    const oldPrefix = existingMap.get(row.id);
    let newPrefix = TFT_SET_PREFIX;
    if (oldPrefix) {
      if (!oldPrefix.includes(TFT_SET_PREFIX)) {
        newPrefix = `${oldPrefix},${TFT_SET_PREFIX}`;
      } else {
        newPrefix = oldPrefix;
      }
    }
    return { ...row, set_prefix: newPrefix };
  });

  const { error } = await supabase.from(table).upsert(mapped, { onConflict: 'id' });
  if (error) console.error(`[unified] ${table} upsert error:`, error.message);
  else console.log(`[unified] Upserted ${mapped.length} ${table}.`);
}

// ══════════════════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  // Fetch only what we need (in parallel)
  const [cdragonData, ddragonData] = await Promise.all([
    needCDragon ? fetchCDragon() : null,
    needDDragon ? fetchDDragon() : null,
  ]);

  // Pick data per entity type from configured source
  const pick = (type) => {
    const source = SOURCES[type];
    const data = source === 'cdragon' ? cdragonData : ddragonData;
    if (!data) {
      console.warn(`[unified] No ${source} data for ${type} — source unavailable.`);
      return [];
    }
    return data[type] || [];
  };

  const champions  = pick('champions');
  const traits     = pick('traits');
  const augments   = pick('augments');
  const items      = pick('items');

  // Pick champion→trait mapping from whichever source provided champions
  const champTraitMap = SOURCES.champions === 'cdragon'
    ? (cdragonData?.champTraitMap || [])
    : (ddragonData?.champTraitMap || []);

  console.log(`\n[unified] ═══ Final Selection ═══`);
  console.log(`[unified] Champions: ${champions.length} (from ${SOURCES.champions})`);
  console.log(`[unified] Traits:    ${traits.length} (from ${SOURCES.traits})`);
  console.log(`[unified] Augments:  ${augments.length} (from ${SOURCES.augments})`);
  console.log(`[unified] Items:     ${items.length} (from ${SOURCES.items})`);

  // ── Database Upserts ────────────────────────────────────────────────────────

  // Champions — direct upsert
  if (champions.length) {
    const rows = champions.map(({ traits, ...rest }) => rest); // strip traits field
    const { error } = await supabase.from('champions').upsert(rows, { onConflict: 'id' });
    if (error) console.error('[unified] champions upsert error:', error.message);
    else console.log(`[unified] Upserted ${rows.length} champions.`);
  }

  // Traits — direct upsert
  if (traits.length) {
    const { error } = await supabase.from('traits').upsert(traits, { onConflict: 'id' });
    if (error) console.error('[unified] traits upsert error:', error.message);
    else console.log(`[unified] Upserted ${traits.length} traits.`);
  }

  // Items — merge set_prefix for shared items across sets
  await mergeSetPrefixes('items', items);

  // Augments — merge set_prefix, preserve admin-set tier/tags
  const { data: existingAugs } = await supabase.from('augments').select('id, tier, tags');
  const existingAugMap = new Map((existingAugs || []).map(a => [a.id, a]));

  const augmentRows = augments.map(aug => {
    const existing = existingAugMap.get(aug.id);
    // Preserve admin-assigned tier/tags if they exist
    if (existing) {
      return { ...aug, tier: existing.tier || aug.tier, tags: existing.tags || [] };
    }
    return { ...aug, tags: [] };
  });
  await mergeSetPrefixes('augments', augmentRows);

  // Champion→Trait join table
  if (champTraitMap.length) {
    for (const champ of champTraitMap) {
      if (!champ.traits?.length) continue;
      const rows = champ.traits.map(t => ({ champion_id: champ.id, trait_name: t }));
      await supabase.from('champion_traits').upsert(rows, { onConflict: 'champion_id,trait_name' });
    }
    console.log(`[unified] Champion→Trait mappings synced for ${champTraitMap.length} champions.`);
  }

  // ── Update sync job ─────────────────────────────────────────────────────────
  if (SYNC_JOB_ID) {
    const sourceLabel = `${SOURCES.champions === 'cdragon' ? 'cd' : 'dd'}/${SOURCES.traits === 'cdragon' ? 'cd' : 'dd'}/${SOURCES.augments === 'cdragon' ? 'cd' : 'dd'}/${SOURCES.items === 'cdragon' ? 'cd' : 'dd'}`;
    await supabase.from('sync_jobs').update({
      status: 'completed',
      champion_count: champions.length,
      trait_count: traits.length,
      augment_count: augments.length,
      item_count: items.length,
      ddragon_version: `unified-${sourceLabel}`,
      finished_at: new Date().toISOString(),
    }).eq('id', SYNC_JOB_ID);
    console.log(`[unified] Job ${SYNC_JOB_ID} marked completed.`);
  }

  console.log('\n[unified] ✅ Sync Done!');
  console.log(`[unified] Summary — Champions: ${champions.length} | Traits: ${traits.length} | Augments: ${augments.length} | Items: ${items.length}`);
  setTimeout(() => process.exit(0), 100);
}

main().catch(async (err) => {
  console.error('[unified] Fatal error:', err.message);
  try {
    if (SYNC_JOB_ID) {
      await supabase.from('sync_jobs').update({
        status: 'error',
        errorMessage: err.message || 'unknown error',
        finished_at: new Date().toISOString(),
      }).eq('id', SYNC_JOB_ID);
    }
  } catch (e) {
    console.error('[unified] Could not update job status:', e.message);
  }
  setTimeout(() => process.exit(1), 100);
});
