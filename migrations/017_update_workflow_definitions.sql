-- =============================================
-- 更新流程定義與步驟 (Update Workflow Definitions & Steps)
-- =============================================

-- 清除舊的步驟設定 (為了重新建立正確的流程)
DELETE FROM workflow_steps;
DELETE FROM workflow_definitions;

-- 1. 重新插入流程定義
INSERT INTO workflow_definitions (id, code, name, document_category, description) VALUES
(gen_random_uuid(), 'WF-PR-STD', '請購單標準流程', 'PURCHASE_REQUISITION', '申請 -> 直屬主管審核 -> 採購部確認'),
(gen_random_uuid(), 'WF-PO-STD', '採購單標準流程', 'PURCHASE_ORDER', '採購單 -> 飯店經理審核 -> 財務/總部核准'),
(gen_random_uuid(), 'WF-GR-STD', '進貨驗收流程', 'GOODS_RECEIPT', '驗收單 -> 品管/倉管確認 -> 入庫核准'),
(gen_random_uuid(), 'WF-GI-STD', '領用出庫流程', 'GOODS_ISSUE', '領用申請 -> 主管核准 -> 倉管發貨'),
(gen_random_uuid(), 'WF-ST-STD', '調撥單流程', 'STOCK_TRANSFER', '調撥申請 -> 調出方核准 -> 調入方確認 -> 總部備查');

-- 2. 設定流程步驟

-- [PR] 請購單: 申請(Draft) -> 1.直屬主管(HotelAdmin) -> 2.採購部(GroupAdmin) -> 完成(可以轉PO)
INSERT INTO workflow_steps (workflow_id, step_sequence, step_name, approval_type, approver_role)
SELECT id, 1, '直屬主管審核', 'Serial', 'HotelAdmin'
FROM workflow_definitions WHERE code = 'WF-PR-STD';

INSERT INTO workflow_steps (workflow_id, step_sequence, step_name, approval_type, approver_role)
SELECT id, 2, '採購部確認', 'Serial', 'GroupAdmin'
FROM workflow_definitions WHERE code = 'WF-PR-STD';

-- [PO] 採購單: 1.飯店經理(HotelAdmin) -> 2.財務/總部(GroupAdmin)
INSERT INTO workflow_steps (workflow_id, step_sequence, step_name, approval_type, approver_role)
SELECT id, 1, '飯店經理審核', 'Serial', 'HotelAdmin'
FROM workflow_definitions WHERE code = 'WF-PO-STD';

INSERT INTO workflow_steps (workflow_id, step_sequence, step_name, approval_type, approver_role)
SELECT id, 2, '財務部已核准', 'Serial', 'GroupAdmin'
FROM workflow_definitions WHERE code = 'WF-PO-STD';

-- [GR] 進貨單: 1.倉管/品管(HotelAdmin - 暫代)
INSERT INTO workflow_steps (workflow_id, step_sequence, step_name, approval_type, approver_role)
SELECT id, 1, '品管驗收確認', 'Serial', 'HotelAdmin'
FROM workflow_definitions WHERE code = 'WF-GR-STD';

-- [GI] 領用單: 1.部門主管(HotelAdmin)
INSERT INTO workflow_steps (workflow_id, step_sequence, step_name, approval_type, approver_role)
SELECT id, 1, '部門主管核准', 'Serial', 'HotelAdmin'
FROM workflow_definitions WHERE code = 'WF-GI-STD';

-- [ST] 調撥單: 1.調出方主管(HotelAdmin) -> 2.總部(GroupAdmin)
INSERT INTO workflow_steps (workflow_id, step_sequence, step_name, approval_type, approver_role)
SELECT id, 1, '調出單位主管核准', 'Serial', 'HotelAdmin'
FROM workflow_definitions WHERE code = 'WF-ST-STD';

INSERT INTO workflow_steps (workflow_id, step_sequence, step_name, approval_type, approver_role)
SELECT id, 2, '集團總部備查', 'Serial', 'GroupAdmin'
FROM workflow_definitions WHERE code = 'WF-ST-STD';

-- =============================================
-- 確保現有的 'Pending' 單據有對應的 Workflow Instance
-- =============================================
-- 這裡只是 SQL 定義，實際 Instance 建立通常由程式控制。
-- 若要補救之前手動插入的 Pending 單據，需要額外 script，但為了由 App 邏輯控制，我們假設新單據與操作才會觸發完整流程。
