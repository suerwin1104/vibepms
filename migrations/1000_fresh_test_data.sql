-- =============================================
-- Fresh Test Data: 3 Hotels x 2 Buildings x 5 Rooms
-- Reset all data and create new test scenarios
-- Generated: 2026-01-02
-- =============================================

-- Step 1: Truncate all business data tables
TRUNCATE TABLE 
    petty_cash_transactions, petty_cash_accounts, stock_transfer_items, stock_transfers,
    goods_issue_items, goods_issues, goods_receipt_items, goods_receipts,
    purchase_order_items, purchase_orders, purchase_requisition_items, purchase_requisitions,
    inventory_records, inventory_items, warehouses, suppliers,
    approval_records, workflow_instances, workflow_steps, workflow_definitions,
    document_sequences, daily_cleaning_tasks, housekeepers, consumption_items,
    billable_items, room_notes, audit_logs, invoices, transactions,
    reservations, guests, rooms, buildings, hotels, departments, staff, document_types
CASCADE;

-- DOCUMENT TYPES
INSERT INTO document_types (code, name, category, description) VALUES
    ('PR-GENERAL', '一般請購', 'PURCHASE_REQUISITION', '一般物品請購'),
    ('PR-URGENT', '緊急請購', 'PURCHASE_REQUISITION', '緊急物品請購'),
    ('PO-GENERAL', '一般採購', 'PURCHASE_ORDER', '一般物品採購'),
    ('ST-NORMAL', '一般調撥', 'STOCK_TRANSFER', '飯店間一般調撥'),
    ('ST-URGENT', '緊急調撥', 'STOCK_TRANSFER', '緊急支援調撥')
ON CONFLICT (code) DO NOTHING;

-- WORKFLOW DEFINITIONS (using gen_random_uuid)
INSERT INTO workflow_definitions (id, code, name, document_category, description) VALUES
    (gen_random_uuid(), 'WF-PR-STD', '請購單標準流程', 'PURCHASE_REQUISITION', '請購單審批流程'),
    (gen_random_uuid(), 'WF-ST-STD', '調撥單標準流程', 'STOCK_TRANSFER', '調撥單審批流程')
ON CONFLICT (code) DO NOTHING;

-- WORKFLOW STEPS
INSERT INTO workflow_steps (id, workflow_id, step_sequence, step_name, approval_type, approver_role)
SELECT gen_random_uuid(), id, 1, '飯店主管審核', 'Serial', 'HotelAdmin'
FROM workflow_definitions WHERE code = 'WF-PR-STD';

INSERT INTO workflow_steps (id, workflow_id, step_sequence, step_name, approval_type, approver_role)
SELECT gen_random_uuid(), id, 1, '調出飯店主管審核', 'Serial', 'HotelAdmin'
FROM workflow_definitions WHERE code = 'WF-ST-STD';

-- HOTELS (3間)
INSERT INTO hotels (id, name, code, address, phone) VALUES
('hotel-001', '台北旗艦店', 'TPE', '台北市信義區松仁路100號', '02-2720-1000'),
('hotel-002', '台中精品店', 'TXG', '台中市西屯區台灣大道200號', '04-2301-2000'),
('hotel-003', '高雄海景店', 'KHH', '高雄市前鎮區成功路300號', '07-3301-3000');

-- BUILDINGS (6棟)
INSERT INTO buildings (id, hotel_id, code, name) VALUES
('bld-001-a', 'hotel-001', 'TPE-A', '台北A館'),
('bld-001-b', 'hotel-001', 'TPE-B', '台北B館'),
('bld-002-a', 'hotel-002', 'TXG-A', '台中A館'),
('bld-002-b', 'hotel-002', 'TXG-B', '台中B館'),
('bld-003-a', 'hotel-003', 'KHH-A', '高雄A館'),
('bld-003-b', 'hotel-003', 'KHH-B', '高雄B館');

-- ROOMS (30間)
INSERT INTO rooms (id, hotel_id, building_id, number, type, status, floor, housekeeper, base_price, description) VALUES
('r001a01', 'hotel-001', 'bld-001-a', 'A101', 'Standard', 'VC', 1, '', 2800, '標準雙人房'),
('r001a02', 'hotel-001', 'bld-001-a', 'A102', 'Standard', 'VC', 1, '', 2800, '標準雙人房'),
('r001a03', 'hotel-001', 'bld-001-a', 'A201', 'Deluxe', 'VC', 2, '', 3500, '豪華雙人房'),
('r001a04', 'hotel-001', 'bld-001-a', 'A202', 'Deluxe', 'VC', 2, '', 3500, '豪華雙人房'),
('r001a05', 'hotel-001', 'bld-001-a', 'A301', 'Suite', 'VC', 3, '', 5200, '行政套房'),
('r001b01', 'hotel-001', 'bld-001-b', 'B101', 'Standard', 'VC', 1, '', 2800, '標準雙人房'),
('r001b02', 'hotel-001', 'bld-001-b', 'B102', 'Standard', 'VC', 1, '', 2800, '標準雙人房'),
('r001b03', 'hotel-001', 'bld-001-b', 'B201', 'Deluxe', 'VC', 2, '', 3500, '豪華雙人房'),
('r001b04', 'hotel-001', 'bld-001-b', 'B202', 'Deluxe', 'VC', 2, '', 3500, '豪華雙人房'),
('r001b05', 'hotel-001', 'bld-001-b', 'B301', 'Suite', 'VC', 3, '', 5200, '行政套房'),
('r002a01', 'hotel-002', 'bld-002-a', 'A101', 'Standard', 'VC', 1, '', 2400, '標準雙人房'),
('r002a02', 'hotel-002', 'bld-002-a', 'A102', 'Standard', 'VC', 1, '', 2400, '標準雙人房'),
('r002a03', 'hotel-002', 'bld-002-a', 'A201', 'Deluxe', 'VC', 2, '', 3000, '豪華雙人房'),
('r002a04', 'hotel-002', 'bld-002-a', 'A202', 'Deluxe', 'VC', 2, '', 3000, '豪華雙人房'),
('r002a05', 'hotel-002', 'bld-002-a', 'A301', 'Suite', 'VC', 3, '', 4500, '行政套房'),
('r002b01', 'hotel-002', 'bld-002-b', 'B101', 'Standard', 'VC', 1, '', 2400, '標準雙人房'),
('r002b02', 'hotel-002', 'bld-002-b', 'B102', 'Standard', 'VC', 1, '', 2400, '標準雙人房'),
('r002b03', 'hotel-002', 'bld-002-b', 'B201', 'Deluxe', 'VC', 2, '', 3000, '豪華雙人房'),
('r002b04', 'hotel-002', 'bld-002-b', 'B202', 'Deluxe', 'VC', 2, '', 3000, '豪華雙人房'),
('r002b05', 'hotel-002', 'bld-002-b', 'B301', 'Suite', 'VC', 3, '', 4500, '行政套房'),
('r003a01', 'hotel-003', 'bld-003-a', 'A101', 'Standard', 'VC', 1, '', 3200, '海景標準房'),
('r003a02', 'hotel-003', 'bld-003-a', 'A102', 'Standard', 'VC', 1, '', 3200, '海景標準房'),
('r003a03', 'hotel-003', 'bld-003-a', 'A201', 'Deluxe', 'VC', 2, '', 4200, '海景豪華房'),
('r003a04', 'hotel-003', 'bld-003-a', 'A202', 'Deluxe', 'VC', 2, '', 4200, '海景豪華房'),
('r003a05', 'hotel-003', 'bld-003-a', 'A301', 'Suite', 'VC', 3, '', 6500, '海景套房'),
('r003b01', 'hotel-003', 'bld-003-b', 'B101', 'Standard', 'VC', 1, '', 3200, '海景標準房'),
('r003b02', 'hotel-003', 'bld-003-b', 'B102', 'Standard', 'VC', 1, '', 3200, '海景標準房'),
('r003b03', 'hotel-003', 'bld-003-b', 'B201', 'Deluxe', 'VC', 2, '', 4200, '海景豪華房'),
('r003b04', 'hotel-003', 'bld-003-b', 'B202', 'Deluxe', 'VC', 2, '', 4200, '海景豪華房'),
('r003b05', 'hotel-003', 'bld-003-b', 'B301', 'Suite', 'VC', 3, '', 6500, '海景套房');

-- STAFF
INSERT INTO staff (id, hotel_id, employee_id, name, role, title, authorized_hotels) VALUES
('s-group-admin', NULL, 'GA001', '林總裁', 'GroupAdmin', '集團總管理', ARRAY['hotel-001','hotel-002','hotel-003']),
('s-TPE-mgr', 'hotel-001', 'TPE-MGR', '陳經理', 'HotelAdmin', '台北店長', ARRAY['hotel-001']),
('s-TPE-fd1', 'hotel-001', 'TPE-FD1', '王小明', 'FrontDesk', '櫃檯人員', ARRAY['hotel-001']),
('s-TPE-fd2', 'hotel-001', 'TPE-FD2', '李美玲', 'FrontDesk', '櫃檯人員', ARRAY['hotel-001']),
('s-TXG-mgr', 'hotel-002', 'TXG-MGR', '許站長', 'HotelAdmin', '台中店長', ARRAY['hotel-002']),
('s-TXG-fd1', 'hotel-002', 'TXG-FD1', '林怡君', 'FrontDesk', '櫃檯人員', ARRAY['hotel-002']),
('s-TXG-fd2', 'hotel-002', 'TXG-FD2', '周俊傑', 'FrontDesk', '櫃檯人員', ARRAY['hotel-002']),
('s-KHH-mgr', 'hotel-003', 'KHH-MGR', '郭總監', 'HotelAdmin', '高雄店長', ARRAY['hotel-003']),
('s-KHH-fd1', 'hotel-003', 'KHH-FD1', '陳柏翰', 'FrontDesk', '櫃檯人員', ARRAY['hotel-003']),
('s-KHH-fd2', 'hotel-003', 'KHH-FD2', '謝雨珊', 'FrontDesk', '櫃檯人員', ARRAY['hotel-003']);

-- HOUSEKEEPERS
INSERT INTO housekeepers (id, hotel_id, employee_id, name, phone, status, assigned_floor, cleaned_today) VALUES
('hk-TPE-01', 'hotel-001', 'TPE-HK1', '阿桃', '0922-111-001', 'Active', 'A館', 0),
('hk-TPE-02', 'hotel-001', 'TPE-HK2', '阿英', '0922-111-002', 'Active', 'B館', 0),
('hk-TXG-01', 'hotel-002', 'TXG-HK1', '翠花', '0922-222-001', 'Active', 'A館', 0),
('hk-TXG-02', 'hotel-002', 'TXG-HK2', '玉蘭', '0922-222-002', 'Active', 'B館', 0),
('hk-KHH-01', 'hotel-003', 'KHH-HK1', '月娥', '0922-333-001', 'Active', 'A館', 0),
('hk-KHH-02', 'hotel-003', 'KHH-HK2', '彩雲', '0922-333-002', 'Active', 'B館', 0);

-- GUESTS
INSERT INTO guests (id, name, id_number, phone, vip_level, is_blacklisted, preferences) VALUES
('g-TPE-01', '張大明', 'A123456789', '0912-001-001', 'Gold', false, '喜歡高樓層'),
('g-TPE-02', '林小華', 'B234567890', '0912-001-002', 'Silver', false, ''),
('g-TPE-03', '王建國', 'C345678901', '0912-001-003', 'Regular', false, ''),
('g-TPE-04', '陳美玲', 'D456789012', '0912-001-004', 'Gold', false, ''),
('g-TPE-05', '李志明', 'E567890123', '0912-001-005', 'Platinum', false, ''),
('g-TXG-01', '吳淑芬', 'F678901234', '0912-002-001', 'Gold', false, ''),
('g-TXG-02', '黃俊傑', 'G789012345', '0912-002-002', 'Regular', false, ''),
('g-TXG-03', '劉雅琪', 'H890123456', '0912-002-003', 'Silver', false, ''),
('g-TXG-04', '蔡宗翰', 'I901234567', '0912-002-004', 'Regular', false, ''),
('g-TXG-05', '許雅婷', 'J012345678', '0912-002-005', 'Gold', false, ''),
('g-KHH-01', '鄭明德', 'K123456780', '0912-003-001', 'Platinum', false, ''),
('g-KHH-02', '謝佳蓉', 'L234567891', '0912-003-002', 'Silver', false, ''),
('g-KHH-03', '周志豪', 'M345678902', '0912-003-003', 'Gold', false, ''),
('g-KHH-04', '楊雅惠', 'N456789013', '0912-003-004', 'Regular', false, ''),
('g-KHH-05', '曾俊宏', 'O567890124', '0912-003-005', 'Gold', false, '');

-- RESERVATIONS (15筆, 2026/1/2 - 2026/4/15)
INSERT INTO reservations (id, hotel_id, building_id, guest_id, guest_name, phone, id_number, room_number, room_type, check_in, check_out, status, total_price, paid_amount, source) VALUES
('rsv-TPE-001', 'hotel-001', 'bld-001-a', 'g-TPE-01', '張大明', '0912-001-001', 'A123456789', 'A101', 'Standard', '2026-01-02 15:00', '2026-01-05 11:00', 'Confirmed', 8400, 0, '官網'),
('rsv-TPE-002', 'hotel-001', 'bld-001-a', 'g-TPE-02', '林小華', '0912-001-002', 'B234567890', 'A201', 'Deluxe', '2026-01-10 15:00', '2026-01-13 11:00', 'Confirmed', 10500, 0, 'Booking'),
('rsv-TPE-003', 'hotel-001', 'bld-001-b', 'g-TPE-03', '王建國', '0912-001-003', 'C345678901', 'B101', 'Standard', '2026-02-01 15:00', '2026-02-03 11:00', 'Confirmed', 5600, 0, '電話'),
('rsv-TPE-004', 'hotel-001', 'bld-001-b', 'g-TPE-04', '陳美玲', '0912-001-004', 'D456789012', 'B201', 'Deluxe', '2026-03-01 15:00', '2026-03-05 11:00', 'Confirmed', 14000, 0, 'Agoda'),
('rsv-TPE-005', 'hotel-001', 'bld-001-a', 'g-TPE-05', '李志明', '0912-001-005', 'E567890123', 'A301', 'Suite', '2026-04-10 15:00', '2026-04-15 11:00', 'Confirmed', 26000, 0, '官網'),
('rsv-TXG-001', 'hotel-002', 'bld-002-a', 'g-TXG-01', '吳淑芬', '0912-002-001', 'F678901234', 'A101', 'Standard', '2026-01-05 15:00', '2026-01-08 11:00', 'Confirmed', 7200, 0, '官網'),
('rsv-TXG-002', 'hotel-002', 'bld-002-a', 'g-TXG-02', '黃俊傑', '0912-002-002', 'G789012345', 'A201', 'Deluxe', '2026-01-15 15:00', '2026-01-18 11:00', 'Confirmed', 9000, 0, 'Booking'),
('rsv-TXG-003', 'hotel-002', 'bld-002-b', 'g-TXG-03', '劉雅琪', '0912-002-003', 'H890123456', 'B101', 'Standard', '2026-02-10 15:00', '2026-02-12 11:00', 'Confirmed', 4800, 0, '電話'),
('rsv-TXG-004', 'hotel-002', 'bld-002-b', 'g-TXG-04', '蔡宗翰', '0912-002-004', 'I901234567', 'B201', 'Deluxe', '2026-03-05 15:00', '2026-03-08 11:00', 'Confirmed', 9000, 0, 'Agoda'),
('rsv-TXG-005', 'hotel-002', 'bld-002-a', 'g-TXG-05', '許雅婷', '0912-002-005', 'J012345678', 'A301', 'Suite', '2026-04-01 15:00', '2026-04-05 11:00', 'Confirmed', 18000, 0, '官網'),
('rsv-KHH-001', 'hotel-003', 'bld-003-a', 'g-KHH-01', '鄭明德', '0912-003-001', 'K123456780', 'A101', 'Standard', '2026-01-08 15:00', '2026-01-11 11:00', 'Confirmed', 9600, 0, '官網'),
('rsv-KHH-002', 'hotel-003', 'bld-003-a', 'g-KHH-02', '謝佳蓉', '0912-003-002', 'L234567891', 'A201', 'Deluxe', '2026-01-20 15:00', '2026-01-23 11:00', 'Confirmed', 12600, 0, 'Booking'),
('rsv-KHH-003', 'hotel-003', 'bld-003-b', 'g-KHH-03', '周志豪', '0912-003-003', 'M345678902', 'B101', 'Standard', '2026-02-15 15:00', '2026-02-18 11:00', 'Confirmed', 9600, 0, '電話'),
('rsv-KHH-004', 'hotel-003', 'bld-003-b', 'g-KHH-04', '楊雅惠', '0912-003-004', 'N456789013', 'B201', 'Deluxe', '2026-03-10 15:00', '2026-03-14 11:00', 'Confirmed', 16800, 0, 'Agoda'),
('rsv-KHH-005', 'hotel-003', 'bld-003-a', 'g-KHH-05', '曾俊宏', '0912-003-005', 'O567890124', 'A301', 'Suite', '2026-04-08 15:00', '2026-04-12 11:00', 'Confirmed', 26000, 0, '官網');

-- CONSUMPTION ITEMS
INSERT INTO consumption_items (name, price, category, accounting_code, is_active) VALUES
('礦泉水', 50, 'Mini-Bar', 'MB001', true),
('可樂', 60, 'Mini-Bar', 'MB002', true),
('啤酒', 120, 'Mini-Bar', 'MB003', true),
('客房早餐', 350, 'Room Service', 'RS001', true),
('洗衣服務', 300, 'Laundry', 'LD001', true),
('停車費', 200, 'Parking', 'PK001', true),
('加床費', 500, 'Room Charge', 'RC001', true),
('延遲退房', 500, 'Room Charge', 'RC003', true);

-- SUPPLIERS
INSERT INTO suppliers (id, code, name, contact_person, phone, email, address, tax_id, payment_terms, is_active) VALUES
(gen_random_uuid(), 'SUP-001', '優質床品批發', '陳經理', '02-2711-0001', 'bed@supplier.com', '台北市中山區', '12345678', 'Net 30', true),
(gen_random_uuid(), 'SUP-002', '全台清潔用品', '王主任', '02-2711-0002', 'clean@supplier.com', '台北市大同區', '23456789', 'Net 15', true),
(gen_random_uuid(), 'SUP-003', '舒適毛巾工廠', '林小姐', '04-2301-0001', 'towel@supplier.com', '台中市西屯區', '34567890', 'Net 30', true);

-- WAREHOUSES (use gen_random_uuid)
INSERT INTO warehouses (id, hotel_id, code, name, location, manager_id, manager_name, is_active) VALUES
(gen_random_uuid(), 'hotel-001', 'WH-TPE', '台北主倉庫', 'B1-001', 's-TPE-mgr', '陳經理', true),
(gen_random_uuid(), 'hotel-002', 'WH-TXG', '台中主倉庫', 'B1-001', 's-TXG-mgr', '許站長', true),
(gen_random_uuid(), 'hotel-003', 'WH-KHH', '高雄主倉庫', 'B1-001', 's-KHH-mgr', '郭總監', true);

-- INVENTORY ITEMS (use gen_random_uuid)
INSERT INTO inventory_items (id, code, name, category, unit, specification, safety_stock, reorder_point, default_unit_price, accounting_code, is_active) VALUES
(gen_random_uuid(), 'BED-001', '單人床包組', '寢具', '組', '100%純棉/白色/單人', 50, 30, 450.00, '6101', true),
(gen_random_uuid(), 'BED-002', '雙人床包組', '寢具', '組', '100%純棉/白色/雙人', 80, 50, 650.00, '6101', true),
(gen_random_uuid(), 'BED-003', '枕頭套', '寢具', '個', '100%純棉/白色', 100, 60, 80.00, '6101', true),
(gen_random_uuid(), 'TWL-001', '大浴巾', '毛巾', '條', '100%純棉/白色', 150, 100, 180.00, '6102', true),
(gen_random_uuid(), 'TWL-002', '小方巾', '毛巾', '條', '100%純棉/白色', 200, 150, 35.00, '6102', true),
(gen_random_uuid(), 'AMN-001', '洗髮精', '盥洗', '瓶', '30ml/單次包裝', 500, 300, 8.00, '6103', true),
(gen_random_uuid(), 'AMN-002', '沐浴乳', '盥洗', '瓶', '30ml/單次包裝', 500, 300, 8.00, '6103', true),
(gen_random_uuid(), 'AMN-003', '牙刷組', '盥洗', '組', '含牙膏', 400, 250, 12.00, '6103', true),
(gen_random_uuid(), 'CLN-001', '衛生紙', '清潔', '包', '12捲/包', 100, 60, 95.00, '6104', true),
(gen_random_uuid(), 'ROM-002', '拖鞋', '客房', '雙', '一次性/白色', 300, 200, 18.00, '6105', true);

-- INVENTORY RECORDS
INSERT INTO inventory_records (id, warehouse_id, item_id, quantity, reserved_quantity, last_receipt_date, last_issue_date)
SELECT gen_random_uuid(), w.id, i.id, 100, 0, '2025-12-20', '2025-12-23'
FROM warehouses w CROSS JOIN inventory_items i;

-- PURCHASE REQUISITIONS (6筆)
INSERT INTO purchase_requisitions (id, pr_number, hotel_id, document_type_id, requester_id, requester_name, department, request_date, required_date, status, priority, total_amount, notes)
SELECT gen_random_uuid(), 'PR-TPE-2026-001', 'hotel-001', id, 's-TPE-fd1', '王小明', '房務部', '2026-01-02', '2026-01-10', 'PENDING', 'Normal', 15000, '月度備品補充'
FROM document_types WHERE code = 'PR-GENERAL';

INSERT INTO purchase_requisitions (id, pr_number, hotel_id, document_type_id, requester_id, requester_name, department, request_date, required_date, status, priority, total_amount, notes)
SELECT gen_random_uuid(), 'PR-TPE-2026-002', 'hotel-001', id, 's-TPE-fd2', '李美玲', '客房部', '2026-01-02', '2026-01-05', 'PENDING', 'Urgent', 8500, '急需床包'
FROM document_types WHERE code = 'PR-URGENT';

INSERT INTO purchase_requisitions (id, pr_number, hotel_id, document_type_id, requester_id, requester_name, department, request_date, required_date, status, priority, total_amount, notes)
SELECT gen_random_uuid(), 'PR-TXG-2026-001', 'hotel-002', id, 's-TXG-fd1', '林怡君', '房務部', '2026-01-02', '2026-01-12', 'PENDING', 'Normal', 18000, '毛巾類補充'
FROM document_types WHERE code = 'PR-GENERAL';

INSERT INTO purchase_requisitions (id, pr_number, hotel_id, document_type_id, requester_id, requester_name, department, request_date, required_date, status, priority, total_amount, notes)
SELECT gen_random_uuid(), 'PR-TXG-2026-002', 'hotel-002', id, 's-TXG-fd2', '周俊傑', '客房部', '2026-01-02', '2026-01-08', 'PENDING', 'Normal', 9800, '盥洗用品'
FROM document_types WHERE code = 'PR-GENERAL';

INSERT INTO purchase_requisitions (id, pr_number, hotel_id, document_type_id, requester_id, requester_name, department, request_date, required_date, status, priority, total_amount, notes)
SELECT gen_random_uuid(), 'PR-KHH-2026-001', 'hotel-003', id, 's-KHH-fd1', '陳柏翰', '房務部', '2026-01-02', '2026-01-15', 'PENDING', 'High', 28000, '大量床包採購'
FROM document_types WHERE code = 'PR-GENERAL';

INSERT INTO purchase_requisitions (id, pr_number, hotel_id, document_type_id, requester_id, requester_name, department, request_date, required_date, status, priority, total_amount, notes)
SELECT gen_random_uuid(), 'PR-KHH-2026-002', 'hotel-003', id, 's-KHH-fd2', '謝雨珊', '客房部', '2026-01-02', '2026-01-04', 'PENDING', 'Urgent', 11200, '浴巾緊急補充'
FROM document_types WHERE code = 'PR-URGENT';

-- Note: Stock transfers not created due to schema differences. Create manually via UI if needed.

-- Summary: 3 Hotels, 6 Buildings, 30 Rooms, 10 Staff, 6 Housekeepers, 15 Guests, 15 Reservations, 6 PRs
