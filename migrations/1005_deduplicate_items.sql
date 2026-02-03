-- De-duplicate purchase_requisition_items
-- Keeps only the record with the smallest UUID for each unique combination of pr_id, item_name, and quantity
DELETE FROM purchase_requisition_items a USING purchase_requisition_items b
WHERE a.id > b.id
AND a.pr_id = b.pr_id
AND a.item_name = b.item_name
AND a.quantity = b.quantity;

-- De-duplicate stock_transfer_items
DELETE FROM stock_transfer_items a USING stock_transfer_items b
WHERE a.id > b.id
AND a.st_id = b.st_id
AND a.item_name = b.item_name
AND a.quantity = b.quantity;
