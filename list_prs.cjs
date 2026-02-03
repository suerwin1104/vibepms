
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uybkdnhaqnjrpwyqrocp.supabase.co';
const supabaseKey = 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb';

const supabase = createClient(supabaseUrl, supabaseKey);

async function list() {
    const docNum = 'PR-1766723825100';
    console.log(`Verifying Requester for ${docNum}...`);

    // 1. Get Instance first to find document_id
    const { data: inst } = await supabase.from('workflow_instances').select('document_id').eq('document_number', docNum).single();
    if (!inst) { console.log('Instance not found'); return; }
    const { data: doc } = await supabase.from('purchase_requisitions').select('requester_id, requester_name').eq('id', inst.document_id).single();
    if (!doc) { console.log('Doc not found'); return; }

    console.log(`Current Requester: ${doc.requester_name} (${doc.requester_id})`);
}

list();
