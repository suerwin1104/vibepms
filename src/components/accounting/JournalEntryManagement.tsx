import React, { useState, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import { JournalEntry, JournalEntryLine, ChartOfAccount, JournalStatus } from '../../types';
import AccountCodeSelect from '../common/AccountCodeSelect';
import Pagination from '../common/Pagination';
import JournalVoucherPrint from '../accounting/JournalVoucherPrint';

interface JournalEntryManagementProps {
    entries: JournalEntry[];
    accounts: ChartOfAccount[];
    hotelId: string;
    currentUserName: string;
    canPost?: boolean;
    canEdit?: boolean;
    onAdd: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>, lines: Omit<JournalEntryLine, 'id' | 'entryId' | 'createdAt'>[]) => Promise<void>;
    onPost: (id: string) => Promise<void>;
    onVoid: (id: string) => Promise<void>;
    onRevert?: (id: string) => Promise<void>;
    onUpdate?: (id: string, entry: Partial<JournalEntry>, lines: Omit<JournalEntryLine, 'id' | 'entryId' | 'createdAt'>[]) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

interface LineForm {
    accountCode: string;
    accountId: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
    description: string;
}

const JournalEntryManagement: React.FC<JournalEntryManagementProps> = ({
    entries,
    accounts,
    hotelId,
    currentUserName,
    canPost = true,
    canEdit = true,
    onAdd,
    onPost,
    onVoid,
    onRevert,
    onUpdate,
    onDelete
}) => {
    const [filterStatus, setFilterStatus] = useState<JournalStatus | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    // Form state
    const [entryForm, setEntryForm] = useState({
        entryDate: new Date().toISOString().split('T')[0],
        description: ''
    });
    const [lines, setLines] = useState<LineForm[]>([
        { accountCode: '', accountId: '', accountName: '', debitAmount: 0, creditAmount: 0, description: '' },
        { accountCode: '', accountId: '', accountName: '', debitAmount: 0, creditAmount: 0, description: '' }
    ]);

    // New State
    // Date Filter State
    const [dateFilterMode, setDateFilterMode] = useState<'All' | 'Today' | 'ThreeDays' | 'Custom'>('All');
    const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
        start: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'),
        end: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')
    });

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [sourceModal, setSourceModal] = useState<{ open: boolean; type: string; id: string; data: any }>({ open: false, type: '', id: '', data: null });
    const [printEntry, setPrintEntry] = useState<JournalEntry | null>(null);

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedIds(newSet);
    };

    const handleViewSource = async (entry: JournalEntry) => {
        if (!entry.sourceType || !entry.sourceId) {
            alert('此傳票無原始來源資料');
            return;
        }
        let data = null;
        try {
            if (entry.sourceType === 'Invoice') {
                const { data: inv } = await supabase.from('invoices').select('*').eq('id', entry.sourceId).single();
                data = inv;
            } else if (entry.sourceType === 'Payment' || entry.sourceType === 'Refund' || entry.sourceType === 'Adjustment') { // Transaction
                // Try fetching transaction
                const { data: tx } = await supabase.from('transactions').select('*').eq('id', entry.sourceId).single();
                data = tx;
            } else if (entry.sourceType === 'Procurement') { // GR
                const { data: gr } = await supabase.from('goods_receipts').select('*').eq('id', entry.sourceId).single();
                data = gr;
            } else if (entry.sourceType === 'PettyCash') {
                const { data: pc } = await supabase.from('petty_cash_transactions').select('*').eq('id', entry.sourceId).single();
                data = pc;
            }
        } catch (e) { console.error(e); }

        setSourceModal({ open: true, type: entry.sourceType, id: entry.sourceId, data });
    };

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: 'entryDate' | 'entryNumber' | null; direction: 'asc' | 'desc' }>({ key: 'entryDate', direction: 'desc' });

    const handleSort = (key: 'entryDate' | 'entryNumber') => {
        let direction: 'asc' | 'desc' = 'desc'; // Default to desc for new key
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    // Filter entries
    const filteredEntries = useMemo(() => {
        let result = entries;

        // 1. Status Filter
        if (filterStatus) {
            result = result.filter(e => e.status === filterStatus);
        }

        // 2. Search Filter (Number, Description)
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(e =>
                e.entryNumber.toLowerCase().includes(lower) ||
                (e.description || '').toLowerCase().includes(lower) ||
                (e.sourceType || '').toLowerCase().includes(lower)
            );
        }

        // 3. Date Filter (Local Time)
        if (dateFilterMode !== 'All') {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            if (dateFilterMode === 'Today') {
                result = result.filter(e => e.entryDate === todayStr);
            } else if (dateFilterMode === 'ThreeDays') {
                const threeDaysLater = new Date(today);
                threeDaysLater.setDate(today.getDate() + 2);
                const tYear = threeDaysLater.getFullYear();
                const tMonth = String(threeDaysLater.getMonth() + 1).padStart(2, '0');
                const tDay = String(threeDaysLater.getDate()).padStart(2, '0');
                const threeDaysLaterStr = `${tYear}-${tMonth}-${tDay}`;

                result = result.filter(e => e.entryDate >= todayStr && e.entryDate <= threeDaysLaterStr);
            } else if (dateFilterMode === 'Custom') {
                result = result.filter(e => e.entryDate >= customDateRange.start && e.entryDate <= customDateRange.end);
            }
        }

        // 4. Sorting
        if (sortConfig.key) {
            result = [...result].sort((a, b) => {
                let valA = a[sortConfig.key!] || '';
                let valB = b[sortConfig.key!] || '';

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
        return result;
    }, [entries, filterStatus, searchTerm, sortConfig, dateFilterMode, customDateRange]);

    // Pagination
    // Reset to page 1 when filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus, searchTerm, dateFilterMode, customDateRange]);

    const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
    const displayedEntries = filteredEntries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Calculate totals for form
    const totalDebit = lines.reduce((sum, l) => sum + (l.debitAmount || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.creditAmount || 0), 0);
    const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

    const statusLabels: Record<JournalStatus, string> = {
        Draft: '草稿',
        Pending: '待審核',
        Posted: '已過帳',
        Voided: '已作廢'
    };

    const statusColors: Record<JournalStatus, { bg: string; text: string }> = {
        Draft: { bg: '#f1f5f9', text: '#475569' },
        Pending: { bg: '#fef3c7', text: '#92400e' },
        Posted: { bg: '#dcfce7', text: '#166534' },
        Voided: { bg: '#fee2e2', text: '#991b1b' }
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setEntryForm({ entryDate: new Date().toISOString().split('T')[0], description: '' });
        setLines([
            { accountCode: '', accountId: '', accountName: '', debitAmount: 0, creditAmount: 0, description: '' },
            { accountCode: '', accountId: '', accountName: '', debitAmount: 0, creditAmount: 0, description: '' }
        ]);
    };

    const handleEdit = (entry: JournalEntry) => {
        if (!entry.lines) {
            alert('無法編輯：找不到分錄明細');
            return;
        }
        // Auto-expand the entry being edited
        setExpandedIds(prev => new Set([...prev, entry.id]));
        setEditingId(entry.id);
        setEntryForm({
            entryDate: entry.entryDate,
            description: entry.description
        });
        setLines(entry.lines.map(l => {
            const account = accounts.find(a => a.id === l.accountId);
            return {
                accountCode: l.accountCode || account?.code || '',
                accountId: l.accountId,
                accountName: l.accountName || account?.name || '',
                debitAmount: l.debitAmount,
                creditAmount: l.creditAmount,
                description: l.description || ''
            };
        }));
        setIsAdding(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('確定要刪除此草稿嗎？此操作無法復原。')) return;
        if (onDelete) {
            await onDelete(id);
        }
    };

    const addLine = () => {
        setLines([...lines, { accountCode: '', accountId: '', accountName: '', debitAmount: 0, creditAmount: 0, description: '' }]);
    };

    const removeLine = (index: number) => {
        if (lines.length > 2) {
            setLines(lines.filter((_, i) => i !== index));
        }
    };

    const updateLine = (index: number, field: keyof LineForm, value: string | number) => {
        setLines(lines.map((line, i) => {
            if (i !== index) return line;
            return { ...line, [field]: value };
        }));
    };

    const handleAccountSelect = (index: number, code: string, accountId?: string) => {
        const account = accounts.find(a => a.code === code);
        setLines(lines.map((line, i) => {
            if (i !== index) return line;
            return {
                ...line,
                accountCode: code,
                accountId: accountId || '',
                accountName: account?.name || ''
            };
        }));
    };

    const generateEntryNumber = () => {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `JE-${dateStr}-${random}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!entryForm.description.trim()) {
            alert('請填寫傳票說明');
            return;
        }

        if (!isBalanced) {
            alert('借貸金額不平衡，請檢查');
            return;
        }

        const validLines = lines.filter(l => l.accountCode && (l.debitAmount > 0 || l.creditAmount > 0));
        if (validLines.length < 2) {
            alert('至少需要兩筆分錄');
            return;
        }

        const period = entryForm.entryDate.slice(0, 7); // "2026-01"

        try {
            const entryData = {
                entryDate: entryForm.entryDate,
                period,
                status: 'Draft' as const,
                description: entryForm.description,
                totalDebit,
                totalCredit,
            };

            const lineData = validLines.map((l, i) => ({
                lineNumber: i + 1,
                accountId: l.accountId,
                accountCode: l.accountCode,
                accountName: l.accountName,
                debitAmount: l.debitAmount || 0,
                creditAmount: l.creditAmount || 0,
                description: l.description
            }));

            if (editingId && onUpdate) {
                await onUpdate(editingId, entryData, lineData);
            } else {
                await onAdd(
                    {
                        ...entryData,
                        entryNumber: generateEntryNumber(),
                        hotelId,
                        sourceType: 'Manual',
                        createdBy: currentUserName,
                        createdByName: currentUserName
                    },
                    lineData
                );
            }
            resetForm();
        } catch (error) {
            console.error('Save journal entry failed:', error);
        }
    };

    return (
        <div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {(['Draft', 'Pending', 'Posted', 'Voided'] as JournalStatus[]).map(status => {
                    const count = entries.filter(e => e.hotelId === hotelId && e.status === status).length;
                    return (
                        <div
                            key={status}
                            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
                            style={{
                                backgroundColor: statusColors[status].bg,
                                borderRadius: '16px',
                                padding: '20px',
                                color: statusColors[status].text,
                                cursor: 'pointer',
                                border: filterStatus === status ? `3px solid ${statusColors[status].text}` : '3px solid transparent'
                            }}
                        >
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>{statusLabels[status]}</div>
                            <div style={{ fontSize: '32px', fontWeight: 700 }}>{count}</div>
                        </div>
                    );
                })}
            </div>

            {/* Date Filter Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f9', padding: '8px', borderRadius: '12px', marginBottom: '16px', overflowX: 'auto' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px' }}>傳票日期篩選</span>
                <button
                    onClick={() => setDateFilterMode('All')}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: dateFilterMode === 'All' ? 'white' : 'transparent',
                        color: dateFilterMode === 'All' ? '#2563eb' : '#64748b',
                        boxShadow: dateFilterMode === 'All' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    全部 (All)
                </button>
                <button
                    onClick={() => setDateFilterMode('Today')}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: dateFilterMode === 'Today' ? 'white' : 'transparent',
                        color: dateFilterMode === 'Today' ? '#2563eb' : '#64748b',
                        boxShadow: dateFilterMode === 'Today' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    今日 (Today)
                </button>
                <button
                    onClick={() => setDateFilterMode('ThreeDays')}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: dateFilterMode === 'ThreeDays' ? 'white' : 'transparent',
                        color: dateFilterMode === 'ThreeDays' ? '#2563eb' : '#64748b',
                        boxShadow: dateFilterMode === 'ThreeDays' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    3日內 (3 Days)
                </button>
                <button
                    onClick={() => setDateFilterMode('Custom')}
                    style={{
                        padding: '6px 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: dateFilterMode === 'Custom' ? 'white' : 'transparent',
                        color: dateFilterMode === 'Custom' ? '#2563eb' : '#64748b',
                        boxShadow: dateFilterMode === 'Custom' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    自訂 (Custom)
                </button>

                {dateFilterMode === 'Custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '16px', borderLeft: '1px solid #cbd5e1' }}>
                        <input
                            type="date"
                            value={customDateRange.start}
                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, outline: 'none' }}
                        />
                        <span style={{ color: '#94a3b8' }}>→</span>
                        <input
                            type="date"
                            value={customDateRange.end}
                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, outline: 'none' }}
                        />
                    </div>
                )}
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', gap: '16px' }}>
                <input
                    type="text"
                    placeholder="🔍 搜尋傳票編號或說明..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', width: '300px' }}
                />

                {canEdit && (
                    <button
                        onClick={() => { setIsAdding(true); setEditingId(null); }}
                        disabled={isAdding}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: isAdding ? 'not-allowed' : 'pointer',
                            opacity: isAdding ? 0.5 : 1
                        }}
                    >
                        ➕ 新增傳票
                    </button>
                )}
            </div>

            {/* Form - Only for new entries */}
            {isAdding && !editingId && (
                <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '24px',
                    borderRadius: '16px',
                    marginBottom: '24px',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600 }}>
                        ➕ 新增傳票
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>傳票日期</label>
                                <input
                                    type="date"
                                    value={entryForm.entryDate}
                                    onChange={(e) => setEntryForm(p => ({ ...p, entryDate: e.target.value }))}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>傳票說明 <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    value={entryForm.description}
                                    onChange={(e) => setEntryForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="例: 1月份房租收入"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                />
                            </div>
                        </div>

                        {/* Lines */}
                        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>分錄明細</h4>
                                <button type="button" onClick={addLine} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                    + 新增明細
                                </button>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>會計科目</th>
                                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', width: '120px' }}>借方金額</th>
                                        <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', width: '120px' }}>貸方金額</th>
                                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>摘要</th>
                                        <th style={{ padding: '10px', width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line, index) => (
                                        <tr key={index}>
                                            <td style={{ padding: '8px' }}>
                                                <AccountCodeSelect
                                                    accounts={accounts}
                                                    value={line.accountCode}
                                                    onChange={(code, id) => handleAccountSelect(index, code, id)}
                                                    style={{ fontSize: '13px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input
                                                    type="number"
                                                    value={line.debitAmount || ''}
                                                    onChange={(e) => updateLine(index, 'debitAmount', parseFloat(e.target.value) || 0)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', textAlign: 'right' }}
                                                    min="0"
                                                />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input
                                                    type="number"
                                                    value={line.creditAmount || ''}
                                                    onChange={(e) => updateLine(index, 'creditAmount', parseFloat(e.target.value) || 0)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', textAlign: 'right' }}
                                                    min="0"
                                                />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input
                                                    value={line.description}
                                                    onChange={(e) => updateLine(index, 'description', e.target.value)}
                                                    placeholder="摘要"
                                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                {lines.length > 2 && (
                                                    <button type="button" onClick={() => removeLine(index)} style={{ padding: '4px 8px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '4px', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>合計</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: totalDebit > 0 ? '#059669' : '#9ca3af' }}>
                                            ${totalDebit.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: totalCredit > 0 ? '#dc2626' : '#9ca3af' }}>
                                            ${totalCredit.toLocaleString()}
                                        </td>
                                        <td colSpan={2} style={{ padding: '12px' }}>
                                            {isBalanced ? (
                                                <span style={{ color: '#059669', fontSize: '13px' }}>✓ 借貸平衡</span>
                                            ) : (
                                                <span style={{ color: '#dc2626', fontSize: '13px' }}>✗ 借貸不平衡 (差額: ${Math.abs(totalDebit - totalCredit).toLocaleString()})</span>
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button type="button" onClick={resetForm} style={{ padding: '10px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>取消</button>
                            <button type="submit" disabled={!isBalanced} style={{ padding: '10px 32px', backgroundColor: isBalanced ? '#3b82f6' : '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', cursor: isBalanced ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
                                儲存傳票
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Entries Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '14px 16px', width: '40px' }}></th>
                            <th
                                style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => handleSort('entryNumber')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    傳票編號
                                    {sortConfig.key === 'entryNumber' && (
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                            </th>
                            <th
                                style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => handleSort('entryDate')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    日期
                                    {sortConfig.key === 'entryDate' && (
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                            </th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>說明</th>
                            <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>借方</th>
                            <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>貸方</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>狀態</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedEntries.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                    {searchTerm || filterStatus ? '找不到符合條件的傳票' : '尚無傳票資料'}
                                </td>
                            </tr>
                        ) : (
                            displayedEntries.map(entry => (
                                <React.Fragment key={entry.id}>
                                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            <button onClick={() => toggleExpand(entry.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}>
                                                {expandedIds.has(entry.id) ? '▼' : '▶'}
                                            </button>
                                        </td>
                                        <td
                                            style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={() => handleViewSource(entry)}
                                        >
                                            {entry.entryNumber}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>{entry.entryDate}</td>
                                        <td style={{
                                            padding: '14px 16px',
                                            maxWidth: '400px',
                                            minWidth: '200px',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            lineHeight: '1.5',
                                            fontSize: '13px'
                                        }}>{entry.description}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500 }}>${entry.totalDebit.toLocaleString()}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500 }}>${entry.totalCredit.toLocaleString()}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                backgroundColor: statusColors[entry.status].bg,
                                                color: statusColors[entry.status].text
                                            }}>
                                                {statusLabels[entry.status]}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                {/* Edit Button - Only for Draft entries */}
                                                {entry.status === 'Draft' && onUpdate && (
                                                    <button
                                                        onClick={() => handleEdit(entry)}
                                                        style={{ padding: '6px 12px', backgroundColor: '#e0f2fe', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#0369a1', cursor: 'pointer' }}
                                                    >
                                                        編輯
                                                    </button>
                                                )}

                                                {entry.status === 'Draft' && canEdit && (
                                                    <button
                                                        onClick={() => onPost(entry.id)}
                                                        style={{ padding: '6px 12px', backgroundColor: '#dcfce7', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#166534', cursor: 'pointer' }}
                                                    >
                                                        過帳
                                                    </button>
                                                )}

                                                {/* Delete Button - Only for Draft */}
                                                {entry.status === 'Draft' && onDelete && (
                                                    <button
                                                        onClick={() => handleDelete(entry.id)}
                                                        style={{ padding: '6px 12px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#991b1b', cursor: 'pointer' }}
                                                    >
                                                        刪除
                                                    </button>
                                                )}

                                                {/* Revert Button - Only for Posted entries */}
                                                {entry.status === 'Posted' && onRevert && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('確定要退回此傳票嗎？將會回逆總帳影響並恢復為草稿狀態。')) {
                                                                onRevert(entry.id);
                                                            }
                                                        }}
                                                        style={{ padding: '6px 12px', backgroundColor: '#fef3c7', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#92400e', cursor: 'pointer' }}
                                                    >
                                                        退回
                                                    </button>
                                                )}

                                                {(entry.status === 'Pending' || entry.status === 'Posted') && (
                                                    <button
                                                        onClick={() => onVoid(entry.id)}
                                                        style={{ padding: '6px 12px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#991b1b', cursor: 'pointer' }}
                                                    >
                                                        作廢
                                                    </button>
                                                )}

                                                {/* Print Button - Available for all entries */}
                                                <button
                                                    onClick={() => setPrintEntry(entry)}
                                                    style={{ padding: '6px 12px', backgroundColor: '#e0e7ff', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#3730a3', cursor: 'pointer' }}
                                                >
                                                    🖨️ 列印
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedIds.has(entry.id) && (
                                        <tr key={`${entry.id}-exp`}>
                                            <td colSpan={8} style={{ padding: '0', backgroundColor: '#f8fafc' }}>
                                                <div style={{ padding: '16px' }}>
                                                    <table style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white' }}>
                                                        <thead>
                                                            <tr style={{ backgroundColor: '#f1f5f9', fontSize: '12px', color: '#64748b' }}>
                                                                <th style={{ padding: '8px' }}>代碼</th>
                                                                <th style={{ padding: '8px' }}>會計科目</th>
                                                                <th style={{ padding: '8px' }}>摘要</th>
                                                                <th style={{ padding: '8px', textAlign: 'right' }}>借方</th>
                                                                <th style={{ padding: '8px', textAlign: 'right' }}>貸方</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {entry.lines?.map((line, idx) => {
                                                                const account = accounts.find(a => a.id === line.accountId);
                                                                const displayCode = line.accountCode || account?.code || '-';
                                                                const displayName = line.accountName || account?.name || '-';
                                                                return (
                                                                    <tr key={idx} style={{ fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}>
                                                                        <td style={{ padding: '8px', fontFamily: 'monospace' }}>{displayCode}</td>
                                                                        <td style={{ padding: '8px' }}>{displayName}</td>
                                                                        <td style={{ padding: '8px' }}>{line.description}</td>
                                                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: line.debitAmount > 0 ? '#059669' : '#9ca3af' }}>
                                                                            {line.debitAmount > 0 ? line.debitAmount.toLocaleString() : '-'}
                                                                        </td>
                                                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: line.creditAmount > 0 ? '#dc2626' : '#9ca3af' }}>
                                                                            {line.creditAmount > 0 ? line.creditAmount.toLocaleString() : '-'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>

                                                    {/* Inline Edit Form */}
                                                    {editingId === entry.id && (
                                                        <div style={{ marginTop: '16px', padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                                                            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#1e40af' }}>✏️ 編輯傳票</h4>
                                                            <form onSubmit={handleSubmit}>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '12px', marginBottom: '16px' }}>
                                                                    <div>
                                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>傳票日期</label>
                                                                        <input
                                                                            type="date"
                                                                            value={entryForm.entryDate}
                                                                            onChange={(e) => setEntryForm(p => ({ ...p, entryDate: e.target.value }))}
                                                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>傳票說明</label>
                                                                        <input
                                                                            value={entryForm.description}
                                                                            onChange={(e) => setEntryForm(p => ({ ...p, description: e.target.value }))}
                                                                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Lines Table */}
                                                                <div style={{ marginBottom: '12px' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                                        <span style={{ fontSize: '13px', fontWeight: 600 }}>分錄明細</span>
                                                                        <button type="button" onClick={addLine} style={{ padding: '4px 10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                                                                            + 新增明細
                                                                        </button>
                                                                    </div>
                                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                        <thead>
                                                                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                                                                <th style={{ padding: '6px', textAlign: 'left' }}>會計科目</th>
                                                                                <th style={{ padding: '6px', textAlign: 'right', width: '100px' }}>借方金額</th>
                                                                                <th style={{ padding: '6px', textAlign: 'right', width: '100px' }}>貸方金額</th>
                                                                                <th style={{ padding: '6px', textAlign: 'left' }}>摘要</th>
                                                                                <th style={{ padding: '6px', width: '40px' }}></th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {lines.map((line, index) => (
                                                                                <tr key={index}>
                                                                                    <td style={{ padding: '4px' }}>
                                                                                        <AccountCodeSelect
                                                                                            accounts={accounts}
                                                                                            value={line.accountCode}
                                                                                            onChange={(code, id) => handleAccountSelect(index, code, id)}
                                                                                            style={{ fontSize: '12px' }}
                                                                                        />
                                                                                    </td>
                                                                                    <td style={{ padding: '4px' }}>
                                                                                        <input
                                                                                            type="number"
                                                                                            value={line.debitAmount || ''}
                                                                                            onChange={(e) => updateLine(index, 'debitAmount', parseFloat(e.target.value) || 0)}
                                                                                            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', textAlign: 'right', fontSize: '12px' }}
                                                                                            min="0"
                                                                                        />
                                                                                    </td>
                                                                                    <td style={{ padding: '4px' }}>
                                                                                        <input
                                                                                            type="number"
                                                                                            value={line.creditAmount || ''}
                                                                                            onChange={(e) => updateLine(index, 'creditAmount', parseFloat(e.target.value) || 0)}
                                                                                            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', textAlign: 'right', fontSize: '12px' }}
                                                                                            min="0"
                                                                                        />
                                                                                    </td>
                                                                                    <td style={{ padding: '4px' }}>
                                                                                        <input
                                                                                            value={line.description}
                                                                                            onChange={(e) => updateLine(index, 'description', e.target.value)}
                                                                                            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px' }}
                                                                                        />
                                                                                    </td>
                                                                                    <td style={{ padding: '4px', textAlign: 'center' }}>
                                                                                        {lines.length > 2 && (
                                                                                            <button type="button" onClick={() => removeLine(index)} style={{ padding: '2px 6px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '4px', color: '#dc2626', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                        <tfoot>
                                                                            <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 600 }}>
                                                                                <td style={{ padding: '8px', textAlign: 'right' }}>合計</td>
                                                                                <td style={{ padding: '8px', textAlign: 'right', color: totalDebit > 0 ? '#059669' : '#9ca3af' }}>${totalDebit.toLocaleString()}</td>
                                                                                <td style={{ padding: '8px', textAlign: 'right', color: totalCredit > 0 ? '#dc2626' : '#9ca3af' }}>${totalCredit.toLocaleString()}</td>
                                                                                <td colSpan={2} style={{ padding: '8px', fontSize: '12px' }}>
                                                                                    {isBalanced ? (
                                                                                        <span style={{ color: '#059669' }}>✓ 借貸平衡</span>
                                                                                    ) : (
                                                                                        <span style={{ color: '#dc2626' }}>✗ 差額: ${Math.abs(totalDebit - totalCredit).toLocaleString()}</span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        </tfoot>
                                                                    </table>
                                                                </div>

                                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                                    <button type="button" onClick={resetForm} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>取消</button>
                                                                    <button type="submit" disabled={!isBalanced} style={{ padding: '8px 20px', backgroundColor: isBalanced ? '#3b82f6' : '#9ca3af', color: 'white', border: 'none', borderRadius: '6px', cursor: isBalanced ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '13px' }}>
                                                                        儲存變更
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                )}
                {sourceModal.open && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                    }}>
                        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', width: '500px', maxWidth: '90%' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                                📂 原始來源資料 ({sourceModal.type})
                            </h3>
                            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {/* Formatted Data View */}
                                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: '14px' }}>
                                    <div style={{ fontWeight: 600, color: '#64748b' }}>來源 ID:</div>
                                    <div style={{ fontFamily: 'monospace' }}>{sourceModal.id}</div>
                                </div>

                                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '13px', overflowX: 'auto' }}>
                                    <pre style={{ margin: 0, fontFamily: 'monospace' }}>
                                        {JSON.stringify(sourceModal.data, null, 2)}
                                    </pre>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button onClick={() => setSourceModal({ ...sourceModal, open: false })} style={{ padding: '10px 24px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                    關閉
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Print Modal */}
            {printEntry && (
                <JournalVoucherPrint
                    entry={printEntry}
                    accounts={accounts}
                    hotelName="飯店管理系統"
                    onClose={() => setPrintEntry(null)}
                />
            )}
        </div>
    );
};

export default JournalEntryManagement;
