-- =============================================
-- 補足流程簽核測試資料 (Add Workflow Test Data)
-- 各單據加入 3 筆 Pending (待審核) 資料
-- =============================================

-- 1. PURCHASE REQUISITIONS (3 筆 Pending)
INSERT INTO purchase_requisitions (id, pr_number, hotel_id, document_type_id, requester_id, requester_name, department, request_date, required_date, status, priority, total_amount, notes) VALUES
(gen_random_uuid(), 'PR-TPE-2025-PEND-01', 'hotel-001', 'd0000001-0001-4000-8000-000000000001', 'staff-001-01', '王小明', '房務部', '2025-12-25', '2025-12-30', 'Pending', 'Normal', 5000, '待審核測試 1'),
(gen_random_uuid(), 'PR-TPE-2025-PEND-02', 'hotel-001', 'd0000001-0001-4000-8000-000000000001', 'staff-001-02', '林美玲', '客房部', '2025-12-25', '2025-12-31', 'Pending', 'High', 8000, '待審核測試 2'),
(gen_random_uuid(), 'PR-TPE-2025-PEND-03', 'hotel-001', 'd0000001-0002-4000-8000-000000000002', 'staff-001-03', '張志偉', '餐飲部', '2025-12-25', '2026-01-05', 'Pending', 'Urgent', 12000, '待審核測試 3');

-- 補足 Items
INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), id, 1, '測試請購品項', 10, 'PCS', 500, 5000, '測試'
FROM purchase_requisitions WHERE pr_number LIKE 'PR-TPE-2025-PEND%';

-- 2. PURCHASE ORDERS (3 筆 Pending)
INSERT INTO purchase_orders (id, po_number, hotel_id, document_type_id, supplier_id, supplier_name, buyer_id, buyer_name, order_date, expected_delivery_date, status, priority, subtotal, tax_amount, total_amount, notes) VALUES
(gen_random_uuid(), 'PO-TPE-2025-PEND-01', 'hotel-001', 'd0000002-0001-4000-8000-000000000001', (SELECT id FROM suppliers WHERE code='SUP-001' LIMIT 1), '台北備品供應商', 'staff-001-04', '陳經理', '2025-12-25', '2026-01-01', 'Pending', 'Normal', 10000, 500, 10500, '待審核 PO 1'),
(gen_random_uuid(), 'PO-TPE-2025-PEND-02', 'hotel-001', 'd0000002-0001-4000-8000-000000000001', (SELECT id FROM suppliers WHERE code='SUP-001' LIMIT 1), '台北備品供應商', 'staff-001-04', '陳經理', '2025-12-25', '2026-01-02', 'Pending', 'High', 20000, 1000, 21000, '待審核 PO 2'),
(gen_random_uuid(), 'PO-TPE-2025-PEND-03', 'hotel-001', 'd0000002-0002-4000-8000-000000000002', (SELECT id FROM suppliers WHERE code='SUP-002' LIMIT 1), '優質寢具行', 'staff-001-04', '陳經理', '2025-12-25', '2026-01-03', 'Pending', 'Urgent', 5000, 250, 5250, '待審核 PO 3');

-- 補足 Items
INSERT INTO purchase_order_items (id, po_id, line_number, item_name, quantity, unit, unit_price, amount)
SELECT gen_random_uuid(), id, 1, '測試採購品項', 20, 'PCS', 500, 10000
FROM purchase_orders WHERE po_number LIKE 'PO-TPE-2025-PEND%';


-- 3. GOODS ISSUES (3 筆 Pending)
INSERT INTO goods_issues (id, gi_number, hotel_id, document_type_id, warehouse_id, issue_date, issuer_id, issuer_name, department, purpose, status, total_amount, notes) VALUES
(gen_random_uuid(), 'GI-TPE-2025-PEND-01', 'hotel-001', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code='WH-TPE-01'), '2025-12-25', 'staff-001-01', '王小明', '房務部', '一般領用', 'Pending', 1000, '待審核 GI 1'),
(gen_random_uuid(), 'GI-TPE-2025-PEND-02', 'hotel-001', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code='WH-TPE-01'), '2025-12-25', 'staff-001-01', '王小明', '房務部', '補充備品', 'Pending', 2000, '待審核 GI 2'),
(gen_random_uuid(), 'GI-TPE-2025-PEND-03', 'hotel-001', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code='WH-TPE-01'), '2025-12-25', 'staff-001-01', '王小明', '客房部', '緊急領用', 'Pending', 3000, '待審核 GI 3');

-- 補足 Items
INSERT INTO goods_issue_items (id, gi_id, line_number, item_name, quantity, unit, unit_cost, amount)
SELECT gen_random_uuid(), id, 1, '測試領用品項', 5, 'PCS', 200, 1000
FROM goods_issues WHERE gi_number LIKE 'GI-TPE-2025-PEND%';

-- 4. STOCK TRANSFERS (3 筆 Pending)
INSERT INTO stock_transfers (id, st_number, document_type_id, from_hotel_id, from_warehouse_id, to_hotel_id, to_warehouse_id, transfer_date, requester_id, requester_name, status, priority, reason, total_amount, notes) VALUES
(gen_random_uuid(), 'ST-TPE-2025-PEND-01', 'd0000005-0001-4000-8000-000000000001', 'hotel-001', (SELECT id FROM warehouses WHERE code='WH-TPE-01'), 'hotel-002', (SELECT id FROM warehouses WHERE code='WH-NTP-01'), '2025-12-25', 'staff-001-01', '王小明', 'Pending', 'Normal', '庫存調度', 1500, '待審核 ST 1'),
(gen_random_uuid(), 'ST-TPE-2025-PEND-02', 'd0000005-0001-4000-8000-000000000001', 'hotel-001', (SELECT id FROM warehouses WHERE code='WH-TPE-01'), 'hotel-003', (SELECT id FROM warehouses WHERE code='WH-TXG-01'), '2025-12-25', 'staff-001-01', '王小明', 'Pending', 'High', '支援', 2500, '待審核 ST 2'),
(gen_random_uuid(), 'ST-TPE-2025-PEND-03', 'd0000005-0001-4000-8000-000000000001', 'hotel-001', (SELECT id FROM warehouses WHERE code='WH-TPE-01'), 'hotel-004', (SELECT id FROM warehouses WHERE code='WH-KHH-01'), '2025-12-25', 'staff-001-01', '王小明', 'Pending', 'Urgent', '緊急', 4500, '待審核 ST 3');

-- 補足 Items
INSERT INTO stock_transfer_items (id, st_id, line_number, item_name, quantity, unit, unit_cost, amount)
SELECT gen_random_uuid(), id, 1, '測試調撥品項', 10, 'PCS', 150, 1500
FROM stock_transfers WHERE st_number LIKE 'ST-TPE-2025-PEND%';
