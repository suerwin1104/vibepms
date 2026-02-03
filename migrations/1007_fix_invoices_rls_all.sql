-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON invoices;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON invoices;
-- Create permissive policy
CREATE POLICY "Allow all access for authenticated users" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- The following line is commented out because the table is already in the publication
-- ALTER PUBLICATION supabase_realtime ADD TABLE invoices;