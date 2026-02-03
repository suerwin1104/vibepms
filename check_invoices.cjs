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
    console.log("=== Checking Invoices ===");
    
    // 1. Check invoices table
    const { data: invoices, error: invError } = await supabase.from('invoices').select('*');
    if (invError) {
        console.error("Error fetching invoices:", invError);
    } else {
        console.log(`Found ${invoices?.length || 0} invoices in database`);
        if (invoices && invoices.length > 0) {
            console.log("First 3 invoices:", JSON.stringify(invoices.slice(0, 3), null, 2));
        }
    }
    
    // 2. Check invoice_sequences table
    const { data: sequences, error: seqError } = await supabase.from('invoice_sequences').select('*');
    if (seqError) {
        console.error("Error fetching invoice sequences:", seqError);
    } else {
        console.log(`\nFound ${sequences?.length || 0} invoice sequences`);
        if (sequences && sequences.length > 0) {
            console.log("Invoice sequences:", JSON.stringify(sequences, null, 2));
        }
    }
    
    // 3. Check hotels table
    const { data: hotels, error: hotError } = await supabase.from('hotels').select('id, name, code');
    if (hotError) {
        console.error("Error fetching hotels:", hotError);
    } else {
        console.log(`\nFound ${hotels?.length || 0} hotels`);
        if (hotels && hotels.length > 0) {
            console.log("Hotels:", JSON.stringify(hotels, null, 2));
        }
    }
    
    // 4. Check reservations with CheckedOut status (these should have invoices)
    const { data: checkedOut, error: resError } = await supabase
        .from('reservations')
        .select('id, guest_name, status, total_price, paid_amount')
        .eq('status', 'CheckedOut')
        .limit(5);
    if (resError) {
        console.error("Error fetching reservations:", resError);
    } else {
        console.log(`\nFound ${checkedOut?.length || 0} checked-out reservations (showing up to 5)`);
        if (checkedOut && checkedOut.length > 0) {
            console.log("CheckedOut reservations:", JSON.stringify(checkedOut, null, 2));
        }
    }
    
    console.log("\n=== Check Complete ===");
})();
