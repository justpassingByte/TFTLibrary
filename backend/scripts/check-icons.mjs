import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkIcons() {
  const { data } = await supabase.from('champions').select('name, id, icon').eq('set_prefix', 'TFT17').limit(10);
  console.log('=== SET 17 ICON CHECK ===');
  data.forEach(c => {
    console.log(`- ${c.name} (${c.id}) -> ICON: ${c.icon}`);
  });
}
checkIcons();
