/**
 * TFT Patch Notes Crawler
 * -----------------------
 * Auto-detects the latest patch from Riot's website, fetches the patch notes,
 * parses all changes (buffs/nerfs/adjusts), scores them, generates meta
 * predictions, and saves everything to the database.
 *
 * Usage:
 *   node crawl-patch-notes.mjs
 *
 * Environment:
 *   DATABASE_URL       — Postgres connection string
 *   PATCH_NOTES_URL    — Optional override URL (otherwise auto-detects)
 *   SYNC_JOB_ID        — Optional job ID for log tracking
 */

import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const log = (msg) => {
  const line = `[${new Date().toISOString().substring(11, 19)}] ${msg}`;
  console.log(line);
};

// ── Database ──────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// ── Step 1: Auto-detect latest patch ─────────────────────────────────

const INDEX_URL = 'https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/';

async function detectLatestPatch() {
  log('🔍 Auto-detecting latest patch from Riot index...');
  const res = await fetch(INDEX_URL);
  if (!res.ok) throw new Error(`Index page returned HTTP ${res.status}`);
  
  const html = await res.text();
  const pattern = /teamfight-tactics-patch-(\d+)-(\d+)/g;
  const matches = [...html.matchAll(pattern)];
  const uniquePatches = [...new Set(matches.map(m => `${m[1]}.${m[2]}`))];
  
  if (uniquePatches.length === 0) throw new Error('No patches found on index page');
  
  const latest = uniquePatches[0];
  log(`  Found ${uniquePatches.length} patches. Latest: ${latest}`);
  return latest;
}

function buildPatchUrl(version) {
  const slug = `teamfight-tactics-patch-${version.replace('.', '-')}`;
  return `https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/${slug}/`;
}

// ── Step 2: Fetch & Parse patch notes ────────────────────────────────

async function fetchPatchContent(url) {
  log(`📄 Fetching patch notes from: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Patch page returned HTTP ${res.status}`);
  
  const html = await res.text();
  log(`  HTML size: ${(html.length / 1024).toFixed(1)} KB`);
  
  // Strip HTML to plain text
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r/g, '');
  
  return text;
}

function parsePatchNotes(rawText, patchVersion) {
  log('🔬 Parsing patch notes...');
  
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Join lines around ⇒ (arrow is often on its own line)
  const merged = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '⇒' && merged.length > 0 && i + 1 < lines.length) {
      merged[merged.length - 1] += ' ⇒ ' + lines[i + 1];
      i++; // skip the next line
    } else {
      merged.push(lines[i]);
    }
  }
  
  // Identify sections
  const changes = [];
  let currentSection = '';
  let currentTier = null;
  let skipSection = false;
  
  for (const line of merged) {
    // Section detection
    const upperLine = line.toUpperCase();
    
    if (upperLine === 'SYSTEM CHANGES') { currentSection = 'system'; skipSection = false; continue; }
    if (upperLine === 'LARGE CHANGES') { currentSection = 'large'; skipSection = false; continue; }
    if (upperLine.startsWith('REVIVAL:') || upperLine.startsWith('REVIVAL ') || upperLine === 'REVIVAL') { skipSection = true; continue; }
    if (upperLine.startsWith('FESTIVAL OF BEASTS')) { skipSection = true; continue; }
    if (upperLine === 'BUG FIXES') { skipSection = true; continue; }
    if (upperLine.startsWith("CHONCC'S")) { skipSection = true; continue; }
    
    if (skipSection) continue;
    
    // Sub-section detection
    if (upperLine === 'TRAITS') { currentSection = 'trait'; continue; }
    if (upperLine === 'AUGMENTS') { currentSection = 'augment'; continue; }
    if (upperLine === 'UNLOCKS') { currentSection = 'system'; continue; }
    if (upperLine.startsWith('UNITS: TIER')) {
      const tierMatch = upperLine.match(/TIER\s*(\d)/);
      currentTier = tierMatch ? parseInt(tierMatch[1]) : null;
      currentSection = 'unit';
      continue;
    }
    
    // Parse change lines (ones with ⇒)
    if (line.includes('⇒')) {
      const arrowIdx = line.indexOf('⇒');
      const beforePart = line.substring(0, arrowIdx).trim();
      const afterPart = line.substring(arrowIdx + 1).trim();
      
      // Split entity+stat from the before value using ": " 
      const colonIdx = beforePart.indexOf(':');
      if (colonIdx === -1) continue;
      
      const entityAndStat = beforePart.substring(0, colonIdx).trim();
      const beforeValue = beforePart.substring(colonIdx + 1).trim();
      
      // Split entity name from stat description
      const { entity, stat } = splitEntityStat(entityAndStat, currentSection);
      
      const entityType = currentSection === 'trait' ? 'trait' : 
                          currentSection === 'augment' ? 'augment' :
                          currentSection === 'system' ? 'system' : 'unit';
      
      changes.push({
        patch: patchVersion,
        entity,
        entity_type: entityType,
        stat,
        before_val: beforeValue,
        after_val: afterPart,
        tier: currentTier,
        raw_text: line,
      });
    }
    // Qualitative changes
    else if (/is now (?:a |also a )/i.test(line) || /\bNEW\b/.test(line) || /has been (?:re-enabled|disabled)/i.test(line)) {
      const entityType = currentSection === 'augment' ? 'augment' :
                          currentSection === 'trait' ? 'trait' :
                          currentSection === 'system' ? 'system' : 'unit';
      
      const entity = extractEntityName(line);
      const stat = line;
      
      changes.push({
        patch: patchVersion,
        entity,
        entity_type: entityType,
        stat,
        before_val: null,
        after_val: null,
        tier: currentTier,
        raw_text: line,
      });
    }
  }
  
  log(`  Parsed ${changes.length} changes`);
  return changes;
}

function splitEntityStat(text, section) {
  // Example: "Anivia Ability Damage" → entity: "Anivia", stat: "Ability Damage"
  // Example: "Darkin (3) Damage" → entity: "Darkin", stat: "(3) Damage"
  // Example: "Gunslinger AD Gained" → entity: "Gunslinger", stat: "AD Gained"
  
  // For traits, the entity is the trait name (possibly with spaces)
  if (section === 'trait') {
    const bracketMatch = text.match(/^(.+?)\s*(\(\d\))\s*(.+)$/);
    if (bracketMatch) {
      return { entity: bracketMatch[1].trim(), stat: `${bracketMatch[2]} ${bracketMatch[3]}`.trim() };
    }
    // Try: "TraitName StatDescription"
    const parts = text.split(/\s+/);
    if (parts.length >= 2) {
      return { entity: parts[0], stat: parts.slice(1).join(' ') };
    }
    return { entity: text, stat: '' };
  }
  
  // For units, try to extract champion name (first word(s) before stat keywords)
  const statKeywords = ['Ability', 'Health', 'Mana', 'AD', 'AP', 'Attack', 'Passive', 'Base', 'Primary', 'Partners', 'Stage', 'Gains', 'Chronokeeper', 'Resists'];
  
  for (const kw of statKeywords) {
    const idx = text.indexOf(kw);
    if (idx > 0) {
      return { entity: text.substring(0, idx).trim(), stat: text.substring(idx).trim() };
    }
  }
  
  // Fallback: first word is entity, rest is stat
  const parts = text.split(/\s+/);
  if (parts.length >= 2) {
    return { entity: parts[0], stat: parts.slice(1).join(' ') };
  }
  return { entity: text, stat: '' };
}

function extractEntityName(line) {
  // "Jhin is now a Longshot" → "Jhin"
  const isNowMatch = line.match(/^(\S+(?:\s+\S+)?)\s+is\s+now/i);
  if (isNowMatch) return isNowMatch[1];
  
  // "Bandle Bounty I has been re-enabled" → "Bandle Bounty I"
  const hasBeenMatch = line.match(/^(.+?)\s+has\s+been/i);
  if (hasBeenMatch) return hasBeenMatch[1];
  
  // NEW: "Gwen NEW Passive: Gains 15% Omnivamp"
  const newMatch = line.match(/^(\S+)\s+NEW/i);
  if (newMatch) return newMatch[1];
  
  // Fallback
  return line.split(/\s+/).slice(0, 2).join(' ');
}

// ── Step 3: Score changes ────────────────────────────────────────────

function scoreChanges(changes) {
  log('📊 Scoring changes...');
  
  for (const change of changes) {
    if (!change.before_val || !change.after_val) {
      // Qualitative changes
      if (/NEW/.test(change.raw_text)) {
        change.score = 3;
        change.change_type = 'buff';
      } else if (/re-enabled/i.test(change.raw_text)) {
        change.score = 1;
        change.change_type = 'buff';
      } else if (/disabled/i.test(change.raw_text)) {
        change.score = -1;
        change.change_type = 'nerf';
      } else if (/is now/i.test(change.raw_text)) {
        change.score = 1;
        change.change_type = 'adjust';
      } else {
        change.score = 0;
        change.change_type = 'adjust';
      }
      continue;
    }
    
    // Numeric changes — parse before/after values
    const beforeNums = extractNumbers(change.before_val);
    const afterNums = extractNumbers(change.after_val);
    
    if (beforeNums.length > 0 && afterNums.length > 0) {
      const avgBefore = beforeNums.reduce((a, b) => a + b, 0) / beforeNums.length;
      const avgAfter = afterNums.reduce((a, b) => a + b, 0) / afterNums.length;
      
      if (avgBefore === 0) {
        change.score = avgAfter > 0 ? 2 : -2;
      } else {
        const pctChange = ((avgAfter - avgBefore) / Math.abs(avgBefore)) * 100;
        
        // Score based on % change
        if (pctChange > 20) change.score = 3;
        else if (pctChange > 10) change.score = 2;
        else if (pctChange > 0) change.score = 1;
        else if (pctChange < -20) change.score = -3;
        else if (pctChange < -10) change.score = -2;
        else if (pctChange < 0) change.score = -1;
        else change.score = 0;
      }
      
      // Stat-specific weight adjustments
      const statLower = change.stat.toLowerCase();
      if (statLower.includes('mana') && change.score > 0) {
        // Mana reduction is a bigger buff
        change.score = Math.min(change.score + 1, 3);
      }
      if (statLower.includes('mana') && change.score < 0) {
        change.score = Math.max(change.score - 1, -3);
      }
      
      // Tier 5 multiplier
      if (change.tier === 5) {
        change.score = Math.round(change.score * 1.5);
        change.score = Math.max(-5, Math.min(5, change.score));
      }
      
      // Classify
      if (change.score > 0) change.change_type = 'buff';
      else if (change.score < 0) change.change_type = 'nerf';
      else change.change_type = 'adjust';
    } else {
      change.score = 0;
      change.change_type = 'adjust';
    }
  }
  
  const buffs = changes.filter(c => c.change_type === 'buff').length;
  const nerfs = changes.filter(c => c.change_type === 'nerf').length;
  const adjusts = changes.filter(c => c.change_type === 'adjust').length;
  log(`  Buffs: ${buffs}, Nerfs: ${nerfs}, Adjusts: ${adjusts}`);
  
  return changes;
}

function extractNumbers(str) {
  const matches = str.match(/[\d.]+/g);
  return matches ? matches.map(Number) : [];
}

// ── Step 4: Generate Meta Predictions ────────────────────────────────

async function generatePredictions(changes, patchVersion) {
  log('🔮 Generating meta predictions...');
  
  // Load champion→trait mapping from database
  const { rows: champTraits } = await query(`
    SELECT c.name, c.cost, array_agg(ct.trait_name) as traits
    FROM champions c
    LEFT JOIN champion_traits ct ON c.id = ct.champion_id
    GROUP BY c.name, c.cost
  `);
  
  const champMap = {};
  for (const row of champTraits) {
    champMap[row.name] = { cost: row.cost, traits: row.traits || [] };
  }
  
  // Group changes by entity
  const entityScores = {};
  for (const change of changes) {
    if (!entityScores[change.entity]) {
      entityScores[change.entity] = { totalScore: 0, type: change.entity_type, changes: [] };
    }
    entityScores[change.entity].totalScore += change.score;
    entityScores[change.entity].changes.push(change);
  }
  
  // Group by trait families
  const traitScores = {};
  for (const [entity, data] of Object.entries(entityScores)) {
    if (data.type === 'trait') {
      traitScores[entity] = (traitScores[entity] || 0) + data.totalScore;
    }
    if (data.type === 'unit' && champMap[entity]) {
      for (const trait of champMap[entity].traits) {
        traitScores[trait] = (traitScores[trait] || 0) + data.totalScore * 0.5;
      }
    }
  }
  
  const predictions = [];
  let sortOrder = 0;
  
  // Find heavily buffed trait families
  const buffedTraits = Object.entries(traitScores)
    .filter(([_, s]) => s >= 3)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [trait, traitScore] of buffedTraits) {
    // Find buffed units in this trait
    const traitUnits = Object.entries(champMap)
      .filter(([_, data]) => data.traits?.includes(trait))
      .map(([name, _]) => name);
    
    const buffedUnits = traitUnits.filter(u => entityScores[u]?.totalScore > 0);
    const keyUnits = buffedUnits.length > 0 ? buffedUnits.slice(0, 3) : traitUnits.slice(0, 3);
    
    const tier = traitScore >= 6 ? 'S' : traitScore >= 3 ? 'A' : 'B';
    
    // Find a carry
    const carry = buffedUnits.sort((a, b) => (entityScores[b]?.totalScore || 0) - (entityScores[a]?.totalScore || 0))[0];
    const compName = carry ? `${trait} ${carry} Carry` : `${trait} Flex`;
    
    predictions.push({
      patch: patchVersion,
      name: compName,
      tier,
      score: Math.round(traitScore * 10) / 10,
      reason: `${trait} trait received significant buffs. ${buffedUnits.length > 0 ? `Key carries ${buffedUnits.join(', ')} also buffed.` : 'Trait synergies improved overall.'}`,
      key_units: keyUnits,
      buffed_entities: [...new Set([trait, ...buffedUnits])],
      nerfed_entities: [],
      sort_order: sortOrder++,
    });
  }
  
  // Find individually strong buffed carries (not already covered by trait comps)
  const coveredUnits = new Set(predictions.flatMap(p => p.key_units));
  const strongBuffs = Object.entries(entityScores)
    .filter(([entity, data]) => data.type === 'unit' && data.totalScore >= 2 && !coveredUnits.has(entity))
    .sort((a, b) => b[1].totalScore - a[1].totalScore);
  
  for (const [entity, data] of strongBuffs.slice(0, 4)) {
    const traits = champMap[entity]?.traits || [];
    const mainTrait = traits[0] || 'Flex';
    
    predictions.push({
      patch: patchVersion,
      name: `${mainTrait} ${entity} Carry`,
      tier: data.totalScore >= 4 ? 'S' : 'A',
      score: data.totalScore,
      reason: `${entity} received substantial buffs: ${data.changes.map(c => c.stat).join(', ')}.`,
      key_units: [entity],
      buffed_entities: [entity],
      nerfed_entities: [],
      sort_order: sortOrder++,
    });
  }
  
  // Find heavily nerfed entities (NERFED predictions)
  const nerfedEntities = Object.entries(entityScores)
    .filter(([_, data]) => data.totalScore <= -3)
    .sort((a, b) => a[1].totalScore - b[1].totalScore);
  
  for (const [entity, data] of nerfedEntities.slice(0, 4)) {
    const traits = data.type === 'unit' ? (champMap[entity]?.traits || []) : [];
    const compName = data.type === 'trait' ? `${entity} Comps` : `${entity} Carry`;
    
    predictions.push({
      patch: patchVersion,
      name: compName,
      tier: 'NERFED',
      score: data.totalScore,
      reason: `${entity} received significant nerfs: ${data.changes.map(c => c.stat).join(', ')}.`,
      key_units: data.type === 'unit' ? [entity] : [],
      buffed_entities: [],
      nerfed_entities: [entity],
      sort_order: sortOrder++,
    });
  }
  
  log(`  Generated ${predictions.length} predictions`);
  return predictions;
}

// ── Step 5: Save to database ─────────────────────────────────────────

async function saveToDb(changes, predictions, patchVersion) {
  log('💾 Saving to database...');
  
  // Clear existing data for this patch
  await query('DELETE FROM patch_changes WHERE patch = $1', [patchVersion]);
  await query('DELETE FROM patch_meta_predictions WHERE patch = $1', [patchVersion]);
  
  // Insert changes
  for (const c of changes) {
    await query(`
      INSERT INTO patch_changes (id, patch, entity, entity_type, change_type, stat, before_val, after_val, score, tier, raw_text)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (patch, entity, stat) DO UPDATE SET
        change_type = EXCLUDED.change_type,
        before_val = EXCLUDED.before_val,
        after_val = EXCLUDED.after_val,
        score = EXCLUDED.score,
        tier = EXCLUDED.tier,
        raw_text = EXCLUDED.raw_text
    `, [c.patch, c.entity, c.entity_type, c.change_type, c.stat, c.before_val, c.after_val, c.score, c.tier, c.raw_text]);
  }
  log(`  Saved ${changes.length} changes`);
  
  // Insert predictions
  for (const p of predictions) {
    await query(`
      INSERT INTO patch_meta_predictions (id, patch, name, tier, score, reason, key_units, buffed_entities, nerfed_entities, sort_order)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (patch, name) DO UPDATE SET
        tier = EXCLUDED.tier,
        score = EXCLUDED.score,
        reason = EXCLUDED.reason,
        key_units = EXCLUDED.key_units,
        buffed_entities = EXCLUDED.buffed_entities,
        nerfed_entities = EXCLUDED.nerfed_entities,
        sort_order = EXCLUDED.sort_order
    `, [p.patch, p.name, p.tier, p.score, p.reason, p.key_units, p.buffed_entities, p.nerfed_entities, p.sort_order]);
  }
  log(`  Saved ${predictions.length} predictions`);
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  log('🚀 TFT Patch Notes Crawler starting...');
  
  try {
    // Detect or use override URL
    let patchVersion;
    let url;
    
    if (process.env.PATCH_NOTES_URL) {
      url = process.env.PATCH_NOTES_URL;
      const versionMatch = url.match(/patch-(\d+)-(\d+)/);
      patchVersion = versionMatch ? `${versionMatch[1]}.${versionMatch[2]}` : 'unknown';
      log(`  Using override URL for patch ${patchVersion}`);
    } else {
      patchVersion = await detectLatestPatch();
      url = buildPatchUrl(patchVersion);
    }
    
    // Check if already crawled
    const { rows: existing } = await query('SELECT count(*) as cnt FROM patch_changes WHERE patch = $1', [patchVersion]);
    if (parseInt(existing[0].cnt) > 0) {
      log(`⚠️  Patch ${patchVersion} already has ${existing[0].cnt} changes in DB.`);
      log('  Re-crawling will overwrite existing data...');
    }
    
    // Fetch & Parse
    const rawText = await fetchPatchContent(url);
    let changes = parsePatchNotes(rawText, patchVersion);
    
    if (changes.length === 0) {
      log('❌ No changes parsed! The page structure might have changed.');
      process.exit(1);
    }
    
    // Score
    changes = scoreChanges(changes);
    
    // Generate predictions
    const predictions = await generatePredictions(changes, patchVersion);
    
    // Save
    await saveToDb(changes, predictions, patchVersion);
    
    log(`✅ Done! Patch ${patchVersion}: ${changes.length} changes, ${predictions.length} predictions saved.`);
  } catch (err) {
    log(`❌ Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
