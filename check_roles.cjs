
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uybkdnhaqnjrpwyqrocp.supabase.co';
const supabaseKey = 'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking workflow steps roles...');
    const { data: steps, error: stepError } = await supabase.from('workflow_steps').select('*');
    if (stepError) {
        console.error('Error fetching steps:', stepError);
        return;
    }

    const distinctRoles = [...new Set(steps.map(s => s.approver_role).filter(Boolean))];
    console.log('Roles defined in steps:', distinctRoles);

    console.log('Checking staff roles...');
    const { data: staff, error: staffError } = await supabase.from('staff').select('id, name, role, email');
    if (staffError) {
        console.error('Error fetching staff:', staffError);
        return;
    }

    const staffRoles = [...new Set(staff.map(s => s.role))];
    console.log('Roles existing in staff:', staffRoles);

    console.log('--- Matching Check ---');
    distinctRoles.forEach(role => {
        const found = staff.filter(s => s.role === role);
        if (found.length > 0) {
            console.log(`[OK] Role '${role}' has ${found.length} staff members. First: ${found[0].name} (${found[0].email})`);
        } else {
            console.log(`[FAIL] Role '${role}' has NO staff members!`);
        }
    });
}

check();
