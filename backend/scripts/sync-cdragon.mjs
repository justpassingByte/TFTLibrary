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
  
  const data = await new Promise((resolve, reject) => {
    import('https').then(https => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}`));
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } 
          catch (e) { reject(e); }
        });
      }).on('error', reject);
    });
  });

  // CDragon has everything in sets[] or just top level maps
  const allSets = data.sets || {};
  const setNumber = TFT_SET_PREFIX.replace('TFT', '');
  const currentSet = allSets[setNumber] || { champions: [], traits: [] };
  
  console.log(`[cdragon] Processing Set Number: ${setNumber}`);

  const { data: existingChamps } = await supabase.from('champions').select('id, icon');
  const existingMap = new Map((existingChamps || []).map(c => [c.id, c.icon]));

  // 1. Champions — pre-compute full HTTPS URL
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

  // 2. Traits — deduplicate by name, keeping shortest ID (base trait)
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
      set_prefix: TFT_SET_PREFIX
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

  // 3. Items & Augments
  const items = [];
  const augments = [];

  (data.items || []).forEach(i => {
    const apiName = i.apiName || '';

    // === Hard filters: skip junk entries ===
    if (!i.name || !i.desc) return;
    if (apiName.includes('Tutorial') || apiName.includes('Base')) return;
    // Skip consumables, rewards, loot tokens, assist items, debug items, events, support items, double up specific, training/manual items
    if (apiName.includes('Consumable') || apiName.includes('Reward') || apiName.includes('Loot') || apiName.includes('Assist') || apiName.includes('Debug') || apiName.toLowerCase().includes('event') || apiName.includes('Support') || apiName.toLowerCase().includes('doubleup') || apiName.includes('Training') || apiName.includes('Manual')) return;

    // === Classify: Augment vs Item ===
    const isAugment = apiName.includes('Augment') || i.icon?.toLowerCase().includes('augment');

    // === Set ownership check ===
    // Riot sometimes puts the set number as TFT14_... or ..._Set14_...
    // This aggressive regex safely extracts ANY identifying Set number attached to the entity
    const setMatch = apiName.match(/(?:TFT|Set)(\d+)/i);
    const itemPrefixSet = setMatch ? setMatch[1] : null;
    const belongsToOtherSet = itemPrefixSet && itemPrefixSet !== setNumber;

    // Radiants and Artifacts often retain core base set numbers (4 or 5)
    const isRadiantOrArtifact = apiName.includes('Radiant') || apiName.includes('Artifact');

    // Actively drop ANY item or augment that explicitly belongs to an old/different set (e.g. TFT14_ or Set15)
    if (belongsToOtherSet) {
      if (!isRadiantOrArtifact) return; // Drop normal items AND augments from OTHER sets
      
      // If it IS a radiant/artifact but from another set, only allow the core base sets
      // Set 4 (Base Artifacts), Set 5 (Base Radiants)
      if (!['4', '5'].includes(itemPrefixSet)) {
        return; 
      }
    }

    const icon = buildCDragonUrl(i.icon);
    
    const row = {
        id: i.apiName,
        name: i.name,
        icon: icon,
        set_prefix: TFT_SET_PREFIX,
    };

    if (isAugment) {
        let tier = 'Gold';
        const lowerApiName = i.apiName.toLowerCase();
        if (lowerApiName.includes('tier1') || lowerApiName.endsWith('_i')) tier = 'Silver';
        else if (lowerApiName.includes('tier3') || lowerApiName.endsWith('_iii')) tier = 'Prismatic';
        
        augments.push({ ...row, description: i.desc, tier, set_prefix: TFT_SET_PREFIX });
    } else {
        // Keep: current set items OR generic items OR special items
        const isSetItem = apiName.startsWith(TFT_SET_PREFIX);
        const isGenericItem = apiName.startsWith('TFT_Item_');
        
        if (isSetItem || isGenericItem || isRadiantOrArtifact) {
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
    
    let existing = [];
    const chunkSize = 150;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { data, error } = await supabase.from(table).select('id, set_prefix').in('id', chunk);
      if (error) {
        console.error(`[cdragon] Error fetching existing ${table} chunk:`, error);
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
          newPrefix = oldPrefix; // keep existing if it already includes it
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
  setTimeout(() => process.exit(0), 100);
}

syncCDragon().catch(async (err) => {
    console.error('[cdragon] Fatal Error:', err.message);
    try {
      if (SYNC_JOB_ID) {
        await supabase.from('sync_jobs').update({
          status: 'error',
          errorMessage: err.message || 'unknown error',
          finished_at: new Date().toISOString()
        }).eq('id', SYNC_JOB_ID);
      }
    } catch (e) {
      console.error('[cdragon] Could not update job status to error:', e.message);
    }
    // Give Node's libuv a brief moment to close network socket handles before forcefully exiting
    setTimeout(() => process.exit(1), 100);
});
