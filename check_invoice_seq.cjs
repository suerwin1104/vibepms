const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log("Checking Invoice Sequences...");
    const { data, error } = await supabase.from('invoice_sequences').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Invoice Sequences:", JSON.stringify(data, null, 2));
        if (data.length === 0) {
            console.log("No sequences found. Attempting to seed...");
            // Seed default sequences for all hotels
            const { data: hotels } = await supabase.from('hotels').select('id');
            if (hotels && hotels.length > 0) {
                for (const h of hotels) {
                    const { error: insertError } = await supabase.from('invoice_sequences').insert({
                        hotel_id: h.id,
                        prefix: 'AA',
                        current_number: 10000000
                    });
                    if (insertError) console.error(`Failed to seed for hotel ${h.id}:`, insertError);
                    else console.log(`Seeded sequence for hotel ${h.id}`);
                }
            }
        }
    }
})();
