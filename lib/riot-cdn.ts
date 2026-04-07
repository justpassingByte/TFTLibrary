export const DDRAGON_VERSION = '16.7.1';
const CDN = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img`;

function resolveImagePath(filename: string, ddragonFolder: string) {
  if (!filename) return '';
  
  // Full URLs (CDragon pre-computed or Supabase) — pass through directly
  if (filename.startsWith('http')) return filename;

  return `${CDN}/${ddragonFolder}/${filename}`;
}

export function getChampionImageUrl(iconFilename: string): string {
  return resolveImagePath(iconFilename, 'tft-champion');
}

export function getItemImageUrl(iconFilename: string): string {
  return resolveImagePath(iconFilename, 'tft-item');
}

export function getAugmentImageUrl(iconFilename: string): string {
  return resolveImagePath(iconFilename, 'tft-augment');
}

export function getTraitImageUrl(iconFilename: string): string {
  return resolveImagePath(iconFilename, 'tft-trait');
}
