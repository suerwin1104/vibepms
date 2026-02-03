-- =====================================================
-- Migration: Create daily_cleaning_tasks table
-- Description: Table for tracking daily room cleaning assignments
-- Created: 2025-12-24
-- =====================================================

-- Create daily_cleaning_tasks table
CREATE TABLE IF NOT EXISTS daily_cleaning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_type TEXT NOT NULL CHECK (task_type IN ('VD', 'SO', 'DND')), -- VD: Vacant Dirty, SO: Stay Over, DND: Do Not Disturb
  priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('High', 'Normal', 'Low')),
  status TEXT NOT NULL DEFAULT 'Unassigned' CHECK (status IN ('Unassigned', 'InProgress', 'Completed', 'Inspected')),
  housekeeper_id TEXT,
  housekeeper_name TEXT,
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  inspector_id TEXT,
  inspection_score DECIMAL(3, 1),
  notes TEXT,
  exceptions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hotel_id, room_id, task_date)
);

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_hotel_date ON daily_cleaning_tasks(hotel_id, task_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_status ON daily_cleaning_tasks(status);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_housekeeper ON daily_cleaning_tasks(housekeeper_id);

-- Enable RLS
ALTER TABLE daily_cleaning_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (refine based on your auth strategy)
CREATE POLICY "Allow all" ON daily_cleaning_tasks FOR ALL USING (true);

-- =====================================================
-- Create housekeepers table (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS housekeepers (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'OnLeave', 'Resigned')),
  assigned_floor TEXT,
  cleaned_today INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for housekeepers
ALTER TABLE housekeepers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all housekeepers" ON housekeepers FOR ALL USING (true);
