import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function report() {
  const { data: champs } = await supabase.from('champions').select('*').eq('set_prefix', 'TFT17').limit(5);
  const { count: champCount } = await supabase.from('champions').select('*', { count: 'exact', head: true }).eq('set_prefix', 'TFT17');
  const { count: traitCount } = await supabase.from('traits').select('*', { count: 'exact', head: true }).eq('set_prefix', 'TFT17');
  const { count: augCount } = await supabase.from('augments').select('*', { count: 'exact', head: true }).eq('set_prefix', 'TFT17');

  console.log('=== PBE SYNC REPORT (SET 17) ===');
  console.log(`Total Champions: ${champCount}`);
  console.log(`Total Traits:    ${traitCount}`);
  console.log(`Total Augments:  ${augCount}`);
  console.log('\n--- Sample Champions ---');
  champs.forEach(c => console.log(`- ${c.name} (Cost: ${c.cost})`));
}

report();
