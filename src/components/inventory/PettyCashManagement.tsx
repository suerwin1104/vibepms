
import React, { useState, useMemo, useCallback } from 'react';
import { PettyCashAccount, PettyCashTransaction, Staff, Hotel, ChartOfAccount } from '../../types';
import Pagination from '../common/Pagination';
import { getVisibleRequesterIds } from '../../utils/documentPermissions';
import { SortConfig, sortData } from '../common/SortableHeader';
import AccountCodeSelect from '../common/AccountCodeSelect';

interface Props {
    hotels: Hotel[];
    selectedHotelId: string;
    currentUser: Staff | null;
    accounts: PettyCashAccount[];
    chartOfAccounts: ChartOfAccount[];
    transactions: PettyCashTransaction[];
    onAddAccount: (account: Partial<PettyCashAccount>) => Promise<void>;
    onUpdateAccount?: (id: string, updates: Partial<PettyCashAccount>) => Promise<void>;
    onDeleteAccount?: (id: string) => Promise<void>;
    onAddTransaction: (tx: Partial<PettyCashTransaction>) => Promise<void>;
    onSubmitForApproval: (txId: string) => Promise<void>;
    allStaff?: Staff[];
}

const PettyCashManagement: React.FC<Props> = ({
    selectedHotelId, currentUser, accounts, chartOfAccounts, transactions, onAddAccount, onUpdateAccount, onDeleteAccount, onAddTransaction, onSubmitForApproval, allStaff = []
}) => {
    const [subTab, setSubTab] = useState<'accounts' | 'transactions'>('accounts');
    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [editingAccount, setEditingAccount] = useState<PettyCashAccount | null>(null);
    const [isAddingTx, setIsAddingTx] = useState(false);
    const [accountForm, setAccountForm] = useState({ accountName: '', creditLimit: 50000 });
    const [txForm, setTxForm] = useState({ accountId: '', transactionType: 'EXPENSE' as any, amount: 0, description: '', vendorName: '', expenseCategory: '', accountingCode: '' });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Sorting state
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    // Sort handler
    const handleSort = useCallback((key: string) => {
        setSortConfig(prev => {
            if (prev?.key !== key) return { key, direction: 'asc' };
            if (prev.direction === 'asc') return { key, direction: 'desc' };
            if (prev.direction === 'desc') return null;
            return { key, direction: 'asc' };
        });
    }, []);

    const hotelAccounts = accounts.filter(a => a.hotelId === selectedHotelId);

    // 權限檢查：僅 GroupAdmin、HotelAdmin 或財務相關角色可管理帳戶
    const canManageAccounts = useMemo(() => {
        if (!currentUser) return false;
        const allowedRoles = ['GroupAdmin', 'HotelAdmin', 'Finance', 'FinanceManager', 'Accounting'];
        return allowedRoles.includes(currentUser.role) ||
            currentUser.role?.toLowerCase().includes('finance') ||
            currentUser.role?.toLowerCase().includes('財務') ||
            currentUser.title?.toLowerCase().includes('財務');
    }, [currentUser]);

    // 使用權限過濾: 申請人僅見自己的，主管可見下屬的，GroupAdmin 見全部
    const visible = getVisibleRequesterIds(currentUser, allStaff);
    const accountTxs = transactions.filter(t => {
        // 飯店篩選
        if (!hotelAccounts.some(a => a.id === t.accountId)) return false;
        // 權限篩選
        if (visible === 'all') return true;
        return visible.ids.includes(t.handlerId || '') || visible.names.includes(t.handlerName || '');
    });

    // Apply sorting
    const sortedTxs = useMemo(() => sortData(accountTxs, sortConfig), [accountTxs, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(sortedTxs.length / ITEMS_PER_PAGE);
    const displayedTxs = sortedTxs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleAddAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountForm.accountName) { alert('請填寫帳戶名稱'); return; }
        await onAddAccount({ hotelId: selectedHotelId, ...accountForm, custodianId: currentUser?.id, custodianName: currentUser?.name, balance: 0, isActive: true });
        setIsAddingAccount(false); setAccountForm({ accountName: '', creditLimit: 50000 });
    };

    const handleEditAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAccount || !accountForm.accountName) { alert('請填寫帳戶名稱'); return; }
        if (onUpdateAccount) {
            await onUpdateAccount(editingAccount.id, { accountName: accountForm.accountName, creditLimit: accountForm.creditLimit });
        }
        setEditingAccount(null); setAccountForm({ accountName: '', creditLimit: 50000 });
    };

    const handleDeleteAccount = async (acc: PettyCashAccount) => {
        if (!confirm(`確定要刪除帳戶「${acc.accountName}」嗎？\n\n注意：如有相關交易記錄可能無法刪除。`)) return;
        if (onDeleteAccount) {
            try {
                await onDeleteAccount(acc.id);
            } catch (e: any) {
                alert(`刪除失敗：${e.message}`);
            }
        }
    };

    const handleAddTx = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!txForm.accountId || txForm.amount <= 0) { alert('請選擇帳戶並填寫金額'); return; }
        const account = hotelAccounts.find(a => a.id === txForm.accountId);
        const balanceAfter = txForm.transactionType === 'REPLENISH' ? (account?.balance || 0) + txForm.amount : (account?.balance || 0) - txForm.amount;
        // Balance will be updated upon approval, so here we just pass the calculated value for reference or update logic
        // But since we removed immediate update in App.tsx for drafts, this balanceAfter is provisional.
        await onAddTransaction({ ...txForm, transactionDate: new Date().toISOString().split('T')[0], balanceAfter, handlerId: currentUser?.id, handlerName: currentUser?.name, status: 'Draft' });
        setIsAddingTx(false); setTxForm({ accountId: '', transactionType: 'EXPENSE', amount: 0, description: '', vendorName: '', expenseCategory: '', accountingCode: '' });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Draft': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#e2e8f0', color: '#475569' }}>草稿</span>;
            case 'Pending': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#fef3c7', color: '#b45309' }}>審核中</span>;
            case 'Approved': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#dcfce7', color: '#166534' }}>已核准</span>;
            case 'Rejected': return <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#fee2e2', color: '#991b1b' }}>已駁回</span>;
            default: return <span>{status}</span>;
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 600 }}>💰 零用金管理</h2>
            <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '14px' }}>零用金帳戶與收支管理</p>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
                {[{ key: 'accounts', label: '🏦 帳戶' }, { key: 'transactions', label: '📝 收支' }].map(tab => (
                    <button key={tab.key} onClick={() => { setSubTab(tab.key as any); setCurrentPage(1); }}
                        style={{
                            padding: '10px 20px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                            backgroundColor: subTab === tab.key ? 'white' : 'transparent', color: subTab === tab.key ? '#1e40af' : '#64748b'
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {subTab === 'accounts' && (
                <div>
                    {/* 權限檢查: 僅管理者或財務主管可新增帳戶 */}
                    {canManageAccounts && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                            <button onClick={() => setIsAddingAccount(true)} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>➕ 新增帳戶</button>
                        </div>
                    )}
                    {isAddingAccount && (
                        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                            <form onSubmit={handleAddAccount} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                                <div><label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>帳戶名稱 *</label><input value={accountForm.accountName} onChange={(e) => setAccountForm(p => ({ ...p, accountName: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', width: '200px' }} /></div>
                                <div><label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>額度上限</label><input type="number" value={accountForm.creditLimit} onChange={(e) => setAccountForm(p => ({ ...p, creditLimit: parseFloat(e.target.value) || 0 }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', width: '150px' }} /></div>
                                <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>新增</button>
                                <button type="button" onClick={() => setIsAddingAccount(false)} style={{ padding: '10px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>取消</button>
                            </form>
                        </div>
                    )}
                    {editingAccount && (
                        <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #f59e0b' }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#92400e' }}>編輯帳戶: {editingAccount.accountName}</h4>
                            <form onSubmit={handleEditAccount} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                                <div><label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>帳戶名稱 *</label><input value={accountForm.accountName} onChange={(e) => setAccountForm(p => ({ ...p, accountName: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', width: '200px' }} /></div>
                                <div><label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>額度上限</label><input type="number" value={accountForm.creditLimit} onChange={(e) => setAccountForm(p => ({ ...p, creditLimit: parseFloat(e.target.value) || 0 }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', width: '150px' }} /></div>
                                <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>儲存</button>
                                <button type="button" onClick={() => { setEditingAccount(null); setAccountForm({ accountName: '', creditLimit: 50000 }); }} style={{ padding: '10px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>取消</button>
                            </form>
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                        {hotelAccounts.map(acc => (
                            <div key={acc.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{acc.accountName}</div>
                                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', backgroundColor: acc.isActive ? '#dcfce7' : '#fee2e2', color: acc.isActive ? '#166534' : '#991b1b' }}>{acc.isActive ? '啟用' : '停用'}</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 700, color: acc.balance >= 0 ? '#059669' : '#dc2626', marginBottom: '8px' }}>${acc.balance.toLocaleString()}</div>
                                <div style={{ fontSize: '13px', color: '#6b7280' }}>額度上限: ${acc.creditLimit.toLocaleString()}</div>
                                {acc.custodianName && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>管理員: {acc.custodianName}</div>}
                                {/* 權限檢查: 僅管理者或財務主管可編輯/刪除 */}
                                {canManageAccounts && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                        <button onClick={() => { setEditingAccount(acc); setAccountForm({ accountName: acc.accountName, creditLimit: acc.creditLimit }); }} style={{ flex: 1, padding: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>編輯</button>
                                        <button onClick={() => handleDeleteAccount(acc)} style={{ flex: 1, padding: '8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>刪除</button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {hotelAccounts.length === 0 && <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '40px', color: '#9ca3af' }}>無零用金帳戶</div>}
                    </div>
                </div>
            )}

            {subTab === 'transactions' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                        <button onClick={() => setIsAddingTx(true)} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>➕ 新增收支</button>
                    </div>
                    {isAddingTx && (
                        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                            <form onSubmit={handleAddTx}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                    <select value={txForm.accountId} onChange={(e) => setTxForm(p => ({ ...p, accountId: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}><option value="">選擇帳戶 *</option>{hotelAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}</select>
                                    <select value={txForm.transactionType} onChange={(e) => setTxForm(p => ({ ...p, transactionType: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}><option value="EXPENSE">支出</option><option value="REPLENISH">撥補</option></select>
                                    <input type="number" placeholder="金額 *" value={txForm.amount || ''} onChange={(e) => setTxForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <AccountCodeSelect
                                        accounts={chartOfAccounts}
                                        value={txForm.accountingCode}
                                        onChange={(code) => setTxForm(p => ({ ...p, accountingCode: code }))}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                    <input placeholder="說明" value={txForm.description} onChange={(e) => setTxForm(p => ({ ...p, description: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <input placeholder="廠商" value={txForm.vendorName} onChange={(e) => setTxForm(p => ({ ...p, vendorName: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <input placeholder="費用類別" value={txForm.expenseCategory} onChange={(e) => setTxForm(p => ({ ...p, expenseCategory: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>新增</button>
                                    <button type="button" onClick={() => setIsAddingTx(false)} style={{ padding: '10px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>取消</button>
                                </div>
                            </form>
                        </div>
                    )}
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ backgroundColor: '#f8fafc' }}>
                                {[
                                    { key: 'transactionDate', label: '日期', align: 'left' },
                                    { key: 'accountName', label: '帳戶', align: 'left' },
                                    { key: 'transactionType', label: '類型', align: 'left' },
                                    { key: 'amount', label: '金額', align: 'right' },
                                    { key: 'description', label: '說明', align: 'left' },
                                    { key: 'handlerName', label: '經手人', align: 'left' },
                                    { key: 'status', label: '狀態', align: 'left' }
                                ].map(col => {
                                    const isActive = sortConfig?.key === col.key;
                                    const direction = isActive ? sortConfig.direction : null;
                                    return (
                                        <th key={col.key} onClick={() => handleSort(col.key)}
                                            style={{ padding: '14px 16px', textAlign: col.align as any, fontSize: '13px', fontWeight: 600, cursor: 'pointer', userSelect: 'none', backgroundColor: isActive ? '#e0e7ff' : undefined }}
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                {col.label}
                                                <span style={{ fontSize: '10px', color: isActive ? '#3b82f6' : '#cbd5e1', display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                                                    <span style={{ color: direction === 'asc' ? '#3b82f6' : undefined }}>▲</span>
                                                    <span style={{ color: direction === 'desc' ? '#3b82f6' : undefined }}>▼</span>
                                                </span>
                                            </span>
                                        </th>
                                    );
                                })}
                                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>操作</th>
                            </tr></thead>
                            <tbody>
                                {displayedTxs.length === 0 ? <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>無收支記錄</td></tr> : displayedTxs.map(tx => (
                                    <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '14px 16px' }}>{tx.transactionDate}</td>
                                        <td style={{ padding: '14px 16px' }}>{tx.accountName || hotelAccounts.find(a => a.id === tx.accountId)?.accountName}</td>
                                        <td style={{ padding: '14px 16px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: tx.transactionType === 'REPLENISH' ? '#dcfce7' : '#fee2e2', color: tx.transactionType === 'REPLENISH' ? '#166534' : '#991b1b' }}>{tx.transactionType === 'REPLENISH' ? '撥補' : '支出'}</span></td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500, color: tx.transactionType === 'REPLENISH' ? '#059669' : '#dc2626' }}>{tx.transactionType === 'REPLENISH' ? '+' : '-'}${tx.amount.toLocaleString()}</td>
                                        <td style={{ padding: '14px 16px', color: '#6b7280' }}>{tx.description || '-'}</td>
                                        <td style={{ padding: '14px 16px' }}>{tx.handlerName}</td>
                                        <td style={{ padding: '14px 16px' }}>{getStatusBadge(tx.status)}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                            {tx.status === 'Draft' && (
                                                <button onClick={() => onSubmitForApproval(tx.id)} style={{ padding: '6px 14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>送審</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ padding: '16px' }}>
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PettyCashManagement;
