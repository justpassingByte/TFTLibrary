import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// ══════════════════════════════════════════════════════════════
// Static Game Data (unchanged)
// ══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

function getActiveSet() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')).active_set || 'TFT16';
    }
  } catch (e) {}
  return 'TFT16';
}

// GET /api/meta/champions — with trait join
router.get('/champions', async (req, res) => {
  try {
    const { set_prefix } = req.query;
    const isUndef = !set_prefix || set_prefix === 'undefined' || set_prefix === 'null';
    const targetPrefix = isUndef ? getActiveSet() : String(set_prefix);
    const where = targetPrefix === 'all' ? {} : { set_prefix: targetPrefix };
    const data = await prisma.champion.findMany({
      where,
      include: { champion_traits: true },
      orderBy: { name: 'asc' },
    });
    const result = data.map(c => ({
      id: c.id,
      name: c.name,
      cost: c.cost,
      icon: c.icon,
      set_prefix: c.set_prefix,
      traits: c.champion_traits.map(ct => ct.trait_name),
    }));
    res.json(result);
  } catch (error) {
    console.error('GET /api/meta/champions error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/meta/traits
router.get('/traits', async (req, res) => {
  try {
    const { set_prefix } = req.query;
    const isUndef = !set_prefix || set_prefix === 'undefined' || set_prefix === 'null';
    const targetPrefix = isUndef ? getActiveSet() : String(set_prefix);
    const where = targetPrefix === 'all' ? {} : { set_prefix: targetPrefix };
    const data = await prisma.trait.findMany({ where, orderBy: { name: 'asc' } });
    res.json(data);
  } catch (error) {
    console.error('GET /api/meta/traits error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/meta/augments
router.get('/augments', async (req, res) => {
  try {
    const { set_prefix } = req.query;
    const isUndef = !set_prefix || set_prefix === 'undefined' || set_prefix === 'null';
    const targetPrefix = isUndef ? getActiveSet() : String(set_prefix);
    const where = targetPrefix === 'all' ? {} : { set_prefix: { contains: targetPrefix } };
    const augments = await prisma.augment.findMany({ where, orderBy: { name: 'asc' } });
    res.json(augments);
  } catch (error) {
    console.error('GET /api/meta/augments error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/meta/items
router.get('/items', async (req, res) => {
  try {
    const { set_prefix } = req.query;
    const isUndef = !set_prefix || set_prefix === 'undefined' || set_prefix === 'null';
    const targetPrefix = isUndef ? getActiveSet() : String(set_prefix);
    const where = targetPrefix === 'all' 
       ? {} 
       : { set_prefix: { contains: targetPrefix } };
    const data = await prisma.item.findMany({ where, orderBy: { name: 'asc' } });
    res.json(data);
  } catch (error) {
    console.error('GET /api/meta/items error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ══════════════════════════════════════════════════════════════
// Curated Comps — Public (admin-created, published only)
// ══════════════════════════════════════════════════════════════

router.get('/test-endpoint', (req, res) => {
  res.json({ success: true, message: 'Meta routes are live' });
});

// GET /api/meta/curated-comps — returns published comps for the frontend
router.get('/curated-comps', async (req, res) => {
  try {
    const { patch } = req.query;
    const where: any = { is_published: true, parent_comp_id: null };
    if (patch) where.patch = String(patch);

    const comps = await prisma.curatedComp.findMany({
      where,
      orderBy: [{ tier: 'asc' }, { sort_order: 'asc' }],
    });

    // Fetch variants for parent comps
    const parentIds = comps.map(c => c.id);
    const variants = parentIds.length > 0
      ? await prisma.curatedComp.findMany({
          where: { parent_comp_id: { in: parentIds }, is_published: true },
          orderBy: { sort_order: 'asc' },
        })
      : [];

    const variantMap: Record<string, typeof variants> = {};
    variants.forEach(v => {
      if (!v.parent_comp_id) return;
      if (!variantMap[v.parent_comp_id]) variantMap[v.parent_comp_id] = [];
      variantMap[v.parent_comp_id].push(v);
    });

    const result = comps.map(c => ({
      ...c,
      variants: variantMap[c.id] || [],
    }));

    // Build traitsMap from champion_traits table
    const champTraits = await prisma.championTrait.findMany();
    const traitsMap: Record<string, string[]> = {};
    champTraits.forEach(ct => {
      if (!traitsMap[ct.champion_id]) traitsMap[ct.champion_id] = [];
      traitsMap[ct.champion_id].push(ct.trait_name);
    });

    console.log('[DEBUG] curated-comps hit! Length:', result.length);
    res.json({ data: result, traitsMap });
  } catch (error) {
    console.error('GET /api/meta/curated-comps error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ══════════════════════════════════════════════════════════════
// Sets Discovery
// ══════════════════════════════════════════════════════════════

// GET /api/meta/sets — all available set prefixes
router.get('/sets', async (req, res) => {
  try {
    const data = await prisma.champion.findMany({
      select: { set_prefix: true },
      distinct: ['set_prefix'],
      orderBy: { set_prefix: 'asc' },
    });
    
    // Chỉ lấy set_prefix thực tế từ list Tướng – đây là cách chính xác nhất để biết Set nào thực sự có data.
    const sets = data.map(d => d.set_prefix).filter(Boolean);

    // Nếu list Tướng chưa được sync (rỗng), ta phải trả về một Set mặc định (ví dụ TFT16)
    // để UI không bị "trắng trắng" cái Dropdown ở Sidebar. 
    if (sets.length === 0) {
      sets.push(getActiveSet() || 'TFT16');
    }

    res.json(sets);
  } catch (error) {
    console.error('GET /api/meta/sets error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ══════════════════════════════════════════════════════════════
// Analytics Stats Endpoints (granular, per-entity)
// ══════════════════════════════════════════════════════════════

// GET /api/meta/stats/patches — available patches, optionally filtered by set_prefix
router.get('/stats/patches', async (req, res) => {
  try {
    const { set_prefix } = req.query;
    let where: any = {};

    // If set_prefix is provided, only return patches that have champion IDs starting with that prefix
    if (set_prefix && set_prefix !== 'all') {
      where.champion_id = { startsWith: String(set_prefix) };
    }

    const data = await prisma.championStat.findMany({
      where,
      select: { patch: true },
      distinct: ['patch'],
    });
    res.json(data.map(d => d.patch).sort((a,b) => b.localeCompare(a)));
  } catch (error) {
    console.error('GET /api/meta/stats/patches error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/meta/stats/champions — per-champion performance
router.get('/stats/champions', async (req, res) => {
  try {
    const { patch, set_prefix } = req.query;
    const where: any = patch ? { patch: String(patch) } : {};
    if (set_prefix && set_prefix !== 'all') {
      where.champion_id = { startsWith: String(set_prefix) };
    }
    const data = await prisma.championStat.findMany({
      where,
      orderBy: { games: 'desc' },
    });
    res.json(data);
  } catch (error) {
    console.error('GET /api/meta/stats/champions error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/meta/stats/items — per-item performance
router.get('/stats/items', async (req, res) => {
  try {
    const { patch } = req.query;
    const where = patch ? { patch: String(patch) } : {};
    const data = await prisma.itemStat.findMany({
      where,
      orderBy: { usage_count: 'desc' },
    });
    res.json(data);
  } catch (error) {
    console.error('GET /api/meta/stats/items error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/meta/stats/item-champions — which items work best on which champ
router.get('/stats/item-champions', async (req, res) => {
  try {
    const { patch, champion_id, item_name, limit, set_prefix } = req.query;
    const where: any = {};
    if (patch) where.patch = String(patch);
    if (champion_id) where.champion_id = String(champion_id);
    else if (set_prefix && set_prefix !== 'all') where.champion_id = { startsWith: String(set_prefix) };
    if (item_name) where.item_name = String(item_name);

    const data = await prisma.itemChampionStat.findMany({
      where,
      orderBy: { games: 'desc' },
      take: limit ? parseInt(String(limit), 10) : 500,
    });
    res.json(data);
  } catch (error) {
    console.error('GET /api/meta/stats/item-champions error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/meta/stats/augments — per-augment performance
router.get('/stats/augments', async (req, res) => {
  try {
    const { patch, set_prefix } = req.query;
    const where: any = patch ? { patch: String(patch) } : {};
    if (set_prefix && set_prefix !== 'all') {
      where.augment_id = { startsWith: String(set_prefix) };
    }
    const data = await prisma.augmentStat.findMany({
      where,
      orderBy: { sample_count: 'desc' },
    });
    res.json(data);
  } catch (error) {
    console.error('GET /api/meta/stats/augments error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/meta/stats/traits — per-trait-tier performance
router.get('/stats/traits', async (req, res) => {
  try {
    const { patch, set_prefix } = req.query;
    const where: any = patch ? { patch: String(patch) } : {};
    if (set_prefix && set_prefix !== 'all') {
      where.trait_name = { startsWith: String(set_prefix) };
    }
    const data = await prisma.traitStat.findMany({
      where,
      orderBy: { sample_count: 'desc' },
    });
    res.json(data);
  } catch (error) {
    console.error('GET /api/meta/stats/traits error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/meta/stats/overview — aggregated totals for analytics dashboard
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      championCount,
      itemCount,
      augmentCount,
      traitCount,
      matchCount,
      playerCount,
      champStatCount,
      itemStatCount,
      itemChampStatCount,
      latestMatch
    ] = await Promise.all([
      prisma.champion.count(),
      prisma.item.count(),
      prisma.augment.count(),
      prisma.trait.count(),
      prisma.match.count(),
      prisma.playerMatch.count(),
      prisma.championStat.count(),
      prisma.itemStat.count(),
      prisma.itemChampionStat.count(),
      prisma.match.findFirst({
        orderBy: { game_datetime: 'desc' },
        select: { patch: true, game_datetime: true }
      })
    ]);

    res.json({
      totals: {
        matches: matchCount,
        players: playerCount,
        champions: championCount,
        items: itemCount,
        augments: augmentCount,
        traits: traitCount,
      },
      stats: {
        champion_stats: champStatCount,
        item_stats: itemStatCount,
        item_champion_stats: itemChampStatCount,
      },
      system: {
        version: latestMatch?.patch || 'N/A',
        last_updated: latestMatch?.game_datetime || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('GET /api/meta/stats/overview error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ══════════════════════════════════════════════════════════════
// Patch Notes — Public (consumed by /patch-notes page)
// ══════════════════════════════════════════════════════════════

router.get('/patch-notes', async (req, res) => {
  try {
    const { patch, set_prefix } = req.query;

    let targetPatch = patch as string;
    if (!targetPatch || targetPatch === 'latest') {
      const latest = await prisma.patchChange.findFirst({
        orderBy: { created_at: 'desc' },
        select: { patch: true },
      });
      targetPatch = latest?.patch || '';
    }

    if (!targetPatch) return res.json({ version: '', changes: [], predictions: [] });

    // Allow set_prefix filtering for accurate icons
    const isUndef = !set_prefix || set_prefix === 'undefined' || set_prefix === 'null';
    const targetPrefix = isUndef ? getActiveSet() : String(set_prefix);
    const metaWhere = { set_prefix: { contains: targetPrefix } };

    const [changes, predictions, champIcons, traitIcons, augmentIcons, itemIcons] = await Promise.all([
      prisma.patchChange.findMany({
        where: { patch: targetPatch },
        orderBy: [{ change_type: 'asc' }, { score: 'desc' }],
      }),
      prisma.patchMetaPrediction.findMany({
        where: { patch: targetPatch },
        orderBy: { sort_order: 'asc' },
      }),
      prisma.champion.findMany({ where: metaWhere, select: { id: true, name: true, icon: true } }),
      prisma.trait.findMany({ where: metaWhere, select: { id: true, name: true, icon: true } }),
      prisma.augment.findMany({ where: metaWhere, select: { id: true, name: true, icon: true } }),
      // @ts-ignore
      prisma.item?.findMany ? prisma.item.findMany({ where: metaWhere, select: { id: true, name: true, icon: true } }) : Promise.resolve([])
    ]);

    const iconMap = new Map<string, string>();
    const idMap = new Map<string, string>();
    const champNames = new Set<string>();
    const traitNames = new Set<string>();
    const augmentNames = new Set<string>();
    const itemNames = new Set<string>();

    champIcons.forEach(x => { if(x.name) { const n = x.name.toLowerCase().trim(); iconMap.set(n, x.icon || ''); idMap.set(n, x.id || ''); champNames.add(n); } });
    traitIcons.forEach(x => { if(x.name) { const n = x.name.toLowerCase().trim(); iconMap.set(n, x.icon || ''); idMap.set(n, x.id || ''); traitNames.add(n); } });
    augmentIcons.forEach(x => { if(x.name) { const n = x.name.toLowerCase().trim(); iconMap.set(n, x.icon || ''); idMap.set(n, x.id || ''); augmentNames.add(n); } });
    itemIcons.forEach(x => { if(x.name) { const n = x.name.toLowerCase().trim(); iconMap.set(n, x.icon || ''); idMap.set(n, x.id || ''); itemNames.add(n); } });

    const getIconUrl = (iconPath: string) => {
      if (!iconPath) return '';
      // DB now stores full HTTPS URLs — pass through directly
      if (iconPath.startsWith('http')) return iconPath;
      // Fallback for any legacy relative paths
      return `https://raw.communitydragon.org/latest/game/${iconPath}`;
    };

    const finalChanges: any[] = [];
    changes.forEach(c => {
      const entNorm = c.entity.toLowerCase().trim();
      const hasMapping = champNames.has(entNorm) || traitNames.has(entNorm) || augmentNames.has(entNorm) || itemNames.has(entNorm) || iconMap.has(entNorm);
      
      // Strict Set Filter: If entity doesn't match our current set dictionary, and isn't a system change, drop it!
      if (!hasMapping && c.entity_type !== 'system') return;

      let actualType = c.entity_type;
      // Fix misidentified entities
      if (champNames.has(entNorm)) actualType = 'unit';
      else if (traitNames.has(entNorm)) actualType = 'trait';
      else if (augmentNames.has(entNorm)) actualType = 'augment';

      finalChanges.push({
        entity: c.entity,
        entity_id: idMap.get(entNorm) || '',
        type: actualType,
        changeType: c.change_type,
        stat: c.before_val && c.after_val ? `${c.stat}: ${c.before_val} → ${c.after_val}` : (c.stat || c.raw_text),
        score: c.score,
        tier: c.tier,
        iconUrl: getIconUrl(iconMap.get(entNorm) || '')
      });
    });

    res.json({
      version: targetPatch,
      changes: finalChanges,
      predictions: predictions.map(p => ({
        name: p.name,
        tier: p.tier,
        score: p.score,
        reason: p.reason,
        keyUnits: p.key_units,
        buffedEntities: p.buffed_entities,
        nerfedEntities: p.nerfed_entities,
      })),
    });
  } catch (error) {
    console.error('GET /api/meta/patch-notes error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
