-- Create table for accounting mappings (System Settings for Accounting)
CREATE TABLE IF NOT EXISTS accounting_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id TEXT REFERENCES hotels(id),
    category TEXT NOT NULL,
    -- 'RENT', 'LATE_FEE', 'CLEANING', 'DEPOSIT', etc.
    type_id TEXT,
    -- Optional (e.g., room_type_id for specific room type rent mapping)
    account_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hotel_id, category, type_id)
);
-- Enable RLS
ALTER TABLE accounting_mappings ENABLE ROW LEVEL SECURITY;
-- Create policy
CREATE POLICY "Enable all access for authenticated users" ON accounting_mappings FOR ALL USING (auth.role() = 'authenticated');