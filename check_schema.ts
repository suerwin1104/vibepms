
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uybkdnhaqnjrpwyqrocp.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking journal_entry_lines columns...');
    const { data, error } = await supabase
        .from('journal_entry_lines')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Keys:', Object.keys(data[0]));
        } else {
            console.log('No data found, trying to insert dummy to see error if columns wrong');
        }
    }
}

checkSchema();
