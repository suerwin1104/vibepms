-- =============================================
-- STOCK TRANSFERS (6筆調撥單)
-- 使用正確的 schema 欄位
-- =============================================

-- 台北 -> 台中 調撥
INSERT INTO stock_transfers (id, st_number, document_type_id, from_hotel_id, to_hotel_id, from_warehouse_id, to_warehouse_id, transfer_date, requester_id, requester_name, status, priority, reason, total_amount, notes)
SELECT gen_random_uuid(), 'ST-2026-001', 
    (SELECT id FROM document_types WHERE code = 'ST-NORMAL'),
    'hotel-001', 'hotel-002',
    (SELECT id FROM warehouses WHERE code = 'WH-TPE'),
    (SELECT id FROM warehouses WHERE code = 'WH-TXG'),
    '2026-01-02', 's-TXG-fd1', '林怡君', 'PENDING', 'Normal', '支援台中毛巾需求', 4500, '台北調撥至台中';

-- 台北 -> 高雄 調撥 (緊急)
INSERT INTO stock_transfers (id, st_number, document_type_id, from_hotel_id, to_hotel_id, from_warehouse_id, to_warehouse_id, transfer_date, requester_id, requester_name, status, priority, reason, total_amount, notes)
SELECT gen_random_uuid(), 'ST-2026-002', 
    (SELECT id FROM document_types WHERE code = 'ST-URGENT'),
    'hotel-001', 'hotel-003',
    (SELECT id FROM warehouses WHERE code = 'WH-TPE'),
    (SELECT id FROM warehouses WHERE code = 'WH-KHH'),
    '2026-01-02', 's-KHH-fd1', '陳柏翰', 'PENDING', 'Urgent', '緊急支援床包', 3000, '緊急調撥';

-- 台中 -> 台北 調撥
INSERT INTO stock_transfers (id, st_number, document_type_id, from_hotel_id, to_hotel_id, from_warehouse_id, to_warehouse_id, transfer_date, requester_id, requester_name, status, priority, reason, total_amount, notes)
SELECT gen_random_uuid(), 'ST-2026-003', 
    (SELECT id FROM document_types WHERE code = 'ST-NORMAL'),
    'hotel-002', 'hotel-001',
    (SELECT id FROM warehouses WHERE code = 'WH-TXG'),
    (SELECT id FROM warehouses WHERE code = 'WH-TPE'),
    '2026-01-02', 's-TPE-fd1', '王小明', 'PENDING', 'Normal', '備品調撥', 2400, '台中調撥至台北';

-- 台中 -> 高雄 調撥
INSERT INTO stock_transfers (id, st_number, document_type_id, from_hotel_id, to_hotel_id, from_warehouse_id, to_warehouse_id, transfer_date, requester_id, requester_name, status, priority, reason, total_amount, notes)
SELECT gen_random_uuid(), 'ST-2026-004', 
    (SELECT id FROM document_types WHERE code = 'ST-NORMAL'),
    'hotel-002', 'hotel-003',
    (SELECT id FROM warehouses WHERE code = 'WH-TXG'),
    (SELECT id FROM warehouses WHERE code = 'WH-KHH'),
    '2026-01-02', 's-KHH-fd2', '謝雨珊', 'PENDING', 'Normal', '盥洗用品調撥', 1600, '台中調撥至高雄';

-- 高雄 -> 台北 調撥
INSERT INTO stock_transfers (id, st_number, document_type_id, from_hotel_id, to_hotel_id, from_warehouse_id, to_warehouse_id, transfer_date, requester_id, requester_name, status, priority, reason, total_amount, notes)
SELECT gen_random_uuid(), 'ST-2026-005', 
    (SELECT id FROM document_types WHERE code = 'ST-NORMAL'),
    'hotel-003', 'hotel-001',
    (SELECT id FROM warehouses WHERE code = 'WH-KHH'),
    (SELECT id FROM warehouses WHERE code = 'WH-TPE'),
    '2026-01-02', 's-TPE-fd2', '李美玲', 'PENDING', 'Normal', '清潔用品調撥', 1800, '高雄調撥至台北';

-- 高雄 -> 台中 調撥 (緊急)
INSERT INTO stock_transfers (id, st_number, document_type_id, from_hotel_id, to_hotel_id, from_warehouse_id, to_warehouse_id, transfer_date, requester_id, requester_name, status, priority, reason, total_amount, notes)
SELECT gen_random_uuid(), 'ST-2026-006', 
    (SELECT id FROM document_types WHERE code = 'ST-URGENT'),
    'hotel-003', 'hotel-002',
    (SELECT id FROM warehouses WHERE code = 'WH-KHH'),
    (SELECT id FROM warehouses WHERE code = 'WH-TXG'),
    '2026-01-02', 's-TXG-fd2', '周俊傑', 'PENDING', 'Urgent', '緊急支援拖鞋', 3600, '高雄調撥至台中';
