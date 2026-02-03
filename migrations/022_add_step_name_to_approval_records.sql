
-- 補上 approval_records 缺少的 step_name 欄位
ALTER TABLE approval_records ADD COLUMN IF NOT EXISTS step_name VARCHAR(100);
