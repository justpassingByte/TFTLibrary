import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the backend `.env` file instead of frontend `.env.local`
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Configuration (all from environment) ────────────────────────────────────
const DDRAGON_VERSION = process.env.DDRAGON_VERSION || '16.7.1';
const TFT_SET_PREFIX = process.env.TFT_SET_PREFIX || 'TFT16';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SYNC_JOB_ID = process.env.SYNC_JOB_ID; // passed by the API route

const BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US`;
const DDRAGON_BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`;

// Supabase client (service role — bypasses RLS)
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

if (!supabase) {
  console.warn('[sync] No Supabase credentials — DB upsert disabled (local mode).');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function fetchJson(file) {
  const url = `${BASE_URL}/${file}`;
  console.log(`Fetching ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 403 || res.status === 404) {
      console.warn(`Could not find ${url}, returning empty object.`);
      return {};
    }
    throw new Error(`HTTP ${res.status} when fetching ${url}`);
  }
  const json = await res.json();
  return json.data || {};
}

function readJsonFile(path, fallback = {}) {
  try {
    if (fs.existsSync(path)) return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`Error reading ${path}:`, err);
  }
  return fallback;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function updateData() {
  console.log(`[sync] Starting DDragon sync — version=${DDRAGON_VERSION}, prefix=${TFT_SET_PREFIX}`);

  const [champsData, itemsData, traitsData] = await Promise.all([
    fetchJson('tft-champion.json'),
    fetchJson('tft-item.json'),
    fetchJson('tft-trait.json'),
  ]);

  // Augments: try both filenames
  let augmentsData = await fetchJson('tft-augments.json');
  if (Object.keys(augmentsData).length === 0) {
    augmentsData = await fetchJson('tft-augment.json');
  }

  // ── Champions ──────────────────────────────────────────────────────────────
  const champTraitMappingPath = '../lib/champion-traits.json';
  const manualChampTraits = readJsonFile(champTraitMappingPath);

  const champions = Object.values(champsData)
    .filter(c => c.id && c.id.startsWith(`${TFT_SET_PREFIX}_`))
    .map(c => {
      let traits = manualChampTraits[c.id];
      if (!traits) {
        traits = c.traits || [];
        manualChampTraits[c.id] = traits;
      }
      return {
        id: c.id,
        name: (c.name || '').trim(),
        cost: c.tier || c.cost || 0,
        traits,
        icon: c.image?.full ? `${DDRAGON_BASE_URL}/img/tft-champion/${c.image.full}` : '',
        image: c.image || null,
      };
    });

  fs.writeFileSync(champTraitMappingPath, JSON.stringify(manualChampTraits, null, 2));
  console.log(`[sync] Champions: ${champions.length}`);

  // ── Traits ─────────────────────────────────────────────────────────────────
  const traitTypesPath = '../lib/trait-types.json';
  const manualTraitTypes = readJsonFile(traitTypesPath);

  const originsGuess = ['Bilgewater', 'Demacia', 'Freljord', 'Ionia', 'Ixtal', 'Noxus', 'Piltover', 'Shadow Isles', 'Shurima', 'Targon', 'Void', 'Yordle', 'Zaun', 'Darkin'];

  const traits = Object.values(traitsData)
    .filter(t => t.id && t.id.startsWith(`${TFT_SET_PREFIX}_`))
    .map(t => {
      const name = (t.name || '').trim();
      let type = manualTraitTypes[t.id];
      if (!type) {
        type = originsGuess.includes(name) ? 'Origin' : 'Class';
        manualTraitTypes[t.id] = type;
      }
      return { id: t.id, name, desc: t.description || t.desc || '', icon: t.image?.full ? `${DDRAGON_BASE_URL}/img/tft-trait/${t.image.full}` : '', type };
    });

  fs.writeFileSync(traitTypesPath, JSON.stringify(manualTraitTypes, null, 2));
  console.log(`[sync] Traits: ${traits.length}`);

  // ── Augments ───────────────────────────────────────────────────────────────
  const tierMappingPath = '../lib/augment-tiers.json';
  const manualTiers = readJsonFile(tierMappingPath);

  const augments = Object.values(augmentsData)
    .filter(a => {
      if (!a.id) return false;
      const match = a.id.match(/^TFT(\d+)_/i);
      const setNumber = TFT_SET_PREFIX.replace('TFT', '');
      if (match && match[1] !== setNumber) return false;
      return a.id.startsWith(`${TFT_SET_PREFIX}_`) || a.id.startsWith('TFT_');
    })
    .map(a => {
      let tier = manualTiers[a.id] || 'Unknown';
      if (tier === 'Unknown') {
        const name = (a.name || '').toLowerCase();
        const id = (a.id || '').toLowerCase();
        if (name.includes('silver') || id.includes('silver') || id.endsWith('1') || id.endsWith('_i')) tier = 'Silver';
        else if (name.includes('prismatic') || id.includes('prismatic') || id.endsWith('3') || id.endsWith('_iii')) tier = 'Prismatic';
        else tier = 'Gold';
        manualTiers[a.id] = tier;
      }
      return {
        id: a.id,
        name: (a.name || '').trim(),
        desc: a.description || a.desc || '',
        icon: a.image?.full ? `${DDRAGON_BASE_URL}/img/tft-augment/${a.image.full}` : '',
        tier
      };
    });

  fs.writeFileSync(tierMappingPath, JSON.stringify(manualTiers, null, 2));
  console.log(`[sync] Augments: ${augments.length}`);

  // ── Items ──────────────────────────────────────────────────────────────────
  const items = Object.values(itemsData)
    .filter(i => i.id && (i.id.startsWith(`${TFT_SET_PREFIX}_`) || i.id.startsWith('TFT_') || i.id.includes('Radiant')))
    .map(i => ({ id: i.id || '', name: (i.name || '').trim(), desc: i.description || i.desc || '', icon: i.image?.full ? `${DDRAGON_BASE_URL}/img/tft-item/${i.image.full}` : '', image: i.image || null }));

  console.log(`[sync] Items: ${items.length}`);

  // ── Database Sync Only ────────────────────────────────────────────────

  // ── Supabase Upsert ────────────────────────────────────────────────────────
  if (supabase) {
    console.log('[sync] Upserting into Supabase...');

    // Champions
    // [USER DEV OVERRIDE]: Do not overwrite Champions (Preserve CDragon URL avatars)
    /*
    const champRows = champions.map(c => ({
      id: c.id,
      name: c.name,
      cost: c.cost,
      icon: c.icon,
      set_prefix: TFT_SET_PREFIX,
    }));
    const { error: champErr } = await supabase
      .from('champions')
      .upsert(champRows, { onConflict: 'id' });
    if (champErr) console.error('[sync] champions upsert error:', champErr.message);
    else console.log(`[sync] Upserted ${champRows.length} champions.`);

    // Champion traits join table — only insert new assignments, don't clobber admin edits
    for (const champ of champions) {
      if (!champ.traits?.length) continue;
      // Only insert if no rows exist yet for this champion (first-time seed)
      const { count } = await supabase
        .from('champion_traits')
        .select('*', { count: 'exact', head: true })
        .eq('champion_id', champ.id);
      if (count === 0) {
        const rows = champ.traits.map(t => ({ champion_id: champ.id, trait_name: t }));
        await supabase.from('champion_traits').insert(rows);
      }
    }
    console.log('[sync] Champion traits seeded (skipped existing).');
    */

    // Traits
    // [USER DEV OVERRIDE]: Do not overwrite Traits
    /*
    const traitRows = traits.map(t => ({
      id: t.id,
      name: t.name,
      description: t.desc,
      icon: t.icon,
      set_prefix: TFT_SET_PREFIX,
    }));
    const { error: traitErr } = await supabase
      .from('traits')
      .upsert(traitRows, { onConflict: 'id' });
    if (traitErr) console.error('[sync] traits upsert error:', traitErr.message);
    else console.log(`[sync] Upserted ${traitRows.length} traits.`);
    */

    // Helper to merge set_prefix for shared items/augments
    const mergeSetPrefixes = async (table, itemsArray, existingDataMap = new Map()) => {
      if (!itemsArray.length) return;

      const ids = itemsArray.map(r => r.id);
      let existing = [];
      const chunkSize = 150;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { data, error } = await supabase.from(table).select('id, set_prefix').in('id', chunk);
        if (error) {
          console.error(`[sync] Error fetching existing ${table} chunk:`, error);
        } else if (data) {
          existing = existing.concat(data);
        }
      }

      const existingMap = new Map();
      if (existing.length) existing.forEach(r => existingMap.set(r.id, r.set_prefix));

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

        // Preserve tier/tags if available in existingDataMap (Augments only)
        const oldRow = existingDataMap.get(row.id);
        if (oldRow) {
          return { ...row, set_prefix: newPrefix, tier: oldRow.tier, tags: oldRow.tags };
        }
        return { ...row, set_prefix: newPrefix };
      });

      const { error } = await supabase.from(table).upsert(mapped, { onConflict: 'id' });
      if (error) console.error(`[sync] ${table} upsert error:`, error.message);
      else console.log(`[sync] Upserted ${mapped.length} ${table}.`);
    };

    // Augments — preserve admin-set tier/tags
    const { data: existingAugs } = await supabase.from('augments').select('id, tier, tags');
    const existingMap = new Map((existingAugs || []).map(a => [a.id, a]));

    const baseAugmentRows = augments.map(aug => ({
      id: aug.id,
      name: aug.name,
      description: aug.desc,
      icon: aug.icon,
      tier: aug.tier,
      tags: []
    }));
    await mergeSetPrefixes('augments', baseAugmentRows, existingMap);

    // Items
    const baseItemRows = items.map(i => ({
      id: i.id,
      name: i.name,
      icon: i.icon
    }));
    await mergeSetPrefixes('items', baseItemRows);

    // Update sync job record
    if (SYNC_JOB_ID) {
      await supabase.from('sync_jobs').update({
        status: 'completed',
        champion_count: champions.length,
        trait_count: traits.length,
        augment_count: augments.length,
        item_count: items.length,
        ddragon_version: DDRAGON_VERSION,
        finished_at: new Date().toISOString(),
      }).eq('id', SYNC_JOB_ID);
      console.log(`[sync] Job ${SYNC_JOB_ID} marked completed.`);
    }
  }

  console.log('[sync] Done!');
  console.log(`Summary — Champions: ${champions.length} | Traits: ${traits.length} | Augments: ${augments.length} | Items: ${items.length}`);
}

updateData().catch(async (err) => {
  console.error('[sync] Fatal error:', err.message);
  if (supabase && SYNC_JOB_ID) {
    await supabase.from('sync_jobs').update({
      status: 'error',
      finished_at: new Date().toISOString(),
    }).eq('id', SYNC_JOB_ID);
  }
  process.exit(1);
});
