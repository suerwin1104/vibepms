const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uybkdnhaqnjrpwyqrocp.supabase.co';
const supabaseKey = 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb';

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
            } else {
                console.log("No hotels found to seed.");
            }
        }
    }
})();
