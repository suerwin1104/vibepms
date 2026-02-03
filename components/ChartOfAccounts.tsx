import React, { useState, useMemo } from 'react';
import { ChartOfAccount, AccountType } from '../types';

interface ChartOfAccountsProps {
    accounts: ChartOfAccount[];
    onAdd: (account: Omit<ChartOfAccount, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onUpdate: (id: string, account: Partial<ChartOfAccount>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({
    accounts,
    onAdd,
    onUpdate,
    onDelete
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<AccountType | ''>('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        code: '',
        name: '',
        type: 'Expense' as AccountType,
        level: 1,
        parentId: '',
        description: '',
        normalBalance: 'Debit' as 'Debit' | 'Credit',
        isActive: true
    });

    const typeLabels: Record<AccountType, string> = {
        Asset: '資產',
        Liability: '負債',
        Equity: '權益',
        Revenue: '收入',
        Expense: '費用'
    };

    const typeColors: Record<AccountType, { bg: string; text: string }> = {
        Asset: { bg: '#dbeafe', text: '#1e40af' },
        Liability: { bg: '#fce7f3', text: '#9d174d' },
        Equity: { bg: '#d1fae5', text: '#065f46' },
        Revenue: { bg: '#fef3c7', text: '#92400e' },
        Expense: { bg: '#fee2e2', text: '#991b1b' }
    };

    // 篩選並排序科目
    const filteredAccounts = useMemo(() => {
        let result = accounts;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(a =>
                a.code.toLowerCase().includes(term) ||
                a.name.toLowerCase().includes(term)
            );
        }

        if (filterType) {
            result = result.filter(a => a.type === filterType);
        }

        return result.sort((a, b) => a.code.localeCompare(b.code));
    }, [accounts, searchTerm, filterType]);

    // 依類型統計
    const stats = useMemo(() => {
        return {
            total: accounts.length,
            active: accounts.filter(a => a.isActive).length,
            byType: (Object.keys(typeLabels) as AccountType[]).reduce((acc, type) => {
                acc[type] = accounts.filter(a => a.type === type).length;
                return acc;
            }, {} as Record<AccountType, number>)
        };
    }, [accounts]);

    const resetForm = () => {
        setForm({
            code: '',
            name: '',
            type: 'Expense',
            level: 1,
            parentId: '',
            description: '',
            normalBalance: 'Debit',
            isActive: true
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code.trim() || !form.name.trim()) {
            alert('請填寫科目代碼和名稱');
            return;
        }

        try {
            if (editingId) {
                await onUpdate(editingId, form);
                setEditingId(null);
            } else {
                await onAdd(form);
                setIsAdding(false);
            }
            resetForm();
        } catch (error) {
            console.error('Save account failed:', error);
        }
    };

    const handleEdit = (account: ChartOfAccount) => {
        setForm({
            code: account.code,
            name: account.name,
            type: account.type,
            level: account.level,
            parentId: account.parentId || '',
            description: account.description || '',
            normalBalance: account.normalBalance,
            isActive: account.isActive
        });
        setEditingId(account.id);
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        resetForm();
    };

    return (
        <div>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '20px', color: 'white' }}>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>總科目數</div>
                    <div style={{ fontSize: '32px', fontWeight: 700 }}>{stats.total}</div>
                </div>
                {(Object.keys(typeLabels) as AccountType[]).map(type => (
                    <div
                        key={type}
                        style={{
                            backgroundColor: typeColors[type].bg,
                            borderRadius: '16px',
                            padding: '20px',
                            color: typeColors[type].text,
                            cursor: 'pointer',
                            border: filterType === type ? `3px solid ${typeColors[type].text}` : '3px solid transparent'
                        }}
                        onClick={() => setFilterType(filterType === type ? '' : type)}
                    >
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>{typeLabels[type]}</div>
                        <div style={{ fontSize: '32px', fontWeight: 700 }}>{stats.byType[type]}</div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', gap: '16px' }}>
                <input
                    type="text"
                    placeholder="🔍 搜尋科目代碼或名稱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', width: '300px' }}
                />
                <button
                    onClick={() => { setIsAdding(true); setEditingId(null); resetForm(); }}
                    disabled={isAdding}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: isAdding ? 'not-allowed' : 'pointer',
                        opacity: isAdding ? 0.5 : 1
                    }}
                >
                    ➕ 新增科目
                </button>
            </div>

            {/* Add/Edit Form */}
            {isAdding && (
                <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '24px',
                    borderRadius: '16px',
                    marginBottom: '24px',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600 }}>
                        {editingId ? '✏️ 編輯會計科目' : '➕ 新增會計科目'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                                    科目代碼 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    value={form.code}
                                    onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
                                    placeholder="例: 1101"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                                    科目名稱 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="例: 現金"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                                    科目類型 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    value={form.type}
                                    onChange={(e) => {
                                        const type = e.target.value as AccountType;
                                        const normalBalance = ['Asset', 'Expense'].includes(type) ? 'Debit' : 'Credit';
                                        setForm(p => ({ ...p, type, normalBalance }));
                                    }}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                >
                                    {(Object.keys(typeLabels) as AccountType[]).map(type => (
                                        <option key={type} value={type}>{typeLabels[type]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                                    正常餘額
                                </label>
                                <select
                                    value={form.normalBalance}
                                    onChange={(e) => setForm(p => ({ ...p, normalBalance: e.target.value as 'Debit' | 'Credit' }))}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                >
                                    <option value="Debit">借方 (Debit)</option>
                                    <option value="Credit">貸方 (Credit)</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>層級</label>
                                <select
                                    value={form.level}
                                    onChange={(e) => setForm(p => ({ ...p, level: parseInt(e.target.value) }))}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                >
                                    <option value={1}>第 1 層 (大類)</option>
                                    <option value={2}>第 2 層 (中類)</option>
                                    <option value={3}>第 3 層 (小類)</option>
                                    <option value={4}>第 4 層 (明細)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>父科目</label>
                                <select
                                    value={form.parentId}
                                    onChange={(e) => setForm(p => ({ ...p, parentId: e.target.value }))}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                >
                                    <option value="">無 (頂層科目)</option>
                                    {accounts.filter(a => a.level < form.level && a.type === form.type).map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>說明</label>
                                <input
                                    value={form.description}
                                    onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="科目說明 (選填)"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))}
                                    style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>啟用此科目</span>
                            </label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={handleCancel} style={{ padding: '10px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>取消</button>
                                <button type="submit" style={{ padding: '10px 32px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                                    {editingId ? '更新' : '新增'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Accounts Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>科目代碼</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>科目名稱</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>類型</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>層級</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>餘額方向</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>狀態</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAccounts.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                    {searchTerm || filterType ? '找不到符合條件的科目' : '尚無會計科目，請新增'}
                                </td>
                            </tr>
                        ) : (
                            filteredAccounts.map(account => (
                                <tr key={account.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600 }}>
                                        {'　'.repeat(account.level - 1)}{account.code}
                                    </td>
                                    <td style={{ padding: '14px 16px', fontWeight: 500 }}>{account.name}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            backgroundColor: typeColors[account.type].bg,
                                            color: typeColors[account.type].text
                                        }}>
                                            {typeLabels[account.type]}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#6b7280' }}>L{account.level}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px' }}>
                                        {account.normalBalance === 'Debit' ? '借' : '貸'}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            backgroundColor: account.isActive ? '#dcfce7' : '#fee2e2',
                                            color: account.isActive ? '#166534' : '#991b1b'
                                        }}>
                                            {account.isActive ? '啟用' : '停用'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => handleEdit(account)}
                                                style={{ padding: '6px 12px', backgroundColor: '#f0f9ff', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#0369a1', cursor: 'pointer' }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => onUpdate(account.id, { isActive: !account.isActive })}
                                                style={{ padding: '6px 12px', backgroundColor: '#f8fafc', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                                            >
                                                {account.isActive ? '停用' : '啟用'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ChartOfAccounts;
