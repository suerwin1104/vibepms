
import { supabase } from '../supabase';

const STANDARD_ACCOUNTS = [
    { code: '1103', name: '零用金', type: 'Asset' },
    { code: '1201', name: '應收帳款', type: 'Asset' },
    { code: '1301', name: '存貨', type: 'Asset' },
    { code: '2101', name: '應付帳款', type: 'Liability' },
    { code: '3102', name: '保留盈餘', type: 'Equity' },
    { code: '4101', name: '房租收入', type: 'Revenue' }
];

async function setup() {
    console.log('🛠️ Setting up Standard Accounts...');

    const { data: hotels } = await supabase.from('hotels').select('*');
    if (!hotels) return;

    for (const hotel of hotels) {
        console.log(`  Target: ${hotel.name}`);

        for (const acc of STANDARD_ACCOUNTS) {
            // Check if exists
            const { data: existing } = await supabase.from('chart_of_accounts')
                .select('id')
                .eq('hotel_id', hotel.id)
                .eq('code', acc.code)
                .maybeSingle();

            if (!existing) {
                console.log(`    + Creating ${acc.code} ${acc.name}`);
                await supabase.from('chart_of_accounts').insert({
                    id: crypto.randomUUID(),
                    hotel_id: hotel.id,
                    code: acc.code,
                    name: acc.name,
                    type: acc.type,
                    is_active: true
                });
            }
        }
    }
    console.log('✅ Setup Complete.');
}

setup().catch(console.error);
