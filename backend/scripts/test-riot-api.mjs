/**
 * Test: Fetch latest matches from ALL regions to find patch 16.8
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const REGION_ROUTER = { na1: 'americas', euw1: 'europe', kr: 'asia', vn2: 'sea' };

async function riotFetch(url) {
  const res = await fetch(url, { headers: { 'X-Riot-Token': RIOT_API_KEY } });
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10);
    console.log(`Rate limited, waiting ${retryAfter}s...`);
    await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
    return riotFetch(url);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  for (const [region, router] of Object.entries(REGION_ROUTER)) {
    console.log(`\n========= ${region.toUpperCase()} (${router}) =========`);
    
    try {
      // Get 1 challenger player
      const ladder = await riotFetch(`https://${region}.api.riotgames.com/tft/league/v1/challenger?queue=RANKED_TFT`);
      const entry = ladder.entries?.[0];
      if (!entry?.puuid) { console.log('No player found'); continue; }
      
      await sleep(1300);
      
      // Get their most recent match
      const matchIds = await riotFetch(
        `https://${router}.api.riotgames.com/tft/match/v1/matches/by-puuid/${entry.puuid}/ids?count=5`
      );
      console.log(`Recent matches: ${matchIds.join(', ')}`);
      
      await sleep(1300);
      
      // Fetch first match detail
      if (matchIds.length > 0) {
        const match = await riotFetch(
          `https://${router}.api.riotgames.com/tft/match/v1/matches/${matchIds[0]}`
        );
        const info = match.info;
        const patchMatch = info.game_version?.match(/Version (\d+\.\d+)/);
        const patch = patchMatch ? patchMatch[1] : 'unknown';
        
        console.log(`  Latest match: ${matchIds[0]}`);
        console.log(`  game_version: "${info.game_version}"`);
        console.log(`  → Parsed patch: ${patch}`);
        console.log(`  tft_set_number: ${info.tft_set_number}`);
        console.log(`  queue_id: ${info.queue_id}`);
        console.log(`  game_datetime: ${new Date(info.game_datetime).toISOString()}`);
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
    
    await sleep(1300);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
