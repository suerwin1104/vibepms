
import { supabase } from '../supabase';
import { AccountingService } from '../services/AccountingService';
import { JournalEntry, JournalEntryLine, ChartOfAccount } from '../types';

const TEST_YEAR = 2025;
const TEST_PERIOD = '2025-01';

async function runTests() {
    console.log('🚀 Starting Accounting System Full Test...');

    const { data: hotels, error } = await supabase.from('hotels').select('*').limit(3);

    if (error || !hotels || hotels.length === 0) {
        console.error('Failed to fetch hotels or no hotels found.', error);
        return;
    }

    // Fetch a valid staff for "Created By"
    const { data: staff } = await supabase.from('staff').select('id').limit(1).maybeSingle();
    const performerId = staff?.id;

    if (!performerId) {
        console.error('❌ No staff found. Cannot create entries due to FK constraint.');
        // Try creating a dummy staff? No, too complex.
        return;
    }
    console.log(`👤 Using Performer ID: ${performerId}`);

    console.log(`📋 Found ${hotels.length} hotels to test.`);

    for (const hotel of hotels) {
        console.log(`\n🏨 Testing Hotel: ${hotel.name} (${hotel.id})`);

        // Ensure Ledger Accounts exist (Quick check)
        const ar = await AccountingService.getStandardAccount('AR', hotel.id);
        const revenue = await AccountingService.getStandardAccount('REVENUE', hotel.id);

        if (!ar || !revenue) {
            console.warn(`⚠️ Skipped: Standard accounts missing for hotel ${hotel.name}`);
            continue;
        }

        // --- PHASE A: Manual Entry CRUD ---
        console.log('  🔹 Test A: Manual Entry CRUD (Draft)');
        const draftId = crypto.randomUUID();
        const draftEntry: Partial<JournalEntry> = {
            id: draftId,
            entryNumber: `TEST-MANUAL-${Date.now()}`,
            hotelId: hotel.id,
            entryDate: `${TEST_YEAR}-01-15`,
            period: TEST_PERIOD,
            status: 'Draft',
            description: 'Test Manual Entry Draft',
            totalDebit: 1000,
            totalCredit: 1000,
            sourceType: 'Manual',
            createdBy: performerId,
            approvedBy: performerId
        };
        const draftLines: Partial<JournalEntryLine>[] = [
            { id: crypto.randomUUID(), entryId: draftId, lineNumber: 1, accountId: ar.id, debitAmount: 1000, creditAmount: 0, description: 'Debit Line' },
            { id: crypto.randomUUID(), entryId: draftId, lineNumber: 2, accountId: revenue.id, debitAmount: 0, creditAmount: 1000, description: 'Credit Line' }
        ];

        // 1. Create
        const createRes = await AccountingService.createManualJournal(draftEntry, draftLines);
        if (createRes.success) console.log('    ✅ Create Draft: Success');
        else console.error('    ❌ Create Draft Failed:', createRes.message);

        // 2. Update
        const updateRes = await AccountingService.updateManualJournal(draftId, { description: 'Updated Draft' }, draftLines);
        if (updateRes.success) console.log('    ✅ Update Draft: Success');
        else console.error('    ❌ Update Draft Failed:', updateRes.message);

        // 3. Delete
        const deleteRes = await AccountingService.deleteManualJournal(draftId);
        if (deleteRes.success) console.log('    ✅ Delete Draft: Success');
        else console.error('    ❌ Delete Draft Failed:', deleteRes.message);


        // --- PHASE B: Post & Void ---
        console.log('  🔹 Test B: Post & Void');
        const postId = crypto.randomUUID();
        const postEntry = { ...draftEntry, id: postId, entryNumber: `TEST-POST-${Date.now()}`, createdBy: performerId, approvedBy: performerId };
        const postLines = draftLines.map(l => ({ ...l, entryId: postId, id: crypto.randomUUID() }));

        await AccountingService.createManualJournal(postEntry, postLines);

        // 1. Post
        const postRes = await AccountingService.postJournalEntry(postId);
        if (postRes.success) console.log('    ✅ Post Entry: Success');
        else console.error('    ❌ Post Entry Failed:', postRes.message);

        // 2. Void
        const voidRes = await AccountingService.voidJournalEntry(postId);
        if (voidRes.success) console.log('    ✅ Void Entry: Success');
        else console.error('    ❌ Void Entry Failed:', voidRes.message);


        // --- PHASE C: Auto Journals ---
        console.log('  🔹 Test C: Auto Journals');

        // 1. Invoice
        const invRes = await AccountingService.createJournalFromInvoice({
            id: `INV-TEST-${Date.now()}`,
            invoiceNumber: `INV-${Date.now()}`,
            amount: 500
        }, hotel.id, performerId);
        if (invRes.success) console.log('    ✅ Auto Invoice JE: Success');
        else console.error('    ❌ Auto Invoice JE Failed:', invRes.message);

        // 2. Petty Cash (Need valid account code for debit)
        // Assume AR account as expense for test simplicity
        const pcRes = await AccountingService.createJournalFromPettyCash({
            id: `PC-TEST-${Date.now()}`,
            transactionNumber: `PC-${Date.now()}`,
            transactionType: 'EXPENSE',
            amount: 200,
            accountingCode: ar.code,
            description: 'Test Expense'
        } as any, hotel.id, performerId);

        if (pcRes.success) console.log('    ✅ Auto PettyCash JE: Success');
        else console.error('    ❌ Auto PettyCash JE Failed:', pcRes.message);

        // --- PHASE D: Period Lock ---
        console.log('  🔹 Test D: Period Lock');
        const lockPeriod = `${TEST_YEAR}-02`;

        // 1. Close Period
        await AccountingService.closePeriod(hotel.id, lockPeriod, 'Closed', performerId);

        // 2. Try Create
        const failEntry = { ...draftEntry, id: crypto.randomUUID(), entryDate: `${TEST_YEAR}-02-15`, period: lockPeriod, createdBy: performerId };
        const failRes = await AccountingService.createManualJournal(failEntry, draftLines.map(l => ({ ...l, entryId: failEntry.id, id: crypto.randomUUID() })));
        if (!failRes.success) console.log('    ✅ Create in Closed Period: Blocked (Expected)');
        else console.error('    ❌ Create in Closed Period: Allowed (Unexpected!)');

        // 3. ReOpen
        await AccountingService.closePeriod(hotel.id, lockPeriod, 'Open', performerId);
    }

    console.log('\n🏁 Full Test Completed.');
}

runTests().catch(e => console.error(e));
