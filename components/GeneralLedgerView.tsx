import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase.ts';
import { ChartOfAccount, JournalEntry, JournalEntryLine } from '../types';

interface InternalJournalEntryLine extends JournalEntryLine {
    entry_date?: string; // Derived from parent
    entry_description?: string; // Derived from parent
    reference_id?: string;
    source_type?: string;
}

interface GeneralLedgerViewProps {
    hotelId: string;
    accounts: ChartOfAccount[];
}

const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({ hotelId, accounts }) => {
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10)
    });
    const [ledgerLines, setLedgerLines] = useState<InternalJournalEntryLine[]>([]);
    const [loading, setLoading] = useState(false);

    // Filter accounts to only show Leaf accounts (not headers)
    const activeAccounts = useMemo(() => accounts.filter(a => a.isActive), [accounts]);

    const handleSearch = async () => {
        if (!selectedAccountId) return;
        setLoading(true);
        try {
            // 1. Fetch Journal Entries within range
            const { data: entries, error: entryError } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('hotel_id', hotelId)
                .in('status', ['Posted']) // Only Posted entries affect GL
                .gte('entry_date', dateRange.start)
                .lte('entry_date', dateRange.end)
                .order('entry_date', { ascending: true });

            if (entryError) throw entryError;

            if (!entries || entries.length === 0) {
                setLedgerLines([]);
                setLoading(false);
                return;
            }

            const entryIds = entries.map(e => e.id);

            // 2. Fetch Lines for these entries AND selected account
            const { data: lines, error: lineError } = await supabase
                .from('journal_entry_lines')
                .select('*')
                .in('entry_id', entryIds)
                .eq('account_id', selectedAccountId);

            if (lineError) throw lineError;

            // 3. Merge Data
            const mergedLines = lines?.map(line => {
                const parent = entries.find(e => e.id === line.entry_id);
                return {
                    ...line,
                    entry_date: parent?.entry_date,
                    entry_description: parent?.description,
                    reference_id: parent?.reference_id,
                    source_type: parent?.source_type
                } as InternalJournalEntryLine;
            }).sort((a, b) => (new Date(a.entry_date || '').getTime() - new Date(b.entry_date || '').getTime())) || [];

            setLedgerLines(mergedLines);

        } catch (e: any) {
            console.error('GL Fetch Error:', e);
            alert(`查詢失敗: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Running Balance
    // NOTE: This simple view only calculates balance for the *fetched period*. 
    // Real GL needs "Opening Balance" from previous periods.
    // For this implementation, we calculate a "Period Balance" or try to fetch opening.
    // To calculate Opening Balance:
    // Fetch SUM(debit - credit) for all posted entries < startDate
    const [openingBalance, setOpeningBalance] = useState(0);

    useEffect(() => {
        if (selectedAccountId && ledgerLines.length >= 0) {
            fetchOpeningBalance();
        }
    }, [selectedAccountId, dateRange.start, hotelId]); // Re-fetch opening if date changes

    const fetchOpeningBalance = async () => {
        const { data: entries } = await supabase
            .from('journal_entries')
            .select('id')
            .eq('hotel_id', hotelId)
            .eq('status', 'Posted')
            .lt('entry_date', dateRange.start);

        if (!entries || entries.length === 0) {
            setOpeningBalance(0);
            return;
        }

        const ids = entries.map(e => e.id);
        const { data: lines } = await supabase
            .from('journal_entry_lines')
            .select('debit_amount, credit_amount')
            .in('entry_id', ids)
            .eq('account_id', selectedAccountId);

        let bal = 0;
        // Determine Account Type to know normal balance side?
        // Usually: Asset/Exp = Dr - Cr. Liab/Eq/Rev = Cr - Dr.
        // Let's standardise on Dr - Cr for now, visual will handle negative.
        // Or check account type.
        const account = accounts.find(a => a.id === selectedAccountId);
        const isDebitNormal = account?.type === 'Asset' || account?.type === 'Expense';

        lines?.forEach(l => {
            const val = (l.debit_amount || 0) - (l.credit_amount || 0);
            bal += val;
        });

        // If Credit Normal, flip sign? 
        // Standard accounting software usually shows Debit/Credit columns and a running balance column.
        // The running balance is usually (Dr - Cr) maybe?
        setOpeningBalance(bal);
    };

    let runningBalance = openingBalance;

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">會計科目 (Account)</label>
                    <select
                        value={selectedAccountId}
                        onChange={e => setSelectedAccountId(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">請選擇科目...</option>
                        {activeAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name} ({acc.type})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">開始日期 (From)</label>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">結束日期 (To)</label>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={!selectedAccountId || loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? '查詢中...' : '查詢明細'}
                </button>
            </div>

            {/* Results Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex justify-between">
                    <span>明細列表 (General Ledger Details)</span>
                    <span>期初餘額 (Opening): ${openingBalance.toLocaleString()}</span>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold">
                        <tr>
                            <th className="px-4 py-3">日期</th>
                            <th className="px-4 py-3">傳票編號 (Ref)</th>
                            <th className="px-4 py-3 w-1/3">摘要 (Description)</th>
                            <th className="px-4 py-3 text-right text-emerald-600">借方 (Debit)</th>
                            <th className="px-4 py-3 text-right text-rose-600">貸方 (Credit)</th>
                            <th className="px-4 py-3 text-right">餘額 (Balance)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {ledgerLines.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                                    {selectedAccountId ? '此區間無交易紀錄' : '請選擇科目並查詢'}
                                </td>
                            </tr>
                        ) : (
                            ledgerLines.map((line) => {
                                const dr = line.debit_amount || 0;
                                const cr = line.credit_amount || 0;
                                runningBalance += (dr - cr); // Assuming Asset-like nature for display flow

                                return (
                                    <tr key={line.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono text-slate-600">{line.entry_date}</td>
                                        <td className="px-4 py-3 font-mono text-blue-600 cursor-pointer hover:underline" title="View Entry">
                                            {/* Link to view entry? For now just text */}
                                            {line.reference_id || 'JE-' + line.id.slice(0, 4)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-800">
                                            <div className="font-medium">{line.entry_description}</div>
                                            <div className="text-xs text-slate-400">{line.description !== line.entry_description ? line.description : ''}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-emerald-600 font-medium">
                                            {dr > 0 ? dr.toLocaleString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-rose-600 font-medium">
                                            {cr > 0 ? cr.toLocaleString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                                            {runningBalance.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-sm text-slate-800 border-t border-slate-200">
                        <tr>
                            <td colSpan={3} className="px-4 py-3 text-right">期末合計 (Period Totals):</td>
                            <td className="px-4 py-3 text-right text-emerald-600">
                                ${ledgerLines.reduce((sum, l) => sum + (l.debit_amount || 0), 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-rose-600">
                                ${ledgerLines.reduce((sum, l) => sum + (l.credit_amount || 0), 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                                ${runningBalance.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default GeneralLedgerView;
