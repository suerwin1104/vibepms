import React, { useState, useMemo, useCallback } from 'react';
import {
    Hotel,
    Staff,
    Reservation,
    PurchaseRequisition,
    PurchaseOrder,
    GoodsReceipt,
    GoodsIssue,
    StockTransfer,
    PettyCashTransaction
} from '../../types';
import { getVisibleRequesterIds } from '../../utils/documentPermissions';
import Modal from '../common/Modal';
import Pagination from '../common/Pagination';
import { SortConfig, sortData } from '../common/SortableHeader';

interface DocumentSearchProps {
    hotels: Hotel[];
    selectedHotelId: string;
    currentUser: Staff | null;
    reservations: Reservation[];
    purchaseRequisitions: PurchaseRequisition[];
    purchaseOrders: PurchaseOrder[];
    goodsReceipts: GoodsReceipt[];
    goodsIssues: GoodsIssue[];
    stockTransfers: StockTransfer[];
    pettyCashTransactions: PettyCashTransaction[];
    allStaff: Staff[];
}

type DocumentType = 'ALL' | 'RESERVATION' | 'PR' | 'PO' | 'GR' | 'GI' | 'ST' | 'PC';

interface UnifiedDocument {
    id: string;
    type: DocumentType;
    typeLabel: string;
    typeIcon: string;
    number: string;
    date: string;
    person: string;
    personLabel: string;
    amount: number;
    status: string;
    statusColor: { bg: string; text: string };
    originalData: any;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    // Reservation statuses
    'Confirmed': { bg: '#dbeafe', text: '#1e40af' },
    'CheckedIn': { bg: '#dcfce7', text: '#166534' },
    'CheckedOut': { bg: '#f1f5f9', text: '#475569' },
    'Cancelled': { bg: '#fee2e2', text: '#991b1b' },
    'Pending': { bg: '#fef3c7', text: '#92400e' },
    // PR/PO statuses
    'Draft': { bg: '#f1f5f9', text: '#475569' },
    'Approved': { bg: '#dcfce7', text: '#166534' },
    'Rejected': { bg: '#fee2e2', text: '#991b1b' },
    'Converted': { bg: '#dbeafe', text: '#1e40af' },
    'Ordered': { bg: '#e0e7ff', text: '#3730a3' },
    'PartialReceived': { bg: '#fef3c7', text: '#92400e' },
    'Received': { bg: '#dcfce7', text: '#166534' },
    // GR statuses
    'Inspecting': { bg: '#fef3c7', text: '#92400e' },
    'Completed': { bg: '#dcfce7', text: '#166534' },
    // GI statuses
    'Issued': { bg: '#dcfce7', text: '#166534' },
    // ST statuses
    'InTransit': { bg: '#fef3c7', text: '#92400e' },
};

const STATUS_LABELS: Record<string, string> = {
    'Confirmed': '已確認',
    'CheckedIn': '已入住',
    'CheckedOut': '已退房',
    'Cancelled': '已取消',
    'Pending': '待審核',
    'Draft': '草稿',
    'Approved': '已核准',
    'Rejected': '已駁回',
    'Converted': '已轉採購',
    'Ordered': '已下單',
    'PartialReceived': '部分到貨',
    'Received': '已完成',
    'Inspecting': '驗收中',
    'Completed': '已完成',
    'Issued': '已出貨',
    'InTransit': '運送中',
};

const DocumentSearch: React.FC<DocumentSearchProps> = ({
    selectedHotelId,
    currentUser,
    reservations,
    purchaseRequisitions,
    purchaseOrders,
    goodsReceipts,
    goodsIssues,
    stockTransfers,
    pettyCashTransactions,
    allStaff
}) => {
    // Search state
    const [searchKeyword, setSearchKeyword] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [docType, setDocType] = useState<DocumentType>('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // 新增：是否已執行搜尋
    const [hasSearched, setHasSearched] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Sorting state
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    // Detail modal
    const [selectedDoc, setSelectedDoc] = useState<UnifiedDocument | null>(null);

    // Sort handler
    const handleSort = useCallback((key: string) => {
        setSortConfig(prev => {
            if (prev?.key !== key) return { key, direction: 'asc' };
            if (prev.direction === 'asc') return { key, direction: 'desc' };
            if (prev.direction === 'desc') return null;
            return { key, direction: 'asc' };
        });
    }, []);

    // Permission filtering
    const visible = getVisibleRequesterIds(currentUser, allStaff);

    // Convert all documents to unified format
    const allDocuments = useMemo(() => {
        const docs: UnifiedDocument[] = [];

        // Reservations
        reservations
            .filter(r => r.hotelId === selectedHotelId)
            .forEach(r => {
                docs.push({
                    id: r.id,
                    type: 'RESERVATION',
                    typeLabel: '訂單',
                    typeIcon: '📅',
                    number: `R-${r.id.slice(-8)}`,
                    date: r.checkIn,
                    person: r.guestName,
                    personLabel: '客人',
                    amount: r.totalPrice,
                    status: r.status,
                    statusColor: STATUS_COLORS[r.status] || { bg: '#f1f5f9', text: '#475569' },
                    originalData: r
                });
            });

        // Purchase Requisitions
        purchaseRequisitions
            .filter(pr => pr.hotelId === selectedHotelId)
            .filter(pr => {
                if (visible === 'all') return true;
                return visible.ids.includes(pr.requesterId) || visible.names.includes(pr.requesterName);
            })
            .forEach(pr => {
                docs.push({
                    id: pr.id,
                    type: 'PR',
                    typeLabel: '請購單',
                    typeIcon: '📝',
                    number: pr.prNumber,
                    date: pr.requestDate,
                    person: pr.requesterName,
                    personLabel: '申請人',
                    amount: pr.totalAmount,
                    status: pr.status,
                    statusColor: STATUS_COLORS[pr.status] || { bg: '#f1f5f9', text: '#475569' },
                    originalData: pr
                });
            });

        // Purchase Orders
        purchaseOrders
            .filter(po => po.hotelId === selectedHotelId)
            .filter(po => {
                if (visible === 'all') return true;
                return visible.ids.includes(po.buyerId || '') || visible.names.includes(po.buyerName || '');
            })
            .forEach(po => {
                docs.push({
                    id: po.id,
                    type: 'PO',
                    typeLabel: '採購單',
                    typeIcon: '📋',
                    number: po.poNumber,
                    date: po.orderDate,
                    person: po.supplierName || '-',
                    personLabel: '供應商',
                    amount: po.totalAmount,
                    status: po.status,
                    statusColor: STATUS_COLORS[po.status] || { bg: '#f1f5f9', text: '#475569' },
                    originalData: po
                });
            });

        // Goods Receipts
        goodsReceipts
            .filter(gr => gr.hotelId === selectedHotelId)
            .filter(gr => {
                if (visible === 'all') return true;
                return visible.ids.includes(gr.receiverId || '') || visible.names.includes(gr.receiverName || '');
            })
            .forEach(gr => {
                docs.push({
                    id: gr.id,
                    type: 'GR',
                    typeLabel: '進貨單',
                    typeIcon: '📥',
                    number: gr.grNumber,
                    date: gr.receiptDate,
                    person: gr.receiverName || '-',
                    personLabel: '驗收人',
                    amount: gr.totalAmount,
                    status: gr.status,
                    statusColor: STATUS_COLORS[gr.status] || { bg: '#f1f5f9', text: '#475569' },
                    originalData: gr
                });
            });

        // Goods Issues
        goodsIssues
            .filter(gi => gi.hotelId === selectedHotelId)
            .filter(gi => {
                if (visible === 'all') return true;
                return visible.ids.includes(gi.issuerId || '') || visible.names.includes(gi.issuerName || '');
            })
            .forEach(gi => {
                docs.push({
                    id: gi.id,
                    type: 'GI',
                    typeLabel: '領用單',
                    typeIcon: '📤',
                    number: gi.giNumber,
                    date: gi.issueDate,
                    person: gi.requesterName || gi.issuerName || '-',
                    personLabel: '申請人',
                    amount: gi.totalAmount,
                    status: gi.status,
                    statusColor: STATUS_COLORS[gi.status] || { bg: '#f1f5f9', text: '#475569' },
                    originalData: gi
                });
            });

        // Stock Transfers
        stockTransfers
            .filter(st => st.fromHotelId === selectedHotelId || st.toHotelId === selectedHotelId)
            .filter(st => {
                if (visible === 'all') return true;
                return visible.ids.includes(st.requesterId || '') || visible.names.includes(st.requesterName || '');
            })
            .forEach(st => {
                docs.push({
                    id: st.id,
                    type: 'ST',
                    typeLabel: '調撥單',
                    typeIcon: '🔄',
                    number: st.stNumber,
                    date: st.transferDate,
                    person: st.requesterName || '-',
                    personLabel: '申請人',
                    amount: st.totalAmount,
                    status: st.status,
                    statusColor: STATUS_COLORS[st.status] || { bg: '#f1f5f9', text: '#475569' },
                    originalData: st
                });
            });

        // Petty Cash Transactions
        pettyCashTransactions
            .filter(pc => {
                if (visible === 'all') return true;
                return visible.ids.includes(pc.handlerId || '') || visible.names.includes(pc.handlerName || '');
            })
            .forEach(pc => {
                docs.push({
                    id: pc.id,
                    type: 'PC',
                    typeLabel: '零用金',
                    typeIcon: '💰',
                    number: pc.transactionNumber,
                    date: pc.transactionDate,
                    person: pc.handlerName || '-',
                    personLabel: '經手人',
                    amount: pc.amount,
                    status: pc.status,
                    statusColor: STATUS_COLORS[pc.status] || { bg: '#f1f5f9', text: '#475569' },
                    originalData: pc
                });
            });

        // Sort by date descending
        docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return docs;
    }, [selectedHotelId, reservations, purchaseRequisitions, purchaseOrders, goodsReceipts, goodsIssues, stockTransfers, pettyCashTransactions, visible]);

    // Filter documents based on search criteria
    const filteredDocuments = useMemo(() => {
        return allDocuments.filter(doc => {
            // Document type filter
            if (docType !== 'ALL' && doc.type !== docType) return false;

            // Status filter
            if (statusFilter !== 'ALL' && doc.status !== statusFilter) return false;

            // Date range filter
            if (dateFrom && new Date(doc.date) < new Date(dateFrom)) return false;
            if (dateTo && new Date(doc.date) > new Date(dateTo)) return false;

            // Keyword search (case-insensitive)
            if (searchKeyword.trim()) {
                const keyword = searchKeyword.toLowerCase().trim();
                const searchFields = [
                    doc.number,
                    doc.person,
                    // Additional fields from original data
                    doc.originalData.phone,
                    doc.originalData.idNumber,
                    doc.originalData.guestName,
                    doc.originalData.requesterName,
                    doc.originalData.supplierName,
                    doc.originalData.department,
                    doc.originalData.description,
                    doc.originalData.notes
                ].filter(Boolean).map(f => f.toLowerCase());

                if (!searchFields.some(field => field.includes(keyword))) {
                    return false;
                }
            }

            return true;
        });
    }, [allDocuments, docType, statusFilter, dateFrom, dateTo, searchKeyword]);

    // Apply sorting
    const sortedDocuments = useMemo(() => {
        return sortData(filteredDocuments, sortConfig);
    }, [filteredDocuments, sortConfig]);

    // Pagination
    const totalPages = Math.ceil(sortedDocuments.length / ITEMS_PER_PAGE);
    const paginatedDocuments = sortedDocuments.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Get unique statuses for filter dropdown
    const uniqueStatuses = useMemo(() => {
        const statuses = new Set(allDocuments.map(d => d.status));
        return Array.from(statuses).sort();
    }, [allDocuments]);

    // Reset pagination when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchKeyword, dateFrom, dateTo, docType, statusFilter]);

    // Render detail content based on document type
    const renderDetailContent = (doc: UnifiedDocument) => {
        const data = doc.originalData;

        switch (doc.type) {
            case 'RESERVATION':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><strong>客人姓名:</strong> {data.guestName}</div>
                            <div><strong>電話:</strong> {data.phone || '-'}</div>
                            <div><strong>證號:</strong> {data.idNumber || '-'}</div>
                            <div><strong>房號:</strong> {data.roomNumber}</div>
                            <div><strong>入住日期:</strong> {data.checkIn}</div>
                            <div><strong>退房日期:</strong> {data.checkOut}</div>
                            <div><strong>房型:</strong> {data.roomType}</div>
                            <div><strong>來源:</strong> {data.source || '-'}</div>
                            <div><strong>總價:</strong> ${data.totalPrice?.toLocaleString()}</div>
                            <div><strong>已付金額:</strong> ${data.paidAmount?.toLocaleString()}</div>
                        </div>
                        {data.note && <div><strong>備註:</strong> {data.note}</div>}
                    </div>
                );

            case 'PR':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><strong>請購單號:</strong> {data.prNumber}</div>
                            <div><strong>申請人:</strong> {data.requesterName}</div>
                            <div><strong>部門:</strong> {data.department || '-'}</div>
                            <div><strong>申請日期:</strong> {data.requestDate}</div>
                            <div><strong>需求日期:</strong> {data.requiredDate || '-'}</div>
                            <div><strong>優先順序:</strong> {data.priority}</div>
                            <div><strong>總金額:</strong> ${data.totalAmount?.toLocaleString()}</div>
                        </div>
                        {data.notes && <div><strong>備註:</strong> {data.notes}</div>}
                        {data.items && data.items.length > 0 && (
                            <div>
                                <strong>品項明細:</strong>
                                <table className="mt-2 w-full text-sm border">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-2 text-left border">品項</th>
                                            <th className="p-2 text-right border">數量</th>
                                            <th className="p-2 text-right border">單價</th>
                                            <th className="p-2 text-right border">金額</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((item: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="p-2 border">{item.itemName}</td>
                                                <td className="p-2 text-right border">{item.quantity} {item.unit}</td>
                                                <td className="p-2 text-right border">${item.estimatedUnitPrice?.toLocaleString()}</td>
                                                <td className="p-2 text-right border">${item.estimatedAmount?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );

            case 'PO':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><strong>採購單號:</strong> {data.poNumber}</div>
                            <div><strong>供應商:</strong> {data.supplierName || '-'}</div>
                            <div><strong>採購人:</strong> {data.buyerName || '-'}</div>
                            <div><strong>下單日期:</strong> {data.orderDate}</div>
                            <div><strong>預計到貨:</strong> {data.expectedDeliveryDate || '-'}</div>
                            <div><strong>會計科目:</strong> {data.accountingCode || '-'}</div>
                            <div><strong>小計:</strong> ${data.subtotal?.toLocaleString()}</div>
                            <div><strong>稅額:</strong> ${data.taxAmount?.toLocaleString()}</div>
                            <div><strong>總金額:</strong> ${data.totalAmount?.toLocaleString()}</div>
                        </div>
                        {data.notes && <div><strong>備註:</strong> {data.notes}</div>}
                    </div>
                );

            case 'GR':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><strong>進貨單號:</strong> {data.grNumber}</div>
                            <div><strong>供應商:</strong> {data.supplierName || '-'}</div>
                            <div><strong>驗收人:</strong> {data.receiverName || '-'}</div>
                            <div><strong>驗收日期:</strong> {data.receiptDate}</div>
                            <div><strong>倉庫:</strong> {data.warehouseName || '-'}</div>
                            <div><strong>發票號碼:</strong> {data.invoiceNumber || '-'}</div>
                            <div><strong>總金額:</strong> ${data.totalAmount?.toLocaleString()}</div>
                        </div>
                        {data.notes && <div><strong>備註:</strong> {data.notes}</div>}
                    </div>
                );

            case 'GI':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><strong>領用單號:</strong> {data.giNumber}</div>
                            <div><strong>申請人:</strong> {data.requesterName || '-'}</div>
                            <div><strong>發放人:</strong> {data.issuerName || '-'}</div>
                            <div><strong>領用日期:</strong> {data.issueDate}</div>
                            <div><strong>部門:</strong> {data.department || '-'}</div>
                            <div><strong>用途:</strong> {data.purpose || '-'}</div>
                            <div><strong>倉庫:</strong> {data.warehouseName || '-'}</div>
                            <div><strong>總金額:</strong> ${data.totalAmount?.toLocaleString()}</div>
                        </div>
                        {data.notes && <div><strong>備註:</strong> {data.notes}</div>}
                    </div>
                );

            case 'ST':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><strong>調撥單號:</strong> {data.stNumber}</div>
                            <div><strong>申請人:</strong> {data.requesterName || '-'}</div>
                            <div><strong>調撥日期:</strong> {data.transferDate}</div>
                            <div><strong>來源館:</strong> {data.fromHotelName || '-'}</div>
                            <div><strong>目的館:</strong> {data.toHotelName || '-'}</div>
                            <div><strong>來源倉庫:</strong> {data.fromWarehouseName || '-'}</div>
                            <div><strong>目的倉庫:</strong> {data.toWarehouseName || '-'}</div>
                            <div><strong>總金額:</strong> ${data.totalAmount?.toLocaleString()}</div>
                        </div>
                        {data.reason && <div><strong>原因:</strong> {data.reason}</div>}
                        {data.notes && <div><strong>備註:</strong> {data.notes}</div>}
                    </div>
                );

            case 'PC':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><strong>交易編號:</strong> {data.transactionNumber}</div>
                            <div><strong>經手人:</strong> {data.handlerName || '-'}</div>
                            <div><strong>交易日期:</strong> {data.transactionDate}</div>
                            <div><strong>交易類型:</strong> {data.transactionType === 'EXPENSE' ? '支出' : data.transactionType === 'REPLENISH' ? '補充' : '調整'}</div>
                            <div><strong>金額:</strong> ${data.amount?.toLocaleString()}</div>
                            <div><strong>餘額:</strong> ${data.balanceAfter?.toLocaleString()}</div>
                            <div><strong>廠商:</strong> {data.vendorName || '-'}</div>
                            <div><strong>發票號碼:</strong> {data.receiptNumber || '-'}</div>
                            <div><strong>費用類別:</strong> {data.expenseCategory || '-'}</div>
                        </div>
                        {data.description && <div><strong>說明:</strong> {data.description}</div>}
                        {data.notes && <div><strong>備註:</strong> {data.notes}</div>}
                    </div>
                );

            default:
                return <pre>{JSON.stringify(data, null, 2)}</pre>;
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>🔍 單據查詢</h2>
                <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
                    跨類型搜尋所有單據，支援單號、姓名、電話、證號等關鍵字
                </p>
            </div>

            {/* Search Form */}
            <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>關鍵字搜尋</label>
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            placeholder="輸入單號、姓名、電話、證號..."
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>起始日期</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>結束日期</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>單據類型</label>
                        <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value as DocumentType)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px'
                            }}
                        >
                            <option value="ALL">全部類型</option>
                            <option value="RESERVATION">📅 訂單</option>
                            <option value="PR">📝 請購單</option>
                            <option value="PO">📋 採購單</option>
                            <option value="GR">📥 進貨單</option>
                            <option value="GI">📤 領用單</option>
                            <option value="ST">🔄 調撥單</option>
                            <option value="PC">💰 零用金</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>狀態</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px'
                            }}
                        >
                            <option value="ALL">全部狀態</option>
                            {uniqueStatuses.map(status => (
                                <option key={status} value={status}>{STATUS_LABELS[status] || status}</option>
                            ))}
                        </select>
                    </div>
                    <div></div>
                    <button
                        onClick={() => {
                            setSearchKeyword('');
                            setDateFrom('');
                            setDateTo('');
                            setDocType('ALL');
                            setStatusFilter('ALL');
                            setHasSearched(false);
                        }}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        🔄 清除條件
                    </button>
                    <button
                        onClick={() => {
                            setHasSearched(true);
                            setCurrentPage(1);
                        }}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        🔍 搜尋
                    </button>
                </div>
            </div>

            {/* Results Count - 只在搜尋後顯示 */}
            {hasSearched && (
                <div style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
                    找到 <strong style={{ color: '#1e40af' }}>{sortedDocuments.length}</strong> 筆結果
                </div>
            )}

            {/* Results Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                            {[
                                { key: 'typeLabel', label: '類型', align: 'left' },
                                { key: 'number', label: '單號', align: 'left' },
                                { key: 'date', label: '日期', align: 'left' },
                                { key: 'person', label: '相關人員', align: 'left' },
                                { key: 'amount', label: '金額', align: 'right' },
                                { key: 'status', label: '狀態', align: 'center' }
                            ].map(col => {
                                const isActive = sortConfig?.key === col.key;
                                const direction = isActive ? sortConfig.direction : null;
                                return (
                                    <th
                                        key={col.key}
                                        onClick={() => handleSort(col.key)}
                                        style={{
                                            padding: '14px 16px',
                                            textAlign: col.align as any,
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            backgroundColor: isActive ? '#e0e7ff' : undefined
                                        }}
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
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!hasSearched ? (
                            <tr>
                                <td colSpan={7} style={{ padding: '80px', textAlign: 'center', color: '#9ca3af' }}>
                                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
                                    <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>請輸入搜尋條件</div>
                                    <div style={{ fontSize: '14px' }}>設定條件後點擊「搜尋」按鈕查詢單據</div>
                                </td>
                            </tr>
                        ) : paginatedDocuments.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                                    <div>無符合條件的單據</div>
                                </td>
                            </tr>
                        ) : (
                            paginatedDocuments.map(doc => (
                                <tr key={`${doc.type}-${doc.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '14px 16px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '18px' }}>{doc.typeIcon}</span>
                                            <span style={{ fontSize: '13px', color: '#6b7280' }}>{doc.typeLabel}</span>
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>
                                        {doc.number}
                                    </td>
                                    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                                        {doc.date}
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <div>{doc.person}</div>
                                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{doc.personLabel}</div>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500 }}>
                                        ${doc.amount.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            backgroundColor: doc.statusColor.bg,
                                            color: doc.statusColor.text
                                        }}>
                                            {STATUS_LABELS[doc.status] || doc.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => setSelectedDoc(doc)}
                                            style={{
                                                padding: '6px 12px',
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            查看詳情
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div style={{ padding: '16px' }}>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedDoc}
                onClose={() => setSelectedDoc(null)}
                title={selectedDoc ? `${selectedDoc.typeIcon} ${selectedDoc.typeLabel} - ${selectedDoc.number}` : ''}
                size="lg"
            >
                {selectedDoc && (
                    <div style={{ padding: '16px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            paddingBottom: '16px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <span style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: selectedDoc.statusColor.bg,
                                color: selectedDoc.statusColor.text,
                                fontWeight: 500
                            }}>
                                {STATUS_LABELS[selectedDoc.status] || selectedDoc.status}
                            </span>
                            <span style={{ color: '#6b7280', fontSize: '14px' }}>
                                {selectedDoc.date}
                            </span>
                        </div>
                        {renderDetailContent(selectedDoc)}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default DocumentSearch;
