-- =============================================
-- CLEANUP ORPHANED WORKFLOW INSTANCES
-- Removes workflow instances whose document_id doesn't exist in the source table
-- =============================================

-- Delete PR workflow instances where the document no longer exists
DELETE FROM workflow_instances 
WHERE document_type = 'PURCHASE_REQUISITION' 
AND document_id NOT IN (SELECT id FROM purchase_requisitions);

-- Delete ST workflow instances where the document no longer exists  
DELETE FROM workflow_instances
WHERE document_type = 'STOCK_TRANSFER'
AND document_id NOT IN (SELECT id FROM stock_transfers);

-- Verify remaining instances
-- SELECT * FROM workflow_instances ORDER BY initiated_at DESC;
