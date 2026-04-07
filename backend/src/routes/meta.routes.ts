import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// ══════════════════════════════════════════════════════════════
// Static Game Data (unchanged)
// ══════════════════════════════════════════════════════════════

// GET /api/meta/champions — with trait join
router.get('/champions', async (req, res) => {
  try {
    const { set_prefix } = req.query;
    const where = set_prefix ? { set_prefix: String(set_prefix) } : {};
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
    const where = set_prefix ? { set_prefix: String(set_prefix) } : {};
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
    const where = set_prefix ? { set_prefix: String(set_prefix) } : {};
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
    const data = await prisma.item.findMany({ orderBy: { name: 'asc' } });
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
// Analytics Stats Endpoints (granular, per-entity)
// ══════════════════════════════════════════════════════════════

// GET /api/meta/stats/patches — available patches
router.get('/stats/patches', async (req, res) => {
  try {
    const data = await prisma.championStat.findMany({
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
    const { patch } = req.query;
    const where = patch ? { patch: String(patch) } : {};
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
    const { patch, champion_id, item_name, limit } = req.query;
    const where: any = {};
    if (patch) where.patch = String(patch);
    if (champion_id) where.champion_id = String(champion_id);
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
    const { patch } = req.query;
    const where = patch ? { patch: String(patch) } : {};
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
    const { patch } = req.query;
    const where = patch ? { patch: String(patch) } : {};
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

export default router;
