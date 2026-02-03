
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uybkdnhaqnjrpwyqrocp.supabase.co';
const supabaseKey = 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking approval_records...');
    const { data: records, error } = await supabase.from('approval_records').select('*');
    if (error) {
        console.error('Error fetching records:', error);
    } else {
        console.log(`Found ${records.length} records.`);
        records.forEach(r => console.log(`Record [${r.id}] Action: ${r.action}, Approver: ${r.approver_name}`));
    }

    console.log('Checking workflow_instances...');
    const { data: instances, error: instError } = await supabase.from('workflow_instances').select('*');
    let targetId = 'unknown';
    if (instError) {
        console.error('Error fetching instances:', instError);
    } else {
        console.log(`Found ${instances.length} instances.`);
        instances.forEach(i => {
            console.log(`Instance [${i.id}] Status: ${i.status}, Step: ${i.current_step}`);
        });
        if (instances.length > 0) targetId = instances[0].id; // Use the first instance ID
    }

    console.log('Attempting test insert...');
    const { error: insertError } = await supabase.from('approval_records').insert({
        id: '123e4567-e89b-12d3-a456-426614174000',
        workflow_instance_id: targetId,
        step_sequence: 1,
        approver_id: 'test-user',
        approver_name: 'Test User',
        action: 'Approve',
        comments: 'Test Comment',
        acted_at: new Date().toISOString()
    });

    if (insertError) {
        console.error('Test Insert Failed:', JSON.stringify(insertError, null, 2));
    } else {
        console.log('Test Insert Success!');
    }
}

check();
