/**
 * Fix patches for already-ingested matches using date-based detection.
 * Run this once to correct matches wrongly tagged as 16.7 that were actually 16.8, etc.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase credentials required'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Same schedule as ingest-matches.mjs
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

function getCorrectPatch(game_datetime) {
  const d = new Date(game_datetime);
  for (const entry of PATCH_SCHEDULE) {
    if (d >= entry.date) return entry.patch;
  }
  return null;
}

async function main() {
  console.log('[fix-patches] Fetching all matches...');
  
  // Fetch all matches
  const { data: matches, error } = await supabase
    .from('matches')
    .select('match_id, patch, game_datetime')
    .order('game_datetime', { ascending: false });

  if (error) { console.error('Error fetching matches:', error.message); process.exit(1); }
  
  console.log(`[fix-patches] Found ${matches.length} total matches`);
  
  let fixed = 0;
  let correct = 0;
  const patchCounts = {};
  
  for (const match of matches) {
    const correctPatch = getCorrectPatch(match.game_datetime);
    if (!correctPatch) continue;
    
    patchCounts[correctPatch] = (patchCounts[correctPatch] || 0) + 1;
    
    if (match.patch !== correctPatch) {
      console.log(`[fix-patches] ${match.match_id}: ${match.patch} → ${correctPatch} (played ${match.game_datetime})`);
      
      // Update match table
      await supabase.from('matches').update({ patch: correctPatch })
        .eq('match_id', match.match_id);
      
      // Update player_matches table
      await supabase.from('player_matches').update({ patch: correctPatch })
        .eq('match_id', match.match_id);
      
      fixed++;
    } else {
      correct++;
    }
  }
  
  console.log(`\n[fix-patches] Summary:`);
  console.log(`  Total matches: ${matches.length}`);
  console.log(`  Already correct: ${correct}`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Patch distribution:`);
  for (const [patch, count] of Object.entries(patchCounts).sort((a, b) => b[0].localeCompare(a[0]))) {
    console.log(`    ${patch}: ${count} matches`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
