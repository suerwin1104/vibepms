
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://uybkdnhaqnjrpwyqrocp.supabase.co', 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb');
async function check() {
    const { data: tasks } = await supabase.from('daily_cleaning_tasks').select('*').eq('room_id', 'r001a01');
    console.log(JSON.stringify(tasks, null, 2));
}
check();
