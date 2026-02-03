-- =============================================
-- 補足缺失的單據品項資料 (Populate Missing Document Items)
-- =============================================

-- 1. 補足 Purchase Requisition Items (請購單品項)
INSERT INTO purchase_requisition_items (id, pr_id, line_number, item_name, quantity, unit, estimated_unit_price, estimated_amount, notes)
SELECT
  gen_random_uuid(),
  pr.id,
  1,
  '測試請購品項 ' || substring(pr.pr_number from 4),
  10,
  'PCS',
  100,
  1000,
  '測試資料補足'
FROM purchase_requisitions pr
WHERE NOT EXISTS (SELECT 1 FROM purchase_requisition_items pri WHERE pri.pr_id = pr.id);

-- 2. 補足 Purchase Order Items (採購單品項)
INSERT INTO purchase_order_items (id, po_id, line_number, item_name, quantity, unit, unit_price, amount, received_quantity)
SELECT
  gen_random_uuid(),
  po.id,
  1,
  '測試採購品項 ' || substring(po.po_number from 4),
  20,
  'PCS',
  150,
  3000,
  0
FROM purchase_orders po
WHERE NOT EXISTS (SELECT 1 FROM purchase_order_items poi WHERE poi.po_id = po.id);

-- 3. 補足 Goods Receipt Items (進貨單品項)
INSERT INTO goods_receipt_items (id, gr_id, line_number, item_name, ordered_quantity, received_quantity, accepted_quantity, unit, unit_price, amount)
SELECT
  gen_random_uuid(),
  gr.id,
  1,
  '測試進貨品項 ' || substring(gr.gr_number from 4),
  50,
  50,
  50,
  'PCS',
  200,
  10000
FROM goods_receipts gr
WHERE NOT EXISTS (SELECT 1 FROM goods_receipt_items gri WHERE gri.gr_id = gr.id);

-- 4. 補足 Goods Issue Items (領用單品項)
INSERT INTO goods_issue_items (id, gi_id, line_number, item_name, quantity, unit, unit_cost, amount)
SELECT
  gen_random_uuid(),
  gi.id,
  1,
  '測試領用品項 ' || substring(gi.gi_number from 4),
  5,
  'PCS',
  100,
  500
FROM goods_issues gi
WHERE NOT EXISTS (SELECT 1 FROM goods_issue_items gii WHERE gii.gi_id = gi.id);

-- 5. 補足 Stock Transfer Items (調撥單品項)
INSERT INTO stock_transfer_items (id, st_id, line_number, item_name, quantity, unit, unit_cost, amount)
SELECT
  gen_random_uuid(),
  st.id,
  1,
  '測試調撥品項 ' || substring(st.st_number from 4),
  15,
  'PCS',
  120,
  1800
FROM stock_transfers st
WHERE NOT EXISTS (SELECT 1 FROM stock_transfer_items sti WHERE sti.st_id = st.id);
