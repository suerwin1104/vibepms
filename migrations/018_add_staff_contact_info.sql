-- =============================================
-- 員工資料表新增聯絡資訊欄位
-- Add Contact Info Columns to Staff Table
-- =============================================

ALTER TABLE staff
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS line_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS wechat_id VARCHAR(100);

-- Update existing test users with dummy emails
UPDATE staff SET email = 'manager@example.com' WHERE employee_id LIKE 'FD%';
UPDATE staff SET email = 'admin@example.com' WHERE role = 'GroupAdmin';
