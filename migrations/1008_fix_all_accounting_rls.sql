-- 修復所有會計相關表的 RLS 權限
-- 1. invoices 表
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON invoices;
CREATE POLICY "Allow all access for authenticated users" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 2. accounting_periods 表 (如果存在)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'accounting_periods'
) THEN
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON accounting_periods;
CREATE POLICY "Allow all access for authenticated users" ON accounting_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);
END IF;
END $$;
-- 3. journal_entries 表
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON journal_entries;
CREATE POLICY "Allow all access for authenticated users" ON journal_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 4. journal_entry_lines 表
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON journal_entry_lines;
CREATE POLICY "Allow all access for authenticated users" ON journal_entry_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 5. general_ledgers 表
ALTER TABLE general_ledgers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON general_ledgers;
CREATE POLICY "Allow all access for authenticated users" ON general_ledgers FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 6. chart_of_accounts 表
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON chart_of_accounts;
CREATE POLICY "Allow all access for authenticated users" ON chart_of_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 確保 Realtime 已啟用 (可能會報錯如果已存在，可忽略)
-- ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
-- ALTER PUBLICATION supabase_realtime ADD TABLE journal_entries;