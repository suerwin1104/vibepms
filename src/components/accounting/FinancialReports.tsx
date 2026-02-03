import React, { useState, useMemo } from 'react';
import { GeneralLedger, ChartOfAccount, AccountType } from '../../types';

interface FinancialReportsProps {
    ledgers: GeneralLedger[];
    accounts: ChartOfAccount[];
    hotelId: string;
}

type ReportType = 'balance-sheet' | 'income-statement' | 'cash-flow' | 'trial-balance';

const FinancialReports: React.FC<FinancialReportsProps> = ({
    ledgers,
    accounts,
    hotelId
}) => {
    const [reportType, setReportType] = useState<ReportType>('balance-sheet');
    const [periodType, setPeriodType] = useState<'month' | 'range'>('month');
    const [selectedPeriod, setSelectedPeriod] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
        end: new Date().toISOString().split('T')[0]
    });

    // Filter ledgers by hotel and period/range
    const hotelLedgers = useMemo(() => {
        if (periodType === 'month') {
            return ledgers.filter(l => l.hotelId === hotelId && l.period === selectedPeriod);
        } else {
            // For custom range, filter by period months within range
            const startMonth = dateRange.start.slice(0, 7);
            const endMonth = dateRange.end.slice(0, 7);
            return ledgers.filter(l =>
                l.hotelId === hotelId &&
                l.period >= startMonth &&
                l.period <= endMonth
            );
        }
    }, [ledgers, hotelId, periodType, selectedPeriod, dateRange]);

    // Get display period text
    const periodDisplayText = periodType === 'month'
        ? selectedPeriod
        : `${dateRange.start} 至 ${dateRange.end}`;

    // Get account details
    const getAccountDetails = (accountId: string) => {
        return accounts.find(a => a.id === accountId);
    };

    // Group ledgers by account type
    const groupedByType = useMemo(() => {
        const result: Record<AccountType, { account: ChartOfAccount; balance: number }[]> = {
            Asset: [],
            Liability: [],
            Equity: [],
            Revenue: [],
            Expense: []
        };

        hotelLedgers.forEach(ledger => {
            const account = getAccountDetails(ledger.accountId);
            if (account) {
                result[account.type].push({
                    account,
                    balance: ledger.closingBalance
                });
            }
        });

        // Sort each group by account code
        Object.keys(result).forEach(type => {
            result[type as AccountType].sort((a, b) => a.account.code.localeCompare(b.account.code));
        });

        return result;
    }, [hotelLedgers, accounts]);

    // Calculate totals & Net Income
    const totals = useMemo(() => {
        const calcTotal = (type: AccountType) =>
            groupedByType[type].reduce((sum, item) => sum + item.balance, 0);

        return {
            assets: calcTotal('Asset'),
            liabilities: calcTotal('Liability'),
            equity: calcTotal('Equity'),
            revenue: calcTotal('Revenue'),
            expenses: calcTotal('Expense'),
            netIncome: calcTotal('Revenue') - calcTotal('Expense')
        };
    }, [groupedByType]);

    // Trial Balance Calculation
    const trialBalance = useMemo(() => {
        const data = accounts.map(account => {
            let ledgerMatch = null;
            if (periodType === 'month') {
                ledgerMatch = ledgers.find(l => l.accountId === account.id && l.period === selectedPeriod);
            }

            const bal = ledgerMatch?.closingBalance || 0;
            const dr = ledgerMatch?.totalDebit || 0;
            const cr = ledgerMatch?.totalCredit || 0;

            const isAssetExp = account.type === 'Asset' || account.type === 'Expense';

            return {
                code: account.code,
                name: account.name,
                type: account.type,
                debit: dr > 0 ? dr : (isAssetExp && bal > 0 ? bal : 0),
                credit: cr > 0 ? cr : (!isAssetExp && bal > 0 ? bal : 0),
                net: bal
            };
        }).filter(r => r.debit !== 0 || r.credit !== 0 || r.net !== 0);

        return {
            lines: data,
            totalDebit: data.reduce((sum, r) => sum + r.debit, 0),
            totalCredit: data.reduce((sum, r) => sum + r.credit, 0)
        };
    }, [accounts, ledgers, selectedPeriod, periodType]);


    const typeLabels: Record<AccountType, string> = {
        Asset: '資產',
        Liability: '負債',
        Equity: '權益',
        Revenue: '收入',
        Expense: '支出'
    };

    // Helper to render sections
    const renderSection = (type: AccountType, items: { account: ChartOfAccount; balance: number }[], total: number) => (
        <div style={{ marginBottom: '24px' }}>
            <h4 style={{
                margin: '0 0 12px 0',
                padding: '10px 16px',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span>{typeLabels[type]}</span>
                <span>${total.toLocaleString()}</span>
            </h4>
            {items.length === 0 ? (
                <div style={{ padding: '16px', color: '#9ca3af', fontStyle: 'italic', fontSize: '14px' }}>
                    本期無{typeLabels[type]}資料
                </div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.account.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 16px', paddingLeft: `${16 + (item.account.level - 1) * 20}px` }}>
                                    <span style={{ fontFamily: 'monospace', color: '#6b7280', marginRight: '12px' }}>{item.account.code}</span>
                                    {item.account.name}
                                </td>
                                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500 }}>
                                    ${item.balance.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-end">
                <div className="flex gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">報表類型</label>
                        <select
                            value={reportType}
                            onChange={e => setReportType(e.target.value as ReportType)}
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48"
                        >
                            <option value="balance-sheet">資產負債表 (Balance Sheet)</option>
                            <option value="income-statement">損益表 (Income Statement)</option>
                            <option value="cash-flow">現金流量表 (Cash Flow)</option>
                            <option value="trial-balance">試算表 (Trial Balance)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">期間類型</label>
                        <select
                            value={periodType}
                            onChange={e => setPeriodType(e.target.value as any)}
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="month">單月結算</option>
                            <option value="range">自訂區間</option>
                        </select>
                    </div>
                    {periodType === 'month' ? (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">選擇月份</label>
                            <input
                                type="month"
                                value={selectedPeriod}
                                onChange={e => setSelectedPeriod(e.target.value)}
                                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">開始月份</label>
                                <input
                                    type="month"
                                    value={dateRange.start.slice(0, 7)}
                                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value + '-01' }))}
                                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">結束月份</label>
                                <input
                                    type="month"
                                    value={dateRange.end.slice(0, 7)}
                                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value + '-28' }))}
                                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </>
                    )}
                </div>
                <button
                    onClick={() => window.print()}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700"
                >
                    🖨️ 列印報表
                </button>
            </div>

            {/* Balance Sheet */}
            {reportType === 'balance-sheet' && (
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 700, borderBottom: '2px solid #1e293b', paddingBottom: '12px' }}>
                        資產負債表 (Balance Sheet)
                        <span style={{ fontSize: '14px', fontWeight: 400, color: '#64748b', marginLeft: '12px' }}>{periodDisplayText}</span>
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                        {/* Left: Assets */}
                        <div>
                            {renderSection('Asset', groupedByType.Asset, totals.assets)}
                            <div style={{
                                marginTop: '24px',
                                padding: '16px',
                                backgroundColor: '#dbeafe',
                                borderRadius: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontWeight: 700,
                                fontSize: '16px',
                                color: '#1e40af'
                            }}>
                                <span>資產總計</span>
                                <span>${totals.assets.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Right: Liabilities + Equity */}
                        <div>
                            {renderSection('Liability', groupedByType.Liability, totals.liabilities)}
                            {renderSection('Equity', groupedByType.Equity, totals.equity)}
                            <div style={{
                                marginTop: '24px',
                                padding: '16px',
                                backgroundColor: '#fce7f3',
                                borderRadius: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontWeight: 700,
                                fontSize: '16px',
                                color: '#9d174d'
                            }}>
                                <span>負債 + 權益總計</span>
                                <span>${(totals.liabilities + totals.equity).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Balance Check */}
                    <div style={{
                        marginTop: '24px',
                        padding: '16px',
                        backgroundColor: totals.assets === totals.liabilities + totals.equity ? '#dcfce7' : '#fee2e2',
                        borderRadius: '12px',
                        textAlign: 'center',
                        fontWeight: 600,
                        color: totals.assets === totals.liabilities + totals.equity ? '#166534' : '#991b1b'
                    }}>
                        {totals.assets === totals.liabilities + totals.equity
                            ? '✓ 資產負債表平衡'
                            : `✗ 資產負債表不平衡 (差額: $${Math.abs(totals.assets - totals.liabilities - totals.equity).toLocaleString()})`
                        }
                    </div>
                </div>
            )}

            {/* Income Statement */}
            {reportType === 'income-statement' && (
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 700, borderBottom: '2px solid #1e293b', paddingBottom: '12px' }}>
                        損益表 (Income Statement)
                        <span style={{ fontSize: '14px', fontWeight: 400, color: '#64748b', marginLeft: '12px' }}>{periodDisplayText}</span>
                    </h3>

                    {renderSection('Revenue', groupedByType.Revenue, totals.revenue)}
                    {renderSection('Expense', groupedByType.Expense, totals.expenses)}

                    <div style={{
                        marginTop: '24px',
                        padding: '20px',
                        backgroundColor: totals.netIncome >= 0 ? '#dcfce7' : '#fee2e2',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: '14px', color: totals.netIncome >= 0 ? '#166534' : '#991b1b', marginBottom: '4px' }}>
                                {totals.netIncome >= 0 ? '本期淨利' : '本期淨損'}
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: totals.netIncome >= 0 ? '#166534' : '#991b1b' }}>
                                ${Math.abs(totals.netIncome).toLocaleString()}
                            </div>
                        </div>
                        <div style={{ fontSize: '48px' }}>
                            {totals.netIncome >= 0 ? '📈' : '📉'}
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Flow Statement */}
            {reportType === 'cash-flow' && (
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 700, borderBottom: '2px solid #1e293b', paddingBottom: '12px' }}>
                        現金流量表 (Cash Flow Statement)
                        <span style={{ fontSize: '14px', fontWeight: 400, color: '#64748b', marginLeft: '12px' }}>{periodDisplayText}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', float: 'right', fontWeight: 400 }}>間接法 (Indirect Method)</span>
                    </h3>

                    {(() => {
                        const netIncome = totals.netIncome;

                        // Classify Adjustments
                        const adjustments = {
                            operating: [] as { name: string; amount: number }[],
                            investing: [] as { name: string; amount: number }[],
                            financing: [] as { name: string; amount: number }[]
                        };

                        const accountMovements = new Map<string, number>();
                        hotelLedgers.forEach(l => {
                            const current = accountMovements.get(l.accountId) || 0;
                            accountMovements.set(l.accountId, current + (l.totalDebit - l.totalCredit));
                        });

                        accounts.forEach(acc => {
                            if (!accountMovements.has(acc.id)) return;
                            const netDebitChange = accountMovements.get(acc.id) || 0;
                            if (netDebitChange === 0) return;

                            const code = acc.code;

                            if (code.startsWith('11')) return; // Cash
                            if (['Revenue', 'Expense'].includes(acc.type)) return; // Included in Net Income
                            if (code === '3102') return; // Retained Earnings

                            if (code.startsWith('12') || code.startsWith('13') || code.startsWith('14')) {
                                adjustments.operating.push({ name: `${acc.name} (${acc.code}) 變動`, amount: -netDebitChange });
                            }
                            else if (code.startsWith('21') || code.startsWith('22')) {
                                adjustments.operating.push({ name: `${acc.name} (${acc.code}) 變動`, amount: -netDebitChange });
                            }
                            else if (parseInt(code) >= 1500 && parseInt(code) < 2000) {
                                adjustments.investing.push({ name: `${acc.name} (${acc.code})`, amount: -netDebitChange });
                            }
                            else if (parseInt(code) >= 2300 && parseInt(code) < 4000) {
                                adjustments.financing.push({ name: `${acc.name} (${acc.code})`, amount: -netDebitChange });
                            }
                        });

                        const totalOperating = netIncome + adjustments.operating.reduce((sum, item) => sum + item.amount, 0);
                        const totalInvesting = adjustments.investing.reduce((sum, item) => sum + item.amount, 0);
                        const totalFinancing = adjustments.financing.reduce((sum, item) => sum + item.amount, 0);
                        const netCashChange = totalOperating + totalInvesting + totalFinancing;

                        let beginCash = 0;
                        const cashAccounts = accounts.filter(a => a.code.startsWith('11'));
                        let startPeriod = periodType === 'month' ? selectedPeriod : dateRange.start.slice(0, 7);

                        cashAccounts.forEach(acc => {
                            const l = ledgers.find(x => x.hotelId === hotelId && x.accountId === acc.id && x.period === startPeriod);
                            if (l) beginCash += l.openingBalance;
                        });

                        const endCash = beginCash + netCashChange;

                        const renderFlowSection = (title: string, items: { name: string; amount: number }[], subTotal: number, isNetIncome = false) => (
                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ margin: '0 0 12px 0', padding: '10px 16px', backgroundColor: '#f8fafc', borderLeft: '4px solid #3b82f6', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                                    {title}
                                </h4>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <tbody>
                                        {isNetIncome && (
                                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px 16px', fontWeight: 600 }}>本期淨利 (Net Income)</td>
                                                <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600 }}>${netIncome.toLocaleString()}</td>
                                            </tr>
                                        )}
                                        {items.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px 16px', color: '#475569', paddingLeft: '32px' }}>{item.name}</td>
                                                <td style={{ padding: '8px 16px', textAlign: 'right', color: item.amount < 0 ? '#dc2626' : '#166534' }}>{item.amount < 0 ? `(${Math.abs(item.amount).toLocaleString()})` : item.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        <tr style={{ backgroundColor: '#f0f9ff' }}>
                                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0369a1' }}>{title} 淨額</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>{subTotal < 0 ? `(${Math.abs(subTotal).toLocaleString()})` : subTotal.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        );

                        return (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                                {renderFlowSection('營業活動之現金流量 (Operating Activities)', adjustments.operating, totalOperating, true)}
                                {renderFlowSection('投資活動之現金流量 (Investing Activities)', adjustments.investing, totalInvesting)}
                                {renderFlowSection('籌資活動之現金流量 (Financing Activities)', adjustments.financing, totalFinancing)}

                                <div style={{ marginTop: '24px', borderTop: '2px solid #cbd5e1', paddingTop: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px' }}>
                                        <span style={{ fontWeight: 600 }}>本期現金及約當現金增加(減少)數</span>
                                        <span style={{ fontWeight: 700, color: netCashChange < 0 ? '#dc2626' : '#166534' }}>{netCashChange < 0 ? `(${Math.abs(netCashChange).toLocaleString()})` : netCashChange.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px', color: '#64748b' }}>
                                        <span>期初現金及約當現金餘額</span>
                                        <span>${beginCash.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', fontSize: '18px', fontWeight: 800, color: '#1e3a8a' }}>
                                        <span>期末現金及約當現金餘額</span>
                                        <span>${endCash.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Trial Balance Report View */}
            {reportType === 'trial-balance' && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-8 print:shadow-none print:border-none">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-slate-900">試算表 (Trial Balance)</h2>
                        <p className="text-slate-500 font-medium mt-1">期間: {periodDisplayText}</p>
                    </div>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-900">
                                <th className="py-2 text-sm font-black uppercase text-slate-900 w-1/4">科目代碼</th>
                                <th className="py-2 text-sm font-black uppercase text-slate-900 w-1/2">科目名稱</th>
                                <th className="py-2 text-sm font-black uppercase text-slate-900 text-right w-1/8">借方 (Debit)</th>
                                <th className="py-2 text-sm font-black uppercase text-slate-900 text-right w-1/8">貸方 (Credit)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {trialBalance.lines.length === 0 ? (
                                <tr><td colSpan={4} className="py-8 text-center text-slate-400 italic">此期間無數據</td></tr>
                            ) : (
                                trialBalance.lines.map(line => (
                                    <tr key={line.code} className="hover:bg-slate-50">
                                        <td className="py-2 text-sm font-mono text-slate-600">{line.code}</td>
                                        <td className="py-2 text-sm font-bold text-slate-800">{line.name}</td>
                                        <td className="py-2 text-sm font-mono text-slate-800 text-right">
                                            {line.debit !== 0 ? line.debit.toLocaleString() : '-'}
                                        </td>
                                        <td className="py-2 text-sm font-mono text-slate-800 text-right">
                                            {line.credit !== 0 ? line.credit.toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-slate-900 bg-slate-50">
                                <td colSpan={2} className="py-3 text-right font-black text-slate-900">合計 (Totals):</td>
                                <td className="py-3 text-right font-black text-slate-900 underline decoration-double underline-offset-4">
                                    {trialBalance.totalDebit.toLocaleString()}
                                </td>
                                <td className="py-3 text-right font-black text-slate-900 underline decoration-double underline-offset-4">
                                    {trialBalance.totalCredit.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* No Data Message */}
            {hotelLedgers.length === 0 && (
                <div style={{
                    marginTop: '24px',
                    padding: '40px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: '#92400e'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
                    <p style={{ margin: 0, fontWeight: 500 }}>本期間尚無總帳資料</p>
                    <p style={{ margin: '8px 0 0', fontSize: '14px' }}>請先建立並過帳傳票，系統將自動更新總帳餘額</p>
                </div>
            )}
        </div>
    );
};

export default FinancialReports;
