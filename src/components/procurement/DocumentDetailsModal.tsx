import React, { useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';

interface Props {
    visible: boolean;
    onClose: () => void;
    document: any;
    type: 'PR' | 'PO' | 'GR' | 'GI' | 'ST';
}

const tableHeaders: Record<string, string[]> = {
    'PR': ['品項', '數量', '單位', '預估單價', '預估金額', '備註'],
    'PO': ['品項', '數量', '單位', '單價', '金額', '已收貨'],
    'GR': ['品項', '收到數量', '驗收數量', '單位', '單價', '金額', '拒收原因'],
    'GI': ['品項', '數量', '單位', '成本', '金額', '儲位'],
    'ST': ['品項', '數量', '單位', '成本', '金額', '已收貨']
};

const DocumentDetailsModal: React.FC<Props> = ({ visible, onClose, document, type }) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && document) {
            fetchItems();
        } else {
            setItems([]);
        }
    }, [visible, document]);

    const fetchItems = async () => {
        setLoading(true);
        let tableName = '';
        let foreignKey = '';

        switch (type) {
            case 'PR': tableName = 'purchase_requisition_items'; foreignKey = 'pr_id'; break;
            case 'PO': tableName = 'purchase_order_items'; foreignKey = 'po_id'; break;
            case 'GR': tableName = 'goods_receipt_items'; foreignKey = 'gr_id'; break;
            case 'GI': tableName = 'goods_issue_items'; foreignKey = 'gi_id'; break;
            case 'ST': tableName = 'stock_transfer_items'; foreignKey = 'st_id'; break;
        }

        const { data, error } = await supabase.from(tableName).select('*').eq(foreignKey, document.id);
        if (error) console.error('Error fetching items:', error);
        else setItems(data || []);

        setLoading(false);
    };

    if (!visible || !document) return null;

    const renderItemRow = (item: any, idx: number) => {
        switch (type) {
            case 'PR': return (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>{item.item_name}</td>
                    <td style={{ padding: '12px' }}>{item.quantity}</td>
                    <td style={{ padding: '12px' }}>{item.unit}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>${(item.estimated_unit_price || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>${(item.estimated_amount || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>{item.notes}</td>
                </tr>
            );
            case 'PO': return (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>{item.item_name}</td>
                    <td style={{ padding: '12px' }}>{item.quantity}</td>
                    <td style={{ padding: '12px' }}>{item.unit}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>${(item.unit_price || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>${(item.amount || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px' }}>{item.received_quantity || 0}</td>
                </tr>
            );
            case 'GR': return (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>{item.item_name}</td>
                    <td style={{ padding: '12px' }}>{item.received_quantity}</td>
                    <td style={{ padding: '12px' }}>{item.accepted_quantity}</td>
                    <td style={{ padding: '12px' }}>{item.unit}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>${(item.unit_price || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>${(item.amount || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', color: 'red' }}>{item.rejection_reason}</td>
                </tr>
            );
            case 'GI': return (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>{item.item_name}</td>
                    <td style={{ padding: '12px' }}>{item.quantity}</td>
                    <td style={{ padding: '12px' }}>{item.unit}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>${(item.unit_cost || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>${(item.amount || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px' }}>{item.storage_location}</td>
                </tr>
            );
            case 'ST': return (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>{item.item_name}</td>
                    <td style={{ padding: '12px' }}>{item.quantity}</td>
                    <td style={{ padding: '12px' }}>{item.unit}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>${(item.unit_cost || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>${(item.amount || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px' }}>{item.received_quantity || 0}</td>
                </tr>
            );
            default: return null;
        }
    };

    const getDocNumber = () => {
        return document.prNumber || document.poNumber || document.grNumber || document.giNumber || document.stNumber || document.id;
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>單據詳情: {getDocNumber()}</h3>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            {type === 'PR' && `申請人: ${document.requesterName} | 部門: ${document.department || '-'} | 日期: ${document.requestDate}`}
                            {type === 'PO' && `供應商: ${document.supplierName || '-'} | 日期: ${document.orderDate}`}
                            {type === 'GR' && `收貨日期: ${document.receiptDate} | 多號: ${document.invoiceNumber || '-'}`}
                            {type === 'GI' && `領用人: ${document.issuerName} | 部門: ${document.department || '-'} | 日期: ${document.issueDate}`}
                            {type === 'ST' && `調出: ${document.fromHotelName || '-'} | 調入: ${document.toHotelName || '-'} | 日期: ${document.transferDate}`}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading items...</div>
                    ) : (
                        <div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f9fafb', color: '#374151' }}>
                                        {tableHeaders[type].map(h => (
                                            <th key={h} style={{ padding: '12px', textAlign: h.includes('金額') || h.includes('單價') ? 'right' : 'left', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 ? (
                                        <tr><td colSpan={tableHeaders[type].length} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>無品項資料</td></tr>
                                    ) : items.map((item, idx) => renderItemRow(item, idx))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ backgroundColor: '#f9fafb', fontWeight: 600 }}>
                                        <td colSpan={tableHeaders[type].indexOf('金額')} style={{ padding: '12px', textAlign: 'right' }}>總計:</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>${(document.totalAmount || 0).toLocaleString()}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>

                            {document.notes && (
                                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5', fontSize: '14px', color: '#9a3412' }}>
                                    <strong>備註:</strong> {document.notes}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>關閉</button>
                </div>
            </div>
        </div>
    );
};

export default DocumentDetailsModal;
