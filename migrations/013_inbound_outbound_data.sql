-- =============================================
-- 補足進出貨測試資料 (每間飯店補 4 筆，總計 5 筆)
-- =============================================

-- TPE (台北星光大飯店) - Goods Receipts
INSERT INTO goods_receipts (id, gr_number, hotel_id, document_type_id, po_id, warehouse_id, supplier_id, supplier_name, receipt_date, receiver_id, receiver_name, status, total_amount, invoice_number, notes) VALUES
(gen_random_uuid(), 'GR-TPE-2025-002', 'hotel-001', 'd0000003-0001-4000-8000-000000000001', 'b1000001-0002-4000-8000-000000000002', (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'), (SELECT id FROM suppliers WHERE code = 'SUP-002'), '優質寢具行', '2025-12-24', 'staff-001-04', '陳經理', 'Completed', 8500, 'INV-2025-12-011', '緊急寢具到貨'),
(gen_random_uuid(), 'GR-TPE-2025-003', 'hotel-001', 'd0000003-0001-4000-8000-000000000001', 'b1000001-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'), (SELECT id FROM suppliers WHERE code = 'SUP-001'), '台北備品供應商', '2025-12-25', 'staff-001-04', '陳經理', 'Completed', 5000, 'INV-2025-12-012', '備品分批到貨'),
(gen_random_uuid(), 'GR-TPE-2025-004', 'hotel-001', 'd0000003-0001-4000-8000-000000000001', 'b1000001-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'), (SELECT id FROM suppliers WHERE code = 'SUP-001'), '台北備品供應商', '2025-12-26', 'staff-001-04', '陳經理', 'Completed', 3000, 'INV-2025-12-013', '備品補齊'),
(gen_random_uuid(), 'GR-TPE-2025-005', 'hotel-001', 'd0000003-0002-4000-8000-000000000002', NULL, (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'), (SELECT id FROM suppliers WHERE code = 'SUP-002'), '優質寢具行', '2025-12-27', 'staff-001-04', '陳經理', 'Completed', 1200, 'INV-2025-12-014', '換貨入庫');

-- TPE (台北星光大飯店) - Goods Issues
INSERT INTO goods_issues (id, gi_number, hotel_id, document_type_id, warehouse_id, issue_date, issuer_id, issuer_name, requester_id, requester_name, department, purpose, status, total_amount, notes) VALUES
(gen_random_uuid(), 'GI-TPE-2025-002', 'hotel-001', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'), '2025-12-24', 'staff-001-04', '陳經理', 'staff-001-02', '林美玲', '客房部', '日常消耗', 'Completed', 2000, '客房備品'),
(gen_random_uuid(), 'GI-TPE-2025-003', 'hotel-001', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'), '2025-12-25', 'staff-001-04', '陳經理', 'staff-001-03', '張志偉', '餐飲部', '活動需求', 'Completed', 1500, '餐飲部備品'),
(gen_random_uuid(), 'GI-TPE-2025-004', 'hotel-001', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'), '2025-12-26', 'staff-001-04', '陳經理', 'staff-001-01', '王小明', '房務部', '緊急補充', 'Completed', 3000, '週末庫存預備'),
(gen_random_uuid(), 'GI-TPE-2025-005', 'hotel-001', 'd0000004-0002-4000-8000-000000000002', (SELECT id FROM warehouses WHERE code = 'WH-TPE-01'), '2025-12-27', 'staff-001-04', '陳經理', NULL, NULL, '採購部', '瑕疵退回', 'Completed', 1200, '供應商換貨');


-- NTP (新北雲頂酒店) - Goods Receipts
INSERT INTO goods_receipts (id, gr_number, hotel_id, document_type_id, po_id, warehouse_id, supplier_id, supplier_name, receipt_date, receiver_id, receiver_name, status, total_amount, invoice_number, notes) VALUES
(gen_random_uuid(), 'GR-NTP-2025-002', 'hotel-002', 'd0000003-0001-4000-8000-000000000001', 'b1000002-0002-4000-8000-000000000002', (SELECT id FROM warehouses WHERE code = 'WH-NTP-01'), (SELECT id FROM suppliers WHERE code = 'SUP-004'), '盥洗用品批發', '2025-12-24', 'staff-002-04', '蔡主任', 'Completed', 9800, 'INV-2025-12-N02', '盥洗用品全數到貨'),
(gen_random_uuid(), 'GR-NTP-2025-003', 'hotel-002', 'd0000003-0001-4000-8000-000000000001', 'b1000002-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-NTP-01'), (SELECT id FROM suppliers WHERE code = 'SUP-003'), '毛巾專賣店', '2025-12-25', 'staff-002-04', '蔡主任', 'Completed', 6000, 'INV-2025-12-N03', '毛巾追加'),
(gen_random_uuid(), 'GR-NTP-2025-004', 'hotel-002', 'd0000003-0001-4000-8000-000000000001', 'b1000002-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-NTP-01'), (SELECT id FROM suppliers WHERE code = 'SUP-003'), '毛巾專賣店', '2025-12-26', 'staff-002-04', '蔡主任', 'Completed', 4000, 'INV-2025-12-N04', '浴袍到貨'),
(gen_random_uuid(), 'GR-NTP-2025-005', 'hotel-002', 'd0000003-0002-4000-8000-000000000002', NULL, (SELECT id FROM warehouses WHERE code = 'WH-NTP-01'), (SELECT id FROM suppliers WHERE code = 'SUP-004'), '盥洗用品批發', '2025-12-27', 'staff-002-04', '蔡主任', 'Completed', 500, 'INV-2025-12-N05', '樣品入庫');

-- NTP (新北雲頂酒店) - Goods Issues
INSERT INTO goods_issues (id, gi_number, hotel_id, document_type_id, warehouse_id, issue_date, issuer_id, issuer_name, requester_id, requester_name, department, purpose, status, total_amount, notes) VALUES
(gen_random_uuid(), 'GI-NTP-2025-002', 'hotel-002', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-NTP-01'), '2025-12-23', 'staff-002-04', '蔡主任', 'staff-002-02', '黃淑芬', '客房部', 'VIP客房佈置', 'Completed', 2500, 'VIP備品'),
(gen_random_uuid(), 'GI-NTP-2025-003', 'hotel-002', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-NTP-01'), '2025-12-24', 'staff-002-04', '蔡主任', 'staff-002-03', '吳建志', '行政部', '公關品', 'Completed', 1000, '公關贈禮'),
(gen_random_uuid(), 'GI-NTP-2025-004', 'hotel-002', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-NTP-01'), '2025-12-25', 'staff-002-04', '蔡主任', 'staff-002-01', '陳大華', '房務部', '例行補充', 'Completed', 3200, '備品補充'),
(gen_random_uuid(), 'GI-NTP-2025-005', 'hotel-002', 'd0000004-0002-4000-8000-000000000002', (SELECT id FROM warehouses WHERE code = 'WH-NTP-01'), '2025-12-26', 'staff-002-04', '蔡主任', NULL, NULL, '採購部', '報廢', 'Completed', 800, '過期品報廢');


-- TXG (台中璀璨酒店) - Goods Receipts
INSERT INTO goods_receipts (id, gr_number, hotel_id, document_type_id, po_id, warehouse_id, supplier_id, supplier_name, receipt_date, receiver_id, receiver_name, status, total_amount, invoice_number, notes) VALUES
(gen_random_uuid(), 'GR-TXG-2025-002', 'hotel-003', 'd0000003-0001-4000-8000-000000000001', 'b1000003-0002-4000-8000-000000000002', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'), (SELECT id FROM suppliers WHERE code = 'SUP-006'), '清潔用品店', '2025-12-23', 'staff-003-04', '許站長', 'Completed', 5600, 'INV-2025-12-T02', '清潔劑到貨'),
(gen_random_uuid(), 'GR-TXG-2025-003', 'hotel-003', 'd0000003-0001-4000-8000-000000000001', 'b1000003-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'), (SELECT id FROM suppliers WHERE code = 'SUP-005'), '寢具批發商', '2025-12-24', 'staff-003-04', '許站長', 'Completed', 10000, 'INV-2025-12-T03', '枕頭到貨'),
(gen_random_uuid(), 'GR-TXG-2025-004', 'hotel-003', 'd0000003-0001-4000-8000-000000000001', 'b1000003-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'), (SELECT id FROM suppliers WHERE code = 'SUP-005'), '寢具批發商', '2025-12-25', 'staff-003-04', '許站長', 'Completed', 8000, 'INV-2025-12-T04', '被套到貨'),
(gen_random_uuid(), 'GR-TXG-2025-005', 'hotel-003', 'd0000003-0001-4000-8000-000000000001', 'b1000003-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'), (SELECT id FROM suppliers WHERE code = 'SUP-005'), '寢具批發商', '2025-12-26', 'staff-003-04', '許站長', 'Completed', 4000, 'INV-2025-12-T05', '床單補齊');

-- TXG (台中璀璨酒店) - Goods Issues
INSERT INTO goods_issues (id, gi_number, hotel_id, document_type_id, warehouse_id, issue_date, issuer_id, issuer_name, requester_id, requester_name, department, purpose, status, total_amount, notes) VALUES
(gen_random_uuid(), 'GI-TXG-2025-002', 'hotel-003', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'), '2025-12-22', 'staff-003-04', '許站長', 'staff-003-02', '蔡雅婷', '客房部', '換季更換', 'Completed', 5000, '全館換枕套'),
(gen_random_uuid(), 'GI-TXG-2025-003', 'hotel-003', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'), '2025-12-23', 'staff-003-04', '許站長', 'staff-003-03', '許志明', '餐飲部', '清潔', 'Completed', 1200, '餐廳清潔用品'),
(gen_random_uuid(), 'GI-TXG-2025-004', 'hotel-003', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'), '2025-12-24', 'staff-003-04', '許站長', 'staff-003-01', '劉家豪', '房務部', '補充', 'Completed', 2800, '日常備品'),
(gen_random_uuid(), 'GI-TXG-2025-005', 'hotel-003', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-TXG-01'), '2025-12-25', 'staff-003-04', '許站長', 'staff-003-01', '劉家豪', '房務部', '補充', 'Completed', 1500, '備品微調');


-- KHH (高雄海灣度假村) - Goods Receipts
INSERT INTO goods_receipts (id, gr_number, hotel_id, document_type_id, po_id, warehouse_id, supplier_id, supplier_name, receipt_date, receiver_id, receiver_name, status, total_amount, invoice_number, notes) VALUES
(gen_random_uuid(), 'GR-KHH-2025-002', 'hotel-004', 'd0000003-0001-4000-8000-000000000001', 'b1000004-0002-4000-8000-000000000002', (SELECT id FROM warehouses WHERE code = 'WH-KHH-01'), (SELECT id FROM suppliers WHERE code = 'SUP-008'), '浴巾供應商', '2025-12-23', 'staff-004-04', '郭總監', 'Completed', 11200, 'INV-2025-12-K02', '浴巾到貨確認'),
(gen_random_uuid(), 'GR-KHH-2025-003', 'hotel-004', 'd0000003-0001-4000-8000-000000000001', 'b1000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-KHH-01'), (SELECT id FROM suppliers WHERE code = 'SUP-007'), '床包大盤商', '2025-12-24', 'staff-004-04', '郭總監', 'Completed', 10000, 'INV-2025-12-K03', '床包分批1'),
(gen_random_uuid(), 'GR-KHH-2025-004', 'hotel-004', 'd0000003-0001-4000-8000-000000000001', 'b1000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-KHH-01'), (SELECT id FROM suppliers WHERE code = 'SUP-007'), '床包大盤商', '2025-12-25', 'staff-004-04', '郭總監', 'Completed', 10000, 'INV-2025-12-K04', '床包分批2'),
(gen_random_uuid(), 'GR-KHH-2025-005', 'hotel-004', 'd0000003-0001-4000-8000-000000000001', 'b1000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-KHH-01'), (SELECT id FROM suppliers WHERE code = 'SUP-007'), '床包大盤商', '2025-12-26', 'staff-004-04', '郭總監', 'Completed', 8000, 'INV-2025-12-K05', '床包尾款結清');

-- KHH (高雄海灣度假村) - Goods Issues
INSERT INTO goods_issues (id, gi_number, hotel_id, document_type_id, warehouse_id, issue_date, issuer_id, issuer_name, requester_id, requester_name, department, purpose, status, total_amount, notes) VALUES
(gen_random_uuid(), 'GI-KHH-2025-002', 'hotel-004', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-KHH-01'), '2025-12-21', 'staff-004-04', '郭總監', 'staff-004-02', '洪雅琪', '客房部', '換洗', 'Completed', 4000, '浴巾換洗'),
(gen_random_uuid(), 'GI-KHH-2025-003', 'hotel-004', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-KHH-01'), '2025-12-22', 'staff-004-04', '郭總監', 'staff-004-03', '楊建民', '餐飲部', '備品', 'Completed', 1500, '餐廳備品'),
(gen_random_uuid(), 'GI-KHH-2025-004', 'hotel-004', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-KHH-01'), '2025-12-23', 'staff-004-04', '郭總監', 'staff-004-01', '郭俊宏', '房務部', '補充', 'Completed', 3000, '備品補充'),
(gen_random_uuid(), 'GI-KHH-2025-005', 'hotel-004', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-KHH-01'), '2025-12-24', 'staff-004-04', '郭總監', 'staff-004-01', '郭俊宏', '房務部', '補充', 'Completed', 2000, '備品補充2');


-- HUN (花蓮悅海酒店) - Goods Receipts
INSERT INTO goods_receipts (id, gr_number, hotel_id, document_type_id, po_id, warehouse_id, supplier_id, supplier_name, receipt_date, receiver_id, receiver_name, status, total_amount, invoice_number, notes) VALUES
(gen_random_uuid(), 'GR-HUN-2025-002', 'hotel-005', 'd0000003-0001-4000-8000-000000000001', 'b1000005-0002-4000-8000-000000000002', (SELECT id FROM warehouses WHERE code = 'WH-HUN-01'), (SELECT id FROM suppliers WHERE code = 'SUP-010'), '拖鞋工廠', '2025-12-20', 'staff-005-04', '洪店長', 'Completed', 4200, 'INV-2025-12-H02', '緊急拖鞋到貨'),
(gen_random_uuid(), 'GR-HUN-2025-003', 'hotel-005', 'd0000003-0001-4000-8000-000000000001', 'b1000005-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-HUN-01'), (SELECT id FROM suppliers WHERE code = 'SUP-009'), '備品供應中心', '2025-12-21', 'staff-005-04', '洪店長', 'Completed', 6000, 'INV-2025-12-H03', '備品第一批'),
(gen_random_uuid(), 'GR-HUN-2025-004', 'hotel-005', 'd0000003-0001-4000-8000-000000000001', 'b1000005-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-HUN-01'), (SELECT id FROM suppliers WHERE code = 'SUP-009'), '備品供應中心', '2025-12-22', 'staff-005-04', '洪店長', 'Completed', 6000, 'INV-2025-12-H04', '備品第二批'),
(gen_random_uuid(), 'GR-HUN-2025-005', 'hotel-005', 'd0000003-0001-4000-8000-000000000001', 'b1000005-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-HUN-01'), (SELECT id FROM suppliers WHERE code = 'SUP-009'), '備品供應中心', '2025-12-23', 'staff-005-04', '洪店長', 'Completed', 4500, 'INV-2025-12-H05', '備品結清');

-- HUN (花蓮悅海酒店) - Goods Issues
INSERT INTO goods_issues (id, gi_number, hotel_id, document_type_id, warehouse_id, issue_date, issuer_id, issuer_name, requester_id, requester_name, department, purpose, status, total_amount, notes) VALUES
(gen_random_uuid(), 'GI-HUN-2025-002', 'hotel-005', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-HUN-01'), '2025-12-20', 'staff-005-04', '洪店長', 'staff-005-02', '曾雅芳', '客房部', '拖鞋', 'Completed', 1500, '客房拖鞋'),
(gen_random_uuid(), 'GI-HUN-2025-003', 'hotel-005', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-HUN-01'), '2025-12-21', 'staff-005-04', '洪店長', 'staff-005-01', '謝政憲', '房務部', '備品', 'Completed', 2500, '客房備品'),
(gen_random_uuid(), 'GI-HUN-2025-004', 'hotel-005', 'd0000004-0001-4000-8000-000000000001', (SELECT id FROM warehouses WHERE code = 'WH-HUN-01'), '2025-12-22', 'staff-005-04', '洪店長', 'staff-005-03', '鄭明輝', '行政部', '用品', 'Completed', 800, '辦公室清潔'),
(gen_random_uuid(), 'GI-HUN-2025-005', 'hotel-005', 'd0000004-0002-4000-8000-000000000002', (SELECT id FROM warehouses WHERE code = 'WH-HUN-01'), '2025-12-23', 'staff-005-04', '洪店長', NULL, NULL, '採購部', '報廢', 'Completed', 1200, '破損報廢');
