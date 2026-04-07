import { Router } from 'express';
import prisma from '../lib/prisma';
import { runAggregation } from '../services/aggregation.service';

const router = Router();

// ── Aggregation ──────────────────────────────────────────────────────

router.post('/aggregation/run', async (req, res) => {
  try {
    const patches = await runAggregation();
    res.json({ success: true, message: 'Aggregation completed', patches });
  } catch (error) {
    console.error('POST /api/admin/aggregation/run error:', error);
    res.status(500).json({ error: 'Failed to run aggregation' });
  }
});

// ── Augments ─────────────────────────────────────────────────────────

router.patch('/augments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, tags, meta_tier } = req.body;
    const data: any = {};
    if (tier !== undefined) data.tier = String(tier);
    if (tags !== undefined) data.tags = tags;
    if (meta_tier !== undefined) data.meta_tier = meta_tier;

    const augment = await prisma.augment.update({ where: { id }, data });
    res.json(augment);
  } catch (error) {
    console.error('PATCH /api/admin/augments/:id error:', error);
    res.status(500).json({ error: 'Failed to update augment' });
  }
});

router.post('/augments/bulk', async (req, res) => {
  try {
    const { payload } = req.body;
    if (!Array.isArray(payload)) return res.status(400).json({ error: 'Invalid payload' });

    let updatedCount = 0;
    for (const p of payload) {
      const data: any = {};
      if (p.meta_tier !== undefined) data.meta_tier = p.meta_tier;
      if (p.tier !== undefined) {
        data.tier = p.tier == 3 ? 'Prismatic' : p.tier == 2 ? 'Gold' : 'Silver';
      }
      
      if (Object.keys(data).length === 0) continue;
      
      try {
        await prisma.augment.update({ where: { id: p.id }, data });
        updatedCount++;
      } catch (err) {
        console.error(`Failed to update augment ${p.id}:`, err);
      }
    }

    res.json({ success: true, updated: updatedCount });
  } catch (error) {
    console.error('POST /api/admin/augments/bulk error:', error);
    res.status(500).json({ error: 'Failed to bulk update' });
  }
});

// ── Champions ────────────────────────────────────────────────────────

router.patch('/champions/:id/traits', async (req, res) => {
  try {
    const { id } = req.params;
    const { traits } = req.body;
    if (!Array.isArray(traits)) return res.status(400).json({ error: 'traits must be an array' });

    await prisma.$transaction([
      prisma.championTrait.deleteMany({ where: { champion_id: id } }),
      ...traits.map((t: string) =>
        prisma.championTrait.create({ data: { champion_id: id, trait_name: t } })
      ),
    ]);

    await prisma.champion.update({ where: { id }, data: { traits } });
    res.json({ success: true, champion_id: id, traits });
  } catch (error) {
    console.error('PATCH /api/admin/champions/:id/traits error:', error);
    res.status(500).json({ error: 'Failed to update champion traits' });
  }
});

// Bulk update champion traits — save all champions at once
router.post('/champions/bulk-traits', async (req, res) => {
  try {
    const { payload } = req.body;
    if (!Array.isArray(payload)) return res.status(400).json({ error: 'Invalid payload — expected array' });

    for (const entry of payload) {
      const { champion_id, traits } = entry;
      if (!champion_id || !Array.isArray(traits)) continue;

      await prisma.$transaction([
        prisma.championTrait.deleteMany({ where: { champion_id } }),
        ...traits.map((t: string) =>
          prisma.championTrait.create({ data: { champion_id, trait_name: t } })
        ),
      ]);
      await prisma.champion.update({ where: { id: champion_id }, data: { traits } });
    }

    res.json({ success: true, updated: payload.length });
  } catch (error) {
    console.error('POST /api/admin/champions/bulk-traits error:', error);
    res.status(500).json({ error: 'Failed to bulk update champion traits' });
  }
});

// ── Curated Comps ────────────────────────────────────────────────────

router.get('/comps', async (req, res) => {
  try {
    const comps = await prisma.curatedComp.findMany({
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
    res.json(comps);
  } catch (error) {
    console.error('GET /api/admin/comps error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/comps', async (req, res) => {
  try {
    const comp = await prisma.curatedComp.create({ data: req.body });
    res.json(comp);
  } catch (error) {
    console.error('POST /api/admin/comps error:', error);
    res.status(500).json({ error: 'Failed to create comp' });
  }
});

router.patch('/comps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const comp = await prisma.curatedComp.update({ where: { id }, data: req.body });
    res.json(comp);
  } catch (error) {
    console.error('PATCH /api/admin/comps/:id error:', error);
    res.status(500).json({ error: 'Failed to update comp' });
  }
});

router.delete('/comps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.curatedComp.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/comps/:id error:', error);
    res.status(500).json({ error: 'Failed to delete comp' });
  }
});

router.post('/comps/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const { published } = req.body;
    const comp = await prisma.curatedComp.update({
      where: { id },
      data: { is_published: !!published },
    });
    res.json(comp);
  } catch (error) {
    console.error('POST /api/admin/comps/:id/publish error:', error);
    res.status(500).json({ error: 'Failed to toggle publish' });
  }
});

router.post('/comps/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const original = await prisma.curatedComp.findUnique({ where: { id } });
    if (!original) return res.status(404).json({ error: 'Not found' });

    const duplicate = await prisma.curatedComp.create({
      data: {
        name: `${original.name} (Copy)`,
        tier: original.tier,
        carry_id: original.carry_id,
        playstyle: original.playstyle,
        difficulty: original.difficulty,
        champions: original.champions ?? [],
        early_units: original.early_units ?? [],
        flex_units: original.flex_units ?? [],
        item_priority: original.item_priority ?? [],
        alt_builds: original.alt_builds ?? [],
        augments: original.augments ?? [],
        augment_priority: original.augment_priority ?? [],
        board_positions: original.board_positions ?? [],
        tips: original.tips,
        stage_plans: original.stage_plans ?? [],
        parent_comp_id: original.parent_comp_id,
        variant_label: original.variant_label,
        patch: original.patch,
        sort_order: original.sort_order,
        is_published: false,
      },
    });
    res.json(duplicate);
  } catch (error) {
    console.error('POST /api/admin/comps/:id/duplicate error:', error);
    res.status(500).json({ error: 'Failed to duplicate comp' });
  }
});

// ── Items ────────────────────────────────────────────────────────────

// GET /api/admin/item-tiers — read all admin-assigned item tiers
router.get('/item-tiers', async (req, res) => {
  try {
    const { patch } = req.query;
    const where = patch ? { patch: String(patch) } : {};
    const data = await prisma.itemTier.findMany({ where, orderBy: { item_id: 'asc' } });
    res.json({ data });
  } catch (error) {
    console.error('GET /api/admin/item-tiers error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/items/tier', async (req, res) => {
  try {
    const { itemId, tier, patch } = req.body;
    const result = await prisma.itemTier.upsert({
      where: { item_id_patch: { item_id: itemId, patch } },
      update: { tier },
      create: { item_id: itemId, tier, patch },
    });
    res.json(result);
  } catch (error) {
    console.error('POST /api/admin/items/tier error:', error);
    res.status(500).json({ error: 'Failed to upsert item tier' });
  }
});

router.post('/items/tier/bulk', async (req, res) => {
  try {
    const { items, patch } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid items payload' });

    const ops = items.map((it: any) =>
      prisma.itemTier.upsert({
        where: { item_id_patch: { item_id: it.item_id, patch } },
        update: { tier: it.tier },
        create: { item_id: it.item_id, tier: it.tier, patch },
      })
    );
    await prisma.$transaction(ops);
    res.json({ success: true });
  } catch (error) {
    console.error('POST /api/admin/items/tier/bulk error:', error);
    res.status(500).json({ error: 'Failed to bulk upsert' });
  }
});

// ── Insights ─────────────────────────────────────────────────────────

router.get('/insights', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status: String(status) } : {};
    const insights = await prisma.insight.findMany({ where, orderBy: { created_at: 'desc' } });
    res.json(insights);
  } catch (error) {
    console.error('GET /api/admin/insights error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/insights', async (req, res) => {
  try {
    const insight = await prisma.insight.create({ data: req.body });
    res.json(insight);
  } catch (error) {
    console.error('POST /api/admin/insights error:', error);
    res.status(500).json({ error: 'Failed to create insight' });
  }
});

router.patch('/insights/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const insight = await prisma.insight.update({ where: { id }, data: req.body });
    res.json(insight);
  } catch (error) {
    console.error('PATCH /api/admin/insights/:id error:', error);
    res.status(500).json({ error: 'Failed to update insight' });
  }
});

export default router;
