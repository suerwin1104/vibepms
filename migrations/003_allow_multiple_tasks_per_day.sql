-- =====================================================
-- Migration: Allow multiple cleaning tasks per room per day
-- Description: Removes unique constraint to support multiple room turnovers
-- Created: 2025-12-24
-- =====================================================

-- Remove the unique constraint to allow multiple tasks per room per day
-- This enables tracking each checkout as a separate cleaning task
ALTER TABLE daily_cleaning_tasks 
DROP CONSTRAINT IF EXISTS daily_cleaning_tasks_hotel_id_room_id_task_date_key;

-- Add a composite index for query performance (replaces the unique index)
DROP INDEX IF EXISTS idx_cleaning_tasks_hotel_room_date;
CREATE INDEX idx_cleaning_tasks_hotel_room_date 
ON daily_cleaning_tasks(hotel_id, room_id, task_date);

-- Add a checkout reference column for audit trail (optional but recommended)
ALTER TABLE daily_cleaning_tasks 
ADD COLUMN IF NOT EXISTS reservation_id TEXT;

-- Add index for reservation lookup
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_reservation 
ON daily_cleaning_tasks(reservation_id);

-- =====================================================
-- NOTES:
-- After running this migration:
-- 1. Each checkout will create a NEW cleaning task
-- 2. RoomGrid will display the most recent uncompleted task
-- 3. All completed tasks are preserved for audit/reporting
-- =====================================================
