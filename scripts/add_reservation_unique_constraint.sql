-- =============================================
-- 預約訂單唯一性約束腳本
-- 執行日期: 2026-01-15
-- 說明: 防止同一房間、同一入住日期有多筆 Confirmed 狀態的訂單
-- =============================================
-- 1. 先清理現有的重複資料 (保留最早建立的那筆)
WITH duplicates AS (
    SELECT id,
        ROW_NUMBER() OVER (
            PARTITION BY room_number,
            check_in,
            hotel_id
            ORDER BY updated_at ASC
        ) as rn
    FROM reservations
    WHERE status IN ('Confirmed', 'CheckedIn')
)
UPDATE reservations
SET status = 'Cancelled'
WHERE id IN (
        SELECT id
        FROM duplicates
        WHERE rn > 1
    );
-- 2. 建立更嚴格的部分唯一索引 (基於日期，忽略時間)
-- 先刪除舊的索引 (如果存在)
DROP INDEX IF EXISTS idx_unique_active_reservation;
-- 建立新索引：同一飯店、同一房間、同一「入住日期」只能有一筆 Confirmed 或 CheckedIn 訂單
-- 使用 DATE() 函數確保即使時間戳不同 (18:00:01 vs 18:00:05) 也會被視為衝突
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_reservation ON reservations (
    hotel_id,
    room_number,
    (
        substring(
            check_in
            from 1 for 10
        )
    )
)
WHERE status IN ('Confirmed', 'CheckedIn');
-- 3. 驗證索引已建立
SELECT indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'reservations'
    AND indexname = 'idx_unique_active_reservation';
-- =============================================
-- 使用說明：
-- 1. 在 Supabase Dashboard > SQL Editor 中執行此腳本
-- 2. 執行後，嘗試建立重複訂單時會收到錯誤訊息
-- =============================================