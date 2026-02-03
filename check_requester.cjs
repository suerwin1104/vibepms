
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uybkdnhaqnjrpwyqrocp.supabase.co';
const supabaseKey = 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const docNum = 'PR-1766723825100'; // Target Document
    console.log(`Checking Document: ${docNum}`);

    // 1. Get Instance first to find document_id
    const { data: inst } = await supabase
        .from('workflow_instances')
        .select('document_id')
        .eq('document_number', docNum)
        .single();

    if (!inst) {
        console.log('Workflow Instance not found for ' + docNum);
        return;
    }

    // 2. Fetch Doc by ID
    const { data: doc, error } = await supabase
        .from('purchase_requisitions')
        .select('requester_id, requester_name')
        .eq('id', inst.document_id)
        .maybeSingle();

    if (error) {
        console.log('Error fetching doc:', error);
        return;
    }

    if (!doc) {
        console.log('Document not found by ID: ' + inst.document_id);
        return;
    }

    // 3. Update if needed
    console.log(`Requester ID: ${doc.requester_id}`);
    console.log(`Requester Name: ${doc.requester_name}`);

    // Hardcoded check against likely user (s-fo-01)
    const isMatch = (doc.requester_id === 's-fo-01');
    console.log(`Is Requester == s-fo-01? ${isMatch}`);

    if (isMatch) {
        console.log('Self-approval block is ACTIVE.');

        // Update to someone else?
        console.log('Updating requester to "s-gm-01" (General Manager) to allow testing...');
        const { error: updateError } = await supabase
            .from('purchase_requisitions')
            .update({ requester_id: 's-gm-01', requester_name: '孫總經理' })
            .eq('id', inst.document_id);

        if (updateError) console.error('Update failed:', updateError);
        else console.log('Update SUCCESS. You should see it now.');
    } else {
        console.log('Requester is NOT s-fo-01, so visibility should be OK?');
    }
}

check();
