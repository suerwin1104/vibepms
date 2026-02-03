-- =============================================
-- 庫存記錄與入出庫單測試資料
-- =============================================

-- =============================================
-- 1. INVENTORY RECORDS (庫存記錄)
-- 為每個倉庫建立所有品項的庫存
-- =============================================

-- 台北星光大飯店倉庫 (WH-TPE-01)
INSERT INTO inventory_records (id, warehouse_id, item_id, quantity, reserved_quantity, last_receipt_date, last_issue_date)
SELECT 
    gen_random_uuid(),
    w.id,
    i.id,
    CASE 
        WHEN i.code LIKE 'BED%' THEN 50 + (RANDOM() * 30)::int
        WHEN i.code LIKE 'TWL%' THEN 100 + (RANDOM() * 50)::int
        WHEN i.code LIKE 'AMN%' THEN 200 + (RANDOM() * 100)::int
        WHEN i.code LIKE 'CLN%' THEN 80 + (RANDOM() * 40)::int
        ELSE 150 + (RANDOM() * 50)::int
    END,
    CASE WHEN RANDOM() > 0.7 THEN (RANDOM() * 10)::int ELSE 0 END,
    '2025-12-20',
    '2025-12-23'
FROM warehouses w, inventory_items i
WHERE w.code = 'WH-TPE-01';

-- 新北雲頂酒店倉庫 (WH-NTP-01)
INSERT INTO inventory_records (id, warehouse_id, item_id, quantity, reserved_quantity, last_receipt_date, last_issue_date)
SELECT 
    gen_random_uuid(),
    w.id,
    i.id,
    CASE 
        WHEN i.code LIKE 'BED%' THEN 45 + (RANDOM() * 25)::int
        WHEN i.code LIKE 'TWL%' THEN 90 + (RANDOM() * 45)::int
        WHEN i.code LIKE 'AMN%' THEN 180 + (RANDOM() * 80)::int
        WHEN i.code LIKE 'CLN%' THEN 70 + (RANDOM() * 35)::int
        ELSE 130 + (RANDOM() * 45)::int
    END,
    CASE WHEN RANDOM() > 0.7 THEN (RANDOM() * 8)::int ELSE 0 END,
    '2025-12-19',
    '2025-12-22'
FROM warehouses w, inventory_items i
WHERE w.code = 'WH-NTP-01';

-- 台中璀璨酒店倉庫 (WH-TXG-01)
INSERT INTO inventory_records (id, warehouse_id, item_id, quantity, reserved_quantity, last_receipt_date, last_issue_date)
SELECT 
    gen_random_uuid(),
    w.id,
    i.id,
    CASE 
        WHEN i.code LIKE 'BED%' THEN 55 + (RANDOM() * 35)::int
        WHEN i.code LIKE 'TWL%' THEN 110 + (RANDOM() * 55)::int
        WHEN i.code LIKE 'AMN%' THEN 220 + (RANDOM() * 110)::int
        WHEN i.code LIKE 'CLN%' THEN 85 + (RANDOM() * 45)::int
        ELSE 160 + (RANDOM() * 55)::int
    END,
    CASE WHEN RANDOM() > 0.7 THEN (RANDOM() * 12)::int ELSE 0 END,
    '2025-12-18',
    '2025-12-21'
FROM warehouses w, inventory_items i
WHERE w.code = 'WH-TXG-01';

-- 高雄海灣度假村倉庫 (WH-KHH-01)
INSERT INTO inventory_records (id, warehouse_id, item_id, quantity, reserved_quantity, last_receipt_date, last_issue_date)
SELECT 
    gen_random_uuid(),
    w.id,
    i.id,
    CASE 
        WHEN i.code LIKE 'BED%' THEN 60 + (RANDOM() * 40)::int
        WHEN i.code LIKE 'TWL%' THEN 120 + (RANDOM() * 60)::int
        WHEN i.code LIKE 'AMN%' THEN 250 + (RANDOM() * 120)::int
        WHEN i.code LIKE 'CLN%' THEN 100 + (RANDOM() * 50)::int
        ELSE 180 + (RANDOM() * 60)::int
    END,
    CASE WHEN RANDOM() > 0.7 THEN (RANDOM() * 15)::int ELSE 0 END,
    '2025-12-17',
    '2025-12-20'
FROM warehouses w, inventory_items i
WHERE w.code = 'WH-KHH-01';

-- 花蓮悅海酒店倉庫 (WH-HUN-01)
INSERT INTO inventory_records (id, warehouse_id, item_id, quantity, reserved_quantity, last_receipt_date, last_issue_date)
SELECT 
    gen_random_uuid(),
    w.id,
    i.id,
    CASE 
        WHEN i.code LIKE 'BED%' THEN 40 + (RANDOM() * 20)::int
        WHEN i.code LIKE 'TWL%' THEN 80 + (RANDOM() * 40)::int
        WHEN i.code LIKE 'AMN%' THEN 160 + (RANDOM() * 70)::int
        WHEN i.code LIKE 'CLN%' THEN 60 + (RANDOM() * 30)::int
        ELSE 120 + (RANDOM() * 40)::int
    END,
    CASE WHEN RANDOM() > 0.7 THEN (RANDOM() * 6)::int ELSE 0 END,
    '2025-12-16',
    '2025-12-19'
FROM warehouses w, inventory_items i
WHERE w.code = 'WH-HUN-01';

-- =============================================
-- 2. GOODS RECEIPTS (入庫單)
-- 每飯店 1 筆入庫單
-- =============================================
INSERT INTO goods_receipts (id, gr_number, hotel_id, document_type_id, po_id, warehouse_id, supplier_id, supplier_name, receipt_date, receiver_id, receiver_name, status, total_amount, invoice_number, notes)
SELECT
    gen_random_uuid(),
    'GR-TPE-2025-001',
    'hotel-001',
    'd0000003-0001-4000-8000-000000000001',
    'b1000001-0001-4000-8000-000000000001',
    w.id,
    s.id,
    '台北備品供應商',
    '2025-12-23',
    'staff-001-04',
    '陳經理',
    'COMPLETED',
    15000,
    'INV-2025-12-001',
    '月度備品到貨驗收完成'
FROM warehouses w, suppliers s
WHERE w.code = 'WH-TPE-01' AND s.code = 'SUP-001';

INSERT INTO goods_receipts (id, gr_number, hotel_id, document_type_id, po_id, warehouse_id, supplier_id, supplier_name, receipt_date, receiver_id, receiver_name, status, total_amount, invoice_number, notes)
SELECT
    gen_random_uuid(),
    'GR-NTP-2025-001',
    'hotel-002',
    'd0000003-0001-4000-8000-000000000001',
    'b1000002-0001-4000-8000-000000000001',
    w.id,
    s.id,
    '毛巾專賣店',
    '2025-12-22',
    'staff-002-04',
    '蔡主任',
    'COMPLETED',
    18000,
    'INV-2025-12-003',
    '毛巾類驗收完成'
FROM warehouses w, suppliers s
WHERE w.code = 'WH-NTP-01' AND s.code = 'SUP-003';

INSERT INTO goods_receipts (id, gr_number, hotel_id, document_type_id, po_id, warehouse_id, supplier_id, supplier_name, receipt_date, receiver_id, receiver_name, status, total_amount, invoice_number, notes)
SELECT
    gen_random_uuid(),
    'GR-TXG-2025-001',
    'hotel-003',
    'd0000003-0001-4000-8000-000000000001',
    'b1000003-0001-4000-8000-000000000001',
    w.id,
    s.id,
    '寢具批發商',
    '2025-12-21',
    'staff-003-04',
    '許站長',
    'COMPLETED',
    22000,
    'INV-2025-12-004',
    '寢具驗收入庫'
FROM warehouses w, suppliers s
WHERE w.code = 'WH-TXG-01' AND s.code = 'SUP-005';

INSERT INTO goods_receipts (id, gr_number, hotel_id, document_type_id, po_id, warehouse_id, supplier_id, supplier_name, receipt_date, receiver_id, receiver_name, status, total_amount, invoice_number, notes)
SELECT
    gen_random_uuid(),
    'GR-KHH-2025-001',
    'hotel-004',
    'd0000003-0001-4000-8000-000000000001',
    'b1000004-0001-4000-8000-000000000001',
    w.id,
    s.id,
    '床包大盤商',
    '2025-12-20',
    'staff-004-04',
    '郭總監',
    'COMPLETED',
    28000,
    'INV-2025-12-005',
    '大量床包驗收完成'
FROM warehouses w, suppliers s
WHERE w.code = 'WH-KHH-01' AND s.code = 'SUP-007';

INSERT INTO goods_receipts (id, gr_number, hotel_id, document_type_id, po_id, warehouse_id, supplier_id, supplier_name, receipt_date, receiver_id, receiver_name, status, total_amount, invoice_number, notes)
SELECT
    gen_random_uuid(),
    'GR-HUN-2025-001',
    'hotel-005',
    'd0000003-0001-4000-8000-000000000001',
    'b1000005-0001-4000-8000-000000000001',
    w.id,
    s.id,
    '備品供應中心',
    '2025-12-19',
    'staff-005-04',
    '洪店長',
    'COMPLETED',
    16500,
    'INV-2025-12-006',
    '備品驗收入庫完成'
FROM warehouses w, suppliers s
WHERE w.code = 'WH-HUN-01' AND s.code = 'SUP-009';

-- =============================================
-- 3. GOODS ISSUES (出庫單)
-- 每飯店 1 筆出庫單
-- =============================================
INSERT INTO goods_issues (id, gi_number, hotel_id, document_type_id, warehouse_id, issue_date, issuer_id, issuer_name, requester_id, requester_name, department, purpose, status, total_amount, notes)
SELECT
    gen_random_uuid(),
    'GI-TPE-2025-001',
    'hotel-001',
    'd0000004-0001-4000-8000-000000000001',
    w.id,
    '2025-12-23',
    'staff-001-04',
    '陳經理',
    'staff-001-01',
    '王小明',
    '房務部',
    '客房備品補充',
    'COMPLETED',
    3500,
    '10樓客房備品補充'
FROM warehouses w WHERE w.code = 'WH-TPE-01';

INSERT INTO goods_issues (id, gi_number, hotel_id, document_type_id, warehouse_id, issue_date, issuer_id, issuer_name, requester_id, requester_name, department, purpose, status, total_amount, notes)
SELECT
    gen_random_uuid(),
    'GI-NTP-2025-001',
    'hotel-002',
    'd0000004-0001-4000-8000-000000000001',
    w.id,
    '2025-12-22',
    'staff-002-04',
    '蔡主任',
    'staff-002-01',
    '陳大華',
    '房務部',
    '毛巾補充',
    'COMPLETED',
    4200,
    '全館毛巾補充'
FROM warehouses w WHERE w.code = 'WH-NTP-01';

INSERT INTO goods_issues (id, gi_number, hotel_id, document_type_id, warehouse_id, issue_date, issuer_id, issuer_name, requester_id, requester_name, department, purpose, status, total_amount, notes)
SELECT
    gen_random_uuid(),
    'GI-TXG-2025-001',
    'hotel-003',
    'd0000004-0001-4000-8000-000000000001',
    w.id,
    '2025-12-21',
    'staff-003-04',
    '許站長',
    'staff-003-01',
    '劉家豪',
    '房務部',
    '清潔用品領用',
    'COMPLETED',
    1800,
    '清潔用品日常補充'
FROM warehouses w WHERE w.code = 'WH-TXG-01';

INSERT INTO goods_issues (id, gi_number, hotel_id, document_type_id, warehouse_id, issue_date, issuer_id, issuer_name, requester_id, requester_name, department, purpose, status, total_amount, notes)
SELECT
    gen_random_uuid(),
    'GI-KHH-2025-001',
    'hotel-004',
    'd0000004-0001-4000-8000-000000000001',
    w.id,
    '2025-12-20',
    'staff-004-04',
    '郭總監',
    'staff-004-01',
    '郭俊宏',
    '房務部',
    '盥洗用品補充',
    'COMPLETED',
    5600,
    '盥洗用品大量領用'
FROM warehouses w WHERE w.code = 'WH-KHH-01';

INSERT INTO goods_issues (id, gi_number, hotel_id, document_type_id, warehouse_id, issue_date, issuer_id, issuer_name, requester_id, requester_name, department, purpose, status, total_amount, notes)
SELECT
    gen_random_uuid(),
    'GI-HUN-2025-001',
    'hotel-005',
    'd0000004-0001-4000-8000-000000000001',
    w.id,
    '2025-12-19',
    'staff-005-04',
    '洪店長',
    'staff-005-01',
    '謝政憲',
    '房務部',
    '客房用品補充',
    'COMPLETED',
    2200,
    '拖鞋與備品補充'
FROM warehouses w WHERE w.code = 'WH-HUN-01';

-- =============================================
-- 統計:
-- 100 筆庫存記錄 (5倉庫 x 20品項)
-- 5 筆入庫單
-- 5 筆出庫單
-- =============================================
