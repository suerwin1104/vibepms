-- Migration: Inventory and Procurement System
-- This migration creates all tables needed for inventory, procurement, workflow, and petty cash management

-- =====================================================
-- PART 1: Document Types (單據類別 - 可編輯)
-- =====================================================

CREATE TABLE IF NOT EXISTS document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'PURCHASE_REQUISITION', 'PURCHASE_ORDER', 'GOODS_RECEIPT', 'GOODS_ISSUE', 'STOCK_TRANSFER', 'PETTY_CASH'
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default document types
INSERT INTO document_types (code, name, category, description) VALUES
    -- 請購單類別
    ('PR-GENERAL', '一般請購', 'PURCHASE_REQUISITION', '一般物品請購'),
    ('PR-URGENT', '緊急請購', 'PURCHASE_REQUISITION', '緊急物品請購'),
    -- 採購單類別
    ('PO-GENERAL', '一般採購', 'PURCHASE_ORDER', '一般物品採購'),
    ('PO-ADMIN', '事務性採購', 'PURCHASE_ORDER', '事務用品採購'),
    ('PO-MISC', '雜項採購', 'PURCHASE_ORDER', '雜項物品採購'),
    ('PO-URGENT', '緊急採購', 'PURCHASE_ORDER', '緊急物品採購'),
    ('PO-CONTRACT', '合約採購', 'PURCHASE_ORDER', '依合約進行的定期採購'),
    -- 進貨類別
    ('GR-NORMAL', '一般進貨', 'GOODS_RECEIPT', '正常進貨入庫'),
    ('GR-RETURN', '退貨進庫', 'GOODS_RECEIPT', '客戶退貨入庫'),
    -- 出貨類別
    ('GI-CONSUME', '領用出庫', 'GOODS_ISSUE', '部門領用'),
    ('GI-SCRAP', '報廢出庫', 'GOODS_ISSUE', '物品報廢'),
    ('GI-SALE', '銷售出庫', 'GOODS_ISSUE', '販售出庫'),
    -- 調撥類別
    ('ST-NORMAL', '一般調撥', 'STOCK_TRANSFER', '飯店間一般調撥'),
    ('ST-URGENT', '緊急調撥', 'STOCK_TRANSFER', '緊急支援調撥'),
    -- 零用金類別
    ('PC-REPLENISH', '零用金撥補', 'PETTY_CASH', '零用金帳戶撥補'),
    ('PC-EXPENSE', '零用金支出', 'PETTY_CASH', '零用金支付費用');

-- =====================================================
-- PART 2: Warehouse Management (倉庫管理)
-- =====================================================

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id VARCHAR(50) REFERENCES hotels(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    manager_id VARCHAR(50),
    manager_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hotel_id, code)
);

CREATE INDEX idx_warehouses_hotel ON warehouses(hotel_id);

-- =====================================================
-- PART 3: Inventory Items (庫存品項)
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS', -- PCS, KG, L, BOX, etc.
    specification TEXT,
    barcode VARCHAR(100),
    safety_stock INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    default_supplier_id UUID,
    default_unit_price DECIMAL(12, 2) DEFAULT 0,
    accounting_code VARCHAR(50), -- 會計科目預留欄位
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_items_code ON inventory_items(code);

-- =====================================================
-- PART 4: Inventory Records (庫存記錄)
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0, -- 預留數量
    last_receipt_date DATE,
    last_issue_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(warehouse_id, item_id)
);

CREATE INDEX idx_inventory_records_warehouse ON inventory_records(warehouse_id);
CREATE INDEX idx_inventory_records_item ON inventory_records(item_id);

-- =====================================================
-- PART 5: Purchase Requisitions (請購單)
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_number VARCHAR(50) NOT NULL UNIQUE,
    hotel_id VARCHAR(50) REFERENCES hotels(id),
    document_type_id UUID REFERENCES document_types(id),
    requester_id VARCHAR(50),
    requester_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    required_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Draft', -- Draft, Pending, Approved, Rejected, Cancelled, Converted
    priority VARCHAR(20) DEFAULT 'Normal', -- Low, Normal, High, Urgent
    total_amount DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    workflow_instance_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_id UUID NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    item_id UUID REFERENCES inventory_items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200) NOT NULL,
    specification TEXT,
    quantity INTEGER NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    estimated_unit_price DECIMAL(12, 2) DEFAULT 0,
    estimated_amount DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pr_hotel ON purchase_requisitions(hotel_id);
CREATE INDEX idx_pr_status ON purchase_requisitions(status);
CREATE INDEX idx_pr_items_pr ON purchase_requisition_items(pr_id);

-- =====================================================
-- PART 6: Suppliers (供應商)
-- =====================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100),
    bank_account VARCHAR(100),
    bank_name VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PART 7: Purchase Orders (採購單)
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) NOT NULL UNIQUE,
    hotel_id VARCHAR(50) REFERENCES hotels(id),
    document_type_id UUID REFERENCES document_types(id),
    pr_id UUID REFERENCES purchase_requisitions(id), -- 關聯請購單
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name VARCHAR(200),
    buyer_id VARCHAR(50),
    buyer_name VARCHAR(100),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Draft', -- Draft, Pending, Approved, Rejected, Ordered, PartialReceived, Received, Cancelled
    priority VARCHAR(20) DEFAULT 'Normal',
    subtotal DECIMAL(15, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 5, -- 稅率 %
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    accounting_code VARCHAR(50), -- 會計科目預留欄位
    cost_center VARCHAR(50), -- 成本中心
    payment_terms VARCHAR(100),
    shipping_address TEXT,
    notes TEXT,
    workflow_instance_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    item_id UUID REFERENCES inventory_items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200) NOT NULL,
    specification TEXT,
    quantity INTEGER NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    amount DECIMAL(15, 2) DEFAULT 0,
    received_quantity INTEGER DEFAULT 0,
    accounting_code VARCHAR(50), -- 明細行會計科目
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_po_hotel ON purchase_orders(hotel_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);

-- =====================================================
-- PART 8: Goods Receipts (進貨驗收)
-- =====================================================

CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gr_number VARCHAR(50) NOT NULL UNIQUE,
    hotel_id VARCHAR(50) REFERENCES hotels(id),
    document_type_id UUID REFERENCES document_types(id),
    po_id UUID REFERENCES purchase_orders(id),
    warehouse_id UUID REFERENCES warehouses(id),
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name VARCHAR(200),
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receiver_id VARCHAR(50),
    receiver_name VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'Draft', -- Draft, Received, Inspecting, Completed, Rejected
    total_amount DECIMAL(15, 2) DEFAULT 0,
    invoice_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gr_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    po_item_id UUID REFERENCES purchase_order_items(id),
    item_id UUID REFERENCES inventory_items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200) NOT NULL,
    ordered_quantity INTEGER,
    received_quantity INTEGER NOT NULL,
    accepted_quantity INTEGER NOT NULL,
    rejected_quantity INTEGER DEFAULT 0,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    unit_price DECIMAL(12, 2) DEFAULT 0,
    amount DECIMAL(15, 2) DEFAULT 0,
    rejection_reason TEXT,
    storage_location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gr_hotel ON goods_receipts(hotel_id);
CREATE INDEX idx_gr_po ON goods_receipts(po_id);
CREATE INDEX idx_gr_items_gr ON goods_receipt_items(gr_id);

-- =====================================================
-- PART 9: Goods Issues (出貨/領用)
-- =====================================================

CREATE TABLE IF NOT EXISTS goods_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gi_number VARCHAR(50) NOT NULL UNIQUE,
    hotel_id VARCHAR(50) REFERENCES hotels(id),
    document_type_id UUID REFERENCES document_types(id),
    warehouse_id UUID REFERENCES warehouses(id),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    issuer_id VARCHAR(50),
    issuer_name VARCHAR(100),
    requester_id VARCHAR(50),
    requester_name VARCHAR(100),
    department VARCHAR(100),
    purpose TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Draft', -- Draft, Pending, Approved, Issued, Cancelled
    total_amount DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    workflow_instance_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_issue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gi_id UUID NOT NULL REFERENCES goods_issues(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    item_id UUID REFERENCES inventory_items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    unit_cost DECIMAL(12, 2) DEFAULT 0,
    amount DECIMAL(15, 2) DEFAULT 0,
    storage_location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gi_hotel ON goods_issues(hotel_id);
CREATE INDEX idx_gi_warehouse ON goods_issues(warehouse_id);
CREATE INDEX idx_gi_items_gi ON goods_issue_items(gi_id);

-- =====================================================
-- PART 10: Stock Transfers (調撥)
-- =====================================================

CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    st_number VARCHAR(50) NOT NULL UNIQUE,
    document_type_id UUID REFERENCES document_types(id),
    from_hotel_id VARCHAR(50) REFERENCES hotels(id),
    to_hotel_id VARCHAR(50) REFERENCES hotels(id),
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    requester_id VARCHAR(50),
    requester_name VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'Draft', -- Draft, Pending, Approved, InTransit, Received, Cancelled
    priority VARCHAR(20) DEFAULT 'Normal',
    reason TEXT,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    shipped_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    workflow_instance_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    st_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    item_id UUID REFERENCES inventory_items(id),
    item_code VARCHAR(50),
    item_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    unit_cost DECIMAL(12, 2) DEFAULT 0,
    amount DECIMAL(15, 2) DEFAULT 0,
    received_quantity INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_st_from_hotel ON stock_transfers(from_hotel_id);
CREATE INDEX idx_st_to_hotel ON stock_transfers(to_hotel_id);
CREATE INDEX idx_st_items_st ON stock_transfer_items(st_id);

-- =====================================================
-- PART 11: Petty Cash (零用金)
-- =====================================================

CREATE TABLE IF NOT EXISTS petty_cash_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id VARCHAR(50) REFERENCES hotels(id),
    account_name VARCHAR(100) NOT NULL,
    custodian_id VARCHAR(50),
    custodian_name VARCHAR(100),
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    credit_limit DECIMAL(15, 2) DEFAULT 50000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS petty_cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES petty_cash_accounts(id),
    document_type_id UUID REFERENCES document_types(id),
    transaction_number VARCHAR(50) NOT NULL UNIQUE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(20) NOT NULL, -- 'REPLENISH', 'EXPENSE', 'ADJUSTMENT'
    amount DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    description TEXT,
    vendor_name VARCHAR(200),
    receipt_number VARCHAR(100),
    expense_category VARCHAR(100),
    accounting_code VARCHAR(50), -- 會計科目
    handler_id VARCHAR(50),
    handler_name VARCHAR(100),
    approved_by VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'Draft', -- Draft, Pending, Approved, Rejected
    notes TEXT,
    workflow_instance_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pc_account_hotel ON petty_cash_accounts(hotel_id);
CREATE INDEX idx_pc_tx_account ON petty_cash_transactions(account_id);
CREATE INDEX idx_pc_tx_date ON petty_cash_transactions(transaction_date);

-- =====================================================
-- PART 12: Workflow Management (流程簽核)
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    document_category VARCHAR(50) NOT NULL, -- 'PURCHASE_REQUISITION', 'PURCHASE_ORDER', 'GOODS_ISSUE', 'STOCK_TRANSFER', 'PETTY_CASH'
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    step_sequence INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    approval_type VARCHAR(20) NOT NULL DEFAULT 'Serial', -- 'Serial' (串簽), 'Parallel' (會簽)
    approver_role VARCHAR(50), -- Role required for approval
    approver_ids TEXT[], -- Specific approver IDs (if not role-based)
    required_approvals INTEGER DEFAULT 1, -- For parallel: minimum approvals needed
    can_skip BOOLEAN DEFAULT false,
    skip_condition TEXT, -- JSON condition when step can be skipped
    timeout_hours INTEGER DEFAULT 72,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(id),
    document_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(50),
    current_step INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending', -- Pending, InProgress, Approved, Rejected, Cancelled
    initiated_by VARCHAR(100),
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS approval_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id),
    step_id UUID REFERENCES workflow_steps(id),
    step_sequence INTEGER NOT NULL,
    approver_id VARCHAR(50) NOT NULL,
    approver_name VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'Approve', 'Reject', 'Return', 'Delegate'
    comments TEXT,
    delegated_to VARCHAR(50),
    acted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wf_instances_doc ON workflow_instances(document_id, document_type);
CREATE INDEX idx_wf_instances_status ON workflow_instances(status);
CREATE INDEX idx_approval_records_instance ON approval_records(workflow_instance_id);
CREATE INDEX idx_approval_records_approver ON approval_records(approver_id);

-- =====================================================
-- PART 13: Insert Default Workflow Definitions
-- =====================================================

INSERT INTO workflow_definitions (code, name, document_category, description) VALUES
    ('WF-PR-STD', '請購單標準流程', 'PURCHASE_REQUISITION', '請購單標準審批流程'),
    ('WF-PO-STD', '採購單標準流程', 'PURCHASE_ORDER', '採購單標準審批流程'),
    ('WF-GI-STD', '領用單標準流程', 'GOODS_ISSUE', '領用單標準審批流程'),
    ('WF-ST-STD', '調撥單標準流程', 'STOCK_TRANSFER', '調撥單標準審批流程'),
    ('WF-PC-STD', '零用金標準流程', 'PETTY_CASH', '零用金支出審批流程');

-- Insert default workflow steps for Purchase Order
INSERT INTO workflow_steps (workflow_id, step_sequence, step_name, approval_type, approver_role)
SELECT id, 1, '部門主管審核', 'Serial', 'HotelAdmin'
FROM workflow_definitions WHERE code = 'WF-PO-STD';

INSERT INTO workflow_steps (workflow_id, step_sequence, step_name, approval_type, approver_role)
SELECT id, 2, '財務審核', 'Serial', 'GroupAdmin'
FROM workflow_definitions WHERE code = 'WF-PO-STD';

-- =====================================================
-- PART 14: Sequence Tables for Document Numbers
-- =====================================================

CREATE TABLE IF NOT EXISTS document_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id VARCHAR(50) REFERENCES hotels(id),
    document_type VARCHAR(30) NOT NULL, -- 'PR', 'PO', 'GR', 'GI', 'ST', 'PC'
    prefix VARCHAR(20) NOT NULL,
    current_number INTEGER NOT NULL DEFAULT 0,
    year INTEGER NOT NULL,
    UNIQUE(hotel_id, document_type, year)
);

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE document_types IS '單據類別主檔，可供使用者自訂新增修改刪除';
COMMENT ON TABLE warehouses IS '倉庫主檔';
COMMENT ON TABLE inventory_items IS '庫存品項主檔';
COMMENT ON TABLE inventory_records IS '各倉庫庫存記錄';
COMMENT ON TABLE purchase_requisitions IS '請購單';
COMMENT ON TABLE purchase_orders IS '採購單，含會計科目預留欄位';
COMMENT ON TABLE goods_receipts IS '進貨驗收單';
COMMENT ON TABLE goods_issues IS '出貨/領用單';
COMMENT ON TABLE stock_transfers IS '飯店間調撥單';
COMMENT ON TABLE petty_cash_accounts IS '零用金帳戶';
COMMENT ON TABLE petty_cash_transactions IS '零用金異動記錄';
COMMENT ON TABLE workflow_definitions IS '簽核流程定義';
COMMENT ON TABLE workflow_steps IS '簽核流程步驟，支援串簽(Serial)與會簽(Parallel)';
COMMENT ON TABLE workflow_instances IS '簽核流程實例';
COMMENT ON TABLE approval_records IS '簽核記錄';
