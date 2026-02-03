
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://uybkdnhaqnjrpwyqrocp.supabase.co', 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb');
async function check() {
    const { data: room } = await supabase.from('rooms').select('*').limit(1);
    console.log('Room Keys:', Object.keys(room?.[0] || {}));
    const { data: task } = await supabase.from('daily_cleaning_tasks').select('*').limit(1);
    console.log('Task Keys:', Object.keys(task?.[0] || {}));
}
check();
