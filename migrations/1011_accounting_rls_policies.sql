-- ============================================================
-- 會計系統 RLS 政策設定
-- 適用表格: journal_entries, journal_entry_lines, general_ledgers, 
--           invoices, chart_of_accounts
-- 建立日期: 2026-01-18
-- 用途: 確保已認證用戶可以完整存取會計相關表格
-- ============================================================
-- 1. journal_entries (傳票主檔)
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "full_access_journal_entries" ON journal_entries;
CREATE POLICY "full_access_journal_entries" ON journal_entries FOR ALL USING (true) WITH CHECK (true);
-- 2. journal_entry_lines (傳票明細)
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "full_access_journal_entry_lines" ON journal_entry_lines;
CREATE POLICY "full_access_journal_entry_lines" ON journal_entry_lines FOR ALL USING (true) WITH CHECK (true);
-- 3. general_ledgers (總分類帳)
ALTER TABLE general_ledgers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "full_access_general_ledgers" ON general_ledgers;
CREATE POLICY "full_access_general_ledgers" ON general_ledgers FOR ALL USING (true) WITH CHECK (true);
-- 4. invoices (發票)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "full_access_invoices" ON invoices;
CREATE POLICY "full_access_invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
-- 5. chart_of_accounts (會計科目)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'chart_of_accounts'
) THEN
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "full_access_chart_of_accounts" ON chart_of_accounts;
EXECUTE 'CREATE POLICY "full_access_chart_of_accounts" ON chart_of_accounts FOR ALL USING (true) WITH CHECK (true)';
END IF;
END $$;
-- 6. accounting_periods (會計期間) - 如果存在
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'accounting_periods'
) THEN
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "full_access_accounting_periods" ON accounting_periods;
EXECUTE 'CREATE POLICY "full_access_accounting_periods" ON accounting_periods FOR ALL USING (true) WITH CHECK (true)';
END IF;
END $$;
-- 驗證 RLS 狀態
SELECT tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'journal_entries',
        'journal_entry_lines',
        'general_ledgers',
        'invoices',
        'chart_of_accounts',
        'accounting_periods'
    );