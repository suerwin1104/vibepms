import React, { useState } from 'react';
import {
    Warehouse,
    InventoryItem,
    InventoryRecord,
    Hotel,
    ChartOfAccount
} from '../../types';
import Pagination from '../common/Pagination';
import AccountCodeSelect from '../common/AccountCodeSelect';

interface InventoryManagementProps {
    hotels: Hotel[];
    selectedHotelId: string;
    warehouses: Warehouse[];
    inventoryItems: InventoryItem[];
    inventoryRecords: InventoryRecord[];
    accounts: ChartOfAccount[];
    onAddWarehouse: (warehouse: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onUpdateWarehouse: (id: string, warehouse: Partial<Warehouse>) => Promise<void>;
    onDeleteWarehouse: (id: string) => Promise<void>;
    onAddItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onUpdateItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
    onDeleteItem: (id: string) => Promise<void>;
}

type SubTab = 'overview' | 'warehouses' | 'items';

const InventoryManagement: React.FC<InventoryManagementProps> = ({
    hotels,
    selectedHotelId,
    warehouses,
    inventoryItems,
    inventoryRecords,
    accounts,
    onAddWarehouse,
    onUpdateWarehouse,
    onDeleteWarehouse,
    onAddItem,
    onUpdateItem,
    onDeleteItem
}) => {
    const [subTab, setSubTab] = useState<SubTab>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddingWarehouse, setIsAddingWarehouse] = useState(false);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    // Pagination States
    const [overviewPage, setOverviewPage] = useState(1);
    const [warehousesPage, setWarehousesPage] = useState(1);
    const [itemsPage, setItemsPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Form states
    const [warehouseForm, setWarehouseForm] = useState({
        code: '',
        name: '',
        location: '',
        managerName: '',
        isActive: true
    });

    const [itemForm, setItemForm] = useState({
        code: '',
        name: '',
        category: '',
        unit: 'PCS',
        specification: '',
        safetyStock: 0,
        reorderPoint: 0,
        defaultUnitPrice: 0,
        accountingCode: '',
        isActive: true
    });


    const hotelWarehouses = warehouses.filter(w => w.hotelId === selectedHotelId);

    // 篩選只屬於當前飯店倉庫的庫存記錄
    const hotelWarehouseIds = hotelWarehouses.map(w => w.id);
    const hotelInventoryRecords = inventoryRecords.filter(r => hotelWarehouseIds.includes(r.warehouseId));

    // Calculate stock summary for overview (使用篩選後的記錄)
    const stockSummary = hotelInventoryRecords.reduce((acc, record) => {
        const item = inventoryItems.find(i => i.id === record.itemId);
        if (!item) return acc;

        const isLowStock = record.quantity <= item.safetyStock;
        const isOutOfStock = record.quantity === 0;

        return {
            totalItems: acc.totalItems + 1,
            lowStockItems: acc.lowStockItems + (isLowStock && !isOutOfStock ? 1 : 0),
            outOfStockItems: acc.outOfStockItems + (isOutOfStock ? 1 : 0),
            totalValue: acc.totalValue + (record.quantity * item.defaultUnitPrice)
        };
    }, { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, totalValue: 0 });


    const handleWarehouseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!warehouseForm.code.trim() || !warehouseForm.name.trim()) {
            alert('請填寫倉庫代碼和名稱');
            return;
        }
        try {
            if (editingWarehouseId) {
                await onUpdateWarehouse(editingWarehouseId, warehouseForm);
                setEditingWarehouseId(null);
            } else {
                await onAddWarehouse({ ...warehouseForm, hotelId: selectedHotelId });
                setIsAddingWarehouse(false);
            }
            setWarehouseForm({ code: '', name: '', location: '', managerName: '', isActive: true });
        } catch (error) {
            console.error('Save warehouse failed:', error);
        }
    };

    const handleItemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemForm.code.trim() || !itemForm.name.trim()) {
            alert('請填寫品項代碼和名稱');
            return;
        }
        try {
            if (editingItemId) {
                await onUpdateItem(editingItemId, itemForm);
                setEditingItemId(null);
            } else {
                await onAddItem(itemForm);
                setIsAddingItem(false);
            }
            setItemForm({
                code: '', name: '', category: '', unit: 'PCS', specification: '',
                safetyStock: 0, reorderPoint: 0, defaultUnitPrice: 0, accountingCode: '', isActive: true
            });
        } catch (error) {
            console.error('Save item failed:', error);
        }
    };

    const handleEditItem = (item: InventoryItem) => {
        setItemForm({
            code: item.code,
            name: item.name,
            category: item.category || '',
            unit: item.unit || 'PCS',
            specification: item.specification || '',
            safetyStock: item.safetyStock || 0,
            reorderPoint: item.reorderPoint || 0,
            defaultUnitPrice: item.defaultUnitPrice || 0,
            accountingCode: item.accountingCode || '',
            isActive: item.isActive
        });
        setEditingItemId(item.id);
        setIsAddingItem(true);
    };

    const handleCancelItemEdit = () => {
        setIsAddingItem(false);
        setEditingItemId(null);
        setItemForm({
            code: '', name: '', category: '', unit: 'PCS', specification: '',
            safetyStock: 0, reorderPoint: 0, defaultUnitPrice: 0, accountingCode: '', isActive: true
        });
    };

    const filteredItems = inventoryItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Define pagination logic
    const recordsTotalPages = Math.ceil(hotelInventoryRecords.length / ITEMS_PER_PAGE);
    const displayedRecords = hotelInventoryRecords.slice((overviewPage - 1) * ITEMS_PER_PAGE, overviewPage * ITEMS_PER_PAGE);

    const warehousesTotalPages = Math.ceil(hotelWarehouses.length / ITEMS_PER_PAGE);
    const displayedWarehouses = hotelWarehouses.slice((warehousesPage - 1) * ITEMS_PER_PAGE, warehousesPage * ITEMS_PER_PAGE);

    const filteredItemsTotalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const displayedItems = filteredItems.slice((itemsPage - 1) * ITEMS_PER_PAGE, itemsPage * ITEMS_PER_PAGE);


    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
                    📦 庫存管理
                </h2>
                <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
                    管理倉庫、品項與庫存數量
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
                    { key: 'overview', label: '📊 庫存總覽' },
                    { key: 'warehouses', label: '🏭 倉庫管理' },
                    { key: 'items', label: '📋 品項管理' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setSubTab(tab.key as SubTab)}
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

            {/* Overview Tab */}
            {subTab === 'overview' && (
                <div>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            borderRadius: '16px',
                            padding: '24px',
                            color: 'white'
                        }}>
                            <div style={{ fontSize: '14px', opacity: 0.9 }}>總品項數</div>
                            <div style={{ fontSize: '36px', fontWeight: 700, margin: '8px 0' }}>{inventoryItems.length}</div>
                            <div style={{ fontSize: '13px', opacity: 0.8 }}>啟用中品項</div>
                        </div>
                        <div style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderRadius: '16px',
                            padding: '24px',
                            color: 'white'
                        }}>
                            <div style={{ fontSize: '14px', opacity: 0.9 }}>倉庫數量</div>
                            <div style={{ fontSize: '36px', fontWeight: 700, margin: '8px 0' }}>{hotelWarehouses.length}</div>
                            <div style={{ fontSize: '13px', opacity: 0.8 }}>啟用中倉庫</div>
                        </div>
                        <div style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            borderRadius: '16px',
                            padding: '24px',
                            color: 'white'
                        }}>
                            <div style={{ fontSize: '14px', opacity: 0.9 }}>低庫存警示</div>
                            <div style={{ fontSize: '36px', fontWeight: 700, margin: '8px 0' }}>{stockSummary.lowStockItems}</div>
                            <div style={{ fontSize: '13px', opacity: 0.8 }}>需補貨品項</div>
                        </div>
                        <div style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            borderRadius: '16px',
                            padding: '24px',
                            color: 'white'
                        }}>
                            <div style={{ fontSize: '14px', opacity: 0.9 }}>缺貨品項</div>
                            <div style={{ fontSize: '36px', fontWeight: 700, margin: '8px 0' }}>{stockSummary.outOfStockItems}</div>
                            <div style={{ fontSize: '13px', opacity: 0.8 }}>庫存為零</div>
                        </div>
                    </div>

                    {/* Stock List */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>庫存狀況</h3>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>品項代碼</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>品項名稱</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>倉庫</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>庫存數量</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>安全庫存</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>狀態</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hotelInventoryRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                            尚無庫存資料
                                        </td>
                                    </tr>
                                ) : (
                                    displayedRecords.map(record => {
                                        const item = inventoryItems.find(i => i.id === record.itemId);
                                        const warehouse = warehouses.find(w => w.id === record.warehouseId);
                                        const isLow = item && record.quantity <= item.safetyStock;
                                        const isOut = record.quantity === 0;
                                        return (
                                            <tr key={record.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>{item?.code || '-'}</td>
                                                <td style={{ padding: '14px 16px', fontWeight: 500 }}>{item?.name || '-'}</td>
                                                <td style={{ padding: '14px 16px' }}>{record.warehouseName || warehouse?.name}</td>
                                                <td style={{
                                                    padding: '14px 16px',
                                                    textAlign: 'right',
                                                    fontWeight: 600,
                                                    color: isOut ? '#dc2626' : isLow ? '#d97706' : '#059669'
                                                }}>
                                                    {record.quantity}
                                                </td>
                                                <td style={{ padding: '14px 16px', textAlign: 'right', color: '#6b7280' }}>{item?.safetyStock || 0}</td>
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        backgroundColor: isOut ? '#fee2e2' : isLow ? '#fef3c7' : '#dcfce7',
                                                        color: isOut ? '#991b1b' : isLow ? '#92400e' : '#166534'
                                                    }}>
                                                        {isOut ? '缺貨' : isLow ? '低庫存' : '正常'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        <Pagination currentPage={overviewPage} totalPages={recordsTotalPages} onPageChange={setOverviewPage} />
                    </div>
                </div>
            )}

            {/* Warehouses Tab */}
            {subTab === 'warehouses' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                        <button
                            onClick={() => setIsAddingWarehouse(true)}
                            disabled={isAddingWarehouse}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: isAddingWarehouse ? 'not-allowed' : 'pointer',
                                opacity: isAddingWarehouse ? 0.5 : 1
                            }}
                        >
                            ➕ 新增倉庫
                        </button>
                    </div>

                    {isAddingWarehouse && (
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '20px',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>新增倉庫</h3>
                            <form onSubmit={handleWarehouseSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                    <input
                                        placeholder="倉庫代碼 *"
                                        value={warehouseForm.code}
                                        onChange={(e) => setWarehouseForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                    />
                                    <input
                                        placeholder="倉庫名稱 *"
                                        value={warehouseForm.name}
                                        onChange={(e) => setWarehouseForm(prev => ({ ...prev, name: e.target.value }))}
                                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                    />
                                    <input
                                        placeholder="倉庫位置"
                                        value={warehouseForm.location}
                                        onChange={(e) => setWarehouseForm(prev => ({ ...prev, location: e.target.value }))}
                                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                    />
                                    <input
                                        placeholder="管理員"
                                        value={warehouseForm.managerName}
                                        onChange={(e) => setWarehouseForm(prev => ({ ...prev, managerName: e.target.value }))}
                                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                        新增
                                    </button>
                                    <button type="button" onClick={() => setIsAddingWarehouse(false)} style={{ padding: '10px 24px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                        取消
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                        {displayedWarehouses.map(wh => (
                            <div key={wh.id} style={{
                                backgroundColor: 'white',
                                borderRadius: '12px',
                                padding: '20px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>{wh.code}</div>
                                        <div style={{ fontSize: '18px', fontWeight: 600 }}>{wh.name}</div>
                                    </div>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        backgroundColor: wh.isActive ? '#dcfce7' : '#fee2e2',
                                        color: wh.isActive ? '#166534' : '#991b1b'
                                    }}>
                                        {wh.isActive ? '啟用' : '停用'}
                                    </span>
                                </div>
                                {wh.location && (
                                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                                        📍 {wh.location}
                                    </div>
                                )}
                                {wh.managerName && (
                                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                        👤 {wh.managerName}
                                    </div>
                                )}
                                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                    <button onClick={() => onUpdateWarehouse(wh.id, { isActive: !wh.isActive })} style={{ flex: 1, padding: '8px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                        {wh.isActive ? '停用' : '啟用'}
                                    </button>
                                    <button onClick={() => onDeleteWarehouse(wh.id)} style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: 'none', borderRadius: '6px', fontSize: '13px', color: '#dc2626', cursor: 'pointer' }}>
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {hotelWarehouses.length > ITEMS_PER_PAGE && (
                        <div style={{ marginTop: '20px' }}>
                            <Pagination currentPage={warehousesPage} totalPages={warehousesTotalPages} onPageChange={setWarehousesPage} />
                        </div>
                    )}
                </div>
            )}

            {/* Items Tab */}
            {subTab === 'items' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <input
                            type="text"
                            placeholder="🔍 搜尋品項..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                width: '300px'
                            }}
                        />
                        <button
                            onClick={() => {
                                setEditingItemId(null);
                                setItemForm({
                                    code: '', name: '', category: '', unit: 'PCS', specification: '',
                                    safetyStock: 0, reorderPoint: 0, defaultUnitPrice: 0, accountingCode: '', isActive: true
                                });
                                setIsAddingItem(true);
                            }}
                            disabled={isAddingItem && !editingItemId}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: (isAddingItem && !editingItemId) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            ➕ 新增品項
                        </button>
                    </div>

                    {isAddingItem && (
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '20px',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
                                {editingItemId ? '✏️ 編輯品項' : '➕ 新增品項'}
                            </h3>
                            <form onSubmit={handleItemSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
                                    {/* Row 1: Basic Info */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>品項代碼 <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input
                                            value={itemForm.code}
                                            onChange={(e) => setItemForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.2s' }}
                                            placeholder="請輸入代碼"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>品項名稱 <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input
                                            value={itemForm.name}
                                            onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.2s' }}
                                            placeholder="請輸入品項名稱"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>分類</label>
                                        <input
                                            value={itemForm.category}
                                            onChange={(e) => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.2s' }}
                                            placeholder="例如: 備品, 食材"
                                        />
                                    </div>

                                    {/* Row 2: Specs */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>單位</label>
                                        <select
                                            value={itemForm.unit}
                                            onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
                                        >
                                            <option value="PCS">個 (PCS)</option>
                                            <option value="BOX">箱 (BOX)</option>
                                            <option value="KG">公斤 (KG)</option>
                                            <option value="L">公升 (L)</option>
                                            <option value="SET">組 (SET)</option>
                                            <option value="BTL">瓶 (BTL)</option>
                                            <option value="PKT">包 (PKT)</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>規格/描述</label>
                                        <input
                                            value={itemForm.specification}
                                            onChange={(e) => setItemForm(prev => ({ ...prev, specification: e.target.value }))}
                                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                            placeholder="例如: 500ml/瓶"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>會計科目</label>
                                        <AccountCodeSelect
                                            accounts={accounts}
                                            value={itemForm.accountingCode}
                                            onChange={(code) => setItemForm(prev => ({ ...prev, accountingCode: code }))}
                                        />
                                    </div>

                                    {/* Row 3: Numbers */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>安全庫存</label>
                                        <input
                                            type="number"
                                            value={itemForm.safetyStock}
                                            onChange={(e) => setItemForm(prev => ({ ...prev, safetyStock: parseInt(e.target.value) || 0 }))}
                                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                            min="0"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>訂購點</label>
                                        <input
                                            type="number"
                                            value={itemForm.reorderPoint}
                                            onChange={(e) => setItemForm(prev => ({ ...prev, reorderPoint: parseInt(e.target.value) || 0 }))}
                                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                            min="0"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>預設單價</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }}>$</span>
                                            <input
                                                type="number"
                                                value={itemForm.defaultUnitPrice}
                                                onChange={(e) => setItemForm(prev => ({ ...prev, defaultUnitPrice: parseFloat(e.target.value) || 0 }))}
                                                style={{ padding: '10px 12px 10px 28px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            id="itemIsActive"
                                            checked={itemForm.isActive}
                                            onChange={(e) => setItemForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                                        />
                                        <label htmlFor="itemIsActive" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#334155' }}>啟用此品項</label>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button type="button" onClick={handleCancelItemEdit} style={{ padding: '10px 24px', backgroundColor: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}>
                                            取消
                                        </button>
                                        <button type="submit" style={{ padding: '10px 32px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s' }}>
                                            {editingItemId ? '確認更新' : '新增品項'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Filtered Items List */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>代碼</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>名稱</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>分類</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>單位</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>安全庫存</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>單價</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>狀態</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                            無品項資料
                                        </td>
                                    </tr>
                                ) : (
                                    displayedItems.map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>{item.code}</td>
                                            <td style={{ padding: '14px 16px', fontWeight: 500 }}>{item.name}</td>
                                            <td style={{ padding: '14px 16px', color: '#6b7280' }}>{item.category || '-'}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>{item.unit}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>{item.safetyStock}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>${(item.defaultUnitPrice || 0).toLocaleString()}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    backgroundColor: item.isActive ? '#dcfce7' : '#fee2e2',
                                                    color: item.isActive ? '#166534' : '#991b1b'
                                                }}>
                                                    {item.isActive ? '啟用' : '停用'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => handleEditItem(item)}
                                                    style={{ padding: '6px 12px', backgroundColor: '#f0f9ff', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#0369a1', cursor: 'pointer' }}
                                                >
                                                    ✏️
                                                </button>
                                                <button onClick={() => onDeleteItem(item.id)} style={{ padding: '6px 12px', backgroundColor: '#fef2f2', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#dc2626', cursor: 'pointer' }}>
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        <Pagination currentPage={itemsPage} totalPages={filteredItemsTotalPages} onPageChange={setItemsPage} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryManagement;
