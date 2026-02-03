
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uybkdnhaqnjrpwyqrocp.supabase.co';
const supabaseKey = 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: rooms, error: re } = await supabase.from('rooms').select('*').eq('number', 'A101');
    const { data: tasks, error: te } = await supabase.from('daily_cleaning_tasks').select('*').eq('room_number', 'A101');

    console.log('Room A101 Info:');
    if (re) console.error('Rooms Error:', re);
    else console.log(JSON.stringify(rooms, null, 2));

    console.log('Cleaning Tasks for A101:');
    if (te) console.error('Tasks Error:', te);
    else console.log(JSON.stringify(tasks, null, 2));
}

check();
