-- =============================================
-- 調撥管理測試資料
-- =============================================

-- =============================================
-- 1. DOCUMENT TYPES (文件類型)
-- =============================================
INSERT INTO document_types (id, code, name, category, description, is_active) VALUES
('d0000005-0001-4000-8000-000000000001', 'ST-GEN', '一般調撥單', 'STOCK_TRANSFER', '倉庫間的一般物資調撥', true),
('d0000005-0002-4000-8000-000000000002', 'ST-URG', '緊急調撥單', 'STOCK_TRANSFER', '緊急需求的物資調撥', true);


-- =============================================
-- 2. STOCK TRANSFERS (調撥單)
-- 建立 10 筆調撥單 (互相調撥)
-- =============================================

-- TPE -> NTP (台北 -> 新北)
INSERT INTO stock_transfers (
    id, st_number, document_type_id, 
    from_hotel_id, from_warehouse_id, 
    to_hotel_id, to_warehouse_id, 
    transfer_date, requester_id, requester_name, 
    status, priority, reason, total_amount, notes
) VALUES (
    gen_random_uuid(), 'ST-TPE-2025-001', 'd0000005-0001-4000-8000-000000000001',
    'hotel-001', (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'),
    'hotel-002', (SELECT id FROM warehouses WHERE code = 'WH-NTP-01'),
    '2025-12-24', 'staff-002-01', '陳大華',
    'Approved', 'Normal', '庫存平衡', 3500, '台北庫存過多調至新北'
);

INSERT INTO stock_transfers (
    id, st_number, document_type_id, 
    from_hotel_id, from_warehouse_id, 
    to_hotel_id, to_warehouse_id, 
    transfer_date, requester_id, requester_name, 
    status, priority, reason, total_amount, notes
) VALUES (
    gen_random_uuid(), 'ST-TPE-2025-002', 'd0000005-0002-4000-8000-000000000002',
    'hotel-001', (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'),
    'hotel-003', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'),
    '2025-12-25', 'staff-003-01', '劉家豪',
    'InTransit', 'Urgent', '緊急支援', 1200, '台中缺貨緊急調撥'
);

-- NTP -> TPE (新北 -> 台北)
INSERT INTO stock_transfers (
    id, st_number, document_type_id, 
    from_hotel_id, from_warehouse_id, 
    to_hotel_id, to_warehouse_id, 
    transfer_date, requester_id, requester_name, 
    status, priority, reason, total_amount, notes
) VALUES (
    gen_random_uuid(), 'ST-NTP-2025-001', 'd0000005-0001-4000-8000-000000000001',
    'hotel-002', (SELECT id FROM warehouses WHERE code = 'WH-NTP-01'),
    'hotel-001', (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'),
    '2025-12-22', 'staff-001-01', '王小明',
    'Received', 'Normal', '過期品交換', 800, '已確認收貨'
);

INSERT INTO stock_transfers (
    id, st_number, document_type_id, 
    from_hotel_id, from_warehouse_id, 
    to_hotel_id, to_warehouse_id, 
    transfer_date, requester_id, requester_name, 
    status, priority, reason, total_amount, notes
) VALUES (
    gen_random_uuid(), 'ST-NTP-2025-002', 'd0000005-0001-4000-8000-000000000001',
    'hotel-002', (SELECT id FROM warehouses WHERE code = 'WH-NTP-01'),
    'hotel-005', (SELECT id FROM warehouses WHERE code = 'WH-HUN-01'),
    '2025-12-26', 'staff-005-01', '謝政憲',
    'Draft', 'Normal', '一般補貨', 5000, '草稿狀態'
);

-- TXG -> KHH (台中 -> 高雄)
INSERT INTO stock_transfers (
    id, st_number, document_type_id, 
    from_hotel_id, from_warehouse_id, 
    to_hotel_id, to_warehouse_id, 
    transfer_date, requester_id, requester_name, 
    status, priority, reason, total_amount, notes
) VALUES (
    gen_random_uuid(), 'ST-TXG-2025-001', 'd0000005-0001-4000-8000-000000000001',
    'hotel-003', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'),
    'hotel-004', (SELECT id FROM warehouses WHERE code = 'WH-KHH-01'),
    '2025-12-23', 'staff-004-01', '郭俊宏',
    'Approved', 'Normal', '庫存調度', 2200, ''
);

INSERT INTO stock_transfers (
    id, st_number, document_type_id, 
    from_hotel_id, from_warehouse_id, 
    to_hotel_id, to_warehouse_id, 
    transfer_date, requester_id, requester_name, 
    status, priority, reason, total_amount, notes
) VALUES (
    gen_random_uuid(), 'ST-TXG-2025-002', 'd0000005-0001-4000-8000-000000000001',
    'hotel-003', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'),
    'hotel-001', (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'),
    '2025-12-24', 'staff-001-02', '林美玲',
    'Pending', 'Normal', '庫存調度', 1800, '等待審核中'
);

-- KHH -> TXG (高雄 -> 台中)
INSERT INTO stock_transfers (
    id, st_number, document_type_id, 
    from_hotel_id, from_warehouse_id, 
    to_hotel_id, to_warehouse_id, 
    transfer_date, requester_id, requester_name, 
    status, priority, reason, total_amount, notes
) VALUES (
    gen_random_uuid(), 'ST-KHH-2025-001', 'd0000005-0001-4000-8000-000000000001',
    'hotel-004', (SELECT id FROM warehouses WHERE code = 'WH-KHH-01'),
    'hotel-003', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'),
    '2025-12-21', 'staff-003-01', '劉家豪',
    'Received', 'Normal', '退還物資', 1500, '已歸還借用物資'
);

INSERT INTO stock_transfers (
    id, st_number, document_type_id, 
    from_hotel_id, from_warehouse_id, 
    to_hotel_id, to_warehouse_id, 
    transfer_date, requester_id, requester_name, 
    status, priority, reason, total_amount, notes
) VALUES (
    gen_random_uuid(), 'ST-KHH-2025-002', 'd0000005-0002-4000-8000-000000000002',
    'hotel-004', (SELECT id FROM warehouses WHERE code = 'WH-KHH-01'),
    'hotel-002', (SELECT id FROM warehouses WHERE code = 'WH-NTP-01'),
    '2025-12-25', 'staff-002-01', '陳大華',
    'Draft', 'Urgent', '緊急調度', 3000, ''
);

-- HUN -> TPE (花蓮 -> 台北)
INSERT INTO stock_transfers (
    id, st_number, document_type_id, 
    from_hotel_id, from_warehouse_id, 
    to_hotel_id, to_warehouse_id, 
    transfer_date, requester_id, requester_name, 
    status, priority, reason, total_amount, notes
) VALUES (
    gen_random_uuid(), 'ST-HUN-2025-001', 'd0000005-0001-4000-8000-000000000001',
    'hotel-005', (SELECT id FROM warehouses WHERE code = 'WH-HUN-01'),
    'hotel-001', (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'),
    '2025-12-20', 'staff-001-01', '王小明',
    'Cancelled', 'Normal', '誤開單', 0, '操作錯誤取消'
);

INSERT INTO stock_transfers (
    id, st_number, document_type_id, 
    from_hotel_id, from_warehouse_id, 
    to_hotel_id, to_warehouse_id, 
    transfer_date, requester_id, requester_name, 
    status, priority, reason, total_amount, notes
) VALUES (
    gen_random_uuid(), 'ST-HUN-2025-002', 'd0000005-0001-4000-8000-000000000001',
    'hotel-005', (SELECT id FROM warehouses WHERE code = 'WH-HUN-01'),
    'hotel-003', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'),
    '2025-12-26', 'staff-003-01', '劉家豪',
    'Draft', 'Normal', '例行調撥', 5500, ''
);

-- =============================================
-- 3. STOCK TRANSFER ITEMS (調撥品項)
-- 為每張調撥單加入一點品項
-- =============================================

-- ST-TPE-2025-001 (BED-001 x 20)
INSERT INTO stock_transfer_items (
    id, st_id, line_number, item_id, item_name, quantity, unit, unit_cost, amount, notes
) VALUES (
    gen_random_uuid(), (SELECT id FROM stock_transfers WHERE st_number = 'ST-TPE-2025-001'),
    1, (SELECT id FROM inventory_items WHERE code = 'BED-001'), '單人床包組', 20, '組', 450, 9000, ''
);

-- ST-NTP-2025-001 (TWL-001 x 50)
INSERT INTO stock_transfer_items (
    id, st_id, line_number, item_id, item_name, quantity, unit, unit_cost, amount, notes
) VALUES (
    gen_random_uuid(), (SELECT id FROM stock_transfers WHERE st_number = 'ST-NTP-2025-001'),
    1, (SELECT id FROM inventory_items WHERE code = 'TWL-001'), '大浴巾', 50, '條', 180, 9000, ''
);
