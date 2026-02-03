
import React, { useState, useEffect } from 'react';
import {
    DocumentType,
    Supplier,
    InventoryItem,
    PurchaseRequisition,
    PurchaseRequisitionItem,
    PurchaseOrder,
    PurchaseOrderItem,
    PRStatus,
    POStatus,
    Staff,
    Hotel,
    ChartOfAccount
} from '../../types';
import DocumentDetailsModal from '../procurement/DocumentDetailsModal';
import Modal from '../common/Modal';
import Pagination from '../common/Pagination';
import { getVisibleRequesterIds } from '../../utils/documentPermissions';
import AccountCodeSelect from '../common/AccountCodeSelect';

interface ProcurementManagementProps {
    hotels: Hotel[];
    selectedHotelId: string;
    currentUser: Staff | null;
    documentTypes: DocumentType[];
    suppliers: Supplier[];
    inventoryItems: InventoryItem[];
    purchaseRequisitions: PurchaseRequisition[];
    purchaseOrders: PurchaseOrder[];
    accounts: ChartOfAccount[];
    onAddPR: (pr: Partial<PurchaseRequisition>, items: Partial<PurchaseRequisitionItem>[]) => Promise<void>;
    onUpdatePRStatus: (prId: string, status: PRStatus) => Promise<void>;
    onAddPO: (po: Partial<PurchaseOrder>, items: Partial<PurchaseOrderItem>[]) => Promise<void>;
    onUpdatePOStatus: (poId: string, status: POStatus) => Promise<void>;
    onAddSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onSubmitForApproval: (docId: string, docType: string, nextApproverId?: string) => Promise<void>;
    allStaff?: Staff[]; // Optional for now to avoid breaking other usages immediately if any
}

type SubTab = 'requisitions' | 'orders' | 'suppliers';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    'Draft': { bg: '#f1f5f9', text: '#475569' },
    'Pending': { bg: '#fef3c7', text: '#92400e' },
    'Approved': { bg: '#dcfce7', text: '#166534' },
    'Rejected': { bg: '#fee2e2', text: '#991b1b' },
    'Cancelled': { bg: '#f3f4f6', text: '#6b7280' },
    'Converted': { bg: '#dbeafe', text: '#1e40af' },
    'Ordered': { bg: '#e0e7ff', text: '#3730a3' },
    'PartialReceived': { bg: '#fef3c7', text: '#92400e' },
    'Received': { bg: '#dcfce7', text: '#166534' }
};

const STATUS_LABELS: Record<string, string> = {
    'Draft': '草稿',
    'Pending': '待審核',
    'Approved': '已核准',
    'Rejected': '已駁回',
    'Cancelled': '已取消',
    'Converted': '已轉採購',
    'Ordered': '已下單',
    'PartialReceived': '部分到貨',
    'Received': '已完成'
};

const ProcurementManagement: React.FC<ProcurementManagementProps> = ({
    selectedHotelId,
    currentUser,
    documentTypes,
    suppliers,
    inventoryItems,
    purchaseRequisitions,
    purchaseOrders,
    accounts,
    onAddPR,
    onUpdatePRStatus,
    onAddPO,
    onUpdatePOStatus,
    onAddSupplier,
    onSubmitForApproval,
    allStaff = []
}) => {
    const [subTab, setSubTab] = useState<SubTab>('requisitions');


    // Submit Modal State
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [submitTarget, setSubmitTarget] = useState<{ id: string, type: string, number: string } | null>(null);
    const [selectedApproverId, setSelectedApproverId] = useState<string>('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const handleOpenSubmitModal = (id: string, type: string, number: string) => {
        setSubmitTarget({ id, type, number });
        if (currentUser?.supervisorId) {
            setSelectedApproverId(currentUser.supervisorId);
        } else {
            setSelectedApproverId('');
        }
        setIsSubmitModalOpen(true);
    };

    const handleConfirmSubmit = async () => {
        if (!submitTarget) return;
        await onSubmitForApproval(submitTarget.id, submitTarget.type, selectedApproverId || undefined);
        setIsSubmitModalOpen(false);
        setSubmitTarget(null);
    };
    const [isAddingPR, setIsAddingPR] = useState(false);
    const [isAddingPO, setIsAddingPO] = useState(false);
    const [isAddingSupplier, setIsAddingSupplier] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [modalType, setModalType] = useState<'PR' | 'PO' | 'GR' | 'GI' | 'ST' | null>(null);

    // PR Form
    const [prForm, setPRForm] = useState({
        documentTypeId: '',
        department: '',
        requiredDate: '',
        priority: 'Normal' as 'Low' | 'Normal' | 'High' | 'Urgent',
        notes: ''
    });
    const [prItems, setPRItems] = useState<{ itemId: string; itemName: string; quantity: number; unit: string; estimatedUnitPrice: number }[]>([]);

    // PO Form
    const [poForm, setPOForm] = useState({
        documentTypeId: '',
        prId: '',
        supplierId: '',
        expectedDeliveryDate: '',
        accountingCode: '',
        priority: 'Normal' as 'Low' | 'Normal' | 'High' | 'Urgent',
        notes: ''
    });
    const [poItems, setPOItems] = useState<{ itemId: string; itemName: string; quantity: number; unit: string; unitPrice: number }[]>([]);

    // Supplier Form
    const [supplierForm, setSupplierForm] = useState({
        code: '',
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        taxId: '',
        paymentTerms: '',
        isActive: true
    });

    const prDocTypes = (documentTypes || []).filter(dt => dt.category === 'PURCHASE_REQUISITION' && dt.isActive);
    const poDocTypes = (documentTypes || []).filter(dt => dt.category === 'PURCHASE_ORDER' && dt.isActive);

    // 使用權限過濾: 申請人僅見自己的，主管可見下屬的，GroupAdmin 見全部
    const visible = getVisibleRequesterIds(currentUser, allStaff);

    const filteredPRs = (purchaseRequisitions || []).filter(pr => {
        // 飯店篩選
        if (pr.hotelId !== selectedHotelId) return false;
        // 狀態篩選 (不分大小寫比對)
        if (filterStatus !== 'ALL' && pr.status?.toUpperCase() !== filterStatus.toUpperCase()) return false;
        // 權限篩選
        if (visible === 'all') return true;
        return visible.ids.includes(pr.requesterId) || visible.names.includes(pr.requesterName);
    });

    const filteredPOs = (purchaseOrders || []).filter(po => {
        // 飯店篩選
        if (po.hotelId !== selectedHotelId) return false;
        // 狀態篩選 (不分大小寫比對)
        if (filterStatus !== 'ALL' && po.status?.toUpperCase() !== filterStatus.toUpperCase()) return false;
        // 權限篩選
        if (visible === 'all') return true;
        return visible.ids.includes(po.buyerId || '') || visible.names.includes(po.buyerName || '');
    });

    // Reset pagination when tab or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [subTab, filterStatus]);

    // Derived displayed items based on current tab
    const getPaginationData = () => {
        let totalItems = 0;
        let displayedItems: any[] = [];

        if (subTab === 'requisitions') {
            totalItems = filteredPRs.length;
            displayedItems = filteredPRs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
        } else if (subTab === 'orders') {
            totalItems = filteredPOs.length;
            displayedItems = filteredPOs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
        } else if (subTab === 'suppliers') {
            totalItems = suppliers.length;
            displayedItems = suppliers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
        }

        return { totalItems, displayedItems, totalPages: Math.ceil(totalItems / ITEMS_PER_PAGE) };
    };

    const { displayedItems, totalPages } = getPaginationData();

    const handleAddPRItem = () => {
        setPRItems([...prItems, { itemId: '', itemName: '', quantity: 1, unit: 'PCS', estimatedUnitPrice: 0 }]);
    };

    const handleAddPOItem = () => {
        setPOItems([...poItems, { itemId: '', itemName: '', quantity: 1, unit: 'PCS', unitPrice: 0 }]);
    };

    const handleSubmitPR = async (e: React.FormEvent) => {
        e.preventDefault();
        if (prItems.length === 0) {
            alert('請至少加入一個品項');
            return;
        }
        const totalAmount = prItems.reduce((sum, item) => sum + (item.quantity * item.estimatedUnitPrice), 0);
        await onAddPR({
            hotelId: selectedHotelId,
            documentTypeId: prForm.documentTypeId,
            requesterId: currentUser?.id || '',
            requesterName: currentUser?.name || '',
            department: prForm.department,
            requiredDate: prForm.requiredDate,
            priority: prForm.priority,
            totalAmount,
            notes: prForm.notes,
            status: 'Draft'
        }, prItems.map((item, idx) => ({
            lineNumber: idx + 1,
            ...item,
            estimatedAmount: item.quantity * item.estimatedUnitPrice
        })));
        setIsAddingPR(false);
        setPRForm({ documentTypeId: '', department: '', requiredDate: '', priority: 'Normal', notes: '' });
        setPRItems([]);
    };

    const handleSubmitPO = async (e: React.FormEvent) => {
        e.preventDefault();
        if (poItems.length === 0) {
            alert('請至少加入一個品項');
            return;
        }
        const supplier = suppliers.find(s => s.id === poForm.supplierId);
        const subtotal = poItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const taxAmount = Math.round(subtotal * 0.05);
        await onAddPO({
            hotelId: selectedHotelId,
            documentTypeId: poForm.documentTypeId,
            prId: poForm.prId || undefined,
            supplierId: poForm.supplierId,
            supplierName: supplier?.name,
            buyerId: currentUser?.id,
            buyerName: currentUser?.name,
            expectedDeliveryDate: poForm.expectedDeliveryDate,
            accountingCode: poForm.accountingCode,
            priority: poForm.priority,
            subtotal,
            taxRate: 5,
            taxAmount,
            totalAmount: subtotal + taxAmount,
            notes: poForm.notes,
            status: 'Draft'
        }, poItems.map((item, idx) => ({
            lineNumber: idx + 1,
            ...item,
            ...item,
            amount: item.quantity * item.unitPrice,
            receivedQuantity: 0
        })));
        setIsAddingPO(false);
        setPOForm({ documentTypeId: '', prId: '', supplierId: '', expectedDeliveryDate: '', accountingCode: '', priority: 'Normal', notes: '' });
        setPOItems([]);
    };

    const handleSubmitSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierForm.code || !supplierForm.name) {
            alert('請填寫供應商代碼和名稱');
            return;
        }
        await onAddSupplier(supplierForm);
        setIsAddingSupplier(false);
        setSupplierForm({ code: '', name: '', contactPerson: '', phone: '', email: '', address: '', taxId: '', paymentTerms: '', isActive: true });
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>🛒 採購管理</h2>
                <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
                    請購單、採購單與供應商管理
                </p>
            </div>

            {/* Sub Tabs */}
            <div style={{
                display: 'flex',
                gap: '4px',
                marginBottom: '24px',
                backgroundColor: '#f1f5f9',
                padding: '4px',
                borderRadius: '10px',
                width: 'fit-content'
            }}>
                {[
                    { key: 'requisitions', label: '📝 請購單' },
                    { key: 'orders', label: '📋 採購單' },
                    { key: 'suppliers', label: '🏢 供應商' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setSubTab(tab.key as SubTab); setFilterStatus('ALL'); }}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            backgroundColor: subTab === tab.key ? 'white' : 'transparent',
                            color: subTab === tab.key ? '#1e40af' : '#64748b',
                            boxShadow: subTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Purchase Requisitions Tab */}
            {subTab === 'requisitions' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', minWidth: '150px' }}
                        >
                            <option value="ALL">全部狀態</option>
                            <option value="Draft">草稿</option>
                            <option value="Pending">待審核</option>
                            <option value="Approved">已核准</option>
                            <option value="Rejected">已駁回</option>
                            <option value="Converted">已轉採購</option>
                        </select>
                        <button
                            onClick={() => setIsAddingPR(true)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            ➕ 新增請購單
                        </button>
                    </div>

                    {isAddingPR && (
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '24px',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>新增請購單</h3>
                            <form onSubmit={handleSubmitPR}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>請購類別</label>
                                        <select value={prForm.documentTypeId} onChange={(e) => setPRForm(p => ({ ...p, documentTypeId: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                            <option value="">選擇類別</option>
                                            {prDocTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>部門</label>
                                        <input value={prForm.department} onChange={(e) => setPRForm(p => ({ ...p, department: e.target.value }))} placeholder="請購部門" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: '13px', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>需求日期</label>
                                        <input type="date" value={prForm.requiredDate} onChange={(e) => setPRForm(p => ({ ...p, requiredDate: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>優先順序</label>
                                        <select value={prForm.priority} onChange={(e) => setPRForm(p => ({ ...p, priority: e.target.value as any }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                            <option value="Low">低</option>
                                            <option value="Normal">一般</option>
                                            <option value="High">高</option>
                                            <option value="Urgent">緊急</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Items */}
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <h4 style={{ margin: 0 }}>請購品項</h4>
                                        <button type="button" onClick={handleAddPRItem} style={{ padding: '6px 14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>+ 加入品項</button>
                                    </div>
                                    {prItems.map((item, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', marginBottom: '8px' }}>
                                            <select value={item.itemId} onChange={(e) => {
                                                const inv = (inventoryItems || []).find(i => i.id === e.target.value);
                                                const newItems = [...prItems];
                                                newItems[idx] = { ...item, itemId: e.target.value, itemName: inv?.name || '', unit: inv?.unit || 'PCS', estimatedUnitPrice: inv?.defaultUnitPrice || 0 };
                                                setPRItems(newItems);
                                            }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                                <option value="">選擇品項</option>
                                                {(inventoryItems || []).map(inv => <option key={inv.id} value={inv.id}>{inv.code} - {inv.name}</option>)}
                                            </select>
                                            <input type="number" placeholder="數量" value={item.quantity} onChange={(e) => { const newItems = [...prItems]; newItems[idx].quantity = parseInt(e.target.value) || 0; setPRItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                            <input placeholder="單位" value={item.unit} onChange={(e) => { const newItems = [...prItems]; newItems[idx].unit = e.target.value; setPRItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                            <input type="number" placeholder="預估單價" value={item.estimatedUnitPrice} onChange={(e) => { const newItems = [...prItems]; newItems[idx].estimatedUnitPrice = parseFloat(e.target.value) || 0; setPRItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                            <button type="button" onClick={() => setPRItems(prItems.filter((_, i) => i !== idx))} style={{ padding: '10px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '8px', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                                        </div>
                                    ))}
                                    {prItems.length > 0 && (
                                        <div style={{ textAlign: 'right', marginTop: '12px', fontSize: '16px', fontWeight: 600 }}>
                                            預估總金額: ${prItems.reduce((sum, item) => sum + (item.quantity * item.estimatedUnitPrice), 0).toLocaleString()}
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>備註</label>
                                    <textarea value={prForm.notes} onChange={(e) => setPRForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', resize: 'none' }} />
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>儲存草稿</button>
                                    <button type="button" onClick={() => { setIsAddingPR(false); setPRItems([]); }} style={{ padding: '10px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>取消</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* PR List */}
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>單號</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>請購人</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>部門</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>金額</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>優先</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>狀態</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedItems.length === 0 ? (
                                    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>無請購單資料</td></tr>
                                ) : (
                                    (displayedItems as PurchaseRequisition[]).map(pr => (
                                        <tr key={pr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>
                                                <button
                                                    onClick={() => { setSelectedDoc(pr); setModalType('PR'); }}
                                                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}
                                                >
                                                    {pr.prNumber}
                                                </button>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>{pr.requesterName}</td>
                                            <td style={{ padding: '14px 16px', color: '#6b7280' }}>{pr.department || '-'}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500 }}>${(pr.totalAmount || 0).toLocaleString()}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    backgroundColor: pr.priority === 'Urgent' ? '#fee2e2' : pr.priority === 'High' ? '#fef3c7' : '#f1f5f9',
                                                    color: pr.priority === 'Urgent' ? '#991b1b' : pr.priority === 'High' ? '#92400e' : '#475569'
                                                }}>
                                                    {pr.priority === 'Urgent' ? '緊急' : pr.priority === 'High' ? '高' : pr.priority === 'Low' ? '低' : '一般'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    backgroundColor: STATUS_COLORS[pr.status]?.bg || '#f1f5f9',
                                                    color: STATUS_COLORS[pr.status]?.text || '#475569'
                                                }}>
                                                    {STATUS_LABELS[pr.status] || pr.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                {pr.status === 'Draft' && (
                                                    <button onClick={() => handleOpenSubmitModal(pr.id, 'PURCHASE_REQUISITION', pr.prNumber)} style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                                        送審
                                                    </button>
                                                )}
                                                {pr.status === 'Approved' && (
                                                    <button onClick={() => onUpdatePRStatus(pr.id, 'Converted')} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                                        轉採購
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        <div style={{ padding: '16px' }}>
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Orders Tab */}
            {subTab === 'orders' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', minWidth: '150px' }}
                        >
                            <option value="ALL">全部狀態</option>
                            <option value="Draft">草稿</option>
                            <option value="Pending">待審核</option>
                            <option value="Approved">已核准</option>
                            <option value="Ordered">已下單</option>
                            <option value="PartialReceived">部分到貨</option>
                            <option value="Received">已完成</option>
                        </select>
                        <button
                            onClick={() => setIsAddingPO(true)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            ➕ 新增採購單
                        </button>
                    </div>

                    {isAddingPO && (
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '24px',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>新增採購單</h3>
                            <form onSubmit={handleSubmitPO}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>採購類別 *</label>
                                        <select value={poForm.documentTypeId} onChange={(e) => setPOForm(p => ({ ...p, documentTypeId: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                            <option value="">選擇類別</option>
                                            {poDocTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>供應商 *</label>
                                        <select value={poForm.supplierId} onChange={(e) => setPOForm(p => ({ ...p, supplierId: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                            <option value="">選擇供應商</option>
                                            {(suppliers || []).filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>預計到貨日</label>
                                        <input type="date" value={poForm.expectedDeliveryDate} onChange={(e) => setPOForm(p => ({ ...p, expectedDeliveryDate: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>會計科目</label>
                                        <AccountCodeSelect
                                            accounts={accounts}
                                            value={poForm.accountingCode}
                                            onChange={(code) => setPOForm(p => ({ ...p, accountingCode: code }))}
                                        />
                                    </div>
                                </div>

                                {/* Items */}
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <h4 style={{ margin: 0 }}>採購品項</h4>
                                        <button type="button" onClick={handleAddPOItem} style={{ padding: '6px 14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>+ 加入品項</button>
                                    </div>
                                    {poItems.map((item, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', marginBottom: '8px' }}>
                                            <select value={item.itemId} onChange={(e) => {
                                                const inv = (inventoryItems || []).find(i => i.id === e.target.value);
                                                const newItems = [...poItems];
                                                newItems[idx] = { ...item, itemId: e.target.value, itemName: inv?.name || '', unit: inv?.unit || 'PCS', unitPrice: inv?.defaultUnitPrice || 0 };
                                                setPOItems(newItems);
                                            }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                                                <option value="">選擇品項</option>
                                                {(inventoryItems || []).map(inv => <option key={inv.id} value={inv.id}>{inv.code} - {inv.name}</option>)}
                                            </select>
                                            <input type="number" placeholder="數量" value={item.quantity} onChange={(e) => { const newItems = [...poItems]; newItems[idx].quantity = parseInt(e.target.value) || 0; setPOItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                            <input placeholder="單位" value={item.unit} onChange={(e) => { const newItems = [...poItems]; newItems[idx].unit = e.target.value; setPOItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                            <input type="number" placeholder="單價" value={item.unitPrice} onChange={(e) => { const newItems = [...poItems]; newItems[idx].unitPrice = parseFloat(e.target.value) || 0; setPOItems(newItems); }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                            <button type="button" onClick={() => setPOItems(poItems.filter((_, i) => i !== idx))} style={{ padding: '10px', backgroundColor: '#fee2e2', border: 'none', borderRadius: '8px', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                                        </div>
                                    ))}
                                    {poItems.length > 0 && (
                                        <div style={{ textAlign: 'right', marginTop: '12px' }}>
                                            <div style={{ fontSize: '14px', color: '#6b7280' }}>小計: ${poItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()}</div>
                                            <div style={{ fontSize: '14px', color: '#6b7280' }}>稅額 (5%): ${Math.round(poItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 0.05).toLocaleString()}</div>
                                            <div style={{ fontSize: '18px', fontWeight: 600, marginTop: '8px' }}>
                                                總計: ${Math.round(poItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 1.05).toLocaleString()}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>儲存草稿</button>
                                    <button type="button" onClick={() => { setIsAddingPO(false); setPOItems([]); }} style={{ padding: '10px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>取消</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* PO List */}
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>單號</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>供應商</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>採購人</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>金額</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>會計科目</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>狀態</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedItems.length === 0 ? (
                                    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>無採購單資料</td></tr>
                                ) : (
                                    (displayedItems as PurchaseOrder[]).map(po => (
                                        <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>
                                                <button
                                                    onClick={() => { setSelectedDoc(po); setModalType('PO'); }}
                                                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}
                                                >
                                                    {po.poNumber}
                                                </button>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>{po.supplierName}</td>
                                            <td style={{ padding: '14px 16px', color: '#6b7280' }}>{po.buyerName}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500 }}>${(po.totalAmount || 0).toLocaleString()}</td>
                                            <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>{po.accountingCode || '-'}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    backgroundColor: STATUS_COLORS[po.status]?.bg || '#f1f5f9',
                                                    color: STATUS_COLORS[po.status]?.text || '#475569'
                                                }}>
                                                    {STATUS_LABELS[po.status] || po.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                {po.status === 'Draft' && (
                                                    <button onClick={() => onSubmitForApproval(po.id, 'PURCHASE_ORDER')} style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                                        送審
                                                    </button>
                                                )}
                                                {po.status === 'Approved' && (
                                                    <button onClick={() => onUpdatePOStatus(po.id, 'Ordered')} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                                                        確認下單
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        <div style={{ padding: '16px' }}>
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    </div>
                </div>
            )}

            {/* Suppliers Tab */}
            {subTab === 'suppliers' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                        <button
                            onClick={() => setIsAddingSupplier(true)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            ➕ 新增供應商
                        </button>
                    </div>

                    {isAddingSupplier && (
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '24px',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>新增供應商</h3>
                            <form onSubmit={handleSubmitSupplier}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                    <input placeholder="供應商代碼 *" value={supplierForm.code} onChange={(e) => setSupplierForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <input placeholder="供應商名稱 *" value={supplierForm.name} onChange={(e) => setSupplierForm(p => ({ ...p, name: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <input placeholder="聯絡人" value={supplierForm.contactPerson} onChange={(e) => setSupplierForm(p => ({ ...p, contactPerson: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <input placeholder="電話" value={supplierForm.phone} onChange={(e) => setSupplierForm(p => ({ ...p, phone: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                    <input placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm(p => ({ ...p, email: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <input placeholder="統編" value={supplierForm.taxId} onChange={(e) => setSupplierForm(p => ({ ...p, taxId: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <input placeholder="付款條件" value={supplierForm.paymentTerms} onChange={(e) => setSupplierForm(p => ({ ...p, paymentTerms: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                    <input placeholder="地址" value={supplierForm.address} onChange={(e) => setSupplierForm(p => ({ ...p, address: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>新增</button>
                                    <button type="button" onClick={() => setIsAddingSupplier(false)} style={{ padding: '10px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}>取消</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>代碼</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>名稱</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>聯絡人</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>電話</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>統編</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>狀態</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedItems.length === 0 ? (
                                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>無供應商資料</td></tr>
                                ) : (
                                    (displayedItems as Supplier[]).map(s => (
                                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>{s.code}</td>
                                            <td style={{ padding: '14px 16px', fontWeight: 500 }}>{s.name}</td>
                                            <td style={{ padding: '14px 16px', color: '#6b7280' }}>{s.contactPerson || '-'}</td>
                                            <td style={{ padding: '14px 16px', color: '#6b7280' }}>{s.phone || '-'}</td>
                                            <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>{s.taxId || '-'}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    backgroundColor: s.isActive ? '#dcfce7' : '#fee2e2',
                                                    color: s.isActive ? '#166534' : '#991b1b'
                                                }}>
                                                    {s.isActive ? '啟用' : '停用'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        <div style={{ padding: '16px' }}>
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    </div>
                </div>
            )}

            <DocumentDetailsModal
                visible={!!selectedDoc}
                onClose={() => { setSelectedDoc(null); setModalType(null); }}
                document={selectedDoc}
                type={modalType || 'PR'}
            />


            {/* Submit Modal */}
            <Modal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} title="送出簽核">
                <div style={{ minWidth: '400px' }}>
                    <p style={{ marginBottom: '16px', color: '#4b5563' }}>
                        即將送出單據 <strong>{submitTarget?.number}</strong> 進行簽核。
                    </p>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>指定簽核主管 (選填)</label>
                        <select
                            value={selectedApproverId}
                            onChange={(e) => setSelectedApproverId(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        >
                            <option value="">依照系統流程 (預設)</option>
                            {allStaff.filter(s => s.id !== currentUser?.id).map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name} {s.title ? `(${s.title})` : ''}
                                </option>
                            ))}
                        </select>
                        <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                            若未指定，系統將自動指派給您的直屬主管或流程定義的第一關審核者。
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setIsSubmitModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer' }}>取消</button>
                        <button onClick={handleConfirmSubmit} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer' }}>確認送出</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProcurementManagement;
