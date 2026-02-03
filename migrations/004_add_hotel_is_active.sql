-- Migration: Add is_active column to hotels and buildings tables
-- This allows enabling/disabling hotels and buildings without deleting them
-- Add the is_active column to hotels table with default value true
ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
-- Update existing hotels to be active by default
UPDATE hotels
SET is_active = true
WHERE is_active IS NULL;
-- Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_hotels_is_active ON hotels(is_active);
-- Add a comment for documentation
COMMENT ON COLUMN hotels.is_active IS 'Whether this hotel is active and should be displayed in the system';
-- Add the is_active column to buildings table with default value true
ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
-- Update existing buildings to be active by default
UPDATE buildings
SET is_active = true
WHERE is_active IS NULL;
-- Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_buildings_is_active ON buildings(is_active);
-- Add a comment for documentation
COMMENT ON COLUMN buildings.is_active IS 'Whether this building is active and should be displayed in the system';