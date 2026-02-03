import { supabase } from '../supabase';
import {
    JournalEntry,
    JournalEntryLine,
    PettyCashTransaction,
    AccountingPeriod,
    ChartOfAccount
} from '../types';

export const AccountingService = {
    // Helper to get account by code
    async getAccountByCode(code: string, hotelId: string): Promise<ChartOfAccount | null> {
        const { data, error } = await supabase
            .from('chart_of_accounts')
            .select('*')
            .eq('code', code)
            .or(`hotel_id.eq.${hotelId},hotel_id.is.null`)
            .single();

        if (error || !data) {
            console.error(`Account not found for code: ${code}`, error);
            return null;
        }
        return data as ChartOfAccount;
    },


    // Helper to get mapping
    async getMapping(hotelId: string, category: string, typeId: string | null): Promise<string | null> {
        const { data } = await supabase
            .from('accounting_mappings')
            .select('account_code')
    // Helper to get standard account
    async getStandardAccount(type: 'PETTY_CASH' | 'AP' | 'AR' | 'REVENUE' | 'INVENTORY' | 'RETAINED_EARNINGS', hotelId: string): Promise < ChartOfAccount | null > {
            // 1. Check dynamic mapping first
            let mappingKey = '';
            if(type === 'REVENUE') mappingKey = 'RENT_DEFAULT';
        if (type === 'PETTY_CASH') mappingKey = 'PETTY_CASH';

        let code = '';
        if (mappingKey) {
            code = await this.getMapping(hotelId, mappingKey, null) || '';
        }

        // 2. Fallback to hardcoded defaults
        if (!code) {
            const codeMap = {
                'PETTY_CASH': '1103', // 零用金
                'AP': '2101',         // 應付帳款
                'AR': '1201',         // 應收帳款
                'REVENUE': '4101',    // 房租收入
                'INVENTORY': '1301',  // 存貨
                'RETAINED_EARNINGS': '3102' // 保留盈餘
            };
            code = codeMap[type];
        }

        return this.getAccountByCode(code, hotelId);
    },


    // --- Period Management ---

    async getPeriods(hotelId: string): Promise<AccountingPeriod[]> {
        const { data, error } = await supabase
            .from('accounting_periods')
            .select('*')
            .eq('hotel_id', hotelId)
            .order('period', { ascending: false });

        if (error) {
            console.error('Error fetching periods:', error);
            return [];
        }
        return data.map((p: any) => ({
            id: p.id,
            hotelId: p.hotel_id,
            period: p.period,
            year: p.year,
            month: p.month,
            status: p.status,
            closedBy: p.closed_by,
            closedAt: p.closed_at,
            createdAt: p.created_at
        }));
    },

    async checkPeriodStatus(hotelId: string, date: string): Promise<boolean> {
        const periodStr = date.slice(0, 7); // YYYY-MM

        // Check if period record exists
        const { data, error } = await supabase
            .from('accounting_periods')
            .select('status')
            .eq('hotel_id', hotelId)
            .eq('period', periodStr)
            .single();

        // If no record, assume Open (or strict mode: require creation)
        // For simplicity, assume Open if not explicitly Closed/Locked
        if (!data || error) return true;

        return data.status === 'Open';
    },

    async closePeriod(hotelId: string, period: string, status: 'Closed' | 'Locked', performerId: string): Promise<{ success: boolean; message: string }> {
        try {
            // Upsert period status
            const year = parseInt(period.split('-')[0]);
            const month = parseInt(period.split('-')[1]);

            // Check if exists
            const { data: existing } = await supabase
                .from('accounting_periods')
                .select('id')
                .eq('hotel_id', hotelId)
                .eq('period', period)
                .single();

            if (existing) {
                await supabase.from('accounting_periods').update({
                    status,
                    closed_by: performerId,
                    closed_at: new Date().toISOString()
                }).eq('id', existing.id);
            } else {
                await supabase.from('accounting_periods').insert({
                    id: crypto.randomUUID(),
                    hotel_id: hotelId,
                    period,
                    year,
                    month,
                    status,
                    closed_by: performerId,
                    closed_at: new Date().toISOString()
                });
            }
            return { success: true, message: `Period ${period} is now ${status}.` };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    async performYearEndClosing(hotelId: string, year: number, performerId: string): Promise<{ success: boolean; message: string }> {
        // 1. Calculate P&L
        try {
            // Get all GL balances for the last period of the year (e.g., 2026-12) OR sum of all months?
            // GeneralLedger table stores cumulative balances per period. "closing_balance" of Dec is the Year End balance for B/S.
            // For P&L, they accumulate through the year? Usually yes.
            // If our `updateLedger` uses opening_balance from prev month, then Dec closing_balance IS the YTD balance.

            // So we need clear Revenue/Expense balances from the LAST OPEN PERIOD of that year.
            const closingPeriod = `${year}-12`;

            // Fetch accounts
            const { data: accounts } = await supabase.from('chart_of_accounts')
                .select('*')
                .or(`hotel_id.eq.${hotelId},hotel_id.is.null`)
                .in('type', ['Revenue', 'Expense']);

            if (!accounts || accounts.length === 0) return { success: false, message: 'No P&L accounts found.' };

            // Calculate totals
            let totalRevenue = 0;
            let totalExpense = 0;
            const lines: Partial<JournalEntryLine>[] = [];
            const entryId = crypto.randomUUID();
            let lineNum = 1;

            for (const acc of accounts) {
                // Get balance
                const { data: gl } = await supabase.from('general_ledgers')
                    .select('closing_balance')
                    .eq('hotel_id', hotelId)
                    .eq('account_id', acc.id)
                    .eq('period', closingPeriod)
                    .maybeSingle();

                const balance = gl?.closing_balance || 0;
                if (balance === 0) continue;

                // Revenue (Credit balance) -> Debit to close
                if (acc.type === 'Revenue') {
                    totalRevenue += balance;
                    lines.push({
                        id: crypto.randomUUID(),
                        entryId,
                        lineNumber: lineNum++,
                        accountId: acc.id,
                        debitAmount: balance, // Clear Credit balance
                        creditAmount: 0,
                        description: 'Year End Closing'
                    });
                }
                // Expense (Debit balance) -> Credit to close
                else if (acc.type === 'Expense') {
                    totalExpense += balance;
                    lines.push({
                        id: crypto.randomUUID(),
                        entryId,
                        lineNumber: lineNum++,
                        accountId: acc.id,
                        debitAmount: 0,
                        creditAmount: balance, // Clear Debit balance
                        description: 'Year End Closing'
                    });
                }
            }

            const netIncome = totalRevenue - totalExpense; // Positive = Profit

            // Retained Earnings Line
            const retainedEarningsAcc = await this.getStandardAccount('RETAINED_EARNINGS', hotelId);
            if (!retainedEarningsAcc) return { success: false, message: 'Retained Earnings account (3102) not found.' };

            if (netIncome !== 0) {
                if (netIncome > 0) {
                    // Profit: Credit Retained Earnings
                    lines.push({
                        id: crypto.randomUUID(),
                        entryId,
                        lineNumber: lineNum++,
                        accountId: retainedEarningsAcc.id,
                        debitAmount: 0,
                        creditAmount: netIncome,
                        description: `Net Income for ${year}`
                    });
                } else {
                    // Loss: Debit Retained Earnings
                    lines.push({
                        id: crypto.randomUUID(),
                        entryId,
                        lineNumber: lineNum++,
                        accountId: retainedEarningsAcc.id,
                        debitAmount: Math.abs(netIncome),
                        creditAmount: 0,
                        description: `Net Loss for ${year}`
                    });
                }
            } else {
                return { success: true, message: 'No Net Income/Loss to close.' };
            }

            // Create JE
            const journalEntry: Partial<JournalEntry> = {
                id: entryId,
                entryNumber: `JE-CLOSE-${year}`,
                hotelId,
                entryDate: `${year}-12-31`,
                period: closingPeriod,
                status: 'Posted',
                description: `Year End Closing ${year}`,
                totalDebit: lines.reduce((sum, l) => sum + (l.debitAmount || 0), 0),
                totalCredit: lines.reduce((sum, l) => sum + (l.creditAmount || 0), 0),
                sourceType: 'Manual', // Or 'System'
                createdBy: performerId,
                approvedBy: performerId
            };

            const { error: entryError } = await supabase.from('journal_entries').insert(journalEntry);
            if (entryError) throw entryError;

            for (const line of lines) {
                const { error: lineError } = await supabase.from('journal_entry_lines').insert(line);
                if (lineError) throw lineError;
            }

            // Update Ledgers
            for (const line of lines) {
                await this.updateLedger(hotelId, closingPeriod, line.accountId!, line.debitAmount!, line.creditAmount!);
            }

            // Finally Lock all periods
            for (let m = 1; m <= 12; m++) {
                const p = `${year}-${String(m).padStart(2, '0')}`;
                await this.closePeriod(hotelId, p, 'Locked', performerId);
            }

            return { success: true, message: `Year End Closing ${year} completed. Net Income: ${netIncome}` };

        } catch (e: any) {
            console.error('Year End Close Failed:', e);
            return { success: false, message: e.message };
        }
    },


    // --- Manual Entry Management ---

    async updateLedger(hotelId: string, period: string, accountId: string, debit: number, credit: number) {
        // ... (Keep existing implementation)
        const { data: account } = await supabase.from('chart_of_accounts').select('type').eq('id', accountId).single();
        if (!account) return;

        const { data: existing } = await supabase
            .from('general_ledgers')
            .select('*')
            .eq('hotel_id', hotelId)
            .eq('account_id', accountId)
            .eq('period', period)
            .single();

        // Determine normal balance direction
        const isDebitNormal = ['Asset', 'Expense'].includes(account.type);

        const currentDebit = existing ? existing.total_debit : 0;
        const currentCredit = existing ? existing.total_credit : 0;
        const currentOpening = existing ? existing.opening_balance : 0;

        const newDebit = currentDebit + debit;
        const newCredit = currentCredit + credit;

        // Calculate Closing Balance
        let closingBalance = 0;
        if (isDebitNormal) {
            closingBalance = currentOpening + newDebit - newCredit;
        } else {
            // For Credit Normal accounts (Liability, Revenue), Balance = Credit - Debit
            closingBalance = currentOpening + newCredit - newDebit;
        }

        if (existing) {
            await supabase.from('general_ledgers').update({
                total_debit: newDebit,
                total_credit: newCredit,
                closing_balance: closingBalance
            }).eq('id', existing.id);
        } else {
            await supabase.from('general_ledgers').insert({
                id: crypto.randomUUID(),
                hotel_id: hotelId,
                account_id: accountId,
                period,
                opening_balance: 0,
                total_debit: debit,
                total_credit: credit,
                closing_balance: closingBalance
            });
        }
    },

    async createManualJournal(entry: Partial<JournalEntry>, lines: Partial<JournalEntryLine>[]): Promise<{ success: boolean; message: string; entryId?: string }> {
        const { hotelId, entryDate } = entry;
        if (!hotelId || !entryDate) return { success: false, message: 'Missing hotelId or entryDate' };

        const period = entryDate.slice(0, 7);
        if (!await this.checkPeriodStatus(hotelId, entryDate)) {
            return { success: false, message: `Period ${period} is closed.` };
        }

        try {
            const { error: entryError } = await supabase.from('journal_entries').insert(entry);
            if (entryError) throw entryError;

            for (const line of lines) {
                const { error: lineError } = await supabase.from('journal_entry_lines').insert(line);
                if (lineError) throw lineError;
            }

            return { success: true, message: 'Created', entryId: entry.id };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    async updateManualJournal(entryId: string, entryData: Partial<JournalEntry>, lines: Partial<JournalEntryLine>[]): Promise<{ success: boolean; message: string }> {
        // Check if draft
        const { data: existing } = await supabase.from('journal_entries').select('status, hotel_id, entry_date').eq('id', entryId).single();
        if (!existing) return { success: false, message: 'Not found' };
        if (existing.status !== 'Draft') return { success: false, message: 'Only Draft can be updated' };

        // Check period
        const period = existing.entry_date.slice(0, 7);
        if (!await this.checkPeriodStatus(existing.hotel_id, existing.entry_date)) return { success: false, message: 'Period Closed' };

        try {
            // Update Entry
            await supabase.from('journal_entries').update(entryData).eq('id', entryId);

            // Replace Lines (Delete All, Insert New)
            const { error: deleteError } = await supabase.from('journal_entry_lines').delete().eq('entry_id', entryId);
            if (deleteError) throw deleteError;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const { error: insertError } = await supabase.from('journal_entry_lines').insert({
                    entry_id: entryId,
                    line_number: i + 1,
                    account_id: line.accountId,
                    debit_amount: line.debitAmount || 0,
                    credit_amount: line.creditAmount || 0,
                    description: line.description || ''
                });
                if (insertError) throw insertError;
            }

            return { success: true, message: 'Updated' };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    async deleteManualJournal(entryId: string): Promise<{ success: boolean; message: string }> {
        const { data: existing } = await supabase.from('journal_entries').select('status, hotel_id, entry_date').eq('id', entryId).single();
        if (!existing) return { success: false, message: 'Not found' };
        if (existing.status !== 'Draft') return { success: false, message: 'Only Draft can be deleted' };

        const period = existing.entry_date.slice(0, 7);
        if (!await this.checkPeriodStatus(existing.hotel_id, existing.entry_date)) return { success: false, message: 'Period Closed' };

        try {
            // Cascade handled by DB? If not, delete lines first. Assuming cascade constraints on FK.
            // But let's be safe
            await supabase.from('journal_entry_lines').delete().eq('entry_id', entryId);
            await supabase.from('journal_entries').delete().eq('id', entryId);
            return { success: true, message: 'Deleted' };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    async postJournalEntry(entryId: string): Promise<{ success: boolean; message: string }> {
        const { data: entry } = await supabase.from('journal_entries').select('*').eq('id', entryId).single();
        if (!entry) return { success: false, message: 'Not found' };
        if (entry.status !== 'Draft') return { success: false, message: 'Only Draft can be Posted' };

        const period = entry.entry_date.slice(0, 7);
        if (!await this.checkPeriodStatus(entry.hotel_id, entry.entry_date)) return { success: false, message: 'Period Closed' };

        // Get Lines
        const { data: lines } = await supabase.from('journal_entry_lines').select('*').eq('entry_id', entryId);
        if (!lines || lines.length === 0) return { success: false, message: 'No lines found' };

        try {
            // 1. Update Status
            await supabase.from('journal_entries').update({
                status: 'Posted',
                posting_date: new Date().toISOString().split('T')[0]
            }).eq('id', entryId);

            // 2. Update Ledger
            for (const line of lines) {
                await this.updateLedger(entry.hotel_id, period, line.account_id, line.debit_amount, line.credit_amount);
            }
            return { success: true, message: 'Posted successfully' };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    async findEntryBySource(sourceId: string, sourceType: string): Promise<JournalEntry | null> {
        const { data, error } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('source_id', sourceId)
            //.eq('source_type', sourceType) // Optional strict check
            .maybeSingle();

        if (error) {
            console.error('Find JE failed:', error);
            return null;
        }
        return data as JournalEntry;
    },

    async voidJournalEntryBySource(sourceId: string, reason?: string): Promise<{ success: boolean; message: string }> {
        const entry = await this.findEntryBySource(sourceId, '');
        if (!entry) return { success: false, message: 'Journal Entry not found for this source.' };
        return this.voidJournalEntry(entry.id);
    },

    async voidJournalEntry(entryId: string): Promise<{ success: boolean; message: string }> {
        const { data: entry } = await supabase.from('journal_entries').select('*').eq('id', entryId).single();
        if (!entry) return { success: false, message: 'Not found' };
        if (entry.status === 'Voided') return { success: false, message: 'Already Voided' };

        const period = entry.entry_date.slice(0, 7);
        if (!await this.checkPeriodStatus(entry.hotel_id, entry.entry_date)) return { success: false, message: 'Period Closed' };

        try {
            // If Posted, Reverse Ledger
            if (entry.status === 'Posted') {
                const { data: lines } = await supabase.from('journal_entry_lines').select('*').eq('entry_id', entryId);
                if (lines) {
                    for (const line of lines) {
                        // Reverse ledger impact by subtracting values
                        await this.updateLedger(entry.hotel_id, period, line.account_id, -line.debit_amount, -line.credit_amount);
                    }
                }
            }

            await supabase.from('journal_entries').update({
                status: 'Voided',
                description: entry.description + (reason ? ` (Void: ${reason})` : ' (Voided)')
            }).eq('id', entryId);
            return { success: true, message: 'Voided' };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    async revertJournalEntry(entryId: string): Promise<{ success: boolean; message: string }> {
        const { data: entry } = await supabase.from('journal_entries').select('*').eq('id', entryId).single();
        if (!entry) return { success: false, message: 'Not found' };
        if (entry.status !== 'Posted') return { success: false, message: 'Only Posted entries can be reverted' };

        const period = entry.entry_date.slice(0, 7);
        if (!await this.checkPeriodStatus(entry.hotel_id, entry.entry_date)) return { success: false, message: 'Period Closed' };

        try {
            // Reverse Ledger Impact
            const { data: lines } = await supabase.from('journal_entry_lines').select('*').eq('entry_id', entryId);
            if (lines) {
                for (const line of lines) {
                    // Reverse ledger impact by subtracting values
                    await this.updateLedger(entry.hotel_id, period, line.account_id, -line.debit_amount, -line.credit_amount);
                }
            }

            // Update status to Draft and clear posting date
            await supabase.from('journal_entries').update({
                status: 'Draft',
                posting_date: null
            }).eq('id', entryId);

            return { success: true, message: 'Reverted to Draft' };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    // --- Auto Generation Methods (Keep existing) ---
    async createJournalFromPettyCash(
        transaction: PettyCashTransaction,
        hotelId: string,
        performerId: string
    ): Promise<{ success: boolean; message: string; entryId?: string }> {
        if (transaction.transactionType !== 'EXPENSE') {
            return { success: false, message: 'Only EXPENSE transactions generate journal entries for now.' };
        }

        const entryDate = new Date().toISOString().split('T')[0];
        const period = entryDate.slice(0, 7);
        if (!await this.checkPeriodStatus(hotelId, entryDate)) {
            return { success: false, message: `Accounting Period ${period} is closed.` };
        }

        if (!transaction.accountingCode) {
            return { success: false, message: 'Transaction missing accounting code.' };
        }

        try {
            const debitAccount = await this.getAccountByCode(transaction.accountingCode, hotelId);
            if (!debitAccount) return { success: false, message: `Debit account ${transaction.accountingCode} not found.` };

            const creditAccount = await this.getStandardAccount('PETTY_CASH', hotelId);
            if (!creditAccount) return { success: false, message: 'Petty Cash account (1103) not found.' };

            const entryId = crypto.randomUUID();
            const entryNumber = `JE-${Date.now()}`;

            const journalEntry: Partial<JournalEntry> = {
                id: entryId,
                entryNumber,
                hotelId,
                entryDate,
                period,
                status: 'Posted',
                description: `Petty Cash: ${transaction.description || transaction.transactionNumber}`,
                totalDebit: transaction.amount,
                totalCredit: transaction.amount,
                sourceType: 'PettyCash',
                sourceId: transaction.id,
                createdBy: performerId,
                approvedBy: performerId
            };

            const lines: Partial<JournalEntryLine>[] = [
                {
                    id: crypto.randomUUID(),
                    entryId,
                    lineNumber: 1,
                    accountId: debitAccount.id,
                    debitAmount: transaction.amount,
                    creditAmount: 0,
                    description: transaction.description
                },
                {
                    id: crypto.randomUUID(),
                    entryId,
                    lineNumber: 2,
                    accountId: creditAccount.id,
                    debitAmount: 0,
                    creditAmount: transaction.amount,
                    description: 'Petty Cash Payout'
                }
            ];

            const { error: entryError } = await supabase.from('journal_entries').insert(journalEntry);
            if (entryError) throw entryError;

            for (const line of lines) {
                const { error: lineError } = await supabase.from('journal_entry_lines').insert(line);
                if (lineError) throw lineError;
            }

            await this.updateLedger(hotelId, period, debitAccount.id, transaction.amount, 0);
            await this.updateLedger(hotelId, period, creditAccount.id, 0, transaction.amount);

            return { success: true, message: 'Journal Entry created successfully.', entryId };

        } catch (error: any) {
            console.error('Auto Journal Creation Failed:', error);
            return { success: false, message: error.message };
        }
    },

    async createJournalFromInvoice(
        invoice: any,
        hotelId: string,
        performerId: string
    ): Promise<{ success: boolean; message: string; entryId?: string }> {
        const entryDate = new Date().toISOString().split('T')[0];
        const period = entryDate.slice(0, 7);
        if (!await this.checkPeriodStatus(hotelId, entryDate)) {
            return { success: false, message: `Accounting Period ${period} is closed.` };
        }

        try {
            const drAccount = await this.getStandardAccount('AR', hotelId);
            const crAccount = await this.getStandardAccount('REVENUE', hotelId);

            if (!drAccount || !crAccount) return { success: false, message: 'Default AR or Revenue accounts not found.' };

            const entryId = crypto.randomUUID();
            const entryNumber = `JE-INV-${Date.now()}`;

            const journalEntry: Partial<JournalEntry> = {
                id: entryId,
                entryNumber,
                hotelId,
                entryDate,
                period,
                status: 'Posted',
                description: `Invoice: ${invoice.invoiceNumber}`,
                totalDebit: invoice.amount,
                totalCredit: invoice.amount,
                sourceType: 'Invoice',
                sourceId: invoice.id,
                createdBy: performerId,
                approvedBy: performerId
            };

            const lines: Partial<JournalEntryLine>[] = [
                {
                    id: crypto.randomUUID(),
                    entryId,
                    lineNumber: 1,
                    accountId: drAccount.id,
                    debitAmount: invoice.amount,
                    creditAmount: 0,
                    description: `AR for Invoice ${invoice.invoiceNumber}`
                },
                {
                    id: crypto.randomUUID(),
                    entryId,
                    lineNumber: 2,
                    accountId: crAccount.id,
                    debitAmount: 0,
                    creditAmount: invoice.amount,
                    description: 'Revenue recognition'
                }
            ];

            const { error: entryError } = await supabase.from('journal_entries').insert(journalEntry);
            if (entryError) throw entryError;

            for (const line of lines) {
                const { error: lineError } = await supabase.from('journal_entry_lines').insert(line);
                if (lineError) throw lineError;
            }

            await this.updateLedger(hotelId, period, drAccount.id, invoice.amount, 0);
            await this.updateLedger(hotelId, period, crAccount.id, 0, invoice.amount);

            return { success: true, message: 'Invoice Journal Entry created.', entryId };

        } catch (e: any) {
            console.error('Invoice JE Failed:', e);
            return { success: false, message: e.message };
        }
    },

    async createJournalFromGR(
        gr: any,
        hotelId: string,
        performerId: string
    ): Promise<{ success: boolean; message: string; entryId?: string }> {
        const entryDate = new Date().toISOString().split('T')[0];
        const period = entryDate.slice(0, 7);
        if (!await this.checkPeriodStatus(hotelId, entryDate)) {
            return { success: false, message: `Accounting Period ${period} is closed.` };
        }

        try {
            const crAccount = await this.getStandardAccount('AP', hotelId);
            const drAccount = await this.getStandardAccount('INVENTORY', hotelId);

            if (!crAccount || !drAccount) return { success: false, message: 'AP or Inventory account not found.' };

            const entryId = crypto.randomUUID();
            const entryNumber = `JE-GR-${Date.now()}`;

            const journalEntry: Partial<JournalEntry> = {
                id: entryId,
                entryNumber,
                hotelId,
                entryDate,
                period,
                status: 'Posted',
                description: `GR: ${gr.grNumber}`,
                totalDebit: gr.totalAmount,
                totalCredit: gr.totalAmount,
                sourceType: 'Procurement',
                sourceId: gr.id,
                createdBy: performerId,
                approvedBy: performerId
            };

            const lines: Partial<JournalEntryLine>[] = [
                {
                    id: crypto.randomUUID(),
                    entryId,
                    lineNumber: 1,
                    accountId: drAccount.id,
                    debitAmount: gr.totalAmount,
                    creditAmount: 0,
                    description: `Inventory Receipt`
                },
                {
                    id: crypto.randomUUID(),
                    entryId,
                    lineNumber: 2,
                    accountId: crAccount.id,
                    debitAmount: 0,
                    creditAmount: gr.totalAmount,
                    description: 'AP Accrual'
                }
            ];

            const { error: entryError } = await supabase.from('journal_entries').insert(journalEntry);
            if (entryError) throw entryError;

            for (const line of lines) {
                const { error: lineError } = await supabase.from('journal_entry_lines').insert(line);
                if (lineError) throw lineError;
            }

            await this.updateLedger(hotelId, period, drAccount.id, gr.totalAmount, 0);
            await this.updateLedger(hotelId, period, crAccount.id, 0, gr.totalAmount);

            return { success: true, message: 'GR Journal Entry created.', entryId };

        } catch (e: any) {
            console.error('GR JE Failed:', e);
            return { success: false, message: e.message };
        }
    },

    // Generic System Journal Entry (Immediate Post + Ledger Update)
    async createJournalEntry(params: {
        hotelId: string;
        date: string;
        description: string;
        referenceId?: string;
        type: string; // 'Payment', 'General', etc.
        lines: { accountId: string; description?: string; debit: number; credit: number }[];
        status: 'Posted' | 'Draft';
        createdBy: string;
    }): Promise<{ success: boolean; message: string; entryId?: string }> {
        const { hotelId, date, description, referenceId, type, lines, status, createdBy } = params;

        const period = date.slice(0, 7);
        if (!await this.checkPeriodStatus(hotelId, date)) {
            return { success: false, message: `Accounting Period ${period} is closed.` };
        }

        try {
            const entryId = crypto.randomUUID();
            const entryNumber = `JE-SYS-${Date.now()}`;

            const journalEntry = {
                id: entryId,
                entry_number: entryNumber,
                hotel_id: hotelId,
                entry_date: date,
                posting_date: status === 'Posted' ? date : null, // Immediate posting only if status is Posted
                period,
                status,
                description,
                total_debit: lines.reduce((sum, l) => sum + l.debit, 0),
                total_credit: lines.reduce((sum, l) => sum + l.credit, 0),
                source_type: 'System', // Generic system type
                source_id: referenceId,
                created_by: createdBy,
                approved_by: status === 'Posted' ? createdBy : null // Auto-approved only if status is Posted
            };

            const mbLines = lines.map((l, index) => ({
                id: crypto.randomUUID(),
                entry_id: entryId,
                line_number: index + 1,
                account_id: l.accountId,
                debit_amount: l.debit,
                credit_amount: l.credit,
                description: l.description || description
            }));

            // 1. Insert Entry
            const { error: entryError } = await supabase.from('journal_entries').insert(journalEntry);
            if (entryError) throw entryError;

            // 2. Insert Lines
            for (const line of mbLines) {
                const { error: lineError } = await supabase.from('journal_entry_lines').insert(line);
                if (lineError) throw lineError;
            }

            // 3. Update Ledger (Only if status is 'Posted')
            if (status === 'Posted') {
                for (const line of mbLines) {
                    await this.updateLedger(hotelId, period, line.account_id!, line.debit_amount!, line.credit_amount!);
                }
            }

            return { success: true, message: `Journal Entry created as ${status}.`, entryId };

        } catch (e: any) {
            console.error('System JE Failed:', e);
            return { success: false, message: e.message };
        }
    }
};
