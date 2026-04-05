import fs from 'fs';

const DDRAGON_VERSION = '16.7.1';
const BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US`;

async function fetchJson(file) {
  const url = `${BASE_URL}/${file}`;
  console.log(`Fetching ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 403 || res.status === 404) {
      console.warn(`Could not find ${url}, returning empty objects.`);
      return {};
    }
    throw new Error(`HTTP ${res.status} when fetching ${url}`);
  }
  const json = await res.json();
  return json.data || {};
}

async function updateData() {
  console.log('Fetching DDragon data from CDN...');
  
  const champsData = await fetchJson('tft-champion.json');
  const itemsData = await fetchJson('tft-item.json');
  
  let augmentsData = await fetchJson('tft-augments.json');
  if (Object.keys(augmentsData).length === 0) {
    augmentsData = await fetchJson('tft-augment.json');
  }
  
  const traitsData = await fetchJson('tft-trait.json');

  const champions = Object.values(champsData)
    .filter(c => c.id && c.id.startsWith('TFT16_'))
    .map(c => ({
      id: c.id,
      name: (c.name || '').trim(),
      cost: c.tier || c.cost || 0,
      traits: c.traits || [],
      icon: c.image?.full || '',
      image: c.image || null,
    }));

  const traits = Object.values(traitsData)
    .filter(t => t.id && t.id.startsWith('TFT16_'))
    .map(t => ({
      id: t.id,
      name: (t.name || '').trim(),
      desc: t.description || t.desc || '',
      icon: t.image?.full || '',
    }));

  // Augments: lấy cả TFT_ và TFT16_
  const augments = Object.values(augmentsData)
    .filter(a => a.id && (a.id.startsWith('TFT16_') || a.id.startsWith('TFT_')))
    .map(a => ({
      id: a.id,
      name: (a.name || '').trim(),
      desc: a.description || a.desc || '',
      icon: a.image?.full || '',
    }));

  // Items: lấy cả TFT16_ và TFT_
  const items = Object.values(itemsData)
    .filter(i => i.id && (i.id.startsWith('TFT16_') || i.id.startsWith('TFT_')))
    .map(i => ({
      id: i.id || '',
      name: (i.name || '').trim(),
      desc: i.description || i.desc || '',
      icon: i.image?.full || '',
    }));

  const tsCode = `// AUTO GENERATED FROM RIOT CDN DATA (${DDRAGON_VERSION})

export const GENERATED_CHAMPIONS = ${JSON.stringify(champions, null, 2)};

export const GENERATED_TRAITS = ${JSON.stringify(traits, null, 2)};

export const GENERATED_AUGMENTS = ${JSON.stringify(augments, null, 2)};

export const GENERATED_ITEMS = ${JSON.stringify(items, null, 2)};
`;

  fs.writeFileSync('lib/generated-data.ts', tsCode);
  console.log('Successfully generated lib/generated-data.ts!');
  console.log(`- Champions: ${champions.length}`);
  console.log(`- Traits: ${traits.length}`);
  console.log(`- Augments: ${augments.length}`);
  console.log(`- Items: ${items.length}`);
}

updateData().catch(console.error);
