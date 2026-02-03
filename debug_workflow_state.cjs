
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uybkdnhaqnjrpwyqrocp.supabase.co';
const supabaseKey = 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('--- Debugging Specific Document ---');
    const docNum = 'PR-1766723825100'; // From user screenshot

    const { data: inst, error } = await supabase
        .from('workflow_instances')
        .select('id, document_number, current_step, status')
        .eq('document_number', docNum)
        .single();

    if (error) {
        console.log('Could not find instance for ' + docNum);
        // Try listing latest
        const { data: latest } = await supabase.from('workflow_instances').select('document_number, current_step, status').order('created_at', { ascending: false }).limit(3);
        console.log('Latest 3 instances:', latest);
        return;
    }

    console.log(`Document: ${inst.document_number}`);
    console.log(`Status: ${inst.status}`);
    console.log(`Step: ${inst.current_step}`);

    const { data: doc } = await supabase.from('purchase_requisitions').select('requester_id, requester_name').eq('id', inst.document_id || '').single();
    console.log(`Requester: ${doc?.requester_name} (ID: ${doc?.requester_id})`);
}

debug();
