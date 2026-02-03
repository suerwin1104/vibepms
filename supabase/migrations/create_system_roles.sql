-- 建立系統角色表
-- 執行此 SQL 在 Supabase SQL Editor 中

CREATE TABLE IF NOT EXISTS system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  level INTEGER DEFAULT 50,
  is_system BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 啟用 RLS
ALTER TABLE system_roles ENABLE ROW LEVEL SECURITY;

-- 建立允許所有人讀取的政策
CREATE POLICY "Allow read access for all users" ON system_roles
  FOR SELECT USING (true);

-- 建立只允許 service_role 或 authenticated 使用者修改的政策
CREATE POLICY "Allow insert for authenticated users" ON system_roles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON system_roles
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users" ON system_roles
  FOR DELETE USING (is_system = false);

-- 插入預設系統角色 (使用自動產生的 UUID)
INSERT INTO system_roles (code, name, level, is_system, description) VALUES
  ('GroupAdmin', '集團總管', 10, true, '擁有所有系統權限，可管理全集團設定'),
  ('GeneralManager', '總經理', 15, true, '負責整體營運管理'),
  ('HotelAdmin', '分店經理', 20, true, '管理單一飯店的營運與人員'),
  ('DepartmentManager', '部門經理', 30, true, '負責部門業務管理與簽核'),
  ('Finance', '財務人員', 40, true, '處理財務相關作業與簽核'),
  ('FrontDesk', '櫃檯人員', 50, true, '處理前台作業：入住、退房、收款等')
ON CONFLICT (code) DO NOTHING;

-- 啟用 Realtime (可選)
ALTER PUBLICATION supabase_realtime ADD TABLE system_roles;

