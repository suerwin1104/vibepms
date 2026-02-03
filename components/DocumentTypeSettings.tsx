import React, { useState } from 'react';
import { DocumentType, DocumentCategory } from '../types';

interface DocumentTypeSettingsProps {
    documentTypes: DocumentType[];
    onAdd: (docType: Omit<DocumentType, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onUpdate: (id: string, docType: Partial<DocumentType>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
    'PURCHASE_REQUISITION': '請購單',
    'PURCHASE_ORDER': '採購單',
    'GOODS_RECEIPT': '進貨單',
    'GOODS_ISSUE': '出貨/領用單',
    'STOCK_TRANSFER': '調撥單',
    'PETTY_CASH': '零用金'
};

const DocumentTypeSettings: React.FC<DocumentTypeSettingsProps> = ({
    documentTypes,
    onAdd,
    onUpdate,
    onDelete
}) => {
    const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'ALL'>('ALL');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        category: 'PURCHASE_ORDER' as DocumentCategory,
        description: '',
        isActive: true
    });

    const filteredTypes = documentTypes.filter(dt =>
        filterCategory === 'ALL' || dt.category === filterCategory
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code.trim() || !formData.name.trim()) {
            alert('請填寫代碼和名稱');
            return;
        }

        try {
            if (editingId) {
                await onUpdate(editingId, formData);
                setEditingId(null);
            } else {
                await onAdd(formData);
                setIsAdding(false);
            }
            setFormData({
                code: '',
                name: '',
                category: 'PURCHASE_ORDER',
                description: '',
                isActive: true
            });
        } catch (error) {
            console.error('Save failed:', error);
        }
    };

    const handleEdit = (dt: DocumentType) => {
        setEditingId(dt.id);
        setFormData({
            code: dt.code,
            name: dt.name,
            category: dt.category,
            description: dt.description || '',
            isActive: dt.isActive
        });
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('確定要刪除此單據類別嗎？')) return;
        await onDelete(id);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({
            code: '',
            name: '',
            category: 'PURCHASE_ORDER',
            description: '',
            isActive: true
        });
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
            }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
                    📋 單據類別設定
                </h2>
                <button
                    onClick={() => { setIsAdding(true); setEditingId(null); }}
                    disabled={isAdding || editingId !== null}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: isAdding || editingId ? 'not-allowed' : 'pointer',
                        opacity: isAdding || editingId ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    ➕ 新增類別
                </button>
            </div>

            {/* Filter */}
            <div style={{ marginBottom: '20px' }}>
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as DocumentCategory | 'ALL')}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px',
                        minWidth: '200px'
                    }}
                >
                    <option value="ALL">全部類別</option>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
                <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                        {editingId ? '編輯單據類別' : '新增單據類別'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>
                                    代碼 *
                                </label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    placeholder="例: PO-SPECIAL"
                                    disabled={!!editingId}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        backgroundColor: editingId ? '#f3f4f6' : 'white'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>
                                    名稱 *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="例: 特殊採購"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>
                                    對應單據
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as DocumentCategory }))}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px'
                                    }}
                                >
                                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>
                                    狀態
                                </label>
                                <select
                                    value={formData.isActive ? 'active' : 'inactive'}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="active">啟用</option>
                                    <option value="inactive">停用</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>
                                說明
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="選填說明"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="submit"
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                {editingId ? '更新' : '新增'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                取消
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Table */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>代碼</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>名稱</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>對應單據</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>說明</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>狀態</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTypes.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                    無單據類別資料
                                </td>
                            </tr>
                        ) : (
                            filteredTypes.map(dt => (
                                <tr key={dt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>{dt.code}</td>
                                    <td style={{ padding: '14px 16px', fontWeight: 500 }}>{dt.name}</td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            backgroundColor: '#e0f2fe',
                                            color: '#0369a1'
                                        }}>
                                            {CATEGORY_LABELS[dt.category]}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>{dt.description || '-'}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            backgroundColor: dt.isActive ? '#dcfce7' : '#fee2e2',
                                            color: dt.isActive ? '#166534' : '#991b1b'
                                        }}>
                                            {dt.isActive ? '啟用' : '停用'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleEdit(dt)}
                                            style={{
                                                padding: '6px 12px',
                                                marginRight: '8px',
                                                backgroundColor: '#f1f5f9',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ✏️ 編輯
                                        </button>
                                        <button
                                            onClick={() => handleDelete(dt.id)}
                                            style={{
                                                padding: '6px 12px',
                                                backgroundColor: '#fef2f2',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                color: '#dc2626',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🗑️ 刪除
                                        </button>
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

export default DocumentTypeSettings;
