-- =============================================
-- Add Purchase Requisition Items
-- Link items to existing purchase requisitions
-- =============================================

-- PR-TPE-2026-001 Items (月度備品補充, 總計 $15,000)
INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 1, '大浴巾', 30, '條', 180, 5400, '月度備品'
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TPE-2026-001';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 2, '小方巾', 50, '條', 35, 1750, '月度備品'
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TPE-2026-001';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 3, '洗髮精', 200, '瓶', 8, 1600, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TPE-2026-001';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 4, '沐浴乳', 200, '瓶', 8, 1600, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TPE-2026-001';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 5, '牙刷組', 150, '組', 12, 1800, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TPE-2026-001';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 6, '衛生紙', 30, '包', 95, 2850, '12捲/包'
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TPE-2026-001';

-- PR-TPE-2026-002 Items (急需床包, 總計 $8,500)
INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 1, '雙人床包組', 10, '組', 650, 6500, '緊急補充'
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TPE-2026-002';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 2, '枕頭套', 25, '個', 80, 2000, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TPE-2026-002';

-- PR-TXG-2026-001 Items (毛巾類補充, 總計 $18,000)
INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 1, '大浴巾', 60, '條', 180, 10800, '大量補充'
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TXG-2026-001';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 2, '小方巾', 100, '條', 35, 3500, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TXG-2026-001';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 3, '拖鞋', 200, '雙', 18, 3600, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TXG-2026-001';

-- PR-TXG-2026-002 Items (盥洗用品, 總計 $9,800)
INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 1, '洗髮精', 400, '瓶', 8, 3200, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TXG-2026-002';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 2, '沐浴乳', 400, '瓶', 8, 3200, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TXG-2026-002';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 3, '牙刷組', 280, '組', 12, 3360, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-TXG-2026-002';

-- PR-KHH-2026-001 Items (大量床包採購, 總計 $28,000)
INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 1, '單人床包組', 25, '組', 450, 11250, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-KHH-2026-001';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 2, '雙人床包組', 20, '組', 650, 13000, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-KHH-2026-001';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 3, '枕頭套', 45, '個', 80, 3600, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-KHH-2026-001';

-- PR-KHH-2026-002 Items (浴巾緊急補充, 總計 $11,200)
INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 1, '大浴巾', 50, '條', 180, 9000, '緊急補充'
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-KHH-2026-002';

INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT gen_random_uuid(), pr.id, 2, '小方巾', 60, '條', 35, 2100, ''
FROM purchase_requisitions pr WHERE pr.pr_number = 'PR-KHH-2026-002';

-- Summary: 18 purchase requisition items across 6 PRs
