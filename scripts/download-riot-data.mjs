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

  // Tải file mapping trait thủ công (nếu có)
  const champTraitMappingPath = 'lib/champion-traits.json';
  let manualChampTraits = {};
  try {
    if (fs.existsSync(champTraitMappingPath)) {
      manualChampTraits = JSON.parse(fs.readFileSync(champTraitMappingPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading champion-traits.json:', err);
  }

  const champions = Object.values(champsData)
    .filter(c => c.id && c.id.startsWith('TFT16_'))
    .map(c => {
      let traits = manualChampTraits[c.id];
      if (!traits) {
        traits = c.traits || [];
        // Nếu không có trait nào, thử đọc từ object gốc nếu cấu trúc khác thường (fallback)
        manualChampTraits[c.id] = traits;
      }

      return {
        id: c.id,
        name: (c.name || '').trim(),
        cost: c.tier || c.cost || 0,
        traits,
        icon: c.image?.full || '',
        image: c.image || null,
      };
    });

  // Ghi lại file mapping để user sửa thủ công
  fs.writeFileSync(champTraitMappingPath, JSON.stringify(manualChampTraits, null, 2));

  const traits = Object.values(traitsData)
    .filter(t => t.id && t.id.startsWith('TFT16_'))
    .map(t => ({
      id: t.id,
      name: (t.name || '').trim(),
      desc: t.description || t.desc || '',
      icon: t.image?.full || '',
    }));

  // Tải file mapping tier thủ công (nếu có)
  const tierMappingPath = 'lib/augment-tiers.json';
  let manualTiers = {};
  try {
    if (fs.existsSync(tierMappingPath)) {
      manualTiers = JSON.parse(fs.readFileSync(tierMappingPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading generic augment-tiers.json:', err);
  }

  // Augments: lấy cả TFT_ và TFT16_
  const augments = Object.values(augmentsData)
    .filter(a => a.id && (a.id.startsWith('TFT16_') || a.id.startsWith('TFT_')))
    .map(a => {
      let tier = manualTiers[a.id] || 'Unknown';
      
      // Khởi tạo tier ban đầu nếu chưa có trong DB thủ công
      if (tier === 'Unknown') {
        const name = (a.name || '').toLowerCase();
        const id = (a.id || '').toLowerCase();

        if (name.includes('silver')) tier = 'Silver';
        else if (name.includes('prismatic')) tier = 'Prismatic';
        else if (name.includes('gold') || name.includes('golden')) tier = 'Gold';
        else if (id.includes('silver')) tier = 'Silver';
        else if (id.includes('prismatic')) tier = 'Prismatic';
        else if (id.includes('gold')) tier = 'Gold';
        else if (id.endsWith('1') || id.endsWith('_i')) tier = 'Silver';
        else if (id.endsWith('3') || id.endsWith('_iii')) tier = 'Prismatic';
        else if (id.endsWith('2') || id.endsWith('_ii')) tier = 'Gold';
        else tier = 'Gold'; // Mặc định nếu không đoán được

        manualTiers[a.id] = tier; // Lưu vào map để ghi file
      }

      return {
        id: a.id,
        name: (a.name || '').trim(),
        desc: a.description || a.desc || '',
        icon: a.image?.full || '',
        tier,
      };
    });

  // Ghi lại file mapping để user sửa thủ công
  fs.writeFileSync(tierMappingPath, JSON.stringify(manualTiers, null, 2));

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
