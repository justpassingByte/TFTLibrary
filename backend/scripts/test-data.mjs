import fs from 'fs';

const champData = JSON.parse(fs.readFileSync('tft-champ-raw.json', 'utf8'));
const itemData = JSON.parse(fs.readFileSync('tft-item-raw.json', 'utf8'));

// 1. Process Champions (Filter Set 16)
const tft16Champs = Object.values(champData.data).filter(c => c.id.startsWith('TFT16_'));

// 2. Process Items
// According to Data Dragon, items might have a 'tags' array or we can guess by name.
const tftItems = Object.values(itemData.data).filter(i => {
  // Simple heuristic: Only include standard items or those starting with TFT_Item
  // Also augments often have "Augment" or specific tags.
  return true; 
});

// We'll dump them and look at standard item/augment structure.
const sampleAugments = tftItems.filter(i => i.name.includes('Lotus') || i.name.includes('Level Up'));
console.log('Sample Augments:', sampleAugments.map(i => ({ name: i.name, image: i.image.full })));

const sampleItems = tftItems.filter(i => i.name === 'B. F. Sword' || i.name === 'Infinity Edge');
console.log('Sample Items:', sampleItems.map(i => ({ name: i.name, image: i.image.full })));
