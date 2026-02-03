import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://uybkdnhaqnjrpwyqrocp.supabase.co',
    'sb_publishable_h5Q1q1X5ISgW7K73q09dEg_npZq69Lb'
);

async function addPrItems() {
    // Get all PRs
    const { data: prs, error: prError } = await supabase
        .from('purchase_requisitions')
        .select('id, pr_number');

    if (prError) {
        console.error('Error fetching PRs:', prError);
        return;
    }

    console.log('Found PRs:', prs.map(p => p.pr_number));

    const items = [
        // PR-TPE-2026-001 items
        { pr_num: 'PR-TPE-2026-001', line: 1, name: '大浴巾', qty: 30, unit: '條', price: 180, amount: 5400, notes: '月度備品' },
        { pr_num: 'PR-TPE-2026-001', line: 2, name: '小方巾', qty: 50, unit: '條', price: 35, amount: 1750, notes: '' },
        { pr_num: 'PR-TPE-2026-001', line: 3, name: '洗髮精', qty: 200, unit: '瓶', price: 8, amount: 1600, notes: '' },
        { pr_num: 'PR-TPE-2026-001', line: 4, name: '沐浴乳', qty: 200, unit: '瓶', price: 8, amount: 1600, notes: '' },
        { pr_num: 'PR-TPE-2026-001', line: 5, name: '牙刷組', qty: 150, unit: '組', price: 12, amount: 1800, notes: '' },
        { pr_num: 'PR-TPE-2026-001', line: 6, name: '衛生紙', qty: 30, unit: '包', price: 95, amount: 2850, notes: '12捲/包' },

        // PR-TPE-2026-002 items
        { pr_num: 'PR-TPE-2026-002', line: 1, name: '雙人床包組', qty: 10, unit: '組', price: 650, amount: 6500, notes: '緊急補充' },
        { pr_num: 'PR-TPE-2026-002', line: 2, name: '枕頭套', qty: 25, unit: '個', price: 80, amount: 2000, notes: '' },

        // PR-TXG-2026-001 items
        { pr_num: 'PR-TXG-2026-001', line: 1, name: '大浴巾', qty: 60, unit: '條', price: 180, amount: 10800, notes: '' },
        { pr_num: 'PR-TXG-2026-001', line: 2, name: '小方巾', qty: 100, unit: '條', price: 35, amount: 3500, notes: '' },
        { pr_num: 'PR-TXG-2026-001', line: 3, name: '拖鞋', qty: 200, unit: '雙', price: 18, amount: 3600, notes: '' },

        // PR-TXG-2026-002 items
        { pr_num: 'PR-TXG-2026-002', line: 1, name: '洗髮精', qty: 400, unit: '瓶', price: 8, amount: 3200, notes: '' },
        { pr_num: 'PR-TXG-2026-002', line: 2, name: '沐浴乳', qty: 400, unit: '瓶', price: 8, amount: 3200, notes: '' },
        { pr_num: 'PR-TXG-2026-002', line: 3, name: '牙刷組', qty: 280, unit: '組', price: 12, amount: 3360, notes: '' },

        // PR-KHH-2026-001 items
        { pr_num: 'PR-KHH-2026-001', line: 1, name: '單人床包組', qty: 25, unit: '組', price: 450, amount: 11250, notes: '' },
        { pr_num: 'PR-KHH-2026-001', line: 2, name: '雙人床包組', qty: 20, unit: '組', price: 650, amount: 13000, notes: '' },
        { pr_num: 'PR-KHH-2026-001', line: 3, name: '枕頭套', qty: 45, unit: '個', price: 80, amount: 3600, notes: '' },

        // PR-KHH-2026-002 items
        { pr_num: 'PR-KHH-2026-002', line: 1, name: '大浴巾', qty: 50, unit: '條', price: 180, amount: 9000, notes: '緊急補充' },
        { pr_num: 'PR-KHH-2026-002', line: 2, name: '小方巾', qty: 60, unit: '條', price: 35, amount: 2100, notes: '' },
    ];

    for (const item of items) {
        const pr = prs.find(p => p.pr_number === item.pr_num);
        if (!pr) {
            console.log('PR not found:', item.pr_num);
            continue;
        }

        const { error } = await supabase.from('purchase_requisition_items').insert({
            pr_id: pr.id,
            line_number: item.line,
            item_name: item.name,
            quantity: item.qty,
            unit: item.unit,
            estimated_unit_price: item.price,
            estimated_amount: item.amount,
            notes: item.notes
        });

        if (error) {
            console.error(`Error inserting ${item.name}:`, error);
        } else {
            console.log(`Inserted: ${item.pr_num} - ${item.name}`);
        }
    }

    console.log('Done!');
}

addPrItems();
