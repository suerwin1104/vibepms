
import React, { useState, useEffect } from 'react';
import { StockTransfer, StockTransferItem, Warehouse, InventoryItem, Hotel, Staff, STStatus } from '../../types';
import DocumentDetailsModal from '../procurement/DocumentDetailsModal';
import Pagination from '../common/Pagination';

interface Props {
    hotels: Hotel[];
    selectedHotelId: string;
    currentUser: Staff | null;
    warehouses: Warehouse[];
    inventoryItems: InventoryItem[];
    stockTransfers: StockTransfer[];
    onAdd: (st: Partial<StockTransfer>, items: Partial<StockTransferItem>[]) => Promise<void>;
    onUpdateStatus: (id: string, status: STStatus) => Promise<void>;
    onConfirmReceive: (id: string) => Promise<void>;
}

const STATUS_LABELS: Record<string, string> = {
    'Draft': '草稿', 'Pending': '待審核', 'Approved': '已核准', 'InTransit': '調撥中', 'Received': '已收貨', 'Cancelled': '已取消'
};

const StockTransferManagement: React.FC<Props> = ({
    hotels, selectedHotelId, currentUser, warehouses, inventoryItems, stockTransfers,
    onAdd, onUpdateStatus, onConfirmReceive
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [viewMode, setViewMode] = useState<'outbound' | 'inbound'>('outbound');
    const [form, setForm] = useState({ toHotelId: '', fromWarehouseId: '', priority: 'Normal', reason: '' });
    const [items, setItems] = useState<{ itemId: string; itemName: string; quantity: number; unit: string }[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const fromWarehouses = warehouses.filter(w => w.hotelId === selectedHotelId && w.isActive);
    const toHotels = hotels.filter(h => h.id !== selectedHotelId);

    // Reset pagination when view mode or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [viewMode, filterStatus]);

    const displayTransfers = stockTransfers.filter(st =>
        (viewMode === 'outbound' ? st.fromHotelId === selectedHotelId : st.toHotelId === selectedHotelId) &&
        (filterStatus === 'ALL' || st.status === filterStatus)
    );

    // Pagination Logic
    const totalPages = Math.ceil(displayTransfers.length / ITEMS_PER_PAGE);
    const paginatedTransfers = displayTransfers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.toHotelId || !form.fromWarehouseId || items.length === 0) { alert('請填寫完整資料'); return; }
        const fromWarehouse = fromWarehouses.find(w => w.id === form.fromWarehouseId);
        const toHotel = hotels.find(h => h.id === form.toHotelId);
        await onAdd({
            fromHotelId: selectedHotelId, toHotelId: form.toHotelId, toHotelName: toHotel?.name,
            fromWarehouseId: form.fromWarehouseId, fromWarehouseName: fromWarehouse?.name,
            requesterId: currentUser?.id, requesterName: currentUser?.name,
            priority: form.priority as any, reason: form.reason, totalAmount: 0, status: 'Draft'
        }, items.map((item, idx) => ({ lineNumber: idx + 1, ...item, unitCost: 0, amount: 0, receivedQuantity: 0 })));
        setIsAdding(false); setForm({ toHotelId: '', fromWarehouseId: '', priority: 'Normal', reason: '' }); setItems([]);
    };

    const getStatusStyle = (status: string) => {
        const colors: Record<string, { bg: string; text: string }> = {
            'Draft': { bg: '#f1f5f9', text: '#475569' }, 'Pending': { bg: '#fef3c7', text: '#92400e' },
            'Approved': { bg: '#dcfce7', text: '#166534' }, 'InTransit': { bg: '#dbeafe', text: '#1e40af' },
            'Received': { bg: '#dcfce7', text: '#166534' }, 'Cancelled': { bg: '#f3f4f6', text: '#6b7280' }
        };
        return colors[status] || { bg: '#f1f5f9', text: '#475569' };
    };

    return (
        <div style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 600 }}>🔄 調撥管理</h2>
            <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '14px' }}>飯店間庫存調撥轉貨</p>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
                {['outbound', 'inbound'].map(mode => (
                    <button key={mode} onClick={() => { setViewMode(mode as any); setFilterStatus('ALL'); }}
                        style={{
                            padding: '10px 20px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                            backgroundColor: viewMode === mode ? 'white' : 'transparent', color: viewMode === mode ? '#1e40af' : '#64748b'
                        }}>
                        {mode === 'outbound' ? '📤 調出' : '📥 調入'}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                    <option value="ALL">全部狀態</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {viewMode === 'outbound' && (
                    <button onClick={() => setIsAdding(true)} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>➕ 新增調撥單</button>
                )}
            </div>

            {isAdding && (
                <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>新增調撥單</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                            <select value={form.fromWarehouseId} onChange={(e) => setForm(p => ({ ...p, fromWarehouseId: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                <option value="">調出倉庫 *</option>
                                {fromWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            <select value={form.toHotelId} onChange={(e) => setForm(p => ({ ...p, toHotelId: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                <option value="">調入飯店 *</option>
                                {toHotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                            <select value={form.priority} onChange={(e) => setForm(p => ({ ...p, priority: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                <option value="Normal">一般</option><option value="Urgent">緊急</option>
                            </select>
                            <input placeholder="調撥原因" value={form.reason} onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <h4 style={{ margin: 0 }}>調撥品項</h4>
                                <button type="button" onClick={() => setItems([...items, { itemId: '', itemName: '', quantity: 1, unit: 'PCS' }])} style={{ padding: '6px 14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>+ 加入</button>
                            </div>
                            {items.map((item, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', marginBottom: '8px' }}>
                                    <select value={item.itemId} onChange={(e) => { const inv = inventoryItems.find(i => i.id === e.target.value); const newItems = [...items]; newItems[idx] = { itemId: e.target.value, itemName: inv?.name || '', quantity: item.quantity, unit: inv?.unit || 'PCS' }; setItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                        <option value="">選擇品項</option>
                                        {inventoryItems.map(inv => <option key={inv.id} value={inv.id}>{inv.code} - {inv.name}</option>)}
                                    </select>
                                    <input type="number" value={item.quantity} onChange={(e) => { const newItems = [...items]; newItems[idx].quantity = parseInt(e.target.value) || 0; setItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <input value={item.unit} readOnly style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb' }} />
                                    <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ padding: '10px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '8px', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>建立</button>
                            <button type="button" onClick={() => { setIsAdding(false); setItems([]); }} style={{ padding: '10px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>取消</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>單號</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>調出</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>調入</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>原因</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>狀態</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTransfers.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>無調撥單</td></tr>
                        ) : paginatedTransfers.map(st => {
                            const fromHotel = hotels.find(h => h.id === st.fromHotelId);
                            const fromWarehouse = warehouses.find(w => w.id === st.fromWarehouseId);
                            const toHotel = hotels.find(h => h.id === st.toHotelId);
                            const toWarehouse = warehouses.find(w => w.id === st.toWarehouseId);

                            return (
                                <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>
                                        <button
                                            onClick={() => setSelectedDoc(st)}
                                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}
                                        >
                                            {st.stNumber}
                                        </button>
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <div style={{ fontWeight: 500 }}>{fromHotel?.name || st.fromHotelName || '-'}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{fromWarehouse?.name || st.fromWarehouseName || '-'}</div>
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <div style={{ fontWeight: 500 }}>{toHotel?.name || st.toHotelName || '-'}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{toWarehouse?.name || st.toWarehouseName || '-'}</div>
                                    </td>
                                    <td style={{ padding: '14px 16px', color: '#6b7280' }}>{st.reason || '-'}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', ...getStatusStyle(st.status) }}>{STATUS_LABELS[st.status]}</span>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                        {viewMode === 'outbound' && st.status === 'Approved' && <button onClick={() => onUpdateStatus(st.id, 'InTransit')} style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>出貨</button>}
                                        {viewMode === 'inbound' && st.status === 'InTransit' && <button onClick={() => onConfirmReceive(st.id)} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>收貨</button>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div style={{ padding: '16px' }}>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            </div>

            <DocumentDetailsModal
                visible={!!selectedDoc}
                onClose={() => setSelectedDoc(null)}
                document={selectedDoc}
                type="ST"
            />
        </div>
    );
};

export default StockTransferManagement;
