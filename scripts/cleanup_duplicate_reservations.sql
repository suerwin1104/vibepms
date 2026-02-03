-- =============================================
-- 清理重複訂單腳本
-- 執行日期: 2026-01-15
-- 說明: 刪除資料庫中的重複預約訂單
-- =============================================
-- 1. 先查看重複的訂單 (同一天入住、同一房號、同一賓客)
SELECT r1.id,
    r1.guest_name,
    r1.room_number,
    r1.check_in,
    r1.status,
    r1.created_at
FROM reservations r1
WHERE EXISTS (
        SELECT 1
        FROM reservations r2
        WHERE r2.guest_name = r1.guest_name
            AND r2.room_number = r1.room_number
            AND r2.check_in = r1.check_in
            AND r2.id != r1.id
    )
ORDER BY room_number,
    check_in,
    created_at;
-- 2. 刪除較新建立的重複訂單 (保留最早建立的那筆)
-- 先標記要刪除的 ID
WITH duplicates AS (
    SELECT id,
        ROW_NUMBER() OVER (
            PARTITION BY guest_name,
            room_number,
            check_in
            ORDER BY created_at ASC
        ) as rn
    FROM reservations
    WHERE status = 'Confirmed'
)
DELETE FROM reservations
WHERE id IN (
        SELECT id
        FROM duplicates
        WHERE rn > 1
    );
-- 或者，如果你知道具體要刪除的 ID，可以直接執行：
-- DELETE FROM reservations WHERE id = 'RSV-1768465795445';
-- DELETE FROM reservations WHERE id = 'RSV-1768465782981';