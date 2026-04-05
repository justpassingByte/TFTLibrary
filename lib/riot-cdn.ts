import { GENERATED_CHAMPIONS, GENERATED_ITEMS, GENERATED_AUGMENTS, GENERATED_TRAITS } from './generated-data';

export const DDRAGON_VERSION = '16.7.1';
const CDN = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img`;

// Champion: /img/tft-champion/{image.full}
export function getChampionImageUrl(nameOrId: string): string {
  if (!nameOrId) return '';
  const champ = GENERATED_CHAMPIONS.find(c => c.name === nameOrId || c.id === nameOrId);
  if (champ?.icon) return `${CDN}/tft-champion/${champ.icon}`;
  return '';
}

// Item: /img/tft-item/{image.full}
export function getItemImageUrl(itemIdOrName: string): string {
  if (!itemIdOrName) return '';
  const item = GENERATED_ITEMS.find(i => i.name === itemIdOrName || i.id === itemIdOrName);
  if (item?.icon) return `${CDN}/tft-item/${item.icon}`;
  return '';
}

// Augment: /img/tft-augment/{image.full}
export function getAugmentImageUrl(nameOrId: string): string {
  if (!nameOrId) return '';
  const aug = GENERATED_AUGMENTS.find(a => a.name === nameOrId || a.id === nameOrId);
  if (aug?.icon) return `${CDN}/tft-augment/${aug.icon}`;
  return '';
}

// Trait: /img/tft-trait/{image.full}
export function getTraitImageUrl(nameOrId: string): string {
  if (!nameOrId) return '';
  const trait = GENERATED_TRAITS.find(t => t.name === nameOrId || t.id === nameOrId);
  if (trait?.icon) return `${CDN}/tft-trait/${trait.icon}`;
  return '';
}

export function getAllChampions() {
  return GENERATED_CHAMPIONS.map(c => ({
    name: c.name,
    imageUrl: getChampionImageUrl(c.id),
  }));
}
