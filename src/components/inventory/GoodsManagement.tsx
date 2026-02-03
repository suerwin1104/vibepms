
import React, { useState, useEffect } from 'react';
import {
    DocumentType,
    GoodsReceipt,
    GoodsReceiptItem,
    GoodsIssue,
    GoodsIssueItem,
    PurchaseOrder,
    Warehouse,
    InventoryItem,
    Staff,
    GRStatus,
    GIStatus
} from '../../types';
import DocumentDetailsModal from '../procurement/DocumentDetailsModal';
import Pagination from '../common/Pagination';
import { getVisibleRequesterIds } from '../../utils/documentPermissions';

interface GoodsManagementProps {
    selectedHotelId: string;
    currentUser: Staff | null;
    documentTypes: DocumentType[];
    warehouses: Warehouse[];
    inventoryItems: InventoryItem[];
    purchaseOrders: PurchaseOrder[];
    goodsReceipts: GoodsReceipt[];
    goodsIssues: GoodsIssue[];
    onAddGR: (gr: Partial<GoodsReceipt>, items: Partial<GoodsReceiptItem>[]) => Promise<void>;
    onUpdateGRStatus: (id: string, status: GRStatus) => Promise<void>;
    onAddGI: (gi: Partial<GoodsIssue>, items: Partial<GoodsIssueItem>[]) => Promise<void>;
    onUpdateGIStatus: (id: string, status: GIStatus) => Promise<void>;
    allStaff?: Staff[];
}

type SubTab = 'receipts' | 'issues';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    'Draft': { bg: '#f1f5f9', text: '#475569' },
    'Pending': { bg: '#fef3c7', text: '#92400e' },
    'Approved': { bg: '#dcfce7', text: '#166534' },
    'Received': { bg: '#dbeafe', text: '#1e40af' },
    'Inspecting': { bg: '#fef3c7', text: '#92400e' },
    'Completed': { bg: '#dcfce7', text: '#166534' },
    'Rejected': { bg: '#fee2e2', text: '#991b1b' },
    'Issued': { bg: '#dcfce7', text: '#166534' },
    'Cancelled': { bg: '#f3f4f6', text: '#6b7280' }
};

const STATUS_LABELS: Record<string, string> = {
    'Draft': '草稿', 'Pending': '待審核', 'Approved': '已核准', 'Received': '已收貨',
    'Inspecting': '驗收中', 'Completed': '已完成', 'Rejected': '已駁回', 'Issued': '已出貨', 'Cancelled': '已取消'
};

const GoodsManagement: React.FC<GoodsManagementProps> = ({
    selectedHotelId,
    currentUser,
    documentTypes,
    warehouses,
    inventoryItems,
    purchaseOrders,
    goodsReceipts,
    goodsIssues,
    onAddGR,
    onUpdateGRStatus,
    onAddGI,
    onUpdateGIStatus,
    allStaff = []
}) => {
    const [subTab, setSubTab] = useState<SubTab>('receipts');
    const [isAddingGR, setIsAddingGR] = useState(false);
    const [isAddingGI, setIsAddingGI] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [modalType, setModalType] = useState<'PR' | 'PO' | 'GR' | 'GI' | 'ST' | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const [grForm, setGRForm] = useState({ poId: '', warehouseId: '', invoiceNumber: '', notes: '' });
    const [grItems, setGRItems] = useState<{ itemId: string; itemName: string; receivedQuantity: number; acceptedQuantity: number; unit: string; unitPrice: number }[]>([]);

    const [giForm, setGIForm] = useState({ warehouseId: '', department: '', purpose: '', notes: '' });
    const [giItems, setGIItems] = useState<{ itemId: string; itemName: string; quantity: number; unit: string }[]>([]);

    const grDocTypes = documentTypes.filter(dt => dt.category === 'GOODS_RECEIPT' && dt.isActive);
    const giDocTypes = documentTypes.filter(dt => dt.category === 'GOODS_ISSUE' && dt.isActive);
    const hotelWarehouses = warehouses.filter(w => w.hotelId === selectedHotelId && w.isActive);
    const approvedPOs = purchaseOrders.filter(po => po.hotelId === selectedHotelId && (po.status === 'Approved' || po.status === 'Ordered' || po.status === 'PartialReceived'));

    // 使用權限過濾: 申請人僅見自己的，主管可見下屬的，GroupAdmin 見全部
    const visible = getVisibleRequesterIds(currentUser, allStaff);

    const filteredGRs = goodsReceipts.filter(gr => {
        if (gr.hotelId !== selectedHotelId) return false;
        // 狀態篩選 (不分大小寫比對)
        if (filterStatus !== 'ALL' && gr.status?.toUpperCase() !== filterStatus.toUpperCase()) return false;
        if (visible === 'all') return true;
        return visible.ids.includes(gr.receiverId || '') || visible.names.includes(gr.receiverName || '');
    });

    const filteredGIs = goodsIssues.filter(gi => {
        if (gi.hotelId !== selectedHotelId) return false;
        // 狀態篩選 (不分大小寫比對)
        if (filterStatus !== 'ALL' && gi.status?.toUpperCase() !== filterStatus.toUpperCase()) return false;
        if (visible === 'all') return true;
        return visible.ids.includes(gi.issuerId || '') || visible.names.includes(gi.issuerName || '');
    });

    // Reset pagination when tab or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [subTab, filterStatus]);

    const handleSubmitGR = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!grForm.warehouseId || grItems.length === 0) { alert('請選擇倉庫並加入品項'); return; }
        const warehouse = hotelWarehouses.find(w => w.id === grForm.warehouseId);
        const po = purchaseOrders.find(p => p.id === grForm.poId);
        await onAddGR({
            hotelId: selectedHotelId,
            poId: grForm.poId || undefined,
            poNumber: po?.poNumber,
            warehouseId: grForm.warehouseId,
            warehouseName: warehouse?.name,
            receiverId: currentUser?.id,
            receiverName: currentUser?.name,
            invoiceNumber: grForm.invoiceNumber,
            totalAmount: grItems.reduce((sum, i) => sum + (i.acceptedQuantity * i.unitPrice), 0),
            notes: grForm.notes,
            status: 'Received'
        }, grItems.map((item, idx) => ({
            lineNumber: idx + 1, ...item, rejectedQuantity: item.receivedQuantity - item.acceptedQuantity, amount: item.acceptedQuantity * item.unitPrice
        })));
        setIsAddingGR(false);
        setGRForm({ poId: '', warehouseId: '', invoiceNumber: '', notes: '' });
        setGRItems([]);
    };

    const handleSubmitGI = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!giForm.warehouseId || giItems.length === 0) { alert('請選擇倉庫並加入品項'); return; }
        const warehouse = hotelWarehouses.find(w => w.id === giForm.warehouseId);
        await onAddGI({
            hotelId: selectedHotelId,
            warehouseId: giForm.warehouseId,
            warehouseName: warehouse?.name,
            issuerId: currentUser?.id,
            issuerName: currentUser?.name,
            department: giForm.department,
            purpose: giForm.purpose,
            totalAmount: 0,
            notes: giForm.notes,
            status: 'Draft'
        }, giItems.map((item, idx) => ({ lineNumber: idx + 1, ...item, unitCost: 0, amount: 0 })));
        setIsAddingGI(false);
        setGIForm({ warehouseId: '', department: '', purpose: '', notes: '' });
        setGIItems([]);
    };

    // Calculate displayed items for the current tab
    const currentList = subTab === 'receipts' ? filteredGRs : filteredGIs;
    const totalPages = Math.ceil(currentList.length / ITEMS_PER_PAGE);
    const displayedItems = currentList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);


    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>📥 進出貨管理</h2>
                <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>進貨驗收與出貨/領用管理</p>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
                {[{ key: 'receipts', label: '📥 進貨驗收' }, { key: 'issues', label: '📤 出貨/領用' }].map(tab => (
                    <button key={tab.key} onClick={() => { setSubTab(tab.key as SubTab); setFilterStatus('ALL'); }}
                        style={{
                            padding: '10px 20px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                            backgroundColor: subTab === tab.key ? 'white' : 'transparent', color: subTab === tab.key ? '#1e40af' : '#64748b',
                            boxShadow: subTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Goods Receipts */}
            {subTab === 'receipts' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                            <option value="ALL">全部狀態</option>
                            <option value="Received">已收貨</option>
                            <option value="Inspecting">驗收中</option>
                            <option value="Completed">已完成</option>
                        </select>
                        <button onClick={() => setIsAddingGR(true)} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>
                            ➕ 新增進貨單
                        </button>
                    </div>

                    {isAddingGR && (
                        <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>新增進貨驗收單</h3>
                            <form onSubmit={handleSubmitGR}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                                    <select value={grForm.poId} onChange={(e) => setGRForm(p => ({ ...p, poId: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                        <option value="">關聯採購單 (選填)</option>
                                        {approvedPOs.map(po => <option key={po.id} value={po.id}>{po.poNumber}</option>)}
                                    </select>
                                    <select value={grForm.warehouseId} onChange={(e) => setGRForm(p => ({ ...p, warehouseId: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                        <option value="">入庫倉庫 *</option>
                                        {hotelWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                    <input placeholder="發票號碼" value={grForm.invoiceNumber} onChange={(e) => setGRForm(p => ({ ...p, invoiceNumber: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <input placeholder="備註" value={grForm.notes} onChange={(e) => setGRForm(p => ({ ...p, notes: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <h4 style={{ margin: 0 }}>進貨品項</h4>
                                        <button type="button" onClick={() => setGRItems([...grItems, { itemId: '', itemName: '', receivedQuantity: 1, acceptedQuantity: 1, unit: 'PCS', unitPrice: 0 }])}
                                            style={{ padding: '6px 14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>+ 加入品項</button>
                                    </div>
                                    {grItems.map((item, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '12px', marginBottom: '8px' }}>
                                            <select value={item.itemId} onChange={(e) => { const inv = inventoryItems.find(i => i.id === e.target.value); const newItems = [...grItems]; newItems[idx] = { ...item, itemId: e.target.value, itemName: inv?.name || '', unit: inv?.unit || 'PCS', unitPrice: inv?.defaultUnitPrice || 0 }; setGRItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                                <option value="">選擇品項</option>
                                                {inventoryItems.map(inv => <option key={inv.id} value={inv.id}>{inv.code} - {inv.name}</option>)}
                                            </select>
                                            <input type="number" placeholder="入庫數量" value={item.receivedQuantity} onChange={(e) => { const newItems = [...grItems]; newItems[idx].receivedQuantity = parseInt(e.target.value) || 0; setGRItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                            <input type="number" placeholder="驗收數量" value={item.acceptedQuantity} onChange={(e) => { const newItems = [...grItems]; newItems[idx].acceptedQuantity = parseInt(e.target.value) || 0; setGRItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                            <input placeholder="單位" value={item.unit} readOnly style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb' }} />
                                            <input type="number" placeholder="單價" value={item.unitPrice} onChange={(e) => { const newItems = [...grItems]; newItems[idx].unitPrice = parseFloat(e.target.value) || 0; setGRItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                            <button type="button" onClick={() => setGRItems(grItems.filter((_, i) => i !== idx))} style={{ padding: '10px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '8px', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>確認入庫</button>
                                    <button type="button" onClick={() => { setIsAddingGR(false); setGRItems([]); }} style={{ padding: '10px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>取消</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>單號</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>採購單</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>入庫倉庫</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>收貨人</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>金額</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>狀態</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedItems.length === 0 ? (
                                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>無進貨單資料</td></tr>
                                ) : (
                                    (displayedItems as GoodsReceipt[]).map(gr => {
                                        const po = purchaseOrders.find(p => p.id === gr.poId);
                                        const warehouse = warehouses.find(w => w.id === gr.warehouseId);
                                        return (
                                            <tr key={gr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>
                                                    <button
                                                        onClick={() => { setSelectedDoc(gr); setModalType('GR'); }}
                                                        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}
                                                    >
                                                        {gr.grNumber}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>{po?.poNumber || gr.poNumber || '-'}</td>
                                                <td style={{ padding: '14px 16px' }}>{warehouse?.name || gr.warehouseName || '-'}</td>
                                                <td style={{ padding: '14px 16px' }}>{gr.receiverName}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500 }}>${(gr.totalAmount || 0).toLocaleString()}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', backgroundColor: STATUS_COLORS[gr.status]?.bg, color: STATUS_COLORS[gr.status]?.text }}>{STATUS_LABELS[gr.status]}</span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        <div style={{ padding: '16px' }}>
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    </div>
                </div>
            )}

            {/* Goods Issues */}
            {subTab === 'issues' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                            <option value="ALL">全部狀態</option>
                            <option value="Draft">草稿</option>
                            <option value="Pending">待審核</option>
                            <option value="Issued">已出貨</option>
                        </select>
                        <button onClick={() => setIsAddingGI(true)} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>
                            ➕ 新增領用單
                        </button>
                    </div>

                    {isAddingGI && (
                        <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>新增領用單</h3>
                            <form onSubmit={handleSubmitGI}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                                    <select value={giForm.warehouseId} onChange={(e) => setGIForm(p => ({ ...p, warehouseId: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                        <option value="">出庫倉庫 *</option>
                                        {hotelWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                    <input placeholder="領用部門" value={giForm.department} onChange={(e) => setGIForm(p => ({ ...p, department: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <input placeholder="用途" value={giForm.purpose} onChange={(e) => setGIForm(p => ({ ...p, purpose: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <input placeholder="備註" value={giForm.notes} onChange={(e) => setGIForm(p => ({ ...p, notes: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <h4 style={{ margin: 0 }}>領用品項</h4>
                                        <button type="button" onClick={() => setGIItems([...giItems, { itemId: '', itemName: '', quantity: 1, unit: 'PCS' }])}
                                            style={{ padding: '6px 14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>+ 加入品項</button>
                                    </div>
                                    {giItems.map((item, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', marginBottom: '8px' }}>
                                            <select value={item.itemId} onChange={(e) => { const inv = inventoryItems.find(i => i.id === e.target.value); const newItems = [...giItems]; newItems[idx] = { ...item, itemId: e.target.value, itemName: inv?.name || '', unit: inv?.unit || 'PCS' }; setGIItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                                <option value="">選擇品項</option>
                                                {inventoryItems.map(inv => <option key={inv.id} value={inv.id}>{inv.code} - {inv.name}</option>)}
                                            </select>
                                            <input type="number" placeholder="數量" value={item.quantity} onChange={(e) => { const newItems = [...giItems]; newItems[idx].quantity = parseInt(e.target.value) || 0; setGIItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                            <input placeholder="單位" value={item.unit} readOnly style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb' }} />
                                            <button type="button" onClick={() => setGIItems(giItems.filter((_, i) => i !== idx))} style={{ padding: '10px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '8px', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>儲存</button>
                                    <button type="button" onClick={() => { setIsAddingGI(false); setGIItems([]); }} style={{ padding: '10px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>取消</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>單號</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>出庫倉庫</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>領用部門</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>用途</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>發放人</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>狀態</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedItems.length === 0 ? (
                                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>無領用單資料</td></tr>
                                ) : (
                                    (displayedItems as GoodsIssue[]).map(gi => {
                                        const warehouse = warehouses.find(w => w.id === gi.warehouseId);
                                        return (
                                            <tr key={gi.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>
                                                    <button
                                                        onClick={() => { setSelectedDoc(gi); setModalType('GI'); }}
                                                        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}
                                                    >
                                                        {gi.giNumber}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>{warehouse?.name || gi.warehouseName || '-'}</td>
                                                <td style={{ padding: '14px 16px' }}>{gi.department || '-'}</td>
                                                <td style={{ padding: '14px 16px', color: '#6b7280' }}>{gi.purpose || '-'}</td>
                                                <td style={{ padding: '14px 16px' }}>{gi.issuerName}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', backgroundColor: STATUS_COLORS[gi.status]?.bg, color: STATUS_COLORS[gi.status]?.text }}>{STATUS_LABELS[gi.status]}</span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        <div style={{ padding: '16px' }}>
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    </div>
                </div>
            )
            }

            <DocumentDetailsModal
                visible={!!selectedDoc}
                onClose={() => { setSelectedDoc(null); setModalType(null); }}
                document={selectedDoc}
                type={modalType || 'GR'}
            />
        </div >
    );
};

export default GoodsManagement;
