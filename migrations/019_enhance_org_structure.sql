-- =============================================
-- 019_enhance_org_structure.sql
-- 組織架構增強：部門管理、主管欄位、補足測試資料
-- =============================================

-- 1. 建立部門表
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    manager_id TEXT, -- 部門主管
    parent_id TEXT, -- 上層部門
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Staff 表新增欄位
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES departments(id),
ADD COLUMN IF NOT EXISTS supervisor_id TEXT REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 3. 插入測試部門資料
INSERT INTO departments (id, name, code) VALUES
('dept-001', '總經理室', 'GM'),
('dept-002', '財務部', 'FIN'),
('dept-003', '採購部', 'PUR'),
('dept-004', '前廳部', 'FO'),
('dept-005', '房務部', 'HSK'),
('dept-006', '人力資源部', 'HR')
ON CONFLICT (id) DO NOTHING;

-- 4. 補足測試員工資料 (建立完整的上下屬關係)
-- GM: GroupAdmin
INSERT INTO staff (id, hotel_id, employee_id, name, role, title, department_id, email, status)
VALUES ('s-gm-01', 'h-001', 'GM001', '孫總經理', 'GroupAdmin', '總經理', 'dept-001', 'gm@vibepms.com', 'Active')
ON CONFLICT (id) DO NOTHING;

-- Finance Manager
INSERT INTO staff (id, hotel_id, employee_id, name, role, title, department_id, supervisor_id, email, status)
VALUES ('s-fin-01', 'h-001', 'FIN001', '錢財務長', 'GroupAdmin', '財務長', 'dept-002', 's-gm-01', 'finance@vibepms.com', 'Active')
ON CONFLICT (id) DO NOTHING;

-- Purchasing Manager (採購主管)
INSERT INTO staff (id, hotel_id, employee_id, name, role, title, department_id, supervisor_id, email, status)
VALUES ('s-pur-01', 'h-001', 'PUR001', '李採購經理', 'Judge', '採購經理', 'dept-003', 's-fin-01', 'pur_mgr@vibepms.com', 'Active')
ON CONFLICT (id) DO NOTHING; 
-- Note: 'Judge' role might not exist in types, using 'HotelAdmin' or 'GroupAdmin' as approver roles mostly. 
-- Let's update role to 'HotelAdmin' or proper role. existing roles: GroupAdmin, HotelAdmin, FrontDesk.
-- We might need to handle 'Approver' logic solely by ID in workflow, regardless of system role.
UPDATE staff SET role = 'HotelAdmin' WHERE id = 's-pur-01';

-- Front Office Manager (前廳經理)
INSERT INTO staff (id, hotel_id, employee_id, name, role, title, department_id, supervisor_id, email, status)
VALUES ('s-fo-01', 'h-001', 'FO001', '陳前廳經理', 'HotelAdmin', '前廳經理', 'dept-004', 's-gm-01', 'fo_mgr@vibepms.com', 'Active')
ON CONFLICT (id) DO NOTHING;

-- Front Desk Staff (一般員工)
INSERT INTO staff (id, hotel_id, employee_id, name, role, title, department_id, supervisor_id, email, status)
VALUES ('s-fo-02', 'h-001', 'FO002', '王小明', 'FrontDesk', '櫃檯接待', 'dept-004', 's-fo-01', 'fo_staff1@vibepms.com', 'Active')
ON CONFLICT (id) DO NOTHING;

-- Update Dept Managers
UPDATE departments SET manager_id = 's-gm-01' WHERE id = 'dept-001';
UPDATE departments SET manager_id = 's-fin-01' WHERE id = 'dept-002';
UPDATE departments SET manager_id = 's-pur-01' WHERE id = 'dept-003';
UPDATE departments SET manager_id = 's-fo-01' WHERE id = 'dept-004';

-- 5. 更新現有使用者 (GA001)
UPDATE staff SET department_id = 'dept-001', title = '系統管理員' WHERE employee_id LIKE 'GA%';

