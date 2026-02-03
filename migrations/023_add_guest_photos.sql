-- Migration: Add photo columns to guests table
-- These columns store Base64 encoded images of identity documents

ALTER TABLE guests ADD COLUMN IF NOT EXISTS id_card_front TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id_card_back TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS health_insurance_card TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS passport_or_permit TEXT;

-- Add comments for documentation
COMMENT ON COLUMN guests.id_card_front IS '身分證正面 (Base64 encoded image)';
COMMENT ON COLUMN guests.id_card_back IS '身分證反面 (Base64 encoded image)';
COMMENT ON COLUMN guests.health_insurance_card IS '健保卡 (Base64 encoded image)';
COMMENT ON COLUMN guests.passport_or_permit IS '護照或居留證 (Base64 encoded image)';
