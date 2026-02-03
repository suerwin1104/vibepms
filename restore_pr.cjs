
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uybkdnhaqnjrpwyqrocp.supabase.co';
const supabaseKey = 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb';

const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
    const docNum = 'PR-1766723825100';
    console.log(`Restoring Missing PR for ${docNum}...`);

    // 1. Get Instance to find document_id
    const { data: inst } = await supabase.from('workflow_instances').select('document_id').eq('document_number', docNum).single();
    if (!inst) { console.log('Instance not found'); return; }

    const docId = inst.document_id;
    console.log(`Target Document ID: ${docId}`);

    // 2. Check if exists (just in case)
    const { data: existing } = await supabase.from('purchase_requisitions').select('id').eq('id', docId).maybeSingle();
    if (existing) {
        console.log('Document actually exists! skipping restore.');
        return;
    }

    // 3. Insert Dummy PR
    const newRow = {
        id: docId,
        pr_number: docNum,
        requester_id: 's-fo-02', // Set to explicit OTHER user
        requester_name: 'System Repair',
        status: 'Pending',
        total_amount: 1000,
        created_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase.from('purchase_requisitions').insert(newRow);

    if (insertError) {
        console.error('Insert Failed:', insertError);
    } else {
        console.log('Restored Missing PR successfully.');
    }
}

restore();
