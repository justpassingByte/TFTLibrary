import prisma from './src/lib/prisma';

async function createTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS champion_stats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      champion_id TEXT NOT NULL,
      patch TEXT NOT NULL,
      games INTEGER DEFAULT 0,
      pick_rate FLOAT DEFAULT 0,
      avg_placement FLOAT DEFAULT 0,
      top4_rate FLOAT DEFAULT 0,
      win_rate FLOAT DEFAULT 0,
      avg_star FLOAT DEFAULT 1,
      UNIQUE(champion_id, patch)
    )
  `);
  console.log('✅ champion_stats table created');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS item_champion_stats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      item_name TEXT NOT NULL,
      champion_id TEXT NOT NULL,
      patch TEXT NOT NULL,
      games INTEGER DEFAULT 0,
      avg_placement FLOAT DEFAULT 0,
      top4_rate FLOAT DEFAULT 0,
      win_rate FLOAT DEFAULT 0,
      UNIQUE(item_name, champion_id, patch)
    )
  `);
  console.log('✅ item_champion_stats table created');

  process.exit(0);
}

createTables().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
