import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CDRAGON_SOURCE = process.env.CDRAGON_SOURCE || 'latest'; // 'latest' or 'pbe'
const TFT_SET_PREFIX  = process.env.TFT_SET_PREFIX  || 'TFT16';
const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY;
const SYNC_JOB_ID     = process.env.SYNC_JOB_ID;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[cdragon] Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Convert a CDragon asset path to a full HTTPS URL.
 * Example: "ASSETS/Characters/TFT16_Caitlyn/..." → "https://raw.communitydragon.org/latest/game/assets/characters/tft16_caitlyn/..."
 */
function buildCDragonUrl(assetPath) {
  if (!assetPath) return '';
  const BASE = `https://raw.communitydragon.org/${CDRAGON_SOURCE}/game/`;
  const cleaned = assetPath
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace('.tex', '.png')
    .replace('.dds', '.png');
  // Strip leading "assets/" so we can prepend the base which already includes "game/"
  // CDragon paths: "ASSETS/Characters/..." → "assets/characters/..."
  return `${BASE}${cleaned}`;
}

async function syncCDragon() {
  const url = `https://raw.communitydragon.org/${CDRAGON_SOURCE}/cdragon/tft/en_us.json`;
  console.log(`[cdragon] Starting CDragon sync — source=${CDRAGON_SOURCE}, prefix=${TFT_SET_PREFIX}`);
  console.log(`[cdragon] Fetching from ${url}...`);
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching CDragon from ${url}`);
  const data = await res.json();

  // CDragon has everything in sets[] or just top level maps
  const allSets = data.sets || {};
  const setNumber = TFT_SET_PREFIX.replace('TFT', '');
  const currentSet = allSets[setNumber] || { champions: [], traits: [] };
  
  console.log(`[cdragon] Processing Set Number: ${setNumber}`);

  const { data: existingChamps } = await supabase.from('champions').select('id, icon');
  const existingMap = new Map((existingChamps || []).map(c => [c.id, c.icon]));

  // 1. Champions — pre-compute full HTTPS URL
  const champions = currentSet.champions.map(c => {
    // CDragon is inconsistent between sets:
    // Set 16: squareIcon is the face (_Mobile.tex), tileIcon is the spell (_Spell.tex)
    // Set 17: tileIcon is the face (_Square.tex), squareIcon is a splash crop (_splash_tile.tex)
    const options = [c.squareIcon, c.tileIcon, c.icon].filter(Boolean);
    const rawSquare = options.find(p => p.toLowerCase().includes('square') || p.toLowerCase().includes('mobile')) 
                   || c.squareIcon || c.tileIcon || c.icon || '';
    const fullUrl = buildCDragonUrl(rawSquare);

    // Preserve admin-cropped Supabase URL if it already exists
    const existingIcon = existingMap.get(c.apiName);
    const isSupabaseUrl = existingIcon && existingIcon.includes('supabase.co');
    const finalIcon = isSupabaseUrl ? existingIcon : fullUrl;

    return {
      id: c.apiName,
      name: c.name,
      cost: c.cost,
      icon: finalIcon,
      set_prefix: TFT_SET_PREFIX
    };
  });

  // 2. Traits — also pre-compute full URL
  const traits = currentSet.traits.map(t => {
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
      set_prefix: TFT_SET_PREFIX
    };
  });

  // 3. Items & Augments
  const items = [];
  const augments = [];

  (data.items || []).forEach(i => {
    // Drop items/augments from other past sets (e.g. TFT9_Augment, TFT12_Item)
    const apiName = i.apiName || '';
    const match = apiName.match(/^TFT(\d+)_/i);
    const isRadiantOrArtifact = apiName.includes('Radiant') || apiName.includes('Artifact');
    if (match && match[1] !== setNumber && !isRadiantOrArtifact) {
      return; // Skip explicitly assigned to other sets, EXCEPT Radiants/Artifacts which carry legacy IDs
    }

    // Skip tutorial or mostly dead base augments that cause noise
    if (apiName.includes('Tutorial') || apiName.includes('Base') || (!i.desc && !i.name)) {
      return;
    }

    // Augments in CDragon often have names like "TFT_Augment_..."
    const isAugment = apiName.includes('Augment') || i.icon?.toLowerCase().includes('augment');
    
    // Pre-compute full URL
    const icon = buildCDragonUrl(i.icon);
    
    const row = {
        id: i.apiName,
        name: i.name || i.apiName,
        icon: icon,
        set_prefix: TFT_SET_PREFIX,
    };

    if (isAugment) {
        let tier = 'Gold';
        const apiName = i.apiName.toLowerCase();
        if (apiName.includes('tier1') || apiName.endsWith('_i')) tier = 'Silver';
        else if (apiName.includes('tier3') || apiName.endsWith('_iii')) tier = 'Prismatic';
        
        augments.push({ ...row, description: i.desc || '', tier, set_prefix: TFT_SET_PREFIX });
    } else {
        // Common items plus Set-specific items
        const isSetItem = apiName.startsWith(TFT_SET_PREFIX);
        const isGenericItem = apiName.startsWith('TFT_Item_') || apiName.startsWith('TFT8_Item_'); // fallback for generic
        const isArtifactOrRadiant = apiName.includes('Radiant') || apiName.includes('Artifact') || apiName.includes('Support');

        if (isSetItem || isGenericItem || isArtifactOrRadiant) {
          items.push(row);
        }
    }
  });

  console.log(`[cdragon] Parsed: ${champions.length} champs, ${traits.length} traits, ${items.length} items, ${augments.length} augments`);

  // Database Upserts
  if (champions.length) {
    const { error } = await supabase.from('champions').upsert(champions, { onConflict: 'id' });
    if (error) console.error('Error upserting champions:', error);
  }
  if (traits.length) {
    const { error } = await supabase.from('traits').upsert(traits, { onConflict: 'id' });
    if (error) console.error('Error upserting traits:', error);
  }
  const mergeSetPrefixes = async (table, itemsArray) => {
    if (!itemsArray.length) return;
    const ids = itemsArray.map(r => r.id);
    const { data: existing } = await supabase.from(table).select('id, set_prefix').in('id', ids);
    
    const existingMap = new Map();
    if (existing) existing.forEach(r => existingMap.set(r.id, r.set_prefix));
    
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
    if (error) console.error(`Error upserting ${table}:`, error);
  };

  await mergeSetPrefixes('items', items);
  await mergeSetPrefixes('augments', augments);

  // Handle Champion-Trait mapping (CDragon gives traits in the champ object)
  for (const champ of currentSet.champions) {
    if (champ.traits?.length) {
      const rows = champ.traits.map(t => ({ champion_id: champ.apiName, trait_name: t }));
      await supabase.from('champion_traits').upsert(rows, { onConflict: 'champion_id,trait_name' });
    }
  }

  if (SYNC_JOB_ID) {
    await supabase.from('sync_jobs').update({
      status: 'completed',
      champion_count: champions.length,
      trait_count: traits.length,
      item_count: items.length,
      augment_count: augments.length,
      ddragon_version: `cdragon-${CDRAGON_SOURCE}`,
      finished_at: new Date().toISOString()
    }).eq('id', SYNC_JOB_ID);
    console.log(`[cdragon] Job ${SYNC_JOB_ID} marked completed.`);
  }

  console.log('[cdragon] Sync Done!');
  process.exit(0);
}

syncCDragon().catch(async (err) => {
    console.error('[cdragon] Fatal Error:', err.message);
    try {
      if (SYNC_JOB_ID) {
        await supabase.from('sync_jobs').update({
          status: 'error',
          finished_at: new Date().toISOString()
        }).eq('id', SYNC_JOB_ID);
      }
    } catch (e) {
      console.error('[cdragon] Could not update job status to error:', e.message);
    }
    process.exit(1);
});
