/**
 * 庫存相關類型定義
 */

// 單據類別
export type DocumentCategory =
    | 'PURCHASE_REQUISITION'
    | 'PURCHASE_ORDER'
    | 'GOODS_RECEIPT'
    | 'GOODS_ISSUE'
    | 'STOCK_TRANSFER'
    | 'PETTY_CASH'
    | 'CUSTOM_FORM';

export interface DocumentType {
    id: string;
    code: string;
    name: string;
    category: DocumentCategory;
    description?: string;
    isActive: boolean;
    accountingCode?: string;
    customFormId?: string;
    createdAt?: string;
    updatedAt?: string;
}

// 倉庫
export interface Warehouse {
    id: string;
    hotelId: string;
    code: string;
    name: string;
    location?: string;
    managerId?: string;
    managerName?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// 庫存品項
export interface InventoryItem {
    id: string;
    code: string;
    name: string;
    category?: string;
    unit: string;
    specification?: string;
    barcode?: string;
    safetyStock: number;
    reorderPoint: number;
    defaultSupplierId?: string;
    defaultUnitPrice: number;
    accountingCode?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// 庫存記錄
export interface InventoryRecord {
    id: string;
    warehouseId: string;
    itemId: string;
    quantity: number;
    reservedQuantity: number;
    lastReceiptDate?: string;
    lastIssueDate?: string;
    updatedAt?: string;
    itemName?: string;
    itemCode?: string;
    warehouseName?: string;
}

// 供應商
export interface Supplier {
    id: string;
    code: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    taxId?: string;
    paymentTerms?: string;
    bankAccount?: string;
    bankName?: string;
    notes?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// 調撥單
export type STStatus = 'Draft' | 'Pending' | 'Approved' | 'InTransit' | 'Received' | 'Cancelled';

export interface StockTransfer {
    id: string;
    stNumber: string;
    documentTypeId?: string;
    documentTypeName?: string;
    fromHotelId: string;
    fromHotelName?: string;
    toHotelId: string;
    toHotelName?: string;
    fromWarehouseId?: string;
    fromWarehouseName?: string;
    toWarehouseId?: string;
    toWarehouseName?: string;
    transferDate: string;
    requesterId?: string;
    requesterName?: string;
    status: STStatus;
    priority: 'Low' | 'Normal' | 'High' | 'Urgent';
    reason?: string;
    totalAmount: number;
    notes?: string;
    shippedAt?: string;
    receivedAt?: string;
    workflowInstanceId?: string;
    createdAt?: string;
    updatedAt?: string;
    items?: StockTransferItem[];
}

export interface StockTransferItem {
    id: string;
    stId: string;
    lineNumber: number;
    itemId?: string;
    itemCode?: string;
    itemName: string;
    quantity: number;
    unit: string;
    unitCost: number;
    amount: number;
    receivedQuantity: number;
    notes?: string;
    createdAt?: string;
}

// 零用金帳戶
export interface PettyCashAccount {
    id: string;
    hotelId: string;
    hotelName?: string;
    accountName: string;
    custodianId?: string;
    custodianName?: string;
    balance: number;
    creditLimit: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// 零用金異動
export type PCTransactionType = 'REPLENISH' | 'EXPENSE' | 'ADJUSTMENT';
export type PCStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected';

export interface PettyCashTransaction {
    id: string;
    accountId: string;
    accountName?: string;
    documentTypeId?: string;
    documentTypeName?: string;
    transactionNumber: string;
    transactionDate: string;
    transactionType: PCTransactionType;
    amount: number;
    balanceAfter: number;
    description?: string;
    vendorName?: string;
    receiptNumber?: string;
    expenseCategory?: string;
    accountingCode?: string;
    handlerId?: string;
    handlerName?: string;
    approvedBy?: string;
    status: PCStatus;
    notes?: string;
    workflowInstanceId?: string;
    createdAt?: string;
    updatedAt?: string;
}
