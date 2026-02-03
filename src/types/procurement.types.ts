/**
 * 採購相關類型定義
 */

// 請購單
export type PRStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Converted';

export interface PurchaseRequisition {
    id: string;
    prNumber: string;
    hotelId: string;
    documentTypeId?: string;
    documentTypeName?: string;
    requesterId: string;
    requesterName: string;
    department?: string;
    requestDate: string;
    requiredDate?: string;
    status: PRStatus;
    priority: 'Low' | 'Normal' | 'High' | 'Urgent';
    totalAmount: number;
    notes?: string;
    workflowInstanceId?: string;
    createdAt?: string;
    updatedAt?: string;
    items?: PurchaseRequisitionItem[];
}

export interface PurchaseRequisitionItem {
    id: string;
    prId: string;
    lineNumber: number;
    itemId?: string;
    itemCode?: string;
    itemName: string;
    specification?: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice: number;
    estimatedAmount: number;
    notes?: string;
    createdAt?: string;
}

// 採購單
export type POStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Ordered' | 'PartialReceived' | 'Received' | 'Cancelled';

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    hotelId: string;
    documentTypeId?: string;
    documentTypeName?: string;
    prId?: string;
    prNumber?: string;
    supplierId?: string;
    supplierName?: string;
    buyerId?: string;
    buyerName?: string;
    orderDate: string;
    expectedDeliveryDate?: string;
    status: POStatus;
    priority: 'Low' | 'Normal' | 'High' | 'Urgent';
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    accountingCode?: string;
    costCenter?: string;
    paymentTerms?: string;
    shippingAddress?: string;
    notes?: string;
    workflowInstanceId?: string;
    createdAt?: string;
    updatedAt?: string;
    items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
    id: string;
    poId: string;
    lineNumber: number;
    itemId?: string;
    itemCode?: string;
    itemName: string;
    specification?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
    receivedQuantity: number;
    accountingCode?: string;
    notes?: string;
    createdAt?: string;
}

// 進貨驗收單
export type GRStatus = 'Draft' | 'Received' | 'Inspecting' | 'Completed' | 'Rejected';

export interface GoodsReceipt {
    id: string;
    grNumber: string;
    hotelId: string;
    documentTypeId?: string;
    documentTypeName?: string;
    poId?: string;
    poNumber?: string;
    warehouseId?: string;
    warehouseName?: string;
    supplierId?: string;
    supplierName?: string;
    receiptDate: string;
    receiverId?: string;
    receiverName?: string;
    status: GRStatus;
    totalAmount: number;
    invoiceNumber?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    items?: GoodsReceiptItem[];
}

export interface GoodsReceiptItem {
    id: string;
    grId: string;
    lineNumber: number;
    poItemId?: string;
    itemId?: string;
    itemCode?: string;
    itemName: string;
    orderedQuantity?: number;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
    rejectionReason?: string;
    storageLocation?: string;
    notes?: string;
    createdAt?: string;
}

// 出貨/領用單
export type GIStatus = 'Draft' | 'Pending' | 'Approved' | 'Issued' | 'Cancelled';

export interface GoodsIssue {
    id: string;
    giNumber: string;
    hotelId: string;
    documentTypeId?: string;
    documentTypeName?: string;
    warehouseId?: string;
    warehouseName?: string;
    issueDate: string;
    issuerId?: string;
    issuerName?: string;
    requesterId?: string;
    requesterName?: string;
    department?: string;
    purpose?: string;
    status: GIStatus;
    totalAmount: number;
    notes?: string;
    workflowInstanceId?: string;
    createdAt?: string;
    updatedAt?: string;
    items?: GoodsIssueItem[];
}

export interface GoodsIssueItem {
    id: string;
    giId: string;
    lineNumber: number;
    itemId?: string;
    itemCode?: string;
    itemName: string;
    quantity: number;
    unit: string;
    unitCost: number;
    amount: number;
    storageLocation?: string;
    notes?: string;
    createdAt?: string;
}
