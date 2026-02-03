-- Add assigned_to column to workflow_instances to support specific approver assignment
ALTER TABLE workflow_instances
ADD COLUMN IF NOT EXISTS assigned_to TEXT;
