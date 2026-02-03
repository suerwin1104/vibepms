-- Migration: Create consumption_items table
-- This table stores pre-defined consumption items (mini-bar, room service, etc.)
-- that can be quickly added to a guest's billable items.

-- Drop existing table if it exists (for re-run safety)
DROP TABLE IF EXISTS consumption_items;

-- Create the consumption_items table
CREATE TABLE consumption_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'General',
    accounting_code TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for active items lookup
CREATE INDEX idx_consumption_items_active ON consumption_items(is_active);
CREATE INDEX idx_consumption_items_category ON consumption_items(category);

-- Insert sample consumption items (common hotel items)
INSERT INTO consumption_items (name, price, category, accounting_code, is_active) VALUES
    -- Mini-bar items
    ('礦泉水 Mineral Water', 50, 'Mini-Bar', 'MB001', true),
    ('可樂 Cola', 60, 'Mini-Bar', 'MB002', true),
    ('啤酒 Beer', 120, 'Mini-Bar', 'MB003', true),
    ('洋芋片 Chips', 80, 'Mini-Bar', 'MB004', true),
    ('巧克力 Chocolate', 100, 'Mini-Bar', 'MB005', true),
    
    -- Room Service
    ('客房早餐 Room Breakfast', 350, 'Room Service', 'RS001', true),
    ('三明治 Sandwich', 180, 'Room Service', 'RS002', true),
    ('咖啡 Coffee', 120, 'Room Service', 'RS003', true),
    
    -- Laundry
    ('洗衣服務 Laundry Service', 300, 'Laundry', 'LD001', true),
    ('快速洗衣 Express Laundry', 500, 'Laundry', 'LD002', true),
    
    -- Other Services
    ('停車費 Parking Fee', 200, 'Parking', 'PK001', true),
    ('加床費 Extra Bed', 500, 'Room Charge', 'RC001', true),
    ('寵物費 Pet Fee', 300, 'Room Charge', 'RC002', true),
    ('延遲退房 Late Checkout', 500, 'Room Charge', 'RC003', true),
    ('Spa服務 Spa Service', 1500, 'Spa', 'SP001', true),
    ('健身房 Gym Access', 200, 'Facility', 'FC001', true);

-- Enable Row Level Security (optional, can be configured as needed)
-- ALTER TABLE consumption_items ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE consumption_items IS 'Pre-defined consumption items for quick billing';
COMMENT ON COLUMN consumption_items.name IS 'Display name of the item (bilingual)';
COMMENT ON COLUMN consumption_items.price IS 'Default price of the item';
COMMENT ON COLUMN consumption_items.category IS 'Category for grouping (Mini-Bar, Room Service, etc.)';
COMMENT ON COLUMN consumption_items.accounting_code IS 'Internal accounting code for financial reporting';
COMMENT ON COLUMN consumption_items.is_active IS 'Whether the item is available for selection';
