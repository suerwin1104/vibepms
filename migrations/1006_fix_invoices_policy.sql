-- Enable RLS on invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- Drop existing select policy if any to avoid conflict
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON invoices;
-- Create policy to allow authenticated users to read all invoices
CREATE POLICY "Enable read access for authenticated users" ON invoices FOR
SELECT TO authenticated USING (true);
-- Also ensure Realtime is enabled for invoices
ALTER PUBLICATION supabase_realtime
ADD TABLE invoices;