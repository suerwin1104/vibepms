-- ==========================================
-- 強制修復 journal_entries 和所有會計表的 RLS
-- 執行日期: 2026-01-18
-- ==========================================
-- 1. journal_entries 表 - 完整重建 RLS 權限
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
-- 先刪除所有可能存在的政策
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON journal_entries;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON journal_entries;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON journal_entries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON journal_entries;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_select_policy" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_insert_policy" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_update_policy" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_delete_policy" ON journal_entries;
-- 建立新的全權限政策
CREATE POLICY "full_access_journal_entries" ON journal_entries AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 2. journal_entry_lines 表
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON journal_entry_lines;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON journal_entry_lines;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON journal_entry_lines;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON journal_entry_lines;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_select_policy" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_insert_policy" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_update_policy" ON journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_delete_policy" ON journal_entry_lines;
CREATE POLICY "full_access_journal_entry_lines" ON journal_entry_lines AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 3. general_ledgers 表
ALTER TABLE general_ledgers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON general_ledgers;
DROP POLICY IF EXISTS "full_access_general_ledgers" ON general_ledgers;
CREATE POLICY "full_access_general_ledgers" ON general_ledgers AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 4. accounting_periods 表 (如果存在)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'accounting_periods'
) THEN
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
EXECUTE 'DROP POLICY IF EXISTS "Allow all access for authenticated users" ON accounting_periods';
EXECUTE 'DROP POLICY IF EXISTS "full_access_accounting_periods" ON accounting_periods';
EXECUTE 'CREATE POLICY "full_access_accounting_periods" ON accounting_periods
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true)';
END IF;
END $$;
-- 5. chart_of_accounts 表
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON chart_of_accounts;
DROP POLICY IF EXISTS "full_access_chart_of_accounts" ON chart_of_accounts;
CREATE POLICY "full_access_chart_of_accounts" ON chart_of_accounts AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 6. invoices 表
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON invoices;
DROP POLICY IF EXISTS "full_access_invoices" ON invoices;
CREATE POLICY "full_access_invoices" ON invoices AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 確認政策建立完成
SELECT schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN (
        'journal_entries',
        'journal_entry_lines',
        'general_ledgers',
        'accounting_periods',
        'chart_of_accounts',
        'invoices'
    )
ORDER BY tablename,
    policyname;