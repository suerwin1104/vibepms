
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://uybkdnhaqnjrpwyqrocp.supabase.co', 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb');
async function check() {
    const { data } = await supabase.from('hotels').select('*');
    console.log(JSON.stringify(data, null, 2));
}
check();
