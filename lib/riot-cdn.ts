export const DDRAGON_VERSION = '16.7.1';
const CDN = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img`;

// Champion: /img/tft-champion/{image.full}
export function getChampionImageUrl(iconFilename: string): string {
  if (!iconFilename) return '';
  return `${CDN}/tft-champion/${iconFilename}`;
}

// Item: /img/tft-item/{image.full}
export function getItemImageUrl(iconFilename: string): string {
  if (!iconFilename) return '';
  return `${CDN}/tft-item/${iconFilename}`;
}

// Augment: /img/tft-augment/{image.full}
export function getAugmentImageUrl(iconFilename: string): string {
  if (!iconFilename) return '';
  return `${CDN}/tft-augment/${iconFilename}`;
}

export function getTraitImageUrl(iconFilename: string): string {
  if (!iconFilename) return '';
  return `${CDN}/tft-trait/${iconFilename}`;
}
