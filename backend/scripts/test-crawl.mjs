/**
 * Quick test: Can we fetch & parse Riot TFT patch notes?
 * Tests both auto-detection and content parsing.
 */

const INDEX_URL = 'https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/';

async function testAutoDetect() {
  console.log('=== TEST 1: Auto-detect latest patch from index page ===\n');
  
  try {
    const res = await fetch(INDEX_URL);
    console.log(`  Status: ${res.status}`);
    const html = await res.text();
    console.log(`  HTML length: ${html.length} chars`);
    
    // Look for patch links in the HTML
    const patchPattern = /teamfight-tactics-patch-(\d+)-(\d+)/g;
    const matches = [...html.matchAll(patchPattern)];
    const uniquePatches = [...new Set(matches.map(m => `${m[1]}.${m[2]}`))];
    
    console.log(`  Found patches: ${uniquePatches.join(', ')}`);
    
    if (uniquePatches.length > 0) {
      const latest = uniquePatches[0];
      console.log(`  ✅ Latest patch detected: ${latest}`);
      return latest;
    } else {
      console.log('  ❌ No patches found in HTML. Trying JSON/API approach...');
      
      // Some Riot pages load data via embedded JSON
      const jsonPattern = /"url"[^}]*?teamfight-tactics-patch-(\d+)-(\d+)/g;
      const jsonMatches = [...html.matchAll(jsonPattern)];
      if (jsonMatches.length > 0) {
        const latest = `${jsonMatches[0][1]}.${jsonMatches[0][2]}`;
        console.log(`  ✅ Found via JSON embed: ${latest}`);
        return latest;
      }
      
      console.log('  ❌ Could not auto-detect. Dumping first 2000 chars of HTML:');
      console.log(html.substring(0, 2000));
      return null;
    }
  } catch (err) {
    console.log(`  ❌ Fetch failed: ${err.message}`);
    return null;
  }
}

async function testParsePatchNotes(patchVersion) {
  const slug = `teamfight-tactics-patch-${patchVersion.replace('.', '-')}`;
  const url = `https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/${slug}/`;
  
  console.log(`\n=== TEST 2: Fetch patch ${patchVersion} content ===`);
  console.log(`  URL: ${url}\n`);
  
  try {
    const res = await fetch(url);
    console.log(`  Status: ${res.status}`);
    
    if (!res.ok) {
      console.log(`  ❌ HTTP ${res.status} — page not found or blocked`);
      return;
    }
    
    const html = await res.text();
    console.log(`  HTML length: ${html.length} chars`);
    
    // Extract text content - look for the patch notes content
    // Riot pages typically have content in specific data attributes or script tags
    
    // Method 1: Look for article content in HTML
    const contentPatterns = [
      // Direct text content between tags
      /⇒/g,
      // Arrow character used in all patch note changes
    ];
    
    const arrowCount = (html.match(/⇒/g) || []).length;
    console.log(`  Arrow (⇒) occurrences: ${arrowCount}`);
    
    if (arrowCount > 0) {
      console.log('  ✅ Patch note changes detected in HTML!');
    }
    
    // Method 2: Extract from embedded JSON data (Next.js/React hydration)
    const scriptDataPattern = /<script[^>]*>.*?"patch".*?<\/script>/gs;
    const scriptMatches = html.match(scriptDataPattern);
    console.log(`  Script tags with "patch" data: ${scriptMatches?.length || 0}`);
    
    // Method 3: Look for specific section headers
    const sections = ['SYSTEM CHANGES', 'LARGE CHANGES', 'BUG FIXES', 'TRAITS', 'UNITS'];
    for (const section of sections) {
      const found = html.includes(section);
      console.log(`  Section "${section}": ${found ? '✅' : '❌'}`);
    }
    
    // Try to extract actual change lines
    console.log('\n  --- Sample parsed changes ---');
    
    // Strip HTML tags for plain text extraction
    const plainText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n');
    
    // Find lines with the arrow character
    const changeLines = plainText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.includes('⇒') && l.length > 10);
    
    console.log(`  Total change lines found: ${changeLines.length}`);
    
    if (changeLines.length > 0) {
      console.log('\n  First 10 changes:');
      changeLines.slice(0, 10).forEach((line, i) => {
        console.log(`    ${i + 1}. ${line}`);
      });
      
      // Test parsing one line
      console.log('\n  --- Parse test on first line ---');
      const testLine = changeLines[0];
      const arrowSplit = testLine.split('⇒');
      if (arrowSplit.length === 2) {
        const beforePart = arrowSplit[0].trim();
        const afterPart = arrowSplit[1].trim();
        
        // Extract entity name and stat
        const colonIdx = beforePart.indexOf(':');
        if (colonIdx > -1) {
          const entityAndStat = beforePart.substring(0, colonIdx);
          const beforeValue = beforePart.substring(colonIdx + 1).trim();
          console.log(`    Entity+Stat: "${entityAndStat}"`);
          console.log(`    Before: "${beforeValue}"`);
          console.log(`    After: "${afterPart}"`);
        }
      }
      
      console.log('\n  ✅ PARSING IS FEASIBLE — data is extractable!');
    } else {
      console.log('  ❌ No change lines found. Content might be client-rendered (SPA).');
      console.log('  Dumping a sample of plain text:');
      console.log(plainText.substring(0, 3000));
    }
    
    // Also check for qualitative changes (no arrow)
    const qualitativePatterns = [
      /is now (?:a |also a )/i,
      /NEW/,
      /has been (?:re-enabled|disabled)/i,
    ];
    
    const qualitativeLines = plainText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 10 && qualitativePatterns.some(p => p.test(l)));
    
    if (qualitativeLines.length > 0) {
      console.log(`\n  Qualitative changes found: ${qualitativeLines.length}`);
      qualitativeLines.slice(0, 5).forEach((line, i) => {
        console.log(`    ${i + 1}. ${line}`);
      });
    }
    
  } catch (err) {
    console.log(`  ❌ Fetch failed: ${err.message}`);
  }
}

async function main() {
  console.log('🔍 TFT Patch Notes Crawl Feasibility Test\n');
  console.log(`  Node version: ${process.version}`);
  console.log(`  Time: ${new Date().toISOString()}\n`);
  
  const latestPatch = await testAutoDetect();
  
  if (latestPatch) {
    await testParsePatchNotes(latestPatch);
  } else {
    // Fallback: try 16.8 directly
    console.log('\n  Falling back to hardcoded 16.8 for content test...');
    await testParsePatchNotes('16.8');
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

main().catch(console.error);
