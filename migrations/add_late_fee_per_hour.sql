-- Add late_fee_per_hour column to rooms table
-- Run this SQL in your Supabase Dashboard (SQL Editor)
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS late_fee_per_hour INTEGER DEFAULT 0;
-- Optionally, update existing rooms with a default hourly rate based on their room price
-- UPDATE rooms SET late_fee_per_hour = CEILING(base_price / 6) WHERE late_fee_per_hour = 0;