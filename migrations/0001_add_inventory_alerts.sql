-- Migration: Add Real-time Inventory Alerts and Batch Tracking Fields
-- Date: 2026-03-03

-- Add alert level and inspection status to inventory_batches table
ALTER TABLE inventory_batches
ADD COLUMN alert_level VARCHAR(20) DEFAULT 'normal',
ADD COLUMN last_alert_time TIMESTAMP,
ADD COLUMN inspection_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN quarantine_status VARCHAR(20) DEFAULT 'none';

-- Create index for faster alert queries
CREATE INDEX idx_inventory_batches_alert_level ON inventory_batches(alert_level);
CREATE INDEX idx_inventory_batches_expiry_date ON inventory_batches(expiry_date);

-- Update comments for clarity
COMMENT ON COLUMN inventory_batches.alert_level IS 'Inventory alert level: normal/warning/critical';
COMMENT ON COLUMN inventory_batches.inspection_status IS 'Inspection status: pending/pass/fail';
COMMENT ON COLUMN inventory_batches.quarantine_status IS 'Quarantine status: none/quarantined/released';