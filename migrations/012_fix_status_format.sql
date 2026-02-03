-- =============================================
-- 修正狀態值格式
-- 將大寫狀態值轉換為 PascalCase
-- =============================================

-- 修正請購單狀態
UPDATE purchase_requisitions SET status = 'Approved' WHERE status = 'APPROVED';
UPDATE purchase_requisitions SET status = 'Pending' WHERE status = 'PENDING';
UPDATE purchase_requisitions SET status = 'Draft' WHERE status = 'DRAFT';
UPDATE purchase_requisitions SET status = 'Rejected' WHERE status = 'REJECTED';
UPDATE purchase_requisitions SET status = 'Converted' WHERE status = 'CONVERTED';

-- 修正採購單狀態
UPDATE purchase_orders SET status = 'Received' WHERE status = 'RECEIVED';
UPDATE purchase_orders SET status = 'Shipped' WHERE status = 'SHIPPED';
UPDATE purchase_orders SET status = 'Approved' WHERE status = 'APPROVED';
UPDATE purchase_orders SET status = 'Pending' WHERE status = 'PENDING';
UPDATE purchase_orders SET status = 'Draft' WHERE status = 'DRAFT';
UPDATE purchase_orders SET status = 'Ordered' WHERE status = 'ORDERED';

-- 修正入庫單狀態
UPDATE goods_receipts SET status = 'Completed' WHERE status = 'COMPLETED';
UPDATE goods_receipts SET status = 'Received' WHERE status = 'RECEIVED';
UPDATE goods_receipts SET status = 'Pending' WHERE status = 'PENDING';

-- 修正出庫單狀態
UPDATE goods_issues SET status = 'Completed' WHERE status = 'COMPLETED';
UPDATE goods_issues SET status = 'Draft' WHERE status = 'DRAFT';
UPDATE goods_issues SET status = 'Pending' WHERE status = 'PENDING';

-- 完成
SELECT 'Status values have been fixed!' as result;
