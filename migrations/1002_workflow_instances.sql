-- =============================================
-- WORKFLOW INSTANCES & APPROVAL RECORDS
-- Creates workflow instances for pending PRs and Stock Transfers
-- =============================================

-- Create workflow instances for PURCHASE REQUISITIONS
INSERT INTO workflow_instances (id, workflow_id, document_id, document_type, document_number, current_step, status, initiated_by, initiated_at, assigned_to)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM workflow_definitions WHERE code = 'WF-PR-STD' LIMIT 1),
    pr.id,
    'PURCHASE_REQUISITION',
    pr.pr_number,
    1,
    'Pending',
    pr.requester_name,
    NOW(),
    -- Assign to hotel manager (HotelAdmin)
    CASE 
        WHEN pr.hotel_id = 'hotel-001' THEN 's-TPE-mgr'
        WHEN pr.hotel_id = 'hotel-002' THEN 's-TXG-mgr'
        WHEN pr.hotel_id = 'hotel-003' THEN 's-KHH-mgr'
    END
FROM purchase_requisitions pr
WHERE pr.status = 'PENDING';

-- Create workflow instances for STOCK TRANSFERS
INSERT INTO workflow_instances (id, workflow_id, document_id, document_type, document_number, current_step, status, initiated_by, initiated_at, assigned_to)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM workflow_definitions WHERE code = 'WF-ST-STD' LIMIT 1),
    st.id,
    'STOCK_TRANSFER',
    st.st_number,
    1,
    'Pending',
    st.requester_name,
    NOW(),
    -- Assign to source hotel manager
    CASE 
        WHEN st.from_hotel_id = 'hotel-001' THEN 's-TPE-mgr'
        WHEN st.from_hotel_id = 'hotel-002' THEN 's-TXG-mgr'
        WHEN st.from_hotel_id = 'hotel-003' THEN 's-KHH-mgr'
    END
FROM stock_transfers st
WHERE st.status = 'PENDING';

