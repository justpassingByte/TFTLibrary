import { Router } from 'express';
import prisma from '../lib/prisma';
import { runAggregation } from '../services/aggregation.service';

const router = Router();

import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

// ── Settings (Active Set etc) ────────────────────────────────────────

router.get('/settings', (req, res) => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      res.json(data);
    } else {
      res.json({ active_set: 'TFT16' });
    }
  } catch (e) {
    res.json({ active_set: 'TFT16' });
  }
});

router.post('/settings', (req, res) => {
  try {
    const { active_set } = req.body;
    const current = fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) : {};
    current.active_set = active_set || 'TFT16';

    if (!fs.existsSync(path.dirname(SETTINGS_FILE))) {
      fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
    res.json({ success: true, settings: current });
  } catch (e) {
    console.error('POST /api/admin/settings error:', e);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ── Set Management ───────────────────────────────────────────────────

// Helper: read/write managed sets from settings.json
function getManagedSets(): { prefix: string; label: string; env: string; created_at: string }[] {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return data.managed_sets || [];
    }
  } catch (e) { }
  return [];
}

function saveManagedSets(sets: { prefix: string; label: string; env: string; created_at: string }[]) {
  const current = fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) : {};
  current.managed_sets = sets;
  if (!fs.existsSync(path.dirname(SETTINGS_FILE))) {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
}

// GET /api/admin/sets — list all sets (managed + discovered from DB)
router.get('/sets', async (req, res) => {
  try {
    const managedSets = getManagedSets();

    // Discover sets from champion data
    const dbSets = await prisma.champion.findMany({
      select: { set_prefix: true },
      distinct: ['set_prefix'],
      orderBy: { set_prefix: 'asc' },
    });
    const dbPrefixes = dbSets.map(d => d.set_prefix).filter(Boolean);

    // Count entities per set
    const setCounts: Record<string, { champions: number; traits: number; augments: number; items: number }> = {};
    for (const prefix of dbPrefixes) {
      const [champCount, traitCount, augCount, itemCount] = await Promise.all([
        prisma.champion.count({ where: { set_prefix: prefix } }),
        prisma.trait.count({ where: { set_prefix: prefix } }),
        prisma.augment.count({ where: { set_prefix: { contains: prefix } } }),
        prisma.item.count({ where: { set_prefix: { contains: prefix } } }),
      ]);
      setCounts[prefix] = { champions: champCount, traits: traitCount, augments: augCount, items: itemCount };
    }

    // Read active set
    let activeSet = 'TFT16';
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        activeSet = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')).active_set || 'TFT16';
      }
    } catch (e) { }

    // Merge: managed + discovered (avoid duplicates)
    const allPrefixes = new Set<string>();
    const result: any[] = [];

    // Add managed sets first
    managedSets.forEach(s => {
      allPrefixes.add(s.prefix);
      result.push({
        ...s,
        is_active: s.prefix === activeSet,
        has_data: dbPrefixes.includes(s.prefix),
        counts: setCounts[s.prefix] || { champions: 0, traits: 0, augments: 0, items: 0 },
        source: 'managed',
      });
    });

    // Add discovered (DB-only) sets
    dbPrefixes.forEach(prefix => {
      if (!allPrefixes.has(prefix)) {
        allPrefixes.add(prefix);
        result.push({
          prefix,
          label: prefix.replace('TFT', 'Set '),
          env: 'live',
          created_at: new Date().toISOString(),
          is_active: prefix === activeSet,
          has_data: true,
          counts: setCounts[prefix] || { champions: 0, traits: 0, augments: 0, items: 0 },
          source: 'discovered',
        });
      }
    });

    res.json({ sets: result, active_set: activeSet });
  } catch (error) {
    console.error('GET /api/admin/sets error:', error);
    res.status(500).json({ error: 'Failed to list sets' });
  }
});

// POST /api/admin/sets — add a new managed set
router.post('/sets', (req, res) => {
  try {
    const { prefix, label, env } = req.body;
    if (!prefix) return res.status(400).json({ error: 'prefix is required' });

    const normalizedPrefix = prefix.toUpperCase().trim();
    const sets = getManagedSets();

    // Check for duplicate
    if (sets.find(s => s.prefix === normalizedPrefix)) {
      return res.status(409).json({ error: `Set "${normalizedPrefix}" already exists` });
    }

    const newSet = {
      prefix: normalizedPrefix,
      label: label || normalizedPrefix.replace('TFT', 'Set '),
      env: env || 'pbe',
      created_at: new Date().toISOString(),
    };

    sets.push(newSet);
    saveManagedSets(sets);

    res.json({ success: true, set: newSet });
  } catch (error) {
    console.error('POST /api/admin/sets error:', error);
    res.status(500).json({ error: 'Failed to add set' });
  }
});

// DELETE /api/admin/sets/:prefix — remove a managed set (does NOT delete DB data)
router.delete('/sets/:prefix', (req, res) => {
  try {
    const { prefix } = req.params;
    const sets = getManagedSets();
    const filtered = sets.filter(s => s.prefix !== prefix.toUpperCase());
    saveManagedSets(filtered);
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/sets/:prefix error:', error);
    res.status(500).json({ error: 'Failed to delete set' });
  }
});

// POST /api/admin/sets/:prefix/activate — set as active
router.post('/sets/:prefix/activate', (req, res) => {
  try {
    const { prefix } = req.params;
    const current = fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) : {};
    current.active_set = prefix.toUpperCase();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
    res.json({ success: true, active_set: current.active_set });
  } catch (error) {
    console.error('POST /api/admin/sets/:prefix/activate error:', error);
    res.status(500).json({ error: 'Failed to activate set' });
  }
});

// POST /api/admin/sets/:prefix/purge — delete all DB data for a set
router.post('/sets/:prefix/purge', async (req, res) => {
  try {
    const prefix = req.params.prefix.toUpperCase();

    // Helper to safely purge entities with comma-separated prefixes
    const purgeShared = async (modelName: 'champion' | 'trait' | 'augment' | 'item') => {
      const model = prisma[modelName] as any;
      let deletedCount = 0;

      // 1. Exact match -> just delete
      const exactDel = await model.deleteMany({ where: { set_prefix: prefix } });
      deletedCount += exactDel.count;

      // 2. Contains match -> remove prefix from string, update or delete if empty
      const shared = await model.findMany({ where: { set_prefix: { contains: prefix } } });
      for (const entity of shared) {
        if (!entity.set_prefix) continue;
        const prefixes = entity.set_prefix.split(',').map((p: string) => p.trim()).filter((p: string) => p && p !== prefix);
        if (prefixes.length === 0) {
          await model.delete({ where: { id: entity.id } });
          deletedCount++;
        } else {
          await model.update({ where: { id: entity.id }, data: { set_prefix: prefixes.join(',') } });
        }
      }
      return deletedCount;
    };

    const [champDel, traitDel, augDel, itemDel] = await Promise.all([
      purgeShared('champion'),
      purgeShared('trait'),
      purgeShared('augment'),
      purgeShared('item'),
    ]);

    res.json({
      success: true,
      deleted: {
        champions: champDel,
        traits: traitDel,
        augments: augDel,
        items: itemDel,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/sets/:prefix/purge error:', error);
    res.status(500).json({ error: 'Failed to purge set data' });
  }
});

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

router.patch('/champions/:id/icon', async (req, res) => {
  try {
    const { id } = req.params;
    const { icon } = req.body;
    await prisma.champion.update({ where: { id }, data: { icon } });
    res.json({ success: true, champion_id: id, icon });
  } catch (error) {
    console.error('PATCH /api/admin/champions/:id/icon error:', error);
    res.status(500).json({ error: 'Failed to update champion icon' });
  }
});

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

// ── Patch Notes (Tuning) ─────────────────────────────────────────────

// Get all changes + predictions for a patch
router.get('/patch-notes', async (req, res) => {
  try {
    function getActiveSet() {
      try {
        if (fs.existsSync(SETTINGS_FILE)) {
          return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')).active_set || 'TFT16';
        }
      } catch (e) { }
      return 'TFT16';
    }

    const { patch, set_prefix } = req.query;

    // Safely evaluate set_prefix
    const sp = set_prefix as string;
    const isUndef = !sp || sp === 'undefined' || sp === 'null';
    const targetPrefix = isUndef ? getActiveSet() : sp;
    const metaWhere = { set_prefix: { contains: targetPrefix } };

    // Fetch Target Set Entity Names FIRST
    const [champIcons, traitIcons, augmentIcons, itemIcons] = await Promise.all([
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

    champIcons.forEach(x => { if (x.name) { const n = x.name.toLowerCase().trim(); iconMap.set(n, x.icon || ''); idMap.set(n, x.id || ''); champNames.add(n); } });
    traitIcons.forEach(x => { if (x.name) { const n = x.name.toLowerCase().trim(); iconMap.set(n, x.icon || ''); idMap.set(n, x.id || ''); traitNames.add(n); } });
    augmentIcons.forEach(x => { if (x.name) { const n = x.name.toLowerCase().trim(); iconMap.set(n, x.icon || ''); idMap.set(n, x.id || ''); augmentNames.add(n); } });
    itemIcons.forEach(x => { if (x.name) { const n = x.name.toLowerCase().trim(); iconMap.set(n, x.icon || ''); idMap.set(n, x.id || ''); itemNames.add(n); } });

    // 2. Fetch available patches natively
    const patchList = await prisma.patchChange.findMany({
      where: metaWhere,
      distinct: ['patch'],
      select: { patch: true },
      orderBy: { patch: 'desc' }
    });
    const available_patches = patchList.map(p => p.patch);

    // 3. Resolve targetPatch
    let targetPatch = patch as string;
    if (!targetPatch && available_patches.length > 0) {
      targetPatch = available_patches[0]; // Default to most recent patch FOR THIS SET
    }

    if (!targetPatch) return res.json({ patch: '', changes: [], predictions: [], available_patches: [] });

    // 4. Fetch the changes and predictions for targetPatch natively
    const [changesRaw, predictions] = await Promise.all([
      prisma.patchChange.findMany({
        where: { patch: targetPatch, ...metaWhere },
        orderBy: [{ entity_type: 'asc' }, { score: 'desc' }],
      }),
      prisma.patchMetaPrediction.findMany({
        where: { patch: targetPatch, ...metaWhere },
        orderBy: { sort_order: 'asc' },
      }),
    ]);

    const getIconUrl = (iconPath: string) => {
      if (!iconPath) return '';
      if (iconPath.startsWith('http')) return iconPath;
      return `https://raw.communitydragon.org/latest/game/${iconPath}`;
    };

    const groupedChangesMap = new Map<string, any>();
    const changes: any[] = [];

    changesRaw.forEach(c => {
      const entNorm = c.entity.toLowerCase().trim();
      const hasMapping = champNames.has(entNorm) || traitNames.has(entNorm) || augmentNames.has(entNorm) || itemNames.has(entNorm) || iconMap.has(entNorm);

      // Strict Set Filter: If entity doesn't match our current set dictionary, and isn't a system change, drop it!
      if (!hasMapping && c.entity_type !== 'system') return;

      let actualType = c.entity_type;
      if (champNames.has(entNorm)) actualType = 'unit';
      else if (traitNames.has(entNorm)) actualType = 'trait';
      else if (augmentNames.has(entNorm)) actualType = 'augment';
      else if (itemNames.has(entNorm)) actualType = 'item';

      const statLine = c.before_val && c.after_val ? `${c.stat}: ${c.before_val} → ${c.after_val}` : (c.stat || c.raw_text);

      if (groupedChangesMap.has(entNorm)) {
        const existing = groupedChangesMap.get(entNorm);
        existing.stat += `\n• ${statLine}`;
      } else {
        const newChange = {
          ...c,
          entity_type: actualType,
          entity_id: idMap.get(entNorm) || '',
          iconUrl: getIconUrl(iconMap.get(entNorm) || ''),
          stat: `• ${statLine}`
        };
        groupedChangesMap.set(entNorm, newChange);
        changes.push(newChange);
      }
    });

    // Sắp xếp name dài lên trước để ưu tiên match (VD: "Twisted Fate" trước "Fate" nếu có)
    const sortedChamps = Array.from(champNames).sort((a, b) => b.length - a.length);

    // Enrich predictions với icon map cho key_units
    const enrichedPredictions = predictions.map(p => {
      const keyUnitsIcons: Record<string, string> = {};
      (p.key_units || []).forEach((unitName: string) => {
        const n = unitName.toLowerCase().trim();
        let iconUrl = getIconUrl(iconMap.get(n) || '');

        if (!iconUrl) {
          // Thử fuzzy match (phòng trường hợp AI gen ra "Milio Primary" thay vì "Milio")
          const match = sortedChamps.find(cName => {
            const escaped = cName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp('\\b' + escaped + '\\b').test(n);
          });
          if (match) {
            iconUrl = getIconUrl(iconMap.get(match) || '');
          }
        }
        keyUnitsIcons[unitName] = iconUrl;
      });
      return { ...p, key_units_icons: keyUnitsIcons };
    });

    res.json({
      patch: targetPatch,
      changes,
      predictions: enrichedPredictions,
      available_patches: available_patches,
    });
  } catch (error) {
    console.error('GET /api/admin/patch-notes error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a single change (score, change_type)
router.patch('/patch-notes/changes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { score, change_type } = req.body;
    const data: any = {};
    if (score !== undefined) data.score = parseFloat(score);
    if (change_type !== undefined) data.change_type = change_type;

    const change = await prisma.patchChange.update({ where: { id }, data });
    res.json(change);
  } catch (error) {
    console.error('PATCH /api/admin/patch-notes/changes/:id error:', error);
    res.status(500).json({ error: 'Failed to update change' });
  }
});

// Bulk update changes
router.post('/patch-notes/changes/bulk', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be array' });

    let updated = 0;
    for (const item of items) {
      const data: any = {};
      if (item.score !== undefined) data.score = parseFloat(item.score);
      if (item.change_type !== undefined) data.change_type = item.change_type;
      if (Object.keys(data).length > 0) {
        await prisma.patchChange.update({ where: { id: item.id }, data });
        updated++;
      }
    }
    res.json({ success: true, updated });
  } catch (error) {
    console.error('POST /api/admin/patch-notes/changes/bulk error:', error);
    res.status(500).json({ error: 'Failed to bulk update' });
  }
});

// Update a prediction
router.patch('/patch-notes/predictions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, score, reason, name, key_units, buffed_entities, nerfed_entities, sort_order } = req.body;
    const data: any = {};
    if (tier !== undefined) data.tier = tier;
    if (score !== undefined) data.score = parseFloat(score);
    if (reason !== undefined) data.reason = reason;
    if (name !== undefined) data.name = name;
    if (key_units !== undefined) data.key_units = key_units;
    if (buffed_entities !== undefined) data.buffed_entities = buffed_entities;
    if (nerfed_entities !== undefined) data.nerfed_entities = nerfed_entities;
    if (sort_order !== undefined) data.sort_order = parseInt(sort_order);

    const pred = await prisma.patchMetaPrediction.update({ where: { id }, data });
    res.json(pred);
  } catch (error) {
    console.error('PATCH /api/admin/patch-notes/predictions/:id error:', error);
    res.status(500).json({ error: 'Failed to update prediction' });
  }
});

// Create a new prediction
router.post('/patch-notes/predictions', async (req, res) => {
  try {
    const pred = await prisma.patchMetaPrediction.create({ data: req.body });
    res.json(pred);
  } catch (error) {
    console.error('POST /api/admin/patch-notes/predictions error:', error);
    res.status(500).json({ error: 'Failed to create prediction' });
  }
});

// Delete a prediction
router.delete('/patch-notes/predictions/:id', async (req, res) => {
  try {
    await prisma.patchMetaPrediction.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/patch-notes/predictions/:id error:', error);
    res.status(500).json({ error: 'Failed to delete prediction' });
  }
});

// ── Export Tracking ──────────────────────────────────────────────────

function getExportStats(): Record<string, { builder: number; tierlist: number }> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return data.export_stats || {};
    }
  } catch (e) { }
  return {};
}

function saveExportStats(stats: Record<string, { builder: number; tierlist: number }>) {
  const current = fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) : {};
  current.export_stats = stats;
  if (!fs.existsSync(path.dirname(SETTINGS_FILE))) {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
}

// POST /api/admin/exports/track — increment export count
router.post('/exports/track', (req, res) => {
  try {
    const { type } = req.body; // 'builder' | 'tierlist'
    if (!type || !['builder', 'tierlist'].includes(type)) {
      return res.status(400).json({ error: 'type must be "builder" or "tierlist"' });
    }

    const stats = getExportStats();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (!stats[today]) {
      stats[today] = { builder: 0, tierlist: 0 };
    }
    stats[today][type as 'builder' | 'tierlist']++;

    saveExportStats(stats);
    res.json({ success: true, date: today, count: stats[today][type as 'builder' | 'tierlist'] });
  } catch (e) {
    console.error('POST /api/admin/exports/track error:', e);
    res.status(500).json({ error: 'Failed to track export' });
  }
});

// GET /api/admin/exports/stats — get export statistics
router.get('/exports/stats', (req, res) => {
  try {
    const stats = getExportStats();
    const days = parseInt(req.query.days as string) || 30;

    // Generate last N days
    const result: { date: string; builder: number; tierlist: number; total: number }[] = [];
    let totalBuilder = 0;
    let totalTierlist = 0;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const day = stats[dateStr] || { builder: 0, tierlist: 0 };
      totalBuilder += day.builder;
      totalTierlist += day.tierlist;
      result.push({
        date: dateStr,
        builder: day.builder,
        tierlist: day.tierlist,
        total: day.builder + day.tierlist,
      });
    }

    res.json({
      daily: result,
      totals: { builder: totalBuilder, tierlist: totalTierlist, total: totalBuilder + totalTierlist },
    });
  } catch (e) {
    console.error('GET /api/admin/exports/stats error:', e);
    res.status(500).json({ error: 'Failed to get export stats' });
  }
});

export default router;
